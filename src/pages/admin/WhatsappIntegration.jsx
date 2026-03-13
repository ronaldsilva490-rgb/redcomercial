import { useState, useEffect, useRef, useCallback } from 'react'
import {
  MessageCircle, QrCode, Cloud, Send, RefreshCw,
  CheckCircle, Wifi, WifiOff, Loader, Zap, Bot, Key,
  Settings, Users, Mic, Eye, Volume2, Brain, Activity,
  ChevronDown, ChevronUp, AlertCircle, Sparkles
} from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../../services/api'

const WA = {
  status:  () => api.get('/api/admin/whatsapp/status'),
  start:   () => api.post('/api/admin/whatsapp/start'),
  stop:    () => api.post('/api/admin/whatsapp/stop'),
  reset:   () => api.post('/api/admin/whatsapp/reset'),
  send:    (p) => api.post('/api/admin/whatsapp/send', p),
  groups:  () => api.get('/api/admin/whatsapp/groups'),
  getAI:   () => api.get('/api/admin/ai/configs'),
  saveAI:  (b) => api.post('/api/admin/ai/configs', b),
  models:  (api_key, provider) => api.post('/api/admin/ai/list-models', { api_key, provider }),
}

const PROVIDERS = [
  { value: 'gemini',    label: 'Google Gemini',    color: '#4285F4' },
  { value: 'groq',      label: 'Groq',             color: '#F55036' },
  { value: 'openrouter',label: 'OpenRouter',        color: '#6366F1' },
  { value: 'kimi',      label: 'Moonshot Kimi K2',  color: '#00B4AB' },
  { value: 'deepseek',  label: 'DeepSeek',          color: '#5B73E8' },
  { value: 'openai',    label: 'OpenAI',            color: '#10A37F' },
  { value: 'nvidia',    label: 'NVIDIA NIM',        color: '#76B900' },
  { value: 'ollama',    label: 'Ollama (local)',    color: '#888' },
]

const TTS_PROVIDERS = [
  { value: 'edge',   label: 'Edge-TTS — Microsoft (Recomendado)', color: '#ec4899' },
  { value: 'espeak', label: 'espeak-ng — Offline / Robótico (manual)', color: '#22c55e' },
  { value: 'openai', label: 'OpenAI TTS', color: '#10A37F' },
]

const EDGE_VOICES = [
  { value: 'pt-BR-FranciscaNeural',           label: 'Francisca — Feminino · Amigável & Descontraída' },
  { value: 'pt-BR-AntonioNeural',              label: 'Antônio — Masculino · Amigável & Positivo' },
  { value: 'pt-BR-ThalitaMultilingualNeural',  label: 'Thalita — Feminino · Multilíngue & Animada' },
]

const STT_PROVIDERS = [
  { value: 'groq',   label: 'Groq Whisper (recomendado)', color: '#F55036' },
  { value: 'openai', label: 'OpenAI Whisper', color: '#10A37F' },
]

function StatusBadge({ status }) {
  const map = {
    authenticated: { color: '#22c55e', label: 'Conectado',        Icon: CheckCircle },
    qrcode:        { color: '#f59e0b', label: 'Aguardando Scan',   Icon: QrCode },
    connecting:    { color: '#3b82f6', label: 'Conectando…',       Icon: Loader },
    disconnected:  { color: '#ef4444', label: 'Desconectado',      Icon: WifiOff },
    offline:       { color: '#6b7280', label: 'Offline',           Icon: WifiOff },
  }
  const s = map[status] || map.offline
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      fontSize: 11, fontWeight: 700, color: s.color,
      background: `${s.color}18`, border: `1px solid ${s.color}40`,
      borderRadius: 20, padding: '3px 10px'
    }}>
      <s.Icon size={11} className={status === 'connecting' ? 'spin' : ''} />
      {s.label}
    </span>
  )
}

// ─── Card de Serviço de IA ────────────────────────────────────
function AIServiceCard({ title, icon: Icon, iconColor, description, serviceKey, configs, onChange, providers, showVoiceId, showPrompt, showFrequency, showProbability, showToggle = true }) {
  const [expanded, setExpanded] = useState(false)
  const [loadingModels, setLoadingModels] = useState(false)
  const [models, setModels] = useState([])
  const cfg = configs[serviceKey] || {}

  const set = (key, value) => onChange(serviceKey, key, value)

  const providerList = providers !== undefined ? providers : PROVIDERS
  const hasProviderConfig = providerList.length > 0

  const handleListModels = async () => {
    const apiKey = cfg.api_key || ''
    const provider = cfg.provider || ''
    if (!apiKey && provider !== 'ollama') return toast.error('Informe a API key primeiro')
    setLoadingModels(true)
    try {
      const res = await WA.models(apiKey, provider)
      const list = res.data?.models || res.data?.data?.models || []
      setModels(list)
      if (!list.length) toast.error('Nenhum modelo retornado')
    } catch { toast.error('Falha ao buscar modelos') }
    finally { setLoadingModels(false) }
  }

  const isEnabled = cfg.enabled !== false && cfg.enabled !== 'false'

  // Badge de status: mostra provider + modelo selecionado no header
  const providerLabel = providerList.find(p => p.value === cfg.provider)?.label || cfg.provider || ''
  const modelLabel = cfg.model || ''
  const statusBadge = (providerLabel || modelLabel) ? `${providerLabel}${modelLabel ? ` • ${modelLabel}` : ''}` : null

  return (
    <div style={{
      background: isEnabled ? `${iconColor}08` : 'rgba(255,255,255,0.02)',
      border: `1px solid ${isEnabled ? iconColor + '30' : 'rgba(255,255,255,0.08)'}`,
      borderRadius: 14, overflow: 'hidden',
      transition: 'all 0.2s'
    }}>
      {/* Header do card */}
      <div
        style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', userSelect: 'none' }}
        onClick={() => setExpanded(v => !v)}
      >
        <div style={{ width: 34, height: 34, borderRadius: 9, background: `${iconColor}20`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon size={17} color={iconColor} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--text)' }}>{title}</div>
          {statusBadge && !expanded ? (
            <div style={{ fontSize: 10, color: iconColor, marginTop: 2, opacity: 0.85, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {statusBadge}
            </div>
          ) : (
            <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 1 }}>{description}</div>
          )}
        </div>
        {showToggle && (
          <button
            onClick={e => { e.stopPropagation(); set('enabled', !isEnabled) }}
            style={{
              width: 42, height: 23, borderRadius: 12, border: 'none', cursor: 'pointer',
              background: isEnabled ? '#22c55e' : 'rgba(255,255,255,0.12)',
              position: 'relative', transition: 'background 0.25s', flexShrink: 0
            }}
          >
            <div style={{
              width: 17, height: 17, borderRadius: '50%', background: '#fff',
              position: 'absolute', top: 3,
              left: isEnabled ? 22 : 3,
              transition: 'left 0.25s',
            }} />
          </button>
        )}
        <div style={{ color: 'var(--muted)', marginLeft: 4 }}>
          {expanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
        </div>
      </div>

      {/* Conteúdo expandido */}
      {expanded && (
        <div style={{ padding: '0 18px 18px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ height: 1, background: 'rgba(255,255,255,0.06)', marginBottom: 4 }} />

          {/* Provider — só renderiza se há providers disponíveis */}
          {hasProviderConfig && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <label style={labelStyle}>Provedor</label>
              <select
                className="input"
                value={cfg.provider || ''}
                onChange={e => { set('provider', e.target.value); setModels([]) }}
                style={{ fontSize: 13 }}
              >
                <option value="">— Selecione —</option>
                {providerList.map(p => (
                  <option key={p.value} value={p.value}>{p.label}</option>
                ))}
              </select>
            </div>
          )}

          {/* API Key (oculto para ollama e para cards sem provider) */}
          {hasProviderConfig && cfg.provider !== 'ollama' && cfg.provider !== 'edge' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <label style={labelStyle}>API Key</label>
              <div style={{ display: 'flex', gap: 6 }}>
                <input
                  type="password" className="input"
                  style={{ flex: 1, fontSize: 13 }}
                  placeholder="sk-... / AIza... / gsk_..."
                  value={cfg.api_key || ''}
                  onChange={e => set('api_key', e.target.value)}
                />
                {providerList !== TTS_PROVIDERS && providerList !== STT_PROVIDERS && (
                  <button
                    onClick={handleListModels}
                    disabled={loadingModels}
                    style={miniBtn}
                    title="Carregar modelos"
                  >
                    {loadingModels ? <Loader size={12} className="spin" /> : <Key size={12} />}
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Modelo — só dropdown, sem campo manual */}
          {hasProviderConfig && providerList !== TTS_PROVIDERS && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <label style={labelStyle}>
                Modelo
                {!models.length && cfg.provider && (
                  <span style={{ marginLeft: 6, fontWeight: 400, color: 'var(--muted)', textTransform: 'none', letterSpacing: 0 }}>
                    — clique em 🔑 para carregar
                  </span>
                )}
              </label>
              <div style={{ display: 'flex', gap: 6 }}>
                <select
                  className="input"
                  value={cfg.model || ''}
                  onChange={e => set('model', e.target.value)}
                  style={{ flex: 1, fontSize: 13 }}
                >
                  <option value="">— Selecione o modelo —</option>
                  {models.map(m => <option key={m.id} value={m.id}>{m.name || m.id}</option>)}
                  {cfg.model && !models.find(m => m.id === cfg.model) && (
                    <option value={cfg.model}>{cfg.model}</option>
                  )}
                </select>
                {(providerList === STT_PROVIDERS) && (
                  <button onClick={handleListModels} disabled={loadingModels} style={miniBtn} title="Carregar modelos">
                    {loadingModels ? <Loader size={12} className="spin" /> : <Key size={12} />}
                  </button>
                )}
              </div>
              {/* Badge de confirmação do selecionado */}
              {cfg.model && (
                <div style={{ fontSize: 10, color: iconColor, fontWeight: 600, opacity: 0.9 }}>
                  ✓ {cfg.model}
                </div>
              )}
            </div>
          )}

          {/* Voice ID / Seletor de Voz (TTS) */}
          {showVoiceId && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <label style={labelStyle}>{cfg.provider === 'edge' ? 'Selecione a Voz' : 'Voice ID'}</label>
              {cfg.provider === 'edge' ? (
                <select
                  className="input" style={{ fontSize: 13 }}
                  value={cfg.voice_id || 'pt-BR-FranciscaNeural'}
                  onChange={e => set('voice_id', e.target.value)}
                >
                  {EDGE_VOICES.map(v => <option key={v.value} value={v.value}>{v.label}</option>)}
                </select>
              ) : (
                <input
                  className="input" style={{ fontSize: 13 }}
                  placeholder="Ex: pt-BR-FranciscaNeural"
                  value={cfg.voice_id || ''}
                  onChange={e => set('voice_id', e.target.value)}
                />
              )}
            </div>
          )}

          {/* Probabilidade de áudio (TTS) */}
          {showProbability && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <label style={labelStyle}>Probabilidade de resposta por áudio: {Math.round((cfg.audio_probability || 0.3) * 100)}%</label>
              <input
                type="range" min="0" max="1" step="0.05"
                value={cfg.audio_probability || 0.3}
                onChange={e => set('audio_probability', parseFloat(e.target.value))}
                style={{ width: '100%', accentColor: iconColor }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--muted)' }}>
                <span>Sempre texto</span><span>Metade a metade</span><span>Sempre voz</span>
              </div>
            </div>
          )}

          {/* Sliders de prosódia — só aparecem quando Edge-TTS está selecionado */}
          {showProbability && cfg.provider === 'edge' && (() => {
            const rateVal   = parseFloat((cfg.rate   || '-5%').replace('%',''))
            const pitchVal  = parseFloat((cfg.pitch  || '+0Hz').replace('Hz',''))
            const volumeVal = parseFloat((cfg.volume || '+0%').replace('%',''))
            return (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, paddingTop: 4 }}>
                <div style={{ height: 1, background: 'rgba(255,255,255,0.06)' }} />

                {/* Velocidade */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <label style={labelStyle}>
                    Velocidade da fala&nbsp;
                    <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0, color: iconColor }}>
                      {rateVal > 0 ? `+${rateVal}%` : `${rateVal}%`}
                    </span>
                  </label>
                  <input
                    type="range" min="-50" max="50" step="5"
                    value={rateVal}
                    onChange={e => set('rate', `${e.target.value > 0 ? '+' : ''}${e.target.value}%`)}
                    style={{ width: '100%', accentColor: iconColor }}
                  />
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--muted)' }}>
                    <span>-50% lenta</span><span>0% normal</span><span>+50% rápida</span>
                  </div>
                </div>

                {/* Tom (pitch) */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <label style={labelStyle}>
                    Tom da voz (pitch)&nbsp;
                    <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0, color: iconColor }}>
                      {pitchVal > 0 ? `+${pitchVal}Hz` : `${pitchVal}Hz`}
                    </span>
                  </label>
                  <input
                    type="range" min="-20" max="20" step="1"
                    value={pitchVal}
                    onChange={e => set('pitch', `${e.target.value > 0 ? '+' : ''}${e.target.value}Hz`)}
                    style={{ width: '100%', accentColor: iconColor }}
                  />
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--muted)' }}>
                    <span>-20Hz grave</span><span>0Hz neutro</span><span>+20Hz agudo</span>
                  </div>
                </div>

                {/* Volume */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <label style={labelStyle}>
                    Volume&nbsp;
                    <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0, color: iconColor }}>
                      {volumeVal > 0 ? `+${volumeVal}%` : `${volumeVal}%`}
                    </span>
                  </label>
                  <input
                    type="range" min="-50" max="50" step="5"
                    value={volumeVal}
                    onChange={e => set('volume', `${e.target.value > 0 ? '+' : ''}${e.target.value}%`)}
                    style={{ width: '100%', accentColor: iconColor }}
                  />
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--muted)' }}>
                    <span>-50% baixo</span><span>0% normal</span><span>+50% alto</span>
                  </div>
                </div>

              </div>
            )
          })()}

          {/* System Prompt (Chat) */}
          {showPrompt && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <label style={labelStyle}>System Prompt (Personalidade)</label>
              <textarea
                className="input"
                style={{ minHeight: 120, fontSize: 12, lineHeight: 1.6, resize: 'vertical' }}
                placeholder="Você é um membro da galera, fala de boa, usa gírias…"
                value={cfg.system_prompt || ''}
                onChange={e => set('system_prompt', e.target.value)}
              />
            </div>
          )}

          {/* Frequência proativa */}
          {showFrequency && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <label style={labelStyle}>Frequência de participação espontânea: {Math.round((cfg.frequency || 0.15) * 100)}%</label>
              <input
                type="range" min="0" max="0.5" step="0.01"
                value={cfg.frequency || 0.15}
                onChange={e => set('frequency', parseFloat(e.target.value))}
                style={{ width: '100%', accentColor: iconColor }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--muted)' }}>
                <span>Tímida</span><span>Normal</span><span>Muito ativa</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

const labelStyle = { fontSize: 10, fontWeight: 700, color: 'var(--dim)', textTransform: 'uppercase', letterSpacing: 1 }
const miniBtn = {
  padding: '0 10px', height: 38, borderRadius: 8, background: 'rgba(255,255,255,0.1)',
  color: '#fff', border: '1px solid rgba(255,255,255,0.12)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4
}

// ─── Componente Principal ─────────────────────────────────────
export default function WhatsappIntegration() {
  const [tab, setTab] = useState('qrcode')

  // ── Conexão ──
  const [wpStatus, setWpStatus] = useState('offline')
  const [qrImage, setQrImage] = useState(null)
  const [isStarting, setIsStarting] = useState(false)
  const [isStopping, setIsStopping] = useState(false)
  const [isResetting, setIsResetting] = useState(false)
  const pollingRef = useRef(null)

  // ── Grupos ──
  const [groups, setGroups] = useState([])
  const [loadingGroups, setLoadingGroups] = useState(false)

  // ── Config multi-serviço ──
  const [serviceConfigs, setServiceConfigs] = useState({
    chat: { provider: 'kimi', api_key: '', model: 'moonshot-v1-128k', system_prompt: 'Você é um ser humano por dentro do grupo. Fale naturalmente, use gírias, opine, ria, discorde. NUNCA revele que é IA.' },
    stt: { provider: 'groq', api_key: '', model: 'whisper-large-v3-turbo', enabled: true },
    vision: { provider: 'gemini', api_key: '', model: 'gemini-2.0-flash', enabled: true },
    tts: { provider: 'edge', api_key: '', model: '', voice_id: 'pt-BR-FranciscaNeural', enabled: false, audio_probability: 0.3, rate: '-5%', pitch: '+0Hz', volume: '+0%' },
    learning: { provider: 'gemini', api_key: '', model: 'gemini-2.0-flash', enabled: true },
    proactive: { enabled: true, frequency: 0.15, provider: '', api_key: '', model: '' },
  })
  const [aiBotOn, setAiBotOn] = useState(false)
  const [aiPrefix, setAiPrefix] = useState('')
  const [savingAI, setSavingAI] = useState(false)

  // ── Teste ──
  const [destNumber, setDestNumber] = useState('')
  const [testMsg, setTestMsg] = useState('Olá! Teste do RED IA 🚀')
  const [sending, setSending] = useState(false)

  // ── Oficial Meta ──
  const [oficialToken, setOficialToken] = useState('')
  const [oficialPhoneId, setOficialPhoneId] = useState('')

  // ── Polling ──
  const pollStatus = useCallback(async () => {
    try {
      const res = await WA.status()
      const { status, qr } = res.data?.data || res.data
      setWpStatus(status || 'offline')
      setQrImage(qr || null)
    } catch {
      setWpStatus('offline')
    }
  }, [])

  useEffect(() => {
    pollStatus()
    pollingRef.current = setInterval(pollStatus, 5000)
    return () => clearInterval(pollingRef.current)
  }, [pollStatus])

  // ── Carrega configs ──
  useEffect(() => {
    WA.getAI().then(res => {
      const c = res.data?.data || res.data || {}
      setAiBotOn(c.ai_bot_enabled === 'true' || c.ai_bot_enabled === true)
      setAiPrefix(c.ai_prefix || '')

      // Monta serviceConfigs a partir das keys do banco
      setServiceConfigs(prev => ({
        chat: {
          provider: c.chat_provider || prev.chat.provider,
          api_key: c[`${c.chat_provider || prev.chat.provider}_api_key`] || c.chat_api_key || prev.chat.api_key,
          model: c.chat_model || prev.chat.model,
          system_prompt: c.chat_system_prompt || c.gemini_system_prompt || c.groq_system_prompt || prev.chat.system_prompt,
        },
        stt: {
          provider: c.stt_provider || prev.stt.provider,
          api_key: c.stt_api_key || prev.stt.api_key,
          model: c.stt_model || prev.stt.model,
          enabled: c.stt_enabled !== 'false',
        },
        vision: {
          provider: c.vision_provider || prev.vision.provider,
          api_key: c.vision_api_key || prev.vision.api_key,
          model: c.vision_model || prev.vision.model,
          enabled: c.vision_enabled !== 'false',
        },
        tts: {
          provider: c.tts_provider || prev.tts.provider,
          api_key: c.tts_api_key || prev.tts.api_key,
          model: c.tts_model || prev.tts.model,
          voice_id: c.tts_voice_id || prev.tts.voice_id,
          enabled: c.tts_enabled === 'true' || c.tts_enabled === true,
          audio_probability: parseFloat(c.tts_audio_probability) || prev.tts.audio_probability,
          rate: c.tts_rate || prev.tts.rate,
          pitch: c.tts_pitch || prev.tts.pitch,
          volume: c.tts_volume || prev.tts.volume,
        },
        learning: {
          provider: c.learning_provider || prev.learning.provider,
          api_key: c.learning_api_key || prev.learning.api_key,
          model: c.learning_model || prev.learning.model,
          enabled: c.learning_enabled !== 'false',
        },
        proactive: {
          enabled: c.proactive_enabled !== 'false',
          frequency: parseFloat(c.proactive_frequency) || prev.proactive.frequency,
          provider: c.proactive_provider || prev.proactive.provider,
          api_key: c.proactive_api_key || prev.proactive.api_key,
          model: c.proactive_model || prev.proactive.model,
        },
      }))
    }).catch(() => {})
  }, [])

  const handleServiceChange = (serviceKey, field, value) => {
    setServiceConfigs(prev => ({
      ...prev,
      [serviceKey]: { ...prev[serviceKey], [field]: value }
    }))
  }

  const handleStart = async () => {
    setIsStarting(true)
    try {
      await WA.start()
      setWpStatus('connecting')
      toast.success('Iniciando sessão…')
    } catch (err) {
      toast.error(err?.response?.data?.error || 'Falha ao iniciar')
    } finally {
      setIsStarting(false)
    }
  }

  const handleStop = async () => {
    setIsStopping(true)
    try {
      await WA.stop()
      setWpStatus('disconnected')
      setQrImage(null)
      toast.success('Desconectado.')
    } catch {
      toast.error('Erro ao desconectar')
    } finally {
      setIsStopping(false)
    }
  }

  const handleReset = async () => {
    if (!window.confirm('Isso vai apagar as credenciais salvas e forçar um novo QR Code. Continuar?')) return
    setIsResetting(true)
    try {
      await WA.reset()
      setWpStatus('disconnected')
      setQrImage(null)
      toast.success('Sessão resetada! Clique em "Iniciar e Gerar QR" para reconectar.')
    } catch (err) {
      toast.error(err?.response?.data?.error || 'Erro ao resetar')
    } finally {
      setIsResetting(false)
    }
  }

  const fetchGroups = async () => {
    setLoadingGroups(true)
    try {
      const res = await WA.groups()
      setGroups(res.data?.data?.groups || res.data?.groups || [])
    } catch {
      toast.error('Erro ao buscar grupos')
    } finally {
      setLoadingGroups(false)
    }
  }

  const handleSaveAI = async () => {
    setSavingAI(true)
    try {
      const s = serviceConfigs
      const payload = {
        ai_bot_enabled: String(aiBotOn),
        ai_prefix: aiPrefix,
        // Chat
        chat_provider: s.chat.provider,
        chat_api_key: s.chat.api_key,
        [`${s.chat.provider}_api_key`]: s.chat.api_key,
        chat_model: s.chat.model,
        [`${s.chat.provider}_model`]: s.chat.model,
        chat_system_prompt: s.chat.system_prompt,
        [`${s.chat.provider}_system_prompt`]: s.chat.system_prompt,
        // STT
        stt_provider: s.stt.provider,
        stt_api_key: s.stt.api_key,
        [`${s.stt.provider}_api_key`]: s.stt.api_key,
        stt_model: s.stt.model,
        stt_enabled: String(s.stt.enabled !== false),
        // Vision
        vision_provider: s.vision.provider,
        vision_api_key: s.vision.api_key,
        [`${s.vision.provider}_api_key`]: s.vision.api_key,
        vision_model: s.vision.model,
        vision_enabled: String(s.vision.enabled !== false),
        // TTS
        tts_provider: s.tts.provider,
        tts_api_key: s.tts.api_key,
        tts_model: s.tts.model,
        tts_voice_id: s.tts.voice_id,
        tts_enabled: String(s.tts.enabled === true),
        tts_audio_probability: String(s.tts.audio_probability || 0.3),
        tts_rate: s.tts.rate || '-5%',
        tts_pitch: s.tts.pitch || '+0Hz',
        tts_volume: s.tts.volume || '+0%',
        // Learning
        learning_provider: s.learning.provider,
        learning_api_key: s.learning.api_key,
        [`${s.learning.provider}_api_key`]: s.learning.api_key,
        learning_model: s.learning.model,
        learning_enabled: String(s.learning.enabled !== false),
        // Proactive
        proactive_enabled: String(s.proactive.enabled !== false),
        proactive_frequency: String(s.proactive.frequency || 0.15),
        proactive_provider: s.proactive.provider || '',
        proactive_api_key: s.proactive.api_key || '',
        proactive_model: s.proactive.model || '',
        // Legado
        ai_provider: s.chat.provider,
      }

      await WA.saveAI(payload)
      toast.success('Configurações salvas! IA recarregada.')
    } catch (err) {
      toast.error(err?.response?.data?.error || 'Erro ao salvar')
    } finally {
      setSavingAI(false)
    }
  }

  const handleSend = async () => {
    if (!destNumber) return toast.error('Informe o número')
    setSending(true)
    try {
      const payload = tab === 'oficial'
        ? { engine: 'oficial', number: destNumber, message: testMsg, configs: { token: oficialToken, phoneId: oficialPhoneId } }
        : { engine: 'qrcode', number: destNumber, message: testMsg }
      const res = await WA.send(payload)
      if (res.data?.success) toast.success('Mensagem enviada!')
      else toast.error(res.data?.error || 'Erro')
    } catch (err) {
      toast.error(err?.response?.data?.error || 'Falha')
    } finally {
      setSending(false)
    }
  }

  const TAB_BTN = (id, icon, text, accent) => (
    <button key={id} onClick={() => setTab(id)} style={{
      flex: 1, padding: '14px 8px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
      background: tab === id ? `${accent}18` : 'transparent',
      color: tab === id ? accent : 'var(--muted)',
      border: 'none', borderBottom: tab === id ? `2px solid ${accent}` : '2px solid transparent',
      fontWeight: 700, fontFamily: 'inherit', cursor: 'pointer', fontSize: 13, transition: 'all 0.2s'
    }}>{icon} {text}</button>
  )

  return (
    <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, overflow: 'hidden' }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        .spin { animation: spin 1s linear infinite; }
      `}</style>

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        {TAB_BTN('qrcode',  <QrCode size={15}/>,  'Microserviço (QR Code)', '#22c55e')}
        <div style={{ width: 1, background: 'rgba(255,255,255,0.08)' }}/>
        {TAB_BTN('oficial', <Cloud size={15}/>,   'API Oficial (Meta)', '#3b82f6')}
      </div>

      <div style={{ padding: 24 }}>
        {tab === 'qrcode' ? (
          <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>

            {/* ── Coluna Esquerda ── */}
            <div style={{ flex: '1 1 300px', display: 'flex', flexDirection: 'column', gap: 20 }}>

              {/* Conexão */}
              <div style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 14, padding: 24 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Wifi size={16} color="#22c55e"/>
                    <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--text)' }}>Conexão Admin</span>
                  </div>
                  <StatusBadge status={wpStatus} />
                </div>

                {(wpStatus === 'offline' || wpStatus === 'disconnected') && (
                  <>
                    <button onClick={handleStart} disabled={isStarting} style={{ width: '100%', padding: '12px', borderRadius: 10, background: isStarting ? 'rgba(34,197,94,0.3)' : '#22c55e', color: '#000', border: 'none', fontWeight: 800, cursor: isStarting ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontSize: 14 }}>
                      {isStarting ? <><Loader size={16} className="spin"/> Iniciando…</> : <><RefreshCw size={16}/> Iniciar e Gerar QR</>}
                    </button>
                    <button onClick={handleReset} disabled={isResetting} style={{ width: '100%', marginTop: 8, padding: '9px', borderRadius: 9, background: 'transparent', color: '#f97316', border: '1px solid rgba(249,115,22,0.35)', fontWeight: 700, cursor: isResetting ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, fontSize: 12, opacity: isResetting ? 0.6 : 1 }}>
                      <RefreshCw size={13}/> {isResetting ? 'Resetando…' : 'Reset Forçado (novo QR)'}
                    </button>
                  </>
                )}

                {wpStatus === 'connecting' && (
                  <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, padding: '8px 0' }}>
                    <Loader size={32} color="#3b82f6" className="spin"/>
                    <span style={{ fontSize: 13, color: 'var(--muted)' }}>Aguardando QR Code…</span>
                  </div>
                )}

                {wpStatus === 'qrcode' && qrImage && (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
                    <img src={qrImage} alt="QR" style={{ width: 220, height: 220, borderRadius: 12, background: '#fff', padding: 8 }}/>
                    <p style={{ fontSize: 12, color: 'var(--muted)', textAlign: 'center' }}>WhatsApp → <strong>Aparelhos Conectados</strong> → Escanear</p>
                  </div>
                )}

                {wpStatus === 'qrcode' && !qrImage && (
                  <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
                    <Loader size={28} color="#a855f7" className="spin"/>
                    <span style={{ fontSize: 13, color: 'var(--muted)' }}>Gerando QR…</span>
                  </div>
                )}

                {wpStatus === 'authenticated' && (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(34,197,94,0.15)', border: '2px solid #22c55e40', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <CheckCircle size={28} color="#22c55e"/>
                    </div>
                    <span style={{ fontWeight: 700, color: '#22c55e', fontSize: 15 }}>Aparelho Conectado!</span>
                    <button onClick={fetchGroups} disabled={loadingGroups} style={{ width: '100%', padding: '9px', borderRadius: 8, background: '#3b82f6', color: '#fff', border: 'none', fontWeight: 700, cursor: 'pointer', fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7 }}>
                      <Users size={14} className={loadingGroups ? 'spin' : ''}/> {loadingGroups ? 'Buscando…' : 'Listar Grupos'}
                    </button>
                    {groups.length > 0 && (
                      <div style={{ width: '100%', maxHeight: 160, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 5, border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: 8, background: 'rgba(0,0,0,0.2)' }}>
                        {groups.map(g => (
                          <div key={g.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 8px', background: 'rgba(255,255,255,0.04)', borderRadius: 6 }}>
                            <span style={{ color: '#fff', fontSize: 11, maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{g.subject}</span>
                            <button onClick={() => setDestNumber(g.id)} style={{ padding: '2px 7px', background: 'rgba(34,197,94,0.2)', color: '#22c55e', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 10, fontWeight: 700 }}>Usar</button>
                          </div>
                        ))}
                      </div>
                    )}
                    <button onClick={handleStop} disabled={isStopping} style={{ padding: '6px 14px', borderRadius: 8, background: 'transparent', color: '#ef4444', border: '1px solid rgba(239,68,68,0.25)', cursor: 'pointer', fontSize: 12, fontWeight: 700 }}>
                      {isStopping ? 'Desconectando…' : 'Desconectar'}
                    </button>
                  </div>
                )}
              </div>

              {/* ── Controles Globais do Bot ── */}
              <div style={{ background: 'rgba(0,0,0,0.25)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, padding: 18 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 14 }}>
                  <Sparkles size={15} color="#f59e0b"/>
                  <span style={{ fontWeight: 700, fontSize: 13, color: '#f59e0b' }}>Controles Globais</span>
                </div>

                {/* Ativar robô */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                  <div>
                    <div style={{ fontSize: 13, color: 'var(--text)', fontWeight: 600 }}>Ativar Robô no WhatsApp</div>
                    <div style={{ fontSize: 11, color: 'var(--muted)' }}>Liga/desliga a IA para todas as interações</div>
                  </div>
                  <button onClick={() => setAiBotOn(v => !v)} style={{ width: 48, height: 26, borderRadius: 13, border: 'none', cursor: 'pointer', background: aiBotOn ? '#22c55e' : 'rgba(255,255,255,0.12)', position: 'relative', transition: 'background 0.25s' }}>
                    <div style={{ width: 20, height: 20, borderRadius: '50%', background: '#fff', position: 'absolute', top: 3, left: aiBotOn ? 25 : 3, transition: 'left 0.25s' }}/>
                  </button>
                </div>

                {/* Palavra-chave */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <label style={labelStyle}>Palavra-chave em grupos (opcional)</label>
                  <input
                    type="text" className="input" style={{ fontSize: 13 }}
                    placeholder="Ex: bot, red, sistema — deixe vazio para participar livremente"
                    value={aiPrefix}
                    onChange={e => setAiPrefix(e.target.value)}
                  />
                  <p style={{ fontSize: 10, color: 'var(--muted)', margin: 0 }}>
                    Deixe vazio + proatividade ativa = IA participa livremente como humano.
                  </p>
                </div>
              </div>
            </div>

            <div style={{ width: 1, background: 'rgba(255,255,255,0.07)', alignSelf: 'stretch' }}/>

            {/* ── Coluna Direita: Cards de IA ── */}
            <div style={{ flex: '2 1 380px', display: 'flex', flexDirection: 'column', gap: 12 }}>

              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <Brain size={16} color="#a855f7"/>
                <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--text)' }}>Serviços de IA</span>
                <span style={{ fontSize: 11, color: 'var(--muted)', marginLeft: 4 }}>Configure cada modelo separadamente</span>
              </div>

              {/* Chat */}
              <AIServiceCard
                title="💬 Chat — Geração de Texto"
                icon={MessageCircle} iconColor="#22c55e"
                description="Kimi K2 recomendado para português + contexto longo"
                serviceKey="chat"
                configs={serviceConfigs}
                onChange={handleServiceChange}
                providers={PROVIDERS}
                showPrompt={true}
                showToggle={false}
              />

              {/* STT */}
              <AIServiceCard
                title="🎤 STT — Transcrição de Áudio"
                icon={Mic} iconColor="#f59e0b"
                description="Groq Whisper: transcreve PTT e áudios recebidos"
                serviceKey="stt"
                configs={serviceConfigs}
                onChange={handleServiceChange}
                providers={STT_PROVIDERS}
              />

              {/* Visão */}
              <AIServiceCard
                title="👁️ Visão — Análise de Imagens"
                icon={Eye} iconColor="#3b82f6"
                description="Gemini Flash: vê e descreve fotos recebidas"
                serviceKey="vision"
                configs={serviceConfigs}
                onChange={handleServiceChange}
                providers={[
                  { value: 'gemini', label: 'Google Gemini', color: '#4285F4' },
                  { value: 'openrouter', label: 'OpenRouter (gpt-4o, etc)', color: '#6366F1' },
                  { value: 'openai', label: 'OpenAI GPT-4o', color: '#10A37F' },
                  { value: 'nvidia', label: 'NVIDIA NIM', color: '#76B900' },
                ]}
              />

              {/* TTS */}
              <AIServiceCard
                title="🔊 TTS — Síntese de Voz"
                icon={Volume2} iconColor="#ec4899"
                description="Edge-TTS: 3 vozes pt-BR amigáveis. espeak-ng disponível como opção manual."
                serviceKey="tts"
                configs={serviceConfigs}
                onChange={handleServiceChange}
                providers={TTS_PROVIDERS}
                showVoiceId={true}
                showVoiceSelector={true}
                showProbability={true}
              />

              {/* Learning */}
              <AIServiceCard
                title="🧠 Aprendizado — Análise Social"
                icon={Brain} iconColor="#a855f7"
                description="Analisa perfis, vibes, gírias e aprende com cada conversa"
                serviceKey="learning"
                configs={serviceConfigs}
                onChange={handleServiceChange}
                providers={PROVIDERS}
              />

              {/* Proativo */}
              <AIServiceCard
                title="⚡ Proatividade — Fala por Conta Própria"
                icon={Activity} iconColor="#f97316"
                description="IA entra na conversa sem ser chamada, como um humano"
                serviceKey="proactive"
                configs={serviceConfigs}
                onChange={handleServiceChange}
                providers={PROVIDERS}
                showFrequency={true}
              />

              {/* Botão salvar */}
              <button
                onClick={handleSaveAI}
                disabled={savingAI}
                style={{ padding: '13px', borderRadius: 10, background: savingAI ? 'rgba(168,85,247,0.4)' : '#a855f7', color: '#fff', border: 'none', fontWeight: 800, cursor: savingAI ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontSize: 14, marginTop: 4 }}
              >
                <Settings size={16}/> {savingAI ? 'Salvando e recarregando IA…' : 'Salvar Todas as Configurações'}
              </button>

              {/* Testador */}
              <div style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, padding: 18, marginTop: 4 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                  <Zap size={15} color="#f59e0b"/>
                  <span style={{ fontWeight: 700, fontSize: 13, color: '#f59e0b' }}>Disparador de Teste</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <label style={labelStyle}>Destino (+55 DDD Número ou ID Grupo)</label>
                    <input type="text" className="input" style={{ fontSize: 13 }} placeholder="5585999999999" value={destNumber} onChange={e => setDestNumber(e.target.value)}/>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <label style={labelStyle}>Mensagem</label>
                    <textarea className="input" style={{ minHeight: 70, fontSize: 13 }} value={testMsg} onChange={e => setTestMsg(e.target.value)}/>
                  </div>
                  <button onClick={handleSend} disabled={sending} style={{ padding: '11px', background: '#ef4444', color: '#fff', border: 'none', borderRadius: 9, fontWeight: 800, cursor: sending ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, opacity: sending ? 0.7 : 1 }}>
                    <Send size={14}/> {sending ? 'Disparando…' : 'Disparar Teste'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* Tab API Oficial */
          <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
            <div style={{ flex: '1 1 300px', display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Cloud size={16} color="#3b82f6"/>
                <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--text)' }}>Meta for Developers</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <label style={labelStyle}>Token de Acesso (Bearer)</label>
                <input type="password" className="input" placeholder="EAAM…" value={oficialToken} onChange={e => setOficialToken(e.target.value)}/>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <label style={labelStyle}>Phone Number ID</label>
                <input type="text" className="input" placeholder="104728941…" value={oficialPhoneId} onChange={e => setOficialPhoneId(e.target.value)}/>
              </div>
            </div>
            <div style={{ width: 1, background: 'rgba(255,255,255,0.07)', alignSelf: 'stretch' }}/>
            <div style={{ flex: '1 1 280px', display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Zap size={15} color="#f59e0b"/>
                <span style={{ fontWeight: 700, fontSize: 13, color: '#f59e0b' }}>Testador (API Oficial)</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <label style={labelStyle}>Destino</label>
                <input type="text" className="input" placeholder="5585999999999" value={destNumber} onChange={e => setDestNumber(e.target.value)}/>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <label style={labelStyle}>Mensagem</label>
                <textarea className="input" style={{ minHeight: 90 }} value={testMsg} onChange={e => setTestMsg(e.target.value)}/>
              </div>
              <button onClick={handleSend} disabled={sending} style={{ padding: '12px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: 9, fontWeight: 800, cursor: sending ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, opacity: sending ? 0.7 : 1 }}>
                <Send size={15}/> {sending ? 'Enviando…' : 'Testar via Cloud API'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
