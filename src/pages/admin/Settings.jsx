/**
 * Settings.jsx — Configurações do negócio + tema do sistema + logo
 * v2.0 — seletor de tema integrado, logo para PDF, PIX, dados empresa
 */
import { useEffect, useState } from 'react'
import {
  Save, Building2, CheckCircle2, QrCode, Eye, EyeOff,
  AlertTriangle, Shield, Image, Palette, RefreshCw
} from 'lucide-react'
import api from '../../services/api'
import useAuthStore from '../../store/authStore'
import useThemeStore, { THEMES } from '../../store/themeStore'
import { validatePixKey, formatPixKey } from '../../utils/pix'
import ImageUpload from '../../components/ui/ImageUpload'
import toast from 'react-hot-toast'

const TIPO_LABEL = {
  concessionaria: 'Concessionária',
  restaurante:    'Restaurante / Bar',
  comercio:       'Comércio Geral',
}
const ESTADOS = ['AC','AL','AM','AP','BA','CE','DF','ES','GO','MA','MG','MS','MT','PA','PB','PE','PI','PR','RJ','RN','RO','RR','RS','SC','SE','SP','TO']
const PIX_TIPOS = [
  { value: 'cpf',       label: 'CPF',            placeholder: '000.000.000-00' },
  { value: 'cnpj',      label: 'CNPJ',           placeholder: '00.000.000/0001-00' },
  { value: 'email',     label: 'E-mail',         placeholder: 'contato@empresa.com' },
  { value: 'telefone',  label: 'Celular',        placeholder: '+5585999990000' },
  { value: 'aleatoria', label: 'Chave Aleatória',placeholder: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx' },
]

function Section({ title, icon: Icon, children }) {
  return (
    <div style={{ marginBottom: 32 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, paddingBottom: 10, borderBottom: '1px solid var(--border)' }}>
        {Icon && <Icon size={14} color="var(--accent)" />}
        <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1.5, color: 'var(--dim)' }}>{title}</span>
      </div>
      {children}
    </div>
  )
}

export default function Settings() {
  const { tenant, user, setTenant, papel, refreshTenant } = useAuthStore()
  const { currentTheme, setTheme }                        = useThemeStore()
  const themeList = THEMES
  const isDono  = papel === 'dono'
  const isAdmin = papel === 'dono' || papel === 'gerente'

  const [activeTab, setActiveTab] = useState('dados') // 'dados' ou 'whatsapp'
  const [form,      setFormState] = useState({
    nome: '', cnpj: '', telefone: '', email: '', endereco: '',
    cidade: '', estado: '', pix_chave: '', pix_tipo: 'cpf',
    pix_titular: '', logo_url: '', config: { modulos_ativos: [] },
  })
  const [saving,    setSaving]    = useState(false)
  const [saved,     setSaved]     = useState(false)
  const [showChave, setShowChave] = useState(false)

  // Estados do WhatsApp & IA (Tenant)
  const [waStatus, setWaStatus] = useState({ status: 'disconnected', qr: null })
  const [aiConfig, setAiConfig] = useState({
    ai_enabled: false,
    ai_provider: 'gemini',
    api_key: '',
    model: '',
    system_prompt: '',
    ai_prefix: ''
  })
  const [models, setModels] = useState([])
  const [loadingModels, setLoadingModels] = useState(false)
  const [polling, setPolling] = useState(null)

  const set = (k, v) => setFormState(f => ({ ...f, [k]: v }))

  useEffect(() => {
    if (tenant) setFormState({
      nome:        tenant.nome        || '',
      cnpj:        tenant.cnpj        || '',
      telefone:    tenant.telefone    || '',
      email:       tenant.email       || '',
      endereco:    tenant.endereco    || '',
      cidade:      tenant.cidade      || '',
      estado:      tenant.estado      || '',
      pix_chave:   tenant.pix_chave   || '',
      pix_tipo:    tenant.pix_tipo    || 'cpf',
      pix_titular: tenant.pix_titular || '',
      logo_url:    tenant.logo_url    || '',
      config:      tenant.config      || { modulos_ativos: [] },
    })
  }, [tenant])

  const pixValid = form.pix_chave ? validatePixKey(form.pix_chave, form.pix_tipo) : true

  const handleSave = async () => {
    if (!form.nome?.trim()) return toast.error('Como podemos te chamar? O nome é obrigatório! 👤')
    if (form.pix_chave && !pixValid) return toast.error('Chave PIX inválida')
    setSaving(true)
    try {
      const payload = { ...form }
      for (const k of ['cnpj','telefone','email','endereco','cidade','estado','pix_chave','pix_tipo','pix_titular','logo_url']) {
        if (payload[k] === '') payload[k] = null
      }
      // O 'config' não deve ser nullado, é JSONB
      const { data } = await api.put('/api/tenants/me', payload)
      setTenant(data.data)
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
      toast.success('Tudo salvo e atualizado! ✨')
    } catch (err) {
      toast.error(err.response?.data?.error || 'Erro ao salvar')
    } finally { setSaving(false) }
  }

  const pixTipoCfg = PIX_TIPOS.find(t => t.value === form.pix_tipo) || PIX_TIPOS[0]

  // ── Lógica WhatsApp & IA (Tenant) ──
  useEffect(() => {
    if (activeTab === 'whatsapp') {
      fetchAIConfig()
      updateWAStatus()
      const interval = setInterval(updateWAStatus, 5000)
      setPolling(interval)
      return () => clearInterval(interval)
    }
  }, [activeTab])

  const fetchAIConfig = async () => {
    try {
      const { data } = await api.get('/api/tenant-ai/config')
      setAiConfig(data.data)
      // Removido o carregamento automático para evitar chamadas excessivas ou com chaves incompletas
    } catch (err) { console.error(err) }
  }

  const updateWAStatus = async () => {
    try {
      const { data } = await api.get('/api/tenant-ai/status')
      setWaStatus(data)
    } catch (err) { console.error(err) }
  }

   const fetchModels = async (key, provider) => {
    const apiKey = key || aiConfig.api_key
    const prov = provider || aiConfig.ai_provider
    if (!apiKey) return toast.error('Insira a API Key primeiro')
    
    setLoadingModels(true)
    try {
      // Usando a nova rota de tenant_ai que criei
      const { data } = await api.post('/api/tenant-ai/ai/list-models', { api_key: apiKey, provider: prov })
      setModels(data.data?.models || [])
      toast.success('Modelos carregados!')
    } catch (err) { 
      toast.error('Erro ao listar modelos. Verifique sua chave.') 
    } finally { 
      setLoadingModels(false) 
    }
  }

  const saveAIConfig = async (newConfig) => {
    const cfg = newConfig || aiConfig
    try {
      await api.post('/api/tenant-ai/config', cfg)
      toast.success('Configurações de IA salvas! 🤖')
    } catch (err) { toast.error('Erro ao salvar IA') }
  }

  const handleConnect = async () => {
    try {
      await api.post('/api/tenant-ai/connect')
      updateWAStatus()
      toast.success('Iniciando conexão... Aguarde o QR Code')
    } catch (err) { toast.error('Erro ao conectar') }
  }

  const handleDisconnect = async () => {
    if (!window.confirm('Deseja realmente desconectar o WhatsApp?')) return
    try {
      await api.post('/api/tenant-ai/disconnect')
      updateWAStatus()
      toast.success('Desconectado')
    } catch (err) { toast.error('Erro ao desconectar') }
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Meu Negócio</div>
          <div className="page-subtitle">Configurações, aparência e dados da empresa</div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 24, padding: 4, background: 'var(--bg3)', borderRadius: 12, width: 'fit-content' }}>
        <button 
          onClick={() => setActiveTab('dados')}
          style={{
            padding: '8px 20px', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer',
            background: activeTab === 'dados' ? 'var(--bg1)' : 'transparent',
            color: activeTab === 'dados' ? 'var(--accent)' : 'var(--muted)',
            border: activeTab === 'dados' ? '1px solid var(--border)' : '1px solid transparent',
            boxShadow: activeTab === 'dados' ? '0 4px 12px rgba(0,0,0,0.1)' : 'none',
            transition: 'all 0.2s'
          }}
        >
          Dados da Empresa
        </button>
        <button 
          onClick={() => setActiveTab('whatsapp')}
          style={{
            padding: '8px 20px', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer',
            background: activeTab === 'whatsapp' ? 'var(--bg1)' : 'transparent',
            color: activeTab === 'whatsapp' ? 'var(--accent)' : 'var(--muted)',
            border: activeTab === 'whatsapp' ? '1px solid var(--border)' : '1px solid transparent',
            boxShadow: activeTab === 'whatsapp' ? '0 4px 12px rgba(0,0,0,0.1)' : 'none',
            transition: 'all 0.2s'
          }}
        >
          WhatsApp & IA 🤖
        </button>
      </div>

      <div style={{ maxWidth: 640 }}>
        {activeTab === 'dados' ? (
          <>
            {/* Chip do tenant */}
            <div className="card" style={{ marginBottom: 28, display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{
                width: 52, height: 52, borderRadius: 14, background: 'var(--red-glow)',
                border: '1px solid var(--red-border)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}>
                <Building2 size={24} color="var(--accent)" />
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 16 }}>{tenant?.nome}</div>
                <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>
                  {TIPO_LABEL[tenant?.tipo]} · Plano{' '}
                  <strong style={{ color: 'var(--dim)' }}>{tenant?.plano || 'Trial'}</strong>
                </div>
              </div>
            </div>

        {/* ── Tema do Sistema ── */}
        <Section title="Aparência — Tema do Sistema" icon={Palette}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
            {Object.values(themeList).map(t => {
              const isActive = currentTheme === t.id
              return (
                <button key={t.id} onClick={() => setTheme(t.id, tenant?.id, user?.id)} style={{
                  all: 'unset', cursor: 'pointer', borderRadius: 14, overflow: 'hidden',
                  border: isActive ? '2px solid var(--accent)' : '2px solid var(--border)',
                  boxShadow: isActive ? '0 0 20px var(--red-glow)' : 'none',
                  transition: 'all 0.2s',
                  display: 'flex', flexDirection: 'column',
                }}>
                  {/* Preview de cores */}
                  <div style={{ height: 56, display: 'flex', overflow: 'hidden' }}>
                    {t.preview.map((c, i) => (
                      <div key={i} style={{ flex: 1, background: c }} />
                    ))}
                  </div>
                  {/* Rótulo */}
                  <div style={{
                    padding: '10px 14px',
                    background: isActive ? 'var(--red-glow)' : 'var(--bg3)',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
                  }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: isActive ? 'var(--accent)' : 'var(--text)', display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span>{t.emoji}</span> {t.label}
                      </div>
                      <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 2 }}>{t.description}</div>
                    </div>
                    {isActive && (
                      <div style={{ width: 20, height: 20, borderRadius: '50%', background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <CheckCircle2 size={12} color="#fff" />
                      </div>
                    )}
                  </div>
                </button>
              )
            })}
          </div>
          <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 10 }}>
            Tema salvo por usuário — cada funcionário tem a sua preferência.
          </div>
        </Section>

        {/* ── Logo ── */}
        <Section title="Logo do Estabelecimento" icon={Image}>
          <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start', flexWrap: 'wrap' }}>
            <ImageUpload
              url={form.logo_url}
              onChange={url => set('logo_url', url)}
              tipo="tenants"
              label="Logotipo"
              size={120}
              shape="square"
            />
            <div style={{ flex: 1, minWidth: 200 }}>
              <div style={{ fontSize: 12, color: 'var(--dim)', lineHeight: 1.7 }}>
                <strong style={{ color: 'var(--text)' }}>A logo aparecerá:</strong>
                <ul style={{ margin: '8px 0 0', paddingLeft: 16, color: 'var(--dim)' }}>
                  <li>Na sidebar do sistema</li>
                  <li>Nos contratos PDF gerados (posição centralizada no cabeçalho)</li>
                  <li>Nas notas e comprovantes</li>
                </ul>
              </div>
              <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 8 }}>
                JPG, PNG ou WebP · Máx 5MB · Recomendado: quadrada, fundo branco/transparente
              </div>
              {form.logo_url ? (
                <div style={{ marginTop: 10, fontSize: 11, color: 'var(--green)' }}>✓ Logo carregada</div>
              ) : (
                <div style={{ marginTop: 10, fontSize: 11, color: 'var(--muted)' }}>Sem logo — nome da empresa no contrato</div>
              )}
            </div>
          </div>
        </Section>

        {/* ── Dados do Negócio ── */}
        <Section title="Dados do Negócio" icon={Building2}>
          <div className="form-grid">
            <div style={{ gridColumn: '1/-1' }}>
              <label className="label">Nome do Negócio *</label>
              <input className="input" value={form.nome} onChange={e => set('nome', e.target.value)} disabled={!isAdmin} />
            </div>
            <div>
              <label className="label">CNPJ / CPF</label>
              <input className="input" value={form.cnpj} onChange={e => set('cnpj', e.target.value)} placeholder="00.000.000/0001-00" disabled={!isAdmin} />
            </div>
            <div>
              <label className="label">Telefone</label>
              <input className="input" value={form.telefone} onChange={e => set('telefone', e.target.value)} placeholder="(00) 99999-0000" disabled={!isAdmin} />
            </div>
            <div style={{ gridColumn: '1/-1' }}>
              <label className="label">Email de Contato</label>
              <input className="input" type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="contato@empresa.com" disabled={!isAdmin} />
            </div>
            <div style={{ gridColumn: '1/-1' }}>
              <label className="label">Endereço</label>
              <input className="input" value={form.endereco} onChange={e => set('endereco', e.target.value)} placeholder="Rua, número, bairro" disabled={!isAdmin} />
            </div>
            <div>
              <label className="label">Cidade</label>
              <input className="input" value={form.cidade} onChange={e => set('cidade', e.target.value)} placeholder="Fortaleza" disabled={!isAdmin} />
            </div>
            <div>
              <label className="label">Estado</label>
              <select className="input" value={form.estado} onChange={e => set('estado', e.target.value)} disabled={!isAdmin}>
                <option value="">Selecione</option>
                {ESTADOS.map(e => <option key={e} value={e}>{e}</option>)}
              </select>
            </div>
          </div>
        </Section>

        {/* ── PIX ── */}
        <Section title="PIX — Recebimento Gratuito" icon={QrCode}>
          <div style={{ background: 'rgba(34,197,94,0.05)', border: '1px solid rgba(34,197,94,0.2)', borderRadius: 10, padding: '12px 16px', marginBottom: 18, display: 'flex', gap: 10 }}>
            <Shield size={14} color="var(--green)" style={{ flexShrink: 0, marginTop: 2 }} />
            <div style={{ fontSize: 12, color: 'var(--dim)', lineHeight: 1.7 }}>
              <strong style={{ color: 'var(--green)' }}>100% gratuito — sem taxa, sem intermediário.</strong>
              {' '}O RED gera o QR Code localmente. O dinheiro vai direto para sua conta via Banco Central.
            </div>
          </div>
          {!isDono && <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 12 }}>Somente o dono pode configurar o PIX.</div>}
          <div className="form-grid">
            <div>
              <label className="label">Tipo de Chave PIX</label>
              <select className="input" value={form.pix_tipo} onChange={e => set('pix_tipo', e.target.value)} disabled={!isDono}>
                {PIX_TIPOS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label className="label">
                Chave PIX ({pixTipoCfg.label})
                {form.pix_chave && (
                  <span style={{ marginLeft: 6, color: pixValid ? 'var(--green)' : 'var(--red)', fontSize: 10 }}>
                    {pixValid ? '✓ válida' : '✗ inválida'}
                  </span>
                )}
              </label>
              <div style={{ position: 'relative' }}>
                <input className="input" type={showChave ? 'text' : 'password'}
                  value={form.pix_chave} onChange={e => set('pix_chave', e.target.value)}
                  placeholder={pixTipoCfg.placeholder} disabled={!isDono}
                  style={{ paddingRight: 44, borderColor: form.pix_chave && !pixValid ? 'var(--red)' : undefined }} />
                {isDono && (
                  <button type="button" onClick={() => setShowChave(v => !v)} style={{
                    position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', display: 'flex', padding: 2,
                  }}>
                    {showChave ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                )}
              </div>
            </div>
            <div style={{ gridColumn: '1/-1' }}>
              <label className="label">Nome do Titular (aparece no QR Code)</label>
              <input className="input" value={form.pix_titular}
                onChange={e => set('pix_titular', e.target.value)}
                placeholder={form.nome || 'Nome para quem vai pagar'} disabled={!isDono} />
              <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 4 }}>Máx. 25 caracteres</div>
            </div>
          </div>
        </Section>

        {isAdmin && (
          <button className="btn btn-primary" style={{ minWidth: 180 }} onClick={handleSave}
            disabled={saving || (form.pix_chave && !pixValid)}>
            {saving ? <><RefreshCw size={14} className="spin" /> Salvando...</>
              : saved  ? <><CheckCircle2 size={14} /> Salvo!</>
              : <><Save size={14} /> Salvar Alterações</>}
          </button>
        )}
        {!isAdmin && (
          <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>
            Somente donos e gerentes podem editar os dados do negócio.
          </div>
        )}
          </>
        ) : (
          <div className="animate-in">
            {/* ── WhatsApp Connection ── */}
            <Section title="Conexão WhatsApp" icon={QrCode}>
              <div className="card" style={{ padding: 24, textAlign: 'center', background: 'var(--bg2)' }}>
                {waStatus.status === 'authenticated' ? (
                  <div>
                    <div style={{
                       width: 64, height: 64, borderRadius: '50%', background: 'rgba(34,197,94,0.1)',
                       display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px'
                    }}>
                      <CheckCircle2 size={32} color="var(--green)" />
                    </div>
                    <div style={{ fontWeight: 700, fontSize: 18, color: 'var(--text)' }}>WhatsApp Conectado! ✅</div>
                    <p style={{ fontSize: 13, color: 'var(--muted)', marginTop: 8 }}>Seu robô está pronto para responder seus clientes.</p>
                    <button className="btn" style={{ marginTop: 20, color: 'var(--red)' }} onClick={handleDisconnect}>
                      Desconectar Número
                    </button>
                  </div>
                ) : waStatus.status === 'qrcode' ? (
                  <div>
                    <img src={waStatus.qr} alt="QR Code" style={{ width: 240, height: 240, borderRadius: 12, border: '4px solid var(--bg1)' }} />
                    <div style={{ marginTop: 16, fontWeight: 700 }}>Escaneie para Conectar</div>
                    <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>{'Abra o WhatsApp > Aparelhos Conectados > Conectar Aparelho'}</p>
                  </div>
                ) : (
                  <div>
                    <div style={{ marginBottom: 16, color: 'var(--dim)' }}>
                      <QrCode size={48} strokeWidth={1} style={{ opacity: 0.5 }} />
                    </div>
                    <div style={{ fontWeight: 700 }}>Nenhum WhatsApp Conectado</div>
                    <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>Conecte seu número para ativar o robô de atendimento.</p>
                    <button className="btn btn-primary" style={{ marginTop: 20 }} onClick={handleConnect}>
                      Gerar QR Code de Conexão
                    </button>
                  </div>
                )}
              </div>
            </Section>

            {/* ── IA Configuration ── */}
            <Section title="Configuração da IA (O Robô)" icon={Shield}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, background: 'var(--bg3)', padding: '12px 16px', borderRadius: 12 }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>Ativar Robô de Atendimento</div>
                  <div style={{ fontSize: 12, color: 'var(--dim)' }}>A IA responderá automaticamente em nome da empresa.</div>
                </div>
                <button 
                  onClick={() => {
                    const next = !aiConfig.ai_enabled
                    setAiConfig(prev => ({ ...prev, ai_enabled: next }))
                    saveAIConfig({ ...aiConfig, ai_enabled: next })
                  }}
                  style={{
                    width: 52, height: 28, borderRadius: 20, background: aiConfig.ai_enabled ? 'var(--green)' : 'var(--border)',
                    position: 'relative', cursor: 'pointer', border: 'none', transition: 'all 0.3s'
                  }}
                >
                  <div style={{
                    width: 20, height: 20, borderRadius: '50%', background: '#fff',
                    position: 'absolute', top: 4, left: aiConfig.ai_enabled ? 28 : 4, transition: 'all 0.3s'
                  }} />
                </button>
              </div>

              <div className="form-grid">
                <div>
                  <label className="label">Provedor de IA</label>
                  <select className="input" value={aiConfig.ai_provider} onChange={e => setAiConfig(prev => ({ ...prev, ai_provider: e.target.value }))}>
                    <option value="gemini">Google Gemini (Grátis)</option>
                    <option value="groq">Groq (Rápido)</option>
                    <option value="openrouter">OpenRouter (Vários)</option>
                  </select>
                </div>
                 <div>
                  <label className="label">API Key</label>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input className="input" type="password" value={aiConfig.api_key} 
                      onChange={e => setAiConfig(prev => ({ ...prev, api_key: e.target.value }))}
                      style={{ flex: 1 }}
                    />
                    <button 
                      className="btn"
                      onClick={() => fetchModels()}
                      disabled={loadingModels}
                      style={{ 
                        padding: '0 16px', 
                        height: 42, 
                        background: 'var(--accent)', 
                        color: '#fff',
                        border: 'none', 
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        fontWeight: 600,
                        fontSize: 12
                      }}
                    >
                      {loadingModels ? <RefreshCw size={14} className="spin" /> : <RefreshCw size={14} />}
                      {loadingModels ? 'Carregando...' : 'Carregar Modelos'}
                    </button>
                  </div>
                </div>
                <div style={{ gridColumn: '1/-1' }}>
                  <label className="label">Modelo Selecionado {loadingModels && ' (Carregando...)'}</label>
                  <select className="input" value={aiConfig.model} onChange={e => setAiConfig(prev => ({ ...prev, model: e.target.value }))}>
                    <option value="">Selecione um modelo...</option>
                    {models.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                  </select>
                </div>
                <div style={{ gridColumn: '1/-1' }}>
                  <label className="label">Personalidade e Instruções (System Prompt)</label>
                  <textarea className="input" style={{ height: 100, paddingTop: 10 }}
                    value={aiConfig.system_prompt} onChange={e => setAiConfig(prev => ({ ...prev, system_prompt: e.target.value }))}
                    placeholder="Ex: Você é um atendente simpático da oficina do João. Você conhece todos os serviços..."
                  />
                </div>
                <div>
                  <label className="label">Palavra-Chave (Gatilho em Grupos)</label>
                  <input className="input" value={aiConfig.ai_prefix} onChange={e => setAiConfig(prev => ({ ...prev, ai_prefix: e.target.value }))} placeholder="Ex: red" />
                </div>
              </div>
              <button className="btn btn-primary" style={{ marginTop: 20, width: '100%' }} onClick={() => saveAIConfig()}>
                Salvar Configurações da IA
              </button>
            </Section>
          </div>
        )}
      </div>
      <style>{`.spin{animation:spin 1s linear infinite}@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}
