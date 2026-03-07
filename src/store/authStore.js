import { create } from 'zustand'
import api from '../services/api'

const PERSIST_KEYS = [
  'theme_config',
]

function clearAuthStorage() {
  const saved = {}
  PERSIST_KEYS.forEach(k => {
    const v = localStorage.getItem(k)
    if (v !== null) saved[k] = v
  })
  localStorage.clear()
  Object.entries(saved).forEach(([k, v]) => localStorage.setItem(k, v))
}

const useAuthStore = create((set, get) => ({
  user:    JSON.parse(localStorage.getItem('user')   || 'null'),
  tenant:  JSON.parse(localStorage.getItem('tenant') || 'null'),
  papel:   localStorage.getItem('papel') || null,
  token:   localStorage.getItem('access_token') || null,
  loading: false,

  login: async (loginVal, password) => {
    set({ loading: true })
    try {
      const { data } = await api.post('/api/auth/login', { email: loginVal, password })
      const { access_token, refresh_token, user, tenant, papel } = data.data

      localStorage.setItem('access_token',  access_token)
      localStorage.setItem('refresh_token', refresh_token)
      localStorage.setItem('user',   JSON.stringify(user))
      localStorage.setItem('tenant', JSON.stringify(tenant))
      localStorage.setItem('papel',  papel)

      if (papel === 'superadmin') {
        localStorage.setItem('superadmin', 'true')
      } else {
        localStorage.removeItem('superadmin')
      }

      set({ user, tenant, papel, token: access_token, loading: false })
      return { ok: true, superadmin: papel === 'superadmin' }
    } catch (err) {
      set({ loading: false })
      return { ok: false, error: err.response?.data?.error || 'Erro ao fazer login' }
    }
  },

  logout: async () => {
    try { await api.post('/api/auth/logout') } catch {}
    clearAuthStorage()
    set({ user: null, tenant: null, papel: null, token: null })
  },

  // Reativo — usa estado Zustand, não localStorage direto
  isAuthenticated: () => !!get().token,
  isSuperAdmin:   () => get().papel === 'superadmin',

  setTenant: (tenant) => {
    localStorage.setItem('tenant', JSON.stringify(tenant))
    set({ tenant })
  },

  refreshTenant: async () => {
    try {
      const { data } = await api.get('/api/tenants/me')
      const tenant = data.data
      localStorage.setItem('tenant', JSON.stringify(tenant))
      set({ tenant })
      return tenant
    } catch { return null }
  },

  getDisplayName: () => {
    const user = get().user
    if (!user) return 'usuário'
    if (user.username) return user.username
    const email = user.email || ''
    if (email.endsWith('@red.internal')) return email.replace('@red.internal', '')
    return email.split('@')[0]
  },
}))

export default useAuthStore
