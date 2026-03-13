import { useState, useEffect, useCallback } from 'react'
import { Plus, Wrench, Edit2, Trash2, X } from 'lucide-react'
import api from '../../services/api'
import { formatMoney, formatDate, statusLabel, statusBadge } from '../../utils/format'
import useAuthStore from '../../store/authStore'
import toast from 'react-hot-toast'

const EMPTY = { client_id: '', vehicle_id: '', descricao: '', mecanico: '', mao_obra: 0, pecas: [], obs: '' }

const STATUS_OPTIONS = ['aberta','em_andamento','aguardando_peca','concluida','cancelada']

export default function Workshop() {
  const { papel } = useAuthStore()
  const isAdmin = papel === 'dono' || papel === 'gerente'

  const [os,       setOs]       = useState([])
  const [clients,  setClients]  = useState([])
  const [vehicles, setVehicles] = useState([])
  const [loading,  setLoading]  = useState(true)
  const [filter,   setFilter]   = useState('')
  const [modal,    setModal]    = useState(null) // null | 'new' | 'edit'
  const [form,     setForm]     = useState(EMPTY)
  const [saving,   setSaving]   = useState(false)
  const [newPeca,  setNewPeca]  = useState({ nome: '', qtd: 1, valor: '' })

  const f = (k, v) => setForm(p => ({ ...p, [k]: v }))

  const loadOs = useCallback(async () => {
    try {
      const params = filter ? { status: filter } : {}
      const { data } = await api.get('/api/workshop/os', { params })
      setOs(data.data || [])
    } catch { toast.error("Oops! Não consegui buscar OS. Tente novamente 😕") }
  }, [filter])

  useEffect(() => {
    const init = async () => {
      setLoading(true)
      try {
        const [cliRes, vehRes] = await Promise.all([
          api.get('/api/clients'),
          api.get('/api/vehicles'),
        ])
        setClients(cliRes.data.data || [])
        setVehicles(vehRes.data.data || [])
        await loadOs()
      } catch { toast.error('Erro ao carregar') }
      finally { setLoading(false) }
    }
    init()
  }, [loadOs])

  useEffect(() => { if (!loading) loadOs() }, [filter, loadOs])

  const openNew  = () => { setForm(EMPTY); setModal('new') }
  const openEdit = (o) => { setForm({ ...o, pecas: o.pecas || [], mao_obra: o.mao_obra || 0 }); setModal('edit') }
  const close    = () => { setModal(null); setForm(EMPTY) }

  const addPeca = () => {
    if (!newPeca.nome?.trim() || !newPeca.valor) return toast.error('Nome e valor da peça são obrigatórios')
    f('pecas', [...(form.pecas || []), { nome: newPeca.nome, qtd: parseFloat(newPeca.qtd) || 1, valor: parseFloat(newPeca.valor) }])
    setNewPeca({ nome: '', qtd: 1, valor: '' })
  }

  const removePeca = (idx) => f('pecas', (form.pecas || []).filter((_, i) => i !== idx))

  const totalPecas = (form.pecas || []).reduce((s, p) => s + (p.valor * p.qtd), 0)
  const totalOS    = totalPecas + (parseFloat(form.mao_obra) || 0)

  const handleSave = async () => {
    if (!form.descricao?.trim()) return toast.error('Descrição é obrigatória')
    setSaving(true)
    try {
      const payload = {
        ...form,
        mao_obra: parseFloat(form.mao_obra) || 0,
        total:    totalOS,
        client_id:  form.client_id  || null,
        vehicle_id: form.vehicle_id || null,
        obs:        form.obs?.trim() || null,
        mecanico:   form.mecanico?.trim() || null,
      }
      if (modal === 'new') {
        await api.post('/api/workshop/os', payload)
        toast.success('OS criada!')
      } else {
        await api.put(`/api/workshop/os/${form.id}`, payload)
        toast.success('OS atualizada!')
      }
      close(); loadOs()
    } catch (e) { toast.error(e.response?.data?.error || 'Erro ao salvar') }
    finally { setSaving(false) }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Remover esta OS?')) return
    try { await api.delete(`/api/workshop/os/${id}`); toast.success('OS removida'); loadOs() }
    catch { toast.error('Erro ao remover') }
  }

  const updateStatus = async (id, status) => {
    try {
      await api.patch(`/api/workshop/os/${id}/status`, { status })
      toast.success(statusLabel[status] || status)
      loadOs()
    } catch { toast.error("Vixe... não consegui salvar a alteração em status 😕") }
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Oficina</div>
          <div className="page-subtitle">{os.length} ordens de serviço</div>
        </div>
        <button className="btn btn-primary" onClick={openNew}>
          <Plus size={14} /> Nova OS
        </button>
      </div>

      {/* Status filter */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 20, flexWrap: 'wrap' }}>
        {[['', 'Todas'], ...STATUS_OPTIONS.map(s => [s, statusLabel[s]])].map(([val, label]) => (
          <button key={val} className={`btn btn-sm ${filter === val ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => setFilter(val)}>{label}</button>
        ))}
      </div>

      {loading ? (
        <div className="loading-page"><div className="spinner" /> Carregando...</div>
      ) : os.length === 0 ? (
        <div className="empty-state">
          <Wrench size={48} />
          <h3>Nenhuma OS {filter ? `com status "${statusLabel[filter]}"` : ''}</h3>
          <p>Crie a primeira ordem de serviço</p>
          {!filter && (
            <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={openNew}>
              <Plus size={14} /> Nova OS
            </button>
          )}
        </div>
      ) : (
        <div className="section-card">
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Cliente</th>
                  <th>Veículo</th>
                  <th>Serviço</th>
                  <th>Mecânico</th>
                  <th>Total</th>
                  <th>Status</th>
                  <th>Data</th>
                  <th style={{ width: 80 }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {os.map(o => (
                  <tr key={o.id} style={{ cursor: 'pointer' }} onClick={() => openEdit(o)}>
                    <td>
                      <strong>{o.clients?.nome || '—'}</strong>
                      {o.clients?.telefone && <div style={{ fontSize: 11, color: 'var(--muted)' }}>{o.clients.telefone}</div>}
                    </td>
                    <td>
                      {o.vehicles ? (
                        <>
                          <strong>{o.vehicles.marca} {o.vehicles.modelo}</strong>
                          {o.vehicles.placa && <div style={{ fontSize: 11, fontFamily: 'DM Mono' }}>{o.vehicles.placa}</div>}
                        </>
                      ) : <span style={{ color: 'var(--muted)' }}>—</span>}
                    </td>
                    <td style={{ maxWidth: 180 }}>
                      <span style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {o.descricao}
                      </span>
                    </td>
                    <td style={{ fontSize: 12 }}>{o.mecanico || <span style={{ color: 'var(--muted)' }}>—</span>}</td>
                    <td><strong>{formatMoney(o.total)}</strong></td>
                    <td onClick={e => e.stopPropagation()}>
                      <select
                        className="input"
                        style={{ padding: '4px 8px', fontSize: 11, width: 'auto', borderRadius: 6 }}
                        value={o.status}
                        onChange={e => updateStatus(o.id, e.target.value)}
                      >
                        {STATUS_OPTIONS.map(s => <option key={s} value={s}>{statusLabel[s]}</option>)}
                      </select>
                    </td>
                    <td style={{ fontSize: 11 }}>{formatDate(o.created_at?.slice(0, 10))}</td>
                    <td onClick={e => e.stopPropagation()}>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button className="btn btn-ghost btn-icon btn-sm" onClick={() => openEdit(o)}><Edit2 size={13} /></button>
                        {isAdmin && (
                          <button className="btn btn-ghost btn-icon btn-sm" onClick={() => handleDelete(o.id)} style={{ color: 'var(--red)' }}><Trash2 size={13} /></button>
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

      {/* Modal */}
      {modal && (
        <div className="modal-overlay" onClick={close}>
          <div className="modal" style={{ maxWidth: 640 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">{modal === 'new' ? 'Nova Ordem de Serviço' : 'Editar OS'}</span>
              <button className="modal-close" onClick={close}>✕</button>
            </div>
            <div className="modal-body">
              <div className="form-grid">
                <div>
                  <label className="label">Cliente</label>
                  <select className="input" value={form.client_id || ''} onChange={e => f('client_id', e.target.value)}>
                    <option value="">Sem cliente</option>
                    {clients.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Veículo</label>
                  <select className="input" value={form.vehicle_id || ''} onChange={e => f('vehicle_id', e.target.value)}>
                    <option value="">Sem veículo</option>
                    {vehicles.map(v => <option key={v.id} value={v.id}>{v.marca} {v.modelo}{v.placa ? ` — ${v.placa}` : ''}</option>)}
                  </select>
                </div>
                <div style={{ gridColumn: '1/-1' }}>
                  <label className="label">Descrição do Serviço *</label>
                  <textarea className="input" rows={3} placeholder="Descreva o serviço a ser realizado..."
                    value={form.descricao || ''} onChange={e => f('descricao', e.target.value)} autoFocus />
                </div>
                <div>
                  <label className="label">Mecânico Responsável</label>
                  <input className="input" placeholder="Nome do mecânico" value={form.mecanico || ''} onChange={e => f('mecanico', e.target.value)} />
                </div>
                <div>
                  <label className="label">Mão de Obra (R$)</label>
                  <input className="input" type="number" step="0.01" min="0" value={form.mao_obra || 0} onChange={e => f('mao_obra', e.target.value)} />
                </div>
              </div>

              {/* Peças */}
              <div>
                <label className="label">Peças Utilizadas</label>
                {(form.pecas || []).length > 0 && (
                  <div className="section-card" style={{ marginBottom: 10 }}>
                    <div className="table-wrap">
                      <table>
                        <thead><tr><th>Peça</th><th>Qtd</th><th>Valor unit.</th><th>Subtotal</th><th></th></tr></thead>
                        <tbody>
                          {form.pecas.map((p, i) => (
                            <tr key={i}>
                              <td><strong>{p.nome}</strong></td>
                              <td>{p.qtd}</td>
                              <td>{formatMoney(p.valor)}</td>
                              <td><strong>{formatMoney(p.valor * p.qtd)}</strong></td>
                              <td>
                                <button className="btn btn-ghost btn-icon btn-sm" onClick={() => removePeca(i)} style={{ color: 'var(--red)' }}>
                                  <X size={12} />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <input className="input" style={{ flex: 2, minWidth: 140 }} placeholder="Nome da peça"
                    value={newPeca.nome} onChange={e => setNewPeca(p => ({ ...p, nome: e.target.value }))}
                    onKeyDown={e => e.key === 'Enter' && addPeca()} />
                  <input className="input" style={{ width: 70 }} type="number" min="0.1" step="0.1" placeholder="Qtd"
                    value={newPeca.qtd} onChange={e => setNewPeca(p => ({ ...p, qtd: e.target.value }))} />
                  <input className="input" style={{ width: 110 }} type="number" step="0.01" min="0" placeholder="Valor R$"
                    value={newPeca.valor} onChange={e => setNewPeca(p => ({ ...p, valor: e.target.value }))}
                    onKeyDown={e => e.key === 'Enter' && addPeca()} />
                  <button className="btn btn-outline btn-sm" onClick={addPeca} style={{ whiteSpace: 'nowrap' }}>
                    <Plus size={12} /> Adicionar
                  </button>
                </div>
              </div>

              {/* Total */}
              <div style={{
                background: 'var(--bg4)', border: '1px solid var(--border)',
                borderRadius: 10, padding: '12px 16px',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              }}>
                <div style={{ fontSize: 12, color: 'var(--muted)' }}>
                  Peças: <strong style={{ color: 'var(--dim)' }}>{formatMoney(totalPecas)}</strong>
                  {' · '}Mão de obra: <strong style={{ color: 'var(--dim)' }}>{formatMoney(form.mao_obra || 0)}</strong>
                </div>
                <div style={{ fontFamily: 'Bebas Neue', fontSize: 22, letterSpacing: 1 }}>
                  Total: <span style={{ color: 'var(--text)' }}>{formatMoney(totalOS)}</span>
                </div>
              </div>

              {/* Observações */}
              <div>
                <label className="label">Observações</label>
                <textarea className="input" rows={2} placeholder="Observações adicionais..."
                  value={form.obs || ''} onChange={e => f('obs', e.target.value)} />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={close}>Cancelar</button>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                {saving ? <><div className="spinner" style={{ width: 14, height: 14 }} /> Salvando...</> : 'Salvar OS'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
