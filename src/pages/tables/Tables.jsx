import { useEffect, useState, useCallback } from 'react'
import { Plus, Edit2, Trash2, Users, LayoutGrid, ClipboardList, ShoppingBag, Search } from 'lucide-react'
import api from '../../services/api'
import { formatMoney } from '../../utils/format'
import useAuthStore from '../../store/authStore'
import toast from 'react-hot-toast'
import PixModal from '../../components/ui/PixModal'

const STATUS_MAP = {
  livre:     { label: 'Livre',     bg: 'rgba(34,197,94,0.10)',  border: 'rgba(34,197,94,0.30)',  text: 'var(--green)' },
  ocupada:   { label: 'Ocupada',   bg: 'rgba(232,25,44,0.10)',  border: 'rgba(232,25,44,0.35)',  text: 'var(--red)' },
  reservada: { label: 'Reservada', bg: 'rgba(245,158,11,0.10)', border: 'rgba(245,158,11,0.30)', text: 'var(--yellow)' },
}

const FORMAS = ['Dinheiro', 'PIX', 'Cartão Débito', 'Cartão Crédito', 'Transferência', 'Fiado']

export default function Tables() {
  const { papel } = useAuthStore()
  const isAdmin = papel === 'dono' || papel === 'gerente'

  const [tables,  setTables]  = useState([])
  const [loading, setLoading] = useState(true)
  const [modal,   setModal]   = useState(null)       // 'new' | 'edit'
  const [form,    setForm]    = useState({ numero: '', capacidade: 4 })
  const [saving,  setSaving]  = useState(false)

  // ── Comanda state ──
  const [comandaTable,  setComandaTable]  = useState(null)    // mesa selecionada
  const [activeOrder,   setActiveOrder]   = useState(null)    // pedido ativo da mesa
  const [loadingOrder,  setLoadingOrder]  = useState(false)
  const [addItemModal,  setAddItemModal]  = useState(false)   // modal de adicionar itens
  const [products,      setProducts]      = useState([])
  const [productSearch, setProductSearch] = useState('')
  const [selectedItems, setSelectedItems] = useState([])      // [{ product, qtd }]
  const [savingItems,   setSavingItems]   = useState(false)
  const [payModal,      setPayModal]      = useState(false)
  const [forma,         setForma]         = useState('Dinheiro')
  const [paying,        setPaying]        = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await api.get('/api/tables')
      setTables(data.data || [])
    } catch { toast.error("Oops! Não consegui buscar mesas. Tente novamente 😕") }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  // ── CRUD de mesas ──
  const openNew  = () => { setForm({ numero: '', capacidade: 4 }); setModal('new') }
  const openEdit = (t) => { setForm({ ...t }); setModal('edit') }
  const close    = () => setModal(null)

  const handleSave = async () => {
    if (!form.numero) return toast.error('Número da mesa é obrigatório')
    setSaving(true)
    try {
      if (modal === 'new') {
        await api.post('/api/tables', { numero: parseInt(form.numero), capacidade: parseInt(form.capacidade) || 4 })
        toast.success('Mesa cadastrada!')
      } else {
        await api.put(`/api/tables/${form.id}`, { numero: parseInt(form.numero), capacidade: parseInt(form.capacidade) || 4 })
        toast.success('Mesa atualizada!')
      }
      close(); load()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Erro: número de mesa já existe')
    } finally { setSaving(false) }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Remover mesa?')) return
    try { await api.delete(`/api/tables/${id}`); toast.success('Mesa removida'); load() }
    catch { toast.error('Erro ao remover') }
  }

  const handleStatus = async (id, status) => {
    try {
      await api.patch(`/api/tables/${id}/status`, { status })
      setTables(prev => prev.map(t => t.id === id ? { ...t, status } : t))
    } catch { toast.error("Vixe... não consegui salvar a alteração em status 😕") }
  }

  // ── Abrir comanda de uma mesa ──
  const openComanda = async (table) => {
    setComandaTable(table)
    setLoadingOrder(true)
    try {
      // Busca pedidos em aberto desta mesa
      const { data } = await api.get('/api/orders', { params: { status: 'aberto' } })
      const orders = data.data || []
      const order = orders.find(o => o.table_id === table.id || o.tables?.id === table.id)
      if (order) {
        // Busca detalhes completos do pedido com itens
        const { data: detail } = await api.get(`/api/orders/${order.id}`)
        setActiveOrder(detail.data)
      } else {
        setActiveOrder(null)
      }
    } catch { toast.error("Oops! Não consegui buscar comanda. Tente novamente 😕") }
    finally { setLoadingOrder(false) }
  }

  const closeComanda = () => {
    setComandaTable(null)
    setActiveOrder(null)
    setAddItemModal(false)
    setSelectedItems([])
    setPayModal(false)
  }

  // ── Criar nova comanda para mesa ──
  const handleCriarComanda = async () => {
    setSaving(true)
    try {
      const { data } = await api.post('/api/orders', { table_id: comandaTable.id })
      const { data: detail } = await api.get(`/api/orders/${data.data.id}`)
      setActiveOrder(detail.data)
      await handleStatus(comandaTable.id, 'ocupada')
      toast.success('Comanda aberta!')
    } catch (err) {
      toast.error(err.response?.data?.error || 'Erro ao criar comanda')
    } finally { setSaving(false) }
  }

  // ── Adicionar itens à comanda ──
  const openAddItems = async () => {
    try {
      const { data } = await api.get('/api/products', { params: { ativo: true } })
      setProducts(data.data || [])
    } catch { toast.error('A prateleira emperrou, não consegui carregar os produtos 📦') }
    setSelectedItems([])
    setProductSearch('')
    setAddItemModal(true)
  }

  const toggleItem = (product) => {
    setSelectedItems(prev => {
      const ex = prev.find(i => i.product.id === product.id)
      if (ex) return prev.map(i => i.product.id === product.id ? { ...i, qtd: i.qtd + 1 } : i)
      return [...prev, { product, qtd: 1 }]
    })
  }

  const changeItemQtd = (id, delta) => {
    setSelectedItems(prev =>
      prev.map(i => i.product.id === id ? { ...i, qtd: Math.max(0, i.qtd + delta) } : i)
          .filter(i => i.qtd > 0)
    )
  }

  const handleAddItems = async () => {
    if (!selectedItems.length) return toast.error('Selecione ao menos um item')
    setSavingItems(true)
    try {
      for (const item of selectedItems) {
        await api.post(`/api/orders/${activeOrder.id}/items`, {
          product_id: item.product.id,
          nome:       item.product.nome,
          qtd:        item.qtd,
          preco_unit: parseFloat(item.product.preco_venda),
        })
      }
      toast.success(`${selectedItems.length} item(ns) adicionado(s)!`)
      // Recarrega comanda
      const { data: detail } = await api.get(`/api/orders/${activeOrder.id}`)
      setActiveOrder(detail.data)
      setAddItemModal(false)
      setSelectedItems([])
    } catch (err) {
      toast.error(err.response?.data?.error || 'Erro ao adicionar itens')
    } finally { setSavingItems(false) }
  }

  // ── Fechar/Cobrar comanda ──
  const handleFechar = async () => {
    setPaying(true)
    try {
      await api.patch(`/api/orders/${activeOrder.id}/status`, {
        status: 'fechado',
        forma_pagamento: forma,
      })
      toast.success('Conta fechada! Mais uma mesa bem servida 🧾')
      closeComanda()
      load()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Erro ao fechar comanda')
    } finally { setPaying(false) }
  }

  // ── Cancelar comanda ──
  const handleCancelar = async () => {
    if (!window.confirm('Cancelar comanda? Os itens serão perdidos.')) return
    try {
      await api.patch(`/api/orders/${activeOrder.id}/status`, { status: 'cancelado' })
      toast.success('Comanda cancelada')
      closeComanda()
      load()
    } catch { toast.error('Erro ao cancelar') }
  }

  const livres   = tables.filter(t => t.status === 'livre').length
  const ocupadas = tables.filter(t => t.status === 'ocupada').length
  const filteredProducts = products.filter(p =>
    !productSearch || p.nome.toLowerCase().includes(productSearch.toLowerCase()) || (p.categoria || '').toLowerCase().includes(productSearch.toLowerCase())
  )
  const selectedTotal = selectedItems.reduce((s, i) => s + i.qtd * parseFloat(i.product.preco_venda), 0)

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Mesas</div>
          <div className="page-subtitle">
            {livres} livres · {ocupadas} ocupadas · {tables.length} total
          </div>
        </div>
        {isAdmin && (
          <button className="btn btn-primary" onClick={openNew}>
            <Plus size={14} /> Nova Mesa
          </button>
        )}
      </div>

      {loading ? (
        <div className="loading-page"><div className="spinner" /> Carregando...</div>
      ) : tables.length === 0 ? (
        <div className="empty-state">
          <LayoutGrid size={48} />
          <h3>Nenhuma mesa cadastrada</h3>
          <p>Cadastre as mesas do seu estabelecimento para gerenciar o salão</p>
          {isAdmin && (
            <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={openNew}>
              <Plus size={14} /> Cadastrar Mesa
            </button>
          )}
        </div>
      ) : (
        <div className="mesas-grid">
          {tables.map(t => {
            const s = STATUS_MAP[t.status] || STATUS_MAP.livre
            return (
              <div
                key={t.id}
                className="mesa-card"
                style={{
                  background: s.bg,
                  border: `1px solid ${s.border}`,
                  borderRadius: 14, padding: '18px 14px',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
                  transition: 'transform 0.15s, box-shadow 0.15s',
                }}
              >
                <div
                  className="mesa-number"
                  style={{ fontFamily: 'Bebas Neue', fontSize: 42, lineHeight: 1, color: s.text }}
                >
                  {t.numero}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--muted)', fontSize: 11 }}>
                  <Users size={10} /> {t.capacidade} lugares
                </div>
                <span style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: 1, color: s.text, fontWeight: 700 }}>
                  {s.label}
                </span>

                {/* ── Ações principais ── */}
                <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', justifyContent: 'center', width: '100%', marginTop: 2 }}>
                  {t.status === 'ocupada' ? (
                    <button
                      className="btn btn-primary btn-sm"
                      style={{ fontSize: 10, padding: '5px 10px', width: '100%', justifyContent: 'center' }}
                      onClick={() => openComanda(t)}
                    >
                      <ClipboardList size={11} /> Ver Comanda
                    </button>
                  ) : (
                    <>
                      {t.status !== 'ocupada' && (
                        <button
                          className="btn btn-ghost btn-sm"
                          style={{ fontSize: 10, padding: '4px 8px', flex: 1 }}
                          onClick={() => {
                            setComandaTable(t)
                            setActiveOrder(null)
                          }}
                        >
                          <ShoppingBag size={10} /> Abrir
                        </button>
                      )}
                      {t.status === 'livre' && (
                        <button
                          className="btn btn-ghost btn-sm"
                          style={{ fontSize: 10, padding: '4px 8px', flex: 1 }}
                          onClick={() => handleStatus(t.id, 'reservada')}
                        >
                          Reservar
                        </button>
                      )}
                      {t.status === 'reservada' && (
                        <button
                          className="btn btn-ghost btn-sm"
                          style={{ fontSize: 10, padding: '4px 8px', flex: 1 }}
                          onClick={() => handleStatus(t.id, 'livre')}
                        >
                          Liberar
                        </button>
                      )}
                    </>
                  )}
                </div>

                {isAdmin && (
                  <div style={{ display: 'flex', gap: 5, width: '100%' }}>
                    <button className="btn btn-ghost btn-sm btn-icon" style={{ flex: 1 }} onClick={() => openEdit(t)}>
                      <Edit2 size={11} />
                    </button>
                    <button className="btn btn-ghost btn-sm btn-icon" style={{ flex: 1, color: 'var(--red)' }}
                      onClick={() => handleDelete(t.id)}>
                      <Trash2 size={11} />
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* ══ Modal CRUD mesa ══ */}
      {modal && (
        <div className="modal-overlay" onClick={close}>
          <div className="modal" style={{ maxWidth: 360 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">{modal === 'new' ? 'Nova Mesa' : 'Editar Mesa'}</span>
              <button className="modal-close" onClick={close}>✕</button>
            </div>
            <div className="modal-body">
              <div>
                <label className="label">Número da Mesa *</label>
                <input className="input" type="number" value={form.numero}
                  onChange={e => setForm(f => ({ ...f, numero: e.target.value }))}
                  placeholder="1, 2, 3..." autoFocus />
              </div>
              <div>
                <label className="label">Capacidade (lugares)</label>
                <input className="input" type="number" value={form.capacidade}
                  onChange={e => setForm(f => ({ ...f, capacidade: e.target.value }))} />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={close}>Cancelar</button>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                {saving ? <><div className="spinner" style={{ width: 14, height: 14 }} /> Salvando...</> : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══ Modal COMANDA ══ */}
      {comandaTable && !addItemModal && !payModal && (
        <div className="modal-overlay" onClick={closeComanda}>
          <div className="modal" style={{ maxWidth: 500 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <span className="modal-title">Mesa {comandaTable.numero}</span>
                <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>
                  {comandaTable.capacidade} lugares · {STATUS_MAP[comandaTable.status]?.label}
                </div>
              </div>
              <button className="modal-close" onClick={closeComanda}>✕</button>
            </div>

            <div className="modal-body">
              {loadingOrder ? (
                <div className="loading-page" style={{ padding: 32 }}><div className="spinner" /> Carregando...</div>
              ) : activeOrder ? (
                <>
                  {/* Itens da comanda */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 1, fontWeight: 700 }}>
                      Itens do Pedido
                    </span>
                    <span style={{ fontFamily: 'DM Mono', fontSize: 10, color: 'var(--muted)' }}>
                      #{activeOrder.id?.slice(0, 8)}
                    </span>
                  </div>

                  <div className="section-card">
                    <div className="table-wrap">
                      <table>
                        <thead>
                          <tr>
                            <th>Item</th>
                            <th style={{ textAlign: 'center' }}>Qtd</th>
                            <th style={{ textAlign: 'right' }}>Subtotal</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(activeOrder.items || []).map(i => (
                            <tr key={i.id}>
                              <td>
                                <strong>{i.nome}</strong>
                                {i.obs && <div style={{ fontSize: 10, color: 'var(--muted)' }}>{i.obs}</div>}
                              </td>
                              <td style={{ textAlign: 'center', color: 'var(--dim)' }}>{i.qtd}×</td>
                              <td style={{ textAlign: 'right' }}><strong>{formatMoney(i.subtotal)}</strong></td>
                            </tr>
                          ))}
                          {!activeOrder.items?.length && (
                            <tr>
                              <td colSpan={3} style={{ textAlign: 'center', color: 'var(--muted)', padding: 20, fontSize: 12 }}>
                                Comanda vazia — adicione itens
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Total */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                    <span style={{ fontSize: 12, color: 'var(--muted)' }}>Total da comanda</span>
                    <span style={{ fontSize: 28, fontWeight: 900, fontFamily: 'Bebas Neue', color: 'var(--text)', letterSpacing: 1 }}>
                      {formatMoney(activeOrder.total)}
                    </span>
                  </div>

                  {/* Ações */}
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <button className="btn btn-outline" style={{ flex: 1 }} onClick={openAddItems}>
                      <Plus size={13} /> Adicionar Itens
                    </button>
                    <button
                      className="btn btn-primary"
                      style={{ flex: 2 }}
                      disabled={!activeOrder.items?.length}
                      onClick={() => { setForma('Dinheiro'); setPayModal(true) }}
                    >
                      💰 Fechar Comanda
                    </button>
                  </div>
                  {isAdmin && (
                    <button className="btn btn-danger" style={{ width: '100%' }} onClick={handleCancelar}>
                      Cancelar Comanda
                    </button>
                  )}
                </>
              ) : (
                <>
                  <div className="empty-state" style={{ padding: '24px 0 8px' }}>
                    <ClipboardList size={36} />
                    <h3>Sem comanda ativa</h3>
                    <p>Esta mesa não tem pedido em aberto</p>
                  </div>
                  <button
                    className="btn btn-primary"
                    style={{ width: '100%', justifyContent: 'center' }}
                    disabled={saving}
                    onClick={handleCriarComanda}
                  >
                    {saving ? <><div className="spinner" style={{ width: 14, height: 14 }} /> Criando...</> : <><Plus size={14} /> Abrir Comanda</>}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ══ Modal ADICIONAR ITENS ══ */}
      {addItemModal && (
        <div className="modal-overlay" onClick={() => setAddItemModal(false)}>
          <div className="modal" style={{ maxWidth: 560 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <span className="modal-title">Adicionar Itens</span>
                <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>
                  Mesa {comandaTable?.numero} · {selectedItems.reduce((s, i) => s + i.qtd, 0)} item(ns) selecionado(s)
                </div>
              </div>
              <button className="modal-close" onClick={() => setAddItemModal(false)}>✕</button>
            </div>

            <div className="modal-body" style={{ gap: 10 }}>
              {/* Search */}
              <div style={{ position: 'relative' }}>
                <Search size={13} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)' }} />
                <input
                  className="input"
                  style={{ paddingLeft: 34 }}
                  placeholder="Buscar produto ou categoria..."
                  value={productSearch}
                  onChange={e => setProductSearch(e.target.value)}
                  autoFocus
                />
              </div>

              {/* Product grid */}
              <div style={{
                display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
                gap: 8, maxHeight: 280, overflowY: 'auto',
              }}>
                {filteredProducts.map(p => {
                  const sel = selectedItems.find(i => i.product.id === p.id)
                  return (
                    <button
                      key={p.id}
                      onClick={() => toggleItem(p)}
                      style={{
                        background: sel ? 'rgba(232,25,44,0.12)' : 'var(--bg3)',
                        border: `1px solid ${sel ? 'var(--red-border)' : 'var(--border)'}`,
                        borderRadius: 10, padding: 10,
                        cursor: 'pointer', textAlign: 'left',
                        fontFamily: 'inherit', transition: 'all 0.15s',
                        position: 'relative',
                      }}
                    >
                      {p.categoria && (
                        <div style={{ fontSize: 9, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>{p.categoria}</div>
                      )}
                      <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text)', lineHeight: 1.3, marginBottom: 4 }}>{p.nome}</div>
                      <div style={{ fontSize: 13, fontWeight: 800, color: sel ? 'var(--red)' : 'var(--dim)' }}>{formatMoney(p.preco_venda)}</div>
                      {sel && (
                        <div style={{
                          position: 'absolute', top: 6, right: 6,
                          background: 'var(--red)', color: '#fff',
                          borderRadius: 10, fontSize: 10, fontWeight: 700,
                          padding: '1px 6px',
                        }}>{sel.qtd}</div>
                      )}
                    </button>
                  )
                })}
                {filteredProducts.length === 0 && (
                  <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: 24, color: 'var(--muted)', fontSize: 12 }}>
                    Nenhum produto encontrado
                  </div>
                )}
              </div>

              {/* Selected items summary */}
              {selectedItems.length > 0 && (
                <div style={{ background: 'var(--bg4)', borderRadius: 10, padding: '10px 14px', border: '1px solid var(--border)' }}>
                  <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 8, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1 }}>
                    Itens selecionados
                  </div>
                  {selectedItems.map(i => (
                    <div key={i.product.id} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                      <span style={{ flex: 1, fontSize: 12, color: 'var(--dim)' }}>{i.product.nome}</span>
                      <button
                        onClick={() => changeItemQtd(i.product.id, -1)}
                        style={{ width: 22, height: 22, borderRadius: 6, background: 'var(--bg3)', border: '1px solid var(--border)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text)', fontSize: 14 }}
                      >−</button>
                      <span style={{ fontSize: 13, fontWeight: 700, minWidth: 20, textAlign: 'center' }}>{i.qtd}</span>
                      <button
                        onClick={() => changeItemQtd(i.product.id, 1)}
                        style={{ width: 22, height: 22, borderRadius: 6, background: 'var(--bg3)', border: '1px solid var(--border)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text)', fontSize: 14 }}
                      >+</button>
                      <span style={{ fontSize: 12, color: 'var(--red)', fontWeight: 700, minWidth: 56, textAlign: 'right' }}>
                        {formatMoney(i.qtd * parseFloat(i.product.preco_venda))}
                      </span>
                    </div>
                  ))}
                  <div style={{ borderTop: '1px solid var(--border)', paddingTop: 8, marginTop: 4, display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 12, color: 'var(--muted)' }}>Subtotal</span>
                    <span style={{ fontSize: 16, fontWeight: 800, fontFamily: 'Bebas Neue', color: 'var(--text)' }}>{formatMoney(selectedTotal)}</span>
                  </div>
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setAddItemModal(false)}>Cancelar</button>
              <button className="btn btn-primary" onClick={handleAddItems} disabled={savingItems || !selectedItems.length}>
                {savingItems
                  ? <><div className="spinner" style={{ width: 14, height: 14 }} /> Adicionando...</>
                  : `Adicionar ${selectedItems.reduce((s, i) => s + i.qtd, 0)} item(ns)`
                }
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══ Modal PAGAMENTO ══ */}
      {payModal && forma !== 'PIX' && (
        <div className="modal-overlay" onClick={() => setPayModal(false)}>
          <div className="modal" style={{ maxWidth: 380 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <span className="modal-title">Fechar Comanda</span>
                <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>
                  Mesa {comandaTable?.numero} · {formatMoney(activeOrder?.total)}
                </div>
              </div>
              <button className="modal-close" onClick={() => setPayModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div style={{ textAlign: 'center', background: 'var(--bg4)', borderRadius: 12, padding: '16px 20px', border: '1px solid var(--border)' }}>
                <div style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 1 }}>Total a cobrar</div>
                <div style={{ fontSize: 40, fontWeight: 900, fontFamily: 'Bebas Neue', color: 'var(--green)', letterSpacing: 1, marginTop: 4 }}>
                  {formatMoney(activeOrder?.total)}
                </div>
              </div>
              <div>
                <label className="label">Forma de Pagamento</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  {FORMAS.map(f => (
                    <button key={f} onClick={() => setForma(f)}
                      style={{
                        padding: '10px 12px', borderRadius: 10, fontSize: 12, fontWeight: 600,
                        border: '1px solid', cursor: 'pointer', fontFamily: 'inherit',
                        background: forma === f ? 'var(--red)' : 'var(--bg3)',
                        borderColor: forma === f ? 'var(--red)' : 'var(--border)',
                        color: forma === f ? '#fff' : 'var(--dim)',
                        transition: 'all 0.15s',
                      }}>
                      {f === 'PIX' ? '⚡ PIX' : f}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setPayModal(false)}>Voltar</button>
              <button className="btn btn-primary" onClick={handleFechar} disabled={paying}>
                {paying ? <><div className="spinner" style={{ width: 14, height: 14 }} /> Fechando...</> : '✅ Confirmar Pagamento'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══ PIX payment ══ */}
      {payModal && forma === 'PIX' && (
        <PixModal
          amount={activeOrder?.total || 0}
          txid={activeOrder?.id?.slice(0, 8)}
          description={`Mesa ${comandaTable?.numero}`}
          onClose={() => { setPayModal(false); setForma('Dinheiro') }}
          onConfirm={handleFechar}
          confirming={paying}
        />
      )}
    </div>
  )
}
