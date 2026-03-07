import { useState, useEffect } from 'react'
import { Database, Play, Table, RefreshCw } from 'lucide-react'
import api from '../../services/api'

export default function DBExplorer() {
  const [tables, setTables] = useState([])
  const [selectedTable, setSelectedTable] = useState(null)
  const [tableData, setTableData] = useState([])
  const [sql, setSql] = useState('')
  const [sqlResult, setSqlResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState('tables') // tables | sql

  useEffect(() => {
    api.get('/api/superadmin/db/tables')
      .then(r => setTables(r.data.data || []))
      .catch(() => {})
  }, [])

  const loadTable = async (name) => {
    setSelectedTable(name)
    setLoading(true)
    try {
      const { data } = await api.get(`/api/superadmin/db/table/${name}`)
      setTableData(data.data || [])
    } catch { setTableData([]) }
    finally { setLoading(false) }
  }

  const runSQL = async () => {
    if (!sql.trim()) return
    setLoading(true)
    setSqlResult(null)
    try {
      const { data } = await api.post('/api/superadmin/db/sql', { query: sql })
      setSqlResult({ ok: true, data: data.data, count: data.count })
    } catch (err) {
      setSqlResult({ ok: false, error: err.response?.data?.error || 'Erro ao executar SQL' })
    } finally { setLoading(false) }
  }

  const cols = tableData.length > 0 ? Object.keys(tableData[0]) : []

  return (
    <div style={{ display:'grid', gridTemplateColumns:'200px 1fr', gap:16, height:'calc(100vh - 220px)' }}>
      {/* Sidebar tables */}
      <div style={{ background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:12, overflow:'hidden' }}>
        <div style={{ padding:'12px 14px', borderBottom:'1px solid var(--border)', fontSize:11, fontWeight:700, color:'var(--muted)', textTransform:'uppercase', letterSpacing:0.5 }}>
          Tabelas ({tables.length})
        </div>
        <div style={{ overflowY:'auto', height:'calc(100% - 44px)' }}>
          {tables.map(t => (
            <button
              key={t}
              onClick={() => { setActiveTab('tables'); loadTable(t) }}
              style={{
                display:'flex', alignItems:'center', gap:8, width:'100%', padding:'9px 14px',
                background: selectedTable === t && activeTab === 'tables' ? 'var(--bg3)' : 'none',
                border:'none', borderLeft: selectedTable === t && activeTab === 'tables' ? '2px solid var(--red)' : '2px solid transparent',
                cursor:'pointer', fontFamily:'inherit', color: selectedTable === t ? 'var(--text)' : 'var(--dim)',
                fontSize:12, textAlign:'left', transition:'all 0.1s',
              }}
            >
              <Table size={12} color={selectedTable === t ? 'var(--red)' : 'var(--muted)'} />
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Main area */}
      <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
        {/* SQL Editor */}
        <div style={{ background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:12, overflow:'hidden' }}>
          <div style={{ display:'flex', alignItems:'center', gap:8, padding:'10px 14px', borderBottom:'1px solid var(--border)' }}>
            <Database size={13} color='var(--yellow)' />
            <span style={{ fontSize:12, fontWeight:700, color:'var(--dim)', flex:1 }}>SQL Direto</span>
            <button onClick={runSQL} disabled={loading || !sql.trim()} style={{
              display:'flex', alignItems:'center', gap:6, padding:'6px 14px',
              background: sql.trim() ? 'var(--red)' : 'var(--bg4)',
              border:'none', borderRadius:7, color: sql.trim() ? '#fff' : 'var(--muted)',
              fontSize:12, fontWeight:700, cursor: sql.trim() ? 'pointer' : 'default', fontFamily:'inherit',
            }}>
              <Play size={11} /> Executar
            </button>
          </div>
          <textarea
            value={sql}
            onChange={e => setSql(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && e.ctrlKey) runSQL() }}
            placeholder="SELECT * FROM tenants LIMIT 10; -- Ctrl+Enter para executar"
            rows={4}
            style={{
              width:'100%', padding:'12px 14px', background:'none', border:'none', outline:'none',
              color:'var(--text)', fontSize:12, fontFamily:'monospace', resize:'vertical',
              lineHeight:1.7,
            }}
          />
        </div>

        {/* Results */}
        <div style={{ flex:1, background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:12, overflow:'hidden' }}>
          <div style={{ padding:'10px 14px', borderBottom:'1px solid var(--border)', display:'flex', alignItems:'center', gap:8 }}>
            <span style={{ fontSize:12, fontWeight:700, color:'var(--dim)' }}>
              {sqlResult ? (sqlResult.ok ? `${sqlResult.count || sqlResult.data?.length || 0} resultados` : 'Erro') : selectedTable ? `${selectedTable} — ${tableData.length} linhas` : 'Selecione uma tabela'}
            </span>
            {loading && <RefreshCw size={12} color='var(--muted)' className="spin" />}
          </div>

          <div style={{ overflowAuto: 'auto', height:'calc(100% - 44px)', overflowY:'auto', overflowX:'auto' }}>
            {sqlResult && !sqlResult.ok && (
              <div style={{ padding:16, color:'var(--red)', fontSize:12, fontFamily:'monospace' }}>{sqlResult.error}</div>
            )}

            {(() => {
              const rows = sqlResult?.ok ? sqlResult.data : tableData
              const headers = rows?.length > 0 ? Object.keys(rows[0]) : cols
              if (!rows?.length) return (
                <div style={{ padding:40, textAlign:'center', color:'var(--muted)', fontSize:13 }}>
                  {loading ? 'Carregando...' : 'Nenhum dado'}
                </div>
              )
              return (
                <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
                  <thead>
                    <tr style={{ position:'sticky', top:0, background:'var(--bg2)', zIndex:1 }}>
                      {headers.map(h => (
                        <th key={h} style={{ padding:'8px 12px', textAlign:'left', fontSize:10, fontWeight:700, color:'var(--muted)', textTransform:'uppercase', letterSpacing:0.5, borderBottom:'1px solid var(--border)', whiteSpace:'nowrap' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.slice(0,100).map((row, i) => (
                      <tr key={i} style={{ borderBottom:'1px solid var(--border)' }}
                        onMouseEnter={e => e.currentTarget.style.background='var(--bg3)'}
                        onMouseLeave={e => e.currentTarget.style.background='transparent'}
                      >
                        {headers.map(h => (
                          <td key={h} style={{ padding:'8px 12px', color:'var(--text)', maxWidth:200, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                            {row[h] === null ? <span style={{ color:'var(--muted)' }}>null</span> : String(row[h])}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              )
            })()}
          </div>
        </div>
      </div>

      <style>{`.spin{animation:spin 1s linear infinite}@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}
