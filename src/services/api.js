import axios from 'axios'
import logger from './frontendLogger'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:7860',
  timeout: 15000,
})

// Injeta token em toda requisição
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// Controle para evitar múltiplos refreshes simultâneos
let isRefreshing = false
let failedQueue  = []

function processQueue(error, token = null) {
  failedQueue.forEach(({ resolve, reject }) => {
    if (error) reject(error)
    else resolve(token)
  })
  failedQueue = []
}

function forceLogout() {
  // Preserva chaves permanentes do superadmin
  const PERSIST_KEYS = [
    'ai_provider_keys',
    'ai_active_provider',
    'ai_conversations',
    'ai_active_conv',
  ]
  const saved = {}
  PERSIST_KEYS.forEach(k => {
    const v = localStorage.getItem(k)
    if (v !== null) saved[k] = v
  })
  localStorage.clear()
  Object.entries(saved).forEach(([k, v]) => localStorage.setItem(k, v))
  window.location.href = '/login'
}

// Interceptor de resposta: tenta refresh antes de deslogar
api.interceptors.response.use(
  (res) => res,
  async (err) => {
    const originalRequest = err.config

    // Só age em 401, e só uma vez por requisição (evita loop infinito)
    if (err.response?.status !== 401 || originalRequest._retry) {
      return Promise.reject(err)
    }

    // Se o próprio refresh falhou → desloga
    if (originalRequest.url?.includes('/api/auth/refresh')) {
      forceLogout()
      return Promise.reject(err)
    }

    // Se já está fazendo refresh, coloca na fila
    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        failedQueue.push({ resolve, reject })
      }).then(token => {
        originalRequest.headers.Authorization = `Bearer ${token}`
        return api(originalRequest)
      }).catch(e => Promise.reject(e))
    }

    // Inicia o refresh
    originalRequest._retry = true
    isRefreshing = true

    const refreshToken = localStorage.getItem('refresh_token')
    if (!refreshToken) {
      forceLogout()
      return Promise.reject(err)
    }

    try {
      const { data } = await api.post('/api/auth/refresh', { refresh_token: refreshToken })
      const newToken    = data.data.access_token
      const newRefresh  = data.data.refresh_token

      localStorage.setItem('access_token', newToken)
      if (newRefresh) localStorage.setItem('refresh_token', newRefresh)
      api.defaults.headers.common.Authorization = `Bearer ${newToken}`

      processQueue(null, newToken)

      // Retenta a requisição original com o novo token
      originalRequest.headers.Authorization = `Bearer ${newToken}`
      return api(originalRequest)
    } catch (refreshErr) {
      processQueue(refreshErr, null)
      forceLogout()
      return Promise.reject(refreshErr)
    } finally {
      isRefreshing = false
    }
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
    if (!url?.includes('/api/superadmin/logs')) {
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
      if (!url?.includes('/api/superadmin/logs')) {
        logger.logRequest(
          config.method?.toUpperCase(),
          url,
          status,
          duration
        )
      }

      // Log adicional para erros (também filtra logs)
      if (status >= 400 && !url?.includes('/api/superadmin/logs')) {
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
