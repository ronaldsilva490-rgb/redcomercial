import { useEffect, useState, useCallback } from 'react'
import { Plus, Search, Edit2, Trash2, Package, AlertTriangle, ToggleLeft, ToggleRight } from 'lucide-react'
import api from '../../services/api'
import { formatMoney } from '../../utils/format'
import useAuthStore from '../../store/authStore'
import ImageUpload from '../../components/ui/ImageUpload'
import toast from 'react-hot-toast'

const EMPTY = {
  nome: '', descricao: '', categoria: '', codigo_barras: '',
  preco_venda: '', preco_custo: '', estoque_atual: 0,
  estoque_minimo: 0, unidade: 'un', ativo: true, destino: 'balcao', foto_url: '',
}

const DESTINO_CONFIG = {
  balcao:  { label: 'Balcão / Prateleira', desc: 'Produto retirado diretamente do balcão' },
  cozinha: { label: '🍳 Cozinha',          desc: 'Precisa de preparo na cozinha' },
  bar:     { label: '🍺 Bar / Bebidas',    desc: 'Retirado no bar ou freezer pelo garçom' },
  proprio: { label: '🧊 Garçom pega',      desc: 'Garçom vai buscar (geladeira, estoque)' },
}

function FieldRow({ children }) {
  return <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>{children}</div>
}

export default function Products() {
  const { tenant, papel } = useAuthStore()
  const isRest  = tenant?.tipo === 'restaurante'
  const isAdmin = papel === 'dono' || papel === 'gerente'

  const [items,   setItems]   = useState([])
  const [loading, setLoading] = useState(true)
  const [search,  setSearch]  = useState('')
  const [modal,   setModal]   = useState(null)
  const [form,    setForm]    = useState(EMPTY)
  const [saving,  setSaving]  = useState(false)

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await api.get('/api/products', { params: search ? { search } : {} })
      setItems(data.data || [])
    } catch { toast.error('Erro ao carregar produtos') }
    finally { setLoading(false) }
  }, [search])

  useEffect(() => { load() }, [load])

  const openNew  = () => { setForm(EMPTY); setModal('new') }
  const openEdit = (item) => { setForm({ ...item }); setModal('edit') }
  const close    = () => { setModal(null); setForm(EMPTY) }

  const handleSave = async () => {
    if (!form.nome?.trim()) return toast.error('Nome é obrigatório')
    if (!form.preco_venda && form.preco_venda !== 0) return toast.error('Preço de venda é obrigatório')
    setSaving(true)
    try {
      const payload = {
        ...form,
        preco_venda:    form.preco_venda  !== '' ? parseFloat(form.preco_venda)  : null,
        preco_custo:    form.preco_custo  !== '' ? parseFloat(form.preco_custo)  : null,
        estoque_atual:  form.estoque_atual  !== '' ? parseFloat(form.estoque_atual)  : 0,
        estoque_minimo: form.estoque_minimo !== '' ? parseFloat(form.estoque_minimo) : 0,
        descricao:      form.descricao?.trim()  || null,
        categoria:      form.categoria?.trim()  || null,
        codigo_barras:  form.codigo_barras?.trim() || null,
      }
      if (modal === 'new') {
        await api.post('/api/products', payload)
        toast.success(isRest ? 'Item adicionado ao cardápio!' : 'Produto cadastrado!')
      } else {
        await api.put(`/api/products/${form.id}`, payload)
        toast.success('Produto atualizado!')
      }
      close(); load()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Erro ao salvar')
    } finally { setSaving(false) }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Remover produto? Esta ação não pode ser desfeita.')) return
    try { await api.delete(`/api/products/${id}`); toast.success('Removido'); load() }
    catch { toast.error('Erro ao remover') }
  }

  const handleToggle = async (item) => {
    try {
      await api.put(`/api/products/${item.id}`, { ativo: !item.ativo })
      toast.success(item.ativo ? 'Desativado' : 'Ativado')
      load()
    } catch { toast.error('Erro ao atualizar') }
  }

  const alerta = items.filter(p => p.estoque_atual <= p.estoque_minimo && p.estoque_minimo > 0)

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">{isRest ? 'Cardápio' : 'Produtos'}</div>
          <div className="page-subtitle">{items.length} {isRest ? 'itens cadastrados' : 'produtos no estoque'}</div>
        </div>
        {isAdmin && (
          <button className="btn btn-primary" onClick={openNew}>
            <Plus size={14} /> {isRest ? 'Novo Item' : 'Novo Produto'}
          </button>
        )}
      </div>

      {!isRest && alerta.length > 0 && (
        <div style={{
          background: 'rgba(232,25,44,0.07)', border: '1px solid rgba(232,25,44,0.2)',
          borderRadius: 10, padding: '10px 16px', marginBottom: 16,
          display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <AlertTriangle size={14} color="var(--red)" />
          <span style={{ fontSize: 12, color: 'var(--red)' }}>
            <strong>{alerta.length}</strong> produto(s) com estoque crítico:{' '}
            {alerta.map(p => p.nome).join(', ')}
          </span>
        </div>
      )}

      {/* Search */}
      <div style={{ position: 'relative', marginBottom: 16 }}>
        <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)', pointerEvents: 'none' }} />
        <input
          className="input" style={{ paddingLeft: 38, maxWidth: 360 }}
          placeholder={isRest ? 'Buscar item do cardápio...' : 'Buscar por nome ou código de barras...'}
          value={search} onChange={e => setSearch(e.target.value)}
        />
      </div>

      {loading ? (
        <div className="loading-page"><div className="spinner" /> Carregando...</div>
      ) : items.length === 0 ? (
        <div className="empty-state">
          <Package size={48} />
          <h3>{search ? 'Nenhum resultado' : (isRest ? 'Cardápio vazio' : 'Nenhum produto')}</h3>
          <p>{isRest ? 'Adicione itens ao cardápio para usar no PDV' : 'Cadastre produtos para começar a vender'}</p>
          {isAdmin && !search && (
            <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={openNew}>
              <Plus size={14} /> {isRest ? 'Adicionar Item' : 'Cadastrar Produto'}
            </button>
          )}
        </div>
      ) : (
        <div className="section-card">
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  {isRest && <th style={{ width: 52 }}>Foto</th>}
                  <th>Produto</th>
                  <th>Categoria</th>
                  {!isRest && <th>Código</th>}
                  <th>Venda</th>
                  {!isRest && <th>Estoque</th>}
                  <th>Status</th>
                  {isAdmin && <th style={{ width: 90 }}>Ações</th>}
                </tr>
              </thead>
              <tbody>
                {items.map(item => {
                  const critico = !isRest && item.estoque_atual <= item.estoque_minimo && item.estoque_minimo > 0
                  return (
                    <tr key={item.id}>
                      {isRest && (
                        <td>
                          {item.foto_url ? (
                            <img src={item.foto_url} alt={item.nome}
                              style={{ width: 40, height: 40, borderRadius: 8, objectFit: 'cover', border: '1px solid var(--border)', background: 'var(--bg4)' }} />
                          ) : (
                            <div style={{ width: 40, height: 40, borderRadius: 8, background: 'var(--bg4)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>
                              🍽️
                            </div>
                          )}
                        </td>
                      )}
                      <td>
                        <strong>{item.nome}</strong>
                        {item.descricao && (
                          <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>
                            {item.descricao.length > 55 ? item.descricao.slice(0, 55) + '…' : item.descricao}
                          </div>
                        )}
                      </td>
                      <td style={{ fontSize: 12 }}>{item.categoria || <span style={{ color: 'var(--muted)' }}>—</span>}</td>
                      {!isRest && (
                        <td style={{ fontFamily: 'DM Mono', fontSize: 11 }}>
                          {item.codigo_barras || <span style={{ color: 'var(--muted)' }}>—</span>}
                        </td>
                      )}
                      <td>
                        <strong style={{ color: 'var(--text)', fontSize: 14 }}>{formatMoney(item.preco_venda)}</strong>
                        {item.preco_custo > 0 && (
                          <div style={{ fontSize: 10, color: 'var(--muted)' }}>custo: {formatMoney(item.preco_custo)}</div>
                        )}
                      </td>
                      {!isRest && (
                        <td>
                          <span style={{ color: critico ? 'var(--red)' : 'var(--text)', fontWeight: critico ? 700 : 400 }}>
                            {item.estoque_atual} <span style={{ color: 'var(--muted)', fontWeight: 400 }}>{item.unidade}</span>
                          </span>
                          {item.estoque_minimo > 0 && (
                            <div style={{ fontSize: 10, color: 'var(--muted)' }}>mín: {item.estoque_minimo}</div>
                          )}
                        </td>
                      )}
                      <td>
                        <span className={`badge badge-${item.ativo ? 'green' : 'gray'}`}>
                          {item.ativo ? 'ativo' : 'inativo'}
                        </span>
                      </td>
                      {isAdmin && (
                        <td>
                          <div style={{ display: 'flex', gap: 4 }}>
                            <button
                              className="btn btn-ghost btn-icon btn-sm"
                              onClick={() => handleToggle(item)}
                              title={item.ativo ? 'Desativar' : 'Ativar'}
                            >
                              {item.ativo
                                ? <ToggleRight size={15} style={{ color: 'var(--green)' }} />
                                : <ToggleLeft size={15} style={{ color: 'var(--muted)' }} />
                              }
                            </button>
                            <button className="btn btn-ghost btn-icon btn-sm" onClick={() => openEdit(item)} title="Editar">
                              <Edit2 size={13} />
                            </button>
                            <button className="btn btn-ghost btn-icon btn-sm" onClick={() => handleDelete(item.id)} title="Remover"
                              style={{ color: 'var(--red)' }}>
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Modal ── */}
      {modal && (
        <div className="modal-overlay" onClick={close}>
          <div className="modal" style={{ maxWidth: 540 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">
                {modal === 'new' ? (isRest ? 'Novo Item' : 'Novo Produto') : 'Editar Produto'}
              </span>
              <button className="modal-close" onClick={close}>✕</button>
            </div>

            <div className="modal-body">
              <div style={{ marginBottom: 16 }}>
                <ImageUpload
                  url={form.foto_url}
                  onChange={url => set('foto_url', url)}
                  tipo="products"
                  label="Foto do Produto"
                  size={80}
                />
              </div>
              <div className="form-grid">
                <FieldRow>
                  <label className="label">Nome *</label>
                  <input className="input" value={form.nome} onChange={e => set('nome', e.target.value)}
                    placeholder={isRest ? 'Ex: Hambúrguer Artesanal' : 'Nome do produto'} autoFocus />
                </FieldRow>
                <FieldRow>
                  <label className="label">Categoria</label>
                  <input className="input" value={form.categoria || ''} onChange={e => set('categoria', e.target.value)}
                    placeholder={isRest ? 'Lanches, Bebidas...' : 'Eletrônicos, Roupas...'} />
                </FieldRow>
                <FieldRow className="full" style={{ gridColumn: '1/-1' }}>
                  <label className="label">Descrição</label>
                  <input className="input" value={form.descricao || ''} onChange={e => set('descricao', e.target.value)}
                    placeholder="Descrição opcional" style={{ gridColumn: '1/-1' }} />
                </FieldRow>
                {!isRest && (
                  <FieldRow>
                    <label className="label">Código de Barras</label>
                    <input className="input" value={form.codigo_barras || ''} onChange={e => set('codigo_barras', e.target.value)}
                      placeholder="EAN-13, QR Code..." />
                  </FieldRow>
                )}
                <FieldRow>
                  <label className="label">Preço de Venda *</label>
                  <input className="input" type="number" step="0.01" min="0"
                    value={form.preco_venda} onChange={e => set('preco_venda', e.target.value)}
                    placeholder="0,00" />
                </FieldRow>
                <FieldRow>
                  <label className="label">Preço de Custo</label>
                  <input className="input" type="number" step="0.01" min="0"
                    value={form.preco_custo || ''} onChange={e => set('preco_custo', e.target.value)}
                    placeholder="0,00" />
                </FieldRow>
                {!isRest && (
                  <>
                    <FieldRow>
                      <label className="label">Estoque Atual</label>
                      <input className="input" type="number" step="0.01" min="0"
                        value={form.estoque_atual ?? 0} onChange={e => set('estoque_atual', e.target.value)} />
                    </FieldRow>
                    <FieldRow>
                      <label className="label">Estoque Mínimo</label>
                      <input className="input" type="number" step="0.01" min="0"
                        value={form.estoque_minimo ?? 0} onChange={e => set('estoque_minimo', e.target.value)} />
                    </FieldRow>
                  </>
                )}
                <FieldRow>
                  <label className="label">Unidade</label>
                  <select className="input" value={form.unidade || 'un'} onChange={e => set('unidade', e.target.value)}>
                    <option value="un">Unidade (un)</option>
                    <option value="kg">Quilograma (kg)</option>
                    <option value="g">Grama (g)</option>
                    <option value="l">Litro (l)</option>
                    <option value="ml">Mililitro (ml)</option>
                    <option value="cx">Caixa (cx)</option>
                    <option value="pç">Peça (pç)</option>
                    <option value="prato">Prato</option>
                  </select>
                </FieldRow>
                {isRest && (
                  <FieldRow style={{ gridColumn: '1/-1' }}>
                    <label className="label">Destino / Onde é preparado</label>
                    <select className="input" value={form.destino || 'balcao'} onChange={e => set('destino', e.target.value)}>
                      {Object.entries(DESTINO_CONFIG).map(([val, cfg]) => (
                        <option key={val} value={val}>{cfg.label}</option>
                      ))}
                    </select>
                    <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 2 }}>
                      {DESTINO_CONFIG[form.destino || 'balcao']?.desc}
                    </div>
                  </FieldRow>
                )}
                <div className="checkbox-row" style={{ alignSelf: 'flex-end', paddingBottom: 4 }}>
                  <input type="checkbox" id="prod-ativo" checked={!!form.ativo} onChange={e => set('ativo', e.target.checked)} />
                  <label htmlFor="prod-ativo">Ativo no sistema</label>
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn btn-outline" onClick={close}>Cancelar</button>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                {saving ? <><div className="spinner" style={{ width: 14, height: 14 }} /> Salvando...</> : 'Salvar Produto'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
