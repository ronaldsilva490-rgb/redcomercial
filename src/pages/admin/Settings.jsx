/**
 * Settings.jsx — Configurações do negócio + tema do sistema + logo
 * v2.0 — seletor de tema integrado, logo para PDF, PIX, dados empresa
 */
import { useEffect, useState } from 'react'
import {
  Save, Building2, CheckCircle2, QrCode, Eye, EyeOff,
  AlertTriangle, Shield, Image, Palette, RefreshCw,
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
  const { tenant, setTenant, papel, refreshTenant } = useAuthStore()
  const { currentTheme, setTheme }                  = useThemeStore()
  const isAdmin = papel === 'dono' || papel === 'gerente'
  const isDono  = papel === 'dono'

  const [form,      setFormState] = useState({
    nome: '', cnpj: '', telefone: '', email: '', endereco: '',
    cidade: '', estado: '', pix_chave: '', pix_tipo: 'cpf',
    pix_titular: '', logo_url: '',
  })
  const [saving,    setSaving]    = useState(false)
  const [saved,     setSaved]     = useState(false)
  const [showChave, setShowChave] = useState(false)

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
    })
  }, [tenant])

  const pixValid = form.pix_chave ? validatePixKey(form.pix_chave, form.pix_tipo) : true

  const handleSave = async () => {
    if (!form.nome?.trim()) return toast.error('Nome é obrigatório')
    if (form.pix_chave && !pixValid) return toast.error('Chave PIX inválida')
    setSaving(true)
    try {
      const payload = { ...form }
      for (const k of ['cnpj','telefone','email','endereco','cidade','estado','pix_chave','pix_tipo','pix_titular','logo_url']) {
        if (payload[k] === '') payload[k] = null
      }
      const { data } = await api.put('/api/tenants/me', payload)
      setTenant(data.data)
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
      toast.success('Dados atualizados!')
    } catch (err) {
      toast.error(err.response?.data?.error || 'Erro ao salvar')
    } finally { setSaving(false) }
  }

  const pixTipoCfg = PIX_TIPOS.find(t => t.value === form.pix_tipo) || PIX_TIPOS[0]
  const themeList  = Object.values(THEMES)

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Meu Negócio</div>
          <div className="page-subtitle">Configurações, aparência e dados da empresa</div>
        </div>
      </div>

      <div style={{ maxWidth: 640 }}>
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
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px,1fr))', gap: 10 }}>
            {themeList.map(t => (
              <button key={t.id} onClick={() => setTheme(t.id, tenant?.id)} style={{
                all: 'unset', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10,
                padding: '10px 14px', borderRadius: 10, transition: 'all 0.15s',
                background: currentTheme === t.id ? 'var(--red-glow)' : 'var(--bg3)',
                border:     currentTheme === t.id ? '1px solid var(--red-border)' : '1px solid var(--border)',
              }}>
                <span style={{ fontSize: 20 }}>{t.emoji}</span>
                <span style={{ fontSize: 12, color: currentTheme === t.id ? 'var(--accent)' : 'var(--dim)', fontWeight: currentTheme === t.id ? 700 : 400 }}>
                  {t.label}
                </span>
              </button>
            ))}
          </div>
          <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 10 }}>
            O tema é salvo por empresa e restaurado automaticamente ao entrar.
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
      </div>
      <style>{`.spin{animation:spin 1s linear infinite}@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}
