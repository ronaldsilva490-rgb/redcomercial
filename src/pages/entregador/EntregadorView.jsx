/**
 * EntregadorView — Dashboard do entregador. v6
 *
 * CORREÇÕES:
 * - Exibe claramente se delivery é pré-pago (sem mensagem de "não pago")
 * - Mostra notificação de cancelamento para entregador
 * - Melhoria: ao confirmar entrega de pré-pago, fecha automaticamente
 * - Fix visual: pré-pago não mostra aviso de "não pago" no card
 */
import { useEffect, useState, useCallback } from 'react'
import { Bike, MapPin, Phone, RefreshCw, ChevronRight, Package, CheckCircle2 } from 'lucide-react'
import api from '../../services/api'
import { formatMoney } from '../../utils/format'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import useNotifStore from '../../store/notifStore'
import toast from 'react-hot-toast'

function timeAgo(ts) {
  try { return formatDistanceToNow(new Date(ts), { addSuffix: true, locale: ptBR }) }
  catch { return '' }
}

const STATUS_CFG = {
  pronto:   { label: 'Pronto p/ Entrega', color: 'var(--green)',  bg: 'rgba(34,197,94,0.12)',  icon: '📦', border: 'rgba(34,197,94,0.4)' },
  saindo:   { label: 'A Caminho',         color: '#F97316',       bg: 'rgba(249,115,22,0.12)', icon: '🛵', border: 'rgba(249,115,22,0.35)' },
  entregue: { label: 'Entregue',          color: 'var(--muted)',  bg: 'var(--bg4)',             icon: '✅', border: 'var(--border)' },
}

export default function EntregadorView() {
  const [orders,   setOrders]   = useState([])
  const [loading,  setLoading]  = useState(true)
  const [updating, setUpdating] = useState({})
  const { items: notifs, markRead } = useNotifStore()

  const urgentNotifs = notifs.filter(n => !n.lida && (n.tipo === 'pedido_pronto' || n.tipo === 'pedido_cancelado'))

  const load = useCallback(async () => {
    try {
      const [r1, r2, r3] = await Promise.all([
        api.get('/api/orders', { params: { status: 'pronto',   delivery: '1' } }),
        api.get('/api/orders', { params: { status: 'saindo',   delivery: '1' } }),
        api.get('/api/orders', { params: { status: 'entregue', delivery: '1' } }),
      ])

      const all = [
        ...(r1.data.data || []).map(o => ({ ...o, _status: 'pronto' })),
        ...(r2.data.data || []).map(o => ({ ...o, _status: 'saindo' })),
        ...(r3.data.data || []).slice(0, 5).map(o => ({ ...o, _status: 'entregue' })),
      ]

      const details = await Promise.all(
        all.map(o =>
          api.get(`/api/orders/${o.id}`)
            .then(r => ({ ...r.data.data, _status: o._status }))
            .catch(() => null)
        )
      )
      setOrders(details.filter(Boolean))
    } catch { /* silencioso */ }
    finally { setLoading(false) }
  }, [])

  useEffect(() => {
    load()
    const t = setInterval(load, 10000)
    return () => clearInterval(t)
  }, [load])

  const handleStatus = async (orderId, status) => {
    setUpdating(u => ({ ...u, [orderId]: true }))
    try {
      await api.patch(`/api/orders/${orderId}/status`, { status })
      if (status === 'saindo') {
        toast.success('Saindo do forno para a casa do cliente! Vrumm 🛵')
      } else if (status === 'entregue') {
        // Verifica se é pré-pago para mensagem diferente
        const order = orders.find(o => o.id === orderId)
        if (order?.delivery_pago) {
          toast.success('✅ Entrega confirmada! Pedido pré-pago — caixa notificado para fechar.')
        } else {
          toast.success('✅ Entrega confirmada! Caixa notificado para receber pagamento.')
        }
      }
      await load()
    } catch (e) {
      toast.error(e.response?.data?.error || 'Erro ao atualizar')
    } finally {
      setUpdating(u => ({ ...u, [orderId]: false }))
    }
  }

  if (loading) return <div className="loading-page"><div className="spinner" /> Carregando...</div>

  const ativos   = orders.filter(o => o._status !== 'entregue')
  const entregues = orders.filter(o => o._status === 'entregue')

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Bike size={22} color="var(--red)" /> Entregas
          </div>
          <div className="page-subtitle">{ativos.length} em andamento · Auto-atualiza a cada 10s</div>
        </div>
        <button className="btn btn-outline btn-sm" onClick={load}><RefreshCw size={13} /> Atualizar</button>
      </div>

      {/* Alertas */}
      {urgentNotifs.map(n => (
        <div key={n.id} onClick={() => { markRead(n.id); load() }}
          style={{
            background: n.tipo === 'pedido_cancelado' ? 'rgba(239,68,68,0.10)' : 'rgba(34,197,94,0.10)',
            border: `1px solid ${n.tipo === 'pedido_cancelado' ? 'rgba(239,68,68,0.3)' : 'rgba(34,197,94,0.3)'}`,
            borderRadius: 10, padding: '12px 16px', marginBottom: 10, cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 10,
          }}>
          <span style={{ fontSize: 22 }}>{n.tipo === 'pedido_cancelado' ? '❌' : '📦'}</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: 13 }}>{n.titulo}</div>
            {n.mensagem && <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>{n.mensagem}</div>}
          </div>
          <span style={{ fontSize: 11, fontWeight: 700, color: n.tipo === 'pedido_cancelado' ? 'var(--red)' : 'var(--green)' }}>
            Toque para ver
          </span>
        </div>
      ))}

      {orders.length === 0 ? (
        <div className="empty-state">
          <Bike size={48} style={{ opacity: 0.3 }} />
          <h3>Nenhuma entrega no momento</h3>
          <p>Pedidos prontos para entrega aparecem aqui automaticamente</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* Pedidos ativos */}
          {ativos.map(order => {
            const cfg  = STATUS_CFG[order._status] || STATUS_CFG.pronto
            const busy = updating[order.id]
            const prepago = order.delivery_pago

            return (
              <div key={order.id} style={{
                background: 'var(--bg2)', border: `2px solid ${cfg.border}`,
                borderRadius: 14, overflow: 'hidden',
              }}>
                {/* Header */}
                <div style={{ padding: '14px 16px', background: cfg.bg, borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                  <div style={{ fontSize: 30 }}>{cfg.icon}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                      <span style={{ fontWeight: 800, fontSize: 16 }}>Pedido #{order.numero_pedido}</span>
                      <span style={{ fontSize: 10, fontWeight: 700, color: cfg.color, background: `${cfg.color}20`, border: `1px solid ${cfg.color}40`, padding: '2px 8px', borderRadius: 10 }}>
                        {cfg.label}
                      </span>
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--muted)' }}>{timeAgo(order.created_at)}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: 900, fontSize: 20, fontFamily: 'Bebas Neue', color: 'var(--green)', letterSpacing: 1 }}>
                      {formatMoney(order.total)}
                    </div>
                    {/* Status de pagamento — claro para o entregador */}
                    <div style={{ fontSize: 10, fontWeight: 700, marginTop: 2,
                      color: prepago ? 'var(--green)' : 'var(--yellow)' }}>
                      {prepago ? '✅ PRÉ-PAGO' : '💵 COBRAR NA ENTREGA'}
                    </div>
                  </div>
                </div>

                {/* Endereço */}
                <div style={{ padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 6 }}>
                    <MapPin size={14} color="var(--red)" style={{ marginTop: 2, flexShrink: 0 }} />
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 14 }}>{order.delivery_nome || 'Cliente'}</div>
                      <div style={{ fontSize: 12, color: 'var(--dim)', marginTop: 2 }}>
                        {order.delivery_end}
                        {order.delivery_compl && `, ${order.delivery_compl}`}
                        {order.delivery_bairro && ` — ${order.delivery_bairro}`}
                      </div>
                    </div>
                  </div>
                  {order.delivery_tel && (
                    <a href={`tel:${order.delivery_tel}`}
                      style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--blue)', textDecoration: 'none' }}>
                      <Phone size={12} /> {order.delivery_tel}
                    </a>
                  )}
                  {order.delivery_obs && (
                    <div style={{ marginTop: 8, fontSize: 11, color: 'var(--yellow)', background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 6, padding: '6px 10px' }}>
                      📝 {order.delivery_obs}
                    </div>
                  )}
                </div>

                {/* Itens */}
                <div style={{ padding: '10px 16px', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>Itens</div>
                  {(order.items || []).map(item => (
                    <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, paddingBottom: 3 }}>
                      <span><strong>{item.qtd}×</strong> {item.nome}</span>
                      <span style={{ color: 'var(--muted)' }}>{formatMoney(item.subtotal)}</span>
                    </div>
                  ))}
                </div>

                {/* Aviso de cobrança — só para NÃO pré-pagos */}
                {!prepago && (
                  <div style={{ padding: '8px 16px', background: 'rgba(245,158,11,0.08)', borderBottom: '1px solid rgba(255,255,255,0.04)', fontSize: 11, color: '#F59E0B' }}>
                    💵 Cobre <strong>{formatMoney(order.total)}</strong> na entrega. Informe o caixa após receber.
                  </div>
                )}
                {prepago && (
                  <div style={{ padding: '8px 16px', background: 'rgba(34,197,94,0.06)', borderBottom: '1px solid rgba(255,255,255,0.04)', fontSize: 11, color: 'var(--green)' }}>
                    ✅ Pedido já pago. Apenas faça a entrega.
                  </div>
                )}

                {/* Botões */}
                <div style={{ padding: '12px 16px' }}>
                  {order._status === 'pronto' && (
                    <button className="btn btn-primary" style={{ width: '100%' }}
                      onClick={() => handleStatus(order.id, 'saindo')}
                      disabled={busy}>
                      {busy
                        ? <><div className="spinner" style={{ width: 14, height: 14 }} /> Atualizando...</>
                        : <>🛵 Sair para Entrega <ChevronRight size={13} /></>
                      }
                    </button>
                  )}
                  {order._status === 'saindo' && (
                    <button className="btn btn-primary" style={{ width: '100%', background: 'var(--green)', borderColor: 'var(--green)' }}
                      onClick={() => handleStatus(order.id, 'entregue')}
                      disabled={busy}>
                      {busy
                        ? <><div className="spinner" style={{ width: 14, height: 14 }} /> Confirmando...</>
                        : <>✅ Confirmar Entrega</>
                      }
                    </button>
                  )}
                </div>
              </div>
            )
          })}

          {/* Entregues recentes */}
          {entregues.length > 0 && (
            <>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 1, marginTop: 8, paddingLeft: 4 }}>
                Entregues recentes
              </div>
              {entregues.map(order => (
                <div key={order.id} style={{
                  background: 'var(--bg2)', border: '1px solid var(--border)',
                  borderRadius: 12, padding: '12px 16px', opacity: 0.65,
                  display: 'flex', alignItems: 'center', gap: 12,
                }}>
                  <CheckCircle2 size={20} color="var(--green)" />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 13 }}>#{order.numero_pedido} — {order.delivery_nome}</div>
                    <div style={{ fontSize: 11, color: 'var(--muted)' }}>{order.delivery_end} · {timeAgo(order.created_at)}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ fontWeight: 700, color: 'var(--green)', fontSize: 13 }}>{formatMoney(order.total)}</span>
                    {order.delivery_pago && <div style={{ fontSize: 9, color: 'var(--green)' }}>✅ Pré-pago</div>}
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  )
}
