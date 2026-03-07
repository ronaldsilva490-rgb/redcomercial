import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Eye, EyeOff, ArrowRight, Lock } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../../services/api'
import LOGO from '../../assets/logo.png'

export default function AdminLogin() {
  const [login, setLogin] = useState('')
  const [senha, setSenha] = useState('')
  const [mostrarSenha, setMostrarSenha] = useState(false)
  const [carregando, setCarregando] = useState(false)
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!login || !senha) {
      toast.error('Preenchaa todos os campos')
      return
    }

    setCarregando(true)
    try {
      const { data } = await api.post('/api/auth/admin/login', {
        login: login.trim(),
        senha: senha
      })

      if (data.data) {
        localStorage.setItem('admin_token', data.data.access_token)
        localStorage.setItem('admin_user', JSON.stringify(data.data.admin))
        toast.success('Bem-vindo, Admin!')
        navigate('/admin/dashboard')
      }
    } catch (err) {
      const msg = err.response?.data?.error || 'Erro ao fazer login'
      toast.error(msg)
    } finally {
      setCarregando(false)
    }
  }

  const estiloInput = {
    width: '100%',
    boxSizing: 'border-box',
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 10,
    padding: '12px 14px',
    color: '#fff',
    fontSize: 14,
    outline: 'none',
    transition: 'all 0.2s',
    fontFamily: 'inherit',
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #080808 0%, #1a1a1a 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: "'Outfit', sans-serif",
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Background Effects */}
      <div style={{
        position: 'fixed', inset: 0, pointerEvents: 'none',
        background: 'radial-gradient(ellipse 80% 60% at 50% 0%, rgba(220,20,30,0.15) 0%, transparent 60%)'
      }} />
      <div style={{
        position: 'fixed', inset: 0, pointerEvents: 'none', opacity: 0.02,
        backgroundImage: 'linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)',
        backgroundSize: '40px 40px',
      }} />

      <div style={{ width: '100%', maxWidth: 420, padding: '0 24px', position: 'relative', zIndex: 1 }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <img src={LOGO} alt="RED" style={{
            width: 110, height: 110, objectFit: 'contain',
            filter: 'drop-shadow(0 0 24px rgba(220,20,30,0.5))'
          }} />
          <div style={{
            marginTop: 16, fontSize: 24, fontWeight: 700,
            color: '#fff', letterSpacing: -0.5, marginBottom: 4
          }}>
            Painel Admin
          </div>
          <div style={{
            fontSize: 13, color: 'rgba(255,255,255,0.4)',
            letterSpacing: 1, textTransform: 'uppercase'
          }}>
            Gerenciamento do Sistema
          </div>
        </div>

        {/* Form Card */}
        <div style={{
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.07)',
          borderRadius: 16,
          padding: '32px 28px',
          backdropFilter: 'blur(12px)',
          boxShadow: '0 24px 64px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.05)',
        }}>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Campo Login */}
            <div>
              <label style={{
                display: 'block', fontSize: 12, fontWeight: 600,
                color: 'rgba(255,255,255,0.6)', marginBottom: 8,
                textTransform: 'uppercase', letterSpacing: 0.5
              }}>Usuário ou Email</label>
              <input
                type="text"
                value={login}
                onChange={(e) => setLogin(e.target.value)}
                placeholder="admin ou admin@empresa.com"
                style={{
                  ...estiloInput,
                  '_focus': { borderColor: 'rgba(220,20,30,0.5)' }
                }}
                onFocus={(e) => e.target.style.borderColor = 'rgba(220,20,30,0.5)'}
                onBlur={(e) => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
                disabled={carregando}
              />
            </div>

            {/* Campo Senha */}
            <div>
              <label style={{
                display: 'block', fontSize: 12, fontWeight: 600,
                color: 'rgba(255,255,255,0.6)', marginBottom: 8,
                textTransform: 'uppercase', letterSpacing: 0.5
              }}>Senha</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={mostrarSenha ? 'text' : 'password'}
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  placeholder="••••••••"
                  style={estiloInput}
                  onFocus={(e) => e.target.style.borderColor = 'rgba(220,20,30,0.5)'}
                  onBlur={(e) => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
                  disabled={carregando}
                />
                <button
                  type="button"
                  onClick={() => setMostrarSenha(!mostrarSenha)}
                  style={{
                    position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)',
                    cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center'
                  }}
                >
                  {mostrarSenha ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Botão Login */}
            <button
              type="submit"
              disabled={carregando}
              style={{
                marginTop: 8, padding: '12px 16px',
                background: carregando
                  ? 'rgba(220,20,30,0.3)'
                  : 'linear-gradient(135deg, #dc141e 0%, #a00515 100%)',
                color: '#fff', fontSize: 14, fontWeight: 600,
                border: 'none', borderRadius: 10, cursor: carregando ? 'default' : 'pointer',
                transition: 'all 0.3s',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                opacity: carregando ? 0.6 : 1,
                transform: carregando ? 'scale(0.98)' : 'scale(1)',
              }}
            >
              {carregando ? (
                <>
                  <div style={{
                    width: 14, height: 14, border: '2px solid rgba(255,255,255,0.3)',
                    borderTopColor: '#fff', borderRadius: '50%',
                    animation: 'spin 0.8s linear infinite'
                  }} />
                  Autenticando...
                </>
              ) : (
                <>
                  Entrar
                  <ArrowRight size={14} />
                </>
              )}
            </button>

            {/* Informação */}
            <div style={{
              marginTop: 16, padding: 12, borderRadius: 8,
              background: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.3)',
              display: 'flex', gap: 10, fontSize: 12, color: 'rgba(255,255,255,0.7)'
            }}>
              <Lock size={16} style={{ flexShrink: 0, marginTop: 2, color: '#3b82f6' }} />
              <div>
                Você está acessando o painel de administração do sistema. Use suas credenciais de admin.
              </div>
            </div>
          </form>
        </div>

        {/* Versão */}
        <div style={{
          marginTop: 32, textAlign: 'center',
          fontSize: 11, color: 'rgba(255,255,255,0.2)', letterSpacing: 1
        }}>
          RED COMMERCIAL v5.0 — Admin Panel
        </div>
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}
