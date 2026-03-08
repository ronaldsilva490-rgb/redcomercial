import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Trash2, RefreshCw, Check, X, Eye, EyeOff, Lock, LogOut } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../../services/api'
import useAdminStore from '../../store/adminStore'
import LOGO from '../../assets/logo.png'

export default function AdminManagement() {
  const navigate = useNavigate()
  const { admin, logout } = useAdminStore()
  const [admins, setAdmins] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState({
    nome: '',
    username: '',
    email: '',
    senha: '',
    senhaConf: '',
    palavraMestre: ''
  })
  const [mostrarSenha, setMostrarSenha] = useState(false)
  const [mostrarSenhaConf, setMostrarSenhaConf] = useState(false)

  useEffect(() => {
    carregarAdmins()
  }, [])

  const carregarAdmins = async () => {
    try {
      setCarregando(true)
      const token = localStorage.getItem('admin_token')
      const { data } = await api.get('/api/admin/list', {
        headers: { Authorization: `Bearer ${token}` }
      })
      setAdmins(data.data?.admins || [])
    } catch (err) {
      const msg = err.response?.data?.error || 'Erro ao carregar administradores'
      toast.error(msg)
    } finally {
      setCarregando(false)
    }
  }

  const validarForm = () => {
    const { nome, username, email, senha, senhaConf, palavraMestre } = form

    if (!nome || !username || !email || !senha || !senhaConf || !palavraMestre) {
      toast.error('Todos os campos são obrigatórios')
      return false
    }

    if (nome.length < 3) {
      toast.error('Nome deve ter no mínimo 3 caracteres')
      return false
    }

    if (username.length < 3 || !/^[a-z0-9._-]+$/.test(username)) {
      toast.error('Username inválido (apenas letras, números, ponto, traço e underline)')
      return false
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast.error('Email inválido')
      return false
    }

    if (senha.length < 8) {
      toast.error('Senha deve ter no mínimo 8 caracteres')
      return false
    }

    if (senha !== senhaConf) {
      toast.error('Senhas não coincidem')
      return false
    }

    if (!palavraMestre) {
      toast.error('Palavra-mestre de admin obrigatória')
      return false
    }

    return true
  }

  const handleCriarAdmin = async () => {
    if (!validarForm()) return

    setSalvando(true)
    try {
      const token = localStorage.getItem('admin_token')
      const { data } = await api.post('/api/auth/admin/register', {
        nome: form.nome.trim(),
        username: form.username.toLowerCase(),
        email: form.email.toLowerCase(),
        senha: form.senha,
        palavra_mestre: form.palavraMestre
      }, {
        headers: { Authorization: `Bearer ${token}` }
      })

      toast.success('Administrador criado com sucesso')
      setForm({
        nome: '',
        username: '',
        email: '',
        senha: '',
        senhaConf: '',
        palavraMestre: ''
      })
      setModal(false)
      await carregarAdmins()
    } catch (err) {
      const msg = err.response?.data?.error || 'Erro ao criar administrador'
      toast.error(msg)
    } finally {
      setSalvando(false)
    }
  }

  const handleDesativarAdmin = async (adminId) => {
    if (!confirm('Desativar este administrador?')) return

    try {
      const token = localStorage.getItem('admin_token')
      await api.post(`/api/admin/deactivate/${adminId}`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      })
      toast.success('Administrador desativado')
      await carregarAdmins()
    } catch (err) {
      const msg = err.response?.data?.error || 'Erro ao desativar administrador'
      toast.error(msg)
    }
  }

  const handleAtivarAdmin = async (adminId) => {
    try {
      const token = localStorage.getItem('admin_token')
      await api.post(`/api/admin/activate/${adminId}`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      })
      toast.success('Administrador ativado')
      await carregarAdmins()
    } catch (err) {
      const msg = err.response?.data?.error || 'Erro ao ativar administrador'
      toast.error(msg)
    }
  }

  const handleDeletarAdmin = async (adminId) => {
    if (!confirm('Deletar permanentemente este administrador? Esta ação é irreversível.')) return

    try {
      const token = localStorage.getItem('admin_token')
      await api.delete(`/api/admin/${adminId}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      toast.success('Administrador deletado')
      await carregarAdmins()
    } catch (err) {
      const msg = err.response?.data?.error || 'Erro ao deletar administrador'
      toast.error(msg)
    }
  }

  const handleLogout = () => {
    logout()
    toast.success('Desconectado com sucesso')
    navigate('/admin/login')
  }

  const estiloInput = {
    width: '100%',
    boxSizing: 'border-box',
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 8,
    padding: '10px 12px',
    color: '#fff',
    fontSize: 13,
    outline: 'none',
    transition: 'all 0.2s',
    fontFamily: 'inherit',
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #080808 0%, #1a1a1a 100%)',
      color: '#fff',
      fontFamily: "'Outfit', sans-serif",
      padding: '20px'
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 40,
        padding: '20px',
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.07)',
        borderRadius: 12,
        backdropFilter: 'blur(12px)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <img src={LOGO} alt="RED" style={{ width: 50, height: 50 }} />
          <div>
            <div style={{ fontSize: 20, fontWeight: 700 }}>Gerenciamento de Admins</div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginTop: 4 }}>
              Logado como: <strong>{admin?.nome}</strong>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={() => navigate('/admin/dashboard')}
            style={{
              padding: '8px 16px',
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 8,
              color: '#fff',
              cursor: 'pointer',
              fontSize: 13,
              transition: 'all 0.2s'
            }}
          >
            ← Dashboard
          </button>
          <button
            onClick={handleLogout}
            style={{
              padding: '8px 16px',
              background: 'rgba(220,20,30,0.2)',
              border: '1px solid rgba(220,20,30,0.3)',
              borderRadius: 8,
              color: '#dc141e',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              fontSize: 13,
              transition: 'all 0.2s'
            }}
          >
            <LogOut size={14} />
            Sair
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div style={{
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.07)',
        borderRadius: 12,
        padding: '24px',
        backdropFilter: 'blur(12px)'
      }}>
        {/* Toolbar */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 24,
          paddingBottom: 16,
          borderBottom: '1px solid rgba(255,255,255,0.1)'
        }}>
          <div style={{ fontSize: 16, fontWeight: 600 }}>
            Total de Administradores: <strong>{admins.length}</strong>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              onClick={carregarAdmins}
              disabled={carregando}
              style={{
                padding: '8px 16px',
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 8,
                color: '#fff',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                fontSize: 13,
                transition: 'all 0.2s'
              }}
            >
              <RefreshCw size={14} style={{ animation: carregando ? 'spin 1s linear infinite' : 'none' }} />
              Recarregar
            </button>
            <button
              onClick={() => setModal(true)}
              style={{
                padding: '8px 16px',
                background: 'rgba(34,197,94,0.2)',
                border: '1px solid rgba(34,197,94,0.3)',
                borderRadius: 8,
                color: '#22c55e',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                fontSize: 13,
                fontWeight: 600,
                transition: 'all 0.2s'
              }}
            >
              <Plus size={14} />
              Novo Admin
            </button>
          </div>
        </div>

        {/* Lista de Admins */}
        {carregando ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'rgba(255,255,255,0.5)' }}>
            Carregando administradores...
          </div>
        ) : admins.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'rgba(255,255,255,0.5)' }}>
            Nenhum administrador cadastrado
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{
              width: '100%',
              borderCollapse: 'collapse',
              fontSize: 13
            }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                  <th style={{ padding: '12px', textAlign: 'left', color: 'rgba(255,255,255,0.6)', fontWeight: 600 }}>Nome</th>
                  <th style={{ padding: '12px', textAlign: 'left', color: 'rgba(255,255,255,0.6)', fontWeight: 600 }}>Username</th>
                  <th style={{ padding: '12px', textAlign: 'left', color: 'rgba(255,255,255,0.6)', fontWeight: 600 }}>Email</th>
                  <th style={{ padding: '12px', textAlign: 'center', color: 'rgba(255,255,255,0.6)', fontWeight: 600 }}>Status</th>
                  <th style={{ padding: '12px', textAlign: 'right', color: 'rgba(255,255,255,0.6)', fontWeight: 600 }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {admins.map((adm, idx) => (
                  <tr key={adm.id} style={{
                    borderBottom: '1px solid rgba(255,255,255,0.05)',
                    background: idx % 2 === 0 ? 'rgba(255,255,255,0.01)' : 'transparent'
                  }}>
                    <td style={{ padding: '12px' }}>{adm.nome}</td>
                    <td style={{ padding: '12px', color: 'rgba(255,255,255,0.7)' }}>{adm.username}</td>
                    <td style={{ padding: '12px', color: 'rgba(255,255,255,0.7)' }}>{adm.email}</td>
                    <td style={{ padding: '12px', textAlign: 'center' }}>
                      {adm.ativo ? (
                        <span style={{ color: '#22c55e', display: 'flex', alignItems: 'center', gap: 4, justifyContent: 'center' }}>
                          <Check size={14} /> Ativo
                        </span>
                      ) : (
                        <span style={{ color: '#ef4444', display: 'flex', alignItems: 'center', gap: 4, justifyContent: 'center' }}>
                          <X size={14} /> Inativo
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '12px', textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                        {adm.ativo ? (
                          <button
                            onClick={() => handleDesativarAdmin(adm.id)}
                            title="Desativar"
                            style={{
                              width: 32, height: 32,
                              background: 'rgba(239,68,68,0.2)',
                              border: 'none',
                              borderRadius: 6,
                              color: '#ef4444',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: 14,
                              transition: 'all 0.2s'
                            }}
                          >
                            <Lock size={14} />
                          </button>
                        ) : (
                          <button
                            onClick={() => handleAtivarAdmin(adm.id)}
                            title="Ativar"
                            style={{
                              width: 32, height: 32,
                              background: 'rgba(34,197,94,0.2)',
                              border: 'none',
                              borderRadius: 6,
                              color: '#22c55e',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: 14,
                              transition: 'all 0.2s'
                            }}
                          >
                            <Check size={14} />
                          </button>
                        )}
                        <button
                          onClick={() => handleDeletarAdmin(adm.id)}
                          title="Deletar"
                          style={{
                            width: 32, height: 32,
                            background: 'rgba(220,20,30,0.2)',
                            border: 'none',
                            borderRadius: 6,
                            color: '#dc141e',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: 14,
                            transition: 'all 0.2s'
                          }}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Criar Admin */}
      {modal && (
        <div style={{
          position: 'fixed', inset: 0,
          background: 'rgba(0,0,0,0.7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            width: '100%', maxWidth: 450,
            background: 'rgba(255,255,255,0.08)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 12,
            padding: 32,
            backdropFilter: 'blur(12px)'
          }}>
            <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 20 }}>Novo Administrador</div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <input
                type="text"
                placeholder="Nome completo"
                value={form.nome}
                onChange={(e) => setForm({ ...form, nome: e.target.value })}
                style={estiloInput}
              />
              <input
                type="text"
                placeholder="Username"
                value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value })}
                style={estiloInput}
              />
              <input
                type="email"
                placeholder="Email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                style={estiloInput}
              />
              <div style={{ position: 'relative' }}>
                <input
                  type={mostrarSenha ? 'text' : 'password'}
                  placeholder="Senha"
                  value={form.senha}
                  onChange={(e) => setForm({ ...form, senha: e.target.value })}
                  style={estiloInput}
                />
                <button
                  onClick={() => setMostrarSenha(!mostrarSenha)}
                  style={{
                    position: 'absolute', right: 12, top: '50%',
                    background: 'none', border: 'none', color: 'rgba(255,255,255,0.6)',
                    cursor: 'pointer', transform: 'translateY(-50%)'
                  }}
                >
                  {mostrarSenha ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              <div style={{ position: 'relative' }}>
                <input
                  type={mostrarSenhaConf ? 'text' : 'password'}
                  placeholder="Confirmar senha"
                  value={form.senhaConf}
                  onChange={(e) => setForm({ ...form, senhaConf: e.target.value })}
                  style={estiloInput}
                />
                <button
                  onClick={() => setMostrarSenhaConf(!mostrarSenhaConf)}
                  style={{
                    position: 'absolute', right: 12, top: '50%',
                    background: 'none', border: 'none', color: 'rgba(255,255,255,0.6)',
                    cursor: 'pointer', transform: 'translateY(-50%)'
                  }}
                >
                  {mostrarSenhaConf ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              <input
                type="password"
                placeholder="Palavra-mestre de admin"
                value={form.palavraMestre}
                onChange={(e) => setForm({ ...form, palavraMestre: e.target.value })}
                style={estiloInput}
              />
            </div>

            <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
              <button
                onClick={() => setModal(false)}
                disabled={salvando}
                style={{
                  flex: 1,
                  padding: '10px 16px',
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: 8,
                  color: '#fff',
                  cursor: 'pointer',
                  fontSize: 13,
                  fontWeight: 600,
                  transition: 'all 0.2s'
                }}
              >
                Cancelar
              </button>
              <button
                onClick={handleCriarAdmin}
                disabled={salvando}
                style={{
                  flex: 1,
                  padding: '10px 16px',
                  background: 'rgba(34,197,94,0.3)',
                  border: '1px solid rgba(34,197,94,0.5)',
                  borderRadius: 8,
                  color: '#22c55e',
                  cursor: 'pointer',
                  fontSize: 13,
                  fontWeight: 600,
                  transition: 'all 0.2s',
                  opacity: salvando ? 0.6 : 1
                }}
              >
                {salvando ? 'Criando...' : 'Criar'}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}
