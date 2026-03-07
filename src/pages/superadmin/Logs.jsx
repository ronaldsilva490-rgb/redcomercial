/**
 * Logs.jsx — Visualizador de logs do sistema para superadmin.
 * Real-time logs de backend, frontend e banco de dados.
 * 
 * Exibe: requisições HTTP, erros, operações DB, eventos de negócio
 * Com: busca, filtros, exportação, live updates, análise
 */
import { useState, useEffect, useCallback, useRef } from 'react'
import { RefreshCw, Download, Search, X, Circle, Trash2, Pause, Play, AlertCircle, CheckCircle, Info } from 'lucide-react'
import api from '../../services/api'

const LEVELS = ['todos', 'error', 'warning', 'info', 'debug']
const SERVICES = ['todos', 'backend', 'frontend', 'database', 'auth', 'orders', 'products', 'sales', 'finance', 'workshop']
const LEVEL_COLOR = { 
  error: 'var(--red)', 
  warning: 'var(--yellow)', 
  info: 'var(--green)', 
  debug: 'var(--muted)' 
}
const LEVEL_BG = { 
  error: 'rgba(232,25,44,0.12)', 
  warning: 'rgba(245,158,11,0.12)', 
  info: 'rgba(34,197,94,0.12)', 
  debug: 'rgba(255,255,255,0.05)' 
}
const LEVEL_ICON = {
  error: <AlertCircle size={12} />,
  warning: <AlertCircle size={12} />,
  info: <Info size={12} />,
  debug: <Circle size={8} />,
}

export default function Logs() {
  const [logs,        setLogs]         = useState([])
  const [loading,     setLoading]      = useState(true)
  const [error,       setError]        = useState(null)
  const [level,       setLevel]        = useState('todos')
  const [service,     setService]      = useState('todos')
  const [search,      setSearch]       = useState('')
  const [autoRefresh, setAutoRefresh]  = useState(true)
  const [lastUpdate,  setLastUpdate]   = useState(null)
  const [isPaused,    setIsPaused]     = useState(false)
  const [expandedLog, setExpandedLog]  = useState(null)
  const [refreshRate, setRefreshRate]  = useState(2000)  // 2s por padrão
  const [maxLogs,     setMaxLogs]      = useState(500)
  const bottomRef = useRef(null)
  const updateIntervalRef = useRef(null)

  const load = useCallback(async () => {
    if (isPaused) return
    
    setError(null)
    try {
      const params = new URLSearchParams()
      if (level   !== 'todos')   params.set('level',   level)
      if (service !== 'todos')   params.set('service', service)
      if (search)                params.set('search',  search)
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

  // Auto-refresh inteligente
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

  // Auto-scroll quando novos logs chegam
  useEffect(() => {
    if (bottomRef.current && autoRefresh && !isPaused) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [logs, autoRefresh, isPaused])

  const exportLogs = () => {
    const text = logs.map(l => {
      const time = l.timestamp ? new Date(l.timestamp).toLocaleString('pt-BR') : '???'
      const level = (l.level || 'info').toUpperCase()
      const service = l.service || 'backend'
      const msg = l.message || ''
      const details = l.details ? JSON.stringify(l.details) : ''
      return `[${time}] [${level}] [${service}] ${msg} ${details ? `\n  Details: ${details}` : ''}`
    }).join('\n')
    
    const blob = new Blob([text], { type: 'text/plain; charset=utf-8' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href = url
    a.download = `logs-${new Date().toISOString().slice(0,10)}-${new Date().getHours()}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  const clearOldLogs = async () => {
    if (!confirm('Limpar logs com mais de 7 dias? Isso não pode ser desfeito.')) return
    try {
      await api.delete('/api/superadmin/logs?days=7')
      alert('✓ Logs antigos removidos')
      load()
    } catch (e) {
      alert('✗ Erro ao limpar: ' + (e?.response?.data?.error || e.message))
    }
  }

  // Estatísticas
  const stats = {
    total: logs.length,
    errors: logs.filter(l => l.level === 'error').length,
    warnings: logs.filter(l => l.level === 'warning').length,
    info: logs.filter(l => l.level === 'info').length,
    debug: logs.filter(l => l.level === 'debug').length,
  }

  return (
    <div>
      {/* ─── Header ─── */}
      <div className="page-header" style={{ flexWrap: 'wrap', gap: 10, alignItems: 'flex-start' }}>
        <div style={{ flex: 1, minWidth: 250 }}>
          <h1 className="page-title">📊 Logs do Sistema</h1>
          <p className="page-subtitle">
            Backend, Frontend, Database em tempo real
            {lastUpdate && ` • Atualizado às ${lastUpdate.toLocaleTimeString('pt-BR')}`}
          </p>
        </div>

        {/* Controles */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          {/* Live / Paused */}
          <button
            className={`btn btn-sm ${autoRefresh ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => setAutoRefresh(v => !v)}
            title={autoRefresh ? 'Desativar auto-refresh' : 'Ativar auto-refresh em tempo real'}
            style={{ display: 'flex', alignItems: 'center', gap: 6 }}
          >
            {autoRefresh ? <Play size={13} /> : <Pause size={13} />}
            {autoRefresh ? 'LIVE' : 'PARADO'}
          </button>

          {/* Pausar/Retomar se estiver em LIVE */}
          {autoRefresh && (
            <button
              className={`btn btn-sm ${isPaused ? 'btn-warning' : 'btn-outline'}`}
              onClick={() => setIsPaused(v => !v)}
              title={isPaused ? 'Retomar coleta' : 'Pausar coleta'}
            >
              {isPaused ? <Play size={13} /> : <Pause size={13} />}
            </button>
          )}

          {/* Refresh manual */}
          <button 
            className="btn btn-outline btn-sm" 
            onClick={load} 
            disabled={loading}
            style={{ display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <RefreshCw size={13} style={loading ? { animation: 'spin 0.8s linear infinite' } : {}} />
            Carregar
          </button>

          {/* Exportar */}
          <button 
            className="btn btn-outline btn-sm" 
            onClick={exportLogs} 
            disabled={!logs.length}
            style={{ display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <Download size={13} />
            Exportar
          </button>

          {/* Limpar antigos */}
          <button 
            className="btn btn-outline btn-sm" 
            onClick={clearOldLogs}
            style={{ display: 'flex', alignItems: 'center', gap: 6, opacity: 0.7 }}
            title="Remove logs com 7+ dias"
          >
            <Trash2 size={13} />
            Limpar
          </button>
        </div>
      </div>

      {/* ─── Estatísticas ─── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10, marginBottom: 16 }}>
        <div style={{ padding: 12, background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 8, textAlign: 'center' }}>
          <span style={{ fontSize: 11, color: 'var(--muted)', display: 'block', marginBottom: 4 }}>TOTAL</span>
          <span style={{ fontSize: 20, fontWeight: 700, color: 'var(--text)' }}>{stats.total}</span>
        </div>
        <div style={{ padding: 12, background: 'rgba(232,25,44,0.05)', border: '1px solid var(--red)20', borderRadius: 8, textAlign: 'center' }}>
          <span style={{ fontSize: 11, color: 'var(--muted)', display: 'block', marginBottom: 4 }}>ERROS</span>
          <span style={{ fontSize: 20, fontWeight: 700, color: 'var(--red)' }}>{stats.errors}</span>
        </div>
        <div style={{ padding: 12, background: 'rgba(245,158,11,0.05)', border: '1px solid var(--yellow)20', borderRadius: 8, textAlign: 'center' }}>
          <span style={{ fontSize: 11, color: 'var(--muted)', display: 'block', marginBottom: 4 }}>AVISOS</span>
          <span style={{ fontSize: 20, fontWeight: 700, color: 'var(--yellow)' }}>{stats.warnings}</span>
        </div>
        <div style={{ padding: 12, background: 'rgba(34,197,94,0.05)', border: '1px solid var(--green)20', borderRadius: 8, textAlign: 'center' }}>
          <span style={{ fontSize: 11, color: 'var(--muted)', display: 'block', marginBottom: 4 }}>INFO</span>
          <span style={{ fontSize: 20, fontWeight: 700, color: 'var(--green)' }}>{stats.info}</span>
        </div>
      </div>

      {/* ─── Filtros ─── */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        {/* Busca */}
        <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
          <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)', pointerEvents: 'none' }} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar mensagem / serviço..."
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

        {/* Filtro de Nível */}
        <select value={level} onChange={e => setLevel(e.target.value)}
          style={{ padding: '7px 10px', background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text)', fontSize: 13, outline: 'none' }}>
          {LEVELS.map(l => <option key={l} value={l}>{l === 'todos' ? 'Todos os níveis' : l.toUpperCase()}</option>)}
        </select>

        {/* Filtro de Serviço */}
        <select value={service} onChange={e => setService(e.target.value)}
          style={{ padding: '7px 10px', background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text)', fontSize: 13, outline: 'none' }}>
          {SERVICES.map(s => <option key={s} value={s}>{s === 'todos' ? 'Todos os serviços' : s}</option>)}
        </select>

        {/* Velocidade de refresh */}
        {autoRefresh && (
          <select value={refreshRate} onChange={e => setRefreshRate(Number(e.target.value))}
            style={{ padding: '7px 10px', background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text)', fontSize: 13, outline: 'none' }}>
            <option value={1000}>Atualizar a cada 1s</option>
            <option value={2000}>Atualizar a cada 2s</option>
            <option value={5000}>Atualizar a cada 5s</option>
            <option value={10000}>Atualizar a cada 10s</option>
          </select>
        )}

        {/* Limite de logs */}
        <select value={maxLogs} onChange={e => setMaxLogs(Number(e.target.value))}
          style={{ padding: '7px 10px', background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text)', fontSize: 13, outline: 'none' }}>
          <option value={100}>Últimos 100</option>
          <option value={200}>Últimos 200</option>
          <option value={500}>Últimos 500</option>
        </select>
      </div>

      {/* ─── Lista de Logs ─── */}
      {error ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: 40, gap: 10, background: 'var(--bg2)', borderRadius: 10, border: '1px solid var(--red)30' }}>
          <AlertCircle size={32} color="var(--red)" />
          <span style={{ color: 'var(--red)', fontSize: 14, textAlign: 'center' }}>{error}</span>
          <button className="btn btn-outline btn-sm" onClick={load}>Tentar novamente</button>
        </div>
      ) : loading && logs.length === 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', padding: 60, gap: 10 }}>
          <div style={{ width: 28, height: 28, border: '3px solid var(--border)', borderTopColor: 'var(--red)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
          <span style={{ color: 'var(--muted)', fontSize: 13 }}>Carregando logs...</span>
        </div>
      ) : logs.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60, color: 'var(--muted)', fontSize: 14, background: 'var(--bg2)', borderRadius: 10, border: '1px solid var(--border)' }}>
          Nenhum log encontrado com os filtros atuais.
        </div>
      ) : (
        <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
          <div style={{ overflowY: 'auto', maxHeight: 700, fontFamily: 'monospace' }}>
            {logs.map((log, i) => {
              const lvl    = log.level || 'info'
              const color  = LEVEL_COLOR[lvl] || 'var(--dim)'
              const bg     = i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.015)'
              const isExpanded = expandedLog === log.id
              
              return (
                <div key={log.id || i}>
                  {/* Linha principal do log */}
                  <div 
                    onClick={() => setExpandedLog(isExpanded ? null : log.id)}
                    style={{ 
                      display: 'flex', 
                      gap: 10, 
                      padding: '8px 14px', 
                      background: bg, 
                      borderBottom: '1px solid rgba(255,255,255,0.03)', 
                      alignItems: 'flex-start',
                      cursor: log.details ? 'pointer' : 'default',
                      transition: 'background 0.2s',
                      ':hover': log.details && { background: 'rgba(255,255,255,0.03)' }
                    }}
                    onMouseEnter={e => log.details && (e.currentTarget.style.background = 'rgba(255,255,255,0.05)')}
                    onMouseLeave={e => (e.currentTarget.style.background = bg)}
                  >
                    {/* Ícone */}
                    <span style={{ fontSize: 10, color, minWidth: 20, marginTop: 3, display: 'flex', alignItems: 'center' }}>
                      {LEVEL_ICON[lvl]}
                    </span>

                    {/* Timestamp */}
                    <span style={{ fontSize: 10, color: 'var(--muted)', whiteSpace: 'nowrap', marginTop: 4, minWidth: 90, fontWeight: 500 }}>
                      {log.timestamp ? new Date(log.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '—'}
                    </span>

                    {/* Nível */}
                    <span style={{ fontSize: 9, fontWeight: 700, color, minWidth: 45, marginTop: 4, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                      {lvl}
                    </span>

                    {/* Serviço */}
                    {log.service && (
                      <span style={{ fontSize: 10, color: 'var(--blue)', fontWeight: 600, marginTop: 4, minWidth: 70, background: 'rgba(59,130,246,0.1)', padding: '2px 6px', borderRadius: 3 }}>
                        [{log.service}]
                      </span>
                    )}

                    {/* Mensagem */}
                    <span style={{ fontSize: 12, color: 'var(--text)', flex: 1, wordBreak: 'break-word', lineHeight: 1.5, marginTop: 2 }}>
                      {log.message}
                      {log.details && (
                        <span style={{ color: 'var(--muted)', fontSize: 10, marginLeft: 8, opacity: 0.7 }}>
                          ▼ {log.details ? '(' + Object.keys(log.details).length + ' campos)' : ''}
                        </span>
                      )}
                    </span>
                  </div>

                  {/* Detalhes expandidos */}
                  {isExpanded && log.details && (
                    <div style={{ 
                      padding: '10px 14px', 
                      background: 'rgba(255,255,255,0.02)', 
                      borderBottom: '1px solid rgba(255,255,255,0.03)',
                      borderLeft: `3px solid ${color}`,
                      fontSize: 11,
                      lineHeight: 1.6,
                      color: 'var(--muted)',
                      fontFamily: 'monospace',
                      overflowX: 'auto'
                    }}>
                      <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                        {JSON.stringify(log.details, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              )
            })}
            <div ref={bottomRef} />
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
        button:hover { opacity: 0.8; }
      `}</style>
    </div>
  )
}
