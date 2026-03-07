/**
 * CaixaSessao.jsx — Abertura e Fechamento de Caixa
 *
 * Fluxo:
 *   - Caixa fechado → botão "Abrir Caixa" com fundo de troco
 *   - Caixa aberto  → métricas em tempo real + botão "Fechar Caixa"
 *   - Histórico de sessões anteriores
 */
import { useEffect, useState, useCallback } from 'react'
import {
  DollarSign, Clock, TrendingUp, Package, CheckCircle,
  AlertCircle, History, Lock, Unlock, RefreshCw,
} from 'lucide-react'
import api from '../../services/api'
import { formatMoney } from '../../utils/format'
import useAuthStore from '../../store/authStore'
import { format, formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import toast from 'react-hot-toast'

function timeStr(ts) {
  if (!ts) return '—'
  try { return format(new Date(ts), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR }) }
  catch { return '—' }
}
function duration(a, b) {
  if (!a || !b) return '—'
  try {
    const ms = new Date(b) - new Date(a)
    const h = Math.floor(ms / 3600000)
    const m = Math.floor((ms % 3600000) / 60000)
    return h > 0 ? `${h}h ${m}min` : `${m}min`
  } catch { return '—' }
}

const FORMA_ICON = {
  dinheiro: '💵',
  pix: '📱',
  cartão: '💳',
  fiado: '📋',
  outros: '💰',
}

export default function CaixaSessao() {
  const { papel } = useAuthStore()
  const [sessao, setSessao] = useState(null)       // sessão ativa ou null
  const [ultimaSessao, setUltimaSessao] = useState(null)
  const [historico, setHistorico] = useState([])
  const [loading, setLoading] = useState(true)
  const [showHistorico, setShowHistorico] = useState(false)

  // Modais
  const [abrirModal, setAbrirModal] = useState(false)
  const [fecharModal, setFecharModal] = useState(false)
  const [fundo, setFundo] = useState('')
  const [obsAbrir, setObsAbrir] = useState('')
  const [obsFechar, setObsFechar] = useState('')
  const [saving, setSaving] = useState(false)

  const isManager = ['dono', 'gerente'].includes(papel)

  const load = useCallback(async () => {
    try {
      const { data } = await api.get('/api/caixa/sessao')
      const d = data.data || data
      if (d.aberto) {
        setSessao(d.sessao)
        setUltimaSessao(null)
      } else {
        setSessao(null)
        setUltimaSessao(d.ultima_sessao)
      }
    } catch {
      toast.error('Erro ao verificar sessão do caixa')
    } finally { setLoading(false) }
  }, [])

  const loadHistorico = useCallback(async () => {
    try {
      const { data } = await api.get('/api/caixa/historico')
      setHistorico(data.data || data || [])
    } catch {}
  }, [])

  useEffect(() => { load() }, [load])
  useEffect(() => {
    if (showHistorico) loadHistorico()
  }, [showHistorico, loadHistorico])

  // Polling para atualizar métricas em tempo real (a cada 30s)
  useEffect(() => {
    if (!sessao) return
    const t = setInterval(load, 30000)
    return () => clearInterval(t)
  }, [sessao, load])

  const handleAbrir = async () => {
    setSaving(true)
    try {
      await api.post('/api/caixa/abrir', {
        fundo_troco: parseFloat(fundo || 0),
        obs: obsAbrir || undefined,
      })
      toast.success('Caixa aberto! Bom expediente ✅')
      setAbrirModal(false)
      setFundo('')
      setObsAbrir('')
      await load()
    } catch (e) {
      toast.error(e.response?.data?.error || 'Erro ao abrir caixa')
    } finally { setSaving(false) }
  }

  const handleFechar = async () => {
    setSaving(true)
    try {
      await api.post('/api/caixa/fechar', { obs: obsFechar || undefined })
      toast.success('Caixa fechado! Até amanhã 👋')
      setFecharModal(false)
      setObsFechar('')
      await load()
    } catch (e) {
      toast.error(e.response?.data?.error || 'Erro ao fechar caixa')
    } finally { setSaving(false) }
  }

  if (loading) return (
    <div className="loading-page"><div className="spinner" /><span>Verificando caixa...</span></div>
  )

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">💰 Caixa</h1>
          <p className="page-subtitle">
            {sessao ? 'Expediente em andamento' : 'Caixa fechado'}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-outline btn-sm" onClick={load}>
            <RefreshCw size={13} /> Atualizar
          </button>
          {sessao && isManager && (
            <button className="btn btn-danger" onClick={() => setFecharModal(true)}>
              <Lock size={14} /> Fechar Caixa
            </button>
          )}
          {!sessao && isManager && (
            <button className="btn btn-primary" onClick={() => setAbrirModal(true)}>
              <Unlock size={14} /> Abrir Caixa
            </button>
          )}
        </div>
      </div>

      {/* STATUS CARD */}
      {sessao ? (
        <AbertoCard sessao={sessao} />
      ) : (
        <FechadoCard ultimaSessao={ultimaSessao} onAbrir={isManager ? () => setAbrirModal(true) : null} />
      )}

      {/* HISTÓRICO */}
      <div style={{ marginTop: 24 }}>
        <button
          onClick={() => setShowHistorico(v => !v)}
          style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--dim)', fontSize: 13, padding: '4px 0', fontFamily: 'inherit', fontWeight: 600 }}>
          <History size={15} />
          {showHistorico ? 'Esconder histórico' : 'Ver histórico de sessões'}
        </button>

        {showHistorico && (
          <div className="card" style={{ marginTop: 12, padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--border)', fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 1 }}>
              Sessões Anteriores
            </div>
            {historico.length === 0 ? (
              <div className="empty-state" style={{ padding: 32 }}><p>Nenhuma sessão registrada.</p></div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border)' }}>
                      {['Abertura', 'Fechamento', 'Duração', 'Fundo', 'Total', 'Dinheiro', 'PIX', 'Cartão', 'Fiado', 'Status'].map(h => (
                        <th key={h} style={{ padding: '8px 14px', textAlign: 'left', fontSize: 10, color: 'var(--muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, whiteSpace: 'nowrap' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {historico.map(s => (
                      <tr key={s.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                        <td style={{ padding: '10px 14px', color: 'var(--dim)', whiteSpace: 'nowrap' }}>{timeStr(s.aberto_at)}</td>
                        <td style={{ padding: '10px 14px', color: 'var(--dim)', whiteSpace: 'nowrap' }}>{s.fechado_at ? timeStr(s.fechado_at) : <span style={{ color: 'var(--green)' }}>Em andamento</span>}</td>
                        <td style={{ padding: '10px 14px', color: 'var(--dim)' }}>{duration(s.aberto_at, s.fechado_at)}</td>
                        <td style={{ padding: '10px 14px', color: 'var(--dim)' }}>{formatMoney(s.fundo_troco || 0)}</td>
                        <td style={{ padding: '10px 14px', color: 'var(--text)', fontWeight: 700 }}>{formatMoney(s.total_vendas || 0)}</td>
                        <td style={{ padding: '10px 14px', color: 'var(--green)' }}>{formatMoney(s.total_dinheiro || 0)}</td>
                        <td style={{ padding: '10px 14px', color: 'var(--blue)' }}>{formatMoney(s.total_pix || 0)}</td>
                        <td style={{ padding: '10px 14px', color: 'var(--yellow)' }}>{formatMoney(s.total_cartao || 0)}</td>
                        <td style={{ padding: '10px 14px', color: 'var(--muted)' }}>{formatMoney(s.total_fiado || 0)}</td>
                        <td style={{ padding: '10px 14px' }}>
                          <span className={`badge badge-${s.status === 'aberto' ? 'green' : 'gray'}`}>
                            {s.status === 'aberto' ? 'Aberto' : 'Fechado'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* MODAL ABRIR */}
      {abrirModal && (
        <div className="modal-overlay" onClick={() => setAbrirModal(false)}>
          <div className="modal" style={{ maxWidth: 400 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">🔓 Abrir Caixa</span>
              <button className="modal-close" onClick={() => setAbrirModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div style={{ fontSize: 13, color: 'var(--dim)', marginBottom: 4 }}>
                Informe o fundo de troco disponível no caixa para começar o expediente.
              </div>
              <div className="field">
                <label className="label">Fundo de Troco (R$)</label>
                <input className="input" type="number" step="0.50" min="0" value={fundo}
                  onChange={e => setFundo(e.target.value)} placeholder="Ex: 50,00" autoFocus />
              </div>
              <div className="field">
                <label className="label">Observação (opcional)</label>
                <input className="input" value={obsAbrir} onChange={e => setObsAbrir(e.target.value)}
                  placeholder="Ex: Expediente normal" />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setAbrirModal(false)}>Cancelar</button>
              <button className="btn btn-primary" onClick={handleAbrir} disabled={saving}>
                {saving ? '...' : <><Unlock size={14} /> Abrir Caixa</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL FECHAR */}
      {fecharModal && sessao && (
        <div className="modal-overlay" onClick={() => setFecharModal(false)}>
          <div className="modal" style={{ maxWidth: 480 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">🔒 Fechar Caixa</span>
              <button className="modal-close" onClick={() => setFecharModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div style={{ background: 'var(--bg4)', borderRadius: 10, padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>
                  Resumo do Expediente
                </div>
                <ResumoRow label="Abertura" value={timeStr(sessao.aberto_at)} />
                <ResumoRow label="Duração" value={duration(sessao.aberto_at, new Date().toISOString())} />
                <ResumoRow label="Fundo inicial" value={formatMoney(sessao.fundo_troco || 0)} />
                <div style={{ height: 1, background: 'var(--border)', margin: '4px 0' }} />
                <ResumoRow label="Total Vendas" value={formatMoney(sessao.total_vendas || 0)} highlight="var(--green)" />
                <ResumoRow label="💵 Dinheiro" value={formatMoney(sessao.total_dinheiro || 0)} />
                <ResumoRow label="📱 PIX" value={formatMoney(sessao.total_pix || 0)} />
                <ResumoRow label="💳 Cartão" value={formatMoney(sessao.total_cartao || 0)} />
                <ResumoRow label="📋 Fiado" value={formatMoney(sessao.total_fiado || 0)} />
                {(sessao.num_vendas !== undefined) && (
                  <ResumoRow label="Pedidos fechados" value={sessao.num_vendas} />
                )}
              </div>
              <div className="field">
                <label className="label">Observação de Fechamento (opcional)</label>
                <input className="input" value={obsFechar} onChange={e => setObsFechar(e.target.value)}
                  placeholder="Ex: Fechamento normal do dia" />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setFecharModal(false)}>Cancelar</button>
              <button className="btn btn-danger" onClick={handleFechar} disabled={saving}
                style={{ background: 'var(--red)', borderColor: 'var(--red)', color: '#fff' }}>
                {saving ? '...' : <><Lock size={14} /> Confirmar Fechamento</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Sub-componentes ────────────────────────────────────────────────────────────

function AbertoCard({ sessao }) {
  const abridoAgo = sessao?.aberto_at
    ? formatDistanceToNow(new Date(sessao.aberto_at), { addSuffix: true, locale: ptBR })
    : '—'

  return (
    <div>
      {/* Status banner */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '14px 20px', borderRadius: 12, marginBottom: 20,
        background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.25)',
      }}>
        <div style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--green)', boxShadow: '0 0 8px var(--green)', flexShrink: 0 }} />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--green)' }}>Caixa Aberto</div>
          <div style={{ fontSize: 11, color: 'var(--muted)' }}>
            Expediente iniciado {abridoAgo} · {timeStr(sessao.aberto_at)}
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 10, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 1 }}>Fundo de Troco</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)', fontFamily: 'Bebas Neue' }}>
            {formatMoney(sessao.fundo_troco || 0)}
          </div>
        </div>
      </div>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12, marginBottom: 20 }}>
        <KpiBox label="Total do Dia" value={formatMoney(sessao.total_vendas || 0)} color="var(--green)" icon="💰" />
        <KpiBox label="💵 Dinheiro" value={formatMoney(sessao.total_dinheiro || 0)} color="var(--text)" icon={null} />
        <KpiBox label="📱 PIX" value={formatMoney(sessao.total_pix || 0)} color="var(--blue)" icon={null} />
        <KpiBox label="💳 Cartão" value={formatMoney(sessao.total_cartao || 0)} color="var(--yellow)" icon={null} />
        <KpiBox label="📋 Fiado" value={formatMoney(sessao.total_fiado || 0)} color="var(--muted)" icon={null} />
        {sessao.num_vendas !== undefined && (
          <KpiBox label="Pedidos Fechados" value={sessao.num_vendas} color="var(--text)" icon="🧾" />
        )}
      </div>

      {/* Caixa físico estimado */}
      <div className="card" style={{ padding: '14px 18px' }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>
          💵 Estimativa no Caixa Físico
        </div>
        <div style={{ fontSize: 28, fontWeight: 900, fontFamily: 'Bebas Neue', color: 'var(--text)', letterSpacing: 1 }}>
          {formatMoney((sessao.fundo_troco || 0) + (sessao.total_dinheiro || 0))}
        </div>
        <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>
          Fundo ({formatMoney(sessao.fundo_troco || 0)}) + Dinheiro recebido ({formatMoney(sessao.total_dinheiro || 0)})
        </div>
      </div>
    </div>
  )
}

function FechadoCard({ ultimaSessao, onAbrir }) {
  return (
    <div>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 14, padding: '20px 24px',
        borderRadius: 14, border: '1px solid rgba(255,255,255,0.07)',
        background: 'var(--bg3)', marginBottom: 20,
      }}>
        <div style={{ width: 48, height: 48, borderRadius: 14, background: 'var(--bg4)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Lock size={22} color="var(--muted)" />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--dim)' }}>Caixa Fechado</div>
          <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 3 }}>
            {ultimaSessao
              ? `Último fechamento: ${timeStr(ultimaSessao.fechado_at)}`
              : 'Nenhuma sessão anterior registrada'
            }
          </div>
        </div>
        {onAbrir && (
          <button className="btn btn-primary" onClick={onAbrir}>
            <Unlock size={14} /> Abrir Caixa
          </button>
        )}
      </div>

      {ultimaSessao && (
        <div className="card" style={{ padding: '16px 20px' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>
            Última Sessão — {timeStr(ultimaSessao.aberto_at)}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 8 }}>
            <MiniKpi label="Total Vendas" value={formatMoney(ultimaSessao.total_vendas || 0)} />
            <MiniKpi label="Dinheiro" value={formatMoney(ultimaSessao.total_dinheiro || 0)} />
            <MiniKpi label="PIX" value={formatMoney(ultimaSessao.total_pix || 0)} />
            <MiniKpi label="Cartão" value={formatMoney(ultimaSessao.total_cartao || 0)} />
            <MiniKpi label="Fiado" value={formatMoney(ultimaSessao.total_fiado || 0)} />
            <MiniKpi label="Duração" value={duration(ultimaSessao.aberto_at, ultimaSessao.fechado_at)} />
          </div>
        </div>
      )}
    </div>
  )
}

function KpiBox({ label, value, color, icon }) {
  return (
    <div className="card" style={{ padding: '14px 18px' }}>
      <div style={{ fontSize: 10, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6, fontWeight: 700 }}>
        {label}
      </div>
      <div style={{ fontSize: 26, fontWeight: 900, fontFamily: 'Bebas Neue', color, letterSpacing: 1 }}>
        {value}
      </div>
    </div>
  )
}

function MiniKpi({ label, value }) {
  return (
    <div style={{ padding: '10px 12px', background: 'var(--bg4)', borderRadius: 8 }}>
      <div style={{ fontSize: 10, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4, fontWeight: 600 }}>{label}</div>
      <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', fontFamily: 'Bebas Neue' }}>{value}</div>
    </div>
  )
}

function ResumoRow({ label, value, highlight }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13 }}>
      <span style={{ color: 'var(--muted)' }}>{label}</span>
      <span style={{ fontWeight: 700, color: highlight || 'var(--text)' }}>{value}</span>
    </div>
  )
}
