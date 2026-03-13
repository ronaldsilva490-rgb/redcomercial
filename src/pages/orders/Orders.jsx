import { useEffect, useState, useCallback } from 'react'
import { Plus, Eye, Trash2, UtensilsCrossed, Search, ShoppingBag } from 'lucide-react'
import api from '../../services/api'
import { formatMoney } from '../../utils/format'
import useAuthStore from '../../store/authStore'
import toast from 'react-hot-toast'
import PixModal from '../../components/ui/PixModal'

const STATUS_BADGE = {
  aberto:     'blue',
  em_preparo: 'yellow',
  pronto:     'green',
  fechado:    'gray',
  cancelado:  'red',
}

const STATUS_LABEL = {
  aberto:     'Aberto',
  em_preparo: 'Em preparo',
  pronto:     'Pronto',
  fechado:    'Fechado',
  cancelado:  'Cancelado',
}

const FORMAS = ['Dinheiro', 'PIX', 'Cartão Débito', 'Cartão Crédito', 'Transferência', 'Fiado']

export default function Orders() {
  const { tenant, papel } = useAuthStore()
  const isRest  = tenant?.tipo === 'restaurante'
  const isAdmin = papel === 'dono' || papel === 'gerente'

  const [orders,       setOrders]       = useState([])
  const [loading,      setLoading]      = useState(true)
  const [filter,       setFilter]       = useState('')
  const [detail,       setDetail]       = useState(null)
  const [newModal,     setNewModal]     = useState(false)
  const [tables,       setTables]       = useState([])
  const [clients,      setClients]      = useState([])
  const [newForm,      setNewForm]      = useState({ table_id: '', client_id: '', obs: '' })
  const [saving,       setSaving]       = useState(false)
  const [formaModal,   setFormaModal]   = useState(null)
  const [selectedForma, setSelectedForma] = useState('Dinheiro')

  // Add items state
  const [addModal,     setAddModal]     = useState(false)
  const [products,     setProducts]     = useState([])
  const [productSearch, setProductSearch] = useState('')
  const [addItems,     setAddItems]     = useState([])
  const [savingItems,  setSavingItems]  = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = filter ? { status: filter } : {}
      const { data } = await api.get('/api/orders', { params })
      setOrders(data.data || [])
    } catch { toast.error("Oops! Não consegui buscar pedidos. Tente novamente 😕") }
    finally { setLoading(false) }
  }, [filter])

  useEffect(() => { load() }, [load])

  const openDetail = async (id) => {
    try {
      const { data } = await api.get(`/api/orders/${id}`)
      setDetail(data.data)
    } catch { toast.error("Oops! Não consegui buscar pedido. Tente novamente 😕") }
  }

  const refreshDetail = async () => {
    if (!detail) return
    const { data } = await api.get(`/api/orders/${detail.id}`)
    setDetail(data.data)
  }

  const handleOpenNew = async () => {
    const [c, t] = await Promise.all([
      api.get('/api/clients'),
      isRest ? api.get('/api/tables') : Promise.resolve({ data: { data: [] } }),
    ])
    setClients(c.data.data || [])
    setTables((t.data.data || []).filter(t => t.status !== 'ocupada'))
    setNewForm({ table_id: '', client_id: '', obs: '' })
    setNewModal(true)
  }

  const handleCreate = async () => {
    setSaving(true)
    try {
      const body = { obs: newForm.obs || null }
      if (newForm.table_id) body.table_id = newForm.table_id
      if (newForm.client_id) body.client_id = newForm.client_id
      await api.post('/api/orders', body)
      toast.success('Pedido criado!')
      setNewModal(false)
      load()
    } catch (err) { toast.error(err.response?.data?.error || 'Erro') }
    finally { setSaving(false) }
  }

  const handleStatus = async (id, status, forma) => {
    try {
      await api.patch(`/api/orders/${id}/status`, { status, forma_pagamento: forma || null })
      toast.success(STATUS_LABEL[status] || status)
      load()
      if (detail?.id === id) setDetail(null)
      setFormaModal(null)
    } catch { toast.error('Erro ao atualizar') }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Remover pedido?')) return
    try { await api.delete(`/api/orders/${id}`); toast.success('Item apagado com sucesso! 🗑️'); load() }
    catch { toast.error('Erro ao remover') }
  }

  const openPayModal = (orderId) => {
    setSelectedForma('Dinheiro')
    setFormaModal(orderId)
  }

  // ── Add items to order ──
  const openAddItems = async () => {
    try {
      const { data } = await api.get('/api/products', { params: { ativo: true } })
      setProducts(data.data || [])
    } catch { toast.error('A prateleira emperrou, não consegui carregar os produtos 📦') }
    setAddItems([])
    setProductSearch('')
    setAddModal(true)
  }

  const toggleAddItem = (product) => {
    setAddItems(prev => {
      const ex = prev.find(i => i.product.id === product.id)
      if (ex) return prev.map(i => i.product.id === product.id ? { ...i, qtd: i.qtd + 1 } : i)
      return [...prev, { product, qtd: 1 }]
    })
  }

  const changeAddQtd = (id, delta) => {
    setAddItems(prev =>
      prev.map(i => i.product.id === id ? { ...i, qtd: Math.max(0, i.qtd + delta) } : i)
          .filter(i => i.qtd > 0)
    )
  }

  const handleAddItems = async () => {
    if (!addItems.length) return toast.error('Selecione ao menos um item')
    setSavingItems(true)
    try {
      for (const item of addItems) {
        await api.post(`/api/orders/${detail.id}/items`, {
          product_id: item.product.id,
          nome:       item.product.nome,
          qtd:        item.qtd,
          preco_unit: parseFloat(item.product.preco_venda),
        })
      }
      toast.success(`${addItems.length} item(ns) adicionado(s)!`)
      setAddModal(false)
      setAddItems([])
      await refreshDetail()
      load()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Erro ao adicionar')
    } finally { setSavingItems(false) }
  }

  const filteredProducts = products.filter(p =>
    !productSearch || p.nome.toLowerCase().includes(productSearch.toLowerCase())
  )
  const addTotal = addItems.reduce((s, i) => s + i.qtd * parseFloat(i.product.preco_venda), 0)

  const isOpenOrder = (o) => ['aberto', 'em_preparo', 'pronto'].includes(o?.status)

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">{isRest ? 'Pedidos / Comandas' : 'Vendas'}</div>
          <div className="page-subtitle">{orders.length} {filter ? `com status "${STATUS_LABEL[filter] || filter}"` : 'no total'}</div>
        </div>
        {!isRest && (
          <button className="btn btn-primary" onClick={handleOpenNew}>
            <Plus size={14} /> Novo Pedido
          </button>
        )}
      </div>

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 20, flexWrap: 'wrap' }}>
        {[['', 'Todos'], ['aberto', 'Abertos'], ['em_preparo', 'Em Preparo'], ['pronto', 'Prontos'], ['fechado', 'Fechados'], ['cancelado', 'Cancelados']].map(([v, l]) => (
          <button key={v} className={`btn btn-sm ${filter === v ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => setFilter(v)}>{l}</button>
        ))}
      </div>

      {loading ? (
        <div className="loading-page"><div className="spinner" /> Carregando...</div>
      ) : orders.length === 0 ? (
        <div className="empty-state">
          <UtensilsCrossed size={48} />
          <h3>Nenhum pedido encontrado</h3>
          <p>Crie um pedido ou use o PDV para registrar uma venda</p>
        </div>
      ) : (
        <div className="section-card">
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  {isRest && <th>Mesa</th>}
                  <th>Cliente</th>
                  <th>Total</th>
                  <th>Status</th>
                  <th>Data</th>
                  <th style={{ width: 90 }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {orders.map(o => (
                  <tr key={o.id}>
                    <td style={{ fontFamily: 'DM Mono', fontSize: 11 }}>{o.id.slice(0, 8)}</td>
                    {isRest && <td>{o.tables ? `Mesa ${o.tables.numero}` : <span style={{ color: 'var(--muted)' }}>Balcão</span>}</td>}
                    <td>{o.clients?.nome || <span style={{ color: 'var(--muted)' }}>—</span>}</td>
                    <td><strong>{formatMoney(o.total)}</strong></td>
                    <td><span className={`badge badge-${STATUS_BADGE[o.status] || 'gray'}`}>{STATUS_LABEL[o.status] || o.status}</span></td>
                    <td style={{ fontSize: 11, color: 'var(--muted)' }}>
                      {new Date(o.created_at).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button className="btn btn-ghost btn-icon btn-sm" onClick={() => openDetail(o.id)} title="Ver detalhes">
                          <Eye size={13} />
                        </button>
                        {isAdmin && ['cancelado', 'fechado'].includes(o.status) && (
                          <button className="btn btn-ghost btn-icon btn-sm" onClick={() => handleDelete(o.id)}
                            title="Remover" style={{ color: 'var(--red)' }}>
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ══ New order modal ══ */}
      {newModal && (
        <div className="modal-overlay" onClick={() => setNewModal(false)}>
          <div className="modal" style={{ maxWidth: 400 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">Novo Pedido</span>
              <button className="modal-close" onClick={() => setNewModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              {isRest && (
                <div>
                  <label className="label">Mesa</label>
                  <select className="input" value={newForm.table_id} onChange={e => setNewForm(f => ({ ...f, table_id: e.target.value }))}>
                    <option value="">Sem mesa (balcão)</option>
                    {tables.map(t => <option key={t.id} value={t.id}>Mesa {t.numero} — {t.status}</option>)}
                  </select>
                </div>
              )}
              <div>
                <label className="label">Cliente (opcional)</label>
                <select className="input" value={newForm.client_id} onChange={e => setNewForm(f => ({ ...f, client_id: e.target.value }))}>
                  <option value="">Sem cliente</option>
                  {clients.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Observação</label>
                <input className="input" value={newForm.obs} onChange={e => setNewForm(f => ({ ...f, obs: e.target.value }))}
                  placeholder="Observações..." />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setNewModal(false)}>Cancelar</button>
              <button className="btn btn-primary" onClick={handleCreate} disabled={saving}>
                {saving ? <><div className="spinner" style={{ width: 14, height: 14 }} /> Criando...</> : 'Criar Pedido'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══ Detail modal ══ */}
      {detail && !addModal && (
        <div className="modal-overlay" onClick={() => setDetail(null)}>
          <div className="modal" style={{ maxWidth: 540 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <span className="modal-title">Pedido #{detail.id?.slice(0, 8)}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                  <span className={`badge badge-${STATUS_BADGE[detail.status] || 'gray'}`}>{STATUS_LABEL[detail.status]}</span>
                  {isRest && detail.tables && (
                    <span style={{ fontSize: 11, color: 'var(--muted)' }}>Mesa {detail.tables.numero}</span>
                  )}
                  {detail.clients && (
                    <span style={{ fontSize: 11, color: 'var(--muted)' }}>{detail.clients.nome}</span>
                  )}
                </div>
              </div>
              <button className="modal-close" onClick={() => setDetail(null)}>✕</button>
            </div>

            <div className="modal-body">
              <div className="section-card">
                <div className="table-wrap">
                  <table>
                    <thead><tr><th>Item</th><th>Qtd</th><th>Unit.</th><th>Subtotal</th></tr></thead>
                    <tbody>
                      {(detail.items || []).map(i => (
                        <tr key={i.id}>
                          <td>
                            <strong>{i.nome}</strong>
                            {i.obs && <div style={{ fontSize: 10, color: 'var(--muted)' }}>{i.obs}</div>}
                          </td>
                          <td>{i.qtd}</td>
                          <td>{formatMoney(i.preco_unit)}</td>
                          <td><strong>{formatMoney(i.subtotal)}</strong></td>
                        </tr>
                      ))}
                      {!detail.items?.length && (
                        <tr><td colSpan={4} style={{ textAlign: 'center', color: 'var(--muted)', padding: 16 }}>Sem itens</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'baseline', gap: 8 }}>
                <span style={{ fontSize: 12, color: 'var(--muted)' }}>Total:</span>
                <span style={{ fontSize: 24, fontWeight: 800, fontFamily: 'Bebas Neue', color: 'var(--text)', letterSpacing: 1 }}>
                  {formatMoney(detail.total)}
                </span>
              </div>

              {/* ── Ações por status ── */}
              {isOpenOrder(detail) && (
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {/* Adicionar itens - abertos ou em preparo */}
                  {['aberto', 'em_preparo'].includes(detail.status) && (
                    <button className="btn btn-outline" style={{ flex: 1 }} onClick={openAddItems}>
                      <Plus size={13} /> Adicionar Itens
                    </button>
                  )}

                  {/* Enviar p/ cozinha (restaurante, aberto) */}
                  {isRest && detail.status === 'aberto' && (
                    <button className="btn btn-outline" onClick={() => handleStatus(detail.id, 'em_preparo')}>
                      🍳 Cozinha
                    </button>
                  )}

                  {/* Marcar pronto (restaurante, em preparo) */}
                  {isRest && detail.status === 'em_preparo' && (
                    <button className="btn btn-outline" onClick={() => handleStatus(detail.id, 'pronto')}>
                      ✓ Pronto
                    </button>
                  )}

                  {/* Cobrar */}
                  <button
                    className="btn btn-primary"
                    style={{ flex: 2 }}
                    disabled={!detail.items?.length}
                    onClick={() => openPayModal(detail.id)}
                  >
                    💰 Cobrar
                  </button>

                  {/* Cancelar */}
                  {(isAdmin || detail.status === 'aberto') && (
                    <button className="btn btn-danger" onClick={() => handleStatus(detail.id, 'cancelado')}>
                      Cancelar
                    </button>
                  )}
                </div>
              )}

              {detail.status === 'fechado' && detail.forma_pagamento && (
                <div style={{ textAlign: 'center', fontSize: 12, color: 'var(--muted)' }}>
                  Pago via <strong style={{ color: 'var(--green)' }}>{detail.forma_pagamento}</strong>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ══ Add items modal ══ */}
      {addModal && detail && (
        <div className="modal-overlay" onClick={() => setAddModal(false)}>
          <div className="modal" style={{ maxWidth: 540 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <span className="modal-title">Adicionar Itens</span>
                <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>
                  Pedido #{detail.id?.slice(0, 8)} · {addItems.reduce((s, i) => s + i.qtd, 0)} selecionado(s)
                </div>
              </div>
              <button className="modal-close" onClick={() => setAddModal(false)}>✕</button>
            </div>
            <div className="modal-body" style={{ gap: 10 }}>
              <div style={{ position: 'relative' }}>
                <Search size={13} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)' }} />
                <input className="input" style={{ paddingLeft: 34 }}
                  placeholder="Buscar produto..." value={productSearch}
                  onChange={e => setProductSearch(e.target.value)} autoFocus />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: 8, maxHeight: 260, overflowY: 'auto' }}>
                {filteredProducts.map(p => {
                  const sel = addItems.find(i => i.product.id === p.id)
                  return (
                    <button key={p.id} onClick={() => toggleAddItem(p)}
                      style={{
                        background: sel ? 'rgba(232,25,44,0.12)' : 'var(--bg3)',
                        border: `1px solid ${sel ? 'var(--red-border)' : 'var(--border)'}`,
                        borderRadius: 10, padding: 10, cursor: 'pointer', textAlign: 'left',
                        fontFamily: 'inherit', transition: 'all 0.15s', position: 'relative',
                      }}>
                      {p.categoria && <div style={{ fontSize: 9, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>{p.categoria}</div>}
                      <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text)', lineHeight: 1.3, marginBottom: 4 }}>{p.nome}</div>
                      <div style={{ fontSize: 13, fontWeight: 800, color: sel ? 'var(--red)' : 'var(--dim)' }}>{formatMoney(p.preco_venda)}</div>
                      {sel && <div style={{ position: 'absolute', top: 6, right: 6, background: 'var(--red)', color: '#fff', borderRadius: 10, fontSize: 10, fontWeight: 700, padding: '1px 6px' }}>{sel.qtd}</div>}
                    </button>
                  )
                })}
                {filteredProducts.length === 0 && (
                  <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: 24, color: 'var(--muted)', fontSize: 12 }}>Nenhum produto</div>
                )}
              </div>

              {addItems.length > 0 && (
                <div style={{ background: 'var(--bg4)', borderRadius: 10, padding: '10px 14px', border: '1px solid var(--border)' }}>
                  {addItems.map(i => (
                    <div key={i.product.id} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                      <span style={{ flex: 1, fontSize: 12, color: 'var(--dim)' }}>{i.product.nome}</span>
                      <button onClick={() => changeAddQtd(i.product.id, -1)} style={{ width: 22, height: 22, borderRadius: 6, background: 'var(--bg3)', border: '1px solid var(--border)', cursor: 'pointer', fontSize: 14, color: 'var(--text)' }}>−</button>
                      <span style={{ fontSize: 13, fontWeight: 700, minWidth: 20, textAlign: 'center' }}>{i.qtd}</span>
                      <button onClick={() => changeAddQtd(i.product.id, 1)} style={{ width: 22, height: 22, borderRadius: 6, background: 'var(--bg3)', border: '1px solid var(--border)', cursor: 'pointer', fontSize: 14, color: 'var(--text)' }}>+</button>
                      <span style={{ fontSize: 12, color: 'var(--red)', fontWeight: 700, minWidth: 56, textAlign: 'right' }}>{formatMoney(i.qtd * parseFloat(i.product.preco_venda))}</span>
                    </div>
                  ))}
                  <div style={{ borderTop: '1px solid var(--border)', paddingTop: 8, marginTop: 4, display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 12, color: 'var(--muted)' }}>Subtotal</span>
                    <span style={{ fontSize: 16, fontWeight: 800, fontFamily: 'Bebas Neue', color: 'var(--text)' }}>{formatMoney(addTotal)}</span>
                  </div>
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setAddModal(false)}>Cancelar</button>
              <button className="btn btn-primary" onClick={handleAddItems} disabled={savingItems || !addItems.length}>
                {savingItems ? <><div className="spinner" style={{ width: 14, height: 14 }} /> Adicionando...</> : `Adicionar ${addItems.reduce((s, i) => s + i.qtd, 0)} item(ns)`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══ Payment modal ══ */}
      {formaModal && selectedForma !== 'PIX' && (
        <div className="modal-overlay" onClick={() => setFormaModal(null)}>
          <div className="modal" style={{ maxWidth: 380 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">Forma de Pagamento</span>
              <button className="modal-close" onClick={() => setFormaModal(null)}>✕</button>
            </div>
            <div className="modal-body">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {FORMAS.map(f => (
                  <button key={f} onClick={() => setSelectedForma(f)}
                    style={{
                      padding: '10px 12px', borderRadius: 10, fontSize: 12, fontWeight: 600,
                      border: '1px solid', cursor: 'pointer', fontFamily: 'inherit',
                      background: selectedForma === f ? 'var(--red)' : 'var(--bg3)',
                      borderColor: selectedForma === f ? 'var(--red)' : 'var(--border)',
                      color: selectedForma === f ? '#fff' : 'var(--dim)',
                      transition: 'all 0.15s',
                    }}>
                    {f === 'PIX' ? '⚡ PIX' : f}
                  </button>
                ))}
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setFormaModal(null)}>Cancelar</button>
              <button className="btn btn-primary" onClick={() => handleStatus(formaModal, 'fechado', selectedForma)}>
                Confirmar Pagamento
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PIX payment */}
      {formaModal && selectedForma === 'PIX' && (() => {
        const ord = orders.find(o => o.id === formaModal)
        return (
          <PixModal
            amount={ord?.total || detail?.total || 0}
            txid={formaModal?.slice(0, 8)}
            description={'Pedido RED'}
            onClose={() => { setFormaModal(null); setSelectedForma('Dinheiro') }}
            onConfirm={() => handleStatus(formaModal, 'fechado', 'PIX')}
            confirming={false}
          />
        )
      })()}
    </div>
  )
}
