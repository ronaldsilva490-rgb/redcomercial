/**
 * Logs.jsx — Visualizador de logs do sistema para superadmin.
 * Consome GET /api/superadmin/logs com filtros por nível e serviço.
 */
import { useState, useEffect, useCallback, useRef } from 'react'
import { RefreshCw, Download, Search, X, Circle } from 'lucide-react'
import api from '../../services/api'

const LEVELS = ['todos', 'error', 'warning', 'info', 'debug']
const SERVICES = ['todos', 'backend', 'auth', 'superadmin', 'database']
const LEVEL_COLOR = { error: 'var(--red)', warning: 'var(--yellow)', info: 'var(--green)', debug: 'var(--muted)' }
const LEVEL_BG    = { error: 'rgba(232,25,44,0.12)', warning: 'rgba(245,158,11,0.12)', info: 'rgba(34,197,94,0.12)', debug: 'rgba(255,255,255,0.05)' }

export default function Logs() {
  const [logs,       setLogs]       = useState([])
  const [loading,    setLoading]    = useState(true)
  const [error,      setError]      = useState(null)
  const [level,      setLevel]      = useState('todos')
  const [service,    setService]    = useState('todos')
  const [search,     setSearch]     = useState('')
  const [autoRefresh,setAutoRefresh]= useState(false)
  const [lastUpdate, setLastUpdate] = useState(null)
  const bottomRef = useRef(null)

  const load = useCallback(async () => {
    setError(null)
    try {
      const params = new URLSearchParams()
      if (level   !== 'todos')   params.set('level',   level)
      if (service !== 'todos')   params.set('service', service)
      if (search)                params.set('search',  search)
      params.set('limit', '200')

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
  }, [level, service, search])

  useEffect(() => { setLoading(true); load() }, [load])

  useEffect(() => {
    if (!autoRefresh) return
    const t = setInterval(load, 5000)
    return () => clearInterval(t)
  }, [autoRefresh, load])

  const exportLogs = () => {
    const text = logs.map(l => `[${l.timestamp}] [${l.level?.toUpperCase()}] [${l.service}] ${l.message}`).join('\n')
    const blob = new Blob([text], { type: 'text/plain' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href = url; a.download = `logs-${new Date().toISOString().slice(0,10)}.txt`
    a.click(); URL.revokeObjectURL(url)
  }

  return (
    <div>
      {/* Header */}
      <div className="page-header" style={{ flexWrap: 'wrap', gap: 10 }}>
        <div>
          <h1 className="page-title">🗒️ Logs do Sistema</h1>
          <p className="page-subtitle">
            {lastUpdate ? `Atualizado às ${lastUpdate.toLocaleTimeString('pt-BR')}` : 'Carregando...'}
            {' · '}{logs.length} entradas
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <button
            className={`btn btn-sm ${autoRefresh ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => setAutoRefresh(v => !v)}
            title="Auto-refresh a cada 5s"
          >
            <Circle size={8} style={{ fill: autoRefresh ? 'white' : 'none' }} />
            Live
          </button>
          <button className="btn btn-outline btn-sm" onClick={load} disabled={loading}>
            <RefreshCw size={13} style={loading ? { animation: 'spin 0.8s linear infinite' } : {}} />
            Atualizar
          </button>
          <button className="btn btn-outline btn-sm" onClick={exportLogs} disabled={!logs.length}>
            <Download size={13} /> Exportar
          </button>
        </div>
      </div>

      {/* Filtros */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        {/* Busca */}
        <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
          <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)', pointerEvents: 'none' }} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar nos logs..."
            style={{
              width: '100%', padding: '7px 10px 7px 30px', background: 'var(--bg3)',
              border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text)',
              fontSize: 13, outline: 'none', boxSizing: 'border-box',
            }}
          />
          {search && (
            <button onClick={() => setSearch('')} style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', padding: 0 }}>
              <X size={13} />
            </button>
          )}
        </div>

        {/* Nível */}
        <select value={level} onChange={e => setLevel(e.target.value)}
          style={{ padding: '7px 10px', background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text)', fontSize: 13, outline: 'none' }}>
          {LEVELS.map(l => <option key={l} value={l}>{l === 'todos' ? 'Todos os níveis' : l.toUpperCase()}</option>)}
        </select>

        {/* Serviço */}
        <select value={service} onChange={e => setService(e.target.value)}
          style={{ padding: '7px 10px', background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text)', fontSize: 13, outline: 'none' }}>
          {SERVICES.map(s => <option key={s} value={s}>{s === 'todos' ? 'Todos os serviços' : s}</option>)}
        </select>
      </div>

      {/* Log counters */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        {Object.entries(LEVEL_COLOR).map(([lvl, color]) => {
          const count = logs.filter(l => l.level === lvl).length
          return (
            <div key={lvl} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: 6, background: LEVEL_BG[lvl], border: `1px solid ${color}30` }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: color, display: 'inline-block' }} />
              <span style={{ fontSize: 11, color, fontWeight: 700 }}>{lvl.toUpperCase()}</span>
              <span style={{ fontSize: 11, color: 'var(--muted)' }}>{count}</span>
            </div>
          )
        })}
      </div>

      {/* Log list */}
      {error ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: 40, gap: 10 }}>
          <span style={{ color: 'var(--red)', fontSize: 14 }}>{error}</span>
          <button className="btn btn-outline btn-sm" onClick={load}>Tentar novamente</button>
        </div>
      ) : loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
          <div style={{ width: 28, height: 28, border: '3px solid var(--border)', borderTopColor: 'var(--red)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        </div>
      ) : logs.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60, color: 'var(--muted)', fontSize: 14 }}>
          Nenhum log encontrado com os filtros atuais.
        </div>
      ) : (
        <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
          <div style={{ overflowY: 'auto', maxHeight: 600, fontFamily: 'monospace' }}>
            {logs.map((log, i) => {
              const lvl    = log.level || 'info'
              const color  = LEVEL_COLOR[lvl] || 'var(--dim)'
              const bg     = i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.015)'
              return (
                <div key={log.id || i} style={{ display: 'flex', gap: 10, padding: '6px 14px', background: bg, borderBottom: '1px solid rgba(255,255,255,0.03)', alignItems: 'flex-start' }}>
                  <span style={{ fontSize: 10, color: 'var(--muted)', whiteSpace: 'nowrap', marginTop: 2, minWidth: 75 }}>
                    {log.timestamp ? new Date(log.timestamp).toLocaleTimeString('pt-BR') : '—'}
                  </span>
                  <span style={{ fontSize: 10, fontWeight: 700, color, minWidth: 50, marginTop: 2, textTransform: 'uppercase' }}>{lvl}</span>
                  {log.service && (
                    <span style={{ fontSize: 10, color: 'var(--blue)', minWidth: 80, marginTop: 2 }}>[{log.service}]</span>
                  )}
                  <span style={{ fontSize: 12, color: 'var(--text)', flex: 1, wordBreak: 'break-word', lineHeight: 1.5 }}>
                    {log.message}
                    {log.details && (
                      <span style={{ color: 'var(--muted)', fontSize: 11, marginLeft: 8 }}>{JSON.stringify(log.details)}</span>
                    )}
                  </span>
                </div>
              )
            })}
            <div ref={bottomRef} />
          </div>
        </div>
      )}

      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}
