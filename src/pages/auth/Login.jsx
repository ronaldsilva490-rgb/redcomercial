import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Eye, EyeOff, ArrowRight, Lock, Settings } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../../services/api'
import LOGO from '../../assets/logo.png'

export default function Login() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [mostrarSenha, setMostrarSenha] = useState(false)
  const [carregando, setCarregando] = useState(false)

  useEffect(() => {
    document.title = 'RED - Gestão Integrada'
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!email || !senha) {
      toast.error('Preencha todos os campos')
      return
    }

    setCarregando(true)
    try {
      console.log('【LOGIN】 Tentando login com email:', email)
      const { data } = await api.post('/api/auth/login', {
        email: email.trim(),
        password: senha
      })

      console.log('【LOGIN】 Response:', data)

      if (data.data?.access_token) {
        localStorage.setItem('access_token', data.data.access_token)
        localStorage.setItem('refresh_token', data.data.refresh_token)
        localStorage.setItem('user', JSON.stringify(data.data.user))
        localStorage.setItem('tenant', JSON.stringify(data.data.tenant))
        localStorage.setItem('papel', data.data.papel)
        
        toast.success('Bem-vindo!')
        setTimeout(() => {
          navigate('/', { replace: true })
        }, 100)
      } else {
        toast.error('Resposta inválida do servidor')
      }
    } catch (err) {
      console.error('【LOGIN】 Erro:', err)
      const msg = err.response?.data?.error || err.response?.data?.detail || err.message || 'Erro ao fazer login'
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
      background: 'linear-gradient(135deg, #000000 0%, #050202 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: "'Outfit', sans-serif",
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Gradiente top - vermelho para preto */}
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        height: '400px',
        pointerEvents: 'none',
        background: 'linear-gradient(to bottom, rgba(220,20,30,0.25) 0%, rgba(220,20,30,0.12) 30%, transparent 80%)',
        zIndex: 0,
      }} />

      {/* Efeito grid futurista */}
      <div style={{
        position: 'fixed',
        inset: 0,
        pointerEvents: 'none',
        opacity: 0.08,
        backgroundImage: 'linear-gradient(rgba(220,20,30,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(220,20,30,0.3) 1px, transparent 1px)',
        backgroundSize: '50px 50px',
        zIndex: 0,
      }} />

      {/* Efeito gradiente radial sutil adicional */}
      <div style={{
        position: 'fixed',
        inset: 0,
        pointerEvents: 'none',
        background: 'radial-gradient(ellipse 120% 100% at 50% 0%, rgba(220,20,30,0.08) 0%, transparent 50%)',
        zIndex: 0,
      }} />

      <div style={{ width: '100%', maxWidth: 420, padding: '0 24px', position: 'relative', zIndex: 1 }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 28, display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
          <img src={LOGO} alt="RED" style={{
            width: 100,
            height: 100,
            objectFit: 'contain',
            marginBottom: 12,
            filter: 'drop-shadow(0 0 25px rgba(196,18,23,0.6)) drop-shadow(0 0 40px rgba(196,18,23,0.35))',
          }} />
          <div style={{
            fontSize: 18,
            fontWeight: 800,
            color: '#fff',
            letterSpacing: -0.5,
            marginBottom: 4,
            width: '100%',
          }}>
            RED - Sistema de Gestão
          </div>
          <div style={{
            fontSize: 12,
            color: 'rgba(255,255,255,0.4)',
            letterSpacing: 0.3,
            fontWeight: 400,
            lineHeight: 1.6,
            width: '100%',
          }}>
            Integrado. Inteligente. Seu negócio.
          </div>
        </div>

        {/* Form Card */}
        <div style={{
          background: 'rgba(255,255,255,0.04)',
          border: '2px solid #c41217',
          borderRadius: 20,
          padding: '32px 28px',
          backdropFilter: 'blur(16px)',
          boxShadow: '0 0 15px rgba(196,18,23,0.4), 0 0 25px rgba(196,18,23,0.15), inset 0 0 10px rgba(196,18,23,0.05), 0 32px 64px rgba(0,0,0,0.8), inset 0 1px 1px rgba(255,255,255,0.08)',
          position: 'relative',
          overflow: 'hidden',
          width: '100%',
        }}>
          <div style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(135deg, rgba(220,20,30,0.05) 0%, transparent 60%)',
            pointerEvents: 'none',
          }} />

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16, position: 'relative', zIndex: 1 }}>
            {/* Campo Email */}
            <div>
              <label style={{
                display: 'block',
                fontSize: 11,
                fontWeight: 700,
                color: 'rgba(255,255,255,0.5)',
                letterSpacing: 1,
                textTransform: 'uppercase',
                marginBottom: 10,
                textAlign: 'center',
              }}>
                E-mail
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu@email.com"
                disabled={carregando}
                required
                autoFocus
                autoComplete="email"
                style={{
                  ...estiloInput,
                  paddingLeft: '16px',
                  fontSize: 14,
                  boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = 'rgba(220,20,30,0.8)'
                  e.target.style.background = 'rgba(255,255,255,0.08)'
                  e.target.style.boxShadow = '0 4px 16px rgba(220,20,30,0.2)'
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = 'rgba(255,255,255,0.1)'
                  e.target.style.background = 'rgba(255,255,255,0.05)'
                  e.target.style.boxShadow = '0 4px 12px rgba(0,0,0,0.2)'
                }}
              />
            </div>

            {/* Campo Senha */}
            <div>
              <label style={{
                display: 'block',
                fontSize: 11,
                fontWeight: 700,
                color: 'rgba(255,255,255,0.5)',
                letterSpacing: 1,
                textTransform: 'uppercase',
                marginBottom: 10,
                textAlign: 'center',
              }}>
                Senha
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type={mostrarSenha ? 'text' : 'password'}
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  placeholder="••••••••••"
                  disabled={carregando}
                  required
                  autoComplete="current-password"
                  style={{
                    ...estiloInput,
                    paddingLeft: '16px',
                    paddingRight: '48px',
                    fontSize: 14,
                    boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
                    letterSpacing: '0.2em',
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = 'rgba(220,20,30,0.8)'
                    e.target.style.background = 'rgba(255,255,255,0.08)'
                    e.target.style.boxShadow = '0 4px 16px rgba(220,20,30,0.2)'
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = 'rgba(255,255,255,0.1)'
                    e.target.style.background = 'rgba(255,255,255,0.05)'
                    e.target.style.boxShadow = '0 4px 12px rgba(0,0,0,0.2)'
                  }}
                />
                <button
                  type="button"
                  onClick={() => setMostrarSenha(!mostrarSenha)}
                  disabled={carregando}
                  style={{
                    position: 'absolute',
                    right: 14,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    cursor: carregando ? 'default' : 'pointer',
                    color: 'rgba(255,255,255,0.35)',
                    padding: 6,
                    display: 'flex',
                    transition: 'color 0.2s',
                    opacity: carregando ? 0.5 : 1,
                  }}
                  onMouseEnter={e => {
                    if (!carregando) e.target.style.color = 'rgba(255,255,255,0.55)'
                  }}
                  onMouseLeave={e => {
                    if (!carregando) e.target.style.color = 'rgba(255,255,255,0.35)'
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
                marginTop: 8,
                background: carregando
                  ? 'rgba(153,20,20,0.35)'
                  : 'linear-gradient(135deg, #991414 0%, #6d0a0a 100%)',
                border: 'none',
                borderRadius: 12,
                padding: '15px 20px',
                color: '#fff',
                fontSize: 14,
                fontWeight: 800,
                fontFamily: 'inherit',
                cursor: carregando ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 10,
                boxShadow: carregando
                  ? 'inset 0 2px 4px rgba(0,0,0,0.3)'
                  : 'inset 0 1px 0 rgba(255,255,255,0.2), 0 12px 32px rgba(153,20,20,0.4)',
                transition: 'all 0.3s ease',
                letterSpacing: 0.5,
                textTransform: 'uppercase',
                width: '100%',
              }}
              onMouseEnter={e => {
                if (!carregando) {
                  e.target.style.boxShadow = 'inset 0 1px 0 rgba(255,255,255,0.3), 0 16px 40px rgba(153,20,20,0.5)'
                  e.target.style.transform = 'translateY(-2px)'
                }
              }}
              onMouseLeave={e => {
                if (!carregando) {
                  e.target.style.boxShadow = 'inset 0 1px 0 rgba(255,255,255,0.2), 0 12px 32px rgba(153,20,20,0.4)'
                  e.target.style.transform = 'translateY(0)'
                }
              }}
            >
              {carregando ? (
                <>
                  <div style={{
                    width: 16,
                    height: 16,
                    border: '2px solid rgba(255,255,255,0.3)',
                    borderTopColor: '#fff',
                    borderRadius: '50%',
                    animation: 'spin 0.8s linear infinite',
                  }} />
                  Autenticando...
                </>
              ) : (
                <>
                  Entrar
                  <ArrowRight size={18} />
                </>
              )}
            </button>

            {/* Botão Criar Conta */}
            <button
              type="button"
              onClick={() => navigate('/register')}
              style={{
                background: 'linear-gradient(135deg, #991414 0%, #6d0a0a 100%)',
                border: 'none',
                borderRadius: 12,
                padding: '10px 20px',
                color: '#fff',
                fontSize: 14,
                fontWeight: 800,
                fontFamily: 'inherit',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 10,
                boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.2), 0 12px 32px rgba(153,20,20,0.4)',
                transition: 'all 0.3s ease',
                letterSpacing: 0.5,
                textTransform: 'uppercase',
                width: '100%',
              }}
              onMouseEnter={e => {
                e.target.style.boxShadow = 'inset 0 1px 0 rgba(255,255,255,0.3), 0 16px 40px rgba(153,20,20,0.5)'
                e.target.style.transform = 'translateY(-2px)'
              }}
              onMouseLeave={e => {
                e.target.style.boxShadow = 'inset 0 1px 0 rgba(255,255,255,0.2), 0 12px 32px rgba(153,20,20,0.4)'
                e.target.style.transform = 'translateY(0)'
              }}
            >
              Cadastrar Negócio
            </button>

            {/* Informação Segurança */}
            <div style={{
              marginTop: 8,
              padding: '8px 12px',
              borderRadius: 12,
              background: 'rgba(220,20,30,0.1)',
              border: '1px solid rgba(220,20,30,0.2)',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              fontSize: 11,
              color: 'rgba(255,255,255,0.65)',
              whiteSpace: 'nowrap',
            }}>
              <Lock size={14} style={{
                flexShrink: 0,
                color: '#dc141e',
              }} />
              <span>Criptografia SSL/TLS ativa</span>
            </div>
          </form>
        </div>

        {/* Rodapé */}
        <div style={{
          marginTop: 20,
          textAlign: 'center',
          fontSize: 11,
          color: 'rgba(255,255,255,0.25)',
          letterSpacing: 0.3,
        }}>
          RED System Corporation™ © 2026. Todos os direitos reservados.
        </div>
      </div>

      {/* Botão Flutuante Admin */}
      <button
        onClick={() => navigate('/admin/login')}
        style={{
          position: 'fixed',
          bottom: 32,
          right: 32,
          width: 56,
          height: 56,
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #991414 0%, #6d0a0a 100%)',
          border: '2px solid #c41217',
          color: '#fff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          boxShadow: '0 0 15px rgba(196,18,23,0.4), 0 0 25px rgba(196,18,23,0.15), 0 8px 24px rgba(0,0,0,0.5)',
          transition: 'all 0.3s ease',
          zIndex: 99,
        }}
        onMouseEnter={e => {
          e.target.style.transform = 'scale(1.1)'
          e.target.style.boxShadow = '0 0 20px rgba(196,18,23,0.6), 0 0 35px rgba(196,18,23,0.25), 0 12px 32px rgba(0,0,0,0.6)'
        }}
        onMouseLeave={e => {
          e.target.style.transform = 'scale(1)'
          e.target.style.boxShadow = '0 0 15px rgba(196,18,23,0.4), 0 0 25px rgba(196,18,23,0.15), 0 8px 24px rgba(0,0,0,0.5)'
        }}
        title="Painel Administrativo"
      >
        <Settings size={24} />
      </button>

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}

