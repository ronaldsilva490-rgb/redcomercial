import { useState, useRef, useEffect, useCallback } from 'react'
import {
  Bot, Send, Loader, Terminal, FileCode, Database, GitBranch,
  Globe, Trash2, Settings, ChevronDown, ChevronUp, Copy, Check,
  RefreshCw, X, CheckCircle, AlertCircle, Zap, Clock, Plus,
  Menu, ArrowLeft, Paperclip, Image, FileText, XCircle
} from 'lucide-react'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:7860'

// ─── Somente provider LOCAL (Llama/Ollama) ───────────────
const PROVIDERS = [
  { id: 'ollama_local', name: 'Llama / Local', logo: '🦙', color: '#22C55E', keyPlaceholder: 'https://xxxx.ngrok-free.app', keyUrl: 'https://ngrok.com', free: true, note: 'Rodando na sua GPU — custo zero, sem limite de tokens' },
]

const DEFAULT_MODELS = {
  ollama_local: [
    { id: 'qwen2.5-coder:7b',       name: 'Qwen 2.5 Coder 7B ⭐ (recomendado para código)',   group: '🦙 Local' },
    { id: 'qwen2.5-coder:3b',       name: 'Qwen 2.5 Coder 3B (GPUs menores)',                 group: '🦙 Local' },
    { id: 'qwen2.5-coder:14b',      name: 'Qwen 2.5 Coder 14B (GPUs potentes)',               group: '🦙 Local' },
    { id: 'llama3.1:8b',            name: 'Llama 3.1 8B',                                     group: '🦙 Local' },
    { id: 'llama3.2:3b',            name: 'Llama 3.2 3B',                                     group: '🦙 Local' },
    { id: 'llama3.3:70b',           name: 'Llama 3.3 70B (GPU alta)',                         group: '🦙 Local' },
    { id: 'deepseek-coder:6.7b',    name: 'DeepSeek Coder 6.7B',                              group: '🦙 Local' },
    { id: 'deepseek-coder-v2:16b',  name: 'DeepSeek Coder V2 16B',                            group: '🦙 Local' },
    { id: 'phi3:mini',              name: 'Phi-3 Mini (3.8B)',                                group: '🦙 Local' },
    { id: 'phi4:14b',               name: 'Phi-4 14B',                                        group: '🦙 Local' },
    { id: 'mistral:7b',             name: 'Mistral 7B',                                       group: '🦙 Local' },
    { id: 'codellama:7b',           name: 'Code Llama 7B',                                    group: '🦙 Local' },
    { id: 'codellama:13b',          name: 'Code Llama 13B',                                   group: '🦙 Local' },
  ],
}

// ─── Tool config (original + patch_file do patch) ────────
const TOOL_CFG = {
  read_file:     { Icon: FileCode,  color: '#3B82F6', label: 'Lendo arquivo (GitHub)' },
  write_file:    { Icon: FileCode,  color: '#22C55E', label: 'Escrevendo arquivo (GitHub)' },
  list_files:    { Icon: Terminal,  color: '#6B7280', label: 'Listando arquivos (GitHub)' },
  read_file_hf:  { Icon: FileCode,  color: '#FB923C', label: 'Lendo backend (GitHub→Fly.io)' },
  write_file_hf: { Icon: FileCode,  color: '#EF4444', label: 'Escrevendo backend (GitHub→Fly.io)' },
  list_files_hf: { Icon: Terminal,  color: '#9CA3AF', label: 'Listando backend (GitHub→Fly.io)' },
  run_sql:       { Icon: Database,  color: '#F59E0B', label: 'Executando SQL' },
  list_tenants:  { Icon: Database,  color: '#F97316', label: 'Buscando empresas' },
  patch_file:    { Icon: FileCode,  color: '#22C55E', label: 'Patch arquivo (GitHub)' },
  patch_file_hf: { Icon: FileCode,  color: '#EF4444', label: 'Patch backend (GitHub→Fly.io)' },
  vercel_deploy: { Icon: Globe,     color: '#00C7B7', label: 'Deploy Vercel' },
  github_commit: { Icon: GitBranch, color: '#A78BFA', label: 'Commit GitHub' },
}

const SUGGESTED = [
  'Liste os arquivos do projeto',
  'Mostre as rotas do backend',
  'Quais tabelas existem no banco?',
  'Quais empresas estão cadastradas?',
]

// ─── Persistência ─────────────────────────────────────────
const K = {
  KEYS:        'ai_provider_keys',
  ACTIVE_PROV: 'ai_active_provider',
  CONVS:       'ai_conversations',
  ACTIVE_CONV: 'ai_active_conv',
}

const loadJ = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d } catch { return d } }
const saveJ = (k, v) => localStorage.setItem(k, JSON.stringify(v))
const loadS = (k, d = '') => localStorage.getItem(k) ?? d
const saveS = (k, v) => localStorage.setItem(k, v)

function fmtDate(ts) {
  const diff = (Date.now() - ts) / 1000
  if (diff < 60)     return 'agora'
  if (diff < 3600)   return `${Math.floor(diff / 60)}min atrás`
  if (diff < 86400)  return `${Math.floor(diff / 3600)}h atrás`
  if (diff < 172800) return 'ontem'
  return new Date(ts).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
}

// ─── Ops executor (pós-SSE) — commita backend no GitHub → Fly.io ────
async function _execHfOps(ops, convId, updateLastMsg, attempt = 1) {
  const MAX_ATTEMPTS = 3
  const RETRY_DELAY  = 4000

  updateLastMsg(m => ({ ...m, status: `📦 Commitando ${ops.length} arquivo(s) no GitHub... (${attempt}/${MAX_ATTEMPTS})` }))

  try {
    const token = localStorage.getItem('access_token')
    const res   = await fetch(`${API_BASE}/api/superadmin/ai/exec-ops`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body:    JSON.stringify({ ops }),
    })

    if (!res.ok) {
      let errText = `HTTP ${res.status}`
      try { const e = await res.json(); errText = JSON.stringify(e) } catch {}
      throw new Error(errText)
    }

    const data    = await res.json()
    const results = data.results || []

    // Atualiza badges queued→resultado real por ordem de fila
    let queuedIdx = 0
    updateLastMsg(m => {
      const newToolCalls = [...(m.toolCalls || [])]
      for (let i = 0; i < newToolCalls.length; i++) {
        const tc = newToolCalls[i]
        const isQueued = (tc.tool === 'write_file' || tc.tool === 'patch_file') && tc.result?.queued
        if (isQueued) {
          const realResult = results[queuedIdx]?.result ?? { error: 'Sem resultado' }
          newToolCalls[i] = { ...tc, result: realResult, running: false }
          queuedIdx++
        }
      }
      return { ...m, toolCalls: newToolCalls, status: null }
    })

    const failures = results.filter(r => r.result?.error)
    if (failures.length > 0) {
      const failMsg = failures.map(r => {
        const detail = r.result.detail ? `\n  Detalhe: ${JSON.stringify(r.result.detail)}` : ''
        const hint   = r.result.hint   ? `\n  💡 ${r.result.hint}` : ''
        return `• ${r.args?.path || r.tool}: ${r.result.error}${detail}${hint}`
      }).join('\n')
      updateLastMsg(m => ({
        ...m,
        pendingHfOps: ops,
        content: (m.content || '') + `\n\n❌ **${failures.length} commit(s) falharam:**\n\`\`\`\n${failMsg}\n\`\`\`\n💡 Verifique se GITHUB_TOKEN e GITHUB_BACKEND_REPO estão corretos nas variáveis do Fly.io. Use o botão **Retentar** abaixo.`,
      }))
    } else {
      const sha = data.commit || results[0]?.result?.commit || '✓'
      updateLastMsg(m => ({
        ...m,
        pendingHfOps: null,
        content: (m.content || '') + `\n\n✅ **${results.length} arquivo(s) commitado(s) no GitHub.** SHA: \`${sha}\`. GitHub Action vai rodar fly deploy em ~60s.`,
      }))
    }

  } catch (err) {
    if (attempt < MAX_ATTEMPTS) {
      updateLastMsg(m => ({ ...m, status: `⚠️ Tentativa ${attempt} falhou (${err.message}). Retentando em ${RETRY_DELAY/1000}s...` }))
      await new Promise(r => setTimeout(r, RETRY_DELAY))
      return _execHfOps(ops, convId, updateLastMsg, attempt + 1)
    }
    updateLastMsg(m => ({
      ...m,
      status:       null,
      pendingHfOps: ops,
      content: (m.content || '') + `\n\n❌ **Não foi possível commitar no GitHub após ${MAX_ATTEMPTS} tentativas.**\nÚltimo erro: \`${err.message}\`\n\nUse o botão **Retentar** abaixo.`,
    }))
  }
}



function ToolBadge({ tool, result, running }) {
  const [open, setOpen] = useState(false)
  const cfg = TOOL_CFG[tool] || { Icon: Terminal, color: '#6B7280', label: tool }
  const { Icon } = cfg
  return (
    <div style={{ background: 'var(--bg)', border: `1px solid ${cfg.color}44`, borderRadius: 8, marginBottom: 5, overflow: 'hidden' }}>
      <button onClick={() => result && setOpen(v => !v)}
        style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '6px 10px', background: 'none', border: 'none', cursor: result ? 'pointer' : 'default', fontFamily: 'inherit' }}>
        {running
          ? <div style={{ width: 12, height: 12, border: `2px solid ${cfg.color}44`, borderTopColor: cfg.color, borderRadius: '50%', animation: 'spin 0.8s linear infinite', flexShrink: 0 }} />
          : <Icon size={12} color={cfg.color} />}
        <span style={{ fontSize: 11, color: cfg.color, fontWeight: 600, flex: 1, textAlign: 'left' }}>{cfg.label}</span>
        {running && <span style={{ fontSize: 10, color: 'var(--muted)' }}>executando...</span>}
        {result && !running && (open ? <ChevronUp size={11} color='var(--muted)' /> : <ChevronDown size={11} color='var(--muted)' />)}
      </button>
      {open && result && (
        <div style={{ padding: '6px 10px', borderTop: `1px solid ${cfg.color}22`, fontSize: 11, color: 'var(--muted)', fontFamily: 'monospace', whiteSpace: 'pre-wrap', wordBreak: 'break-all', maxHeight: 180, overflowY: 'auto' }}>
          {typeof result === 'string' ? result : JSON.stringify(result, null, 2)}
        </div>
      )}
    </div>
  )
}

// ─── Markdown renderer (versão original completa) ─────────
function renderInline(text, k) {
  return text.split(/(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g).map((p, i) => {
    const key = `${k}-${i}`
    if (p.startsWith('**') && p.endsWith('**')) return <strong key={key} style={{ color: 'var(--text)', fontWeight: 700 }}>{p.slice(2, -2)}</strong>
    if (p.startsWith('*')  && p.endsWith('*'))  return <em key={key} style={{ color: 'var(--dim)', fontStyle: 'italic' }}>{p.slice(1, -1)}</em>
    if (p.startsWith('`')  && p.endsWith('`'))  return <code key={key} style={{ background: 'var(--bg4)', padding: '1px 6px', borderRadius: 4, fontSize: '0.9em', fontFamily: 'monospace', color: '#A78BFA', border: '1px solid rgba(167,139,250,0.2)' }}>{p.slice(1, -1)}</code>
    return <span key={key}>{p}</span>
  })
}

function renderMd(text) {
  if (!text) return null
  const segments = []
  let last = 0
  const codeRe = /```(\w*)\n?([\s\S]*?)```/g
  let m
  while ((m = codeRe.exec(text)) !== null) {
    if (m.index > last) segments.push({ type: 'text', content: text.slice(last, m.index) })
    segments.push({ type: 'code', lang: m[1], content: m[2] })
    last = m.index + m[0].length
  }
  if (last < text.length) segments.push({ type: 'text', content: text.slice(last) })

  return segments.map((seg, si) => {
    if (seg.type === 'code') return (
      <div key={si} style={{ margin: '10px 0', borderRadius: 8, overflow: 'hidden', border: '1px solid var(--border)' }}>
        {seg.lang && <div style={{ background: 'var(--bg4)', padding: '4px 12px', fontSize: 10, color: 'var(--muted)', fontFamily: 'monospace', letterSpacing: 1, textTransform: 'uppercase', borderBottom: '1px solid var(--border)' }}>{seg.lang}</div>}
        <pre style={{ background: 'var(--bg)', padding: '12px 14px', margin: 0, fontSize: 12, overflowX: 'auto', fontFamily: 'monospace', whiteSpace: 'pre', lineHeight: 1.6 }}><code style={{ color: '#e2e8f0' }}>{seg.content.replace(/\n$/, '')}</code></pre>
      </div>
    )
    const lines = seg.content.split('\n')
    const nodes = []
    let i = 0
    while (i < lines.length) {
      const line = lines[i]; const k = `${si}-${i}`
      if (!line.trim()) { nodes.push(<div key={k} style={{ height: 6 }} />); i++; continue }
      const hm = line.match(/^(#{1,3})\s+(.+)/)
      if (hm) { const sz = { 1: 18, 2: 15, 3: 13 }[hm[1].length] || 13; nodes.push(<div key={k} style={{ fontSize: sz, fontWeight: 700, color: 'var(--text)', margin: '12px 0 4px', borderBottom: hm[1].length === 1 ? '1px solid var(--border)' : undefined, paddingBottom: hm[1].length === 1 ? 6 : undefined }}>{renderInline(hm[2], k)}</div>); i++; continue }
      if (/^[-*_]{3,}$/.test(line.trim())) { nodes.push(<hr key={k} style={{ border: 'none', borderTop: '1px solid var(--border)', margin: '10px 0' }} />); i++; continue }
      if (/^[\s]*[-*+]\s/.test(line)) {
        const items = []
        while (i < lines.length && /^[\s]*[-*+]\s/.test(lines[i])) { items.push({ text: lines[i].replace(/^[\s]*[-*+]\s/, ''), key: `${si}-${i}` }); i++ }
        nodes.push(<ul key={k} style={{ margin: '6px 0', paddingLeft: 0, listStyle: 'none' }}>{items.map(it => <li key={it.key} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', padding: '2px 0', color: 'var(--dim)', fontSize: 13, lineHeight: 1.6 }}><span style={{ color: 'var(--red)', marginTop: 3, flexShrink: 0, fontSize: 10 }}>◆</span><span>{renderInline(it.text, it.key)}</span></li>)}</ul>); continue
      }
      if (/^\d+\.\s/.test(line)) {
        const items = []
        while (i < lines.length && /^\d+\.\s/.test(lines[i])) { const num = lines[i].match(/^(\d+)\./)[1]; items.push({ num, text: lines[i].replace(/^\d+\.\s/, ''), key: `${si}-${i}` }); i++ }
        nodes.push(<ol key={k} style={{ margin: '6px 0', paddingLeft: 0, listStyle: 'none' }}>{items.map(it => <li key={it.key} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: '2px 0', color: 'var(--dim)', fontSize: 13, lineHeight: 1.6 }}><span style={{ color: 'var(--red)', fontWeight: 700, fontFamily: 'monospace', fontSize: 11, minWidth: 18, flexShrink: 0, paddingTop: 2 }}>{it.num}.</span><span>{renderInline(it.text, it.key)}</span></li>)}</ol>); continue
      }
      nodes.push(<p key={k} style={{ margin: '3px 0', color: 'var(--dim)', fontSize: 13, lineHeight: 1.7 }}>{renderInline(line, k)}</p>); i++
    }
    return <div key={si}>{nodes}</div>
  })
}

// ─── Message ──────────────────────────────────────────────
function Message({ msg, streaming }) {
  const [copied, setCopied] = useState(false)
  const isAI = msg.role === 'assistant'
  const copy = () => { navigator.clipboard.writeText(msg.content || ''); setCopied(true); setTimeout(() => setCopied(false), 1500) }

  return (
    <div style={{ display: 'flex', gap: 10, padding: '12px 0', borderBottom: '1px solid var(--border)', flexDirection: isAI ? 'row' : 'row-reverse' }}>
      <div style={{ width: 30, height: 30, borderRadius: 8, flexShrink: 0, background: isAI ? 'linear-gradient(135deg,var(--red),#ff4d5e)' : 'var(--bg3)', border: isAI ? 'none' : '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: isAI ? '0 0 10px rgba(232,25,44,0.3)' : 'none' }}>
        {isAI ? <Bot size={15} color='#fff' /> : <span style={{ fontSize: 12, fontWeight: 800, color: 'var(--dim)' }}>V</span>}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 5 }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: isAI ? 'var(--red)' : 'var(--dim)' }}>{isAI ? 'RED AI' : 'Você'}</span>
          <span style={{ fontSize: 10, color: 'var(--muted)' }}>{new Date(msg.ts).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
          {isAI && msg.content && !streaming && (
            <button onClick={copy} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: copied ? 'var(--green)' : 'var(--muted)', padding: '2px 4px' }}>
              {copied ? <Check size={11} /> : <Copy size={11} />}
            </button>
          )}
        </div>

        {/* Attachments da mensagem do usuário */}
        {msg.attachments?.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 6 }}>
            {msg.attachments.map((a, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 6, padding: '3px 8px' }}>
                {a.isImage
                  ? <img src={a.data} alt={a.name} style={{ width: 22, height: 22, objectFit: 'cover', borderRadius: 3 }} />
                  : <FileText size={13} color={a.isPdf ? '#EF4444' : '#3B82F6'} />}
                <span style={{ fontSize: 10, color: 'var(--dim)' }}>{a.name}</span>
              </div>
            ))}
          </div>
        )}

        {msg.toolCalls?.map((tc, i) => <ToolBadge key={i} tool={tc.tool} result={tc.result} running={!!tc.running} />)}
        {streaming && !msg.content && msg.status && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--muted)', fontStyle: 'italic' }}>
            <div style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--red)', animation: 'pulse 1s ease-in-out infinite', flexShrink: 0 }} />
            {msg.status}
          </div>
        )}
        {msg.content && (
          <div style={{ fontSize: 13, color: 'var(--text)', lineHeight: 1.7 }}>
            {renderMd(msg.content)}
            {streaming && <span style={{ display: 'inline-block', width: 2, height: 13, background: 'var(--red)', marginLeft: 2, animation: 'blink 0.7s step-end infinite', verticalAlign: 'text-bottom' }} />}
          </div>
        )}

        {/* Botão retry para commits HF que falharam */}
        {msg.pendingHfOps?.length > 0 && !streaming && (
          <button onClick={() => onRetryHfOps && onRetryHfOps(msg.pendingHfOps)}
            style={{ display:'flex', alignItems:'center', gap:6, marginTop:8, padding:'7px 14px', borderRadius:8, border:'1px solid rgba(239,68,68,0.4)', background:'rgba(239,68,68,0.08)', color:'#EF4444', fontSize:12, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>
            <RefreshCw size={12}/> Retentar {msg.pendingHfOps.length} commit(s)
          </button>
        )}
      </div>
    </div>
  )
}

// ─── SettingsPanel ────────────────────────────────────────
function SettingsPanel({ onClose, onSave }) {
  const allKeys = loadJ(K.KEYS, {})
  const [configs, setConfigs] = useState(() => {
    const init = {}
    PROVIDERS.forEach(p => { init[p.id] = { key: allKeys[p.id]?.key || '', model: allKeys[p.id]?.model || '', modelName: allKeys[p.id]?.modelName || '' } })
    return init
  })
  const [tab,         setTab]         = useState(loadS(K.ACTIVE_PROV, 'ollama_local'))
  const [models,      setModels]      = useState(DEFAULT_MODELS['ollama_local'] || [])
  const [fetching,    setFetching]    = useState(false)
  const [fetchStatus, setFetchStatus] = useState(null)
  const [showKey,     setShowKey]     = useState(false)

  const provider  = PROVIDERS.find(p => p.id === tab)
  const cur       = configs[tab] || { key: '', model: '', modelName: '' }
  const updateCur = patch => setConfigs(prev => ({ ...prev, [tab]: { ...prev[tab], ...patch } }))

  useEffect(() => { setModels(DEFAULT_MODELS[tab] || []); setFetchStatus(null); setShowKey(false) }, [tab])

  const fetchModels = async () => {
    if (!cur.key.trim()) { setFetchStatus('error'); return }
    setFetching(true); setFetchStatus(null)
    try {
      const token = localStorage.getItem('access_token')
      const res   = await fetch(`${API_BASE}/api/superadmin/ai/models`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ provider: tab, api_key: cur.key }),
      })
      const data = await res.json()
      if (data.models?.length) { setModels(data.models); setFetchStatus('ok'); if (!cur.model) updateCur({ model: data.models[0].id, modelName: data.models[0].name }) }
      else setFetchStatus('error')
    } catch { setFetchStatus('error') } finally { setFetching(false) }
  }

  const handleSave = () => {
    const newKeys = {}
    PROVIDERS.forEach(p => { if (configs[p.id]?.key?.trim()) newKeys[p.id] = configs[p.id] })
    saveJ(K.KEYS, newKeys)
    saveS(K.ACTIVE_PROV, tab)
    const active = configs[tab]
    if (active?.key && active?.model) onSave({ provider: tab, apiKey: active.key, model: active.model, modelName: active.modelName })
    onClose()
  }

  const grouped  = models.reduce((acc, m) => { const g = m.group || 'Modelos'; if (!acc[g]) acc[g] = []; acc[g].push(m); return acc }, {})
  const hasSaved = PROVIDERS.filter(p => allKeys[p.id]?.key)

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 2000, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', padding: 0 }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '20px 20px 0 0', width: '100%', maxWidth: 640, maxHeight: '92vh', overflowY: 'auto', padding: '20px 16px 32px' }}>

        <div style={{ width: 36, height: 4, borderRadius: 2, background: 'var(--border)', margin: '0 auto 18px' }} />

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--text)' }}>⚙️ Configurar AI Local (Llama/Ollama)</div>
            <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>Cole a URL do ngrok e selecione o modelo rodando localmente</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', padding: 6 }}><X size={18} /></button>
        </div>

        {/* Tabs com nota de plano */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 16, overflowX: 'auto', paddingBottom: 4 }}>
          {PROVIDERS.map(p => {
            const saved = !!allKeys[p.id]?.key
            return (
              <button key={p.id} onClick={() => setTab(p.id)} style={{
                padding: '7px 12px', borderRadius: 20, border: `2px solid ${tab === p.id ? p.color : 'var(--border)'}`,
                background: tab === p.id ? `${p.color}18` : 'var(--bg3)',
                color: tab === p.id ? p.color : 'var(--dim)', fontSize: 12, fontWeight: 600, cursor: 'pointer',
                fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 5, whiteSpace: 'nowrap', flexShrink: 0,
              }}>
                {p.logo} {p.name}
                {saved && <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--green)' }} />}
                {p.free && !saved && <span style={{ fontSize: 9, color: 'var(--green)', fontWeight: 700 }}>GRÁTIS</span>}
              </button>
            )
          })}
        </div>

        {/* Nota do provider selecionado */}
        {provider?.note && (
          <div style={{ fontSize: 11, color: 'var(--muted)', background: `${provider.color}10`, border: `1px solid ${provider.color}30`, borderRadius: 8, padding: '6px 12px', marginBottom: 12 }}>
            {provider.logo} <strong style={{ color: provider.color }}>{provider.name}</strong> — {provider.note}
          </div>
        )}

        {/* Config box */}
        <div style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 12, padding: 16, marginBottom: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            <span style={{ fontSize: 18 }}>{provider?.logo}</span>
            <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>{provider?.name}</span>
            <a href={provider?.keyUrl} target='_blank' rel='noreferrer'
              style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--blue)', textDecoration: 'none' }}>🔗 Instalar ngrok</a>
          </div>

          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>
              URL do ngrok (ex: https://xxxx.ngrok-free.app)
            </div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              <input type={showKey ? 'text' : 'password'} value={cur.key}
                onChange={e => updateCur({ key: e.target.value })}
                placeholder={provider?.keyPlaceholder}
                style={{ flex: 1, minWidth: 160, padding: '9px 12px', borderRadius: 8, background: 'var(--bg)', border: `1px solid ${cur.key ? 'rgba(34,197,94,0.5)' : 'var(--border)'}`, color: 'var(--text)', fontSize: 13, fontFamily: 'monospace', outline: 'none' }} />
              <button onClick={() => setShowKey(v => !v)} style={{ padding: '9px 10px', borderRadius: 8, background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--dim)', cursor: 'pointer', fontSize: 11 }}>
                {showKey ? 'Ocultar' : 'Ver'}
              </button>
              <button onClick={fetchModels} disabled={fetching || !cur.key.trim()} style={{
                display: 'flex', alignItems: 'center', gap: 5, padding: '9px 12px', borderRadius: 8, border: 'none',
                background: cur.key.trim() ? (provider?.color || 'var(--red)') : 'var(--bg)',
                color: cur.key.trim() ? '#fff' : 'var(--muted)', fontSize: 12, fontWeight: 700,
                cursor: cur.key.trim() ? 'pointer' : 'default', fontFamily: 'inherit', whiteSpace: 'nowrap',
              }}>
                {fetching ? <Loader size={12} style={{ animation: 'spin 1s linear infinite' }} /> : <RefreshCw size={12} />} Buscar modelos
              </button>
            </div>
            {fetchStatus === 'ok'    && <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 6, fontSize: 11, color: 'var(--green)' }}><CheckCircle size={11} /> {models.length} modelos carregados!</div>}
            {fetchStatus === 'error' && <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 6, fontSize: 11, color: 'var(--yellow)' }}><AlertCircle size={11} /> Falha — usando lista padrão.</div>}
          </div>

          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>Modelo</div>
            <select value={cur.model}
              onChange={e => { const m = models.find(x => x.id === e.target.value); updateCur({ model: e.target.value, modelName: m?.name || e.target.value }) }}
              style={{ width: '100%', padding: '9px 12px', borderRadius: 8, background: 'var(--bg)', border: `1px solid ${cur.model ? 'rgba(34,197,94,0.5)' : 'rgba(232,25,44,0.4)'}`, color: 'var(--text)', fontSize: 13, fontFamily: 'inherit', outline: 'none' }}>
              <option value=''>— selecione um modelo —</option>
              {Object.entries(grouped).map(([group, items]) => (
                <optgroup key={group} label={group}>
                  {items.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                </optgroup>
              ))}
            </select>
          </div>
        </div>

        {hasSaved.length > 0 && (
          <div style={{ marginBottom: 14, padding: 12, background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.2)', borderRadius: 10 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--green)', marginBottom: 8 }}>✓ Keys já salvas</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
              {hasSaved.map(p => (
                <span key={p.id} style={{ fontSize: 11, padding: '3px 9px', borderRadius: 12, background: `${p.color}18`, color: p.color, fontWeight: 600 }}>
                  {p.logo} {p.name}
                </span>
              ))}
            </div>
          </div>
        )}

        <button onClick={handleSave} style={{ width: '100%', padding: '13px', borderRadius: 10, border: 'none', background: 'var(--red)', color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
          ✓ Salvar e usar
        </button>
      </div>
    </div>
  )
}

// ─── ConvDrawer ───────────────────────────────────────────
function ConvDrawer({ convs, activeId, onSelect, onNew, onDelete, open, onClose }) {
  if (!open) return null
  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1500 }} />
      <div style={{ position: 'fixed', left: 0, top: 0, bottom: 0, width: 280, background: 'var(--bg2)', borderRight: '1px solid var(--border)', zIndex: 1600, display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
        <div style={{ padding: '14px 12px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>Conversas</span>
          <div style={{ display: 'flex', gap: 6 }}>
            <button onClick={onNew} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '5px 10px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg3)', color: 'var(--dim)', fontSize: 11, cursor: 'pointer', fontFamily: 'inherit' }}>
              <Plus size={11} /> Nova
            </button>
            <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', padding: 4 }}><X size={16} /></button>
          </div>
        </div>
        <div style={{ flex: 1, padding: '6px 8px', overflowY: 'auto' }}>
          {convs.length === 0 && <div style={{ fontSize: 11, color: 'var(--muted)', textAlign: 'center', padding: 20 }}>Nenhuma conversa</div>}
          {convs.map(c => {
            const p = PROVIDERS.find(x => x.id === c.provider)
            const isActive = c.id === activeId
            return (
              <div key={c.id} onClick={() => { onSelect(c.id); onClose() }}
                style={{ padding: '10px', borderRadius: 8, marginBottom: 3, cursor: 'pointer', background: isActive ? 'rgba(232,25,44,0.08)' : 'transparent', border: `1px solid ${isActive ? 'rgba(232,25,44,0.2)' : 'transparent'}` }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                  <span style={{ fontSize: 14 }}>{p?.logo || '🤖'}</span>
                  <span style={{ fontSize: 11, color: p?.color || 'var(--dim)', fontWeight: 700, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.modelName || c.model}</span>
                  <button onClick={e => { e.stopPropagation(); onDelete(c.id) }}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', padding: 2 }}>
                    <X size={11} />
                  </button>
                </div>
                <div style={{ fontSize: 12, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: 2 }}>{c.title}</div>
                <div style={{ fontSize: 10, color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Clock size={9} /> {fmtDate(c.ts)}
                  <span style={{ marginLeft: 'auto' }}>{c.messages.filter(m => m.role === 'user').length} msgs</span>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </>
  )
}

// ─── Main ─────────────────────────────────────────────────
export default function AIAgent() {
  const [config, setConfig] = useState(() => {
    const keys     = loadJ(K.KEYS, {})
    const provider = loadS(K.ACTIVE_PROV, 'ollama_local')
    const saved    = keys[provider] || {}
    return { provider, apiKey: saved.key || '', model: saved.model || '', modelName: saved.modelName || '' }
  })

  const [convs,        setConvs]        = useState(() => loadJ(K.CONVS, []))
  const [activeId,     setActiveId]     = useState(() => loadS(K.ACTIVE_CONV, null))
  const [input,        setInput]        = useState('')
  const [attachments,  setAttachments]  = useState([]) // [{name, type, data, isImage, isText, textContent, isPdf}]
  const [streaming,    setStreaming]    = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [showDrawer,   setShowDrawer]   = useState(false)

  const bottomRef = useRef()
  const scrollRef = useRef()

  // Scroll sempre que chega token novo ou mensagem nova
  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    el.scrollTop = el.scrollHeight
  })  // sem dependências = roda após todo render
  const inputRef  = useRef()
  const fileRef   = useRef()
  const abortRef  = useRef(null)

  const activeConv = convs.find(c => c.id === activeId)
  const messages   = activeConv?.messages || []
  const isReady    = !!(config.apiKey && config.model)
  const provider   = PROVIDERS.find(p => p.id === config.provider)

  

  // Limpa attachments ao trocar de conversa
  useEffect(() => { setAttachments([]) }, [activeId])

  const persistConvs = (updated) => { setConvs(updated); saveJ(K.CONVS, updated) }

  const updateLastMsg = useCallback((updater) => {
    setConvs(prev => {
      const updated = prev.map(c => {
        if (c.id !== activeId) return c
        const msgs = [...c.messages]
        msgs[msgs.length - 1] = updater(msgs[msgs.length - 1])
        return { ...c, messages: msgs, ts: Date.now() }
      })
      saveJ(K.CONVS, updated)
      return updated
    })
  }, [activeId])

  const createConv = useCallback((cfg = config) => {
    const id   = `conv_${Date.now()}`
    const conv = {
      id, provider: cfg.provider, model: cfg.model, modelName: cfg.modelName,
      title: 'Nova conversa', ts: Date.now(),
      messages: [{
        role: 'assistant', ts: Date.now(), toolCalls: [],
        content: 'Olá! Sou o **RED AI Agent** rodando localmente via Ollama.\n\n- 📁 **Frontend** (GitHub → Vercel): leio e edito qualquer arquivo .jsx/.js\n- 🐍 **Backend** (GitHub → Fly.io): leio e edito qualquer arquivo .py\n- 🗄️ **Banco** (Supabase): executo SQL\n- 🏢 **Empresas**: listo e gerencio tenants\n\nConfigure a URL do ngrok no botão **Configurar** e escolha seu modelo Llama/Qwen.',
      }],
    }
    const updated = [conv, ...convs]
    persistConvs(updated)
    setActiveId(id)
    saveS(K.ACTIVE_CONV, id)
    return id
  }, [convs, config])

  useEffect(() => {
    const valid = convs.find(c => c.id === activeId)
    if (!valid) {
      if (convs.length > 0) { setActiveId(convs[0].id); saveS(K.ACTIVE_CONV, convs[0].id) }
      else createConv()
    }
  }, [])

  const selectConv = (id) => { setActiveId(id); saveS(K.ACTIVE_CONV, id) }

  const deleteConv = (id) => {
    const updated = convs.filter(c => c.id !== id)
    persistConvs(updated)
    if (activeId === id) {
      const next = updated[0]?.id || null
      setActiveId(next); saveS(K.ACTIVE_CONV, next || '')
      if (!next) setTimeout(() => createConv(), 50)
    }
  }

  const handleSaveConfig = (cfg) => {
    setConfig(cfg)
    createConv(cfg)
  }

  // ─── File attachment handler ───────────────────────────
  const SUPPORTED_CODE_EXTS = ['js', 'jsx', 'ts', 'tsx', 'py', 'css', 'html', 'json', 'md', 'txt', 'yaml', 'yml', 'sh', 'sql', 'env', 'toml', 'xml', 'csv', 'php', 'rb', 'go', 'rs', 'java', 'c', 'cpp', 'h']
  const MAX_FILE_MB = 10

  const handleAttach = (e) => {
    const files = Array.from(e.target.files || [])
    if (!files.length) return
    files.forEach(file => {
      if (file.size > MAX_FILE_MB * 1024 * 1024) { alert(`Arquivo muito grande: ${file.name} (máx ${MAX_FILE_MB}MB)`); return }
      const ext    = file.name.split('.').pop().toLowerCase()
      const isImage = file.type.startsWith('image/')
      const isText  = SUPPORTED_CODE_EXTS.includes(ext) || file.type.startsWith('text/')
      const reader  = new FileReader()
      if (isImage) {
        reader.onload = ev => setAttachments(prev => [...prev, { name: file.name, type: file.type, data: ev.target.result, isImage: true, isText: false }])
        reader.readAsDataURL(file)
      } else if (isText) {
        reader.onload = ev => setAttachments(prev => [...prev, { name: file.name, type: file.type, data: null, isImage: false, isText: true, textContent: ev.target.result }])
        reader.readAsText(file)
      } else {
        // PDF e outros binários — base64
        reader.onload = ev => setAttachments(prev => [...prev, { name: file.name, type: file.type, data: ev.target.result, isImage: false, isText: false, isPdf: file.type === 'application/pdf' }])
        reader.readAsDataURL(file)
      }
    })
    e.target.value = ''
  }

  const removeAttachment = (i) => setAttachments(prev => prev.filter((_, idx) => idx !== i))

  // ─── Send ──────────────────────────────────────────────
  const send = async (text) => {
    const msg = text || input.trim()
    if (!msg || streaming) return
    if (!isReady) { setShowSettings(true); return }

    const convId = activeId
    if (activeConv?.messages.filter(m => m.role === 'user').length === 0) {
      setConvs(prev => {
        const u = prev.map(c => c.id === convId ? { ...c, title: msg.slice(0, 50) } : c)
        saveJ(K.CONVS, u); return u
      })
    }

    setInput('')
    const currentAttachments = [...attachments]
    setAttachments([])
    const history = messages.map(m => ({ role: m.role, content: m.content }))

    setConvs(prev => {
      const u = prev.map(c => c.id !== convId ? c : {
        ...c, ts: Date.now(), messages: [
          ...c.messages,
          { role: 'user',      content: msg, ts: Date.now(), toolCalls: [], attachments: currentAttachments },
          { role: 'assistant', content: '',  ts: Date.now(), toolCalls: [], status: 'Conectando...' },
        ]
      })
      saveJ(K.CONVS, u); return u
    })

    setStreaming(true)
    const controller = new AbortController()
    abortRef.current = controller

    try {
      const token = localStorage.getItem('access_token')
      const res   = await fetch(`${API_BASE}/api/superadmin/ai/stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          message:     msg,
          history:     history.slice(-10),
          provider:    config.provider,
          model:       config.model,
          api_key:     config.apiKey,
          attachments: currentAttachments.map(a => ({
            name:        a.name,
            type:        a.type,
            data:        a.data,
            isImage:     a.isImage,
            isText:      a.isText,
            textContent: a.textContent || null,
            isPdf:       a.isPdf || false,
          })),
        }),
        signal: controller.signal,
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Erro desconhecido' }))
        updateLastMsg(m => ({ ...m, content: `❌ ${err.error || 'Erro ao conectar'}`, status: null }))
        return
      }

      const reader  = res.body.getReader()
      const decoder = new TextDecoder()
      let   buf     = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buf += decoder.decode(value, { stream: true })
        const lines = buf.split('\n'); buf = lines.pop()
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const raw = line.slice(6).trim(); if (!raw) continue
          let evt; try { evt = JSON.parse(raw) } catch { continue }
          if      (evt.type === 'status')     updateLastMsg(m => ({ ...m, status: evt.text }))
          else if (evt.type === 'tool_start') updateLastMsg(m => ({ ...m, status: null, toolCalls: [...(m.toolCalls || []), { tool: evt.tool, result: null, running: true }] }))
          else if (evt.type === 'tool_done')  updateLastMsg(m => ({ ...m, toolCalls: (m.toolCalls || []).map(tc => tc.tool === evt.tool && tc.running ? { ...tc, result: evt.result, running: false } : tc) }))
          else if (evt.type === 'token')      updateLastMsg(m => ({ ...m, content: (m.content || '') + evt.text, status: null }))
          else if (evt.type === 'error')      updateLastMsg(m => ({ ...m, content: `❌ ${evt.text}`, status: null }))
          else if (evt.type === 'done') {
            updateLastMsg(m => ({ ...m, status: null }))
            const pendingOps = evt.pending_ops || evt.pending_hf_ops || []
            if (pendingOps.length > 0) {
              updateLastMsg(m => ({ ...m, status: `⏳ Commitando ${pendingOps.length} arquivo(s) no GitHub...` }))
              const fixedUpdater = (updFn) => setConvs(prev => {
                const u = prev.map(c => {
                  if (c.id !== convId) return c
                  const msgs = [...c.messages]
                  msgs[msgs.length - 1] = updFn(msgs[msgs.length - 1])
                  return { ...c, messages: msgs, ts: Date.now() }
                })
                saveJ(K.CONVS, u); return u
              })
              _execHfOps(pendingOps, convId, fixedUpdater)
            }
          }
        }
      }
    } catch (err) {
      if (err.name !== 'AbortError')
        updateLastMsg(m => ({ ...m, content: `❌ Erro: ${err.message}`, status: null }))
    } finally {
      setStreaming(false); abortRef.current = null
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }

  // ─── Render ────────────────────────────────────────────
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 160px)', minHeight: 400 }}>
      {showSettings && <SettingsPanel onClose={() => setShowSettings(false)} onSave={handleSaveConfig} />}
      <ConvDrawer convs={convs} activeId={activeId} onSelect={selectConv} onNew={() => { createConv(); setShowDrawer(false) }} onDelete={deleteConv} open={showDrawer} onClose={() => setShowDrawer(false)} />

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '12px 12px 0 0', flexShrink: 0 }}>
        <button onClick={() => setShowDrawer(true)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', padding: 4, display: 'flex' }}>
          <Menu size={17} />
        </button>

        <div style={{ width: 7, height: 7, borderRadius: '50%', background: isReady ? 'var(--green)' : 'var(--red)', boxShadow: isReady ? '0 0 6px rgba(34,197,94,0.6)' : '0 0 6px rgba(232,25,44,0.6)', flexShrink: 0 }} />

        <div style={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
          {isReady
            ? <span style={{ fontSize: 12, color: 'var(--dim)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>
                <span style={{ color: provider?.color, fontWeight: 700 }}>{provider?.logo} {provider?.name}</span>
                {' · '}<span style={{ color: 'var(--text)' }}>{config.modelName || config.model}</span>
              </span>
            : <span style={{ fontSize: 12, color: 'var(--red)', fontWeight: 600 }}>Plataforma não configurada</span>
          }
          {activeConv?.title && activeConv.title !== 'Nova conversa' && (
            <div style={{ fontSize: 10, color: 'var(--muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{activeConv.title}</div>
          )}
        </div>

        {streaming && <Zap size={12} color='var(--red)' style={{ flexShrink: 0 }} />}

        <button onClick={() => createConv()} title="Nova conversa"
          style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 6, padding: '5px 8px', color: 'var(--dim)', cursor: 'pointer', display: 'flex', alignItems: 'center', flexShrink: 0 }}>
          <Plus size={13} />
        </button>

        <button onClick={() => setShowSettings(true)}
          style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '5px 10px', background: isReady ? 'var(--bg3)' : 'var(--red)', border: `1px solid ${isReady ? 'var(--border)' : 'transparent'}`, borderRadius: 6, color: isReady ? 'var(--dim)' : '#fff', fontSize: 11, cursor: 'pointer', fontFamily: 'inherit', fontWeight: isReady ? 400 : 700, flexShrink: 0, whiteSpace: 'nowrap' }}>
          <Settings size={12} /> {isReady ? 'Config' : 'Configurar'}
        </button>
      </div>

      {/* Messages */}
      <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', padding: '0 12px', background: 'var(--bg2)', scrollbarWidth: 'thin' }}>
        {messages.map((msg, i) => (
          <Message key={i} msg={msg}
            streaming={streaming && i === messages.length - 1}
            onRetryHfOps={ops => {
              // Limpa pendingHfOps do msg e executa novamente
              setConvs(prev => {
                const u = prev.map(c => c.id !== activeId ? c : {
                  ...c,
                  messages: c.messages.map((m, mi) => mi === i ? { ...m, pendingHfOps: null } : m)
                })
                saveJ(K.CONVS, u); return u
              })
              const updater = (updFn) => setConvs(prev => {
                const u = prev.map(c => {
                  if (c.id !== activeId) return c
                  const msgs = [...c.messages]
                  msgs[i] = updFn(msgs[i])
                  return { ...c, messages: msgs, ts: Date.now() }
                })
                saveJ(K.CONVS, u); return u
              })
              _execHfOps(ops, activeId, updater)
            }}
          />
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Sugestões */}
      {messages.filter(m => m.role === 'user').length === 0 && (
        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', padding: '8px 12px', background: 'var(--bg2)', borderTop: '1px solid var(--border)' }}>
          {SUGGESTED.map(s => (
            <button key={s} onClick={() => send(s)}
              style={{ padding: '5px 11px', borderRadius: 16, border: '1px solid var(--border)', background: 'var(--bg3)', color: 'var(--dim)', fontSize: 11, cursor: 'pointer', fontFamily: 'inherit' }}>
              {s}
            </button>
          ))}
        </div>
      )}

      {/* Attachment preview */}
      {attachments.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, padding: '8px 12px 0', background: 'var(--bg2)', borderTop: '1px solid var(--border)' }}>
          {attachments.map((a, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 6, padding: '4px 8px', maxWidth: 200 }}>
              {a.isImage
                ? <img src={a.data} alt={a.name} style={{ width: 28, height: 28, objectFit: 'cover', borderRadius: 4, flexShrink: 0 }} />
                : <FileText size={16} color={a.isPdf ? '#EF4444' : '#3B82F6'} style={{ flexShrink: 0 }} />
              }
              <span style={{ fontSize: 11, color: 'var(--dim)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.name}</span>
              <button onClick={() => removeAttachment(i)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', padding: 0, display: 'flex', flexShrink: 0 }}>
                <XCircle size={13} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Input */}
      <div style={{ display: 'flex', gap: 8, padding: '10px 12px', background: 'var(--bg2)', borderTop: attachments.length ? 'none' : '1px solid var(--border)', borderRadius: '0 0 12px 12px', flexShrink: 0 }}>
        {/* Hidden file input */}
        <input ref={fileRef} type='file' multiple
          accept='image/*,.pdf,.js,.jsx,.ts,.tsx,.py,.css,.html,.json,.md,.txt,.yaml,.yml,.sh,.sql,.env,.toml,.xml,.csv,.php,.rb,.go,.rs,.java,.c,.cpp,.h'
          onChange={handleAttach} style={{ display: 'none' }} />

        {/* Paperclip button */}
        <button onClick={() => fileRef.current?.click()} title='Anexar arquivo (imagem, código, PDF...)'
          style={{ width: 34, height: 34, borderRadius: 8, border: '1px solid var(--border)', background: attachments.length ? 'rgba(59,130,246,0.15)' : 'var(--bg3)', color: attachments.length ? '#3B82F6' : 'var(--muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', alignSelf: 'flex-end', flexShrink: 0, transition: 'all 0.15s' }}>
          <Paperclip size={14} />
        </button>

        <textarea ref={inputRef} value={input} onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
          placeholder={isReady ? 'Descreva o que quer fazer... (Enter envia, Shift+Enter nova linha)' : 'Configure uma plataforma primeiro...'}
          rows={2}
          style={{ flex: 1, background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 10px', outline: 'none', color: 'var(--text)', fontSize: 13, fontFamily: 'inherit', resize: 'none', lineHeight: 1.5 }} />

        {streaming
          ? <button onClick={() => { abortRef.current?.abort(); setStreaming(false) }}
              style={{ width: 38, height: 38, borderRadius: 8, border: '1px solid rgba(232,25,44,0.4)', background: 'rgba(232,25,44,0.1)', color: 'var(--red)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', alignSelf: 'flex-end', flexShrink: 0 }}>
              <X size={15} />
            </button>
          : <button onClick={() => send()} disabled={!input.trim() && !attachments.length}
              style={{ width: 38, height: 38, borderRadius: 8, border: 'none', background: (input.trim() || attachments.length) ? 'var(--red)' : 'var(--bg4)', color: (input.trim() || attachments.length) ? '#fff' : 'var(--muted)', cursor: (input.trim() || attachments.length) ? 'pointer' : 'default', display: 'flex', alignItems: 'center', justifyContent: 'center', alignSelf: 'flex-end', transition: 'all 0.15s', flexShrink: 0 }}>
              <Send size={15} />
            </button>
        }
      </div>

      <style>{`
        @keyframes spin  { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0} }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.3} }
      `}</style>
    </div>
  )
}
