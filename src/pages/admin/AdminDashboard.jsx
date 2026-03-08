import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  CheckCircle, XCircle, LogOut, RefreshCw,
  Users, Server, Database, Globe, GitBranch,
  AlertCircle, Trash2, UserX, Shield,
  Activity, Building2, ScrollText, Wifi
} from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../../services/api'
import LOGO from '../../assets/logo.png'

function authHeader() {
  return { Authorization: `Bearer ${localStorage.getItem('admin_token')}` }
}

// ── Dot de status ──────────────────────────────────────────
function StatusDot({ ok }) {
  const color = ok === true ? '#22c55e' : ok === false ? '#ef4444' : '#f59e0b'
  return (
    <div style={{
      width: 8, height: 8, borderRadius: '50%',
      background: color,
      boxShadow: `0 0 6px ${color}, 0 0 12px ${color}55`,
      flexShrink: 0
    }} />
  )
}

// ── Card de serviço ────────────────────────────────────────
const SERVICE_ICON = { backend: Server, supabase: Database, vercel: Globe, github: GitBranch, github_backend: GitBranch }

function ServiceCard({ id, info }) {
  const safe = (info && typeof info === 'object' && !Array.isArray(info)) ? info : { ok: null, label: id }
  const Icon = SERVICE_ICON[id] || Server
  const color = safe.ok === true ? '#22c55e' : safe.ok === false ? '#ef4444' : '#f59e0b'
  return (
    <div style={{
      padding: '16px 18px',
      background: 'rgba(255,255,255,0.02)',
      border: '1px solid rgba(255,255,255,0.06)',
      borderRadius: 12,
      display: 'flex', alignItems: 'center', gap: 14,
    }}>
      <div style={{
        width: 40, height: 40, borderRadius: 10,
        background: `${color}18`, border: `1px solid ${color}30`,
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
      }}>
        <Icon size={18} color={color} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 3 }}>
          <StatusDot ok={safe.ok} />
          <span style={{ fontSize: 13, fontWeight: 700 }}>{safe.label || id}</span>
        </div>
        <div style={{ fontSize: 11, color, fontWeight: 600 }}>
          {safe.ok === true ? 'Operacional' : safe.ok === false ? 'Falha' : 'Não configurado'}
          {safe.latency_ms > 0 && <span style={{ color: 'rgba(255,255,255,0.35)', fontWeight: 400 }}> · {safe.latency_ms}ms</span>}
        </div>
        {safe.error && <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{safe.error}</div>}
      </div>
    </div>
  )
}

// ── Card de métrica ────────────────────────────────────────
function MetricCard({ label, valor, color, icon: Icon, sub }) {
  return (
    <div style={{
      padding: '20px 18px',
      background: 'rgba(255,255,255,0.02)',
      border: `1px solid ${color}25`,
      borderRadius: 14, position: 'relative', overflow: 'hidden',
    }}>
      <div style={{
        position: 'absolute', top: 0, right: 0, width: 80, height: 80,
        background: `radial-gradient(circle at top right, ${color}18, transparent 70%)`,
        pointerEvents: 'none',
      }} />
      <div style={{ marginBottom: 12 }}>
        <div style={{
          width: 36, height: 36, borderRadius: 9,
          background: `${color}18`, border: `1px solid ${color}30`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Icon size={17} color={color} />
        </div>
      </div>
      <div style={{ fontSize: 26, fontWeight: 800, color: '#fff', letterSpacing: -1, marginBottom: 4 }}>{valor}</div>
      <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', fontWeight: 500 }}>{label}</div>
      {sub && <div style={{ fontSize: 10, color, marginTop: 4, fontWeight: 600 }}>{sub}</div>}
    </div>
  )
}

const LOG_COLORS = { error: '#ef4444', warning: '#f59e0b', info: '#3b82f6', debug: 'rgba(255,255,255,0.35)' }

const CARD = {
  background: 'rgba(255,255,255,0.02)',
  border: '1px solid rgba(255,255,255,0.07)',
  borderRadius: 14,
}

const RED_CARD = {
  background: 'rgba(255,255,255,0.04)',
  border: '2px solid #c41217',
  borderRadius: 16,
  backdropFilter: 'blur(16px)',
  boxShadow: '0 0 15px rgba(196,18,23,0.3), 0 0 40px rgba(196,18,23,0.1), 0 24px 48px rgba(0,0,0,0.6)',
}

const BTN_RED = {
  background: 'linear-gradient(135deg, #991414 0%, #6d0a0a 100%)',
  border: 'none', borderRadius: 10, color: '#fff',
  cursor: 'pointer', fontFamily: 'inherit', fontWeight: 700,
  fontSize: 12, letterSpacing: 0.5, textTransform: 'uppercase',
  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.15), 0 8px 20px rgba(153,20,20,0.35)',
  transition: 'all 0.2s',
}

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
  const [networkInfo,       setNetworkInfo]       = useState(null)
  const [networkLoading,    setNetworkLoading]    = useState(false)

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

  const fetchNetworkInfo = useCallback(async () => {
    setNetworkLoading(true)
    try {
      const res = await api.get('/api/admin/network-info', { headers: authHeader() })
      setNetworkInfo(res.data?.data || null)
    } catch {
      setNetworkInfo(null)
    } finally {
      setNetworkLoading(false)
    }
  }, [])

  useEffect(() => {
    if (aba === 'status' && !networkInfo) fetchNetworkInfo()
  }, [aba, networkInfo, fetchNetworkInfo])

  const handleLogout = () => {
    localStorage.removeItem('admin_token')
    localStorage.removeItem('admin_user')
    toast.success('Desconectado com sucesso')
    navigate('/admin/login')
  }

  const desativarAdmin = async (id) => {
    if (!window.confirm('Desativar este admin?')) return
    try {
      await api.post(`/api/admin/deactivate/${id}`, {}, { headers: authHeader() })
      toast.success('Admin desativado')
      carregarDados()
    } catch { toast.error('Erro ao desativar') }
  }

  const deletarAdmin = async (id) => {
    if (!window.confirm('DELETAR permanentemente este admin?')) return
    try {
      await api.delete(`/api/admin/${id}`, { headers: authHeader() })
      toast.success('Admin removido')
      carregarDados()
    } catch { toast.error('Erro ao deletar') }
  }

  const limparLogs = async () => {
    if (!window.confirm('Remover logs com mais de 30 dias?')) return
    try {
      await api.delete('/api/admin/logs', { headers: authHeader() })
      toast.success('Logs antigos removidos')
      carregarLogs()
    } catch { toast.error('Erro ao limpar logs') }
  }

  if (carregando) return (
    <div style={{
      minHeight: '100vh', background: '#000',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      fontFamily: "'Outfit',sans-serif",
    }}>
      <div style={{
        width: 36, height: 36,
        border: '3px solid rgba(196,18,23,0.2)',
        borderTopColor: '#c41217',
        borderRadius: '50%', animation: 'spin 0.8s linear infinite'
      }} />
      <div style={{ color: 'rgba(255,255,255,0.4)', marginTop: 14, fontSize: 13 }}>Carregando...</div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  const allOk    = systemStatus && Object.values(systemStatus).every(s => s.ok !== false)
  const anyError = systemStatus && Object.values(systemStatus).some(s => s.ok === false)

  const ABAS = [
    { id: 'dashboard', label: 'Dashboard',                          icon: Activity   },
    { id: 'status',    label: 'Status do Sistema',                  icon: Wifi       },
    { id: 'empresas',  label: `Empresas (${tenants.length})`,       icon: Building2  },
    { id: 'admins',    label: `Admins (${admins.length})`,          icon: Users      },
    { id: 'logs',      label: 'Logs',                               icon: ScrollText },
  ]

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #000000 0%, #050202 100%)',
      color: '#fff',
      fontFamily: "'Outfit', sans-serif",
      position: 'relative',
      overflowX: 'hidden',
    }}>

      {/* BG: gradiente vermelho topo — igual ao login */}
      <div style={{
        position: 'fixed', top: 0, left: 0, right: 0, height: 400,
        background: 'linear-gradient(to bottom, rgba(220,20,30,0.25) 0%, rgba(220,20,30,0.12) 30%, transparent 80%)',
        pointerEvents: 'none', zIndex: 0,
      }} />

      {/* BG: grid futurista — igual ao login */}
      <div style={{
        position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0,
        opacity: 0.08,
        backgroundImage: 'linear-gradient(rgba(220,20,30,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(220,20,30,0.3) 1px, transparent 1px)',
        backgroundSize: '50px 50px',
      }} />

      {/* BG: radial glow — igual ao login */}
      <div style={{
        position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0,
        background: 'radial-gradient(ellipse 120% 100% at 50% 0%, rgba(220,20,30,0.08) 0%, transparent 50%)',
      }} />

      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '24px 20px', position: 'relative', zIndex: 1 }}>

        {/* ── HEADER — card com borda vermelha igual ao form de login ── */}
        <div style={{
          ...RED_CARD,
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '16px 24px', marginBottom: 24,
          position: 'relative', overflow: 'hidden',
        }}>
          <div style={{
            position: 'absolute', inset: 0,
            background: 'linear-gradient(135deg, rgba(220,20,30,0.05) 0%, transparent 60%)',
            pointerEvents: 'none',
          }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, position: 'relative' }}>
            <img src={LOGO} alt="RED" style={{
              width: 46, height: 46,
              filter: 'drop-shadow(0 0 16px rgba(196,18,23,0.55))',
            }} />
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 3 }}>
                <Shield size={13} color="#c41217" />
                <span style={{ fontSize: 16, fontWeight: 800, letterSpacing: -0.3 }}>Painel Administrativo</span>
              </div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>
                {admin?.nome} · {ultimaAtualizacao
                  ? `Atualizado às ${ultimaAtualizacao.toLocaleTimeString('pt-BR')}`
                  : 'Carregando...'}
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, position: 'relative' }}>
            <button
              onClick={carregarDados}
              disabled={atualizando}
              title="Atualizar"
              style={{ ...BTN_RED, width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}
            >
              <RefreshCw size={14} style={{ animation: atualizando ? 'spin 0.8s linear infinite' : 'none' }} />
            </button>
            <button
              onClick={handleLogout}
              title="Sair"
              style={{ ...BTN_RED, width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}
            >
              <LogOut size={14} />
            </button>
          </div>
        </div>

        {/* ── ABAS ── */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 24, overflowX: 'auto', paddingBottom: 2 }}>
          {ABAS.map(({ id, label, icon: Icon }) => {
            const active = aba === id
            return (
              <button key={id} onClick={() => setAba(id)} style={{
                padding: '8px 16px',
                display: 'flex', alignItems: 'center', gap: 7,
                background: active ? 'rgba(196,18,23,0.15)' : 'rgba(255,255,255,0.02)',
                border: active ? '1px solid rgba(196,18,23,0.45)' : '1px solid rgba(255,255,255,0.06)',
                borderRadius: 10,
                color: active ? '#fff' : 'rgba(255,255,255,0.4)',
                cursor: 'pointer', fontSize: 12, fontWeight: active ? 700 : 500,
                whiteSpace: 'nowrap', fontFamily: 'inherit',
                boxShadow: active ? '0 0 14px rgba(196,18,23,0.2)' : 'none',
                transition: 'all 0.2s',
              }}>
                <Icon size={13} color={active ? '#c41217' : 'rgba(255,255,255,0.3)'} />
                {label}
              </button>
            )
          })}
        </div>

        {/* ══ DASHBOARD ══ */}
        {aba === 'dashboard' && (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 14, marginBottom: 20 }}>
              <MetricCard label="Empresas"        valor={tenants.length} color="#3b82f6" icon={Building2} />
              <MetricCard label="Administradores" valor={admins.length}  color="#10b981" icon={Users} />
              <MetricCard label="Logs totais"     valor={logTotal}       color="#f59e0b" icon={ScrollText} />
              <MetricCard
                label="Status geral"
                valor={!systemStatus ? '—' : allOk ? 'OK' : anyError ? 'Falha' : 'Parcial'}
                color={!systemStatus ? '#6b7280' : allOk ? '#22c55e' : anyError ? '#ef4444' : '#f59e0b'}
                icon={Activity}
                sub={systemStatus ? `${Object.values(systemStatus).filter(s => s.ok === true).length}/${Object.values(systemStatus).length} serviços OK` : null}
              />
            </div>

            {systemStatus && (
              <div style={{ ...CARD, padding: '20px 22px', marginBottom: 16 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.35)', letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 14 }}>
                  Saúde dos Serviços
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(220px,1fr))', gap: 10 }}>
                  {Object.entries(systemStatus).map(([id, info]) => <ServiceCard key={id} id={id} info={info} />)}
                </div>
              </div>
            )}

            {tenants.length > 0 && (
              <div style={{ ...CARD, padding: '20px 22px' }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.35)', letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 14 }}>
                  Últimas Empresas
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(200px,1fr))', gap: 10 }}>
                  {tenants.slice(0, 6).map(t => (
                    <div key={t.id} style={{ padding: '12px 14px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 10 }}>
                      <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 4 }}>{t.nome}</div>
                      <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>{t.tipo} · {t.user_count || 0} usuário(s)</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ══ STATUS ══ */}
        {aba === 'status' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
              <div style={{ fontSize: 13, fontWeight: 700 }}>Status da Infraestrutura</div>
              <button onClick={carregarDados} disabled={atualizando}
                style={{ ...BTN_RED, padding: '8px 16px', display: 'flex', alignItems: 'center', gap: 6 }}>
                <RefreshCw size={12} style={{ animation: atualizando ? 'spin 0.8s linear infinite' : 'none' }} />
                Verificar agora
              </button>
            </div>

            {!systemStatus ? (
              <div style={{ padding: 40, textAlign: 'center', color: 'rgba(255,255,255,0.3)' }}>Carregando status...</div>
            ) : (
              <>
                <div style={{
                  padding: '14px 18px', borderRadius: 12, marginBottom: 18,
                  display: 'flex', alignItems: 'center', gap: 12,
                  background: allOk ? 'rgba(34,197,94,0.08)' : anyError ? 'rgba(239,68,68,0.08)' : 'rgba(245,158,11,0.08)',
                  border: `1px solid ${allOk ? 'rgba(34,197,94,0.2)' : anyError ? 'rgba(239,68,68,0.2)' : 'rgba(245,158,11,0.2)'}`,
                }}>
                  {allOk ? <CheckCircle size={18} color="#22c55e" /> : anyError ? <XCircle size={18} color="#ef4444" /> : <AlertCircle size={18} color="#f59e0b" />}
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 13 }}>
                      {allOk ? 'Todos os serviços operacionais' : anyError ? 'Um ou mais serviços com falha' : 'Verificação parcial'}
                    </div>
                    <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>
                      {Object.values(systemStatus).filter(s => s.ok === true).length} de {Object.values(systemStatus).length} serviços OK
                    </div>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(250px,1fr))', gap: 12, marginBottom: 24 }}>
                  {Object.entries(systemStatus).map(([id, info]) => <ServiceCard key={id} id={id} info={info} />)}
                </div>

                {/* Network Info */}
                <div style={{ ...CARD, padding: '20px 22px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.35)', letterSpacing: 1.2, textTransform: 'uppercase' }}>
                      Informações de Rede
                    </div>
                    <button onClick={fetchNetworkInfo} disabled={networkLoading}
                      style={{ ...BTN_RED, padding: '6px 12px', display: 'flex', alignItems: 'center', gap: 5, fontSize: 11 }}>
                      <RefreshCw size={11} style={{ animation: networkLoading ? 'spin 0.8s linear infinite' : 'none' }} />
                      Atualizar
                    </button>
                  </div>

                  {networkLoading && !networkInfo ? (
                    <div style={{ padding: '24px 0', textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontSize: 12 }}>
                      Coletando informações de rede...
                    </div>
                  ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))', gap: 12 }}>
                      {[
                        { key: 'client',   label: 'Você (Admin)',      icon: '👤', color: '#10b981', rgb: '16,185,129'  },
                        { key: 'backend',  label: 'Backend (Fly.io)',  icon: '🖥️', color: '#3b82f6', rgb: '59,130,246'  },
                        { key: 'frontend', label: 'Frontend (Vercel)', icon: '🌐', color: '#a855f7', rgb: '168,85,247'  },
                      ].map(({ key, label, icon, color, rgb }) => {
                        const info = networkInfo?.[key]
                        const geo  = info?.geo
                        const flag = geo?.country_code
                          ? `https://flagcdn.com/20x15/${geo.country_code.toLowerCase()}.png`
                          : null
                        return (
                          <div key={key} style={{
                            padding: '16px 18px',
                            background: `rgba(${rgb},0.05)`,
                            border: `1px solid rgba(${rgb},0.15)`,
                            borderRadius: 12,
                          }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                              <span style={{ fontSize: 16 }}>{icon}</span>
                              <span style={{ fontWeight: 700, fontSize: 12 }}>{label}</span>
                              {flag && <img src={flag} alt={geo.country_code} style={{ marginLeft: 'auto', borderRadius: 2 }} />}
                            </div>
                            {info?.error ? (
                              <div style={{ fontSize: 11, color: '#ef4444' }}>⚠ {info.error}</div>
                            ) : !info ? (
                              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)' }}>Aguardando...</div>
                            ) : (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                  <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', width: 64, flexShrink: 0 }}>IP WAN</span>
                                  <code style={{
                                    fontSize: 12, fontWeight: 700, color,
                                    background: `rgba(${rgb},0.12)`,
                                    padding: '2px 7px', borderRadius: 5, letterSpacing: '0.04em',
                                  }}>{info.ip || '—'}</code>
                                </div>
                                {geo && <>
                                  <div style={{ display: 'flex', gap: 8 }}>
                                    <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', width: 64, flexShrink: 0 }}>Local</span>
                                    <span style={{ fontSize: 11 }}>📍 {[geo.city, geo.region, geo.country].filter(Boolean).join(', ') || '—'}</span>
                                  </div>
                                  {geo.org && (
                                    <div style={{ display: 'flex', gap: 8 }}>
                                      <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', width: 64, flexShrink: 0 }}>Provedor</span>
                                      <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.55)' }}>{geo.org}</span>
                                    </div>
                                  )}
                                  {geo.timezone && (
                                    <div style={{ display: 'flex', gap: 8 }}>
                                      <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', width: 64, flexShrink: 0 }}>Timezone</span>
                                      <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.55)' }}>🕐 {geo.timezone}</span>
                                    </div>
                                  )}
                                </>}
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        )}

        {/* ══ EMPRESAS ══ */}
        {aba === 'empresas' && (
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 18 }}>Empresas Cadastradas ({tenants.length})</div>
            {tenants.length === 0 ? (
              <div style={{ padding: 48, textAlign: 'center', ...CARD, color: 'rgba(255,255,255,0.3)', fontSize: 13, border: '1px dashed rgba(255,255,255,0.06)' }}>
                Nenhuma empresa cadastrada
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(270px,1fr))', gap: 14 }}>
                {tenants.map(t => (
                  <div key={t.id} style={{ ...CARD, padding: '16px 18px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 14 }}>{t.nome}</div>
                        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginTop: 2 }}>/{t.slug}</div>
                      </div>
                      <span style={{ padding: '2px 8px', borderRadius: 20, fontSize: 10, fontWeight: 700, background: 'rgba(196,18,23,0.15)', color: '#dc141e', border: '1px solid rgba(196,18,23,0.25)' }}>
                        {t.tipo}
                      </span>
                    </div>
                    <div style={{ display: 'flex', gap: 14, fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>
                      <span>👥 {t.user_count || 0} usuário(s)</span>
                      {t.cidade && <span>📍 {t.cidade}{t.estado ? `, ${t.estado}` : ''}</span>}
                    </div>
                    {t.criado_em && (
                      <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)', marginTop: 8, borderTop: '1px solid rgba(255,255,255,0.04)', paddingTop: 8 }}>
                        Criado em {new Date(t.criado_em).toLocaleDateString('pt-BR')}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ══ ADMINS ══ */}
        {aba === 'admins' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
              <div style={{ fontSize: 13, fontWeight: 700 }}>Administradores ({admins.length})</div>
              <button onClick={() => navigate('/admin/register')}
                style={{ ...BTN_RED, padding: '8px 16px', display: 'flex', alignItems: 'center', gap: 6 }}>
                + Novo Admin
              </button>
            </div>
            {admins.length === 0 ? (
              <div style={{ padding: 48, textAlign: 'center', ...CARD, color: 'rgba(255,255,255,0.3)', fontSize: 13, border: '1px dashed rgba(255,255,255,0.06)' }}>
                Nenhum administrador cadastrado
              </div>
            ) : (
              <div style={{ display: 'grid', gap: 10 }}>
                {admins.map(adm => {
                  const isSelf = adm.id === admin?.id
                  return (
                    <div key={adm.id} style={{
                      padding: '16px 20px',
                      background: isSelf ? 'rgba(196,18,23,0.07)' : 'rgba(255,255,255,0.02)',
                      border: isSelf ? '1px solid rgba(196,18,23,0.3)' : '1px solid rgba(255,255,255,0.06)',
                      borderRadius: 12,
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      flexWrap: 'wrap', gap: 12,
                      boxShadow: isSelf ? '0 0 14px rgba(196,18,23,0.12)' : 'none',
                    }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                          <span style={{ fontWeight: 700, fontSize: 14 }}>{adm.nome}</span>
                          {isSelf && (
                            <span style={{
                              fontSize: 9, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase',
                              background: 'rgba(196,18,23,0.2)', color: '#dc141e',
                              border: '1px solid rgba(196,18,23,0.35)',
                              borderRadius: 4, padding: '2px 6px',
                            }}>Você</span>
                          )}
                        </div>
                        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>@{adm.username} · {adm.email}</div>
                        <span style={{
                          display: 'inline-block', marginTop: 6,
                          padding: '2px 8px', borderRadius: 20, fontSize: 10, fontWeight: 700,
                          background: adm.ativo ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.12)',
                          color: adm.ativo ? '#22c55e' : '#ef4444',
                          border: `1px solid ${adm.ativo ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)'}`,
                        }}>
                          {adm.ativo ? '✓ Ativo' : '✗ Inativo'}
                        </span>
                      </div>
                      {isSelf ? (
                        <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', fontStyle: 'italic' }}>Sessão atual</span>
                      ) : (
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button onClick={() => desativarAdmin(adm.id)} style={{
                            padding: '6px 12px', display: 'flex', alignItems: 'center', gap: 5,
                            background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)',
                            borderRadius: 8, color: '#f59e0b', cursor: 'pointer',
                            fontSize: 11, fontWeight: 700, fontFamily: 'inherit', transition: 'all 0.2s',
                          }}>
                            <UserX size={12} /> Desativar
                          </button>
                          <button onClick={() => deletarAdmin(adm.id)}
                            style={{ ...BTN_RED, padding: '6px 12px', display: 'flex', alignItems: 'center', gap: 5 }}>
                            <Trash2 size={12} /> Deletar
                          </button>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* ══ LOGS ══ */}
        {aba === 'logs' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
              <div style={{ fontSize: 13, fontWeight: 700 }}>Logs do Sistema ({logTotal})</div>
              <button onClick={limparLogs}
                style={{ ...BTN_RED, padding: '7px 14px', display: 'flex', alignItems: 'center', gap: 5, fontSize: 11 }}>
                <Trash2 size={11} /> Limpar logs antigos
              </button>
            </div>

            <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
              {[
                { key: 'nivel',   options: ['', 'error', 'warning', 'info', 'debug'], labels: ['Todos os níveis', 'Erro', 'Aviso', 'Info', 'Debug'] },
                { key: 'servico', options: ['', 'frontend', 'backend', 'database'],   labels: ['Todos os serviços', 'Frontend', 'Backend', 'Database'] },
              ].map(({ key, options, labels }) => (
                <select key={key} value={logFiltro[key]} onChange={e => setLogFiltro(f => ({ ...f, [key]: e.target.value }))}
                  style={{
                    padding: '7px 10px', background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8,
                    color: '#fff', fontSize: 12, cursor: 'pointer', outline: 'none', fontFamily: 'inherit',
                  }}>
                  {options.map((o, i) => <option key={o} value={o} style={{ background: '#0a0a0a' }}>{labels[i]}</option>)}
                </select>
              ))}
              <input type="text" placeholder="Buscar mensagem..." value={logFiltro.busca}
                onChange={e => setLogFiltro(f => ({ ...f, busca: e.target.value }))}
                style={{
                  padding: '7px 12px', minWidth: 200,
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: 8, color: '#fff', fontSize: 12, outline: 'none', fontFamily: 'inherit',
                }}
                onFocus={e => { e.target.style.borderColor = 'rgba(196,18,23,0.5)' }}
                onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.08)' }}
              />
            </div>

            {logs.length === 0 ? (
              <div style={{ padding: 48, textAlign: 'center', ...CARD, color: 'rgba(255,255,255,0.3)', fontSize: 13, border: '1px dashed rgba(255,255,255,0.06)' }}>
                Nenhum log encontrado
              </div>
            ) : (
              <div style={{ ...CARD, overflow: 'hidden' }}>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                        {['Nível', 'Serviço', 'Mensagem', 'Data'].map(h => (
                          <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: 1 }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {logs.map((log, i) => (
                        <tr key={log.id || i} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)', background: i % 2 === 0 ? 'rgba(255,255,255,0.01)' : 'transparent' }}>
                          <td style={{ padding: '9px 14px' }}>
                            <span style={{
                              padding: '2px 7px', borderRadius: 4, fontSize: 10, fontWeight: 700,
                              color: LOG_COLORS[log.level] || 'rgba(255,255,255,0.4)',
                              background: `${LOG_COLORS[log.level] || 'rgba(255,255,255,0.4)'}18`,
                            }}>{log.level}</span>
                          </td>
                          <td style={{ padding: '9px 14px', fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>{log.service}</td>
                          <td style={{ padding: '9px 14px', fontSize: 12, maxWidth: 400, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{log.message}</td>
                          <td style={{ padding: '9px 14px', fontSize: 11, color: 'rgba(255,255,255,0.3)', whiteSpace: 'nowrap' }}>
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

        <div style={{ marginTop: 32, textAlign: 'center', fontSize: 10, color: 'rgba(255,255,255,0.15)', letterSpacing: 0.3 }}>
          RED System Corporation™ © 2026. Todos os direitos reservados.
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        * { box-sizing: border-box; }
        select option { background: #0a0a0a; }
      `}</style>
    </div>
  )
}
