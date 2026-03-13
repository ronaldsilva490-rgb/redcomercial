import { create } from 'zustand'
import api from '../services/api'
import supabase from '../services/supabaseClient'

const useAuthStore = create((set, get) => ({
  user:    JSON.parse(localStorage.getItem('user')   || 'null'),
  tenant:  JSON.parse(localStorage.getItem('tenant') || 'null'),
  papel:   localStorage.getItem('papel') || null,
  token:   localStorage.getItem('access_token') || null,
  loading: false,

  login: async (loginVal, password) => {
    set({ loading: true })
    try {
      let authEmail = loginVal.trim().toLowerCase()
      if (authEmail.includes('@') && !authEmail.includes('.red.internal') && !authEmail.endsWith('.com') && !authEmail.endsWith('.br') && !authEmail.endsWith('.net') && !authEmail.endsWith('.org')) {
        let [userPart, domainPart] = authEmail.split('@')
        if (domainPart) {
          domainPart = domainPart.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9.-]/g, "")
          authEmail = `${userPart}@${domainPart}.red.internal`
        }
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email: authEmail,
        password,
      })
      if (error || !data?.session) {
        set({ loading: false })
        let sbError = error?.message || 'Erro ao fazer login'
        if (sbError.toLowerCase().includes('invalid login credentials')) {
            sbError = 'Email ou senha incorretos! Tente novamente. 🔑'
        }
        return { ok: false, error: sbError }
      }

      const access_token = data.session.access_token
      const refresh_token = data.session.refresh_token

      localStorage.setItem('access_token', access_token)
      if (refresh_token) localStorage.setItem('refresh_token', refresh_token)

      api.defaults.headers.common.Authorization = `Bearer ${access_token}`
      const tenantResp = await api.get('/api/tenants/me')
      const tenant = tenantResp.data?.data || null

      const user = data.user || { id: null, email: loginVal }
      const papel = tenantResp.data?.data?.papel || localStorage.getItem('papel') || null

      localStorage.setItem('user', JSON.stringify(user))
      localStorage.setItem('tenant', JSON.stringify(tenant))
      if (papel) localStorage.setItem('papel', papel)

      set({ user, tenant, papel, token: access_token, loading: false })
      return { ok: true }
    } catch (err) {
      set({ loading: false })
      let errorMessage = err.response?.data?.error || err.message || 'Erro ao fazer login'
      
      if (errorMessage.toLowerCase().includes('tenant')) {
        errorMessage = 'Conta de estabelecimento não encontrada! Confirme seus dados. 🏢'
      } else if (errorMessage.toLowerCase().includes('invalid login credentials')) {
        errorMessage = 'Email ou senha incorretos! Tente novamente. 🔑'
      }

      return { ok: false, error: errorMessage }
    }
  },

  logout: async () => {
    try { await supabase.auth.signOut() } catch {}
    try { await api.post('/api/auth/logout') } catch {}
    // Limpa APENAS chaves do usuário, nunca toca nas do admin
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
    localStorage.removeItem('user')
    localStorage.removeItem('tenant')
    localStorage.removeItem('papel')
    set({ user: null, tenant: null, papel: null, token: null })
  },

  isAuthenticated: () => !!get().token,

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
