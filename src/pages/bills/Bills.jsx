/**
 * Bills.jsx — Contas a Pagar (foco em despesas fixas/variáveis com UX especializada)
 * v2.0 — usa o mesmo backend /api/finance/transactions, mas foca em despesas
 * Diferencial vs Finance.jsx: categorias visuais, vencimentos urgentes, recorrência
 */
import { useEffect, useState, useCallback } from 'react'
import {
  Plus, AlertCircle, CheckCircle2, Clock, DollarSign,
  RefreshCw, X, Search, Zap, Wifi, Home, ShoppingBag, Trash2, Edit2,
} from 'lucide-react'
import api from '../../services/api'
import { formatMoney, formatDate } from '../../utils/format'
import PixModal from '../../components/ui/PixModal'
import useAuthStore from '../../store/authStore'
import toast from 'react-hot-toast'

const CAT_CONFIG = {
  'Energia Elétrica':      { icon: '⚡', color: '#F59E0B' },
  'Água / Esgoto':         { icon: '💧', color: '#3B82F6' },
  'Internet / Telefone':   { icon: '📶', color: '#8B5CF6' },
  'Aluguel do Imóvel':     { icon: '🏠', color: '#EC4899' },
  'Fornecedor / Estoque':  { icon: '📦', color: '#F97316' },
  'Salário / Pró-labore':  { icon: '👤', color: '#22C55E' },
  'Impostos / Taxas':      { icon: '🏛', color: '#EF4444' },
  'Manutenção / Reparo':   { icon: '🔧', color: '#6B7280' },
  'Marketing / Publicidade':{ icon: '📣', color: '#A78BFA' },
  'Seguro':                { icon: '🛡', color: '#64748B' },
  'Transporte / Frete':    { icon: '🚚', color: '#06B6D4' },
  'Equipamentos / TI':     { icon: '💻', color: '#10B981' },
  'Alimentação / Benefícios':{ icon: '🍽', color: '#F97316' },
  'Contabilidade / Jurídico':{ icon: '📋', color: '#9CA3AF' },
  'Outros Pagamentos':     { icon: '💸', color: '#9CA3AF' },
}

const FORMAS = ['Dinheiro', 'PIX', 'Débito Automático', 'Transferência', 'Boleto', 'Cartão Crédito', 'Cartão Débito']

const EMPTY = {
  descricao: '', valor: '', categoria: 'Outros Pagamentos',
  beneficiario: '', data_vencimento: new Date().toISOString().slice(0, 10),
  recorrente: false, obs: '', forma_pagamento: '',
}

function urgencyLevel(tx) {
  if (tx.pago) return 0
  const dias = tx.dias_atraso || 0
  if (dias > 0) return 3       // vencido
  const diff = (new Date(tx.data_vencimento) - new Date()) / 86400000
  if (diff <= 3)  return 2     // vence em breve
  if (diff <= 7)  return 1     // vence esta semana
  return 0
}

export default function Bills() {
  const { papel, tenant } = useAuthStore()
  const isAdmin = papel === 'dono' || papel === 'gerente'

  const [bills,    setBills]    = useState([])
  const [loading,  setLoading]  = useState(true)
  const [summary,  setSummary]  = useState(null)
  const [tab,      setTab]      = useState('pendentes')  // pendentes | vencidas | pagas | todas
  const [search,   setSearch]   = useState('')
  const [catFilter,setCatFilter]= useState('')
  const [modal,    setModal]    = useState(null)
  const [selected, setSelected] = useState(null)
  const [form,     setForm]     = useState(EMPTY)
  const [saving,   setSaving]   = useState(false)
  const [pixModal, setPixModal] = useState(null)

  const setF = (k, v) => setForm(p => ({ ...p, [k]: v }))

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const statusMap = {
        pendentes: 'pendente', vencidas: 'vencido', pagas: 'pago', todas: 'todos',
      }
      const [billsRes, sumRes] = await Promise.all([
        api.get('/api/finance/contas-pagar', { params: { status: statusMap[tab], limit: 200 } }),
        api.get('/api/finance/summary'),
      ])
      setBills(billsRes.data.data || [])
      setSummary(sumRes.data.data)
    } catch { toast.error("Oops! Não consegui buscar contas. Tente novamente 😕") }
    finally { setLoading(false) }
  }, [tab])

  useEffect(() => { load() }, [load])

  const filtered = bills.filter(b => {
    const s = search.toLowerCase()
    const matchSearch = !s || b.descricao.toLowerCase().includes(s) ||
      (b.beneficiario || '').toLowerCase().includes(s)
    const matchCat = !catFilter || b.categoria === catFilter
    return matchSearch && matchCat
  }).sort((a, b) => urgencyLevel(b) - urgencyLevel(a))

  const openNew  = () => { setForm(EMPTY); setModal('new') }
  const openEdit = (b) => { setForm({ ...b, valor: String(b.valor) }); setModal('edit') }
  const close    = () => { setModal(null); setForm(EMPTY) }

  const handleSave = async () => {
    if (!form.descricao?.trim()) return toast.error('Descrição obrigatória')
    if (!form.valor || isNaN(parseFloat(form.valor))) return toast.error('Valor inválido')
    if (!form.data_vencimento) return toast.error('Data obrigatória')
    setSaving(true)
    try {
      const payload = {
        ...form, tipo: 'despesa', valor: parseFloat(form.valor),
        categoria:    form.categoria || 'Outros Pagamentos',
        beneficiario: form.beneficiario?.trim() || null,
        obs:          form.obs?.trim() || null,
        forma_pagamento: form.forma_pagamento || null,
      }
      if (modal === 'new') {
        await api.post('/api/finance/transactions', payload)
        toast.success('Pronto, continha foi pra lista do devedor 💸')
      } else {
        await api.put(`/api/finance/transactions/${form.id}`, payload)
        toast.success('Conta atualizada!')
      }
      close(); load()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Erro ao salvar')
    } finally { setSaving(false) }
  }

  const handlePay = async (bill, forma) => {
    try {
      await api.patch(`/api/finance/transactions/${bill.id}/pagar`, { forma_pagamento: forma })
      toast.success('Pago!')
      load()
    } catch (err) { toast.error(err.response?.data?.error || 'Erro') }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Remover esta conta?')) return
    try {
      await api.delete(`/api/finance/transactions/${id}`)
      toast.success('Removida')
      load()
    } catch (err) { toast.error(err.response?.data?.error || 'Erro') }
  }

  const catCfg = (cat) => CAT_CONFIG[cat] || { icon: '💸', color: '#9CA3AF' }

  const TABS = [
    { id: 'pendentes', label: 'Pendentes' },
    { id: 'vencidas',  label: 'Vencidas' },
    { id: 'pagas',     label: 'Pagas' },
    { id: 'todas',     label: 'Todas' },
  ]

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Contas a Pagar</div>
          <div className="page-subtitle">Despesas fixas, variáveis e recorrentes</div>
        </div>
        {isAdmin && (
          <button className="btn btn-primary" onClick={openNew}>
            <Plus size={14} /> Nova Conta
          </button>
        )}
      </div>

      {/* KPIs */}
      {summary && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px,1fr))', gap: 12, marginBottom: 20 }}>
          <div style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 12, padding: '14px 18px' }}>
            <div style={{ fontSize: 10, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>A Pagar (total)</div>
            <div style={{ fontSize: 22, fontFamily: 'Bebas Neue', color: '#F59E0B' }}>{formatMoney(summary.a_pagar)}</div>
          </div>
          <div style={{ background: summary.vencido_pagar > 0 ? 'rgba(232,25,44,0.06)' : 'var(--bg3)', border: `1px solid ${summary.vencido_pagar > 0 ? 'rgba(232,25,44,0.2)' : 'var(--border)'}`, borderRadius: 12, padding: '14px 18px' }}>
            <div style={{ fontSize: 10, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>Vencidas</div>
            <div style={{ fontSize: 22, fontFamily: 'Bebas Neue', color: summary.vencido_pagar > 0 ? 'var(--red)' : 'var(--muted)' }}>{formatMoney(summary.vencido_pagar)}</div>
          </div>
          <div style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 12, padding: '14px 18px' }}>
            <div style={{ fontSize: 10, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>Próx. 7 dias</div>
            <div style={{ fontSize: 22, fontFamily: 'Bebas Neue', color: 'var(--blue)' }}>{formatMoney(summary.prox_pagar)}</div>
          </div>
          <div style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 12, padding: '14px 18px' }}>
            <div style={{ fontSize: 10, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>Pago este mês</div>
            <div style={{ fontSize: 22, fontFamily: 'Bebas Neue', color: 'var(--green)' }}>{formatMoney(summary.despesas)}</div>
          </div>
        </div>
      )}

      {/* Tabs + search */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', padding: '0 16px', gap: 0, flexWrap: 'wrap' }}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{
              all: 'unset', cursor: 'pointer', padding: '12px 14px', fontSize: 12,
              fontWeight: tab === t.id ? 700 : 400,
              color:      tab === t.id ? 'var(--accent)' : 'var(--muted)',
              borderBottom: tab === t.id ? '2px solid var(--accent)' : '2px solid transparent',
            }}>
              {t.label}
            </button>
          ))}
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center', padding: '8px 0' }}>
            <div style={{ position: 'relative' }}>
              <Search size={12} style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)' }} />
              <input className="input" placeholder="Buscar..." value={search} onChange={e => setSearch(e.target.value)}
                style={{ paddingLeft: 28, fontSize: 11, height: 30, width: 160 }} />
            </div>
            <select className="input" value={catFilter} onChange={e => setCatFilter(e.target.value)} style={{ fontSize: 11, height: 30, width: 160 }}>
              <option value="">Todas categorias</option>
              {Object.keys(CAT_CONFIG).map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>

        {/* Lista */}
        {loading ? (
          <div style={{ padding: 32, textAlign: 'center' }}><div className="spinner" style={{ margin: '0 auto' }} /></div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: '40px 24px', textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>
            Nenhuma conta encontrada
          </div>
        ) : (
          filtered.map(bill => {
            const cfg   = catCfg(bill.categoria)
            const urgL  = urgencyLevel(bill)
            const bLeft = urgL === 3 ? 'var(--red)' : urgL === 2 ? '#F59E0B' : urgL === 1 ? 'var(--blue)' : 'var(--border)'

            return (
              <div key={bill.id} style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '12px 16px', borderBottom: '1px solid var(--border)',
                borderLeft: `3px solid ${bLeft}`,
                transition: 'background 0.1s',
              }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--bg3)'}
                onMouseLeave={e => e.currentTarget.style.background = ''}
              >
                {/* Category icon */}
                <div style={{
                  width: 36, height: 36, borderRadius: 9, flexShrink: 0,
                  background: `${cfg.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 18,
                }}>
                  {cfg.icon}
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {bill.descricao}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>
                    {bill.categoria}
                    {bill.beneficiario && ` · ${bill.beneficiario}`}
                    {bill.recorrente && <span style={{ color: '#A78BFA', marginLeft: 6 }}>↻ mensal</span>}
                  </div>
                </div>

                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ fontSize: 15, fontWeight: 700, fontFamily: 'Bebas Neue', color: bill.pago ? 'var(--muted)' : 'var(--red)' }}>
                    {formatMoney(bill.valor)}
                  </div>
                  <div style={{ fontSize: 10, color: urgL === 3 ? 'var(--red)' : 'var(--muted)' }}>
                    {bill.pago ? `Pago em ${formatDate(bill.data_pagamento)}` :
                     urgL === 3 ? `Venceu há ${bill.dias_atraso}d` :
                     `Vence ${formatDate(bill.data_vencimento)}`}
                  </div>
                </div>

                {/* Status badge */}
                {bill.pago && (
                  <div style={{ fontSize: 10, color: 'var(--green)', background: 'rgba(34,197,94,0.1)', padding: '3px 8px', borderRadius: 20, flexShrink: 0 }}>
                    ✓ Pago
                  </div>
                )}

                {/* Ações */}
                {isAdmin && (
                  <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                    {!bill.pago && (
                      <>
                        <button className="btn" style={{ padding: '4px 10px', fontSize: 11 }}
                          onClick={() => handlePay(bill, 'Dinheiro')}>
                          <CheckCircle2 size={12} /> Pagar
                        </button>
                        {tenant?.pix_chave && (
                          <button className="btn" style={{ padding: '4px 10px', fontSize: 11, color: 'var(--green)', borderColor: 'rgba(34,197,94,0.3)' }}
                            onClick={() => setPixModal({ valor: bill.valor, descricao: bill.descricao, onConfirm: () => handlePay(bill, 'PIX') })}>
                            PIX
                          </button>
                        )}
                      </>
                    )}
                    <button className="icon-btn" onClick={() => openEdit(bill)}><Edit2 size={12} /></button>
                    <button className="icon-btn" style={{ color: 'var(--red)' }} onClick={() => handleDelete(bill.id)}><Trash2 size={12} /></button>
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>

      {/* Modal cadastro */}
      {(modal === 'new' || modal === 'edit') && (
        <div className="modal-overlay" onClick={close}>
          <div className="modal" style={{ width: 500 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">{modal === 'new' ? 'Nova Conta a Pagar' : 'Editar Conta'}</div>
              <button className="icon-btn" onClick={close}><X size={16} /></button>
            </div>
            <div className="form-grid">
              <div style={{ gridColumn: '1/-1' }}>
                <label className="label">Descrição *</label>
                <input className="input" value={form.descricao} onChange={e => setF('descricao', e.target.value)}
                  placeholder="Ex: Conta de Energia - junho" />
              </div>
              <div>
                <label className="label">Valor (R$) *</label>
                <input className="input" type="number" min="0.01" step="0.01" value={form.valor}
                  onChange={e => setF('valor', e.target.value)} placeholder="0,00" />
              </div>
              <div>
                <label className="label">Vencimento *</label>
                <input className="input" type="date" value={form.data_vencimento}
                  onChange={e => setF('data_vencimento', e.target.value)} />
              </div>
              <div style={{ gridColumn: '1/-1' }}>
                <label className="label">Categoria</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px,1fr))', gap: 6 }}>
                  {Object.entries(CAT_CONFIG).map(([cat, cfg]) => (
                    <button key={cat} onClick={() => setF('categoria', cat)} style={{
                      all: 'unset', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
                      padding: '7px 10px', borderRadius: 8, fontSize: 11,
                      background: form.categoria === cat ? `${cfg.color}18` : 'var(--bg3)',
                      border: `1px solid ${form.categoria === cat ? cfg.color + '60' : 'var(--border)'}`,
                      color: form.categoria === cat ? cfg.color : 'var(--dim)',
                    }}>
                      <span>{cfg.icon}</span>
                      <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 90 }}>{cat.split('/')[0].trim()}</span>
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="label">Beneficiário</label>
                <input className="input" value={form.beneficiario} onChange={e => setF('beneficiario', e.target.value)}
                  placeholder="Fornecedor, empresa..." />
              </div>
              <div>
                <label className="label">Forma de Pagamento</label>
                <select className="input" value={form.forma_pagamento} onChange={e => setF('forma_pagamento', e.target.value)}>
                  <option value="">Selecione</option>
                  {FORMAS.map(f => <option key={f} value={f}>{f}</option>)}
                </select>
              </div>
              <div style={{ gridColumn: '1/-1' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 12, color: 'var(--dim)' }}>
                  <input type="checkbox" checked={form.recorrente} onChange={e => setF('recorrente', e.target.checked)}
                    style={{ accentColor: '#A78BFA' }} />
                  Conta recorrente (gera automaticamente todo mês)
                </label>
              </div>
              <div style={{ gridColumn: '1/-1' }}>
                <label className="label">Observações</label>
                <textarea className="input" rows={2} value={form.obs} onChange={e => setF('obs', e.target.value)}
                  placeholder="Número do boleto, referência..." style={{ resize: 'vertical' }} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 20, justifyContent: 'flex-end' }}>
              <button className="btn" onClick={close}>Cancelar</button>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                {saving ? <><RefreshCw size={12} className="spin" /> Salvando...</> : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {pixModal && (
        <PixModal
          valor={pixModal.valor}
          descricao={pixModal.descricao}
          tenant={tenant}
          onClose={() => setPixModal(null)}
          onConfirm={() => { pixModal.onConfirm(); setPixModal(null) }}
        />
      )}

      <style>{`.spin{animation:spin 1s linear infinite}@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}
