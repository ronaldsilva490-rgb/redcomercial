import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Eye, EyeOff, ArrowRight } from 'lucide-react'
import useAuthStore from '../../store/authStore'
import toast from 'react-hot-toast'
import LOGO from '../../assets/logo.png'

export default function Login() {
  const [loginVal, setLoginVal] = useState('')
  const [password,  setPassword]  = useState('')
  const [showPw,    setShowPw]    = useState(false)
  const { login: doLogin, loading } = useAuthStore()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    const result = await doLogin(loginVal.trim(), password)

    if (result.ok) {
      if (result.superadmin) {
        toast.success('Bem-vindo, Superadmin!')
        navigate('/superadmin')
      } else {
        toast.success('Bem-vindo ao RED!')
        navigate('/')
      }
    } else {
      toast.error(result.error)
    }
  }

  const inputStyle = {
    width: '100%', boxSizing: 'border-box',
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 10, padding: '12px 14px',
    color: '#fff', fontSize: 14, outline: 'none',
    transition: 'border-color 0.2s', fontFamily: 'inherit',
  }

  return (
    <div style={{
      minHeight: '100vh', background: '#080808',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: "'Outfit', sans-serif", position: 'relative', overflow: 'hidden',
    }}>
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none',
        background: 'radial-gradient(ellipse 80% 60% at 50% 0%, rgba(220,20,30,0.12) 0%, transparent 60%)' }} />
      <div style={{
        position: 'fixed', inset: 0, pointerEvents: 'none', opacity: 0.03,
        backgroundImage: 'linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)',
        backgroundSize: '40px 40px',
      }} />

      <div style={{ width: '100%', maxWidth: 420, padding: '0 24px', position: 'relative', zIndex: 1 }}>
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <img src={LOGO} alt="RED" style={{ width: 110, height: 110, objectFit: 'contain', filter: 'drop-shadow(0 0 24px rgba(220,20,30,0.5))' }} />
          <div style={{ marginTop: 4, fontSize: 11, color: 'rgba(255,255,255,0.3)', letterSpacing: 4, textTransform: 'uppercase' }}>
            Gestão Comercial
          </div>
        </div>

        <div style={{
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.07)',
          borderRadius: 16, padding: '32px 28px',
          backdropFilter: 'blur(12px)',
          boxShadow: '0 24px 64px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.05)',
        }}>
          <div style={{ marginBottom: 28 }}>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: '#fff', letterSpacing: -0.5 }}>
              Acessar sistema
            </h1>
            <p style={{ margin: '6px 0 0', fontSize: 13, color: 'rgba(255,255,255,0.4)' }}>
              Use seu usuário ou e-mail
            </p>
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.4)', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8 }}>
                Usuário ou E-mail
              </label>
              <input
                type="text"
                placeholder="nome.usuario ou seu@email.com"
                value={loginVal}
                onChange={e => setLoginVal(e.target.value)}
                required autoFocus autoComplete="username"
                style={inputStyle}
                onFocus={e => e.target.style.borderColor = 'rgba(220,20,30,0.6)'}
                onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.4)', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8 }}>
                Senha
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPw ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required autoComplete="current-password"
                  style={{ ...inputStyle, padding: '12px 44px 12px 14px' }}
                  onFocus={e => e.target.style.borderColor = 'rgba(220,20,30,0.6)'}
                  onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
                />
                <button type="button" onClick={() => setShowPw(!showPw)} style={{
                  position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: 'rgba(255,255,255,0.3)', padding: 4, display: 'flex',
                }}>
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button type="submit" disabled={loading} style={{
              marginTop: 8,
              background: loading ? 'rgba(220,20,30,0.4)' : 'linear-gradient(135deg, #dc141e 0%, #a50d15 100%)',
              border: 'none', borderRadius: 10, padding: '13px 20px',
              color: '#fff', fontSize: 14, fontWeight: 700, fontFamily: 'inherit',
              cursor: loading ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              boxShadow: loading ? 'none' : '0 8px 24px rgba(220,20,30,0.35)',
              transition: 'all 0.2s', letterSpacing: 0.3,
            }}>
              {loading
                ? <><div style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} /> Entrando...</>
                : <> Entrar <ArrowRight size={16} /></>
              }
            </button>
          </form>
        </div>

        <div style={{ textAlign: 'center', marginTop: 20 }}>
          <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.3)' }}>Não tem conta? </span>
          <Link to="/register" style={{ fontSize: 13, color: '#dc141e', fontWeight: 600, textDecoration: 'none' }}>
            Cadastre seu negócio
          </Link>
        </div>
        <div style={{ textAlign: 'center', marginTop: 16, fontSize: 11, color: 'rgba(255,255,255,0.15)' }}>
          RED v3.0 · theredsclub
        </div>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } } input::placeholder { color: rgba(255,255,255,0.2); }`}</style>
    </div>
  )
}
