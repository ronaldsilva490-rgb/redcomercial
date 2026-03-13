/**
 * GarcomView — Dashboard completo do garçom. v7
 *
 * CORREÇÕES v7:
 * - Itens de bar/balcão/proprio: garçom vê fila e CONFIRMA que buscou e entregou
 * - Botão "Busquei e Entreguei" por item individual de bar/balcão
 * - Adicionar itens a pedido já em_preparo (pedido adicional)
 * - Cancelar item individual com confirmação
 * - Status do pedido reflete corretamente itens de balcão vs cozinha
 * - Auto-refresh sem memory leak (useRef correto)
 * - Notificação de bar/balcão aparece em lista de tarefas separada
 */
import { useEffect, useState, useCallback, useRef } from 'react'
import { LayoutGrid, Plus, Minus, Send, DollarSign, X, Bell, RefreshCw, ChevronRight, AlertCircle, XCircle, ShoppingBag, CheckCircle2 } from 'lucide-react'
import api from '../../services/api'
import { formatMoney } from '../../utils/format'
import useAuthStore from '../../store/authStore'
import useNotifStore from '../../store/notifStore'
import PixModal from '../../components/ui/PixModal'
import toast from 'react-hot-toast'

const TABLE_STATUS = {
  livre:     { label: 'Livre',    color: 'var(--green)',  bg: 'rgba(34,197,94,0.10)',  border: 'rgba(34,197,94,0.25)' },
  ocupada:   { label: 'Ocupada', color: 'var(--red)',    bg: 'rgba(232,25,44,0.10)',  border: 'rgba(232,25,44,0.25)' },
  reservada: { label: 'Reserv.', color: 'var(--yellow)', bg: 'rgba(245,158,11,0.10)', border: 'rgba(245,158,11,0.25)' },
}

const ITEM_STATUS = {
  pendente:   { icon: '⏳', label: 'Na fila',  color: 'var(--muted)', bg: 'rgba(255,255,255,0.06)' },
  em_preparo: { icon: '🍳', label: 'Fazendo',  color: '#F97316',      bg: 'rgba(249,115,22,0.12)' },
  pronto:     { icon: '✅', label: 'Pronto',   color: 'var(--green)', bg: 'rgba(34,197,94,0.12)' },
}

const DESTINO_LABEL = {
  cozinha: '🍳 Cozinha',
  bar:     '🍺 Bar',
  proprio: '🧊 Estoque próprio',
  balcao:  '🪟 Balcão',
}

// Destinos que o GARÇOM precisa buscar fisicamente
const DESTINO_GARCOM = ['bar', 'proprio', 'balcao']

const FORMAS = ['Dinheiro', 'PIX', 'Cartão Débito', 'Cartão Crédito']

export default function GarcomView() {
  const { tenant }                               = useAuthStore()
  const { items: notifs, markRead, markAllRead } = useNotifStore()

  const [tables,       setTables]       = useState([])
  const [products,     setProducts]     = useState([])
  const [cats,         setCats]         = useState([])
  const [catFilter,    setCatFilter]    = useState('')
  const [prodSearch,   setProdSearch]   = useState('')
  const [loading,      setLoading]      = useState(true)

  const [selTable,     setSelTable]     = useState(null)
  const [activeOrder,  setActiveOrder]  = useState(null)
  const [loadingOrder, setLoadingOrder] = useState(false)
  const [cart,         setCart]         = useState([])
  const [sending,      setSending]      = useState(false)

  const [payStep,      setPayStep]      = useState(null)
  const [forma,        setForma]        = useState('Dinheiro')
  const [valorRec,     setValorRec]     = useState('')
  const [closing,      setClosing]      = useState(false)
  const [pixModal,     setPixModal]     = useState(false)
  const [nameModal,    setNameModal]    = useState(false)
  const [guestName,    setGuestName]    = useState('')
  const [openingTable, setOpeningTable] = useState(false)

  // Cancelamento de comanda
  const [showCancel,   setShowCancel]   = useState(false)
  const [cancelMotivo, setCancelMotivo] = useState('')
  const [cancelling,   setCancelling]   = useState(false)

  // Cancelar item individual
  const [cancelItem,   setCancelItem]   = useState(null) // { id, nome, orderId }
  const [cancellingItem, setCancellingItem] = useState(false)

  // Confirmar item buscado (bar/balcão)
  const [confirmingItem, setConfirmingItem] = useState({}) // { [itemId]: true }

  // Auto-refresh — useRef para evitar múltiplos timers
  const refreshTimer   = useRef(null)
  const activeOrderRef = useRef(null)

  const urgentNotifs = notifs.filter(n =>
    !n.lida && ['chamar_garcom', 'pedido_pronto', 'pedido_bar', 'pedido_balcao', 'pagamento_ok', 'pedido_cancelado'].includes(n.tipo)
  )

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [t, p] = await Promise.all([
        api.get('/api/tables'),
        api.get('/api/products'),
      ])
      const prods = (p.data.data || []).filter(prod => prod.ativo !== false)
      setTables(t.data.data || [])
      setProducts(prods)
      setCats([...new Set(prods.map(x => x.categoria).filter(Boolean))])
    } catch { toast.error("Oops! Não consegui buscar dados. Tente novamente 😕") }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const reloadOrder = useCallback(async (orderId) => {
    const id = orderId || activeOrderRef.current
    if (!id) return
    try {
      const { data } = await api.get(`/api/orders/${id}`)
      setActiveOrder(data.data)
    } catch {}
  }, [])

  // Auto-refresh com cleanup correto
  useEffect(() => {
    if (refreshTimer.current) {
      clearInterval(refreshTimer.current)
      refreshTimer.current = null
    }

    if (activeOrder?.id) {
      activeOrderRef.current = activeOrder.id
      const temAtivos = (activeOrder.items || []).some(i =>
        ['pendente', 'em_preparo'].includes(i.status_item) && i.destino === 'cozinha'
      )
      if (temAtivos) {
        refreshTimer.current = setInterval(() => reloadOrder(), 6000)
      }
    } else {
      activeOrderRef.current = null
    }

    return () => {
      if (refreshTimer.current) {
        clearInterval(refreshTimer.current)
        refreshTimer.current = null
      }
    }
  }, [activeOrder?.id, activeOrder?.items, reloadOrder])

  // ── Selecionar mesa ──────────────────────────────────────────────────────
  const handleTableClick = async (table) => {
    setSelTable(table)
    setActiveOrder(null)
    setCart([])
    setPayStep(null)
    setValorRec('')
    setShowCancel(false)
    setCancelItem(null)

    if (table.status === 'ocupada') {
      setLoadingOrder(true)
      try {
        const { data } = await api.get('/api/orders')
        const allOrders = data.data || []
        const order = allOrders.find(o =>
          o.table_id === table.id && !['fechado', 'cancelado'].includes(o.status)
        )
        if (order) {
          const det = await api.get(`/api/orders/${order.id}`)
          setActiveOrder(det.data.data)
        } else {
          toast('Mesa marcada como ocupada mas sem pedido ativo', { icon: 'ℹ️' })
        }
      } catch { toast.error("Oops! Não consegui buscar comanda. Tente novamente 😕") }
      finally { setLoadingOrder(false) }
    }
  }

  // ── Abrir comanda ────────────────────────────────────────────────────────
  const handleOpenTable = async () => {
    if (!selTable) return
    setOpeningTable(true)
    try {
      const { data } = await api.post('/api/orders', {
        table_id: selTable.id,
        obs: guestName ? `Cliente: ${guestName}` : undefined,
      })
      const det = await api.get(`/api/orders/${data.data.id}`)
      setActiveOrder(det.data.data)
      setTables(ts => ts.map(t => t.id === selTable.id ? { ...t, status: 'ocupada' } : t))
      setSelTable(prev => ({ ...prev, status: 'ocupada' }))
      setNameModal(false)
      setGuestName('')
      toast.success(`Mesa ${selTable.numero} aberta!`)
    } catch (e) {
      toast.error(e.response?.data?.error || 'Erro ao abrir mesa')
    } finally { setOpeningTable(false) }
  }

  // ── Carrinho ─────────────────────────────────────────────────────────────
  const addCart = (product) => {
    setCart(prev => {
      const ex = prev.find(i => i.product.id === product.id)
      if (ex) return prev.map(i => i.product.id === product.id ? { ...i, qtd: i.qtd + 1 } : i)
      return [...prev, { product, qtd: 1, obs: '' }]
    })
  }
  const changeQtd = (id, d) =>
    setCart(prev => prev.map(i => i.product.id === id ? { ...i, qtd: Math.max(0, i.qtd + d) } : i).filter(i => i.qtd > 0))
  const cartTotal = cart.reduce((s, i) => s + i.qtd * parseFloat(i.product.preco_venda || 0), 0)

  const filtered = products.filter(p => {
    const s = prodSearch.toLowerCase()
    return (!prodSearch || p.nome.toLowerCase().includes(s)) && (!catFilter || p.categoria === catFilter)
  })

  // ── Enviar para cozinha/bar ───────────────────────────────────────────────
  const handleSendOrder = async () => {
    if (!cart.length) return toast.error('Coloca alguma coisa na bandeja antes de fechar! 🍽️')
    if (!activeOrder) return toast.error('Ei! Não tem nenhuma comanda rolando nessa mesa 🤷‍♂️')
    setSending(true)
    try {
      for (const item of cart) {
        await api.post(`/api/orders/${activeOrder.id}/items`, {
          product_id: item.product.id,
          nome:       item.product.nome,
          qtd:        item.qtd,
          preco_unit: parseFloat(item.product.preco_venda || 0),
          destino:    item.product.destino || 'balcao',
          obs:        item.obs || undefined,
        })
      }
      // Só muda status se ainda está aberto (em_preparo já está ok)
      if (activeOrder.status === 'aberto') {
        await api.patch(`/api/orders/${activeOrder.id}/status`, { status: 'em_preparo' })
      }
      await reloadOrder(activeOrder.id)
      setCart([])
      toast.success('Anotado! Pedido disparado lá pra trás 🚀')
    } catch (e) {
      toast.error(e.response?.data?.error || 'Erro ao enviar pedido')
    } finally { setSending(false) }
  }

  // ── Confirmar que buscou e entregou item de bar/balcão ───────────────────
  const handleConfirmarItem = async (orderId, itemId, itemNome) => {
    setConfirmingItem(prev => ({ ...prev, [itemId]: true }))
    try {
      await api.patch(`/api/orders/${orderId}/items/${itemId}/confirmar`)
      toast.success(`✅ "${itemNome}" entregue na mesa!`)
      await reloadOrder(orderId)
    } catch (e) {
      toast.error(e.response?.data?.error || 'Erro ao confirmar item')
    } finally {
      setConfirmingItem(prev => ({ ...prev, [itemId]: false }))
    }
  }

  // ── Cancelar item individual ──────────────────────────────────────────────
  const handleCancelarItem = async () => {
    if (!cancelItem) return
    setCancellingItem(true)
    try {
      await api.delete(`/api/orders/${cancelItem.orderId}/items/${cancelItem.id}`)
      toast.success(`Item "${cancelItem.nome}" removido`)
      setCancelItem(null)
      await reloadOrder(cancelItem.orderId)
    } catch (e) {
      toast.error(e.response?.data?.error || 'Erro ao remover item')
    } finally { setCancellingItem(false) }
  }

  // ── Solicitar pagamento ao caixa ──────────────────────────────────────────
  const handleSolicitarPagamento = async () => {
    if (!activeOrder) return
    try {
      await api.post(`/api/orders/${activeOrder.id}/solicitar-pagamento`, { forma_pagamento: forma })
      toast.success('Demos um toque no pessoal do Caixa! 🛎️')
      setPayStep(null)
    } catch { toast.error('Erro ao notificar caixa') }
  }

  // ── Fechar comanda ────────────────────────────────────────────────────────
  const handleFechar = async () => {
    if (!activeOrder) return
    if (!podeFechar) {
      toast.error(`Aguardando cozinha: ${cozinhaItemsPendentes.length} item(s) ainda não prontos`)
      return
    }
    if (forma === 'PIX') { setPixModal(true); return }
    setClosing(true)
    try {
      await api.patch(`/api/orders/${activeOrder.id}/status`, { status: 'fechado', forma_pagamento: forma })
      toast.success('Conta fechada! Mais uma mesa bem servida 🧾')
      resetComanda()
      load()
    } catch (e) {
      toast.error(e.response?.data?.error || 'Erro ao fechar comanda')
    } finally { setClosing(false) }
  }

  const handleConfirmPix = async () => {
    if (!activeOrder || !podeFechar) { setPixModal(false); return }
    setClosing(true)
    try {
      await api.patch(`/api/orders/${activeOrder.id}/status`, { status: 'fechado', forma_pagamento: 'PIX' })
      toast.success('PIX confirmado! ✅')
      setPixModal(false)
      resetComanda()
      load()
    } catch (e) {
      toast.error(e.response?.data?.error || 'Erro ao confirmar PIX')
    } finally { setClosing(false) }
  }

  // ── Cancelar comanda ──────────────────────────────────────────────────────
  const handleCancelar = async () => {
    if (!activeOrder) return
    setCancelling(true)
    try {
      await api.post(`/api/orders/${activeOrder.id}/cancelar`, { motivo: cancelMotivo || 'Cancelado pelo garçom' })
      toast.success('Comanda cancelada. Todos foram notificados.')
      setShowCancel(false)
      setCancelMotivo('')
      resetComanda()
      load()
    } catch (e) {
      toast.error(e.response?.data?.error || 'Erro ao cancelar')
    } finally { setCancelling(false) }
  }

  const resetComanda = () => {
    setActiveOrder(null)
    setSelTable(null)
    setCart([])
    setPayStep(null)
    setValorRec('')
    setForma('Dinheiro')
    setShowCancel(false)
    setCancelMotivo('')
    setCancelItem(null)
  }

  // Status da cozinha
  const getOrderCozinhaStatus = (order) => {
    if (!order) return null
    const cozItems = (order.items || []).filter(i => i.destino === 'cozinha')
    if (!cozItems.length) return null
    const prontos   = cozItems.filter(i => i.status_item === 'pronto').length
    const fazendo   = cozItems.filter(i => i.status_item === 'em_preparo').length
    const pendentes = cozItems.filter(i => i.status_item === 'pendente').length
    if (prontos === cozItems.length) return { label: '✅ Cozinha: tudo pronto!', color: 'var(--green)' }
    if (fazendo > 0)                 return { label: `🍳 Cozinha fazendo (${fazendo}/${cozItems.length})`, color: '#F97316' }
    if (pendentes > 0)               return { label: `⏳ Aguardando cozinha (${pendentes} itens)`, color: 'var(--yellow)' }
    return null
  }

  const troco = valorRec ? Math.max(0, parseFloat(valorRec) - (activeOrder?.total || 0)) : null
  const cozStatus = getOrderCozinhaStatus(activeOrder)

  const cozinhaItemsPendentes = activeOrder
    ? (activeOrder.items || []).filter(i => i.destino === 'cozinha' && i.status_item !== 'pronto')
    : []
  const podeFechar = cozinhaItemsPendentes.length === 0

  // Itens de bar/balcão que o garçom ainda precisa buscar
  const itensBuscar = activeOrder
    ? (activeOrder.items || []).filter(i =>
        DESTINO_GARCOM.includes(i.destino) &&
        i.status_item !== 'pronto' &&
        !i.confirmado_garcom
      )
    : []

  const todosItensProntos = activeOrder && (activeOrder.items || []).length > 0 &&
    (activeOrder.items || []).every(i =>
      i.status_item === 'pronto' ||
      i.confirmado_garcom ||
      DESTINO_GARCOM.includes(i.destino)
    )

  return (
    <div>
      {/* Notificações urgentes */}
      {urgentNotifs.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          {urgentNotifs.map(n => (
            <div key={n.id} onClick={() => { markRead(n.id); if (n.order_id) reloadOrder(n.order_id) }}
              style={{
                background: n.tipo === 'pedido_cancelado' ? 'rgba(239,68,68,0.10)' :
                            n.tipo === 'pedido_pronto' ? 'rgba(34,197,94,0.10)' :
                            n.tipo === 'pedido_bar' || n.tipo === 'pedido_balcao' ? 'rgba(245,158,11,0.10)' :
                            'rgba(232,25,44,0.10)',
                border: `1px solid ${
                  n.tipo === 'pedido_cancelado' ? 'rgba(239,68,68,0.3)' :
                  n.tipo === 'pedido_pronto' ? 'rgba(34,197,94,0.3)' :
                  n.tipo === 'pedido_bar' || n.tipo === 'pedido_balcao' ? 'rgba(245,158,11,0.3)' :
                  'rgba(232,25,44,0.3)'
                }`,
                borderRadius: 10, padding: '12px 16px', cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6,
              }}>
              <span style={{ fontSize: 20 }}>
                {{ chamar_garcom: '📢', pedido_pronto: '✅', pedido_bar: '🍺', pedido_balcao: '🪟', pagamento_ok: '💰', pedido_cancelado: '❌' }[n.tipo] || '🔔'}
              </span>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 13 }}>{n.titulo}</div>
                {n.mensagem && <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>{n.mensagem}</div>}
              </div>
              <X size={14} color="var(--muted)" />
            </div>
          ))}
          {urgentNotifs.length > 2 && (
            <button onClick={markAllRead} style={{ fontSize: 11, color: 'var(--muted)', background: 'none', border: 'none', cursor: 'pointer', padding: '4px 0' }}>
              Marcar todas como lidas
            </button>
          )}
        </div>
      )}

      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>

        {/* ── Mesas ── */}
        <div style={{ minWidth: 260, flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <div style={{ fontWeight: 800, fontSize: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
              <LayoutGrid size={14} color="var(--red)" /> Mesas
            </div>
            <button onClick={load} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', display: 'flex' }}>
              <RefreshCw size={13} />
            </button>
          </div>

          {loading ? (
            <div style={{ color: 'var(--muted)', fontSize: 13 }}>Carregando...</div>
          ) : tables.length === 0 ? (
            <div style={{ color: 'var(--muted)', fontSize: 13 }}>Nenhuma mesa cadastrada.</div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, maxWidth: 300 }}>
              {tables.map(t => {
                const s = TABLE_STATUS[t.status] || TABLE_STATUS.livre
                const isSel = selTable?.id === t.id
                return (
                  <button key={t.id} onClick={() => handleTableClick(t)}
                    style={{
                      height: 80, borderRadius: 10, cursor: 'pointer', fontFamily: 'inherit',
                      background: isSel ? s.bg : 'var(--bg3)',
                      border: `2px solid ${isSel ? s.color : s.border}`,
                      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                      gap: 2, transition: 'all 0.15s',
                    }}>
                    <span style={{ fontFamily: 'Bebas Neue', fontSize: 22, color: s.color }}>{t.numero}</span>
                    <span style={{ fontSize: 9, color: s.color, textTransform: 'uppercase', fontWeight: 700 }}>{s.label}</span>
                  </button>
                )
              })}
            </div>
          )}

          <div style={{ display: 'flex', gap: 10, marginTop: 10, flexWrap: 'wrap' }}>
            {Object.entries(TABLE_STATUS).map(([k, v]) => (
              <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, color: v.color }}>
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: v.color }} />
                {v.label}
              </div>
            ))}
          </div>
        </div>

        {/* ── Painel da Comanda ── */}
        {selTable && (
          <div style={{ flex: 1, minWidth: 300 }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
              <span style={{ fontWeight: 800, fontSize: 16 }}>Mesa {selTable.numero}</span>
              <span style={{
                fontSize: 11, padding: '2px 10px', borderRadius: 10, fontWeight: 700,
                background: TABLE_STATUS[selTable.status]?.bg,
                color: TABLE_STATUS[selTable.status]?.color,
                border: `1px solid ${TABLE_STATUS[selTable.status]?.border}`,
              }}>
                {TABLE_STATUS[selTable.status]?.label}
              </span>
              {activeOrder && (
                <button onClick={() => reloadOrder(activeOrder.id)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', display: 'flex', marginLeft: 'auto' }}>
                  <RefreshCw size={13} />
                </button>
              )}
            </div>

            {/* Mesa livre */}
            {selTable.status === 'livre' && !activeOrder && !loadingOrder && (
              <button className="btn btn-primary" onClick={() => setNameModal(true)} style={{ marginBottom: 16 }}>
                <Plus size={14} /> Abrir Comanda
              </button>
            )}

            {loadingOrder && <div style={{ color: 'var(--muted)', fontSize: 13 }}>Carregando comanda...</div>}

            {/* Comanda ativa */}
            {activeOrder && (
              <>
                {/* Resumo */}
                <div style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 14px', marginBottom: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: cozStatus ? 6 : 0 }}>
                    <span style={{ fontSize: 11, color: 'var(--muted)' }}>Pedido #{activeOrder.numero_pedido}</span>
                    <span style={{ fontWeight: 900, fontSize: 20, color: 'var(--green)', fontFamily: 'Bebas Neue', letterSpacing: 1 }}>
                      {formatMoney(activeOrder.total)}
                    </span>
                  </div>
                  {cozStatus && (
                    <div style={{ fontSize: 11, fontWeight: 700, color: cozStatus.color }}>{cozStatus.label}</div>
                  )}
                  {activeOrder.obs && (
                    <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>{activeOrder.obs}</div>
                  )}
                </div>

                {/* ── FILA DE ITENS PARA BUSCAR (bar/balcão/proprio) ── */}
                {itensBuscar.length > 0 && (
                  <div style={{
                    background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.25)',
                    borderRadius: 10, marginBottom: 12, overflow: 'hidden',
                  }}>
                    <div style={{ padding: '8px 14px', borderBottom: '1px solid rgba(245,158,11,0.15)', fontSize: 11, fontWeight: 700, color: '#F59E0B', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <ShoppingBag size={12} /> Você precisa buscar ({itensBuscar.length} item{itensBuscar.length > 1 ? 'ns' : ''})
                    </div>
                    {itensBuscar.map(item => (
                      <div key={item.id} style={{ padding: '10px 14px', borderBottom: '1px solid rgba(255,255,255,0.04)', display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 600, fontSize: 12 }}>{item.qtd}× {item.nome}</div>
                          <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 2 }}>
                            {DESTINO_LABEL[item.destino] || item.destino}
                          </div>
                        </div>
                        <button
                          onClick={() => handleConfirmarItem(activeOrder.id, item.id, item.nome)}
                          disabled={confirmingItem[item.id]}
                          style={{
                            padding: '6px 11px', borderRadius: 8, fontSize: 11, fontWeight: 700,
                            background: 'rgba(34,197,94,0.15)', border: '1px solid rgba(34,197,94,0.35)',
                            color: 'var(--green)', cursor: confirmingItem[item.id] ? 'not-allowed' : 'pointer',
                            fontFamily: 'inherit', flexShrink: 0, whiteSpace: 'nowrap',
                          }}>
                          {confirmingItem[item.id] ? '...' : '✅ Busquei e Entreguei'}
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Itens da comanda com status */}
                {(activeOrder.items || []).length > 0 && (
                  <div style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 10, marginBottom: 12, overflow: 'hidden' }}>
                    <div style={{ padding: '8px 14px', borderBottom: '1px solid var(--border)', fontSize: 10, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 1 }}>
                      Itens da comanda
                    </div>
                    {activeOrder.items.map(item => {
                      const st = ITEM_STATUS[item.status_item] || ITEM_STATUS.pendente
                      const isBuscado = item.confirmado_garcom || (DESTINO_GARCOM.includes(item.destino) && item.status_item === 'pronto')
                      return (
                        <div key={item.id} style={{
                          padding: '8px 14px', borderBottom: '1px solid rgba(255,255,255,0.04)',
                          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                          background: isBuscado ? 'rgba(34,197,94,0.04)' : 'transparent',
                          opacity: isBuscado ? 0.7 : 1,
                        }}>
                          <div style={{ flex: 1 }}>
                            <span style={{ fontSize: 12, fontWeight: 600 }}>{item.qtd}× {item.nome}</span>
                            <div style={{ display: 'flex', gap: 8, marginTop: 2, flexWrap: 'wrap' }}>
                              <span style={{ fontSize: 9, color: 'var(--muted)' }}>{DESTINO_LABEL[item.destino] || ''}</span>
                              {item.destino === 'cozinha' && (
                                <span style={{ fontSize: 9, padding: '1px 6px', borderRadius: 5, fontWeight: 700, background: st.bg, color: st.color }}>
                                  {st.icon} {st.label}
                                </span>
                              )}
                              {DESTINO_GARCOM.includes(item.destino) && isBuscado && (
                                <span style={{ fontSize: 9, padding: '1px 6px', borderRadius: 5, fontWeight: 700, background: 'rgba(34,197,94,0.12)', color: 'var(--green)' }}>
                                  ✅ Entregue
                                </span>
                              )}
                            </div>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span style={{ fontSize: 11, color: 'var(--muted)' }}>{formatMoney(item.subtotal)}</span>
                            {/* Permitir cancelar item apenas se não está pronto ainda */}
                            {item.status_item !== 'pronto' && !isBuscado && payStep === null && !showCancel && (
                              <button
                                onClick={() => setCancelItem({ id: item.id, nome: item.nome, orderId: activeOrder.id })}
                                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(232,25,44,0.5)', display: 'flex', padding: 2 }}>
                                <X size={11} />
                              </button>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}

                {/* Aviso: todos prontos */}
                {todosItensProntos && payStep === null && !showCancel && !cancelItem && (
                  <div style={{
                    background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)',
                    borderRadius: 10, padding: '10px 14px', marginBottom: 12,
                    display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 700, color: 'var(--green)',
                  }}>
                    <CheckCircle2 size={14} /> Pedido pronto! Hora de servir.
                  </div>
                )}

                {/* Aviso cozinha pendente na etapa de pagamento */}
                {!podeFechar && payStep !== null && (
                  <div style={{
                    background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)',
                    borderRadius: 10, padding: '10px 14px', marginBottom: 12,
                    display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#F59E0B',
                  }}>
                    <AlertCircle size={14} />
                    <strong>Aguardando cozinha:</strong> {cozinhaItemsPendentes.length} item(s) ainda não prontos.
                  </div>
                )}

                {/* Modal: cancelar item individual */}
                {cancelItem && (
                  <div style={{ background: 'var(--bg3)', border: '1px solid rgba(232,25,44,0.25)', borderRadius: 10, padding: 14, marginBottom: 12 }}>
                    <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 6, color: 'var(--red)' }}>Remover item?</div>
                    <div style={{ fontSize: 12, marginBottom: 10, color: 'var(--dim)' }}>
                      "{cancelItem.nome}" será removido da comanda.
                      {/* Avisa cozinha se em preparo */}
                    </div>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button className="btn btn-outline" onClick={() => setCancelItem(null)} style={{ flex: 1, fontSize: 11 }}>Não</button>
                      <button className="btn btn-primary" style={{ flex: 1, fontSize: 11, background: 'var(--red)', borderColor: 'var(--red)' }}
                        onClick={handleCancelarItem} disabled={cancellingItem}>
                        {cancellingItem ? '...' : 'Sim, remover'}
                      </button>
                    </div>
                  </div>
                )}

                {/* Modal cancelar comanda */}
                {showCancel && (
                  <div style={{ background: 'var(--bg3)', border: '1px solid rgba(232,25,44,0.3)', borderRadius: 10, padding: 14, marginBottom: 12 }}>
                    <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 8, color: 'var(--red)' }}>❌ Cancelar comanda?</div>
                    <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 8 }}>Garçom, cozinheiro e caixa serão notificados.</div>
                    <input className="input" style={{ marginBottom: 8 }} value={cancelMotivo} onChange={e => setCancelMotivo(e.target.value)} placeholder="Motivo (opcional)" />
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button className="btn btn-outline" onClick={() => setShowCancel(false)} style={{ flex: 1, fontSize: 11 }}>Voltar</button>
                      <button className="btn btn-primary" style={{ flex: 1, fontSize: 11, background: 'var(--red)', borderColor: 'var(--red)' }}
                        onClick={handleCancelar} disabled={cancelling}>
                        {cancelling ? '...' : 'Confirmar'}
                      </button>
                    </div>
                  </div>
                )}

                {/* Etapa: Adicionar itens */}
                {payStep === null && !showCancel && !cancelItem && (
                  <>
                    <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>
                      {activeOrder.status === 'em_preparo' ? 'Adicionar mais itens' : 'Itens do pedido'}
                    </div>

                    <div style={{ display: 'flex', gap: 6, marginBottom: 8, flexWrap: 'wrap' }}>
                      <input className="input" style={{ flex: 1, fontSize: 12, minWidth: 120 }}
                        placeholder="Buscar item..." value={prodSearch}
                        onChange={e => setProdSearch(e.target.value)} />
                      {cats.map(c => (
                        <button key={c} onClick={() => setCatFilter(catFilter === c ? '' : c)}
                          style={{
                            padding: '5px 10px', borderRadius: 16, fontSize: 11, fontWeight: 600,
                            border: '1px solid', cursor: 'pointer', fontFamily: 'inherit',
                            background: catFilter === c ? 'var(--red)' : 'transparent',
                            borderColor: catFilter === c ? 'var(--red)' : 'var(--border)',
                            color: catFilter === c ? '#fff' : 'var(--muted)',
                          }}>
                          {c}
                        </button>
                      ))}
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: 6, maxHeight: 220, overflowY: 'auto', marginBottom: 12 }}>
                      {filtered.map(p => (
                        <button key={p.id} onClick={() => addCart(p)}
                          style={{
                            background: 'var(--bg3)', border: '1px solid var(--border)',
                            borderRadius: 8, padding: 8, cursor: 'pointer', textAlign: 'left',
                            fontFamily: 'inherit', transition: 'all 0.12s',
                          }}
                          onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--red-border)'}
                          onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}>
                          <div style={{ fontSize: 9, color: 'var(--muted)', marginBottom: 2 }}>{DESTINO_LABEL[p.destino] || ''}</div>
                          <div style={{ fontSize: 11, fontWeight: 600, lineHeight: 1.2, marginBottom: 3, color: 'var(--text)' }}>{p.nome}</div>
                          <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--red)' }}>{formatMoney(p.preco_venda)}</div>
                        </button>
                      ))}
                    </div>

                    {cart.length > 0 && (
                      <div style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 10, marginBottom: 10, overflow: 'hidden' }}>
                        <div style={{ padding: '8px 14px', borderBottom: '1px solid var(--border)', fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 1 }}>
                          Novos itens
                        </div>
                        {cart.map(item => (
                          <div key={item.product.id} style={{ padding: '8px 14px', borderBottom: '1px solid rgba(255,255,255,0.04)', display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ fontSize: 11, flex: 1 }}>{item.product.nome}</span>
                            <button onClick={() => changeQtd(item.product.id, -1)} style={{ width: 22, height: 22, borderRadius: 6, background: 'var(--bg4)', border: '1px solid var(--border)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Minus size={10} /></button>
                            <span style={{ fontSize: 12, fontWeight: 700, minWidth: 18, textAlign: 'center' }}>{item.qtd}</span>
                            <button onClick={() => changeQtd(item.product.id, 1)} style={{ width: 22, height: 22, borderRadius: 6, background: 'var(--bg4)', border: '1px solid var(--border)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Plus size={10} /></button>
                            <span style={{ fontSize: 11, color: 'var(--red)', minWidth: 55, textAlign: 'right' }}>{formatMoney(item.product.preco_venda * item.qtd)}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      {cart.length > 0 && (
                        <button className="btn btn-primary" style={{ flex: 1 }} onClick={handleSendOrder} disabled={sending}>
                          {sending ? <><div className="spinner" style={{ width: 14, height: 14 }} /> Enviando...</> : <><Send size={13} /> Enviar ({formatMoney(cartTotal)})</>}
                        </button>
                      )}
                      {(activeOrder.items || []).length > 0 && (
                        <button className="btn btn-outline" style={{ flex: 1 }} onClick={() => setPayStep('forma')}>
                          <DollarSign size={13} /> Fechar Conta
                        </button>
                      )}
                    </div>

                    <button className="btn btn-outline" style={{ width: '100%', marginTop: 8, fontSize: 11, color: 'var(--red)', borderColor: 'rgba(232,25,44,0.3)' }}
                      onClick={() => setShowCancel(true)}>
                      <XCircle size={12} /> Cancelar Comanda
                    </button>
                  </>
                )}

                {/* Etapa: Forma de pagamento */}
                {payStep === 'forma' && (
                  <div style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 12, padding: 16 }}>
                    <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>💳 Forma de Pagamento</div>

                    {!podeFechar && (
                      <div style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 8, padding: '8px 12px', marginBottom: 10, fontSize: 11, color: '#F59E0B' }}>
                        ⚠ Ainda há {cozinhaItemsPendentes.length} item(s) aguardando a cozinha. Você pode avisar o caixa para cobrar depois.
                      </div>
                    )}

                    <div style={{ textAlign: 'center', marginBottom: 14 }}>
                      <div style={{ fontSize: 11, color: 'var(--muted)' }}>Total da comanda</div>
                      <div style={{ fontSize: 36, fontWeight: 900, fontFamily: 'Bebas Neue', color: 'var(--green)', letterSpacing: 1 }}>
                        {formatMoney(activeOrder.total)}
                      </div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
                      {FORMAS.map(f => (
                        <button key={f} onClick={() => setForma(f)}
                          style={{
                            padding: '10px', borderRadius: 10, fontSize: 12, fontWeight: 700,
                            border: '2px solid', cursor: 'pointer', fontFamily: 'inherit',
                            background: forma === f ? 'var(--red)' : 'var(--bg4)',
                            borderColor: forma === f ? 'var(--red)' : 'var(--border)',
                            color: forma === f ? '#fff' : 'var(--dim)',
                          }}>
                          {f === 'PIX' ? '⚡ PIX' : f === 'Dinheiro' ? '💵 Dinheiro' : f}
                        </button>
                      ))}
                    </div>
                    <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                      <button className="btn btn-outline" onClick={() => { setPayStep(null); setForma('Dinheiro') }} style={{ flex: 1 }}>Voltar</button>
                      <button className="btn btn-primary" style={{ flex: 1 }}
                        disabled={!podeFechar}
                        onClick={() => {
                          if (!podeFechar) { toast.error('Aguardando cozinha terminar o preparo'); return }
                          if (forma === 'Dinheiro') setPayStep('troco')
                          else if (forma === 'PIX') handleFechar()
                          else setPayStep('cartao')
                        }}>
                        {podeFechar ? <>Continuar <ChevronRight size={13} /></> : '⏳ Aguardando cozinha'}
                      </button>
                    </div>
                    <button className="btn btn-ghost btn-sm" style={{ width: '100%' }} onClick={handleSolicitarPagamento}>
                      <Bell size={12} /> Avisar o Caixa para Cobrar
                    </button>
                  </div>
                )}

                {/* Etapa: Troco */}
                {payStep === 'troco' && (
                  <div style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 12, padding: 16 }}>
                    <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 14 }}>💵 Pagamento em Dinheiro</div>
                    <div style={{ marginBottom: 8 }}>
                      <div style={{ fontSize: 11, color: 'var(--muted)' }}>Total</div>
                      <div style={{ fontSize: 28, fontWeight: 900, fontFamily: 'Bebas Neue', color: 'var(--green)', letterSpacing: 1 }}>
                        {formatMoney(activeOrder.total)}
                      </div>
                    </div>
                    <div style={{ marginBottom: 12 }}>
                      <label className="label">Valor recebido</label>
                      <input className="input" type="number" step="0.50" value={valorRec} onChange={e => setValorRec(e.target.value)}
                        placeholder="0,00" autoFocus style={{ fontSize: 18, fontWeight: 700, textAlign: 'center' }} />
                    </div>
                    {troco !== null && troco >= 0 && (
                      <div style={{
                        textAlign: 'center', padding: '10px 14px',
                        background: troco > 0 ? 'rgba(34,197,94,0.1)' : 'rgba(255,255,255,0.05)',
                        border: `1px solid ${troco > 0 ? 'rgba(34,197,94,0.3)' : 'var(--border)'}`,
                        borderRadius: 10, marginBottom: 12,
                      }}>
                        <div style={{ fontSize: 10, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 1 }}>Troco</div>
                        <div style={{ fontSize: 32, fontWeight: 900, fontFamily: 'Bebas Neue', color: troco > 0 ? 'var(--green)' : 'var(--muted)', letterSpacing: 1 }}>
                          {formatMoney(troco)}
                        </div>
                      </div>
                    )}
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button className="btn btn-outline" onClick={() => { setPayStep('forma'); setValorRec('') }} style={{ flex: 1 }}>Voltar</button>
                      <button className="btn btn-primary" style={{ flex: 1 }} onClick={handleFechar}
                        disabled={closing || !valorRec || parseFloat(valorRec) < (activeOrder?.total || 0)}>
                        {closing ? <><div className="spinner" style={{ width: 14, height: 14 }} /> Fechando...</> : '✅ Confirmar'}
                      </button>
                    </div>
                  </div>
                )}

                {/* Etapa: Cartão */}
                {payStep === 'cartao' && (
                  <div style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 12, padding: 16 }}>
                    <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 12 }}>💳 {forma}</div>
                    <div style={{ textAlign: 'center', marginBottom: 14 }}>
                      <div style={{ fontSize: 11, color: 'var(--muted)' }}>Valor a cobrar na maquininha</div>
                      <div style={{ fontSize: 32, fontWeight: 900, fontFamily: 'Bebas Neue', color: 'var(--green)', letterSpacing: 1 }}>
                        {formatMoney(activeOrder.total)}
                      </div>
                    </div>
                    <div style={{ background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.2)', borderRadius: 8, padding: '10px 14px', fontSize: 12, color: 'var(--dim)', marginBottom: 12 }}>
                      💡 Efetue a cobrança na <strong>maquininha</strong> e confirme aqui.
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button className="btn btn-outline" onClick={() => setPayStep('forma')} style={{ flex: 1 }}>Voltar</button>
                      <button className="btn btn-primary" style={{ flex: 1 }} onClick={handleFechar} disabled={closing}>
                        {closing ? <><div className="spinner" style={{ width: 14, height: 14 }} /> Fechando...</> : '✅ Pago na Maquininha'}
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {/* Modal: nome do cliente */}
      {nameModal && (
        <div className="modal-overlay" onClick={() => setNameModal(false)}>
          <div className="modal" style={{ maxWidth: 360 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">Abrir Mesa {selTable?.numero}</span>
              <button className="modal-close" onClick={() => setNameModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <label className="label">Nome do cliente (opcional)</label>
              <input className="input" autoFocus value={guestName} onChange={e => setGuestName(e.target.value)}
                placeholder="Ex.: João, família Silva..."
                onKeyDown={e => e.key === 'Enter' && handleOpenTable()} />
              <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>Deixe em branco para abrir sem nome</div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setNameModal(false)}>Cancelar</button>
              <button className="btn btn-primary" onClick={handleOpenTable} disabled={openingTable}>
                {openingTable ? <><div className="spinner" style={{ width: 14, height: 14 }} /> Abrindo...</> : 'Abrir Comanda'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal PIX */}
      {pixModal && activeOrder && (
        <PixModal
          amount={activeOrder.total}
          txid={activeOrder.id?.slice(0, 8)}
          description={`Mesa ${selTable?.numero} — Comanda #${activeOrder.numero_pedido}`}
          onClose={() => setPixModal(false)}
          onConfirm={handleConfirmPix}
          confirming={closing}
        />
      )}
    </div>
  )
}
