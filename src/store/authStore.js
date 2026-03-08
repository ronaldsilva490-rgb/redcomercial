import { create } from 'zustand'
import api from '../services/api'
import supabase from '../services/supabaseClient'

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
      // Use Supabase client for sign-in
      const { data, error } = await supabase.auth.signInWithPassword({
        email: loginVal,
        password,
      })
      if (error || !data?.session) {
        set({ loading: false })
        return { ok: false, error: error?.message || 'Erro ao fazer login' }
      }

      const access_token = data.session.access_token
      const refresh_token = data.session.refresh_token

      // Persist tokens
      localStorage.setItem('access_token', access_token)
      if (refresh_token) localStorage.setItem('refresh_token', refresh_token)

      // Fetch tenant info from backend using the Supabase access token
      api.defaults.headers.common.Authorization = `Bearer ${access_token}`
      const tenantResp = await api.get('/api/tenants/me')
      const tenant = tenantResp.data?.data || null

      // Build user object
      const user = data.user || { id: null, email: loginVal }
      const papel = tenantResp.data?.data?.papel || localStorage.getItem('papel') || null

      localStorage.setItem('user', JSON.stringify(user))
      localStorage.setItem('tenant', JSON.stringify(tenant))
      if (papel) localStorage.setItem('papel', papel)

      set({ user, tenant, papel, token: access_token, loading: false })
      return { ok: true, superadmin: papel === 'superadmin' }
    } catch (err) {
      set({ loading: false })
      return { ok: false, error: err.response?.data?.error || err.message || 'Erro ao fazer login' }
    }
  },

  logout: async () => {
    try { await supabase.auth.signOut() } catch {}
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
