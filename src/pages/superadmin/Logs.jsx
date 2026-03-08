/**
 * Logs.jsx — Visualizador de logs do sistema para superadmin.
 * Real-time logs de backend, frontend e banco de dados.
 */
import { useState, useEffect, useCallback, useRef } from 'react'
import { RefreshCw, Download, Search, X, Trash2, Pause, Play, AlertCircle, Info } from 'lucide-react'
import api from '../../services/api'

const LEVELS = ['todos', 'error', 'warning', 'info', 'debug']
const SERVICES = ['todos', 'backend', 'frontend', 'database', 'auth', 'orders', 'products', 'sales', 'finance', 'workshop']
const LEVEL_COLOR = { error: 'var(--red)', warning: 'var(--yellow)', info: 'var(--green)', debug: 'var(--muted)' }
const LEVEL_BG = { error: 'rgba(232,25,44,0.12)', warning: 'rgba(245,158,11,0.12)', info: 'rgba(34,197,94,0.12)', debug: 'rgba(255,255,255,0.05)' }
const LEVEL_ICON = { error: <AlertCircle size={12} />, warning: <AlertCircle size={12} />, info: <Info size={12} />, debug: <X size={8} /> }

export default function Logs() {
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [level, setLevel] = useState('todos')
  const [service, setService] = useState('todos')
  const [search, setSearch] = useState('')
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [lastUpdate, setLastUpdate] = useState(null)
  const [isPaused, setIsPaused] = useState(false)
  const [expandedLog, setExpandedLog] = useState(null)
  const [refreshRate, setRefreshRate] = useState(2000)
  const [maxLogs, setMaxLogs] = useState(500)
  const updateIntervalRef = useRef(null)

  const load = useCallback(async () => {
    if (isPaused) return
    setError(null)
    try {
      const params = new URLSearchParams()
      if (level !== 'todos') params.set('level', level)
      if (service !== 'todos') params.set('service', service)
      if (search) params.set('search', search)
      params.set('limit', maxLogs.toString())
      const res = await api.get(`/api/superadmin/logs?${params}`)
      const data = res.data?.data
      setLogs(Array.isArray(data) ? data : [])
      setLastUpdate(new Date())
    } catch (e) {
      if (e?.response?.status !== 401) {
        setError(e?.response?.data?.error || 'Erro ao carregar logs')
      }
    } finally {
      setLoading(false)
    }
  }, [level, service, search, maxLogs, isPaused])

  useEffect(() => {
    setLoading(true)
    load()
  }, [load])

  useEffect(() => {
    if (!autoRefresh || isPaused) {
      if (updateIntervalRef.current) clearInterval(updateIntervalRef.current)
      return
    }
    updateIntervalRef.current = setInterval(load, refreshRate)
    return () => {
      if (updateIntervalRef.current) clearInterval(updateIntervalRef.current)
    }
  }, [autoRefresh, refreshRate, isPaused, load])

  useEffect(() => {
    const container = document.querySelector('[style*="overflowY"]')
    if (container && autoRefresh && !isPaused) {
      container.scrollTop = 0
    }
  }, [logs, autoRefresh, isPaused])

  const exportLogs = () => {
    const text = logs.map(l => {
      const time = l.timestamp ? new Date(l.timestamp).toLocaleString('pt-BR') : '???'
      const lvl = (l.level || 'info').toUpperCase()
      const svc = l.service || 'backend'
      const msg = l.message || ''
      const det = l.details ? JSON.stringify(l.details) : ''
      return `[${time}] [${lvl}] [${svc}] ${msg}${det ? ` Details: ${det}` : ''}`
    }).join('\n')
    const blob = new Blob([text], { type: 'text/plain; charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `logs-${new Date().toISOString().slice(0, 10)}`
    a.click()
    URL.revokeObjectURL(url)
  }

  const clearOldLogs = async () => {
    if (!confirm('Limpar logs com mais de 7 dias?')) return
    try {
      await api.delete('/api/superadmin/logs?days=7')
      alert('Logs removidos')
      load()
    } catch (e) {
      alert('Erro: ' + (e?.response?.data?.error || e.message))
    }
  }

  const stats = {
    total: logs.length,
    errors: logs.filter(l => l.level === 'error').length,
    warnings: logs.filter(l => l.level === 'warning').length,
    info: logs.filter(l => l.level === 'info').length,
    debug: logs.filter(l => l.level === 'debug').length,
  }

  return (
    <div>
      <div className="page-header" style={{ flexWrap: 'wrap', gap: 10, alignItems: 'flex-start' }}>
        <div style={{ flex: 1, minWidth: 250 }}>
          <h1 className="page-title">📊 Logs do Sistema</h1>
          <p className="page-subtitle">Backend, Frontend, Database em tempo real {lastUpdate && `• ${lastUpdate.toLocaleTimeString('pt-BR')}`}</p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <button className={`btn btn-sm ${autoRefresh ? 'btn-primary' : 'btn-outline'}`} onClick={() => setAutoRefresh(v => !v)} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {autoRefresh ? <Play size={13} /> : <Pause size={13} />}
            {autoRefresh ? 'LIVE' : 'PARADO'}
          </button>
          {autoRefresh && <button className={`btn btn-sm ${isPaused ? 'btn-warning' : 'btn-outline'}`} onClick={() => setIsPaused(v => !v)}>{isPaused ? <Play size={13} /> : <Pause size={13} />}</button>}
          <button className="btn btn-outline btn-sm" onClick={load} disabled={loading} style={{ display: 'flex', alignItems: 'center', gap: 6 }}><RefreshCw size={13} style={loading ? { animation: 'spin 0.8s linear infinite' } : {}} /> Carregar</button>
          <button className="btn btn-outline btn-sm" onClick={exportLogs} disabled={!logs.length} style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Download size={13} /> Exportar</button>
          <button className="btn btn-outline btn-sm" onClick={clearOldLogs} style={{ display: 'flex', alignItems: 'center', gap: 6, opacity: 0.7 }}><Trash2 size={13} /> Limpar</button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10, marginBottom: 16 }}>
        <div style={{ padding: 12, background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 8, textAlign: 'center' }}><span style={{ fontSize: 11, color: 'var(--muted)' }}>TOTAL</span><span style={{ fontSize: 20, fontWeight: 700, color: 'var(--text)', display: 'block' }}>{stats.total}</span></div>
        <div style={{ padding: 12, background: 'rgba(232,25,44,0.05)', border: '1px solid rgba(232,25,44,0.3)', borderRadius: 8, textAlign: 'center' }}><span style={{ fontSize: 11, color: 'var(--muted)' }}>ERROS</span><span style={{ fontSize: 20, fontWeight: 700, color: 'var(--red)', display: 'block' }}>{stats.errors}</span></div>
        <div style={{ padding: 12, background: 'rgba(245,158,11,0.05)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: 8, textAlign: 'center' }}><span style={{ fontSize: 11, color: 'var(--muted)' }}>AVISOS</span><span style={{ fontSize: 20, fontWeight: 700, color: 'var(--yellow)', display: 'block' }}>{stats.warnings}</span></div>
        <div style={{ padding: 12, background: 'rgba(34,197,94,0.05)', border: '1px solid rgba(34,197,94,0.3)', borderRadius: 8, textAlign: 'center' }}><span style={{ fontSize: 11, color: 'var(--muted)' }}>INFO</span><span style={{ fontSize: 20, fontWeight: 700, color: 'var(--green)', display: 'block' }}>{stats.info}</span></div>
      </div>

      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
          <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)', pointerEvents: 'none' }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar..." style={{ width: '100%', padding: '7px 10px 7px 30px', background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text)', fontSize: 13, outline: 'none', boxSizing: 'border-box' }} />
          {search && <button onClick={() => setSearch('')} style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', padding: 0 }}><X size={13} /></button>}
        </div>
        <select value={level} onChange={e => setLevel(e.target.value)} style={{ padding: '7px 10px', background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text)', fontSize: 13 }}>{LEVELS.map(l => <option key={l} value={l}>{l === 'todos' ? 'Todos' : l.toUpperCase()}</option>)}</select>
        <select value={service} onChange={e => setService(e.target.value)} style={{ padding: '7px 10px', background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text)', fontSize: 13 }}>{SERVICES.map(s => <option key={s} value={s}>{s === 'todos' ? 'Todos' : s}</option>)}</select>
        {autoRefresh && <select value={refreshRate} onChange={e => setRefreshRate(Number(e.target.value))} style={{ padding: '7px 10px', background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text)', fontSize: 13 }}><option value={1000}>1s</option><option value={2000}>2s</option><option value={5000}>5s</option><option value={10000}>10s</option></select>}
        <select value={maxLogs} onChange={e => setMaxLogs(Number(e.target.value))} style={{ padding: '7px 10px', background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text)', fontSize: 13 }}><option value={100}>100</option><option value={200}>200</option><option value={500}>500</option></select>
      </div>

      {error ? <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: 40, gap: 10, background: 'var(--bg2)', borderRadius: 10, border: '1px solid var(--red)30' }}><AlertCircle size={32} color="var(--red)" /><span style={{ color: 'var(--red)', fontSize: 14 }}>{error}</span><button className="btn btn-outline btn-sm" onClick={load}>Tentar novamente</button></div> : loading && logs.length === 0 ? <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><div style={{ width: 28, height: 28, border: '3px solid var(--border)', borderTopColor: 'var(--red)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} /></div> : logs.length === 0 ? <div style={{ textAlign: 'center', padding: 60, color: 'var(--muted)', fontSize: 14 }}>Nenhum log encontrado</div> : <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}><div style={{ overflowY: 'auto', maxHeight: 700, fontFamily: 'monospace' }}>{logs.map((log, i) => { const lvl = log.level || 'info'; const color = LEVEL_COLOR[lvl]; const bg = i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.015)'; const isExp = expandedLog === log.id; return <div key={log.id || i}><div onClick={() => setExpandedLog(isExp ? null : log.id)} style={{ display: 'flex', gap: 10, padding: '8px 14px', background: bg, borderBottom: '1px solid rgba(255,255,255,0.03)', cursor: log.details ? 'pointer' : 'default', transition: 'background 0.2s' }} onMouseEnter={e => log.details && (e.currentTarget.style.background = 'rgba(255,255,255,0.05)')} onMouseLeave={e => (e.currentTarget.style.background = bg)}><span style={{ fontSize: 10, color, minWidth: 20, marginTop: 3 }}>{LEVEL_ICON[lvl]}</span><span style={{ fontSize: 10, color: 'var(--muted)', whiteSpace: 'nowrap', minWidth: 90, marginTop: 2 }}>{log.timestamp ? new Date(log.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '—'}</span><span style={{ fontSize: 9, fontWeight: 700, color, minWidth: 45, marginTop: 2, textTransform: 'uppercase' }}>{lvl}</span>{log.service && <span style={{ fontSize: 10, color: 'var(--blue)', fontWeight: 600, marginTop: 2 }}>[{log.service}]</span>}<span style={{ fontSize: 12, color: 'var(--text)', flex: 1, wordBreak: 'break-word', lineHeight: 1.5, marginTop: 2 }}>{log.message}{log.details && <span style={{ color: 'var(--muted)', fontSize: 10, marginLeft: 8 }}>•</span>}</span></div>{isExp && log.details && <div style={{ padding: '10px 14px', background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid rgba(255,255,255,0.03)', borderLeft: `3px solid ${color}`, fontSize: 11, color: 'var(--muted)', fontFamily: 'monospace' }}><pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{JSON.stringify(log.details, null, 2)}</pre></div>}</div>; })}</div></div>}
      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}button:hover{opacity:0.8}`}</style>
    </div>
  )
}
