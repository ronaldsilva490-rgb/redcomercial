/**
 * CaixaView — Centro de controle do caixa. v7
 *
 * MELHORIAS v7:
 * - Venda balcão CORRIGIDA: itens com destino=cozinha vão para cozinha normalmente
 * - Histórico com filtro de data (de/até)
 * - Editar informações do delivery após criação
 * - Divisão de conta (split bill) em N partes
 * - Cancelar item individual no detalhe
 * - Adicionar item a pedido ativo
 * - Pré-pago: sem botão de pagamento
 * - Validação cozinha antes de fechar
 */
import { useEffect, useState, useCallback, useRef } from 'react'
import {
  Bell, Plus, MapPin, DollarSign, X, Package, UtensilsCrossed,
  Bike, RefreshCw, ShoppingBag, Search, Minus, ChevronRight,
  Phone, AlertCircle, XCircle, Edit2, Users, Calendar, Filter,
} from 'lucide-react'
import CaixaBlocker from '../../components/CaixaBlocker'
import api from '../../services/api'
import { formatMoney } from '../../utils/format'
import useNotifStore from '../../store/notifStore'
import useAuthStore from '../../store/authStore'
import PixModal from '../../components/ui/PixModal'
import { formatDistanceToNow, format, startOfDay, endOfDay } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import toast from 'react-hot-toast'

const FORMAS = ['Dinheiro', 'PIX', 'Cartão Débito', 'Cartão Crédito', 'Transferência', 'Fiado']

const STATUS_LABEL = {
  aberto: 'Aberto', em_preparo: 'Preparo', pronto: 'Pronto',
  saindo: 'A Caminho', entregue: 'Entregue', fechado: 'Fechado', cancelado: 'Cancelado',
}
const STATUS_COLOR = {
  aberto: 'blue', em_preparo: 'yellow', pronto: 'green',
  saindo: 'purple', entregue: 'gray', fechado: 'gray', cancelado: 'red',
}

function timeAgo(ts) {
  try { return formatDistanceToNow(new Date(ts), { addSuffix: true, locale: ptBR }) }
  catch { return '' }
}

/**
 * Calcula o status visual inteligente de um pedido baseado nos itens.
 * Reflete a realidade da cozinha, não apenas o campo status do DB.
 */
function calcularStatusVisual(order) {
  const items = order.items || []
  const cozItems = items.filter(i => i.destino === 'cozinha')

  if (cozItems.length === 0) {
    // Sem itens de cozinha: status real do pedido
    return { status: order.status, label: STATUS_LABEL[order.status] || order.status, color: STATUS_COLOR[order.status] || 'gray' }
  }

  const prontos = cozItems.filter(i => i.status_item === 'pronto').length
  const fazendo = cozItems.filter(i => i.status_item === 'em_preparo').length
  const pendentes = cozItems.filter(i => !i.status_item || i.status_item === 'pendente').length

  if (prontos === cozItems.length) {
    return { status: 'pronto', label: '✅ Pronto', color: 'green' }
  }
  if (fazendo > 0) {
    return { status: 'em_preparo', label: `🍳 Fazendo (${fazendo + prontos}/${cozItems.length})`, color: 'yellow' }
  }
  if (pendentes > 0 && fazendo === 0 && prontos === 0) {
    return { status: 'aberto', label: '⏳ Na fila', color: 'blue' }
  }
  return { status: order.status, label: STATUS_LABEL[order.status] || order.status, color: STATUS_COLOR[order.status] || 'gray' }
}

const EMPTY_DELIVERY = {
  nome: '', tel: '', end: '', compl: '', bairro: '', obs: '',
  delivery_pago: false, forma_pagamento: 'PIX',
}

// ── Modal para criar pedidos (delivery e balcão) ──────────────────────────────
function PedidoModal({ title, icon, onClose, onSave, saving, isDelivery = false }) {
  const [form, setForm] = useState(EMPTY_DELIVERY)
  const [products, setProducts] = useState([])
  const [cart, setCart] = useState([])
  const [search, setSearch] = useState('')
  const [cat, setCat] = useState('')
  const [cats, setCats] = useState([])
  const [loadingProds, setLoadingProds] = useState(true)
  const setF = (k, v) => setForm(f => ({ ...f, [k]: v }))

  useEffect(() => {
    setLoadingProds(true)
    api.get('/api/products', { params: { ativo: true } })
      .then(r => {
        const prods = r.data.data || []
        setProducts(prods)
        setCats([...new Set(prods.map(p => p.categoria).filter(Boolean))])
      })
      .catch(() => toast.error('A prateleira emperrou, não consegui carregar os produtos 📦'))
      .finally(() => setLoadingProds(false))
  }, [])

  const addToCart = (p) => setCart(prev => {
    const ex = prev.find(i => i.id === p.id)
    if (ex) return prev.map(i => i.id === p.id ? { ...i, qtd: i.qtd + 1 } : i)
    return [...prev, { ...p, qtd: 1 }]
  })
  const changeQtd = (id, d) =>
    setCart(prev => prev.map(i => i.id === id ? { ...i, qtd: Math.max(0, i.qtd + d) } : i).filter(i => i.qtd > 0))
  const total = cart.reduce((s, i) => s + i.qtd * parseFloat(i.preco_venda || 0), 0)
  const filtered = products.filter(p => {
    const s = search.toLowerCase().trim()
    const nomeMatch = !s || p.nome.toLowerCase().includes(s) || (p.descricao || '').toLowerCase().includes(s)
    const catMatch = !cat || p.categoria === cat
    return nomeMatch && catMatch
  })

  const handleSave = () => {
    if (isDelivery && (!form.nome || !form.end)) return toast.error('Nome e endereço são obrigatórios')
    if (!cart.length) return toast.error('Adicione pelo menos um item')
    onSave(form, cart, total)
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      {/* modal usa flex column com altura total — products area cresce para preencher */}
      <div className="modal" style={{ maxWidth: 640, display: 'flex', flexDirection: 'column', maxHeight: '90vh' }} onClick={e => e.stopPropagation()}>
        <div className="modal-header" style={{ flexShrink: 0 }}>
          <span className="modal-title">{icon} {title}</span>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        {/* Parte scrollável */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* Dados do cliente (delivery only) */}
          {isDelivery && (
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>Dados do Cliente</div>
              <div className="form-grid">
                <div><label className="label">Nome *</label><input className="input" value={form.nome} onChange={e => setF('nome', e.target.value)} placeholder="Nome do cliente" /></div>
                <div><label className="label">Telefone</label><input className="input" value={form.tel} onChange={e => setF('tel', e.target.value)} placeholder="(00) 99999-0000" /></div>
                <div style={{ gridColumn: '1/-1' }}><label className="label">Endereço *</label><input className="input" value={form.end} onChange={e => setF('end', e.target.value)} placeholder="Rua, número" /></div>
                <div><label className="label">Complemento</label><input className="input" value={form.compl} onChange={e => setF('compl', e.target.value)} placeholder="Apto, casa..." /></div>
                <div><label className="label">Bairro</label><input className="input" value={form.bairro} onChange={e => setF('bairro', e.target.value)} placeholder="Bairro" /></div>
                <div style={{ gridColumn: '1/-1' }}><label className="label">Observação</label><input className="input" value={form.obs} onChange={e => setF('obs', e.target.value)} placeholder="Sem cebola, campainha quebrada..." /></div>
              </div>
            </div>
          )}

          {/* Produtos — SEM maxHeight interno; o modal inteiro é scrollável */}
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>
              {isDelivery ? 'Itens do Pedido' : 'Produtos'}
            </div>

            {/* Busca + categorias */}
            <div style={{ display: 'flex', gap: 6, marginBottom: 10, flexWrap: 'wrap' }}>
              <div style={{ flex: 1, position: 'relative', minWidth: 160 }}>
                <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)' }} />
                <input className="input" style={{ paddingLeft: 30, fontSize: 12 }} placeholder="Buscar produto..." value={search}
                  onChange={e => setSearch(e.target.value)} autoFocus={!isDelivery} />
              </div>
              {cats.map(c => (
                <button key={c} onClick={() => setCat(cat === c ? '' : c)}
                  style={{ padding: '5px 10px', borderRadius: 16, fontSize: 11, fontWeight: 600,
                    border: '1px solid', cursor: 'pointer', fontFamily: 'inherit',
                    background: cat === c ? 'var(--red)' : 'transparent',
                    borderColor: cat === c ? 'var(--red)' : 'var(--border)',
                    color: cat === c ? '#fff' : 'var(--muted)' }}>{c}</button>
              ))}
              {(search || cat) && (
                <button onClick={() => { setSearch(''); setCat('') }}
                  style={{ padding: '5px 10px', borderRadius: 16, fontSize: 11, border: '1px solid var(--border)',
                    cursor: 'pointer', fontFamily: 'inherit', background: 'transparent', color: 'var(--muted)' }}>
                  ✕ Limpar
                </button>
              )}
            </div>

            {loadingProds ? (
              <div style={{ color: 'var(--muted)', fontSize: 12, padding: 20, textAlign: 'center' }}>
                <div className="spinner" style={{ width: 16, height: 16, margin: '0 auto 8px' }} />
                Carregando produtos...
              </div>
            ) : filtered.length === 0 ? (
              <div style={{ color: 'var(--muted)', fontSize: 12, padding: '16px 0', textAlign: 'center' }}>
                {products.length === 0
                  ? '⚠️ Nenhum produto cadastrado no cardápio.'
                  : `Nenhum resultado para "${search || cat}"`}
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))', gap: 6 }}>
                {filtered.map(p => (
                  <button key={p.id} onClick={() => addToCart(p)}
                    style={{ background: 'var(--bg4)', border: '1px solid var(--border)', borderRadius: 8,
                      padding: '8px 10px', cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit',
                      transition: 'all 0.15s', position: 'relative' }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--red-border)'; e.currentTarget.style.background = 'var(--bg3)' }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.background = 'var(--bg4)' }}>
                    {cart.find(i => i.id === p.id) && (
                      <div style={{ position: 'absolute', top: 4, right: 4, background: 'var(--red)', color: '#fff',
                        borderRadius: 8, fontSize: 9, fontWeight: 800, padding: '1px 5px', lineHeight: 1.4 }}>
                        {cart.find(i => i.id === p.id).qtd}
                      </div>
                    )}
                    <div style={{ fontSize: 9, color: 'var(--muted)', marginBottom: 2 }}>
                      {p.destino === 'cozinha' ? '🍳' : p.destino === 'bar' ? '🍺' : '🪟'} {p.categoria || ''}
                    </div>
                    <div style={{ fontSize: 11, fontWeight: 600, marginBottom: 4, lineHeight: 1.3, color: 'var(--text)' }}>{p.nome}</div>
                    <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--red)' }}>{formatMoney(p.preco_venda)}</div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Carrinho */}
          {cart.length > 0 && (
            <div style={{ background: 'var(--bg4)', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
              <div style={{ padding: '8px 14px', borderBottom: '1px solid var(--border)', fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 1 }}>
                Carrinho ({cart.reduce((s, i) => s + i.qtd, 0)} itens)
              </div>
              {cart.map(item => (
                <div key={item.id} style={{ padding: '8px 14px', borderBottom: '1px solid rgba(255,255,255,0.04)', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <button onClick={() => changeQtd(item.id, -1)} style={{ width: 24, height: 24, borderRadius: 6, background: 'var(--bg3)', border: '1px solid var(--border)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Minus size={10} /></button>
                  <span style={{ flex: 1, fontSize: 12, fontWeight: 500, color: 'var(--text)' }}>{item.qtd}× {item.nome}
                    {item.destino === 'cozinha' && <span style={{ fontSize: 9, color: '#F97316', marginLeft: 4 }}>🍳</span>}
                  </span>
                  <button onClick={() => changeQtd(item.id, 1)} style={{ width: 24, height: 24, borderRadius: 6, background: 'var(--bg3)', border: '1px solid var(--border)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Plus size={10} /></button>
                  <span style={{ fontSize: 12, color: 'var(--muted)', minWidth: 60, textAlign: 'right' }}>{formatMoney(item.qtd * parseFloat(item.preco_venda || 0))}</span>
                  <button onClick={() => setCart(c => c.filter(i => i.id !== item.id))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', display: 'flex', flexShrink: 0 }}><X size={12} /></button>
                </div>
              ))}
              <div style={{ padding: '10px 14px', display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: 14 }}>
                <span style={{ color: 'var(--text)' }}>Total</span>
                <span style={{ color: 'var(--green)' }}>{formatMoney(total)}</span>
              </div>
            </div>
          )}

          {/* Pagamento */}
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>Pagamento</div>
            {isDelivery && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                <input type="checkbox" id="del-pago" checked={form.delivery_pago} onChange={e => setF('delivery_pago', e.target.checked)} />
                <label htmlFor="del-pago" style={{ fontSize: 13, cursor: 'pointer', color: 'var(--text)' }}>Já pagou (pré-pago)</label>
              </div>
            )}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
              {FORMAS.map(f => (
                <button key={f} onClick={() => setF('forma_pagamento', f)}
                  style={{ padding: '7px', borderRadius: 8, fontSize: 11, fontWeight: 600,
                    border: '1px solid', cursor: 'pointer', fontFamily: 'inherit',
                    background: form.forma_pagamento === f ? 'var(--red)' : 'var(--bg3)',
                    borderColor: form.forma_pagamento === f ? 'var(--red)' : 'var(--border)',
                    color: form.forma_pagamento === f ? '#fff' : 'var(--dim)' }}>{f}</button>
              ))}
            </div>
          </div>
        </div>

        <div className="modal-footer" style={{ flexShrink: 0 }}>
          <button className="btn btn-outline" onClick={onClose}>Cancelar</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving || !cart.length}>
            {saving ? <><div className="spinner" style={{ width: 14, height: 14 }} /> Criando...</> : `${icon} Criar (${formatMoney(total)})`}
          </button>
        </div>
      </div>
    </div>
  )
}
// ── Modal de cancelamento ──────────────────────────────────────────────────────
function CancelModal({ order, onClose, onConfirm, cancelling }) {
  const [motivo, setMotivo] = useState('')
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 400 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <span className="modal-title">❌ Cancelar Pedido #{order?.numero_pedido}</span>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          <div style={{ background: 'rgba(232,25,44,0.08)', border: '1px solid rgba(232,25,44,0.2)', borderRadius: 8, padding: '10px 14px', marginBottom: 14, fontSize: 12, color: 'var(--muted)' }}>
            ⚠️ Esta ação não pode ser desfeita. Todos os envolvidos serão notificados.
          </div>
          <label className="label">Motivo do cancelamento</label>
          <input className="input" value={motivo} onChange={e => setMotivo(e.target.value)}
            placeholder="Ex.: cliente desistiu, erro no pedido..." autoFocus />
        </div>
        <div className="modal-footer">
          <button className="btn btn-outline" onClick={onClose}>Voltar</button>
          <button className="btn btn-primary" style={{ background: 'var(--red)', borderColor: 'var(--red)' }}
            onClick={() => onConfirm(motivo)} disabled={cancelling}>
            {cancelling ? <><div className="spinner" style={{ width: 14, height: 14 }} /> Cancelando...</> : '❌ Confirmar Cancelamento'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Modal editar delivery ──────────────────────────────────────────────────────
function EditDeliveryModal({ order, onClose, onSave, saving }) {
  const [form, setForm] = useState({
    delivery_nome: order.delivery_nome || '',
    delivery_tel: order.delivery_tel || '',
    delivery_end: order.delivery_end || '',
    delivery_compl: order.delivery_compl || '',
    delivery_bairro: order.delivery_bairro || '',
    delivery_obs: order.delivery_obs || '',
  })
  const setF = (k, v) => setForm(f => ({ ...f, [k]: v }))
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 480 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <span className="modal-title">✏️ Editar Delivery #{order.numero_pedido}</span>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          <div className="form-grid">
            <div><label className="label">Nome</label><input className="input" value={form.delivery_nome} onChange={e => setF('delivery_nome', e.target.value)} /></div>
            <div><label className="label">Telefone</label><input className="input" value={form.delivery_tel} onChange={e => setF('delivery_tel', e.target.value)} /></div>
            <div style={{ gridColumn: '1/-1' }}><label className="label">Endereço</label><input className="input" value={form.delivery_end} onChange={e => setF('delivery_end', e.target.value)} /></div>
            <div><label className="label">Complemento</label><input className="input" value={form.delivery_compl} onChange={e => setF('delivery_compl', e.target.value)} /></div>
            <div><label className="label">Bairro</label><input className="input" value={form.delivery_bairro} onChange={e => setF('delivery_bairro', e.target.value)} /></div>
            <div style={{ gridColumn: '1/-1' }}><label className="label">Observação</label><input className="input" value={form.delivery_obs} onChange={e => setF('delivery_obs', e.target.value)} /></div>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-outline" onClick={onClose}>Cancelar</button>
          <button className="btn btn-primary" onClick={() => onSave(form)} disabled={saving}>
            {saving ? '...' : '💾 Salvar'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Modal divisão de conta ─────────────────────────────────────────────────────
function SplitBillModal({ total, onClose }) {
  const [partes, setPartes] = useState(2)
  const valorParte = total / partes
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 360 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <span className="modal-title">👥 Dividir Conta</span>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          <div style={{ textAlign: 'center', marginBottom: 20 }}>
            <div style={{ fontSize: 11, color: 'var(--muted)' }}>Total da conta</div>
            <div style={{ fontSize: 32, fontWeight: 900, fontFamily: 'Bebas Neue', color: 'var(--green)', letterSpacing: 1 }}>
              {formatMoney(total)}
            </div>
          </div>
          <label className="label">Dividir em quantas partes?</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
            <button onClick={() => setPartes(p => Math.max(2, p - 1))}
              style={{ width: 36, height: 36, borderRadius: 8, background: 'var(--bg3)', border: '1px solid var(--border)', cursor: 'pointer', fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>−</button>
            <span style={{ fontSize: 28, fontWeight: 900, fontFamily: 'Bebas Neue', flex: 1, textAlign: 'center' }}>{partes}</span>
            <button onClick={() => setPartes(p => Math.min(20, p + 1))}
              style={{ width: 36, height: 36, borderRadius: 8, background: 'var(--bg3)', border: '1px solid var(--border)', cursor: 'pointer', fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
          </div>
          <div style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 12, padding: 16, textAlign: 'center' }}>
            <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 4 }}>Cada pessoa paga</div>
            <div style={{ fontSize: 40, fontWeight: 900, fontFamily: 'Bebas Neue', color: 'var(--red)', letterSpacing: 1 }}>
              {formatMoney(valorParte)}
            </div>
            <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>
              {partes}× {formatMoney(valorParte)} = {formatMoney(total)}
            </div>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-primary" style={{ width: '100%' }} onClick={onClose}>Fechar</button>
        </div>
      </div>
    </div>
  )
}

// ── COMPONENTE PRINCIPAL ───────────────────────────────────────────────────────
export default function CaixaView() {
  const { items: notifs, markRead, markAllRead, chamarGarcom } = useNotifStore()
  const { tenant } = useAuthStore()

  const [orders, setOrders] = useState({ ativos: [], delivery: [], historico: [] })
  const [loading, setLoading] = useState(true)
  const [detail, setDetail] = useState(null)
  const [payModal, setPayModal] = useState(null)
  const [pixModal, setPixModal] = useState(null)
  const [forma, setForma] = useState('Dinheiro')
  const [paying, setPaying] = useState(false)
  const [tab, setTab] = useState('ativos')
  const [troco, setTroco] = useState('')

  const [delivModal, setDelivModal] = useState(false)
  const [balcaoModal, setBalcaoModal] = useState(false)
  const [savingNew, setSavingNew] = useState(false)
  const [cancelModal, setCancelModal] = useState(null)
  const [cancelling, setCancelling] = useState(false)
  const [editDelivModal, setEditDelivModal] = useState(null)
  const [savingEdit, setSavingEdit] = useState(false)
  const [splitModal, setSplitModal] = useState(false)

  // Atribuição de cliente ao pedido (para fiado)
  const [clients, setClients] = useState([])
  const [assigningClient, setAssigningClient] = useState(false)

  // Filtros de histórico
  const [histFilter, setHistFilter] = useState({ de: '', ate: '' })
  const [histLoading, setHistLoading] = useState(false)

  const unreadNotifs = notifs.filter(n => !n.lida)
  const isRestaurante = tenant?.tipo === 'restaurante'

  const load = useCallback(async () => {
    try {
      const [r1, r2, r3, r4, r5] = await Promise.all([
        api.get('/api/orders', { params: { status: 'aberto' } }),
        api.get('/api/orders', { params: { status: 'em_preparo' } }),
        api.get('/api/orders', { params: { delivery: '1' } }),
        api.get('/api/orders', { params: { status: 'fechado' } }),
        api.get('/api/orders', { params: { status: 'cancelado' } }),
      ])

      // Para pedidos ativos, busca detalhes (com itens) para calcular status real da cozinha
      const ativosRaw = [
        ...(r1.data.data || []),
        ...(r2.data.data || []),
      ].filter((o, i, self) => self.findIndex(x => x.id === o.id) === i)
        .filter(o => !o.is_delivery)

      const ativosComItens = await Promise.all(
        ativosRaw.map(o => api.get(`/api/orders/${o.id}`).then(r => r.data.data).catch(() => o))
      )

      const delivery = (r3.data.data || []).filter(o => !['fechado', 'cancelado'].includes(o.status))
      const historico = [
        ...(r4.data.data || []),
        ...(r5.data.data || []),
      ].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 50)

      setOrders({ ativos: ativosComItens, delivery, historico })
    } catch { toast.error("Oops! Não consegui buscar pedidos. Tente novamente 😕") }
    finally { setLoading(false) }
  }, [])

  const loadHistorico = useCallback(async () => {
    setHistLoading(true)
    try {
      const params = { status: 'fechado,cancelado', limit: 100 }
      if (histFilter.de) params.data_de = histFilter.de + 'T00:00:00'
      if (histFilter.ate) params.data_ate = histFilter.ate + 'T23:59:59'
      const { data } = await api.get('/api/orders', { params })
      const historico = (data.data || []).sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      setOrders(prev => ({ ...prev, historico }))
    } catch { toast.error('Erro ao buscar histórico') }
    finally { setHistLoading(false) }
  }, [histFilter])

  useEffect(() => { load() }, [load])
  useEffect(() => {
    const t = setInterval(load, 15000)
    return () => clearInterval(t)
  }, [load])

  // Carrega clientes para seletor de fiado
  useEffect(() => {
    api.get('/api/clients').then(r => setClients(r.data.data || [])).catch(() => {})
  }, [])

  // Atribuir cliente a pedido ativo (necessário para fiado)
  const handleAssignClient = async (orderId, clientId) => {
    if (!clientId) return
    setAssigningClient(true)
    try {
      await api.patch(`/api/orders/${orderId}/assign-client`, { client_id: clientId })
      toast.success('Cliente associado ao pedido!')
      await openDetail(orderId)
    } catch (e) {
      toast.error(e.response?.data?.error || 'Erro ao associar cliente')
    } finally { setAssigningClient(false) }
  }

  const openDetail = async (orderId) => {
    try {
      const { data } = await api.get(`/api/orders/${orderId}`)
      setDetail(data.data)
      setForma('Dinheiro')
      setTroco('')
      setPayModal(null)
    } catch { toast.error("Oops! Não consegui buscar pedido. Tente novamente 😕") }
  }

  // ── Fechar pedido ────────────────────────────────────────────────────────
  const handleFechar = async (orderId, formaPag) => {
    if (formaPag === 'PIX') {
      const all = [...orders.ativos, ...orders.delivery]
      const ord = all.find(o => o.id === orderId)
      setPixModal({ orderId, total: detail?.total || ord?.total || 0 })
      setPayModal(null)
      return
    }
    setPaying(true)
    try {
      await api.patch(`/api/orders/${orderId}/status`, { status: 'fechado', forma_pagamento: formaPag })
      toast.success('Pedido fechado! 💰')
      setDetail(null)
      setPayModal(null)
      await load()
    } catch (e) {
      toast.error(e.response?.data?.error || 'Erro ao fechar')
    } finally { setPaying(false) }
  }

  const handleConfirmPix = async () => {
    if (!pixModal) return
    setPaying(true)
    try {
      if (pixModal.isDelivery) {
        // Se for delivery pré-pago aprovando PIX, o status imediato é em_preparo (pois precisa cozinhar ou sair)
        await api.patch(`/api/orders/${pixModal.orderId}/status`, { status: 'em_preparo', forma_pagamento: 'PIX' })
        toast.success('PIX confirmado! Cozinha notificada. 🍳')
      } else {
        await api.patch(`/api/orders/${pixModal.orderId}/status`, { status: 'fechado', forma_pagamento: 'PIX' })
        toast.success('PIX confirmado! ✅')
      }
      setPixModal(null)
      setDetail(null)
      await load()
    } catch (e) {
      toast.error(e.response?.data?.error || 'Erro')
    } finally { setPaying(false) }
  }

  // ── Cancelar pedido ──────────────────────────────────────────────────────
  const handleCancelar = async (motivo) => {
    if (!cancelModal) return
    setCancelling(true)
    try {
      await api.post(`/api/orders/${cancelModal.id}/cancelar`, { motivo: motivo || 'Cancelado pelo caixa' })
      toast.success('Pedido cancelado. Todos foram notificados.')
      setCancelModal(null)
      setDetail(null)
      await load()
    } catch (e) {
      toast.error(e.response?.data?.error || 'Erro ao cancelar')
    } finally { setCancelling(false) }
  }

  // ── Editar delivery ──────────────────────────────────────────────────────
  const handleSaveDeliveryEdit = async (form) => {
    if (!editDelivModal) return
    setSavingEdit(true)
    try {
      await api.patch(`/api/orders/${editDelivModal.id}/delivery-info`, form)
      toast.success('Tudo salvo e atualizado! ✨')
      setEditDelivModal(null)
      await openDetail(editDelivModal.id)
    } catch (e) {
      toast.error(e.response?.data?.error || 'Erro ao atualizar')
    } finally { setSavingEdit(false) }
  }

  // ── Criar venda no balcão ─────────────────────────────────────────────────
  const handleSaveBalcao = async (form, cart, total) => {
    setSavingNew(true)
    try {
      const { data: orderRes } = await api.post('/api/orders', {
        is_delivery: false,
        obs: 'Venda Balcão',
        forma_pagamento: form.forma_pagamento,
      })
      const orderId = orderRes.data.id
      // Balcão: usa o destino real do produto (itens de cozinha vão para cozinha!)
      for (const item of cart) {
        await api.post(`/api/orders/${orderId}/items`, {
          product_id: item.id,
          nome: item.nome,
          qtd: item.qtd,
          preco_unit: parseFloat(item.preco_venda || 0),
          destino: item.destino || 'balcao', // preserva destino real do produto
        })
      }

      // Verifica se tem itens de cozinha — se sim, envia para preparo
      const temCozinha = cart.some(i => i.destino === 'cozinha')
      if (temCozinha) {
        await api.patch(`/api/orders/${orderId}/status`, { status: 'em_preparo' })
        toast.success('Show! O pedido foi lá pra cozinha 🍳')
      } else if (form.forma_pagamento === 'PIX') {
        setPixModal({ orderId, total })
      } else {
        // Sem cozinha → fecha diretamente
        await api.patch(`/api/orders/${orderId}/status`, { status: 'fechado', forma_pagamento: form.forma_pagamento })
        toast.success('Venda registrada e fechada! ✅')
      }
      setBalcaoModal(false)
      await load()
    } catch (e) {
      toast.error(e.response?.data?.error || 'Erro ao criar venda')
    } finally { setSavingNew(false) }
  }

  // ── Criar delivery ────────────────────────────────────────────────────────
  const handleSaveDelivery = async (form, cart, total) => {
    setSavingNew(true)
    try {
      const { data: orderRes } = await api.post('/api/orders', {
        is_delivery: true,
        delivery_nome: form.nome,
        delivery_tel: form.tel || undefined,
        delivery_end: form.end,
        delivery_compl: form.compl || undefined,
        delivery_bairro: form.bairro || undefined,
        delivery_obs: form.obs || undefined,
        delivery_pago: form.delivery_pago,
        forma_pagamento: form.forma_pagamento,
      })
      const orderId = orderRes.data.id
      for (const item of cart) {
        await api.post(`/api/orders/${orderId}/items`, {
          product_id: item.id, nome: item.nome,
          qtd: item.qtd, preco_unit: parseFloat(item.preco_venda || 0),
          destino: item.destino || 'cozinha',
        })
      }
      if (form.delivery_pago) {
        if (form.forma_pagamento === 'PIX') {
          setPixModal({ orderId, total, isDelivery: true })
        } else {
          await api.patch(`/api/orders/${orderId}/status`, { status: 'em_preparo' })
          toast.success('Delivery pré-pago criado! Cozinha notificada. 🍳')
        }
      } else {
        toast.success('Bora acelerar! Entrega foi agendada 🛵')
      }
      setDelivModal(false)
      await load()
    } catch (e) {
      toast.error(e.response?.data?.error || 'Erro ao criar delivery')
    } finally { setSavingNew(false) }
  }

  // ── Verificações do detalhe ──────────────────────────────────────────────
  const cozinhaItemsPendentes = detail
    ? (detail.items || []).filter(i => i.destino === 'cozinha' && i.status_item !== 'pronto')
    : []
  const podeFechar = cozinhaItemsPendentes.length === 0

  // ── Painel de detalhe ────────────────────────────────────────────────────
  const DetailPanel = detail ? (
    <div style={{ width: 340, background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 14, overflow: 'hidden', flexShrink: 0 }}>
      <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontWeight: 700, fontSize: 13, flex: 1 }}>
          {detail.is_delivery ? `🛵 Delivery #${detail.numero_pedido}` : `Mesa ${detail.tables?.numero || '?'} #${detail.numero_pedido}`}
        </span>
        <button onClick={() => openDetail(detail.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', display: 'flex' }}><RefreshCw size={12} /></button>
        <button onClick={() => setDetail(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', display: 'flex' }}><X size={14} /></button>
      </div>

      {/* Info delivery */}
      {detail.is_delivery && (
        <div style={{ padding: '10px 16px', borderBottom: '1px solid var(--border)', fontSize: 12, background: 'rgba(59,130,246,0.05)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontWeight: 700 }}>{detail.delivery_nome}</div>
              {detail.delivery_tel && <div style={{ color: 'var(--muted)', marginTop: 2 }}>📱 {detail.delivery_tel}</div>}
              <div style={{ color: 'var(--dim)', marginTop: 2 }}>📍 {detail.delivery_end}{detail.delivery_compl ? `, ${detail.delivery_compl}` : ''}</div>
              {detail.delivery_bairro && <div style={{ color: 'var(--muted)', fontSize: 11 }}>{detail.delivery_bairro}</div>}
              {detail.delivery_obs && <div style={{ color: 'var(--yellow)', fontSize: 11, marginTop: 3 }}>📝 {detail.delivery_obs}</div>}
            </div>
            {!['fechado', 'cancelado', 'entregue'].includes(detail.status) && (
              <button onClick={() => setEditDelivModal(detail)}
                style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 6, padding: '4px 8px', cursor: 'pointer', color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: 4, fontSize: 10 }}>
                <Edit2 size={10} /> Editar
              </button>
            )}
          </div>
          {detail.delivery_pago && (
            <div style={{ marginTop: 6, fontSize: 11, fontWeight: 700, color: 'var(--green)', background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)', borderRadius: 6, padding: '4px 8px', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              ✅ PRÉ-PAGO — pagamento já recebido
            </div>
          )}
        </div>
      )}

      {/* Itens */}
      <div style={{ borderBottom: '1px solid var(--border)', maxHeight: 260, overflowY: 'auto' }}>
        {(detail.items || []).map(item => {
          const stColors = {
            pendente: 'var(--muted)', em_preparo: '#F97316', pronto: 'var(--green)'
          }
          return (
            <div key={item.id} style={{ padding: '8px 16px', borderBottom: '1px solid rgba(255,255,255,0.04)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, fontWeight: 600 }}>{item.qtd}× {item.nome}</div>
                <div style={{ display: 'flex', gap: 6, marginTop: 2 }}>
                  <span style={{ fontSize: 9, color: 'var(--muted)' }}>
                    {item.destino === 'cozinha' ? '🍳' : item.destino === 'bar' ? '🍺' : '🪟'}
                  </span>
                  {item.destino === 'cozinha' && (
                    <span style={{ fontSize: 9, fontWeight: 700, color: stColors[item.status_item] }}>
                      {item.status_item === 'pronto' ? '✅ Pronto' : item.status_item === 'em_preparo' ? '🍳 Fazendo' : '⏳ Fila'}
                    </span>
                  )}
                  {item.confirmado_garcom && (
                    <span style={{ fontSize: 9, fontWeight: 700, color: 'var(--green)' }}>✅ Entregue</span>
                  )}
                </div>
                {item.obs && <div style={{ fontSize: 10, color: 'var(--yellow)', marginTop: 2 }}>📝 {item.obs}</div>}
              </div>
              <span style={{ fontSize: 11, color: 'var(--muted)', flexShrink: 0 }}>{formatMoney(item.subtotal)}</span>
            </div>
          )
        })}
      </div>

      {/* Total + ações */}
      <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 11, color: 'var(--muted)' }}>{timeAgo(detail.created_at)}</span>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {/* Divisão de conta */}
          <button onClick={() => setSplitModal(true)}
            style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 6, padding: '3px 8px', cursor: 'pointer', color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: 4, fontSize: 10 }}>
            <Users size={10} /> Dividir
          </button>
          <span style={{ fontWeight: 900, fontSize: 22, fontFamily: 'Bebas Neue', color: 'var(--green)', letterSpacing: 1 }}>
            {formatMoney(detail.total)}
          </span>
        </div>
      </div>

      {/* Status cozinha */}
      {cozinhaItemsPendentes.length > 0 && (
        <div style={{ padding: '8px 16px', background: 'rgba(245,158,11,0.06)', borderBottom: '1px solid rgba(245,158,11,0.15)', fontSize: 11, color: '#F59E0B', display: 'flex', alignItems: 'center', gap: 6 }}>
          <AlertCircle size={11} /> Aguardando cozinha: {cozinhaItemsPendentes.length} item(s)
        </div>
      )}

      {/* Associar cliente (necessário para fiado) */}
      {!['fechado', 'cancelado'].includes(detail.status) && (
        <div style={{ padding: '8px 16px', borderBottom: '1px solid var(--border)', background: detail.clients ? 'transparent' : 'rgba(245,158,11,0.03)' }}>
          <div style={{ fontSize: 9, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>
            👤 Cliente {detail.clients ? <span style={{ color: 'var(--green)' }}>✓ {detail.clients.nome}</span> : <span style={{ color: 'var(--yellow)' }}>(obrigatório para fiado)</span>}
          </div>
          {!detail.clients && (
            <select
              className="input"
              style={{ fontSize: 11, padding: '4px 8px', height: 28 }}
              defaultValue=""
              onChange={e => { if (e.target.value) handleAssignClient(detail.id, e.target.value) }}
              disabled={assigningClient}
            >
              <option value="">Selecionar cliente...</option>
              {clients.map(c => <option key={c.id} value={c.id}>{c.nome}{c.telefone ? ` · ${c.telefone}` : ''}</option>)}
            </select>
          )}
        </div>
      )}

      {/* Botões de pagamento */}
      <div style={{ padding: '12px 16px' }}>
        {['fechado', 'cancelado'].includes(detail.status) ? (
          <div style={{ fontSize: 12, textAlign: 'center', color: detail.status === 'cancelado' ? 'var(--red)' : 'var(--green)', fontWeight: 700 }}>
            {detail.status === 'cancelado' ? '❌ Pedido cancelado' : `✅ Fechado — ${detail.forma_pagamento || ''}`}
          </div>
        ) : detail.is_delivery && detail.delivery_pago && detail.status !== 'entregue' ? (
          <div style={{ fontSize: 12, color: 'var(--green)', fontWeight: 700, textAlign: 'center', padding: 8, background: 'rgba(34,197,94,0.08)', borderRadius: 8 }}>
            ✅ PRÉ-PAGO — aguardando entrega
          </div>
        ) : detail.status === 'entregue' && !detail.delivery_pago ? (
          // Delivery cobrado na entrega — receber pagamento
          <div>
            <div style={{ marginBottom: 8 }}>
              <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 6 }}>Forma de pagamento</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 4 }}>
                {FORMAS.slice(0, 3).map(f => (
                  <button key={f} onClick={() => setForma(f)}
                    style={{ padding: '5px', borderRadius: 6, fontSize: 10, fontWeight: 600, border: '1px solid', cursor: 'pointer', fontFamily: 'inherit', background: forma === f ? 'var(--red)' : 'var(--bg4)', borderColor: forma === f ? 'var(--red)' : 'var(--border)', color: forma === f ? '#fff' : 'var(--dim)' }}>
                    {f}
                  </button>
                ))}
              </div>
            </div>
            <button className="btn btn-primary" style={{ width: '100%' }}
              onClick={() => handleFechar(detail.id, forma)} disabled={paying}>
              {paying ? '...' : <><DollarSign size={13} /> Confirmar Recebimento</>}
            </button>
          </div>
        ) : detail.status === 'entregue' && detail.delivery_pago ? (
          <button className="btn btn-primary" style={{ width: '100%', background: 'var(--green)', borderColor: 'var(--green)' }}
            onClick={() => handleFechar(detail.id, detail.forma_pagamento || 'PIX')} disabled={paying}>
            {paying ? '...' : '✅ Fechar Delivery Pré-pago'}
          </button>
        ) : (
          payModal?.orderId === detail.id ? (
            <div>
              <div style={{ marginBottom: 8 }}>
                <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 6 }}>Forma de pagamento</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 4 }}>
                  {FORMAS.map(f => (
                    <button key={f} onClick={() => setForma(f)}
                      style={{ padding: '5px', borderRadius: 6, fontSize: 10, fontWeight: 600, border: '1px solid', cursor: 'pointer', fontFamily: 'inherit', background: forma === f ? 'var(--red)' : 'var(--bg4)', borderColor: forma === f ? 'var(--red)' : 'var(--border)', color: forma === f ? '#fff' : 'var(--dim)' }}>
                      {f}
                    </button>
                  ))}
                </div>
              </div>
              {forma === 'Dinheiro' && (
                <div style={{ marginBottom: 8 }}>
                  <label className="label" style={{ fontSize: 10 }}>Valor recebido</label>
                  <input className="input" type="number" step="0.50" value={troco} onChange={e => setTroco(e.target.value)} placeholder="0,00" />
                  {troco && parseFloat(troco) >= detail.total && (
                    <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--green)', marginTop: 4 }}>
                      Troco: {formatMoney(parseFloat(troco) - detail.total)}
                    </div>
                  )}
                </div>
              )}
              {forma === 'Fiado' && (
                <div style={{ marginBottom: 8, padding: '10px 12px', background: 'rgba(245,158,11,0.07)', border: '1px solid rgba(245,158,11,0.25)', borderRadius: 8 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#F59E0B', marginBottom: 6 }}>
                    👤 Fiado exige cliente cadastrado
                  </div>
                  {detail.clients ? (
                    <div style={{ fontSize: 12, color: 'var(--green)', fontWeight: 600 }}>✓ {detail.clients.nome}</div>
                  ) : (
                    <select
                      className="input"
                      style={{ fontSize: 12, padding: '6px 10px' }}
                      defaultValue=""
                      onChange={e => { if (e.target.value) handleAssignClient(detail.id, e.target.value) }}
                      disabled={assigningClient}
                    >
                      <option value="">Selecionar cliente...</option>
                      {clients.map(c => <option key={c.id} value={c.id}>{c.nome}{c.telefone ? ` · ${c.telefone}` : ''}</option>)}
                    </select>
                  )}
                </div>
              )}
              <div style={{ display: 'flex', gap: 6 }}>
                <button className="btn btn-outline" onClick={() => setPayModal(null)} style={{ flex: 1, fontSize: 11 }}>Cancelar</button>
                <button className="btn btn-primary" style={{ flex: 1, fontSize: 11 }}
                  onClick={() => handleFechar(detail.id, forma)}
                  disabled={paying || !podeFechar || (forma === 'Dinheiro' && troco && parseFloat(troco) < detail.total) || (forma === 'Fiado' && !detail.clients)}>
                  {paying ? '...' : podeFechar ? '✅ Confirmar' : '⏳ Aguardando cozinha'}
                </button>
              </div>
            </div>
          ) : (
            <button className="btn btn-primary" style={{ width: '100%', marginBottom: 8 }}
              onClick={() => { setPayModal({ orderId: detail.id, total: detail.total }); setForma('Dinheiro') }}
              disabled={!podeFechar}>
              {podeFechar
                ? <><DollarSign size={13} /> Receber Pagamento</>
                : <><AlertCircle size={13} /> Aguardando cozinha ({cozinhaItemsPendentes.length})</>
              }
            </button>
          )
        )}

        {!['fechado', 'cancelado'].includes(detail.status) && (
          <button className="btn btn-outline" style={{ width: '100%', fontSize: 11, color: 'var(--red)', borderColor: 'rgba(232,25,44,0.3)', marginTop: 6 }}
            onClick={() => setCancelModal(detail)}>
            <XCircle size={12} /> Cancelar Pedido
          </button>
        )}
      </div>
    </div>
  ) : null

  if (loading) return <div className="loading-page"><div className="spinner" /> Carregando...</div>

  return (
    <CaixaBlocker>
    <div>
      {/* Header */}
      <div className="page-header">
        <div>
          <div className="page-title">Caixa</div>
          <div className="page-subtitle">
            {orders.ativos.length} pedido(s) ativo(s) · {orders.delivery.length} delivery
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button className="btn btn-outline btn-sm" onClick={load}><RefreshCw size={13} /></button>
          <button className="btn btn-outline btn-sm" onClick={() => chamarGarcom('Venha ao balcão, por favor.').then(() => toast.success('Garçom chamado! 📢'))}>
            <Bell size={13} /> Garçom
          </button>
          <button className="btn btn-outline" onClick={() => setBalcaoModal(true)}>
            <ShoppingBag size={13} /> Venda Balcão
          </button>
          {isRestaurante && (
            <button className="btn btn-primary" onClick={() => setDelivModal(true)}>
              <Bike size={13} /> Novo Delivery
            </button>
          )}
        </div>
      </div>

      {/* Notificações urgentes */}
      {unreadNotifs.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          {unreadNotifs.slice(0, 3).map(n => (
            <div key={n.id} onClick={() => { markRead(n.id); if (n.order_id) openDetail(n.order_id) }}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                background: n.tipo === 'pedido_cancelado' ? 'rgba(239,68,68,0.08)' : 'rgba(232,25,44,0.08)',
                border: `1px solid ${n.tipo === 'pedido_cancelado' ? 'rgba(239,68,68,0.25)' : 'rgba(232,25,44,0.25)'}`,
                borderRadius: 10, padding: '10px 14px', marginBottom: 6, cursor: 'pointer',
              }}>
              <span style={{ fontSize: 18 }}>
                {{ pagamento_solicitado: '💳', pedido_pronto: '✅', novo_pedido: '🍽️', pedido_entregue: '📦', pedido_cancelado: '❌', pedido_balcao: '🪟', pedido_bar: '🍺' }[n.tipo] || '🔔'}
              </span>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 12 }}>{n.titulo}</div>
                {n.mensagem && <div style={{ fontSize: 11, color: 'var(--muted)' }}>{n.mensagem}</div>}
              </div>
              {n.order_id && (
                <button className="btn btn-sm btn-outline" style={{ fontSize: 10 }}
                  onClick={e => { e.stopPropagation(); markRead(n.id); openDetail(n.order_id) }}>
                  Ver
                </button>
              )}
              <X size={13} color="var(--muted)" onClick={e => { e.stopPropagation(); markRead(n.id) }} />
            </div>
          ))}
          {unreadNotifs.length > 3 && (
            <button onClick={markAllRead} style={{ fontSize: 11, color: 'var(--muted)', background: 'none', border: 'none', cursor: 'pointer', padding: '4px 0' }}>
              + {unreadNotifs.length - 3} outras · marcar todas como lidas
            </button>
          )}
        </div>
      )}

      {/* Tabs */}
      <div className="tabs" style={{ marginBottom: 16 }}>
        {[
          { k: 'ativos',   label: `Pedidos (${orders.ativos.length})` },
          { k: 'delivery', label: `Delivery (${orders.delivery.length})` },
          { k: 'historico', label: 'Histórico' },
        ].map(t => (
          <button key={t.k} className={`tab-btn${tab === t.k ? ' active' : ''}`} onClick={() => setTab(t.k)}>
            {t.label}
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
        {/* Lista */}
        <div style={{ flex: 1, minWidth: 280 }}>

          {tab === 'ativos' && (
            orders.ativos.length === 0 ? (
              <div className="empty-state" style={{ padding: 32 }}>
                <UtensilsCrossed size={36} style={{ opacity: 0.3 }} />
                <p>Nenhum pedido ativo</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {orders.ativos.map(order => (
                  <div key={order.id} onClick={() => openDetail(order.id)}
                    style={{
                      background: detail?.id === order.id ? 'var(--bg3)' : 'var(--bg2)',
                      border: `1px solid ${detail?.id === order.id ? 'var(--red-border)' : 'var(--border)'}`,
                      borderRadius: 10, padding: '12px 14px', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', gap: 10, transition: 'all 0.15s',
                    }}>
                    <div style={{ width: 36, height: 36, borderRadius: 8, flexShrink: 0, background: 'var(--bg4)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Bebas Neue', fontSize: 16, color: 'var(--red)' }}>
                      {order.tables?.numero || '#'}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: 13 }}>
                        {order.tables?.numero ? `Mesa ${order.tables.numero}` : `#${order.numero_pedido}`}
                        {order.obs === 'Venda Balcão' && <span style={{ fontSize: 9, color: 'var(--muted)', marginLeft: 6 }}>🛒 Balcão</span>}
                      </div>
                      <div style={{ fontSize: 10, color: 'var(--muted)' }}>{timeAgo(order.created_at)}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontWeight: 700, fontSize: 13 }}>{formatMoney(order.total)}</div>
                      {(() => {
                        const vs = calcularStatusVisual(order)
                        return (
                          <span className={`badge badge-${vs.color}`} style={{ fontSize: 9 }}>
                            {vs.label}
                          </span>
                        )
                      })()}
                    </div>
                  </div>
                ))}
              </div>
            )
          )}

          {tab === 'delivery' && (
            orders.delivery.length === 0 ? (
              <div className="empty-state" style={{ padding: 32 }}>
                <Bike size={36} style={{ opacity: 0.3 }} />
                <p>Nenhum delivery ativo</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {orders.delivery.map(order => (
                  <div key={order.id} onClick={() => openDetail(order.id)}
                    style={{ background: detail?.id === order.id ? 'var(--bg3)' : 'var(--bg2)', border: `1px solid ${detail?.id === order.id ? 'var(--red-border)' : 'var(--border)'}`, borderRadius: 10, padding: '12px 14px', cursor: 'pointer', transition: 'all 0.15s' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <span style={{ fontSize: 16 }}>🛵</span>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 700, fontSize: 13 }}>#{order.numero_pedido} — {order.delivery_nome}</div>
                        <div style={{ fontSize: 10, color: 'var(--muted)' }}>{timeAgo(order.created_at)}</div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontWeight: 700, fontSize: 13 }}>{formatMoney(order.total)}</div>
                        <span className={`badge badge-${STATUS_COLOR[order.status] || 'gray'}`} style={{ fontSize: 9 }}>
                          {STATUS_LABEL[order.status]}
                        </span>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ fontSize: 11, color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                        <MapPin size={10} /> {order.delivery_end}
                      </div>
                      {order.delivery_pago && (
                        <span style={{ fontSize: 9, fontWeight: 700, color: 'var(--green)' }}>✅ PRÉ-PAGO</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )
          )}

          {tab === 'historico' && (
            <div>
              {/* Filtros de data */}
              <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1, minWidth: 200 }}>
                  <Calendar size={12} color="var(--muted)" />
                  <input type="date" className="input" style={{ fontSize: 11, padding: '5px 8px' }}
                    value={histFilter.de} onChange={e => setHistFilter(f => ({ ...f, de: e.target.value }))}
                    placeholder="De" />
                  <span style={{ fontSize: 11, color: 'var(--muted)' }}>até</span>
                  <input type="date" className="input" style={{ fontSize: 11, padding: '5px 8px' }}
                    value={histFilter.ate} onChange={e => setHistFilter(f => ({ ...f, ate: e.target.value }))}
                    placeholder="Até" />
                </div>
                <button className="btn btn-outline btn-sm" onClick={loadHistorico} disabled={histLoading}>
                  <Filter size={12} /> {histLoading ? '...' : 'Filtrar'}
                </button>
                {(histFilter.de || histFilter.ate) && (
                  <button className="btn btn-ghost btn-sm" onClick={() => { setHistFilter({ de: '', ate: '' }); load() }}>
                    <X size={12} /> Limpar
                  </button>
                )}
              </div>

              {/* Totalizador */}
              {orders.historico.length > 0 && (
                <div style={{ display: 'flex', gap: 12, marginBottom: 12, flexWrap: 'wrap' }}>
                  {[
                    { label: 'Vendas', val: orders.historico.filter(o => o.status === 'fechado').length, color: 'var(--green)' },
                    { label: 'Cancelados', val: orders.historico.filter(o => o.status === 'cancelado').length, color: 'var(--red)' },
                    {
                      label: 'Total',
                      val: formatMoney(orders.historico.filter(o => o.status === 'fechado').reduce((s, o) => s + parseFloat(o.total || 0), 0)),
                      color: 'var(--green)',
                    },
                  ].map(m => (
                    <div key={m.label} style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 8, padding: '6px 12px', fontSize: 11 }}>
                      <span style={{ color: 'var(--muted)' }}>{m.label}: </span>
                      <span style={{ fontWeight: 700, color: m.color }}>{m.val}</span>
                    </div>
                  ))}
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {orders.historico.map(order => (
                  <div key={order.id} style={{
                    background: 'var(--bg2)', border: '1px solid var(--border)',
                    borderRadius: 10, padding: '10px 14px', opacity: order.status === 'cancelado' ? 0.6 : 0.85,
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 12 }}>
                        {order.is_delivery ? `🛵 Delivery #${order.numero_pedido}` : `${order.obs === 'Venda Balcão' ? '🛒' : '🍽️'} Mesa ${order.tables?.numero || '?'} #${order.numero_pedido}`}
                      </div>
                      <div style={{ fontSize: 10, color: 'var(--muted)' }}>
                        {timeAgo(order.created_at)} · {order.forma_pagamento || '—'}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <span style={{ fontWeight: 700, color: order.status === 'cancelado' ? 'var(--red)' : 'var(--green)', fontSize: 13 }}>
                        {formatMoney(order.total)}
                      </span>
                      <div>
                        <span className={`badge badge-${STATUS_COLOR[order.status] || 'gray'}`} style={{ fontSize: 9 }}>
                          {STATUS_LABEL[order.status]}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
                {orders.historico.length === 0 && (
                  <div className="empty-state" style={{ padding: 32 }}>
                    <Package size={36} style={{ opacity: 0.3 }} />
                    <p>Sem histórico no período</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Detalhe */}
        {DetailPanel}
      </div>

      {/* PIX Modal */}
      {pixModal && (
        <PixModal
          amount={pixModal.total}
          txid={pixModal.orderId?.slice(0, 8)}
          description="Pagamento RED"
          onClose={() => setPixModal(null)}
          onConfirm={handleConfirmPix}
          confirming={paying}
        />
      )}

      {/* Modal Venda Balcão */}
      {balcaoModal && (
        <PedidoModal title="Venda Balcão" icon="🛒" onClose={() => setBalcaoModal(false)}
          onSave={handleSaveBalcao} saving={savingNew} isDelivery={false} />
      )}

      {/* Modal Delivery */}
      {delivModal && (
        <PedidoModal title="Novo Delivery" icon="🛵" onClose={() => setDelivModal(false)}
          onSave={handleSaveDelivery} saving={savingNew} isDelivery={true} />
      )}

      {/* Modal Cancelamento */}
      {cancelModal && (
        <CancelModal order={cancelModal} onClose={() => setCancelModal(null)}
          onConfirm={handleCancelar} cancelling={cancelling} />
      )}

      {/* Modal Editar Delivery */}
      {editDelivModal && (
        <EditDeliveryModal order={editDelivModal} onClose={() => setEditDelivModal(null)}
          onSave={handleSaveDeliveryEdit} saving={savingEdit} />
      )}

      {/* Modal Divisão de Conta */}
      {splitModal && detail && (
        <SplitBillModal total={detail.total} onClose={() => setSplitModal(false)} />
      )}
    </div>
    </CaixaBlocker>
  )
}
