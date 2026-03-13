import { useState, useEffect } from 'react'
import { Map, Plus, CheckCircle, Clock, Calendar as CalendarIcon, XCircle, Play, BedDouble } from 'lucide-react'
import api from '../../services/api'
import toast from 'react-hot-toast'
import Modal from '../../components/ui/Modal'
import { formatMoney } from '../../utils/format'
import { format, parseISO } from 'date-fns'

const STATUS_CONFIG = {
  agendada: { label: 'Agendada', color: 'var(--blue)', icon: CalendarIcon },
  em_curso: { label: 'Em Curso (Hospedado)', color: 'var(--green)', icon: Play },
  finalizada: { label: 'Finalizada / Check-out', color: 'var(--muted)', icon: CheckCircle },
  cancelada: { label: 'Cancelada', color: 'var(--red)', icon: XCircle },
}

export default function Reservas() {
  const [reservas, setReservas] = useState([])
  const [loading, setLoading] = useState(true)

  // Dependencias p/ Modal
  const [modalOpen, setModalOpen] = useState(false)
  const [hospedes, setHospedes] = useState([])
  const [acomodacoes, setAcomodacoes] = useState([])
  
  const [form, setForm] = useState({ client_id: '', acomodacao_id: '', data_checkin: '', data_checkout: '', status: 'agendada', valor_total: '', observacoes: '' })

  const loadPageData = async () => {
    try {
      setLoading(true)
      const [resReq, roomsReq, cliReq] = await Promise.all([
        api.get('/api/hotel/reservas').catch(()=>({data:{data:[]}})),
        api.get('/api/hotel/acomodacoes').catch(()=>({data:{data:[]}})),
        api.get('/api/clients').catch(()=>({data:{data:[]}}))
      ])
      
      setReservas(resReq.data.data || [])
      setAcomodacoes(roomsReq.data.data || [])
      setHospedes(cliReq.data.data || [])
    } catch (e) {
      toast.error('Erro ao conectar com servidor.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadPageData() }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.client_id || !form.acomodacao_id || !form.data_checkin) return toast.error('Hóspede, Quarto e Check-in são obrigatórios.')
    
    try {
      await api.post('/api/hotel/reservas', {
        ...form,
        valor_total: parseFloat(form.valor_total || 0)
      })
      toast.success('Reserva / Check-in efetuado com sucesso!')
      setModalOpen(false)
      loadPageData() // recarregamos a lista
    } catch (err) {
      toast.error(err.response?.data?.error || 'Erro ao agendar reserva.')
    }
  }

  return (
    <div className="page-container">
      <div className="page-header" style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div className="page-title">MAPA DE RESERVAS</div>
          <div className="page-subtitle">Ocupação, Check-ins e Check-outs do Hotel</div>
        </div>
        <button className="btn btn-primary" onClick={() => { setForm({ client_id: '', acomodacao_id: '', data_checkin: '', data_checkout: '', status: 'agendada', valor_total: '', observacoes: '' }); setModalOpen(true) }}>
          <Plus size={16} /> Nova Reserva
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 40 }}><div className="spinner" /></div>
      ) : (
        <div className="card" style={{ padding: 0, overflowX: 'auto' }}>
          <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid var(--border)' }}>
                <th style={{ padding: '16px 24px', fontSize: 12, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 0.5 }}>Hóspede</th>
                <th style={{ padding: '16px 24px', fontSize: 12, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 0.5 }}>Acomodação</th>
                <th style={{ padding: '16px 24px', fontSize: 12, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 0.5 }}>Data Check-in</th>
                <th style={{ padding: '16px 24px', fontSize: 12, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 0.5 }}>Status</th>
                <th style={{ padding: '16px 24px', fontSize: 12, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 0.5, textAlign: 'right' }}>Total Bruto</th>
              </tr>
            </thead>
            <tbody>
              {reservas.map(r => {
                const Conf = STATUS_CONFIG[r.status] || STATUS_CONFIG.agendada
                return (
                  <tr key={r.id} style={{ borderBottom: '1px solid var(--border)', transition: 'background 0.2s', ':hover': { background: 'rgba(255,255,255,0.02)' } }}>
                    <td style={{ padding: '16px 24px' }}>
                      <div style={{ fontWeight: 600, color: 'var(--text)', fontSize: 14 }}>{r.clients?.nome || 'Hóspede Deletado'}</div>
                      <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>{r.clients?.telefone}</div>
                    </td>
                    <td style={{ padding: '16px 24px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700, fontSize: 13, background: 'rgba(255,255,255,0.03)', padding: '6px 12px', borderRadius: 8, width: 'fit-content' }}>
                        <BedDouble size={14} color="var(--accent)" />
                        <span style={{ color: 'var(--accent)' }}>Quarto {r.acomodacoes?.numero || '-'}</span>
                      </div>
                    </td>
                    <td style={{ padding: '16px 24px' }}>
                      <div style={{ fontSize: 13, color: 'var(--text)', fontWeight: 500 }}>
                        {format(parseISO(r.data_checkin), "dd/MM/yyyy 'às' HH:mm")}
                      </div>
                    </td>
                    <td style={{ padding: '16px 24px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 700, color: Conf.color, background: `${Conf.color}15`, padding: '6px 12px', borderRadius: 6, width: 'fit-content' }}>
                        <Conf.icon size={14} /> {Conf.label}
                      </div>
                    </td>
                    <td style={{ padding: '16px 24px', fontWeight: 700, fontSize: 14, textAlign: 'right', color: 'var(--text)' }}>
                      {formatMoney(r.valor_total)}
                    </td>
                  </tr>
                )
              })}
              {reservas.length === 0 && (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: '60px 40px', color: 'var(--muted)' }}>
                    <CalendarIcon size={48} style={{ margin: '0 auto 16px', opacity: 0.2 }} />
                    <div style={{ fontSize: 14, fontWeight: 600 }}>Nenhuma reserva cadastrada</div>
                    <div style={{ fontSize: 13, marginTop: 4 }}>O seu hotel ainda não possui agendamentos.</div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal Nova Reserva */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Agendar Nova Reserva">
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--muted)', marginBottom: 6 }}>Hóspede Titular</label>
              <select className="input" value={form.client_id} onChange={e => setForm({...form, client_id: e.target.value})}>
                <option value="">Selecione o Cliente...</option>
                {hospedes.map(h => <option key={h.id} value={h.id}>{h.nome} ({h.cpf || h.telefone})</option>)}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--muted)', marginBottom: 6 }}>Quarto / Acomodação</label>
              <select className="input" value={form.acomodacao_id} onChange={e => setForm({...form, acomodacao_id: e.target.value})}>
                <option value="">Selecione o Quarto...</option>
                {acomodacoes.filter(q => q.status === 'livre' || q.status === 'limpeza').map(q => (
                  <option key={q.id} value={q.id}>Nº {q.numero} ({q.tipo}) - R$ {q.diaria_padrao}</option>
                ))}
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--muted)', marginBottom: 6 }}>Check-in (Entrada)</label>
              <input type="datetime-local" className="input" value={form.data_checkin} onChange={e => setForm({...form, data_checkin: e.target.value})} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--muted)', marginBottom: 6 }}>Previsão Check-out</label>
              <input type="datetime-local" className="input" value={form.data_checkout} onChange={e => setForm({...form, data_checkout: e.target.value})} />
            </div>
          </div>
          
          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--muted)', marginBottom: 6 }}>Situação Inicial</label>
            <select className="input" value={form.status} onChange={e => setForm({...form, status: e.target.value})}>
              <option value="agendada">Deixar Agendado (Futuro)</option>
              <option value="em_curso">Dar Entrada Imediata (Hóspede Vindo)</option>
            </select>
          </div>

          <button type="submit" className="btn btn-primary" style={{ marginTop: 8 }}>
            Salvar e Bloquear Quarto
          </button>
        </form>
      </Modal>
    </div>
  )
}
