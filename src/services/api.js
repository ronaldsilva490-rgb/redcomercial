import axios from 'axios'

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

export default api
