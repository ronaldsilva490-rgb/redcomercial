/**
 * CozinhaView — Dashboard do cozinheiro. v7
 *
 * LÓGICA v7:
 * - Busca pedidos em_preparo E aberto
 * - Filtra APENAS itens com destino='cozinha' (bar/balcão aparecem separado, só informativo)
 * - Botão "Aceitar todos" e controle item a item
 * - Pedido de balcão com itens de cozinha: aparece normalmente aqui
 * - Notificação quando todos itens de cozinha estão prontos
 * - Auto-refresh 7s
 */
import { useEffect, useState, useCallback } from 'react'
import { ChefHat, Clock, CheckCircle2, RefreshCw, AlertCircle } from 'lucide-react'
import api from '../../services/api'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import toast from 'react-hot-toast'

const ST_ITEM = {
  pendente:   { label: 'Na fila',  color: 'var(--yellow)', bg: 'rgba(245,158,11,0.12)', icon: '⏳' },
  em_preparo: { label: 'Fazendo',  color: '#F97316',       bg: 'rgba(249,115,22,0.12)', icon: '🍳' },
  pronto:     { label: 'Pronto',   color: 'var(--green)',  bg: 'rgba(34,197,94,0.12)',  icon: '✅' },
}

function timeAgo(ts) {
  try { return formatDistanceToNow(new Date(ts), { addSuffix: true, locale: ptBR }) }
  catch { return '' }
}

function minutosDesde(ts) {
  try { return Math.round((Date.now() - new Date(ts).getTime()) / 60000) }
  catch { return 0 }
}

export default function CozinhaView() {
  const [orders,    setOrders]    = useState([])
  const [loading,   setLoading]   = useState(true)
  const [updating,  setUpdating]  = useState({})
  const [finishing, setFinishing] = useState({})

  const load = useCallback(async () => {
    try {
      const [r1, r2] = await Promise.all([
        api.get('/api/orders', { params: { status: 'em_preparo' } }),
        api.get('/api/orders', { params: { status: 'aberto' } }),
      ])

      const all = [
        ...(r1.data.data || []),
        ...(r2.data.data || []),
      ].filter((o, i, self) => self.findIndex(x => x.id === o.id) === i)

      const details = await Promise.all(
        all.map(o =>
          api.get(`/api/orders/${o.id}`)
            .then(r => r.data.data)
            .catch(() => null)
        )
      )

      // Mostra APENAS pedidos que têm itens destinados à cozinha não prontos ainda
      const cozinhaOrders = details
        .filter(Boolean)
        .filter(o => {
          const cozItems = (o.items || []).filter(i => i.destino === 'cozinha')
          return cozItems.length > 0 && cozItems.some(i => i.status_item !== 'pronto')
        })
        .sort((a, b) => new Date(a.created_at) - new Date(b.created_at))

      setOrders(cozinhaOrders)
    } catch { /* silencioso */ }
    finally { setLoading(false) }
  }, [])

  useEffect(() => {
    load()
    const timer = setInterval(load, 7000)
    return () => clearInterval(timer)
  }, [load])

  const handleItemStatus = async (orderId, itemId, newStatus) => {
    setUpdating(u => ({ ...u, [itemId]: true }))
    try {
      await api.patch(`/api/orders/${orderId}/items/${itemId}/status`, { status_item: newStatus })
      await load()
    } catch {
      toast.error("Vixe... não consegui salvar a alteração em item 😕")
    } finally {
      setUpdating(u => ({ ...u, [itemId]: false }))
    }
  }

  const handleAceitarTodos = async (order) => {
    const pendentes = (order.items || []).filter(
      i => i.destino === 'cozinha' && i.status_item === 'pendente'
    )
    for (const item of pendentes) {
      await handleItemStatus(order.id, item.id, 'em_preparo')
    }
  }

  const handlePedidoPronto = async (order) => {
    setFinishing(f => ({ ...f, [order.id]: true }))
    try {
      const nao_prontos = (order.items || []).filter(
        i => i.destino === 'cozinha' && i.status_item !== 'pronto'
      )
      for (const item of nao_prontos) {
        await api.patch(`/api/orders/${order.id}/items/${item.id}/status`, { status_item: 'pronto' })
      }
      await api.patch(`/api/orders/${order.id}/status`, { status: 'pronto' })
      toast.success(order.is_delivery
        ? '📦 Delivery pronto! Entregador notificado.'
        : `✅ Mesa ${order.tables?.numero || ''} pronta! Garçom notificado.`
      )
      await load()
    } catch (e) {
      toast.error(e.response?.data?.error || 'Erro ao finalizar pedido')
    } finally {
      setFinishing(f => ({ ...f, [order.id]: false }))
    }
  }

  if (loading) return <div className="loading-page"><div className="spinner" /> Carregando cozinha...</div>

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <ChefHat size={22} color="var(--red)" /> Cozinha
          </div>
          <div className="page-subtitle">
            {orders.length} pedido(s) na fila · Auto-atualiza a cada 7s
          </div>
        </div>
        <button className="btn btn-outline btn-sm" onClick={load}>
          <RefreshCw size={13} /> Atualizar
        </button>
      </div>

      {orders.length === 0 ? (
        <div className="empty-state">
          <ChefHat size={48} style={{ opacity: 0.3 }} />
          <h3>Cozinha tranquila!</h3>
          <p>Novos pedidos aparecem aqui automaticamente</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
          {orders.map(order => {
            const cozItems  = (order.items || []).filter(i => i.destino === 'cozinha')
            const pendentes = cozItems.filter(i => i.status_item === 'pendente')
            const fazendo   = cozItems.filter(i => i.status_item === 'em_preparo')
            const prontos   = cozItems.filter(i => i.status_item === 'pronto')
            const allPronto = cozItems.length > 0 && prontos.length === cozItems.length
            const algumFazendo = fazendo.length > 0 || prontos.length > 0
            const mins = minutosDesde(order.created_at)
            const urgente = mins >= 20 && !allPronto
            const isBusy = finishing[order.id]

            // Outros itens (bar/balcão) — apenas informativo para contexto
            const outrosItems = (order.items || []).filter(i => i.destino !== 'cozinha')

            // Origem do pedido
            const origem = order.is_delivery ? '🛵 Delivery' :
                           order.tables?.numero ? `Mesa ${order.tables.numero}` :
                           order.obs === 'Venda Balcão' ? '🛒 Balcão' :
                           `#${order.numero_pedido}`

            return (
              <div key={order.id} style={{
                background: 'var(--bg2)',
                border: `2px solid ${allPronto ? 'rgba(34,197,94,0.5)' : urgente ? 'rgba(232,25,44,0.4)' : algumFazendo ? 'rgba(249,115,22,0.35)' : 'var(--border)'}`,
                borderRadius: 14, overflow: 'hidden', transition: 'border-color 0.3s',
              }}>
                {/* Cabeçalho */}
                <div style={{
                  padding: '12px 16px',
                  background: allPronto ? 'rgba(34,197,94,0.08)' : urgente ? 'rgba(232,25,44,0.07)' : algumFazendo ? 'rgba(249,115,22,0.07)' : 'var(--bg3)',
                  borderBottom: '1px solid var(--border)',
                  display: 'flex', alignItems: 'flex-start', gap: 10,
                }}>
                  <div style={{
                    width: 42, height: 42, borderRadius: 10, flexShrink: 0,
                    background: allPronto ? 'rgba(34,197,94,0.15)' : 'rgba(232,25,44,0.12)',
                    border: `1px solid ${allPronto ? 'rgba(34,197,94,0.3)' : 'rgba(232,25,44,0.2)'}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20,
                  }}>
                    {order.is_delivery ? '🛵' : allPronto ? '✅' : algumFazendo ? '🍳' : '🔔'}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 800, fontSize: 16 }}>{origem}</div>
                    <div style={{ fontSize: 11, color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: 6, marginTop: 2, flexWrap: 'wrap' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                        <Clock size={9} /> {timeAgo(order.created_at)}
                      </span>
                      {urgente && (
                        <span style={{ color: 'var(--red)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 3 }}>
                          <AlertCircle size={9} /> {mins}min!
                        </span>
                      )}
                      {algumFazendo && !allPronto && (
                        <span style={{ color: '#F97316', fontWeight: 700 }}>EM PREPARO</span>
                      )}
                      {order.is_delivery && order.delivery_pago && (
                        <span style={{ color: 'var(--green)', fontWeight: 700, fontSize: 9 }}>✅ PRÉ-PAGO</span>
                      )}
                    </div>
                    {order.obs && order.obs !== 'Venda Balcão' && (
                      <div style={{ fontSize: 10, color: 'var(--yellow)', marginTop: 3 }}>⚠ {order.obs}</div>
                    )}
                    {order.is_delivery && order.delivery_obs && (
                      <div style={{ fontSize: 10, color: 'var(--yellow)', marginTop: 2 }}>📝 {order.delivery_obs}</div>
                    )}
                    {order.is_delivery && (
                      <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 2 }}>
                        📍 {order.delivery_end}{order.delivery_bairro ? ` — ${order.delivery_bairro}` : ''}
                      </div>
                    )}
                  </div>

                  {pendentes.length > 0 && (
                    <button
                      onClick={() => handleAceitarTodos(order)}
                      style={{
                        padding: '6px 12px', borderRadius: 8, fontSize: 11, fontWeight: 700,
                        background: 'rgba(249,115,22,0.15)', border: '1px solid rgba(249,115,22,0.3)',
                        color: '#F97316', cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0,
                      }}>
                      🍳 Aceitar tudo
                    </button>
                  )}
                </div>

                {/* Progress bar */}
                {cozItems.length > 0 && (
                  <div style={{ height: 4, background: 'var(--bg4)', display: 'flex' }}>
                    <div style={{ width: `${(prontos.length / cozItems.length) * 100}%`, background: 'var(--green)', transition: 'width 0.4s ease' }} />
                    <div style={{ width: `${(fazendo.length / cozItems.length) * 100}%`, background: '#F97316', transition: 'width 0.4s ease' }} />
                  </div>
                )}

                {/* Itens da cozinha */}
                <div>
                  {cozItems.map(item => {
                    const st   = ST_ITEM[item.status_item] || ST_ITEM.pendente
                    const busy = updating[item.id]

                    return (
                      <div key={item.id} style={{
                        padding: '11px 16px',
                        borderBottom: '1px solid rgba(255,255,255,0.04)',
                        background: item.status_item === 'pronto' ? 'rgba(34,197,94,0.04)' : 'transparent',
                        display: 'flex', alignItems: 'center', gap: 10, transition: 'background 0.2s',
                      }}>
                        <div style={{
                          padding: '3px 9px', borderRadius: 7, fontSize: 11, fontWeight: 700,
                          background: st.bg, color: st.color, flexShrink: 0, minWidth: 80, textAlign: 'center',
                        }}>
                          {st.icon} {item.qtd}×
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 600, fontSize: 13 }}>{item.nome}</div>
                          {item.obs && (
                            <div style={{ fontSize: 10, color: 'var(--yellow)', marginTop: 2 }}>📝 {item.obs}</div>
                          )}
                          <div style={{ fontSize: 9, color: st.color, fontWeight: 700, marginTop: 2 }}>{st.label}</div>
                        </div>

                        {item.status_item === 'pendente' && (
                          <button disabled={busy}
                            onClick={() => handleItemStatus(order.id, item.id, 'em_preparo')}
                            style={{
                              padding: '6px 12px', borderRadius: 8, fontSize: 11, fontWeight: 700,
                              background: 'rgba(249,115,22,0.15)', border: '1px solid rgba(249,115,22,0.3)',
                              color: '#F97316', cursor: busy ? 'not-allowed' : 'pointer', fontFamily: 'inherit', flexShrink: 0,
                            }}>
                            {busy ? '...' : '🍳 Iniciar'}
                          </button>
                        )}
                        {item.status_item === 'em_preparo' && (
                          <button disabled={busy}
                            onClick={() => handleItemStatus(order.id, item.id, 'pronto')}
                            style={{
                              padding: '6px 12px', borderRadius: 8, fontSize: 11, fontWeight: 700,
                              background: 'rgba(34,197,94,0.15)', border: '1px solid rgba(34,197,94,0.3)',
                              color: 'var(--green)', cursor: busy ? 'not-allowed' : 'pointer', fontFamily: 'inherit', flexShrink: 0,
                            }}>
                            {busy ? '...' : '✅ Pronto'}
                          </button>
                        )}
                        {item.status_item === 'pronto' && (
                          <CheckCircle2 size={18} color="var(--green)" />
                        )}
                      </div>
                    )
                  })}

                  {/* Outros itens (bar/balcão) — informativo para contexto do pedido */}
                  {outrosItems.length > 0 && (
                    <div style={{ padding: '8px 16px', borderTop: '1px solid rgba(255,255,255,0.04)', background: 'rgba(255,255,255,0.02)' }}>
                      <div style={{ fontSize: 9, color: 'var(--muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>
                        Outros itens do pedido (não são da cozinha)
                      </div>
                      {outrosItems.map(item => (
                        <div key={item.id} style={{ fontSize: 10, color: 'var(--muted)', paddingBottom: 2 }}>
                          {item.destino === 'bar' ? '🍺' : '🪟'} {item.qtd}× {item.nome}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Footer: botão Pedido Pronto */}
                {allPronto && (
                  <div style={{ padding: '12px 16px', borderTop: '1px solid rgba(34,197,94,0.2)', background: 'rgba(34,197,94,0.06)' }}>
                    <button
                      className="btn btn-primary"
                      style={{ width: '100%', background: 'var(--green)', borderColor: 'var(--green)' }}
                      onClick={() => handlePedidoPronto(order)}
                      disabled={isBusy}>
                      {isBusy
                        ? <><div className="spinner" style={{ width: 14, height: 14 }} /> Notificando...</>
                        : order.is_delivery
                          ? '📦 Pronto — Avisar Entregador'
                          : `✅ Pronto — Avisar Garçom (${origem})`
                      }
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
