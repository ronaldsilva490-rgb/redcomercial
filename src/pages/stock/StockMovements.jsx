/**
 * StockMovements.jsx — Entrada de Mercadorias + Histórico de Estoque. v9
 * Acessível via /stock
 * - Registrar entrada de mercadoria (compra de fardo, caixa, kg, etc.)
 * - Registrar saída manual / perda
 * - Ajuste direto de estoque
 * - Histórico de movimentações por produto
 * - Alertas de estoque crítico
 */
import { useEffect, useState, useCallback } from 'react'
import {
  Plus, ArrowDownCircle, ArrowUpCircle, AlertTriangle,
  RefreshCw, Search, Package, Settings, History, X
} from 'lucide-react'
import api from '../../services/api'
import { formatMoney, formatDate } from '../../utils/format'
import useAuthStore from '../../store/authStore'
import toast from 'react-hot-toast'

const MOTIVOS_ENTRADA = ['Compra', 'Devolução de cliente', 'Transferência', 'Ajuste', 'Outro']
const MOTIVOS_SAIDA   = ['Venda', 'Perda/Avaria', 'Consumo interno', 'Transferência', 'Outro']

const TIPO_BADGE = {
  entrada: { color: '#22C55E', label: '⬆ Entrada', bg: 'rgba(34,197,94,0.1)' },
  saida:   { color: '#EF4444', label: '⬇ Saída',   bg: 'rgba(239,68,68,0.1)' },
  ajuste:  { color: '#F59E0B', label: '⚙ Ajuste',  bg: 'rgba(245,158,11,0.1)' },
}

function Badge({ tipo }) {
  const cfg = TIPO_BADGE[tipo] || { color: 'var(--muted)', label: tipo, bg: 'var(--bg4)' }
  return (
    <span style={{
      fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20,
      background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.color}40`
    }}>
      {cfg.label}
    </span>
  )
}

export default function StockMovements() {
  const { papel } = useAuthStore()
  const isAdmin = papel === 'dono' || papel === 'gerente'

  const [tab,          setTab]        = useState('entradas')   // entradas | historico | alertas
  const [products,     setProducts]   = useState([])
  const [movements,    setMovements]  = useState([])
  const [alerts,       setAlerts]     = useState([])
  const [loading,      setLoading]    = useState(true)
  const [modal,        setModal]      = useState(null)  // 'mov' | 'adjust'
  const [search,       setSearch]     = useState('')
  const [filterProd,   setFilterProd] = useState('')
  const [saving,       setSaving]     = useState(false)

  const [form, setForm] = useState({
    product_id: '', tipo: 'entrada', quantidade: '',
    motivo: 'Compra', custo_unit: '', fornecedor: '',
    nota_fiscal: '', obs: '',
  })
  const [adjForm, setAdjForm] = useState({ product_id: '', estoque_atual: '', obs: '' })

  const set    = (k, v) => setForm(p => ({ ...p, [k]: v }))
  const setAdj = (k, v) => setAdjForm(p => ({ ...p, [k]: v }))

  const loadAll = useCallback(async () => {
    setLoading(true)
    try {
      const [pRes, mRes, aRes] = await Promise.all([
        api.get('/api/products'),
        api.get('/api/stock/movements', { params: filterProd ? { product_id: filterProd } : {} }),
        api.get('/api/stock/alerts'),
      ])
      setProducts(pRes.data.data || [])
      setMovements(mRes.data.data || [])
      setAlerts(aRes.data.data || [])
    } catch { toast.error("Oops! Não consegui buscar estoque. Tente novamente 😕") }
    finally { setLoading(false) }
  }, [filterProd])

  useEffect(() => { loadAll() }, [loadAll])

  const openMov = (tipo = 'entrada') => {
    setForm({ product_id: '', tipo, quantidade: '', motivo: tipo === 'entrada' ? 'Compra' : 'Venda', custo_unit: '', fornecedor: '', nota_fiscal: '', obs: '' })
    setModal('mov')
  }

  const handleSave = async () => {
    if (!form.product_id) return toast.error('Selecione um produto')
    if (!form.quantidade || parseFloat(form.quantidade) <= 0) return toast.error('Informe a quantidade')
    setSaving(true)
    try {
      await api.post('/api/stock/movements', {
        ...form,
        quantidade: parseFloat(form.quantidade),
        custo_unit: form.custo_unit ? parseFloat(form.custo_unit) : undefined,
      })
      toast.success('Movimentação registrada!')
      setModal(null)
      loadAll()
    } catch (e) {
      toast.error(e.response?.data?.error || 'Erro ao salvar')
    } finally { setSaving(false) }
  }

  const handleAdjust = async () => {
    if (!adjForm.product_id) return toast.error('Selecione um produto')
    if (adjForm.estoque_atual === '') return toast.error('Informe o novo estoque')
    setSaving(true)
    try {
      await api.post(`/api/stock/adjust/${adjForm.product_id}`, {
        estoque_atual: parseFloat(adjForm.estoque_atual),
        obs: adjForm.obs || 'Ajuste manual',
      })
      toast.success('Estoque ajustado!')
      setModal(null)
      loadAll()
    } catch (e) {
      toast.error(e.response?.data?.error || 'Erro ao ajustar')
    } finally { setSaving(false) }
  }

  // produto selecionado no form
  const prodSel = products.find(p => p.id === form.product_id)

  // filtro de busca no histórico
  const filteredMov = movements.filter(m => {
    if (!search) return true
    const q = search.toLowerCase()
    const nome = m.products?.nome?.toLowerCase() || ''
    return nome.includes(q) || (m.motivo || '').toLowerCase().includes(q) || (m.fornecedor || '').toLowerCase().includes(q)
  })

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Estoque</div>
          <div className="page-subtitle">Entrada de mercadorias e controle de estoque</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {isAdmin && (
            <button className="btn btn-outline btn-sm" onClick={() => setModal('adjust')}>
              <Settings size={13} /> Ajustar Estoque
            </button>
          )}
          <button className="btn btn-outline btn-sm" onClick={() => openMov('saida')}>
            <ArrowUpCircle size={13} /> Registrar Saída
          </button>
          <button className="btn btn-primary" onClick={() => openMov('entrada')}>
            <ArrowDownCircle size={14} /> Entrada de Mercadoria
          </button>
        </div>
      </div>

      {/* Alertas críticos */}
      {alerts.length > 0 && (
        <div style={{
          background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.3)',
          borderRadius: 12, padding: '12px 16px', marginBottom: 16,
          display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap',
        }}>
          <AlertTriangle size={16} color="#F59E0B" style={{ flexShrink: 0 }} />
          <span style={{ fontSize: 13, color: '#F59E0B', fontWeight: 600 }}>
            {alerts.length} produto(s) com estoque crítico:
          </span>
          <span style={{ fontSize: 12, color: 'var(--dim)' }}>
            {alerts.slice(0, 4).map(a => a.nome).join(', ')}{alerts.length > 4 ? '...' : ''}
          </span>
          <button className="btn btn-sm btn-outline" style={{ marginLeft: 'auto', borderColor: '#F59E0B', color: '#F59E0B' }}
            onClick={() => setTab('alertas')}>Ver todos</button>
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 16, borderBottom: '1px solid var(--border)', paddingBottom: 0 }}>
        {[['entradas', '📦 Estoque Atual'], ['historico', '📋 Histórico'], ['alertas', `⚠ Alertas (${alerts.length})`]].map(([v, l]) => (
          <button key={v} onClick={() => setTab(v)} style={{
            padding: '8px 16px', fontSize: 12, fontWeight: 600, border: 'none',
            background: 'transparent', cursor: 'pointer', fontFamily: 'inherit',
            borderBottom: tab === v ? '2px solid var(--red)' : '2px solid transparent',
            color: tab === v ? 'var(--red)' : 'var(--muted)',
            marginBottom: -1, transition: 'color 0.2s',
          }}>{l}</button>
        ))}
      </div>

      {loading ? (
        <div className="loading-page"><div className="spinner" /> Carregando...</div>
      ) : (
        <>
          {/* ── Tab: Estoque Atual ── */}
          {tab === 'entradas' && (
            <div className="section-card">
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Produto</th>
                      <th>Categoria</th>
                      <th>Estoque Atual</th>
                      <th>Estoque Mínimo</th>
                      <th>Custo Unit.</th>
                      <th>Situação</th>
                    </tr>
                  </thead>
                  <tbody>
                    {products.filter(p => p.ativo !== false).map(p => {
                      const critico = p.estoque_minimo > 0 && p.estoque_atual <= p.estoque_minimo
                      const zerado  = p.estoque_atual <= 0
                      return (
                        <tr key={p.id}>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              {p.foto_url
                                ? <img src={p.foto_url} alt="" style={{ width: 32, height: 32, borderRadius: 6, objectFit: 'cover', flexShrink: 0 }} />
                                : <div style={{ width: 32, height: 32, borderRadius: 6, background: 'var(--bg4)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Package size={14} color="var(--muted)" /></div>
                              }
                              <div>
                                <strong>{p.nome}</strong>
                                {p.codigo_barras && <div style={{ fontSize: 10, color: 'var(--muted)' }}>{p.codigo_barras}</div>}
                              </div>
                            </div>
                          </td>
                          <td style={{ fontSize: 12, color: 'var(--muted)' }}>{p.categoria || '—'}</td>
                          <td>
                            <strong style={{ color: zerado ? 'var(--red)' : critico ? '#F59E0B' : 'var(--green)' }}>
                              {p.estoque_atual} {p.unidade}
                            </strong>
                          </td>
                          <td style={{ fontSize: 12 }}>{p.estoque_minimo > 0 ? `${p.estoque_minimo} ${p.unidade}` : '—'}</td>
                          <td style={{ fontSize: 12 }}>{p.preco_custo ? formatMoney(p.preco_custo) : '—'}</td>
                          <td>
                            {zerado
                              ? <span className="badge badge-red">Zerado</span>
                              : critico
                                ? <span className="badge badge-yellow">⚠ Crítico</span>
                                : <span className="badge badge-green">OK</span>
                            }
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── Tab: Histórico ── */}
          {tab === 'historico' && (
            <>
              <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                <div style={{ position: 'relative', flex: 1 }}>
                  <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)', pointerEvents: 'none' }} />
                  <input className="input" style={{ paddingLeft: 34 }} placeholder="Buscar produto, motivo, fornecedor..."
                    value={search} onChange={e => setSearch(e.target.value)} />
                </div>
                <select className="input" style={{ width: 200 }} value={filterProd} onChange={e => setFilterProd(e.target.value)}>
                  <option value="">Todos os produtos</option>
                  {products.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
                </select>
              </div>
              <div className="section-card">
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Data</th>
                        <th>Produto</th>
                        <th>Tipo</th>
                        <th>Qtd</th>
                        <th>Antes → Depois</th>
                        <th>Motivo</th>
                        <th>Custo Unit.</th>
                        <th>Fornecedor</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredMov.length === 0 ? (
                        <tr><td colSpan={8} style={{ textAlign: 'center', color: 'var(--muted)', padding: 24 }}>Nenhuma movimentação encontrada</td></tr>
                      ) : filteredMov.map(m => (
                        <tr key={m.id}>
                          <td style={{ fontSize: 11, color: 'var(--muted)' }}>{formatDate(m.data)}</td>
                          <td><strong>{m.products?.nome || '—'}</strong><div style={{ fontSize: 10, color: 'var(--muted)' }}>{m.products?.unidade}</div></td>
                          <td><Badge tipo={m.tipo} /></td>
                          <td><strong>{m.tipo === 'ajuste' ? '→' : m.tipo === 'entrada' ? '+' : '-'}{m.quantidade}</strong></td>
                          <td style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'DM Mono' }}>
                            {m.estoque_antes} → <strong style={{ color: 'var(--text)' }}>{m.estoque_depois}</strong>
                          </td>
                          <td style={{ fontSize: 12 }}>{m.motivo || '—'}</td>
                          <td style={{ fontSize: 12 }}>{m.custo_unit ? formatMoney(m.custo_unit) : '—'}</td>
                          <td style={{ fontSize: 12, color: 'var(--muted)' }}>
                            {m.fornecedor || '—'}
                            {m.nota_fiscal && <div style={{ fontSize: 10 }}>NF: {m.nota_fiscal}</div>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}

          {/* ── Tab: Alertas ── */}
          {tab === 'alertas' && (
            alerts.length === 0 ? (
              <div className="empty-state">
                <Package size={48} />
                <h3>Estoque sob controle!</h3>
                <p>Nenhum produto abaixo do estoque mínimo.</p>
              </div>
            ) : (
              <div className="section-card">
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Produto</th>
                        <th>Categoria</th>
                        <th>Estoque Atual</th>
                        <th>Estoque Mínimo</th>
                        <th>Déficit</th>
                        <th>Ação</th>
                      </tr>
                    </thead>
                    <tbody>
                      {alerts.map(p => (
                        <tr key={p.id}>
                          <td><strong>{p.nome}</strong></td>
                          <td style={{ fontSize: 12, color: 'var(--muted)' }}>{p.categoria || '—'}</td>
                          <td><strong style={{ color: 'var(--red)' }}>{p.estoque_atual} {p.unidade}</strong></td>
                          <td style={{ fontSize: 12 }}>{p.estoque_minimo} {p.unidade}</td>
                          <td style={{ fontSize: 12, color: '#F59E0B', fontWeight: 700 }}>
                            {Math.max(0, p.estoque_minimo - p.estoque_atual)} {p.unidade}
                          </td>
                          <td>
                            <button className="btn btn-primary btn-sm"
                              onClick={() => { setForm(f => ({ ...f, product_id: p.id, tipo: 'entrada', motivo: 'Compra' })); setModal('mov') }}>
                              <ArrowDownCircle size={11} /> Dar entrada
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )
          )}
        </>
      )}

      {/* ══ Modal Movimentação ══ */}
      {modal === 'mov' && (
        <div className="modal-overlay" onClick={() => setModal(null)}>
          <div className="modal" style={{ maxWidth: 500 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">
                {form.tipo === 'entrada' ? '⬇ Entrada de Mercadoria' : '⬆ Saída / Perda'}
              </span>
              <button className="modal-close" onClick={() => setModal(null)}>✕</button>
            </div>
            <div className="modal-body">
              {/* Tipo */}
              <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                {['entrada', 'saida'].map(t => (
                  <button key={t} onClick={() => {
                    set('tipo', t)
                    set('motivo', t === 'entrada' ? 'Compra' : 'Venda')
                  }}
                    className={`btn btn-sm ${form.tipo === t ? 'btn-primary' : 'btn-outline'}`}>
                    {t === 'entrada' ? '⬇ Entrada' : '⬆ Saída'}
                  </button>
                ))}
              </div>

              <div className="form-grid">
                <div style={{ gridColumn: '1/-1' }}>
                  <label className="label">Produto *</label>
                  <select className="input" value={form.product_id} onChange={e => set('product_id', e.target.value)}>
                    <option value="">Selecione o produto...</option>
                    {products.filter(p => p.ativo !== false).map(p => (
                      <option key={p.id} value={p.id}>
                        {p.nome} — Estoque: {p.estoque_atual} {p.unidade}
                      </option>
                    ))}
                  </select>
                  {prodSel && (
                    <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>
                      Estoque atual: <strong style={{ color: 'var(--text)' }}>{prodSel.estoque_atual} {prodSel.unidade}</strong>
                    </div>
                  )}
                </div>

                <div>
                  <label className="label">Quantidade *</label>
                  <input className="input" type="number" step="0.001" min="0.001" placeholder="0"
                    value={form.quantidade} onChange={e => set('quantidade', e.target.value)} />
                  {prodSel && <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 2 }}>Unidade: {prodSel.unidade}</div>}
                </div>

                <div>
                  <label className="label">Motivo</label>
                  <select className="input" value={form.motivo} onChange={e => set('motivo', e.target.value)}>
                    {(form.tipo === 'entrada' ? MOTIVOS_ENTRADA : MOTIVOS_SAIDA).map(m => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </div>

                {form.tipo === 'entrada' && (
                  <>
                    <div>
                      <label className="label">Custo Unitário (R$)</label>
                      <input className="input" type="number" step="0.01" min="0" placeholder="0,00"
                        value={form.custo_unit} onChange={e => set('custo_unit', e.target.value)} />
                    </div>
                    <div>
                      <label className="label">Fornecedor</label>
                      <input className="input" placeholder="Nome do fornecedor"
                        value={form.fornecedor} onChange={e => set('fornecedor', e.target.value)} />
                    </div>
                    <div>
                      <label className="label">Nota Fiscal</label>
                      <input className="input" placeholder="Número da NF"
                        value={form.nota_fiscal} onChange={e => set('nota_fiscal', e.target.value)} />
                    </div>
                  </>
                )}

                <div style={{ gridColumn: '1/-1' }}>
                  <label className="label">Observação</label>
                  <input className="input" placeholder="Anotação adicional..."
                    value={form.obs} onChange={e => set('obs', e.target.value)} />
                </div>
              </div>

              {/* Preview do novo estoque */}
              {prodSel && form.quantidade && (
                <div style={{ background: 'var(--bg4)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 14px', marginTop: 8 }}>
                  <span style={{ fontSize: 11, color: 'var(--muted)' }}>
                    Novo estoque: <strong style={{ color: 'var(--text)', fontSize: 14 }}>
                      {form.tipo === 'entrada'
                        ? (parseFloat(prodSel.estoque_atual) + parseFloat(form.quantidade || 0)).toFixed(3).replace(/\.?0+$/, '')
                        : Math.max(0, parseFloat(prodSel.estoque_atual) - parseFloat(form.quantidade || 0)).toFixed(3).replace(/\.?0+$/, '')
                      } {prodSel.unidade}
                    </strong>
                  </span>
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setModal(null)}>Cancelar</button>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                {saving ? <><div className="spinner" style={{ width: 14, height: 14 }} /> Salvando...</> : '✓ Registrar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══ Modal Ajuste de Estoque ══ */}
      {modal === 'adjust' && (
        <div className="modal-overlay" onClick={() => setModal(null)}>
          <div className="modal" style={{ maxWidth: 400 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">⚙ Ajuste de Estoque</span>
              <button className="modal-close" onClick={() => setModal(null)}>✕</button>
            </div>
            <div className="modal-body">
              <p style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 16 }}>
                Define o valor real do estoque (ex: após inventário físico).
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div>
                  <label className="label">Produto *</label>
                  <select className="input" value={adjForm.product_id}
                    onChange={e => {
                      const p = products.find(x => x.id === e.target.value)
                      setAdj('product_id', e.target.value)
                      if (p) setAdj('estoque_atual', String(p.estoque_atual))
                    }}>
                    <option value="">Selecione...</option>
                    {products.filter(p => p.ativo !== false).map(p => (
                      <option key={p.id} value={p.id}>{p.nome} (atual: {p.estoque_atual} {p.unidade})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label">Novo Estoque *</label>
                  <input className="input" type="number" step="0.001" min="0"
                    value={adjForm.estoque_atual} onChange={e => setAdj('estoque_atual', e.target.value)} />
                </div>
                <div>
                  <label className="label">Motivo do ajuste</label>
                  <input className="input" placeholder="Inventário físico, correção..."
                    value={adjForm.obs} onChange={e => setAdj('obs', e.target.value)} />
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setModal(null)}>Cancelar</button>
              <button className="btn btn-primary" onClick={handleAdjust} disabled={saving}>
                {saving ? <><div className="spinner" style={{ width: 14, height: 14 }} /> Ajustando...</> : '✓ Ajustar Estoque'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
