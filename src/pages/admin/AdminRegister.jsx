import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Eye, EyeOff, ArrowRight, Lock, AlertCircle } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../../services/api'
import LOGO from '../../assets/logo.png'

export default function AdminRegister() {
  const [nome, setNome] = useState('')
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [senhaConf, setSenhaConf] = useState('')
  const [palavraMestre, setPalavraMestre] = useState('')
  const [mostrarSenha, setMostrarSenha] = useState(false)
  const [mostrarSenhaConf, setMostrarSenhaConf] = useState(false)
  const [carregando, setCarregando] = useState(false)
  const navigate = useNavigate()

  const validar = () => {
    if (!nome || !username || !email || !senha || !senhaConf || !palavraMestre) {
      toast.error('Todos os campos são obrigatórios')
      return false
    }
    if (nome.length < 3) {
      toast.error('Nome deve ter ao menos 3 caracteres')
      return false
    }
    if (username.length < 3 || !/^[a-z0-9._-]+$/.test(username)) {
      toast.error('Username inválido (use apenas letras, números, ponto, traço e underline)')
      return false
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast.error('Email inválido')
      return false
    }
    if (senha.length < 8) {
      toast.error('Senha deve ter ao menos 8 caracteres')
      return false
    }
    if (senha !== senhaConf) {
      toast.error('Senhas não coincidem')
      return false
    }
    if (palavraMestre.length === 0) {
      toast.error('Palavra-mestre de admin obrigatória')
      return false
    }
    return true
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validar()) return

    setCarregando(true)
    try {
      const { data } = await api.post('/api/auth/admin/register', {
        nome: nome.trim(),
        username: username.trim().toLowerCase(),
        email: email.trim().toLowerCase(),
        senha: senha,
        palavra_mestre: palavraMestre
      })

      if (data.data) {
        toast.success('Administrador criado com sucesso!')
        setTimeout(() => navigate('/admin/login'), 1500)
      }
    } catch (err) {
      const msg = err.response?.data?.error || 'Erro ao criar administrador'
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
      overflow: 'hidden',
      padding: '20px'
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

      <div style={{ width: '100%', maxWidth: 480, position: 'relative', zIndex: 1 }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <img src={LOGO} alt="RED" style={{
            width: 90, height: 90, objectFit: 'contain',
            filter: 'drop-shadow(0 0 24px rgba(220,20,30,0.5))'
          }} />
          <div style={{
            marginTop: 16, fontSize: 24, fontWeight: 700,
            color: '#fff', letterSpacing: -0.5, marginBottom: 4
          }}>
            Criar Admin
          </div>
          <div style={{
            fontSize: 13, color: 'rgba(255,255,255,0.4)',
            letterSpacing: 1, textTransform: 'uppercase'
          }}>
            Novo Administrador do Sistema
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
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {/* Campo Nome */}
            <div>
              <label style={{
                display: 'block', fontSize: 11, fontWeight: 700,
                color: 'rgba(255,255,255,0.5)', marginBottom: 6,
                textTransform: 'uppercase', letterSpacing: 0.5
              }}>Nome Completo</label>
              <input
                type="text"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="João Silva"
                style={estiloInput}
                disabled={carregando}
              />
            </div>

            {/* Campo Username */}
            <div>
              <label style={{
                display: 'block', fontSize: 11, fontWeight: 700,
                color: 'rgba(255,255,255,0.5)', marginBottom: 6,
                textTransform: 'uppercase', letterSpacing: 0.5
              }}>Usuário (username)</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value.toLowerCase())}
                placeholder="joao_silva"
                style={estiloInput}
                disabled={carregando}
              />
              <small style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 4, display: 'block' }}>
                Apenas letras, números, ponto, traço e underline
              </small>
            </div>

            {/* Campo Email */}
            <div>
              <label style={{
                display: 'block', fontSize: 11, fontWeight: 700,
                color: 'rgba(255,255,255,0.5)', marginBottom: 6,
                textTransform: 'uppercase', letterSpacing: 0.5
              }}>Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@redcommercial.com"
                style={estiloInput}
                disabled={carregando}
              />
            </div>

            {/* Campo Senha */}
            <div>
              <label style={{
                display: 'block', fontSize: 11, fontWeight: 700,
                color: 'rgba(255,255,255,0.5)', marginBottom: 6,
                textTransform: 'uppercase', letterSpacing: 0.5
              }}>Senha</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={mostrarSenha ? 'text' : 'password'}
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  placeholder="••••••••••"
                  style={estiloInput}
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
                  {mostrarSenha ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              <small style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 4, display: 'block' }}>
                Mínimo 8 caracteres
              </small>
            </div>

            {/* Campo Confirmar Senha */}
            <div>
              <label style={{
                display: 'block', fontSize: 11, fontWeight: 700,
                color: 'rgba(255,255,255,0.5)', marginBottom: 6,
                textTransform: 'uppercase', letterSpacing: 0.5
              }}>Confirmar Senha</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={mostrarSenhaConf ? 'text' : 'password'}
                  value={senhaConf}
                  onChange={(e) => setSenhaConf(e.target.value)}
                  placeholder="••••••••••"
                  style={estiloInput}
                  disabled={carregando}
                />
                <button
                  type="button"
                  onClick={() => setMostrarSenhaConf(!mostrarSenhaConf)}
                  style={{
                    position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)',
                    cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center'
                  }}
                >
                  {mostrarSenhaConf ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Campo Palavra-Mestre */}
            <div style={{
              padding: 12, borderRadius: 8,
              background: 'rgba(220, 20, 30, 0.1)',
              border: '1px solid rgba(220, 20, 30, 0.3)',
              marginBottom: 8
            }}>
              <label style={{
                display: 'block', fontSize: 11, fontWeight: 700,
                color: 'rgba(255,255,255,0.6)', marginBottom: 6,
                textTransform: 'uppercase', letterSpacing: 0.5,
                display: 'flex', alignItems: 'center', gap: 6
              }}>
                <Lock size={14} color='#dc141e' /> Palavra-Mestre do Admin
              </label>
              <input
                type="password"
                value={palavraMestre}
                onChange={(e) => setPalavraMestre(e.target.value)}
                placeholder="Palavra-mestre"
                style={{
                  ...estiloInput,
                  background: 'rgba(255,255,255,0.08)'
                }}
                disabled={carregando}
              />
              <small style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', marginTop: 4, display: 'block' }}>
                Digite a palavra-chave secreta para criar um novo administrador
              </small>
            </div>

            {/* Botão Cadastro */}
            <button
              type="submit"
              disabled={carregando}
              style={{
                marginTop: 16, padding: '12px 16px',
                background: carregando
                  ? 'rgba(220,20,30,0.3)'
                  : 'linear-gradient(135deg, #dc141e 0%, #a00515 100%)',
                color: '#fff', fontSize: 14, fontWeight: 600,
                border: 'none', borderRadius: 10, cursor: carregando ? 'default' : 'pointer',
                transition: 'all 0.3s',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                opacity: carregando ? 0.6 : 1,
              }}
            >
              {carregando ? (
                <>
                  <div style={{
                    width: 14, height: 14, border: '2px solid rgba(255,255,255,0.3)',
                    borderTopColor: '#fff', borderRadius: '50%',
                    animation: 'spin 0.8s linear infinite'
                  }} />
                  Criando...
                </>
              ) : (
                <>
                  Criar Administrador
                  <ArrowRight size={14} />
                </>
              )}
            </button>

            {/* Info Alert */}
            <div style={{
              marginTop: 12, padding: 12, borderRadius: 8,
              background: 'rgba(251, 146, 60, 0.1)', border: '1px solid rgba(251, 146, 60, 0.3)',
              display: 'flex', gap: 10, fontSize: 12, color: 'rgba(255,255,255,0.7)'
            }}>
              <AlertCircle size={16} style={{ flexShrink: 0, marginTop: 2, color: '#fb923c' }} />
              <div>
                A palavra-mestre é obrigatória. Ela foi fornecida no email de configuração do sistema.
              </div>
            </div>
          </form>
        </div>

        {/* Link para Login */}
        <div style={{
          marginTop: 20, textAlign: 'center',
          fontSize: 13, color: 'rgba(255,255,255,0.6)'
        }}>
          Já é admin?{' '}
          <a
            href="/admin/login"
            style={{
              color: '#dc141e', textDecoration: 'none', fontWeight: 600,
              cursor: 'pointer', transition: 'color 0.2s'
            }}
            onMouseEnter={(e) => e.target.style.color = '#ff4d4d'}
            onMouseLeave={(e) => e.target.style.color = '#dc141e'}
          >
            Faça login
          </a>
        </div>

        {/* Versão */}
        <div style={{
          marginTop: 24, textAlign: 'center',
          fontSize: 11, color: 'rgba(255,255,255,0.2)', letterSpacing: 1
        }}>
          RED COMMERCIAL v5.0 — Admin Console
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
