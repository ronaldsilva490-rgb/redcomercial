import axios from 'axios'
import logger from './frontendLogger'
import supabase from './supabaseClient'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:7860'
console.log('[API] Base URL:', API_URL)

const api = axios.create({
  baseURL: API_URL,
  timeout: 15000,
})

// Interceptor inteligente: separa token Admin do token Supabase
api.interceptors.request.use((config) => {
  const url = config.url || ''
  
  if (url.includes('/api/admin')) {
    // Rotas admin: usa admin_token (localStorage > cookie fallback)
    if (!config.headers.Authorization || config.headers.Authorization === 'Bearer null') {
      let adminToken = localStorage.getItem('admin_token')
      if (!adminToken) {
        // Fallback: lê do cookie (Chrome Mobile limpa localStorage ao trocar viewport)
        const match = document.cookie.match(/(^| )admin_token=([^;]+)/)
        if (match) adminToken = decodeURIComponent(match[2])
      }
      if (adminToken) config.headers.Authorization = `Bearer ${adminToken}`
    }
  } else {
    // Rotas normais: usa access_token do Supabase
    const token = localStorage.getItem('access_token')
    if (token) config.headers.Authorization = `Bearer ${token}`
  }
  
  console.log(`[API] ${config.method.toUpperCase()} ${config.baseURL}${url}`)
  return config
})

// Controle para evitar múltiplos refreshes simultâneos
let isRefreshing = false
let failedQueue  = []

// Sistema de eventos para tratamento centralizado de erros
const errorListeners = new Set()
export const onAuthError = (callback) => {
  errorListeners.add(callback)
  return () => errorListeners.delete(callback)
}

function notifyAuthError(error) {
  errorListeners.forEach(listener => {
    try {
      listener(error)
    } catch (e) {
      console.error('Erro ao notificar listeners de auth:', e)
    }
  })
}

function processQueue(error, token = null) {
  failedQueue.forEach(({ resolve, reject }) => {
    if (error) reject(error)
    else resolve(token)
  })
  failedQueue = []
}

function forceLogout(reason = 'Token de Sessão Expirado') {
  // Encerra sessão no Supabase silenciosamente (fire-and-forget)
  supabase.auth.signOut().catch(() => {})

  // Ao invés de destruirmos a localStorage instantaneamente e ativar o
  // LogoutMonitor (comportamento pisca-pisca de reloads), nós apenas
  // notificamos o App.jsx para renderizar a Modal fixada na tela.
  // A limpeza do Zustand ocorrerá apenas quando o usuário clicar no botão e autorizar a saída.
  notifyAuthError({
    type: 'logout',
    message: reason,
    status: 401
  })
}

// Interceptor de resposta: trata erros com feedback
api.interceptors.response.use(
  (res) => res,
  async (err) => {
    const originalRequest = err.config
    const status = err.response?.status

    // ─────────────────── ERROS DE AUTENTICAÇÃO ───────────────────
    if (status === 401 && !originalRequest._retry) {
      // Rotas /api/admin/* usam JWT próprio — NÃO tenta refresh Supabase
      if (originalRequest.url?.includes('/api/admin/')) {
        return Promise.reject(err)
      }

      // Se é um refresh do Supabase que falhou
      if (originalRequest.url?.includes('/api/auth/refresh')) {
        forceLogout('Sua sessão expirou. Por favor, faça login novamente.')
        return Promise.reject(err)
      }

      // Se já está fazendo refresh, coloca na fila
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject })
        }).then(token => {
          originalRequest.headers.Authorization = `Bearer ${token}`
          return api(originalRequest)
        }).catch(e => {
          notifyAuthError({
            type: 'auth_error',
            message: 'Falha ao renovar sessão',
            status: 401,
            original: e
          })
          return Promise.reject(e)
        })
      }

      // Inicia o refresh via Supabase
      originalRequest._retry = true
      isRefreshing = true

      try {
        const { data: sessionData, error: refreshError } = await supabase.auth.refreshSession()

        if (refreshError || !sessionData?.session?.access_token) {
          processQueue(refreshError || new Error('Refresh inválido'), null)
          forceLogout('Token de sessão expirado.')
          return Promise.reject(err)
        }

        const newToken   = sessionData.session.access_token
        const newRefresh = sessionData.session.refresh_token

        localStorage.setItem('access_token', newToken)
        if (newRefresh) localStorage.setItem('refresh_token', newRefresh)
        api.defaults.headers.common.Authorization = `Bearer ${newToken}`

        processQueue(null, newToken)

        originalRequest.headers.Authorization = `Bearer ${newToken}`
        return api(originalRequest)
      } catch (refreshErr) {
        processQueue(refreshErr, null)
        forceLogout('Não foi possível renovar sua sessão.')
        return Promise.reject(refreshErr)
      } finally {
        isRefreshing = false
      }
    }

    // ─────────────────── ERROS DE AUTORIZAÇÃO ───────────────────
    if (status === 403) {
      return Promise.reject(err)
    }

    // ─────────────────── ERROS DO SERVIDOR ───────────────────
    if (status >= 500) {
      const url = originalRequest.url || ''
      if (!url.includes('/api/admin')) {
        notifyAuthError({
          type: 'server_error',
          message: `Erro do servidor: ${err.response?.statusText || 'Erro desconhecido'}`,
          status: status,
          details: err.response?.data?.error
        })
      }
      return Promise.reject(err)
    }

    // ─────────────────── ERROS DE REDE/TIMEOUT ───────────────────
    if (err.code === 'ECONNABORTED' || err.message === 'timeout of ' + api.defaults.timeout + 'ms exceeded') {
      notifyAuthError({
        type: 'timeout',
        message: 'Tempo limite de conexão excedido. Verifique sua internet.',
        timeout: api.defaults.timeout,
        code: 'TIMEOUT'
      })
      return Promise.reject(err)
    }

    if (err.message?.includes('Network') || err.code === 'ERR_NETWORK') {
      notifyAuthError({
        type: 'network',
        message: 'Erro de conexão. Verifique sua internet ou tente novamente.',
        code: 'NETWORK_ERROR'
      })
      return Promise.reject(err)
    }

    // ─────────────────── OUTROS ERROS ───────────────────
    if (status >= 400 && status < 500) {
      return Promise.reject(err)
    }

    return Promise.reject(err)
  }
)

// ─── Logger Interceptor ─── 
// Registra todas as requisições e respostas da API
api.interceptors.request.use((config) => {
  // Marca o timestamp para calcular duração
  config._startTime = Date.now()
  return config
})

api.interceptors.response.use(
  (response) => {
    const duration = Date.now() - response.config._startTime
    // Evita logs recursivos (não loga requisições para a própria rota de logs)
    const url = response.config.url?.replace(response.config.baseURL, '')
    if (!url?.includes('/api/admin/logs')) {
      logger.logRequest(
        response.config.method?.toUpperCase(),
        url,
        response.status,
        duration
      )
    }
    return response
  },
  (error) => {
    const config = error.config
    if (config) {
      const duration = Date.now() - config._startTime
      const status = error.response?.status || 0
      const message = error.message
      const url = config.url?.replace(config.baseURL, '')
      
      // Evita logs recursivos
      if (!url?.includes('/api/admin/logs')) {
        logger.logRequest(
          config.method?.toUpperCase(),
          url,
          status,
          duration
        )
      }

      // Log adicional para erros (também filtra logs)
      if (status >= 400 && !url?.includes('/api/admin/logs')) {
        logger.error(`API Error: ${config.method?.toUpperCase()} ${config.url}`, {
          status,
          statusText: error.response?.statusText,
          message: error.response?.data?.error || message,
          duration_ms: duration,
        })
      }
    }
    return Promise.reject(error)
  }
)

export default api

