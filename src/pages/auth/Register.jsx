import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { ArrowRight, ArrowLeft, Car, UtensilsCrossed, ShoppingBag, Check, Building2, Phone, Mail, MapPin } from 'lucide-react'
import api from '../../services/api'
import useAuthStore from '../../store/authStore'
import toast from 'react-hot-toast'
import LOGO from '../../assets/logo.png'

const TIPOS = [
  {
    id: 'concessionaria',
    icon: Car,
    label: 'Concessionária',
    desc: 'Veículos, estoque, CRM de leads, oficina e financeiro',
    color: '#3b82f6',
  },
  {
    id: 'restaurante',
    icon: UtensilsCrossed,
    label: 'Bar / Restaurante',
    desc: 'Mesas, comandas, cardápio, cozinha e caixa',
    color: '#f59e0b',
  },
  {
    id: 'comercio',
    icon: ShoppingBag,
    label: 'Comércio',
    desc: 'Estoque, PDV, código de barras e financeiro',
    color: '#10b981',
  },
]

const STEPS = ['Tipo de negócio', 'Dados da empresa', 'Seu acesso']

export default function Register() {
  const [step, setStep] = useState(0)
  const [tipo, setTipo] = useState(null)
  const [form, setForm] = useState({
    nome: '', cnpj: '', telefone: '', cidade: '', estado: '',
    email: '', password: '', confirmPassword: '',
  })
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const { login } = useAuthStore()

  const f = (k, v) => setForm(p => ({ ...p, [k]: v }))

  const handleNext = () => {
    if (step === 0 && !tipo) return toast.error('Selecione o tipo de negócio')
    if (step === 1 && !form.nome) return toast.error('Informe o nome do negócio')
    setStep(s => s + 1)
  }

  const handleSubmit = async () => {
    if (!form.email || !form.password) return toast.error('Preencha email e senha')
    if (form.password !== form.confirmPassword) return toast.error('Senhas não conferem')
    if (form.password.length < 6) return toast.error('Senha mínima: 6 caracteres')
    setLoading(true)
    try {
      await api.post('/api/auth/register', {
        email: form.email,
        password: form.password,
        tenant: { nome: form.nome, tipo, cnpj: form.cnpj, telefone: form.telefone, cidade: form.cidade, estado: form.estado },
      })
      const result = await login(form.email, form.password)
      if (result.ok) {
        toast.success('Bem-vindo ao RED! Seu negócio foi criado.')
        navigate('/')
      }
    } catch (err) {
      toast.error(err.response?.data?.error || 'Erro ao criar conta')
    } finally {
      setLoading(false)
    }
  }

  const inputStyle = {
    width: '100%', boxSizing: 'border-box',
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 10, padding: '12px 14px',
    color: '#fff', fontSize: 14, outline: 'none',
    fontFamily: 'inherit',
  }

  const labelStyle = {
    display: 'block', fontSize: 11, fontWeight: 600,
    color: 'rgba(255,255,255,0.4)', letterSpacing: 1,
    textTransform: 'uppercase', marginBottom: 8,
  }

  return (
    <div style={{
      minHeight: '100vh', background: '#080808',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: "'Outfit', sans-serif", position: 'relative', overflow: 'hidden',
    }}>
      <div style={{
        position: 'fixed', inset: 0, pointerEvents: 'none',
        background: 'radial-gradient(ellipse 80% 60% at 50% 0%, rgba(220,20,30,0.1) 0%, transparent 60%)',
      }} />
      <div style={{
        position: 'fixed', inset: 0, pointerEvents: 'none', opacity: 0.03,
        backgroundImage: 'linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)',
        backgroundSize: '40px 40px',
      }} />

      <div style={{ width: '100%', maxWidth: 500, padding: '0 24px', position: 'relative', zIndex: 1 }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <img src={LOGO} alt="RED" style={{ width: 80, height: 80, objectFit: 'contain', filter: 'drop-shadow(0 0 20px rgba(220,20,30,0.4))' }} />
        </div>

        {/* Steps indicator */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0, marginBottom: 28 }}>
          {STEPS.map((s, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center' }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                <div style={{
                  width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: i < step ? '#dc141e' : i === step ? 'rgba(220,20,30,0.2)' : 'rgba(255,255,255,0.05)',
                  border: `2px solid ${i <= step ? '#dc141e' : 'rgba(255,255,255,0.1)'}`,
                  fontSize: 12, fontWeight: 700, color: i <= step ? '#fff' : 'rgba(255,255,255,0.3)',
                  transition: 'all 0.3s',
                }}>
                  {i < step ? <Check size={14} /> : i + 1}
                </div>
                <span style={{ fontSize: 10, color: i <= step ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.2)', whiteSpace: 'nowrap' }}>{s}</span>
              </div>
              {i < STEPS.length - 1 && (
                <div style={{ width: 60, height: 2, margin: '0 8px', marginBottom: 20, background: i < step ? '#dc141e' : 'rgba(255,255,255,0.08)', transition: 'all 0.3s' }} />
              )}
            </div>
          ))}
        </div>

        {/* Card */}
        <div style={{
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.07)',
          borderRadius: 16, padding: '28px 28px',
          backdropFilter: 'blur(12px)',
          boxShadow: '0 24px 64px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.05)',
        }}>

          {/* STEP 0 - Tipo */}
          {step === 0 && (
            <div>
              <h2 style={{ margin: '0 0 6px', fontSize: 20, fontWeight: 700, color: '#fff' }}>Qual é o seu negócio?</h2>
              <p style={{ margin: '0 0 24px', fontSize: 13, color: 'rgba(255,255,255,0.4)' }}>Escolha o tipo para personalizar o sistema</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {TIPOS.map(t => {
                  const Icon = t.icon
                  const selected = tipo === t.id
                  return (
                    <button key={t.id} onClick={() => setTipo(t.id)} style={{
                      background: selected ? `rgba(${t.color === '#3b82f6' ? '59,130,246' : t.color === '#f59e0b' ? '245,158,11' : '16,185,129'},0.1)` : 'rgba(255,255,255,0.03)',
                      border: `1.5px solid ${selected ? t.color : 'rgba(255,255,255,0.08)'}`,
                      borderRadius: 12, padding: '16px 18px',
                      display: 'flex', alignItems: 'center', gap: 16,
                      cursor: 'pointer', textAlign: 'left', transition: 'all 0.2s', width: '100%',
                    }}>
                      <div style={{
                        width: 44, height: 44, borderRadius: 10, flexShrink: 0,
                        background: selected ? t.color : 'rgba(255,255,255,0.06)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        transition: 'all 0.2s',
                      }}>
                        <Icon size={20} color={selected ? '#fff' : 'rgba(255,255,255,0.4)'} />
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 15, fontWeight: 700, color: selected ? '#fff' : 'rgba(255,255,255,0.7)', marginBottom: 3 }}>{t.label}</div>
                        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', lineHeight: 1.4 }}>{t.desc}</div>
                      </div>
                      <div style={{
                        width: 20, height: 20, borderRadius: '50%', flexShrink: 0,
                        border: `2px solid ${selected ? t.color : 'rgba(255,255,255,0.15)'}`,
                        background: selected ? t.color : 'transparent',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        {selected && <Check size={11} color="#fff" />}
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* STEP 1 - Dados do negócio */}
          {step === 1 && (
            <div>
              <h2 style={{ margin: '0 0 6px', fontSize: 20, fontWeight: 700, color: '#fff' }}>Dados da empresa</h2>
              <p style={{ margin: '0 0 24px', fontSize: 13, color: 'rgba(255,255,255,0.4)' }}>Como o seu negócio vai aparecer no sistema</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div>
                  <label style={labelStyle}><Building2 size={10} style={{ marginRight: 4 }} />Nome do negócio *</label>
                  <input style={inputStyle} placeholder="Ex: Auto House SP" value={form.nome} onChange={e => f('nome', e.target.value)}
                    onFocus={e => e.target.style.borderColor = 'rgba(220,20,30,0.6)'} onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'} />
                </div>
                <div>
                  <label style={labelStyle}>CNPJ</label>
                  <input style={inputStyle} placeholder="00.000.000/0001-00" value={form.cnpj} onChange={e => f('cnpj', e.target.value)}
                    onFocus={e => e.target.style.borderColor = 'rgba(220,20,30,0.6)'} onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label style={labelStyle}><Phone size={10} style={{ marginRight: 4 }} />Telefone</label>
                    <input style={inputStyle} placeholder="(11) 99999-9999" value={form.telefone} onChange={e => f('telefone', e.target.value)}
                      onFocus={e => e.target.style.borderColor = 'rgba(220,20,30,0.6)'} onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'} />
                  </div>
                  <div>
                    <label style={labelStyle}><MapPin size={10} style={{ marginRight: 4 }} />Estado</label>
                    <select style={{ ...inputStyle, cursor: 'pointer' }} value={form.estado} onChange={e => f('estado', e.target.value)}>
                      <option value="">Selecione</option>
                      {['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'].map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <label style={labelStyle}><MapPin size={10} style={{ marginRight: 4 }} />Cidade</label>
                  <input style={inputStyle} placeholder="São Paulo" value={form.cidade} onChange={e => f('cidade', e.target.value)}
                    onFocus={e => e.target.style.borderColor = 'rgba(220,20,30,0.6)'} onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'} />
                </div>
              </div>
            </div>
          )}

          {/* STEP 2 - Acesso */}
          {step === 2 && (
            <div>
              <h2 style={{ margin: '0 0 6px', fontSize: 20, fontWeight: 700, color: '#fff' }}>Criar seu acesso</h2>
              <p style={{ margin: '0 0 24px', fontSize: 13, color: 'rgba(255,255,255,0.4)' }}>Você será o administrador de <strong style={{ color: '#fff' }}>{form.nome}</strong></p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div>
                  <label style={labelStyle}><Mail size={10} style={{ marginRight: 4 }} />Email</label>
                  <input type="email" style={inputStyle} placeholder="seu@email.com" value={form.email} onChange={e => f('email', e.target.value)}
                    onFocus={e => e.target.style.borderColor = 'rgba(220,20,30,0.6)'} onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'} />
                </div>
                <div>
                  <label style={labelStyle}>Senha</label>
                  <input type="password" style={inputStyle} placeholder="Mínimo 6 caracteres" value={form.password} onChange={e => f('password', e.target.value)}
                    onFocus={e => e.target.style.borderColor = 'rgba(220,20,30,0.6)'} onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'} />
                </div>
                <div>
                  <label style={labelStyle}>Confirmar senha</label>
                  <input type="password" style={inputStyle} placeholder="Repita a senha" value={form.confirmPassword} onChange={e => f('confirmPassword', e.target.value)}
                    onFocus={e => e.target.style.borderColor = 'rgba(220,20,30,0.6)'} onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'} />
                </div>
              </div>
            </div>
          )}

          {/* Navigation */}
          <div style={{ display: 'flex', gap: 12, marginTop: 28 }}>
            {step > 0 && (
              <button onClick={() => setStep(s => s - 1)} style={{
                flex: 1, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 10, padding: '13px', color: 'rgba(255,255,255,0.6)', fontSize: 14,
                fontWeight: 600, fontFamily: 'inherit', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              }}>
                <ArrowLeft size={16} /> Voltar
              </button>
            )}
            <button
              onClick={step === 2 ? handleSubmit : handleNext}
              disabled={loading}
              style={{
                flex: 2,
                background: loading ? 'rgba(220,20,30,0.4)' : 'linear-gradient(135deg, #dc141e 0%, #a50d15 100%)',
                border: 'none', borderRadius: 10, padding: '13px',
                color: '#fff', fontSize: 14, fontWeight: 700, fontFamily: 'inherit',
                cursor: loading ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                boxShadow: loading ? 'none' : '0 8px 24px rgba(220,20,30,0.35)',
              }}>
              {loading ? (
                <><div style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} /> Criando...</>
              ) : step === 2 ? (
                <><Check size={16} /> Criar negócio</>
              ) : (
                <>Continuar <ArrowRight size={16} /></>
              )}
            </button>
          </div>
        </div>

        <div style={{ textAlign: 'center', marginTop: 20 }}>
          <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.3)' }}>Já tem conta? </span>
          <Link to="/login" style={{ fontSize: 13, color: '#dc141e', fontWeight: 600, textDecoration: 'none' }}>Entrar</Link>
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        input::placeholder, select option { color: rgba(255,255,255,0.2); background: #111; }
        select { appearance: none; }
      `}</style>
    </div>
  )
}
