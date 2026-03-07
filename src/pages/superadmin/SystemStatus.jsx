/**
 * SystemStatus.jsx — Dashboard de saúde do sistema para superadmin.
 * FIX: usa instância `api` (axios com interceptors de 401/refresh) em vez de fetch() cru.
 * FIX: validação de tipo antes de renderizar (evita crash quando API retorna 401/erro).
 */
import { useState, useEffect, useCallback } from 'react'
import {
  CheckCircle, XCircle, RefreshCw,
  Server, Database, Globe, GitBranch, Cloud, Building2,
  Users, ShoppingCart,
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import api from '../../services/api'

const SERVICE_ICON = {
  backend:      Server,
  supabase:     Database,
  vercel:       Globe,
  github:       GitBranch,
  huggingface:  Cloud,
}

function StatusDot({ ok }) {
  if (ok === true)  return <div style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--green)', boxShadow: '0 0 6px var(--green)', flexShrink: 0 }} />
  if (ok === false) return <div style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--red)',   boxShadow: '0 0 6px var(--red)',   flexShrink: 0 }} />
  return <div style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--yellow)', flexShrink: 0 }} />
}

function ServiceCard({ id, info }) {
  // Garante que info é sempre um objeto válido — evita crash se API retorna string/null
  const safeInfo = (info && typeof info === 'object' && !Array.isArray(info)) ? info : { ok: null, label: id }
  const Icon = SERVICE_ICON[id] || Server
  const statusColor = safeInfo.ok === true ? 'var(--green)' : safeInfo.ok === false ? 'var(--red)' : 'var(--yellow)'
  const statusLabel = safeInfo.ok === true ? 'Operacional' : safeInfo.ok === false ? 'Falha' : 'Não configurado'

  return (
    <div className="card" style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
      <div style={{ width: 44, height: 44, borderRadius: 12, background: `${statusColor}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <Icon size={20} color={statusColor} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <StatusDot ok={safeInfo.ok} />
          <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>{safeInfo.label || id}</span>
        </div>
        <div style={{ fontSize: 11, color: statusColor, marginTop: 3, fontWeight: 600 }}>
          {statusLabel}
          {safeInfo.latency_ms > 0 && <span style={{ color: 'var(--muted)', fontWeight: 400 }}> · {safeInfo.latency_ms}ms</span>}
        </div>
        {safeInfo.error && <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{safeInfo.error}</div>}
      </div>
    </div>
  )
}

export default function SystemStatus() {
  const [status,     setStatus]     = useState(null)
  const [tenants,    setTenants]    = useState([])
  const [loading,    setLoading]    = useState(true)
  const [loadError,  setLoadError]  = useState(null)
  const [lastCheck,  setLastCheck]  = useState(null)
  const [refreshing, setRefreshing] = useState(false)

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true)
    else setRefreshing(true)
    setLoadError(null)

    try {
      // USA api (axios) com interceptors de 401 → refresh automático → redirect para /login
      const [statusRes, tenantsRes] = await Promise.all([
        api.get('/api/superadmin/status'),
        api.get('/api/superadmin/tenants'),
      ])

      // Valida shape antes de salvar no estado
      const sp = statusRes.data?.data
      setStatus((sp && typeof sp === 'object' && !Array.isArray(sp)) ? sp : null)

      const tp = tenantsRes.data?.data
      setTenants(Array.isArray(tp) ? tp : [])

      setLastCheck(new Date())
    } catch (e) {
      if (e?.response?.status !== 401) {
        setLoadError(e?.response?.data?.error || 'Erro ao carregar status')
      }
      // 401 → interceptor do api.js já trata (refresh ou redirect para /login)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => { load() }, [load])
  useEffect(() => {
    const t = setInterval(() => load(true), 30000)
    return () => clearInterval(t)
  }, [load])

  const total   = tenants.length
  const ativos  = tenants.filter(t => t.ativo !== false).length
  const rests   = tenants.filter(t => t.tipo === 'restaurante').length
  const concesp = tenants.filter(t => t.tipo === 'concessionaria').length
  const entries = status ? Object.entries(status) : []
  const anyFail = entries.some(([, s]) => s?.ok === false)

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300, flexDirection: 'column', gap: 12, color: 'var(--muted)' }}>
      <div style={{ width: 32, height: 32, border: '3px solid var(--border)', borderTopColor: 'var(--red)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <span style={{ fontSize: 13 }}>Verificando sistema...</span>
      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  if (loadError) return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 300, gap: 12 }}>
      <XCircle size={40} color="var(--red)" />
      <div style={{ fontSize: 14, color: 'var(--dim)' }}>{loadError}</div>
      <button className="btn btn-outline btn-sm" onClick={() => load()}>Tentar novamente</button>
    </div>
  )

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">⚡ Status do Sistema</h1>
          <p className="page-subtitle">
            {lastCheck ? `Última verificação ${formatDistanceToNow(lastCheck, { addSuffix: true, locale: ptBR })}` : 'Verificando...'}
          </p>
        </div>
        <button className="btn btn-outline btn-sm" onClick={() => load(true)} disabled={refreshing}>
          <RefreshCw size={13} style={refreshing ? { animation: 'spin 1s linear infinite' } : {}} />
          Atualizar
        </button>
      </div>

      {entries.length > 0 && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 12,
          padding: '14px 20px', borderRadius: 12, marginBottom: 24,
          background: anyFail ? 'rgba(232,25,44,0.08)' : 'rgba(34,197,94,0.08)',
          border: `1px solid ${anyFail ? 'rgba(232,25,44,0.25)' : 'rgba(34,197,94,0.25)'}`,
        }}>
          {anyFail ? <XCircle size={20} color="var(--red)" /> : <CheckCircle size={20} color="var(--green)" />}
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: anyFail ? 'var(--red)' : 'var(--green)' }}>
              {anyFail ? 'Degradação detectada' : 'Todos os sistemas operacionais'}
            </div>
            <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>
              {entries.length} serviços · atualizado a cada 30s
            </div>
          </div>
        </div>
      )}

      {entries.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 12, marginBottom: 32 }}>
          {entries.map(([id, info]) => <ServiceCard key={id} id={id} info={info} />)}
        </div>
      )}

      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 12 }}>
          📊 Métricas de Empresas
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 10 }}>
          {[
            { label: 'Total',           value: total,         color: 'var(--text)',   icon: Building2 },
            { label: 'Ativas',          value: ativos,        color: 'var(--green)',  icon: CheckCircle },
            { label: 'Inativas',        value: total - ativos,color: 'var(--muted)',  icon: XCircle },
            { label: 'Restaurantes',    value: rests,         color: 'var(--yellow)', icon: ShoppingCart },
            { label: 'Concessionárias', value: concesp,       color: 'var(--blue)',   icon: Users },
          ].map(({ label, value, color, icon: Icon }) => (
            <div key={label} className="card" style={{ padding: '14px 16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <Icon size={14} color={color} />
                <span style={{ fontSize: 10, color: 'var(--muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1 }}>{label}</span>
              </div>
              <div style={{ fontSize: 28, fontWeight: 900, fontFamily: 'Bebas Neue', color, letterSpacing: 1 }}>{value}</div>
            </div>
          ))}
        </div>
      </div>

      {tenants.length > 0 && (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--border)', fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 1 }}>
            Empresas Cadastradas
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  {['Empresa', 'Tipo', 'Usuários', 'Criada em', 'Status'].map(h => (
                    <th key={h} style={{ padding: '8px 16px', textAlign: 'left', fontSize: 10, color: 'var(--muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {tenants.map(t => (
                  <tr key={t.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                    <td style={{ padding: '10px 16px' }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{t.nome}</div>
                      <div style={{ fontSize: 10, color: 'var(--muted)' }}>{t.email || '—'}</div>
                    </td>
                    <td style={{ padding: '10px 16px', fontSize: 12, color: 'var(--dim)', textTransform: 'capitalize' }}>{t.tipo || 'comercio'}</td>
                    <td style={{ padding: '10px 16px', fontSize: 12, color: 'var(--dim)' }}>{t.user_count ?? '—'}</td>
                    <td style={{ padding: '10px 16px', fontSize: 11, color: 'var(--muted)' }}>
                      {t.created_at ? new Date(t.created_at).toLocaleDateString('pt-BR') : '—'}
                    </td>
                    <td style={{ padding: '10px 16px' }}>
                      <span className={`badge badge-${t.ativo !== false ? 'green' : 'gray'}`}>
                        {t.ativo !== false ? 'Ativa' : 'Inativa'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}
