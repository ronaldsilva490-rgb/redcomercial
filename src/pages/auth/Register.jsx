import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, ArrowLeft, Check, Building2, Phone, Mail, MapPin, Eye, EyeOff, Settings } from 'lucide-react'
import api from '../../services/api'
import useAuthStore from '../../store/authStore'
import supabase from '../../services/supabaseClient'
import toast from 'react-hot-toast'
import LOGO from '../../assets/logo.png'

const STEPS = ['Tipo de negócio', 'Dados da empresa', 'Seu acesso']

export default function Register() {
  const navigate = useNavigate()
  const [step, setStep] = useState(0)
  const [tipo, setTipo] = useState(null)
  const [tipos, setTipos] = useState([])
  const [loadingTipos, setLoadingTipos] = useState(true)
  const [mostrarSenha, setMostrarSenha] = useState(false)
  const [mostrarConfirm, setMostrarConfirm] = useState(false)
  const [form, setForm] = useState({
    nome: '', cnpj: '', telefone: '', cidade: '', estado: '',
    email: '', password: '', confirmPassword: '',
  })
  const [loading, setLoading] = useState(false)
  const { login } = useAuthStore()

  useEffect(() => {
    document.title = 'RED - Gestão Integrada'
  }, [])

  // Carregar tipos de negócio da API
  useEffect(() => {
    const fetchTipos = async () => {
      try {
        console.log('【REGISTER】 Iniciando fetch de tipos de negócio...')
        console.log('【REGISTER】 Base URL:', api.defaults.baseURL)
        console.log('【REGISTER】 Token:', localStorage.getItem('access_token') ? 'Sim' : 'Não')
        
        // Teste com fetch direto
        console.log('【REGISTER】 Tentando fetch direto primeiro...')
        const fetchTest = await fetch('https://redbackend.fly.dev/api/business/tipos')
        console.log('【REGISTER】 Fetch direto status:', fetchTest.status)
        
        // Depois com axios (força não enviar header Authorization para evitar refresh automático)
        const response = await api.get('/api/business/tipos', { headers: { Authorization: undefined } })
        console.log('【REGISTER】 Resposta completa (axios):', response)
        console.log('【REGISTER】 response.data:', response.data)
        
        const data = response.data
        if (data.data && Array.isArray(data.data)) {
          console.log('【REGISTER】 Usando data.data, encontrados', data.data.length, 'tipos')
          setTipos(data.data)
        } else if (data.tipos && Array.isArray(data.tipos)) {
          console.log('【REGISTER】 Usando data.tipos')
          setTipos(data.tipos)
        } else if (Array.isArray(data)) {
          console.log('【REGISTER】 Usando data direto como array')
          setTipos(data)
        } else {
          console.error('【REGISTER】 Estrutura inesperada:', data)
          toast.error('Estrutura de resposta inesperada')
        }
      } catch (err) {
        console.error('【REGISTER】 ❌ Erro ao carregar tipos:', err)
        console.error('【REGISTER】 Status:', err.response?.status)
        console.error('【REGISTER】 StatusText:', err.response?.statusText)
        console.error('【REGISTER】 Data:', err.response?.data)
        console.error('【REGISTER】 URL:', err.config?.url)
        console.error('【REGISTER】 Timeout:', err.config?.timeout)
        console.error('【REGISTER】 CORS ou network issue?', err.message)
        toast.error('Erro ao carregar tipos de negócio - Backend offline?')
      } finally {
        setLoadingTipos(false)
      }
    }
    fetchTipos()
  }, [])

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
      console.log('【REGISTER】 Iniciando registro com email:', form.email)

      // 1. Cria usuário via Supabase client
      const { data: signData, error: signError } = await supabase.auth.signUp({
        email: form.email,
        password: form.password,
      })
      if (signError) {
        console.error('【REGISTER】 Supabase signup error:', signError)
        toast.error(signError.message || 'Erro ao criar usuário')
        setLoading(false)
        return
      }

      const accessToken = signData?.session?.access_token || null
      const refreshToken = signData?.session?.refresh_token || null

      // 2. Se necessário, troque token com backend para criar o tenant e vincular usuário
      if (accessToken) {
        api.defaults.headers.common.Authorization = `Bearer ${accessToken}`
        const payload = { tenant: { nome: form.nome, tipo: String(tipo || ''), cnpj: form.cnpj, telefone: form.telefone, cidade: form.cidade, estado: form.estado } }
        console.log('【REGISTER】 Criando tenant com payload:', payload)
        await api.post('/api/auth/register-tenant', payload)
      } else {
        // Fallback: se o Supabase não retornar sessão (email confirm required),
        // pede ao backend para criar o usuário + tenant via admin endpoint.
        try {
          console.warn('【REGISTER】 Nenhum access token recebido no signup; solicitando criação via backend')
          await api.post('/api/auth/register', { email: form.email, password: form.password, tenant: { nome: form.nome, tipo: String(tipo || ''), cnpj: form.cnpj, telefone: form.telefone, cidade: form.cidade, estado: form.estado } })
        } catch (e) {
          console.error('【REGISTER】 Erro ao criar usuário+tenant via backend:', e)
          toast.error('Erro ao criar conta via backend')
          setLoading(false)
          return
        }
      }

      // 3. Faz login automático (se ainda não houver sessão válida)
      console.log('【REGISTER】 Tentando fazer login automático...')
      const result = await login(form.email, form.password)

      if (result.ok) {
        console.log('【REGISTER】 ✓ Login bem-sucedido')
        toast.success('Bem-vindo ao RED! Seu negócio foi criado.')
        setTimeout(() => navigate('/', { replace: true }), 500)
      } else {
        console.error('【REGISTER】 ❌ Login falhou:', result.error)
        toast.error(result.error || 'Erro ao fazer login após registro')
        setTimeout(() => navigate('/login', { replace: true }), 1500)
      }
    } catch (err) {
      console.error('【REGISTER】 ❌ Erro no registro:', err)
      console.error('【REGISTER】 Response data:', err.response?.data)
      toast.error(err.response?.data?.error || 'Erro ao criar conta')
    } finally {
      setLoading(false)
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

  const labelStyle = {
    display: 'block',
    fontSize: 11,
    fontWeight: 700,
    color: 'rgba(255,255,255,0.5)',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 10,
    textAlign: 'center',
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
      overflow: 'hidden',
      padding: '40px 20px',
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

      <div style={{ width: '100%', maxWidth: 900, position: 'relative', zIndex: 1 }}>
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
            Registre seu negócio e comece a crescer
          </div>
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

          {/* STEP 0 - Tipo de Negócio */}
          {step === 0 && (
            <div style={{ position: 'relative', zIndex: 1 }}>
              <h2 style={{ margin: '0 0 8px', fontSize: 18, fontWeight: 700, color: '#fff' }}>Qual é o seu negócio?</h2>
              <p style={{ margin: '0 0 24px', fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>Escolha o tipo para personalizar o sistema</p>
              
              {loadingTipos ? (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 0' }}>
                  <div style={{ 
                    width: 20, height: 20, border: '2px solid rgba(220,20,30,0.3)', 
                    borderTopColor: '#dc141e', borderRadius: '50%', 
                    animation: 'spin 0.8s linear infinite' 
                  }} />
                </div>
              ) : (
                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                  gap: 12,
                  maxHeight: 'calc(100vh - 500px)',
                  overflowY: 'auto',
                  paddingRight: '8px',
                }}>
                  {tipos.map(t => {
                    const selected = tipo === t.id
                    return (
                      <button key={t.id} onClick={() => setTipo(t.id)} style={{
                        background: selected ? 'rgba(220,20,30,0.2)' : 'rgba(255,255,255,0.03)',
                        border: `1.5px solid ${selected ? '#dc141e' : 'rgba(255,255,255,0.1)'}`,
                        borderRadius: 12, 
                        padding: '12px',
                        display: 'flex', 
                        flexDirection: 'column', 
                        alignItems: 'center', 
                        gap: 6,
                        cursor: 'pointer', 
                        textAlign: 'center', 
                        transition: 'all 0.2s',
                        width: '100%',
                      }}
                      onMouseEnter={e => {
                        if (!selected) e.target.style.borderColor = 'rgba(220,20,30,0.5)'
                      }}
                      onMouseLeave={e => {
                        if (!selected) e.target.style.borderColor = 'rgba(255,255,255,0.1)'
                      }}
                      >
                        <div style={{
                          fontSize: 28,
                          lineHeight: 1,
                        }}>
                          {t.icone}
                        </div>
                        <div>
                          <div style={{ fontSize: 12, fontWeight: 700, color: selected ? '#fff' : 'rgba(255,255,255,0.7)', marginBottom: 2 }}>{t.nome}</div>
                          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)' }}>{t.modulos_count} módulos</div>
                        </div>
                        {selected && (
                          <div style={{
                            width: 18, height: 18, borderRadius: '50%', flexShrink: 0,
                            background: '#dc141e',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            marginTop: 2,
                          }}>
                            <Check size={12} color='#fff' />
                          </div>
                        )}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* STEP 1 - Dados da Empresa */}
          {step === 1 && (
            <div style={{ position: 'relative', zIndex: 1 }}>
              <h2 style={{ margin: '0 0 8px', fontSize: 18, fontWeight: 700, color: '#fff' }}>Dados da empresa</h2>
              <p style={{ margin: '0 0 24px', fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>Como o seu negócio vai aparecer no sistema</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div>
                  <label style={labelStyle}>Nome do negócio *</label>
                  <input 
                    style={estiloInput}
                    placeholder="Ex: Restaurante XYZ"
                    value={form.nome}
                    onChange={e => f('nome', e.target.value)}
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
                <div>
                  <label style={labelStyle}>CNPJ</label>
                  <input 
                    style={estiloInput}
                    placeholder="00.000.000/0001-00"
                    value={form.cnpj}
                    onChange={e => f('cnpj', e.target.value)}
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
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label style={labelStyle}>Telefone</label>
                    <input 
                      style={estiloInput}
                      placeholder="(11) 99999-9999"
                      value={form.telefone}
                      onChange={e => f('telefone', e.target.value)}
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
                  <div>
                    <label style={labelStyle}>Estado</label>
                    <select 
                      style={{...estiloInput, paddingLeft: '16px', cursor: 'pointer'}}
                      value={form.estado}
                      onChange={e => f('estado', e.target.value)}
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
                    >
                      <option value="">Selecione</option>
                      {['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'].map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <label style={labelStyle}>Cidade</label>
                  <input 
                    style={estiloInput}
                    placeholder="São Paulo"
                    value={form.cidade}
                    onChange={e => f('cidade', e.target.value)}
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
              </div>
            </div>
          )}

          {/* STEP 2 - Seu Acesso */}
          {step === 2 && (
            <div style={{ position: 'relative', zIndex: 1 }}>
              <h2 style={{ margin: '0 0 8px', fontSize: 18, fontWeight: 700, color: '#fff' }}>Criar seu acesso</h2>
              <p style={{ margin: '0 0 24px', fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>Você será o administrador de <strong style={{ color: '#fff' }}>{form.nome}</strong></p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div>
                  <label style={labelStyle}>E-mail</label>
                  <input 
                    type="email"
                    style={estiloInput}
                    placeholder="seu@email.com"
                    value={form.email}
                    onChange={e => f('email', e.target.value)}
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
                <div>
                  <label style={labelStyle}>Senha</label>
                  <div style={{ position: 'relative' }}>
                    <input 
                      type={mostrarSenha ? 'text' : 'password'}
                      style={{
                        ...estiloInput,
                        paddingRight: '48px',
                      }}
                      placeholder="••••••••••"
                      value={form.password}
                      onChange={e => f('password', e.target.value)}
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
                      style={{
                        position: 'absolute',
                        right: 14,
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        color: 'rgba(255,255,255,0.35)',
                        padding: 6,
                        display: 'flex',
                        transition: 'color 0.2s',
                      }}
                      onMouseEnter={e => e.target.style.color = 'rgba(255,255,255,0.55)'}
                      onMouseLeave={e => e.target.style.color = 'rgba(255,255,255,0.35)'}
                    >
                      {mostrarSenha ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>
                <div>
                  <label style={labelStyle}>Confirmar Senha</label>
                  <div style={{ position: 'relative' }}>
                    <input 
                      type={mostrarConfirm ? 'text' : 'password'}
                      style={{
                        ...estiloInput,
                        paddingRight: '48px',
                      }}
                      placeholder="••••••••••"
                      value={form.confirmPassword}
                      onChange={e => f('confirmPassword', e.target.value)}
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
                      onClick={() => setMostrarConfirm(!mostrarConfirm)}
                      style={{
                        position: 'absolute',
                        right: 14,
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        color: 'rgba(255,255,255,0.35)',
                        padding: 6,
                        display: 'flex',
                        transition: 'color 0.2s',
                      }}
                      onMouseEnter={e => e.target.style.color = 'rgba(255,255,255,0.55)'}
                      onMouseLeave={e => e.target.style.color = 'rgba(255,255,255,0.35)'}
                    >
                      {mostrarConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Navigation Buttons */}
          <div style={{ display: 'flex', gap: 12, marginTop: 28, position: 'relative', zIndex: 2 }}>
            {step > 0 && (
              <button
                onClick={() => setStep(s => s - 1)}
                style={{
                  flex: 1,
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: 12,
                  padding: '13px 20px',
                  color: 'rgba(255,255,255,0.6)',
                  fontSize: 14,
                  fontWeight: 600,
                  fontFamily: 'inherit',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  transition: 'all 0.3s',
                }}
                onMouseEnter={e => {
                  e.target.style.background = 'rgba(255,255,255,0.08)'
                  e.target.style.borderColor = 'rgba(255,255,255,0.2)'
                }}
                onMouseLeave={e => {
                  e.target.style.background = 'rgba(255,255,255,0.05)'
                  e.target.style.borderColor = 'rgba(255,255,255,0.1)'
                }}
              >
                <ArrowLeft size={16} /> Voltar
              </button>
            )}
            <button
              onClick={step === 2 ? handleSubmit : handleNext}
              disabled={loading}
              style={{
                flex: step === 0 ? 1 : 2,
                background: loading
                  ? 'rgba(153,20,20,0.35)'
                  : 'linear-gradient(135deg, #991414 0%, #6d0a0a 100%)',
                border: 'none',
                borderRadius: 12,
                padding: '13px 20px',
                color: '#fff',
                fontSize: 14,
                fontWeight: 800,
                fontFamily: 'inherit',
                cursor: loading ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                boxShadow: loading
                  ? 'inset 0 2px 4px rgba(0,0,0,0.3)'
                  : 'inset 0 1px 0 rgba(255,255,255,0.2), 0 12px 32px rgba(153,20,20,0.4)',
                transition: 'all 0.3s',
                textTransform: 'uppercase',
                letterSpacing: 0.5,
              }}
              onMouseEnter={e => {
                if (!loading) {
                  e.target.style.boxShadow = 'inset 0 1px 0 rgba(255,255,255,0.3), 0 16px 40px rgba(153,20,20,0.5)'
                  e.target.style.transform = 'translateY(-2px)'
                }
              }}
              onMouseLeave={e => {
                if (!loading) {
                  e.target.style.boxShadow = 'inset 0 1px 0 rgba(255,255,255,0.2), 0 12px 32px rgba(153,20,20,0.4)'
                  e.target.style.transform = 'translateY(0)'
                }
              }}
            >
              {loading ? (
                <>
                  <div style={{
                    width: 16,
                    height: 16,
                    border: '2px solid rgba(255,255,255,0.3)',
                    borderTopColor: '#fff',
                    borderRadius: '50%',
                    animation: 'spin 0.8s linear infinite',
                  }} />
                  Criando...
                </>
              ) : step === 2 ? (
                <>
                  <Check size={16} /> Criar Negócio
                </>
              ) : (
                <>
                  Continuar <ArrowRight size={16} />
                </>
              )}
            </button>
          </div>
        </div>

        {/* Footer */}
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
        onClick={() => window.location.href = '/admin/login'}
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
        input::placeholder, select option { 
          color: rgba(255,255,255,0.2); 
          background: #111; 
        }
        select { 
          appearance: none;
          background-image: 
            linear-gradient(45deg, transparent 50%, rgba(255,255,255,0.2) 50%),
            linear-gradient(135deg, rgba(255,255,255,0.2) 50%, transparent 50%);
          background-position: calc(100% - 14px) center;
          background-repeat: no-repeat;
          background-size: 8px 8px;
          padding-right: 32px !important;
        }
        div::-webkit-scrollbar {
          width: 6px;
        }
        div::-webkit-scrollbar-track {
          background: rgba(255,255,255,0.05);
          border-radius: 10px;
        }
        div::-webkit-scrollbar-thumb {
          background: rgba(220,20,30,0.4);
          border-radius: 10px;
        }
        div::-webkit-scrollbar-thumb:hover {
          background: rgba(220,20,30,0.6);
        }
      `}</style>
    </div>
  )
}
