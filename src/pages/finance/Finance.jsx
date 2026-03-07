/**
 * Finance.jsx — Financeiro Geral: DRE, Fluxo de Caixa, lançamentos
 * v2.0 — contas a receber e a pagar separadas, DRE, fluxo de caixa visual
 */
import { useEffect, useState, useCallback } from 'react'
import {
  Plus, TrendingUp, TrendingDown, DollarSign, BarChart2,
  CheckCircle2, Trash2, Edit2, RefreshCw, ChevronDown, X,
  AlertCircle, Clock, ArrowUpRight, ArrowDownRight, Filter,
} from 'lucide-react'
import api from '../../services/api'
import { formatMoney, formatDate } from '../../utils/format'
import useAuthStore from '../../store/authStore'
import toast from 'react-hot-toast'

const MESES_PT = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']

const EMPTY_FORM = {
  tipo: 'receita', descricao: '', valor: '',
  data_vencimento: new Date().toISOString().slice(0, 10),
  categoria: '', forma_pagamento: '', pago: false,
  recorrente: false, obs: '', beneficiario: '', centro_custo: '',
}

function mesAtual() { return new Date().toISOString().slice(0, 7) }

function KpiCard({ label, value, sub, color, icon: Icon, urgent }) {
  return (
    <div style={{
      background: urgent ? `rgba(232,25,44,0.06)` : 'var(--bg3)',
      border: `1px solid ${urgent ? 'rgba(232,25,44,0.2)' : 'var(--border)'}`,
      borderRadius: 12, padding: '14px 18px',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ fontSize: 10, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>{label}</div>
          <div style={{ fontSize: 22, fontFamily: 'Bebas Neue', letterSpacing: 1, color: color || 'var(--text)' }}>{value}</div>
          {sub && <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>{sub}</div>}
        </div>
        {Icon && (
          <div style={{ width: 36, height: 36, borderRadius: 9, background: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon size={16} color={color} />
          </div>
        )}
      </div>
    </div>
  )
}

function MiniBar({ label, receitas, despesas, saldo }) {
  const maxVal = Math.max(receitas, despesas, 1)
  return (
    <div style={{ flex: 1, minWidth: 60 }}>
      <div style={{ display: 'flex', gap: 3, alignItems: 'flex-end', height: 48, marginBottom: 4 }}>
        <div title={`Receitas: ${formatMoney(receitas)}`}
          style={{ flex: 1, background: 'var(--green)', borderRadius: '3px 3px 0 0', opacity: 0.8,
            height: `${(receitas / maxVal) * 100}%`, minHeight: receitas > 0 ? 4 : 0 }} />
        <div title={`Despesas: ${formatMoney(despesas)}`}
          style={{ flex: 1, background: 'var(--red)', borderRadius: '3px 3px 0 0', opacity: 0.8,
            height: `${(despesas / maxVal) * 100}%`, minHeight: despesas > 0 ? 4 : 0 }} />
      </div>
      <div style={{ fontSize: 9, color: 'var(--muted)', textAlign: 'center' }}>
        {MESES_PT[parseInt(label.slice(5, 7)) - 1]}
      </div>
    </div>
  )
}

export default function Finance() {
  const { papel, tenant } = useAuthStore()
  const isAdmin = papel === 'dono' || papel === 'gerente'

  const [summary,    setSummary]    = useState(null)
  const [fluxo,      setFluxo]      = useState([])
  const [txs,        setTxs]        = useState([])
  const [cats,       setCats]       = useState({ receita: [], despesa: [], formas: [] })
  const [loading,    setLoading]    = useState(true)
  const [mes,        setMes]        = useState(mesAtual())
  const [filtroTipo, setFiltroTipo] = useState('')
  const [filtroPago, setFiltroPago] = useState('')
  const [modal,      setModal]      = useState(null)  // 'new' | 'edit' | 'pay'
  const [form,       setForm]       = useState(EMPTY_FORM)
  const [payForm,    setPayForm]    = useState({ forma_pagamento: 'PIX', valor_pago: '' })
  const [saving,     setSaving]     = useState(false)
  const [tab,        setTab]        = useState('todos')  // todos | receber | pagar

  const setF = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = { mes }
      if (filtroTipo) params.tipo = filtroTipo
      if (filtroPago !== '') params.pago = filtroPago
      if (tab === 'receber') params.tipo = 'receita'
      if (tab === 'pagar')   params.tipo = 'despesa'

      const [sumRes, txRes, fluxoRes, catsRes] = await Promise.all([
        api.get('/api/finance/summary', { params: { mes } }),
        api.get('/api/finance/transactions', { params }),
        api.get('/api/finance/fluxo-caixa', { params: { meses: 6 } }),
        api.get('/api/finance/categorias'),
      ])
      setSummary(sumRes.data.data)
      setTxs(txRes.data.data || [])
      setFluxo(fluxoRes.data.data || [])
      setCats(catsRes.data.data || { receita: [], despesa: [], formas: [] })
    } catch { toast.error('Erro ao carregar financeiro') }
    finally { setLoading(false) }
  }, [mes, filtroTipo, filtroPago, tab])

  useEffect(() => { load() }, [load])

  const openNew  = (tipo = 'receita') => { setForm({ ...EMPTY_FORM, tipo }); setModal('new') }
  const openEdit = (tx) => { setForm({ ...tx, valor: String(tx.valor) }); setModal('edit') }
  const openPay  = (tx) => { setForm(tx); setPayForm({ forma_pagamento: 'PIX', valor_pago: String(tx.valor) }); setModal('pay') }
  const close    = () => { setModal(null); setForm(EMPTY_FORM) }

  const handleSave = async () => {
    if (!form.descricao?.trim()) return toast.error('Descrição é obrigatória')
    if (!form.valor || isNaN(parseFloat(form.valor))) return toast.error('Valor inválido')
    if (!form.data_vencimento) return toast.error('Data de vencimento é obrigatória')
    setSaving(true)
    try {
      const payload = {
        ...form, valor: parseFloat(form.valor),
        categoria:       form.categoria?.trim()       || null,
        forma_pagamento: form.forma_pagamento?.trim() || null,
        obs:             form.obs?.trim()             || null,
        beneficiario:    form.beneficiario?.trim()    || null,
        centro_custo:    form.centro_custo?.trim()    || null,
      }
      if (modal === 'new') {
        await api.post('/api/finance/transactions', payload)
        toast.success('Lançamento criado!')
      } else {
        await api.put(`/api/finance/transactions/${form.id}`, payload)
        toast.success('Lançamento atualizado!')
      }
      close(); load()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Erro ao salvar')
    } finally { setSaving(false) }
  }

  const handlePay = async () => {
    setSaving(true)
    try {
      await api.patch(`/api/finance/transactions/${form.id}/pagar`, {
        forma_pagamento: payForm.forma_pagamento,
        valor_pago:      parseFloat(payForm.valor_pago) || form.valor,
      })
      toast.success('Marcado como pago!')
      close(); load()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Erro')
    } finally { setSaving(false) }
  }

  const handleEstornar = async (tx) => {
    try {
      await api.patch(`/api/finance/transactions/${tx.id}/estornar`)
      toast.success('Pagamento estornado')
      load()
    } catch (err) { toast.error(err.response?.data?.error || 'Erro') }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Remover este lançamento?')) return
    try {
      await api.delete(`/api/finance/transactions/${id}`)
      toast.success('Removido')
      load()
    } catch (err) { toast.error(err.response?.data?.error || 'Erro') }
  }

  const categorias = form.tipo === 'receita' ? cats.receita : cats.despesa

  // Status visual
  const statusTx = (tx) => {
    if (tx.pago) return { label: 'Pago', color: 'var(--green)' }
    if (tx.dias_atraso > 0) return { label: `${tx.dias_atraso}d atrasado`, color: 'var(--red)' }
    const diff = (new Date(tx.data_vencimento) - new Date()) / 86400000
    if (diff <= 3) return { label: 'Vence em breve', color: '#F59E0B' }
    return { label: 'Pendente', color: 'var(--muted)' }
  }

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div>
          <div className="page-title">Financeiro</div>
          <div className="page-subtitle">Receitas, despesas, fluxo de caixa e DRE</div>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <input type="month" className="input" value={mes} onChange={e => setMes(e.target.value)}
            style={{ width: 140, fontSize: 12 }} />
          {isAdmin && (
            <>
              <button className="btn" style={{ background: 'rgba(34,197,94,0.1)', color: 'var(--green)', border: '1px solid rgba(34,197,94,0.2)' }}
                onClick={() => openNew('receita')}>
                <ArrowUpRight size={14} /> Receita
              </button>
              <button className="btn btn-primary" onClick={() => openNew('despesa')}>
                <ArrowDownRight size={14} /> Despesa
              </button>
            </>
          )}
        </div>
      </div>

      {/* KPIs */}
      {summary && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px,1fr))', gap: 12, marginBottom: 20 }}>
          <KpiCard label="Receitas Realizadas" value={formatMoney(summary.receitas)} color="var(--green)" icon={TrendingUp}
            sub={`+ ${formatMoney(summary.a_receber_mes)} previsto`} />
          <KpiCard label="Despesas Realizadas" value={formatMoney(summary.despesas)} color="var(--red)" icon={TrendingDown}
            sub={`+ ${formatMoney(summary.a_pagar_mes)} previsto`} />
          <KpiCard label="Saldo Realizado" value={formatMoney(summary.saldo_realizado)}
            color={summary.saldo_realizado >= 0 ? 'var(--green)' : 'var(--red)'} icon={DollarSign}
            sub={`Previsto: ${formatMoney(summary.resultado_previsto)}`} />
          <KpiCard label="A Receber (total)" value={formatMoney(summary.a_receber)} color="var(--blue)" icon={ArrowUpRight} />
          <KpiCard label="A Pagar (total)"   value={formatMoney(summary.a_pagar)}   color="#F59E0B"    icon={ArrowDownRight} />
          {summary.vencido_pagar > 0 && (
            <KpiCard label="Contas Vencidas" value={formatMoney(summary.vencido_pagar)} color="var(--red)" icon={AlertCircle} urgent />
          )}
        </div>
      )}

      {/* Fluxo de caixa (mini chart) */}
      {fluxo.length > 0 && (
        <div className="card" style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--dim)', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
            <BarChart2 size={14} color="var(--accent)" /> Fluxo de Caixa — Últimos 6 Meses
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', height: 80 }}>
            {fluxo.map(m => <MiniBar key={m.mes} {...m} label={m.mes} />)}
          </div>
          <div style={{ display: 'flex', gap: 16, marginTop: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, color: 'var(--muted)' }}>
              <div style={{ width: 8, height: 8, background: 'var(--green)', borderRadius: 2 }} /> Receitas
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, color: 'var(--muted)' }}>
              <div style={{ width: 8, height: 8, background: 'var(--red)', borderRadius: 2 }} /> Despesas
            </div>
          </div>
        </div>
      )}

      {/* Tabs + Filtros */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', padding: '0 16px' }}>
          {[
            { id: 'todos',   label: 'Todos' },
            { id: 'receber', label: 'A Receber' },
            { id: 'pagar',   label: 'A Pagar' },
          ].map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{
              all: 'unset', cursor: 'pointer', padding: '12px 16px', fontSize: 13,
              fontWeight: tab === t.id ? 700 : 400,
              color:      tab === t.id ? 'var(--accent)' : 'var(--muted)',
              borderBottom: tab === t.id ? '2px solid var(--accent)' : '2px solid transparent',
              transition: 'all 0.15s',
            }}>
              {t.label}
            </button>
          ))}

          <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center', padding: '8px 0' }}>
            {tab === 'todos' && (
              <select className="input" value={filtroTipo} onChange={e => setFiltroTipo(e.target.value)} style={{ fontSize: 11, padding: '4px 8px', height: 30 }}>
                <option value="">Tipo</option>
                <option value="receita">Receita</option>
                <option value="despesa">Despesa</option>
              </select>
            )}
            <select className="input" value={filtroPago} onChange={e => setFiltroPago(e.target.value)} style={{ fontSize: 11, padding: '4px 8px', height: 30 }}>
              <option value="">Status</option>
              <option value="false">Pendente</option>
              <option value="true">Pago</option>
            </select>
          </div>
        </div>

        {/* Lista */}
        {loading ? (
          <div style={{ padding: '32px', textAlign: 'center' }}><div className="spinner" style={{ margin: '0 auto' }} /></div>
        ) : txs.length === 0 ? (
          <div style={{ padding: '40px 24px', textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>
            Nenhum lançamento encontrado
          </div>
        ) : (
          <div>
            {txs.map(tx => {
              const st = statusTx(tx)
              return (
                <div key={tx.id} style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '12px 16px', borderBottom: '1px solid var(--border)',
                  transition: 'background 0.1s',
                }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--bg3)'}
                  onMouseLeave={e => e.currentTarget.style.background = ''}
                >
                  {/* Tipo indicator */}
                  <div style={{
                    width: 6, height: 36, borderRadius: 3, flexShrink: 0,
                    background: tx.tipo === 'receita' ? 'var(--green)' : 'var(--red)',
                  }} />

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {tx.descricao}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>
                      {tx.categoria && <span style={{ marginRight: 8 }}>{tx.categoria}</span>}
                      {tx.beneficiario && <span style={{ marginRight: 8 }}>→ {tx.beneficiario}</span>}
                      {tx.recorrente && <span style={{ color: '#A78BFA', marginRight: 8 }}>↻ recorrente</span>}
                    </div>
                  </div>

                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontSize: 15, fontWeight: 700, fontFamily: 'Bebas Neue',
                      color: tx.tipo === 'receita' ? 'var(--green)' : 'var(--red)' }}>
                      {tx.tipo === 'receita' ? '+' : '-'}{formatMoney(tx.valor)}
                    </div>
                    <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 1 }}>
                      {formatDate(tx.data_vencimento)}
                    </div>
                  </div>

                  <div style={{
                    fontSize: 10, fontWeight: 600, color: st.color,
                    padding: '3px 8px', borderRadius: 20, background: `${st.color}18`,
                    flexShrink: 0, whiteSpace: 'nowrap',
                  }}>
                    {st.label}
                  </div>

                  {/* Ações */}
                  <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                    {!tx.pago && isAdmin && (
                      <button className="btn" style={{ padding: '4px 8px', fontSize: 11 }} onClick={() => openPay(tx)}>
                        <CheckCircle2 size={12} /> Pagar
                      </button>
                    )}
                    {tx.pago && isAdmin && (
                      <button className="btn btn-outline btn-sm" style={{ padding: '4px 8px', fontSize: 11, color: 'var(--yellow)', borderColor: 'rgba(245,158,11,0.4)' }} onClick={() => handleEstornar(tx)}>
                        ↩ Estornar
                      </button>
                    )}
                    {isAdmin && (
                      <>
                        <button className="icon-btn" onClick={() => openEdit(tx)}><Edit2 size={12} /></button>
                        <button className="icon-btn" style={{ color: 'var(--red)' }} onClick={() => handleDelete(tx.id)}><Trash2 size={12} /></button>
                      </>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Modal Novo/Editar */}
      {(modal === 'new' || modal === 'edit') && (
        <div className="modal-overlay" onClick={close}>
          <div className="modal" style={{ width: 520 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">
                {modal === 'new' ? 'Novo Lançamento' : 'Editar Lançamento'}
              </div>
              <button className="icon-btn" onClick={close}><X size={16} /></button>
            </div>

            <div style={{ display: 'flex', gap: 0, marginBottom: 20, background: 'var(--bg3)', borderRadius: 8, padding: 3 }}>
              {['receita', 'despesa'].map(t => (
                <button key={t} onClick={() => setF('tipo', t)} style={{
                  flex: 1, padding: '7px', borderRadius: 6, border: 'none', cursor: 'pointer',
                  fontFamily: 'inherit', fontSize: 12, fontWeight: 600, transition: 'all 0.15s',
                  background: form.tipo === t ? (t === 'receita' ? 'rgba(34,197,94,0.15)' : 'rgba(232,25,44,0.15)') : 'transparent',
                  color: form.tipo === t ? (t === 'receita' ? 'var(--green)' : 'var(--red)') : 'var(--muted)',
                }}>
                  {t === 'receita' ? '↑ Receita' : '↓ Despesa'}
                </button>
              ))}
            </div>

            <div className="form-grid">
              <div style={{ gridColumn: '1/-1' }}>
                <label className="label">Descrição *</label>
                <input className="input" value={form.descricao} onChange={e => setF('descricao', e.target.value)}
                  placeholder="Ex: Pagamento fornecedor ABC" />
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
              <div>
                <label className="label">Categoria</label>
                <select className="input" value={form.categoria} onChange={e => setF('categoria', e.target.value)}>
                  <option value="">Selecione</option>
                  {categorias.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Forma de Pagamento</label>
                <select className="input" value={form.forma_pagamento} onChange={e => setF('forma_pagamento', e.target.value)}>
                  <option value="">Selecione</option>
                  {cats.formas.map(f => <option key={f} value={f}>{f}</option>)}
                </select>
              </div>
              <div style={{ gridColumn: '1/-1' }}>
                <label className="label">Beneficiário / Fornecedor</label>
                <input className="input" value={form.beneficiario} onChange={e => setF('beneficiario', e.target.value)}
                  placeholder="Empresa ou pessoa que recebe/paga" />
              </div>
              <div>
                <label className="label">Centro de Custo</label>
                <input className="input" value={form.centro_custo} onChange={e => setF('centro_custo', e.target.value)}
                  placeholder="Ex: Marketing, Operações..." />
              </div>
              <div>
                <label className="label">Status</label>
                <div style={{ display: 'flex', gap: 8, paddingTop: 6 }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 12, color: 'var(--dim)' }}>
                    <input type="checkbox" checked={form.pago} onChange={e => setF('pago', e.target.checked)}
                      style={{ accentColor: 'var(--green)' }} />
                    Já pago
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 12, color: 'var(--dim)' }}>
                    <input type="checkbox" checked={form.recorrente} onChange={e => setF('recorrente', e.target.checked)}
                      style={{ accentColor: '#A78BFA' }} />
                    Recorrente (mensal)
                  </label>
                </div>
              </div>
              <div style={{ gridColumn: '1/-1' }}>
                <label className="label">Observações</label>
                <textarea className="input" rows={2} value={form.obs} onChange={e => setF('obs', e.target.value)}
                  placeholder="Notas internas..." style={{ resize: 'vertical' }} />
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

      {/* Modal Pagar */}
      {modal === 'pay' && (
        <div className="modal-overlay" onClick={close}>
          <div className="modal" style={{ width: 400 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">Registrar Pagamento</div>
              <button className="icon-btn" onClick={close}><X size={16} /></button>
            </div>
            <div style={{ padding: '0 0 16px' }}>
              <div style={{ fontSize: 13, color: 'var(--dim)', marginBottom: 16 }}>{form.descricao}</div>
              <div style={{ fontSize: 24, fontFamily: 'Bebas Neue', color: form.tipo === 'receita' ? 'var(--green)' : 'var(--red)', marginBottom: 20 }}>
                {formatMoney(form.valor)}
              </div>
              <div className="form-grid">
                <div style={{ gridColumn: '1/-1' }}>
                  <label className="label">Valor Pago</label>
                  <input className="input" type="number" min="0.01" step="0.01"
                    value={payForm.valor_pago} onChange={e => setPayForm(p => ({ ...p, valor_pago: e.target.value }))} />
                </div>
                <div style={{ gridColumn: '1/-1' }}>
                  <label className="label">Forma de Pagamento</label>
                  <select className="input" value={payForm.forma_pagamento} onChange={e => setPayForm(p => ({ ...p, forma_pagamento: e.target.value }))}>
                    {cats.formas.map(f => <option key={f} value={f}>{f}</option>)}
                  </select>
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button className="btn" onClick={close}>Cancelar</button>
              <button className="btn btn-primary" style={{ background: 'var(--green)', borderColor: 'var(--green)' }} onClick={handlePay} disabled={saving}>
                {saving ? <><RefreshCw size={12} className="spin" /> Salvando...</> : <><CheckCircle2 size={14} /> Confirmar Pagamento</>}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`.spin{animation:spin 1s linear infinite}@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}
