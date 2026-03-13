import { create } from 'zustand'
import api from '../services/api'

// ── Helpers de Cookie (fallback para browsers que limpam localStorage) ──
function setCookie(name, value, days = 30) {
  const d = new Date()
  d.setTime(d.getTime() + days * 24 * 60 * 60 * 1000)
  document.cookie = `${name}=${encodeURIComponent(value)};expires=${d.toUTCString()};path=/;SameSite=Lax`
}
function getCookie(name) {
  const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'))
  return match ? decodeURIComponent(match[2]) : null
}
function deleteCookie(name) {
  document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`
}

// Lê admin_token: localStorage primeiro, cookie como fallback
function getAdminToken() {
  return localStorage.getItem('admin_token') || getCookie('admin_token') || null
}
function getAdminUser() {
  const ls = localStorage.getItem('admin_user')
  if (ls) return ls
  const ck = getCookie('admin_user')
  if (ck) {
    // Restaura pro localStorage se veio do cookie
    localStorage.setItem('admin_user', ck)
    return ck
  }
  return null
}

const useAdminStore = create((set, get) => ({
  admin: JSON.parse(getAdminUser() || 'null'),
  token: getAdminToken(),
  loading: false,

  // Login de admin
  login: async (login, password) => {
    set({ loading: true })
    try {
      const { data } = await api.post('/api/admin/login', {
        login: login.trim(),
        senha: password
      })

      if (data.data) {
        const { access_token, admin } = data.data
        localStorage.setItem('admin_token', access_token)
        localStorage.setItem('admin_user', JSON.stringify(admin))
        setCookie('admin_token', access_token, 7)
        setCookie('admin_user', JSON.stringify(admin), 7)
        set({ admin, token: access_token, loading: false })
        return { ok: true }
      }
      return { ok: false, error: 'Resposta inválida do servidor' }
    } catch (err) {
      const errorMsg = err.response?.data?.error || 'Erro ao fazer login'
      set({ loading: false })
      return { ok: false, error: errorMsg }
    }
  },

  // Registrar novo admin
  register: async (nome, username, email, senha, palavraMestre) => {
    set({ loading: true })
    try {
      const { data } = await api.post('/api/admin/register', {
        nome,
        username: username.toLowerCase(),
        email: email.toLowerCase(),
        senha,
        palavra_mestre: palavraMestre
      })

      if (data.data) {
        set({ loading: false })
        return { ok: true, admin: data.data }
      }
      return { ok: false, error: 'Resposta inválida do servidor' }
    } catch (err) {
      const errorMsg = err.response?.data?.error || 'Erro ao registrar administrador'
      set({ loading: false })
      return { ok: false, error: errorMsg }
    }
  },

  // Verificar token
  verifyToken: async () => {
    const token = get().token
    if (!token) return { ok: false }

    try {
      const { data } = await api.get('/api/admin/verifica-token')

      if (data.data && data.data.admin) {
        set({ admin: data.data.admin })
        return { ok: true, admin: data.data.admin }
      }
      return { ok: false }
    } catch (err) {
      set({ admin: null, token: null, loading: false })
      clearAdminStorage()
      return { ok: false, error: 'Token inválido ou expirado' }
    }
  },

  // Logout de admin
  logout: () => {
    localStorage.removeItem('admin_token')
    localStorage.removeItem('admin_user')
    deleteCookie('admin_token')
    deleteCookie('admin_user')
    set({ admin: null, token: null })
  },

  // Listar administradores
  listAdmins: async () => {
    const token = get().token
    if (!token) return { ok: false, error: 'Não autenticado' }

    try {
      const { data } = await api.get('/api/admin/list')
      return { ok: true, admins: data.data?.admins || [] }
    } catch (err) {
      const errorMsg = err.response?.data?.error || 'Erro ao listar administradores'
      return { ok: false, error: errorMsg }
    }
  },

  // Desativar admin
  deactivateAdmin: async (adminId) => {
    const token = get().token
    if (!token) return { ok: false, error: 'Não autenticado' }

    try {
      const { data } = await api.post(`/api/admin/deactivate/${adminId}`, {})
      return { ok: true, message: data.message }
    } catch (err) {
      const errorMsg = err.response?.data?.error || 'Erro ao desativar administrador'
      return { ok: false, error: errorMsg }
    }
  },

  // Ativar admin
  activateAdmin: async (adminId) => {
    const token = get().token
    if (!token) return { ok: false, error: 'Não autenticado' }

    try {
      const { data } = await api.post(`/api/admin/activate/${adminId}`, {})
      return { ok: true, message: data.message }
    } catch (err) {
      const errorMsg = err.response?.data?.error || 'Erro ao ativar administrador'
      return { ok: false, error: errorMsg }
    }
  },

  // Deletar admin
  deleteAdmin: async (adminId) => {
    const token = get().token
    if (!token) return { ok: false, error: 'Não autenticado' }

    try {
      const { data } = await api.delete(`/api/admin/${adminId}`)
      return { ok: true, message: data.message }
    } catch (err) {
      const errorMsg = err.response?.data?.error || 'Erro ao deletar administrador'
      return { ok: false, error: errorMsg }
    }
  }
}))

function clearAdminStorage() {
  localStorage.removeItem('admin_token')
  localStorage.removeItem('admin_user')
}

export default useAdminStore
