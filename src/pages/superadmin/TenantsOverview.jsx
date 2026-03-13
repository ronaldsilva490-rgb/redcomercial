import { useEffect, useState } from 'react'
import { Building2, Users, RefreshCw, Eye, ToggleLeft, ToggleRight } from 'lucide-react'
import api from '../../services/api'

const TIPO_COLOR = {
  concessionaria: '#3B82F6',
  restaurante:    '#F59E0B',
  comercio:       '#22C55E',
}

export default function TenantsOverview() {
  const [tenants, setTenants] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  const load = async () => {
    setLoading(true)
    try {
      const { data } = await api.get('/api/superadmin/tenants')
      setTenants(data.data || [])
    } catch {
      setTenants([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const filtered = tenants.filter(t =>
    t.nome?.toLowerCase().includes(search.toLowerCase()) ||
    t.tipo?.toLowerCase().includes(search.toLowerCase())
  )

  const toggleAtivo = async (id, atual) => {
    await api.patch(`/api/superadmin/tenants/${id}`, { ativo: !atual })
    load()
  }

  return (
    <div>
      {/* Stats */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(160px,1fr))', gap:14, marginBottom:24 }}>
        {[
          { label:'Total Empresas', value: tenants.length, color:'var(--blue)' },
          { label:'Ativas',         value: tenants.filter(t=>t.ativo).length, color:'var(--green)' },
          { label:'Inativas',       value: tenants.filter(t=>!t.ativo).length, color:'var(--muted)' },
          { label:'Restaurantes',   value: tenants.filter(t=>t.tipo==='restaurante').length, color:'var(--yellow)' },
        ].map(({ label, value, color }) => (
          <div key={label} style={{
            background:'var(--bg2)', border:'1px solid var(--border)',
            borderRadius:12, padding:'16px 20px',
          }}>
            <div style={{ fontSize:24, fontWeight:800, color, fontFamily:'Bebas Neue', letterSpacing:1 }}>{value}</div>
            <div style={{ fontSize:11, color:'var(--muted)', marginTop:2 }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div style={{ display:'flex', gap:10, marginBottom:16, alignItems:'center' }}>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Buscar empresa..."
          style={{
            flex:1, padding:'9px 14px', borderRadius:8,
            background:'var(--bg3)', border:'1px solid var(--border)',
            color:'var(--text)', fontSize:13, fontFamily:'inherit', outline:'none',
          }}
        />
        <button
          onClick={load}
          style={{
            display:'flex', alignItems:'center', gap:7, padding:'9px 14px',
            background:'var(--bg3)', border:'1px solid var(--border)',
            borderRadius:8, color:'var(--dim)', fontSize:12, fontWeight:600,
            cursor:'pointer', fontFamily:'inherit',
          }}
        >
          <RefreshCw size={13} className={loading ? 'spin' : ''} />
          Atualizar
        </button>
      </div>

      {/* Table */}
      <div style={{ background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:12, overflow:'hidden' }}>
        <table style={{ width:'100%', borderCollapse:'collapse' }}>
          <thead>
            <tr style={{ borderBottom:'1px solid var(--border)' }}>
              {['Empresa', 'Tipo', 'Usuários', 'Criada em', 'Status', 'Ações'].map(h => (
                <th key={h} style={{ padding:'12px 16px', textAlign:'left', fontSize:11, fontWeight:700, color:'var(--muted)', textTransform:'uppercase', letterSpacing:0.5 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} style={{ padding:40, textAlign:'center', color:'var(--muted)', fontSize:13 }}>Carregando...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={6} style={{ padding:40, textAlign:'center', color:'var(--muted)', fontSize:13 }}>Nenhuma empresa encontrada</td></tr>
            ) : filtered.map(t => (
              <tr key={t.id} style={{ borderBottom:'1px solid var(--border)', transition:'background 0.1s' }}
                onMouseEnter={e => e.currentTarget.style.background='var(--bg3)'}
                onMouseLeave={e => e.currentTarget.style.background='transparent'}
              >
                <td style={{ padding:'14px 16px' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                    <div style={{
                      width:32, height:32, borderRadius:8,
                      background:`${TIPO_COLOR[t.tipo] || '#6B6870'}22`,
                      display:'flex', alignItems:'center', justifyContent:'center'
                    }}>
                      <Building2 size={14} color={TIPO_COLOR[t.tipo] || '#6B6870'} />
                    </div>
                    <div>
                      <div style={{ fontSize:13, fontWeight:600, color:'var(--text)' }}>{t.nome}</div>
                      <div style={{ fontSize:11, color:'var(--muted)' }}>{t.id?.slice(0,8)}...</div>
                    </div>
                  </div>
                </td>
                <td style={{ padding:'14px 16px' }}>
                  <span style={{
                    padding:'3px 10px', borderRadius:20, fontSize:11, fontWeight:700,
                    background:`${TIPO_COLOR[t.tipo] || '#6B6870'}22`,
                    color: TIPO_COLOR[t.tipo] || '#6B6870',
                  }}>
                    {t.tipo}
                  </span>
                </td>
                <td style={{ padding:'14px 16px' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:5, color:'var(--dim)', fontSize:12 }}>
                    <Users size={12} /> {t.user_count || 0}
                  </div>
                </td>
                <td style={{ padding:'14px 16px', fontSize:12, color:'var(--muted)' }}>
                  {t.created_at ? new Date(t.created_at).toLocaleDateString('pt-BR') : '-'}
                </td>
                <td style={{ padding:'14px 16px' }}>
                  <span style={{
                    padding:'3px 10px', borderRadius:20, fontSize:11, fontWeight:700,
                    background: t.ativo ? 'rgba(34,197,94,0.12)' : 'rgba(107,104,112,0.12)',
                    color: t.ativo ? 'var(--green)' : 'var(--muted)',
                  }}>
                    {t.ativo ? 'Ativa' : 'Inativa'}
                  </span>
                </td>
                <td style={{ padding:'14px 16px' }}>
                  <div style={{ display:'flex', gap:6 }}>
                    <button
                      onClick={() => toggleAtivo(t.id, t.ativo)}
                      title={t.ativo ? 'Desativar' : 'Ativar'}
                      style={{
                        background:'none', border:'1px solid var(--border)',
                        borderRadius:6, padding:'5px 8px', cursor:'pointer',
                        color: t.ativo ? 'var(--green)' : 'var(--muted)',
                      }}
                    >
                      {t.ativo ? <ToggleRight size={14} /> : <ToggleLeft size={14} />}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
