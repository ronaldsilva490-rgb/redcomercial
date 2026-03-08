import { create } from 'zustand'
import api from '../services/api'

const useAdminStore = create((set, get) => ({
  admin: JSON.parse(localStorage.getItem('admin_user') || 'null'),
  token: localStorage.getItem('admin_token') || null,
  loading: false,

  // Login de admin
  login: async (login, password) => {
    set({ loading: true })
    try {
      const { data } = await api.post('/api/auth/admin/login', {
        login: login.trim(),
        senha: password
      })

      if (data.data) {
        const { access_token, admin } = data.data
        localStorage.setItem('admin_token', access_token)
        localStorage.setItem('admin_user', JSON.stringify(admin))
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
      const { data } = await api.post('/api/auth/admin/register', {
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
      const { data } = await api.get('/api/auth/admin/verifica-token', {
        headers: { Authorization: `Bearer ${token}` }
      })

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
    set({ admin: null, token: null })
  },

  // Listar administradores
  listAdmins: async () => {
    const token = get().token
    if (!token) return { ok: false, error: 'Não autenticado' }

    try {
      const { data } = await api.get('/api/auth/admin/list', {
        headers: { Authorization: `Bearer ${token}` }
      })
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
      const { data } = await api.post(`/api/auth/admin/deactivate/${adminId}`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      })
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
      const { data } = await api.post(`/api/auth/admin/activate/${adminId}`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      })
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
      const { data } = await api.delete(`/api/auth/admin/${adminId}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
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
