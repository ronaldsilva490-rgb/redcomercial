import { useState, useEffect, useCallback } from 'react'
import { Plus, Search, Edit2, Trash2, Car } from 'lucide-react'
import api from '../../services/api'
import { formatMoney, statusLabel, statusBadge } from '../../utils/format'
import { FotoGallery } from '../../components/ui/ImageUpload'
import toast from 'react-hot-toast'

const EMPTY = {
  tipo: 'carro', marca: '', modelo: '', ano: new Date().getFullYear(),
  ano_mod: new Date().getFullYear(), cor: '', placa: '', km: 0,
  combustivel: 'flex', cambio: 'manual', preco: '', preco_custo: '',
  status: 'disponivel', descricao: '', fotos: [],
}

export default function Vehicles() {
  const [vehicles,     setVehicles]     = useState([])
  const [loading,      setLoading]      = useState(true)
  const [search,       setSearch]       = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [modal,        setModal]        = useState(null)
  const [form,         setForm]         = useState(EMPTY)
  const [saving,       setSaving]       = useState(false)

  const f = (k, v) => setForm(p => ({ ...p, [k]: v }))

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = {}
      if (filterStatus) params.status = filterStatus
      if (search) params.search = search
      const { data } = await api.get('/api/vehicles', { params })
      setVehicles(data.data || [])
    } catch { toast.error('Erro ao carregar veículos') }
    finally { setLoading(false) }
  }, [filterStatus, search])

  useEffect(() => { load() }, [load])

  const openNew  = () => { setForm(EMPTY); setModal('new') }
  const openEdit = (v) => { setForm({ ...v, ano: v.ano_fab || v.ano || new Date().getFullYear(), preco: v.preco || '', preco_custo: v.preco_custo || '', fotos: v.fotos || [] }); setModal('edit') }
  const close    = () => { setModal(null); setForm(EMPTY) }

  const handleSave = async () => {
    if (!form.marca?.trim() || !form.modelo?.trim()) return toast.error('Marca e modelo são obrigatórios')
    if (!form.preco) return toast.error('Preço de venda é obrigatório')
    setSaving(true)
    try {
      const payload = {
        ...form,
        ano:        parseInt(form.ano) || new Date().getFullYear(),
        ano_mod:    parseInt(form.ano_mod) || parseInt(form.ano),
        km:         parseFloat(form.km) || 0,
        preco:      parseFloat(form.preco),
        preco_custo: form.preco_custo ? parseFloat(form.preco_custo) : null,
        descricao:  form.descricao?.trim() || null,
        cor:        form.cor?.trim() || null,
        placa:      form.placa?.trim() || null,
      }
      if (modal === 'new') {
        await api.post('/api/vehicles', payload)
        toast.success('Veículo cadastrado!')
      } else {
        await api.put(`/api/vehicles/${form.id}`, payload)
        toast.success('Veículo atualizado!')
      }
      close(); load()
    } catch (e) {
      toast.error(e.response?.data?.error || 'Erro ao salvar')
    } finally { setSaving(false) }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Remover este veículo?')) return
    try { await api.delete(`/api/vehicles/${id}`); toast.success('Veículo removido'); load() }
    catch { toast.error('Erro ao remover') }
  }

  const filtered = vehicles.filter(v =>
    !search || `${v.marca} ${v.modelo} ${v.placa || ''}`.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Veículos</div>
          <div className="page-subtitle">{vehicles.length} veículo(s) no estoque</div>
        </div>
        <button className="btn btn-primary" onClick={openNew}>
          <Plus size={14} /> Cadastrar Veículo
        </button>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 220 }}>
          <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)', pointerEvents: 'none' }} />
          <input className="input" style={{ paddingLeft: 38 }}
            placeholder="Buscar por marca, modelo ou placa..."
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="input" style={{ width: 160 }} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
          <option value="">Todos os status</option>
          <option value="disponivel">Disponível</option>
          <option value="reservado">Reservado</option>
          <option value="vendido">Vendido</option>
          <option value="consignado">Consignado</option>
        </select>
      </div>

      {loading ? (
        <div className="loading-page"><div className="spinner" /> Carregando...</div>
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          <Car size={48} />
          <h3>{search ? 'Nenhum resultado' : 'Nenhum veículo'}</h3>
          <p>{search ? `Sem resultados para "${search}"` : 'Cadastre o primeiro veículo'}</p>
          {!search && (
            <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={openNew}>
              <Plus size={14} /> Cadastrar Veículo
            </button>
          )}
        </div>
      ) : (
        <div className="section-card">
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Veículo</th>
                  <th>Ano / KM</th>
                  <th>Placa</th>
                  <th>Preço</th>
                  <th>Status</th>
                  <th style={{ width: 80 }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(v => (
                  <tr key={v.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        {v.fotos?.[0]
                          ? <img src={v.fotos[0]} alt="" style={{ width: 44, height: 36, borderRadius: 6, objectFit: 'cover', flexShrink: 0 }} />
                          : <div style={{ width: 44, height: 36, borderRadius: 6, background: 'var(--bg4)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                              {v.tipo === 'carro' ? '🚗' : '🏍️'}
                            </div>
                        }
                        <div>
                          <strong>{v.marca} {v.modelo}</strong>
                          <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>
                            {v.cor || '—'} · {v.combustivel}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <strong>{v.ano_fab || v.ano}</strong>
                      {v.ano_mod && v.ano_mod !== (v.ano_fab || v.ano) && <span style={{ fontSize: 11, color: 'var(--muted)' }}>/{v.ano_mod}</span>}
                      <div style={{ fontSize: 11, color: 'var(--muted)' }}>
                        {v.km ? v.km.toLocaleString('pt-BR') + ' km' : '—'}
                      </div>
                    </td>
                    <td style={{ fontFamily: 'DM Mono', fontSize: 12 }}>{v.placa || '—'}</td>
                    <td>
                      <strong style={{ color: 'var(--text)', fontSize: 14 }}>{formatMoney(v.preco)}</strong>
                      {v.preco_custo > 0 && (
                        <div style={{ fontSize: 10, color: 'var(--muted)' }}>custo: {formatMoney(v.preco_custo)}</div>
                      )}
                    </td>
                    <td><span className={`badge ${statusBadge[v.status]}`}>{statusLabel[v.status]}</span></td>
                    <td>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button className="btn btn-ghost btn-icon btn-sm" onClick={() => openEdit(v)} title="Editar"><Edit2 size={13} /></button>
                        <button className="btn btn-ghost btn-icon btn-sm" onClick={() => handleDelete(v.id)} title="Remover" style={{ color: 'var(--red)' }}><Trash2 size={13} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal */}
      {modal && (
        <div className="modal-overlay" onClick={close}>
          <div className="modal" style={{ maxWidth: 620 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">{modal === 'new' ? 'Cadastrar Veículo' : 'Editar Veículo'}</span>
              <button className="modal-close" onClick={close}>✕</button>
            </div>
            <div className="modal-body">
              <div className="form-grid">
                <div>
                  <label className="label">Tipo</label>
                  <select className="input" value={form.tipo} onChange={e => f('tipo', e.target.value)}>
                    <option value="carro">Carro</option>
                    <option value="moto">Moto</option>
                  </select>
                </div>
                <div>
                  <label className="label">Status</label>
                  <select className="input" value={form.status} onChange={e => f('status', e.target.value)}>
                    <option value="disponivel">Disponível</option>
                    <option value="reservado">Reservado</option>
                    <option value="vendido">Vendido</option>
                    <option value="consignado">Consignado</option>
                  </select>
                </div>
                <div>
                  <label className="label">Marca *</label>
                  <input className="input" placeholder="Honda, Toyota..." value={form.marca} onChange={e => f('marca', e.target.value)} autoFocus />
                </div>
                <div>
                  <label className="label">Modelo *</label>
                  <input className="input" placeholder="Civic, CG 160..." value={form.modelo} onChange={e => f('modelo', e.target.value)} />
                </div>
                <div>
                  <label className="label">Ano Fabricação</label>
                  <input className="input" type="number" value={form.ano} onChange={e => f('ano', e.target.value)} />
                </div>
                <div>
                  <label className="label">Ano Modelo</label>
                  <input className="input" type="number" value={form.ano_mod || form.ano} onChange={e => f('ano_mod', e.target.value)} />
                </div>
                <div>
                  <label className="label">Placa</label>
                  <input className="input" placeholder="ABC-1234" value={form.placa || ''} onChange={e => f('placa', e.target.value)} />
                </div>
                <div>
                  <label className="label">Cor</label>
                  <input className="input" placeholder="Branco, Prata..." value={form.cor || ''} onChange={e => f('cor', e.target.value)} />
                </div>
                <div>
                  <label className="label">KM Rodados</label>
                  <input className="input" type="number" min="0" value={form.km || 0} onChange={e => f('km', e.target.value)} />
                </div>
                <div>
                  <label className="label">Combustível</label>
                  <select className="input" value={form.combustivel} onChange={e => f('combustivel', e.target.value)}>
                    <option value="flex">Flex</option>
                    <option value="gasolina">Gasolina</option>
                    <option value="etanol">Etanol</option>
                    <option value="diesel">Diesel</option>
                    <option value="eletrico">Elétrico</option>
                    <option value="hibrido">Híbrido</option>
                  </select>
                </div>
                <div>
                  <label className="label">Câmbio</label>
                  <select className="input" value={form.cambio} onChange={e => f('cambio', e.target.value)}>
                    <option value="manual">Manual</option>
                    <option value="automatico">Automático</option>
                    <option value="cvt">CVT</option>
                    <option value="semi-automatico">Semi-automático</option>
                  </select>
                </div>
                <div>
                  <label className="label">Preço de Venda *</label>
                  <input className="input" type="number" step="0.01" min="0" placeholder="45000" value={form.preco} onChange={e => f('preco', e.target.value)} />
                </div>
                <div>
                  <label className="label">Preço de Custo</label>
                  <input className="input" type="number" step="0.01" min="0" placeholder="38000" value={form.preco_custo || ''} onChange={e => f('preco_custo', e.target.value)} />
                </div>
                <div style={{ gridColumn: '1/-1' }}>
                  <label className="label">Descrição / Observações</label>
                  <textarea className="input" rows={3} placeholder="Detalhes sobre o veículo, acessórios, histórico..." value={form.descricao || ''} onChange={e => f('descricao', e.target.value)} />
                </div>
                <div style={{ gridColumn: '1/-1' }}>
                  <FotoGallery
                    fotos={form.fotos || []}
                    onChange={fotos => f('fotos', fotos)}
                    tipo="vehicles"
                    max={10}
                  />
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={close}>Cancelar</button>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                {saving ? <><div className="spinner" style={{ width: 14, height: 14 }} /> Salvando...</> : 'Salvar Veículo'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
