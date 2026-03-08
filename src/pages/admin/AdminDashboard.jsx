import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  CheckCircle, XCircle, LogOut, RefreshCw,
  Users, Server, Database, Globe, GitBranch,
  AlertCircle, Trash2, UserX,
} from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../../services/api'
import LOGO from '../../assets/logo.png'

function authHeader() {
  return { Authorization: `Bearer ${localStorage.getItem('admin_token')}` }
}

function StatusDot({ ok }) {
  const color = ok === true ? '#22c55e' : ok === false ? '#ef4444' : '#f59e0b'
  return <div style={{ width: 10, height: 10, borderRadius: '50%', background: color, boxShadow: `0 0 6px ${color}`, flexShrink: 0 }} />
}

const SERVICE_ICON = { backend: Server, supabase: Database, vercel: Globe, github: GitBranch, github_backend: GitBranch }

function ServiceCard({ id, info }) {
  const safe = (info && typeof info === 'object' && !Array.isArray(info)) ? info : { ok: null, label: id }
  const Icon = SERVICE_ICON[id] || Server
  const color = safe.ok === true ? '#22c55e' : safe.ok === false ? '#ef4444' : '#f59e0b'
  return (
    <div style={{ padding: 16, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, display: 'flex', alignItems: 'center', gap: 14 }}>
      <div style={{ width: 44, height: 44, borderRadius: 12, background: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Icon size={20} color={color} />
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
          <StatusDot ok={safe.ok} />
          <span style={{ fontSize: 14, fontWeight: 700 }}>{safe.label || id}</span>
        </div>
        <div style={{ fontSize: 11, color, fontWeight: 600 }}>
          {safe.ok === true ? 'Operacional' : safe.ok === false ? 'Falha' : 'Não configurado'}
          {safe.latency_ms > 0 && <span style={{ color: 'rgba(255,255,255,0.4)', fontWeight: 400 }}> · {safe.latency_ms}ms</span>}
        </div>
        {safe.error && <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>{safe.error}</div>}
      </div>
    </div>
  )
}

function MetricCard({ label, valor, cor, icon }) {
  const r = parseInt(cor.slice(1,3),16), g = parseInt(cor.slice(3,5),16), b = parseInt(cor.slice(5,7),16)
  return (
    <div style={{ padding: 16, borderRadius: 12, textAlign: 'center', background: `rgba(${r},${g},${b},0.1)`, border: `1px solid rgba(${r},${g},${b},0.2)` }}>
      <div style={{ fontSize: 24, marginBottom: 8 }}>{icon}</div>
      <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 18, fontWeight: 700 }}>{valor}</div>
    </div>
  )
}

const LOG_COLORS = { error: '#ef4444', warning: '#f59e0b', info: '#3b82f6', debug: 'rgba(255,255,255,0.4)' }

export default function AdminDashboard() {
  const navigate = useNavigate()
  const [admin,             setAdmin]             = useState(null)
  const [carregando,        setCarregando]        = useState(true)
  const [atualizando,       setAtualizando]       = useState(false)
  const [aba,               setAba]               = useState('dashboard')
  const [ultimaAtualizacao, setUltimaAtualizacao] = useState(null)
  const [systemStatus,      setSystemStatus]      = useState(null)
  const [tenants,           setTenants]           = useState([])
  const [admins,            setAdmins]            = useState([])
  const [logs,              setLogs]              = useState([])
  const [logTotal,          setLogTotal]          = useState(0)
  const [logFiltro,         setLogFiltro]         = useState({ nivel: '', servico: '', busca: '' })

  useEffect(() => {
    const token     = localStorage.getItem('admin_token')
    const adminUser = localStorage.getItem('admin_user')
    if (!token || !adminUser) { navigate('/admin/login'); return }
    setAdmin(JSON.parse(adminUser))
    setCarregando(false)
  }, [navigate])

  const carregarDados = useCallback(async () => {
    setAtualizando(true)
    try {
      const h = authHeader()
      const [statusRes, tenantsRes, adminsRes, logsRes] = await Promise.all([
        api.get('/api/admin/status',  { headers: h }).catch(() => null),
        api.get('/api/admin/tenants', { headers: h }).catch(() => null),
        api.get('/api/admin/list',    { headers: h }).catch(() => null),
        api.get('/api/admin/logs',    { headers: h }).catch(() => null),
      ])
      if (statusRes?.data?.data)  setSystemStatus(statusRes.data.data)
      if (tenantsRes?.data?.data) setTenants(tenantsRes.data.data)
      if (adminsRes?.data?.data)  setAdmins(adminsRes.data.data.admins || [])
      if (logsRes?.data?.data) {
        setLogs(logsRes.data.data.data || [])
        setLogTotal(logsRes.data.data.total || 0)
      }
      setUltimaAtualizacao(new Date())
    } catch (err) {
      console.error('Erro ao carregar dados:', err)
    } finally {
      setAtualizando(false)
    }
  }, [])

  useEffect(() => {
    if (!admin) return
    carregarDados()
    const interval = setInterval(carregarDados, 30000)
    return () => clearInterval(interval)
  }, [admin, carregarDados])

  const carregarLogs = useCallback(async () => {
    try {
      const params = new URLSearchParams()
      if (logFiltro.nivel)   params.set('nivel', logFiltro.nivel)
      if (logFiltro.servico) params.set('servico', logFiltro.servico)
      if (logFiltro.busca)   params.set('busca', logFiltro.busca)
      const res = await api.get(`/api/admin/logs?${params}`, { headers: authHeader() })
      if (res?.data?.data) {
        setLogs(res.data.data.data || [])
        setLogTotal(res.data.data.total || 0)
      }
    } catch {}
  }, [logFiltro])

  useEffect(() => { if (aba === 'logs') carregarLogs() }, [logFiltro, aba, carregarLogs])

  const handleLogout = () => {
    localStorage.removeItem('admin_token')
    localStorage.removeItem('admin_user')
    toast.success('Desconectado com sucesso')
    navigate('/admin/login')
  }

  const desativarAdmin = async (id) => {
    if (!window.confirm('Desativar este admin?')) return
    try { await api.post(`/api/admin/deactivate/${id}`, {}, { headers: authHeader() }); toast.success('Admin desativado'); carregarDados() }
    catch { toast.error('Erro ao desativar') }
  }

  const deletarAdmin = async (id) => {
    if (!window.confirm('DELETAR permanentemente este admin?')) return
    try { await api.delete(`/api/admin/${id}`, { headers: authHeader() }); toast.success('Admin removido'); carregarDados() }
    catch { toast.error('Erro ao deletar') }
  }

  const limparLogs = async () => {
    if (!window.confirm('Remover logs com mais de 30 dias?')) return
    try { await api.delete('/api/admin/logs', { headers: authHeader() }); toast.success('Logs antigos removidos'); carregarLogs() }
    catch { toast.error('Erro ao limpar logs') }
  }

  if (carregando) return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg,#080808,#121212)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontFamily: "'Outfit',sans-serif" }}>
      <div style={{ width: 36, height: 36, border: '3px solid rgba(255,255,255,0.15)', borderTopColor: '#dc141e', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
      <div style={{ color: 'rgba(255,255,255,0.5)', marginTop: 12 }}>Carregando...</div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  const allOk    = systemStatus && Object.values(systemStatus).every(s => s.ok !== false)
  const anyError = systemStatus && Object.values(systemStatus).some(s => s.ok === false)
  const ABAS = [
    { id: 'dashboard', label: '📊 Dashboard' },
    { id: 'status',    label: '🖥️ Status do Sistema' },
    { id: 'empresas',  label: `🏢 Empresas (${tenants.length})` },
    { id: 'admins',    label: `👥 Admins (${admins.length})` },
    { id: 'logs',      label: '📋 Logs' },
  ]

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg,#080808,#121212)', color: '#fff', fontFamily: "'Outfit',sans-serif", padding: '20px', boxSizing: 'border-box' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28, padding: '18px 20px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <img src={LOGO} alt="RED" style={{ width: 46, height: 46 }} />
            <div>
              <div style={{ fontSize: 17, fontWeight: 700 }}>🛡️ Painel Administrativo</div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', marginTop: 2 }}>
                {admin?.nome} · {ultimaAtualizacao ? `Atualizado às ${ultimaAtualizacao.toLocaleTimeString('pt-BR')}` : 'Carregando...'}
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={carregarDados} disabled={atualizando} style={{ width: 34, height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: 'rgba(255,255,255,0.7)', cursor: 'pointer' }}>
              <RefreshCw size={14} style={{ animation: atualizando ? 'spin 1s linear infinite' : 'none' }} />
            </button>
            <button onClick={handleLogout} style={{ width: 34, height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(220,20,30,0.1)', border: '1px solid rgba(220,20,30,0.25)', borderRadius: 8, color: '#dc141e', cursor: 'pointer' }}>
              <LogOut size={14} />
            </button>
          </div>
        </div>

        {/* Abas */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 24, borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: 14, overflowX: 'auto' }}>
          {ABAS.map(a => (
            <button key={a.id} onClick={() => setAba(a.id)} style={{ padding: '7px 14px', background: aba === a.id ? 'rgba(220,20,30,0.15)' : 'transparent', border: aba === a.id ? '1px solid rgba(220,20,30,0.35)' : '1px solid transparent', borderRadius: 8, color: aba === a.id ? '#dc141e' : 'rgba(255,255,255,0.45)', cursor: 'pointer', fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap' }}>
              {a.label}
            </button>
          ))}
        </div>

        {/* ── DASHBOARD ── */}
        {aba === 'dashboard' && (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))', gap: 14, marginBottom: 28 }}>
              <MetricCard label="Empresas"        valor={tenants.length} cor="#3b82f6" icon="🏢" />
              <MetricCard label="Administradores" valor={admins.length}  cor="#10b981" icon="👥" />
              <MetricCard label="Logs"            valor={logTotal}       cor="#f59e0b" icon="📋" />
              <MetricCard
                label="Status geral"
                valor={!systemStatus ? '—' : allOk ? 'OK' : anyError ? 'Falha' : 'Parcial'}
                cor={!systemStatus ? '#6b7280' : allOk ? '#22c55e' : anyError ? '#ef4444' : '#f59e0b'}
                icon={!systemStatus ? '⏳' : allOk ? '✅' : anyError ? '🔴' : '⚠️'}
              />
            </div>

            {systemStatus && (
              <div style={{ marginBottom: 28 }}>
                <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 14, color: 'rgba(255,255,255,0.8)' }}>Saúde dos Serviços</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(240px,1fr))', gap: 12 }}>
                  {Object.entries(systemStatus).map(([id, info]) => <ServiceCard key={id} id={id} info={info} />)}
                </div>
              </div>
            )}

            {tenants.length > 0 && (
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 14, color: 'rgba(255,255,255,0.8)' }}>Últimas Empresas</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(220px,1fr))', gap: 12 }}>
                  {tenants.slice(0, 6).map(t => (
                    <div key={t.id} style={{ padding: 14, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12 }}>
                      <div style={{ fontWeight: 700, marginBottom: 4 }}>{t.nome}</div>
                      <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)' }}>Tipo: <strong>{t.tipo}</strong> · {t.user_count || 0} usuário(s)</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── STATUS DO SISTEMA ── */}
        {aba === 'status' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div style={{ fontSize: 15, fontWeight: 700 }}>Status da Infraestrutura</div>
              <button onClick={carregarDados} disabled={atualizando} style={{ padding: '7px 14px', display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: 'rgba(255,255,255,0.7)', cursor: 'pointer', fontSize: 12 }}>
                <RefreshCw size={13} style={{ animation: atualizando ? 'spin 1s linear infinite' : 'none' }} /> Verificar agora
              </button>
            </div>

            {!systemStatus ? <div style={{ padding: 40, textAlign: 'center', color: 'rgba(255,255,255,0.4)' }}>Carregando status...</div> : (
              <>
                <div style={{ padding: '14px 18px', borderRadius: 12, marginBottom: 24, display: 'flex', alignItems: 'center', gap: 12, background: allOk ? 'rgba(34,197,94,0.1)' : anyError ? 'rgba(239,68,68,0.1)' : 'rgba(245,158,11,0.1)', border: `1px solid ${allOk ? 'rgba(34,197,94,0.25)' : anyError ? 'rgba(239,68,68,0.25)' : 'rgba(245,158,11,0.25)'}` }}>
                  {allOk ? <CheckCircle size={20} color="#22c55e" /> : anyError ? <XCircle size={20} color="#ef4444" /> : <AlertCircle size={20} color="#f59e0b" />}
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>{allOk ? '✅ Todos os serviços operacionais' : anyError ? '🔴 Um ou mais serviços com falha' : '⚠️ Verificação parcial'}</div>
                    <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', marginTop: 2 }}>{Object.values(systemStatus).filter(s => s.ok === true).length} de {Object.values(systemStatus).length} serviços OK</div>
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(260px,1fr))', gap: 14 }}>
                  {Object.entries(systemStatus).map(([id, info]) => <ServiceCard key={id} id={id} info={info} />)}
                </div>
              </>
            )}
          </div>
        )}

        {/* ── EMPRESAS ── */}
        {aba === 'empresas' && (
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 18 }}>Empresas Cadastradas ({tenants.length})</div>
            {tenants.length === 0 ? (
              <div style={{ padding: 40, textAlign: 'center', background: 'rgba(255,255,255,0.02)', border: '1px dashed rgba(255,255,255,0.08)', borderRadius: 12, color: 'rgba(255,255,255,0.4)' }}>Nenhuma empresa cadastrada</div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))', gap: 14 }}>
                {tenants.map(t => (
                  <div key={t.id} style={{ padding: 16, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 2 }}>{t.nome}</div>
                        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>/{t.slug}</div>
                      </div>
                      <span style={{ padding: '2px 8px', borderRadius: 20, fontSize: 10, fontWeight: 700, background: 'rgba(59,130,246,0.15)', color: '#3b82f6' }}>{t.tipo}</span>
                    </div>
                    <div style={{ display: 'flex', gap: 14, fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>
                      <span>👥 {t.user_count || 0} usuário(s)</span>
                      {t.cidade && <span>📍 {t.cidade}{t.estado ? `, ${t.estado}` : ''}</span>}
                    </div>
                    {t.criado_em && <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', marginTop: 8 }}>Criado em {new Date(t.criado_em).toLocaleDateString('pt-BR')}</div>}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── ADMINS ── */}
        {aba === 'admins' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
              <div style={{ fontSize: 15, fontWeight: 700 }}>Administradores ({admins.length})</div>
              <button onClick={() => navigate('/admin/register')} style={{ padding: '7px 14px', background: 'rgba(220,20,30,0.2)', border: '1px solid rgba(220,20,30,0.35)', borderRadius: 8, color: '#dc141e', cursor: 'pointer', fontSize: 12, fontWeight: 700 }}>
                + Novo Admin
              </button>
            </div>
            {admins.length === 0 ? (
              <div style={{ padding: 40, textAlign: 'center', background: 'rgba(255,255,255,0.02)', border: '1px dashed rgba(255,255,255,0.08)', borderRadius: 12, color: 'rgba(255,255,255,0.4)' }}>Nenhum administrador cadastrado</div>
            ) : (
              <div style={{ display: 'grid', gap: 10 }}>
                {admins.map(adm => (
                  <div key={adm.id} style={{ padding: 16, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 14 }}>{adm.nome}</div>
                      <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', marginTop: 2 }}>@{adm.username} · {adm.email}</div>
                      <span style={{ display: 'inline-block', marginTop: 6, padding: '2px 8px', borderRadius: 20, fontSize: 10, fontWeight: 700, background: adm.ativo ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)', color: adm.ativo ? '#22c55e' : '#ef4444' }}>
                        {adm.ativo ? '✓ Ativo' : '✗ Inativo'}
                      </span>
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button onClick={() => desativarAdmin(adm.id)} style={{ padding: '6px 12px', display: 'flex', alignItems: 'center', gap: 5, background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 7, color: '#f59e0b', cursor: 'pointer', fontSize: 11, fontWeight: 600 }}>
                        <UserX size={12} /> Desativar
                      </button>
                      <button onClick={() => deletarAdmin(adm.id)} style={{ padding: '6px 12px', display: 'flex', alignItems: 'center', gap: 5, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 7, color: '#ef4444', cursor: 'pointer', fontSize: 11, fontWeight: 600 }}>
                        <Trash2 size={12} /> Deletar
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── LOGS ── */}
        {aba === 'logs' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
              <div style={{ fontSize: 15, fontWeight: 700 }}>Logs do Sistema ({logTotal})</div>
              <button onClick={limparLogs} style={{ padding: '6px 12px', display: 'flex', alignItems: 'center', gap: 5, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 7, color: '#ef4444', cursor: 'pointer', fontSize: 11, fontWeight: 600 }}>
                <Trash2 size={12} /> Limpar logs antigos
              </button>
            </div>

            <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
              {[
                { key: 'nivel', placeholder: 'Nível', options: ['', 'error', 'warning', 'info', 'debug'], labels: ['Todos os níveis', 'Erro', 'Aviso', 'Info', 'Debug'] },
                { key: 'servico', placeholder: 'Serviço', options: ['', 'frontend', 'backend', 'database'], labels: ['Todos os serviços', 'Frontend', 'Backend', 'Database'] },
              ].map(({ key, options, labels }) => (
                <select key={key} value={logFiltro[key]} onChange={e => setLogFiltro(f => ({...f, [key]: e.target.value}))}
                  style={{ padding: '7px 10px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#fff', fontSize: 12, cursor: 'pointer', outline: 'none' }}>
                  {options.map((o, i) => <option key={o} value={o}>{labels[i]}</option>)}
                </select>
              ))}
              <input type="text" placeholder="Buscar mensagem..." value={logFiltro.busca}
                onChange={e => setLogFiltro(f => ({...f, busca: e.target.value}))}
                style={{ padding: '7px 10px', minWidth: 200, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#fff', fontSize: 12, outline: 'none' }}
              />
            </div>

            {logs.length === 0 ? (
              <div style={{ padding: 40, textAlign: 'center', background: 'rgba(255,255,255,0.02)', border: '1px dashed rgba(255,255,255,0.08)', borderRadius: 12, color: 'rgba(255,255,255,0.4)' }}>Nenhum log encontrado</div>
            ) : (
              <div style={{ background: 'rgba(0,0,0,0.3)', borderRadius: 12, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.07)' }}>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                        {['Nível', 'Serviço', 'Mensagem', 'Data'].map(h => (
                          <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: 1 }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {logs.map((log, i) => (
                        <tr key={log.id || i} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                          <td style={{ padding: '9px 14px' }}>
                            <span style={{ padding: '2px 6px', borderRadius: 4, fontSize: 10, fontWeight: 700, color: LOG_COLORS[log.level] || 'rgba(255,255,255,0.5)' }}>{log.level}</span>
                          </td>
                          <td style={{ padding: '9px 14px', fontSize: 12, color: 'rgba(255,255,255,0.6)' }}>{log.service}</td>
                          <td style={{ padding: '9px 14px', fontSize: 12, maxWidth: 400, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{log.message}</td>
                          <td style={{ padding: '9px 14px', fontSize: 11, color: 'rgba(255,255,255,0.35)', whiteSpace: 'nowrap' }}>
                            {log.created_at ? new Date(log.created_at).toLocaleString('pt-BR') : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
