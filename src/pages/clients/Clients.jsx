import { useState, useEffect, useCallback } from 'react'
import { Plus, Search, Users, Edit2, Trash2, GitMerge } from 'lucide-react'
import api from '../../services/api'
import { statusLabel, statusBadge, formatDate } from '../../utils/format'
import useAuthStore from '../../store/authStore'
import ImageUpload from '../../components/ui/ImageUpload'
import toast from 'react-hot-toast'

const EMPTY_C = { nome: '', cpf_cnpj: '', telefone: '', email: '', endereco: '', cidade: '', estado: '', obs: '', foto_url: '' }
const EMPTY_L = { client_id: '', vehicle_id: '', origem: 'loja', status: 'novo', valor_oferta: '', obs: '' }

export default function Clients() {
  const { tenant } = useAuthStore()
  const isConcessionaria = tenant?.tipo === 'concessionaria'

  const [tab,      setTab]      = useState('clients')
  const [clients,  setClients]  = useState([])
  const [leads,    setLeads]    = useState([])
  const [vehicles, setVehicles] = useState([])
  const [search,   setSearch]   = useState('')
  const [loading,  setLoading]  = useState(true)
  const [modal,    setModal]    = useState(null)
  const [form,     setForm]     = useState(EMPTY_C)
  const [saving,   setSaving]   = useState(false)

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const loadAll = useCallback(async () => {
    setLoading(true)
    try {
      const params = search ? { search } : {}
      const reqs = [api.get('/api/clients', { params }), api.get('/api/clients/leads')]
      if (isConcessionaria) reqs.push(api.get('/api/vehicles'))
      const [cRes, lRes, vRes] = await Promise.all(reqs)
      setClients(cRes.data.data || [])
      setLeads(lRes.data.data || [])
      if (vRes) setVehicles(vRes.data.data || [])
    } catch { toast.error('Erro ao carregar') }
    finally { setLoading(false) }
  }, [search, isConcessionaria])

  useEffect(() => { loadAll() }, [loadAll])

  const openNewClient  = () => { setForm(EMPTY_C); setModal('client-new') }
  const openEditClient = (c) => { setForm({ ...c }); setModal('client-edit') }
  const openNewLead    = () => { setForm(EMPTY_L); setModal('lead-new') }
  const close          = () => { setModal(null); setForm(EMPTY_C) }

  const saveClient = async () => {
    if (!form.nome?.trim()) return toast.error('Como podemos te chamar? O nome é obrigatório! 👤')
    setSaving(true)
    try {
      const payload = { ...form }
      for (const k of ['cpf_cnpj', 'telefone', 'email', 'endereco', 'cidade', 'estado', 'obs']) {
        if (payload[k] === '') payload[k] = null
      }
      if (modal === 'client-new') {
        await api.post('/api/clients', payload)
        toast.success('É isso aí! Novo cliente salvo na casa 🎉')
      } else {
        await api.put(`/api/clients/${form.id}`, payload)
        toast.success('Cliente atualizado!')
      }
      close(); loadAll()
    } catch (e) { toast.error(e.response?.data?.error || 'Erro ao salvar') }
    finally { setSaving(false) }
  }

  const saveLead = async () => {
    if (!form.client_id) return toast.error('Para quem é essa venda? Selecione um cliente da lista! 🧑‍💼')
    setSaving(true)
    try {
      const payload = {
        ...form,
        valor_oferta: form.valor_oferta ? parseFloat(form.valor_oferta) : null,
        vehicle_id:   form.vehicle_id || null,
        obs:          form.obs?.trim() || null,
      }
      await api.post('/api/clients/leads', payload)
      toast.success('Lead criado!')
      close(); loadAll()
    } catch (e) { toast.error(e.response?.data?.error || 'Erro ao salvar') }
    finally { setSaving(false) }
  }

  const updateLeadStatus = async (id, status) => {
    try {
      await api.put(`/api/clients/leads/${id}`, { status })
      toast.success(statusLabel[status] || 'Atualizado')
      loadAll()
    } catch { toast.error('Erro ao atualizar') }
  }

  const deleteClient = async (id) => {
    if (!window.confirm('Remover este cliente?')) return
    try { await api.delete(`/api/clients/${id}`); toast.success('Cliente removido'); loadAll() }
    catch { toast.error('Erro ao remover') }
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Clientes</div>
          <div className="page-subtitle">{clients.length} clientes{isConcessionaria ? ` · ${leads.length} leads` : ''}</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {isConcessionaria && (
            <button className="btn btn-outline" onClick={openNewLead}><GitMerge size={14} /> Novo Lead</button>
          )}
          <button className="btn btn-primary" onClick={openNewClient}><Plus size={14} /> Novo Cliente</button>
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs">
        <button className={`tab-btn${tab === 'clients' ? ' active' : ''}`} onClick={() => setTab('clients')}>
          Clientes ({clients.length})
        </button>
        {isConcessionaria && (
          <button className={`tab-btn${tab === 'leads' ? ' active' : ''}`} onClick={() => setTab('leads')}>
            Leads / CRM ({leads.length})
          </button>
        )}
      </div>

      {tab === 'clients' && (
        <div style={{ position: 'relative', marginBottom: 16 }}>
          <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)', pointerEvents: 'none' }} />
          <input className="input" style={{ paddingLeft: 38, maxWidth: 400 }}
            placeholder="Buscar por nome, CPF/CNPJ ou telefone..."
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      )}

      {loading ? (
        <div className="loading-page"><div className="spinner" /> Carregando...</div>
      ) : tab === 'clients' ? (
        clients.length === 0 ? (
          <div className="empty-state">
            <Users size={48} />
            <h3>{search ? 'Nenhum resultado' : 'Nenhum cliente'}</h3>
            <p>{search ? `Sem resultados para "${search}"` : 'Cadastre o primeiro cliente'}</p>
            {!search && <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={openNewClient}><Plus size={14} /> Novo Cliente</button>}
          </div>
        ) : (
          <div className="section-card">
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Nome</th>
                    <th>CPF / CNPJ</th>
                    <th>Telefone</th>
                    <th>Cidade</th>
                    <th style={{ width: 80 }}>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {clients.map(c => (
                    <tr key={c.id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          {c.foto_url
                            ? <img src={c.foto_url} alt="" style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
                            : <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--bg4)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 13, fontWeight: 700, color: 'var(--muted)' }}>
                                {c.nome?.[0]?.toUpperCase() || '?'}
                              </div>
                          }
                          <div>
                            <strong>{c.nome}</strong>
                            {c.email && <div style={{ fontSize: 11, color: 'var(--muted)' }}>{c.email}</div>}
                          </div>
                        </div>
                      </td>
                      <td style={{ fontFamily: 'DM Mono', fontSize: 12 }}>{c.cpf_cnpj || '—'}</td>
                      <td>{c.telefone || '—'}</td>
                      <td>{c.cidade ? `${c.cidade}${c.estado ? `/${c.estado}` : ''}` : '—'}</td>
                      <td>
                        <div style={{ display: 'flex', gap: 4 }}>
                          <button className="btn btn-ghost btn-icon btn-sm" onClick={() => openEditClient(c)} title="Editar"><Edit2 size={13} /></button>
                          <button className="btn btn-ghost btn-icon btn-sm" onClick={() => deleteClient(c.id)} title="Remover" style={{ color: 'var(--red)' }}><Trash2 size={13} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )
      ) : (
        leads.length === 0 ? (
          <div className="empty-state">
            <GitMerge size={48} />
            <h3>Nenhum lead</h3>
            <p>Crie o primeiro lead de venda</p>
            <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={openNewLead}><Plus size={14} /> Novo Lead</button>
          </div>
        ) : (
          <div className="section-card">
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Cliente</th>
                    <th>Veículo</th>
                    <th>Origem</th>
                    <th>Proposta</th>
                    <th>Status</th>
                    <th>Data</th>
                    <th>Atualizar</th>
                  </tr>
                </thead>
                <tbody>
                  {leads.map(l => (
                    <tr key={l.id}>
                      <td>
                        <strong>{l.clients?.nome || '—'}</strong>
                        {l.clients?.telefone && <div style={{ fontSize: 11, color: 'var(--muted)' }}>{l.clients.telefone}</div>}
                      </td>
                      <td style={{ fontSize: 12 }}>
                        {l.vehicles ? `${l.vehicles.marca} ${l.vehicles.modelo} ${l.vehicles.ano}` : '—'}
                      </td>
                      <td style={{ fontSize: 12, textTransform: 'capitalize' }}>{l.origem || '—'}</td>
                      <td style={{ fontSize: 12 }}>{l.valor_oferta ? `R$ ${Number(l.valor_oferta).toLocaleString('pt-BR')}` : '—'}</td>
                      <td><span className={`badge ${statusBadge[l.status]}`}>{statusLabel[l.status]}</span></td>
                      <td style={{ fontSize: 11, color: 'var(--muted)' }}>{formatDate(l.created_at?.slice(0, 10))}</td>
                      <td>
                        <select className="input" style={{ padding: '4px 8px', fontSize: 11, width: 'auto', borderRadius: 6 }}
                          value={l.status} onChange={e => updateLeadStatus(l.id, e.target.value)}>
                          {['novo', 'contato', 'negociando', 'fechado', 'perdido'].map(s => (
                            <option key={s} value={s}>{statusLabel[s]}</option>
                          ))}
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )
      )}

      {/* Modal cliente */}
      {(modal === 'client-new' || modal === 'client-edit') && (
        <div className="modal-overlay" onClick={close}>
          <div className="modal" style={{ maxWidth: 540 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">{modal === 'client-new' ? 'Novo Cliente' : 'Editar Cliente'}</span>
              <button className="modal-close" onClick={close}>✕</button>
            </div>
            <div className="modal-body">
              <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', marginBottom: 16 }}>
                <ImageUpload
                  url={form.foto_url}
                  onChange={url => set('foto_url', url)}
                  tipo="clients"
                  label="Foto"
                  size={72}
                  shape="circle"
                />
                <div style={{ flex: 1 }}>
                  <label className="label">Nome completo *</label>
                  <input className="input" placeholder="Nome do cliente" value={form.nome || ''} onChange={e => set('nome', e.target.value)} autoFocus />
                </div>
              </div>
              <div className="form-grid">
                <div>
                  <label className="label">CPF / CNPJ</label>
                  <input className="input" placeholder="000.000.000-00" value={form.cpf_cnpj || ''} onChange={e => set('cpf_cnpj', e.target.value)} />
                </div>
                <div>
                  <label className="label">Telefone / WhatsApp</label>
                  <input className="input" placeholder="(88) 99999-0000" value={form.telefone || ''} onChange={e => set('telefone', e.target.value)} />
                </div>
                <div style={{ gridColumn: '1/-1' }}>
                  <label className="label">Email</label>
                  <input className="input" type="email" placeholder="cliente@email.com" value={form.email || ''} onChange={e => set('email', e.target.value)} />
                </div>
                <div style={{ gridColumn: '1/-1' }}>
                  <label className="label">Endereço</label>
                  <input className="input" placeholder="Rua, número, bairro" value={form.endereco || ''} onChange={e => set('endereco', e.target.value)} />
                </div>
                <div>
                  <label className="label">Cidade</label>
                  <input className="input" placeholder="Fortaleza" value={form.cidade || ''} onChange={e => set('cidade', e.target.value)} />
                </div>
                <div>
                  <label className="label">Estado</label>
                  <input className="input" placeholder="CE" maxLength={2} value={form.estado || ''} onChange={e => set('estado', e.target.value.toUpperCase())} />
                </div>
                <div style={{ gridColumn: '1/-1' }}>
                  <label className="label">Observações</label>
                  <textarea className="input" rows={2} placeholder="Observações sobre o cliente..." value={form.obs || ''} onChange={e => set('obs', e.target.value)} />
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={close}>Cancelar</button>
              <button className="btn btn-primary" onClick={saveClient} disabled={saving}>
                {saving ? <><div className="spinner" style={{ width: 14, height: 14 }} /> Salvando...</> : 'Salvar Cliente'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal lead */}
      {modal === 'lead-new' && (
        <div className="modal-overlay" onClick={close}>
          <div className="modal" style={{ maxWidth: 480 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">Novo Lead</span>
              <button className="modal-close" onClick={close}>✕</button>
            </div>
            <div className="modal-body">
              <div className="form-grid">
                <div style={{ gridColumn: '1/-1' }}>
                  <label className="label">Cliente *</label>
                  <select className="input" value={form.client_id || ''} onChange={e => set('client_id', e.target.value)} autoFocus>
                    <option value="">Selecione um cliente...</option>
                    {clients.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                  </select>
                </div>
                <div style={{ gridColumn: '1/-1' }}>
                  <label className="label">Veículo de Interesse</label>
                  <select className="input" value={form.vehicle_id || ''} onChange={e => set('vehicle_id', e.target.value)}>
                    <option value="">Sem veículo específico</option>
                    {vehicles.filter(v => v.status === 'disponivel').map(v => (
                      <option key={v.id} value={v.id}>{v.marca} {v.modelo} {v.ano} — {v.placa || 'sem placa'}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label">Origem</label>
                  <select className="input" value={form.origem || 'loja'} onChange={e => set('origem', e.target.value)}>
                    {['loja', 'whatsapp', 'site', 'indicacao', 'instagram', 'facebook', 'telefone'].map(o => (
                      <option key={o} value={o}>{o}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label">Proposta (R$)</label>
                  <input className="input" type="number" step="0.01" min="0" placeholder="0,00"
                    value={form.valor_oferta || ''} onChange={e => set('valor_oferta', e.target.value)} />
                </div>
                <div style={{ gridColumn: '1/-1' }}>
                  <label className="label">Observações</label>
                  <textarea className="input" rows={2} placeholder="Interesse, contatos, histórico..."
                    value={form.obs || ''} onChange={e => set('obs', e.target.value)} />
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={close}>Cancelar</button>
              <button className="btn btn-primary" onClick={saveLead} disabled={saving}>
                {saving ? <><div className="spinner" style={{ width: 14, height: 14 }} /> Salvando...</> : 'Criar Lead'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
