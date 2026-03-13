import { useState, useEffect } from 'react'
import { BedDouble, Plus, Search, Filter, Edit, Trash2, CheckCircle, Clock, Wrench } from 'lucide-react'
import api from '../../services/api'
import toast from 'react-hot-toast'
import useAuthStore from '../../store/authStore'
import Modal from '../../components/ui/Modal'
import { formatMoney } from '../../utils/format'

const STATUS_CONFIG = {
  livre: { label: 'Livre', color: 'var(--green)', icon: CheckCircle },
  ocupado: { label: 'Ocupado', color: 'var(--blue)', icon: BedDouble },
  limpeza: { label: 'Em Limpeza', color: '#F59E0B', icon: Clock },
  manutencao: { label: 'Manutenção', color: 'var(--red)', icon: Wrench },
}

export default function Acomodacoes() {
  const [quartos, setQuartos] = useState([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState({ numero: '', tipo: 'padrao', capacidade: 2, diaria_padrao: '', descricao: '', status: 'livre' })

  const loadQuartos = async () => {
    try {
      setLoading(true)
      const { data } = await api.get('/api/hotel/acomodacoes')
      setQuartos(data.data || [])
    } catch (e) {
      toast.error('Erro ao carregar quartos')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadQuartos() }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.numero) return toast.error('Informe a numeração')
    try {
      await api.post('/api/hotel/acomodacoes', {
        ...form,
        capacidade: parseInt(form.capacidade),
        diaria_padrao: parseFloat(form.diaria_padrao || 0)
      })
      toast.success('Acomodação registrada!')
      setModalOpen(false)
      loadQuartos()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Falha ao salvar')
    }
  }

  return (
    <div className="page-container">
      <div className="page-header" style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div className="page-title">ACOMODAÇÕES E QUARTOS</div>
          <div className="page-subtitle">Gerencie os cômodos disponíveis no Hotel</div>
        </div>
        <button className="btn btn-primary" onClick={() => { setForm({ numero: '', tipo: 'padrao', capacidade: 2, diaria_padrao: '', descricao: '', status: 'livre' }); setModalOpen(true) }}>
          <Plus size={16} /> Novo Quarto
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 40 }}><div className="spinner" /></div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
          {quartos.map(q => {
            const Conf = STATUS_CONFIG[q.status] || STATUS_CONFIG.livre
            const Icon = Conf.icon
            return (
              <div key={q.id} className="card" style={{ padding: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                  <div>
                    <div style={{ fontSize: 24, fontWeight: 900, fontFamily: 'Bebas Neue', letterSpacing: 1 }}>{q.numero}</div>
                    <div style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase' }}>{q.tipo} • {q.capacidade} pax</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 700, color: Conf.color, background: `${Conf.color}15`, padding: '4px 8px', borderRadius: 6 }}>
                    <Icon size={12} /> {Conf.label}
                  </div>
                </div>
                
                <div style={{ fontSize: 13, color: 'var(--text)', marginBottom: 12 }}>
                  <span style={{ color: 'var(--muted)' }}>Diária Base: </span> 
                  {formatMoney(q.diaria_padrao)}
                </div>

                {q.descricao && <div style={{ fontSize: 12, color: 'var(--muted)', fontStyle: 'italic' }}>"{q.descricao}"</div>}
              </div>
            )
          })}
          {quartos.length === 0 && (
            <div style={{ gridColumn: '1 / -1', padding: 40, textAlign: 'center', color: 'var(--muted)' }}>
              <BedDouble size={48} style={{ margin: '0 auto 16px', opacity: 0.2 }} />
              Nenhuma acomodação cadastrada ainda.
            </div>
          )}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Nova Acomodação">
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--muted)', marginBottom: 6 }}>Nº ou Nome do Quarto</label>
              <input autoFocus className="input" value={form.numero} onChange={e => setForm({...form, numero: e.target.value})} placeholder="Ex: 101, Chalé B" />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--muted)', marginBottom: 6 }}>Tipo de Ocupação</label>
              <select className="input" value={form.tipo} onChange={e => setForm({...form, tipo: e.target.value})}>
                <option value="padrao">Standard</option>
                <option value="luxo">Luxo / Premium</option>
                <option value="chale">Chalé / Bangalô</option>
                <option value="familia">Quarto Família</option>
              </select>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--muted)', marginBottom: 6 }}>Hóspedes (Max)</label>
              <input type="number" className="input" value={form.capacidade} onChange={e => setForm({...form, capacidade: e.target.value})} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--muted)', marginBottom: 6 }}>Diária Padrão (R$)</label>
              <input type="number" step="0.01" className="input" value={form.diaria_padrao} onChange={e => setForm({...form, diaria_padrao: e.target.value})} />
            </div>
          </div>
          <button type="submit" className="btn btn-primary" style={{ marginTop: 8 }}>
            Salvar Acomodação
          </button>
        </form>
      </Modal>
    </div>
  )
}
