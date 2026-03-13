import { useState } from 'react'
import { GitBranch, Globe, RefreshCw, CheckCircle, XCircle, Clock, ExternalLink } from 'lucide-react'
import api from '../../services/api'

export default function DeployControl() {
  const [loading, setLoading] = useState({})
  const [results, setResults] = useState({})

  const run = async (action) => {
    setLoading(l => ({ ...l, [action]: true }))
    try {
      const { data } = await api.post(`/api/superadmin/deploy/${action}`)
      setResults(r => ({ ...r, [action]: { ok: true, data: data.data } }))
    } catch (err) {
      setResults(r => ({ ...r, [action]: { ok: false, error: err.response?.data?.error || 'Erro' } }))
    } finally {
      setLoading(l => ({ ...l, [action]: false }))
    }
  }

  const ACTIONS = [
    {
      id: 'vercel_status',
      icon: Globe, color: '#00C7B7',
      title: 'Status Vercel',
      desc: 'Ver último deployment e status do projeto',
      action: 'vercel-status',
    },
    {
      id: 'vercel_deploy',
      icon: Globe, color: '#00C7B7',
      title: 'Triggerar Deploy',
      desc: 'Força um novo deploy na Vercel agora',
      action: 'vercel-deploy',
      danger: true,
    },
    {
      id: 'github_status',
      icon: GitBranch, color: '#A78BFA',
      title: 'Status GitHub',
      desc: 'Últimos commits e status do repositório',
      action: 'github-status',
    },
    {
      id: 'github_pull',
      icon: GitBranch, color: '#A78BFA',
      title: 'Git Pull',
      desc: 'Puxa as últimas mudanças no VPS',
      action: 'github-pull',
    },
  ]

  return (
    <div>
      <div style={{ fontSize:12, color:'var(--muted)', marginBottom:20, background:'var(--bg2)', border:'1px solid var(--yellow)33', borderRadius:10, padding:'10px 14px', display:'flex', gap:8 }}>
        ⚠️ <span>As ações de deploy e git pull afetam o ambiente de produção. Use com cuidado.</span>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(260px,1fr))', gap:14 }}>
        {ACTIONS.map(({ id, icon: Icon, color, title, desc, action, danger }) => {
          const res = results[action]
          return (
            <div key={id} style={{
              background:'var(--bg2)', border:`1px solid ${danger ? 'rgba(232,25,44,0.2)' : 'var(--border)'}`,
              borderRadius:12, padding:18,
            }}>
              <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:12 }}>
                <div style={{
                  width:36, height:36, borderRadius:9,
                  background:`${color}18`, display:'flex', alignItems:'center', justifyContent:'center',
                }}>
                  <Icon size={16} color={color} />
                </div>
                <div>
                  <div style={{ fontSize:13, fontWeight:700, color:'var(--text)' }}>{title}</div>
                  <div style={{ fontSize:11, color:'var(--muted)', marginTop:1 }}>{desc}</div>
                </div>
              </div>

              {res && (
                <div style={{
                  background:'var(--bg3)', borderRadius:8, padding:'10px 12px', marginBottom:12,
                  border:`1px solid ${res.ok ? 'rgba(34,197,94,0.2)' : 'rgba(232,25,44,0.2)'}`,
                }}>
                  <div style={{ display:'flex', gap:6, alignItems:'center', marginBottom:res.data ? 6 : 0 }}>
                    {res.ok ? <CheckCircle size={12} color='var(--green)' /> : <XCircle size={12} color='var(--red)' />}
                    <span style={{ fontSize:11, color: res.ok ? 'var(--green)' : 'var(--red)', fontWeight:600 }}>
                      {res.ok ? 'Sucesso' : 'Erro'}
                    </span>
                  </div>
                  {res.error && <div style={{ fontSize:11, color:'var(--red)', fontFamily:'monospace' }}>{res.error}</div>}
                  {res.data && typeof res.data === 'object' && (
                    <div style={{ fontSize:11, color:'var(--dim)', fontFamily:'monospace', whiteSpace:'pre-wrap' }}>
                      {JSON.stringify(res.data, null, 2).slice(0, 300)}
                    </div>
                  )}
                  {res.data && typeof res.data === 'string' && (
                    <div style={{ fontSize:11, color:'var(--dim)', fontFamily:'monospace', whiteSpace:'pre-wrap' }}>{res.data}</div>
                  )}
                </div>
              )}

              <button
                onClick={() => run(action)}
                disabled={loading[action]}
                style={{
                  display:'flex', alignItems:'center', justifyContent:'center', gap:7,
                  width:'100%', padding:'9px', borderRadius:8,
                  background: danger ? 'rgba(232,25,44,0.1)' : 'var(--bg3)',
                  border: `1px solid ${danger ? 'var(--red-border)' : 'var(--border)'}`,
                  color: danger ? 'var(--red)' : 'var(--dim)',
                  fontSize:12, fontWeight:600, cursor: loading[action] ? 'default' : 'pointer',
                  fontFamily:'inherit', transition:'all 0.15s',
                }}
              >
                {loading[action]
                  ? <><RefreshCw size={12} className="spin" /> Executando...</>
                  : <><Icon size={12} /> {title}</>
                }
              </button>
            </div>
          )
        })}
      </div>

      <style>{`.spin{animation:spin 1s linear infinite}@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}
