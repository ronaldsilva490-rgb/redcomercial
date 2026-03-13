/**
 * Sales.jsx — Vendas de Veículos v10
 * Melhorias v10:
 * - Tipo de venda: nova (cliente na loja) | antiga (alimentar histórico)
 * - Juros configuráveis: % + tipo (Price / Simples)
 * - Simulação interativa em tempo real com tabela de amortização
 * - Fluxo PIX para entrada: QR → confirmar recebimento → liberar cadastro
 * - Download contrato PDF com validação de campos obrigatórios
 */
import { useEffect, useState, useCallback, useMemo } from 'react'
import {
  Plus, Download, CheckCircle2, Clock, XCircle,
  Search, Eye, DollarSign, Car, X, QrCode,
  AlertCircle, Percent
} from 'lucide-react'
import api from '../../services/api'
import { formatMoney, formatDate } from '../../utils/format'
import useAuthStore from '../../store/authStore'
import PixModal from '../../components/ui/PixModal'
import toast from 'react-hot-toast'

const STATUS_LABEL = { em_andamento: 'Em Andamento', concluida: 'Concluída', cancelada: 'Cancelada' }
const STATUS_BADGE = { em_andamento: 'badge-blue', concluida: 'badge-green', cancelada: 'badge-red' }
const FORMAS = ['Dinheiro', 'PIX', 'Cartão Débito', 'Cartão Crédito', 'Transferência', 'Boleto']

const EMPTY = {
  tipo_venda: 'nova',
  vehicle_id: '', client_id: '',
  valor_venda: '', valor_entrada: '0',
  parcelas: '1',
  juros_percentual: '0',
  juros_tipo: 'price',
  financiamento: false, financiadora: '',
  forma_entrada: 'Dinheiro',
  data_venda: new Date().toISOString().slice(0, 10),
  obs: '',
}

function calcJuros(saldo, nParc, taxa, tipo) {
  if (saldo <= 0 || nParc <= 0) return { valorParc: 0, totalJuros: 0, totalPagar: 0 }
  const rate = taxa / 100
  if (rate === 0 || nParc === 1) {
    const vp = saldo / nParc
    return { valorParc: vp, totalJuros: 0, totalPagar: saldo }
  }
  let valorParc
  if (tipo === 'price') {
    valorParc = saldo * (rate * Math.pow(1 + rate, nParc)) / (Math.pow(1 + rate, nParc) - 1)
  } else {
    valorParc = saldo * (1 + rate * nParc) / nParc
  }
  const totalPagar = valorParc * nParc
  return { valorParc, totalJuros: totalPagar - saldo, totalPagar }
}

function buildAmortizacao(saldo, nParc, taxa, tipo) {
  const rows = []
  const rate = taxa / 100
  const { valorParc } = calcJuros(saldo, nParc, taxa, tipo)
  let saldoAtual = saldo
  for (let i = 1; i <= nParc; i++) {
    const juros = rate > 0 ? saldoAtual * rate : 0
    const amort = valorParc - juros
    saldoAtual = Math.max(0, saldoAtual - amort)
    rows.push({ n: i, parcela: valorParc, juros, amort, saldo: saldoAtual })
  }
  return rows
}

export default function Sales() {
  const { papel } = useAuthStore()
  const isAdmin = papel === 'dono' || papel === 'gerente'

  const [sales,        setSales]        = useState([])
  const [loading,      setLoading]      = useState(true)
  const [filterStatus, setFilterStatus] = useState('')
  const [search,       setSearch]       = useState('')
  const [modal,        setModal]        = useState(null)
  const [detail,       setDetail]       = useState(null)
  const [form,         setForm]         = useState(EMPTY)
  const [saving,       setSaving]       = useState(false)
  const [vehicles,     setVehicles]     = useState([])
  const [clients,      setClients]      = useState([])
  const [payModal,     setPayModal]     = useState(null)
  const [payForma,     setPayForma]     = useState('Dinheiro')
  const [pixParc,      setPixParc]      = useState(null)
  const [paying,       setPaying]       = useState(false)
  const [pixEntradaOpen, setPixEntradaOpen] = useState(false)
  const [entradaConfirmada, setEntradaConfirmada] = useState(false)
  const [showAmort,    setShowAmort]    = useState(false)

  const set = (k, v) => {
    setForm(p => ({ ...p, [k]: v }))
    if (['valor_entrada', 'forma_entrada', 'valor_venda'].includes(k)) setEntradaConfirmada(false)
  }

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = {}
      if (filterStatus) params.status = filterStatus
      const { data } = await api.get('/api/sales', { params })
      setSales(data.data || [])
    } catch (e) {
      if (e?.response?.status !== 404) toast.error("Oops! Não consegui buscar vendas. Tente novamente 😕")
    } finally { setLoading(false) }
  }, [filterStatus])

  useEffect(() => { load() }, [load])

  const openNew = async () => {
    try {
      const [vRes, cRes] = await Promise.all([api.get('/api/vehicles'), api.get('/api/clients')])
      setVehicles((vRes.data.data || []).filter(v => v.status === 'disponivel' || v.status === 'reservado'))
      setClients(cRes.data.data || [])
      setForm(EMPTY); setEntradaConfirmada(false); setShowAmort(false); setModal('new')
    } catch { toast.error("Oops! Não consegui buscar dados. Tente novamente 😕") }
  }

  const openDetail = async (id) => {
    try {
      const { data } = await api.get('/api/sales/' + id)
      setDetail(data.data); setModal('detail')
    } catch { toast.error("Oops! Não consegui buscar venda. Tente novamente 😕") }
  }

  const refreshDetail = async () => {
    if (!detail) return
    const { data } = await api.get('/api/sales/' + detail.id)
    setDetail(data.data); load()
  }

  const close = () => { setModal(null); setDetail(null); setForm(EMPTY); setEntradaConfirmada(false); setShowAmort(false) }

  const venda   = parseFloat(form.valor_venda)    || 0
  const entrada = parseFloat(form.valor_entrada)  || 0
  const saldo   = Math.max(0, venda - entrada)
  const nParc   = parseInt(form.parcelas)          || 1
  const taxa    = parseFloat(form.juros_percentual) || 0
  const { valorParc, totalJuros, totalPagar } = useMemo(
    () => calcJuros(saldo, nParc, taxa, form.juros_tipo),
    [saldo, nParc, taxa, form.juros_tipo]
  )
  const amortRows = useMemo(
    () => showAmort && nParc > 1 ? buildAmortizacao(saldo, nParc, taxa, form.juros_tipo) : [],
    [showAmort, saldo, nParc, taxa, form.juros_tipo]
  )

  const precisaConfirmarPix = form.tipo_venda === 'nova' && form.forma_entrada === 'PIX' && entrada > 0 && !entradaConfirmada

  const handleSave = async () => {
    if (!form.vehicle_id) return toast.error('Selecione um veículo')
    if (!form.client_id)  return toast.error('Para quem é essa venda? Selecione um cliente da lista! 🧑‍💼')
    if (!venda || venda <= 0) return toast.error('Informe o valor de venda')
    if (entrada > venda)      return toast.error('Entrada não pode ser maior que o valor')
    if (precisaConfirmarPix)  return toast.error('Confirme o recebimento da entrada via PIX antes de continuar')
    setSaving(true)
    try {
      await api.post('/api/sales', {
        ...form, valor_venda: venda, valor_entrada: entrada,
        parcelas: nParc, juros_percentual: taxa,
      })
      toast.success('Venda concluída! Dinheiro no bolso 💰')
      close(); load()
    } catch (e) {
      toast.error(e.response?.data?.error || 'Erro ao salvar')
    } finally { setSaving(false) }
  }

  const handleDownload = async (saleId) => {
    try {
      toast.loading('Gerando contrato...', { id: 'pdf' })
      const resp = await api.get('/api/sales/' + saleId + '/contrato', { responseType: 'blob' })
      const contentType = resp.headers?.['content-type'] || ''
      if (contentType.includes('application/json')) {
        const text = await resp.data.text()
        const json = JSON.parse(text)
        toast.error(json.error || 'Erro ao gerar contrato', { id: 'pdf' }); return
      }
      const url = URL.createObjectURL(resp.data)
      const a = document.createElement('a')
      a.href = url; a.download = 'contrato_' + saleId.slice(0, 8) + '.pdf'; a.click()
      URL.revokeObjectURL(url)
      toast.success('Contrato gerado!', { id: 'pdf' })
    } catch (e) {
      try {
        const text = await e.response?.data?.text?.()
        const json = JSON.parse(text || '{}')
        toast.error(json.error || 'Erro ao gerar contrato', { id: 'pdf' })
      } catch { toast.error('Erro ao gerar contrato', { id: 'pdf' }) }
    }
  }

  const handleCancel = async (id) => {
    if (!window.confirm('Cancelar esta venda? O veículo voltará para disponível.')) return
    try {
      await api.patch('/api/sales/' + id + '/status', { status: 'cancelada' })
      toast.success('Venda desfeita! Acontece nas melhores famílias 🔄'); close(); load()
    } catch { toast.error('Erro ao cancelar') }
  }

  const handlePagarParcela = async (forma) => {
    if (!payModal) return
    if (forma === 'PIX') { setPixParc(payModal); return }
    setPaying(true)
    try {
      await api.patch('/api/sales/parcelas/' + payModal.id + '/pagar', { forma_pagamento: forma })
      toast.success('Parcela paga!'); setPayModal(null); await refreshDetail()
    } catch (e) { toast.error(e.response?.data?.error || 'Erro ao pagar') }
    finally { setPaying(false) }
  }

  const handleConfirmPix = async () => {
    if (!pixParc) return
    setPaying(true)
    try {
      await api.patch('/api/sales/parcelas/' + pixParc.id + '/pagar', { forma_pagamento: 'PIX' })
      toast.success('Parcela paga via PIX!'); setPixParc(null); setPayModal(null); await refreshDetail()
    } catch { toast.error('Erro ao confirmar PIX') }
    finally { setPaying(false) }
  }

  const filtered = sales.filter(s => {
    if (!search) return true
    const veh = s.vehicles || {}; const cli = s.clients || {}
    return (veh.marca + ' ' + veh.modelo + ' ' + (veh.placa || '') + ' ' + cli.nome).toLowerCase().includes(search.toLowerCase())
  })

  const parcelas = detail?.parcelas || []
  const pagas    = parcelas.filter(p => p.pago).length
  const vencidas = parcelas.filter(p => !p.pago && p.data_vencimento < new Date().toISOString().slice(0, 10)).length

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Vendas</div>
          <div className="page-subtitle">{sales.length} venda(s) registrada(s)</div>
        </div>
        <button className="btn btn-primary" onClick={openNew}><Plus size={14} /> Nova Venda</button>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 220 }}>
          <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)', pointerEvents: 'none' }} />
          <input className="input" style={{ paddingLeft: 38 }} placeholder="Buscar por veículo, placa ou cliente..."
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        {[['', 'Todas'], ['em_andamento', 'Em Andamento'], ['concluida', 'Concluídas'], ['cancelada', 'Canceladas']].map(([v, l]) => (
          <button key={v} className={'btn btn-sm ' + (filterStatus === v ? 'btn-primary' : 'btn-outline')}
            onClick={() => setFilterStatus(v)}>{l}</button>
        ))}
      </div>

      {loading ? (
        <div className="loading-page"><div className="spinner" /> Carregando...</div>
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          <Car size={48} /><h3>Nenhuma venda encontrada</h3>
          <p>Registre a primeira venda de veículo</p>
          <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={openNew}><Plus size={14} /> Nova Venda</button>
        </div>
      ) : (
        <div className="section-card">
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>Veículo</th><th>Cliente</th><th>Valor</th><th>Entrada</th><th>Parcelas</th><th>Status</th><th>Data</th><th style={{ width: 90 }}>Ações</th></tr>
              </thead>
              <tbody>
                {filtered.map(s => {
                  const veh = s.vehicles || {}; const cli = s.clients || {}
                  const vf = s.valor_venda - s.valor_entrada
                  const jp = parseFloat(s.juros_percentual || 0)
                  const { valorParc: vp } = calcJuros(vf, s.parcelas, jp, s.juros_tipo || 'price')
                  return (
                    <tr key={s.id}>
                      <td>
                        <strong>{veh.marca} {veh.modelo}</strong>
                        <div style={{ fontSize: 11, color: 'var(--muted)' }}>{veh.placa || '—'} · {veh.ano_fab || '?'}</div>
                      </td>
                      <td>
                        <strong>{cli.nome || '—'}</strong>
                        {cli.telefone && <div style={{ fontSize: 11, color: 'var(--muted)' }}>{cli.telefone}</div>}
                      </td>
                      <td><strong>{formatMoney(s.valor_venda)}</strong></td>
                      <td>{formatMoney(s.valor_entrada)}</td>
                      <td style={{ fontSize: 12 }}>
                        {s.parcelas > 1 ? s.parcelas + 'x ' + formatMoney(vp) : 'À vista'}
                        {jp > 0 && <div style={{ fontSize: 10, color: '#F59E0B' }}>⚡ {jp}% a.m.</div>}
                        {s.financiamento && <div style={{ fontSize: 10, color: 'var(--blue)' }}>🏦 {s.financiadora || 'Financiado'}</div>}
                      </td>
                      <td><span className={'badge ' + STATUS_BADGE[s.status]}>{STATUS_LABEL[s.status]}</span></td>
                      <td style={{ fontSize: 11, color: 'var(--muted)' }}>{formatDate((s.data_venda || s.created_at || '').slice(0, 10))}</td>
                      <td>
                        <div style={{ display: 'flex', gap: 4 }}>
                          <button className="btn btn-ghost btn-icon btn-sm" onClick={() => openDetail(s.id)} title="Ver detalhes"><Eye size={13} /></button>
                          <button className="btn btn-ghost btn-icon btn-sm" onClick={() => handleDownload(s.id)} title="Contrato PDF"><Download size={13} /></button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ══ Modal Nova Venda ══ */}
      {modal === 'new' && (
        <div className="modal-overlay" onClick={close}>
          <div className="modal" style={{ maxWidth: 700 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">Nova Venda de Veículo</span>
              <button className="modal-close" onClick={close}>✕</button>
            </div>
            <div className="modal-body" style={{ maxHeight: '82vh', overflowY: 'auto' }}>

              {/* Tipo da venda */}
              <div style={{ marginBottom: 18 }}>
                <label className="label" style={{ marginBottom: 8, display: 'block' }}>Tipo de Registro</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  {[
                    { v: 'nova',   label: '🟢 Venda Nova',   sub: 'Cliente está na loja agora' },
                    { v: 'antiga', label: '📂 Venda Antiga',  sub: 'Alimentar histórico / retroativo' },
                  ].map(({ v, label, sub }) => (
                    <button key={v} onClick={() => set('tipo_venda', v)} style={{
                      flex: 1, padding: '10px 14px', borderRadius: 10, cursor: 'pointer',
                      border: '2px solid ' + (form.tipo_venda === v ? 'var(--red)' : 'var(--border)'),
                      background: form.tipo_venda === v ? 'var(--red-glow)' : 'var(--bg3)',
                      textAlign: 'left', fontFamily: 'inherit',
                    }}>
                      <div style={{ fontWeight: 700, fontSize: 13, color: form.tipo_venda === v ? 'var(--red)' : 'var(--dim)' }}>{label}</div>
                      <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>{sub}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="form-grid">
                <div style={{ gridColumn: '1/-1' }}>
                  <label className="label">Veículo *</label>
                  <select className="input" value={form.vehicle_id} onChange={e => {
                    const v = vehicles.find(x => x.id === e.target.value)
                    set('vehicle_id', e.target.value)
                    if (v && !form.valor_venda) set('valor_venda', v.preco || '')
                  }}>
                    <option value="">Selecione o veículo...</option>
                    {vehicles.map(v => (
                      <option key={v.id} value={v.id}>
                        {v.marca} {v.modelo} {v.ano_fab ? '(' + v.ano_fab + ')' : ''}{v.placa ? ' — ' + v.placa : ''} — {formatMoney(v.preco)}
                      </option>
                    ))}
                  </select>
                </div>
                <div style={{ gridColumn: '1/-1' }}>
                  <label className="label">Cliente *</label>
                  <select className="input" value={form.client_id} onChange={e => set('client_id', e.target.value)}>
                    <option value="">Selecione o cliente...</option>
                    {clients.map(c => <option key={c.id} value={c.id}>{c.nome}{c.cpf_cnpj ? ' — ' + c.cpf_cnpj : ''}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Data da Venda</label>
                  <input className="input" type="date" value={form.data_venda} onChange={e => set('data_venda', e.target.value)} />
                </div>
                <div>
                  <label className="label">Valor de Venda (R$) *</label>
                  <input className="input" type="number" step="0.01" min="0" placeholder="45000"
                    value={form.valor_venda} onChange={e => set('valor_venda', e.target.value)} />
                </div>
                <div>
                  <label className="label">Valor de Entrada (R$)</label>
                  <input className="input" type="number" step="0.01" min="0" placeholder="0"
                    value={form.valor_entrada} onChange={e => set('valor_entrada', e.target.value)} />
                </div>
                <div>
                  <label className="label">Forma da Entrada</label>
                  <select className="input" value={form.forma_entrada} onChange={e => set('forma_entrada', e.target.value)}>
                    {FORMAS.map(f => <option key={f} value={f}>{f}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Número de Parcelas</label>
                  <select className="input" value={form.parcelas} onChange={e => set('parcelas', e.target.value)}>
                    <option value="1">À vista (sem parcelas)</option>
                    {[2,3,4,5,6,7,8,9,10,11,12,18,24,36,48,60].map(n => (
                      <option key={n} value={n}>{n}x</option>
                    ))}
                  </select>
                </div>
                {nParc > 1 && (
                  <>
                    <div>
                      <label className="label"><Percent size={11} style={{ marginRight: 4, verticalAlign: 'middle' }} />Juros (% ao mês)</label>
                      <input className="input" type="number" step="0.01" min="0" max="30" placeholder="Ex: 1.99"
                        value={form.juros_percentual} onChange={e => set('juros_percentual', e.target.value)} />
                    </div>
                    <div>
                      <label className="label">Sistema de Amortização</label>
                      <select className="input" value={form.juros_tipo} onChange={e => set('juros_tipo', e.target.value)}>
                        <option value="price">Tabela Price (juros compostos)</option>
                        <option value="simples">Juros Simples</option>
                      </select>
                    </div>
                  </>
                )}
                <div>
                  <label className="label">Financiamento Bancário?</label>
                  <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                    {[false, true].map(v => (
                      <button key={String(v)} onClick={() => set('financiamento', v)}
                        className={'btn btn-sm ' + (form.financiamento === v ? 'btn-primary' : 'btn-outline')}>
                        {v ? 'Sim' : 'Não (Carnê)'}
                      </button>
                    ))}
                  </div>
                </div>
                {form.financiamento && (
                  <div>
                    <label className="label">Financiadora / Banco</label>
                    <input className="input" placeholder="Banco do Brasil, CEF, BV..."
                      value={form.financiadora} onChange={e => set('financiadora', e.target.value)} />
                  </div>
                )}
                <div style={{ gridColumn: '1/-1' }}>
                  <label className="label">Observações</label>
                  <textarea className="input" rows={2} placeholder="Anotações sobre a venda..."
                    value={form.obs} onChange={e => set('obs', e.target.value)} />
                </div>
              </div>

              {/* Simulação */}
              {venda > 0 && (
                <div style={{ background: 'var(--bg4)', border: '1px solid var(--border)', borderRadius: 12, padding: 16, marginTop: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                    <span style={{ fontSize: 10, color: 'var(--muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1 }}>
                      📊 Simulação de Pagamento
                    </span>
                    {nParc > 1 && saldo > 0 && (
                      <button style={{ fontSize: 11, color: 'var(--red)', background: 'none', border: 'none', cursor: 'pointer' }}
                        onClick={() => setShowAmort(s => !s)}>
                        {showAmort ? 'Ocultar tabela' : 'Ver tabela de parcelas'}
                      </button>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', marginBottom: taxa > 0 && nParc > 1 ? 10 : 0 }}>
                    {[
                      ['Valor total', formatMoney(venda), 'var(--text)'],
                      ['Entrada', formatMoney(entrada), 'var(--green)'],
                      ['Saldo', formatMoney(saldo), saldo > 0 ? '#F59E0B' : 'var(--muted)'],
                      ...(nParc > 1 && saldo > 0 ? [[nParc + 'x de', formatMoney(valorParc), 'var(--text)']] : []),
                    ].map(([l, v, c]) => (
                      <div key={l}>
                        <span style={{ fontSize: 10, color: 'var(--muted)' }}>{l}</span><br />
                        <strong style={{ fontSize: 16, fontFamily: 'Bebas Neue', letterSpacing: 1, color: c }}>{v}</strong>
                      </div>
                    ))}
                  </div>
                  {taxa > 0 && nParc > 1 && saldo > 0 && (
                    <div style={{ borderTop: '1px solid var(--border)', paddingTop: 10, display: 'flex', gap: 20, flexWrap: 'wrap' }}>
                      <div>
                        <span style={{ fontSize: 10, color: 'var(--muted)' }}>Total de juros</span><br />
                        <strong style={{ fontSize: 15, color: '#EF4444', fontFamily: 'Bebas Neue', letterSpacing: 1 }}>+ {formatMoney(totalJuros)}</strong>
                      </div>
                      <div>
                        <span style={{ fontSize: 10, color: 'var(--muted)' }}>Total a pagar (c/ entrada + juros)</span><br />
                        <strong style={{ fontSize: 15, color: 'var(--red)', fontFamily: 'Bebas Neue', letterSpacing: 1 }}>{formatMoney(totalPagar + entrada)}</strong>
                      </div>
                      <div>
                        <span style={{ fontSize: 10, color: 'var(--muted)' }}>Custo — {form.juros_tipo === 'price' ? 'Price' : 'Simples'}</span><br />
                        <strong style={{ fontSize: 15, color: '#F59E0B', fontFamily: 'Bebas Neue', letterSpacing: 1 }}>{taxa}% a.m.</strong>
                      </div>
                    </div>
                  )}
                  {showAmort && amortRows.length > 0 && (
                    <div style={{ marginTop: 12, maxHeight: 190, overflowY: 'auto', borderRadius: 8, border: '1px solid var(--border)' }}>
                      <table style={{ width: '100%', fontSize: 11, borderCollapse: 'collapse' }}>
                        <thead>
                          <tr style={{ background: 'var(--bg3)', position: 'sticky', top: 0 }}>
                            {['#', 'Parcela', 'Juros', 'Amortização', 'Saldo'].map(h => (
                              <th key={h} style={{ padding: '5px 8px', textAlign: h === '#' ? 'center' : 'right', color: 'var(--dim)', fontSize: 10, fontWeight: 700 }}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {amortRows.map(r => (
                            <tr key={r.n} style={{ borderTop: '1px solid var(--border)' }}>
                              <td style={{ padding: '4px 8px', textAlign: 'center', color: 'var(--muted)' }}>{r.n}</td>
                              <td style={{ padding: '4px 8px', textAlign: 'right', fontWeight: 600 }}>{formatMoney(r.parcela)}</td>
                              <td style={{ padding: '4px 8px', textAlign: 'right', color: '#EF4444' }}>{formatMoney(r.juros)}</td>
                              <td style={{ padding: '4px 8px', textAlign: 'right', color: 'var(--green)' }}>{formatMoney(r.amort)}</td>
                              <td style={{ padding: '4px 8px', textAlign: 'right', color: 'var(--muted)' }}>{formatMoney(r.saldo)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* Fluxo PIX entrada — venda nova */}
              {form.tipo_venda === 'nova' && entrada > 0 && form.forma_entrada === 'PIX' && (
                <div style={{ marginTop: 14 }}>
                  {entradaConfirmada ? (
                    <div style={{
                      background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)',
                      borderRadius: 10, padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 10,
                    }}>
                      <CheckCircle2 size={18} color="var(--green)" />
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--green)' }}>Entrada PIX confirmada!</div>
                        <div style={{ fontSize: 11, color: 'var(--muted)' }}>{formatMoney(entrada)} recebido via PIX</div>
                      </div>
                      <button style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--muted)', background: 'none', border: 'none', cursor: 'pointer' }}
                        onClick={() => setEntradaConfirmada(false)}>Cancelar</button>
                    </div>
                  ) : (
                    <div style={{ background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.25)', borderRadius: 10, padding: '12px 16px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 700 }}>
                            <QrCode size={14} style={{ marginRight: 6, verticalAlign: 'middle' }} />Receber entrada via PIX
                          </div>
                          <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>
                            Gere o QR Code de {formatMoney(entrada)} e confirme o recebimento
                          </div>
                        </div>
                        <button className="btn btn-primary btn-sm" onClick={() => setPixEntradaOpen(true)}>
                          <QrCode size={12} /> Gerar QR Code
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button className="btn btn-outline" onClick={close}>Cancelar</button>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving || precisaConfirmarPix}
                style={{ opacity: precisaConfirmarPix ? 0.6 : 1 }}>
                {saving
                  ? <><div className="spinner" style={{ width: 14, height: 14 }} /> Salvando...</>
                  : precisaConfirmarPix
                    ? <><AlertCircle size={13} /> Aguardando PIX da entrada...</>
                    : '💾 Registrar Venda'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PIX entrada */}
      {pixEntradaOpen && (
        <PixModal
          amount={entrada}
          txid={'entrada-' + Date.now().toString(36)}
          description={'Entrada — ' + (vehicles.find(v => v.id === form.vehicle_id)?.modelo || 'Veículo')}
          onClose={() => setPixEntradaOpen(false)}
          onConfirm={() => { setEntradaConfirmada(true); setPixEntradaOpen(false); toast.success('Entrada confirmada! Pode registrar a venda.') }}
          confirming={false}
        />
      )}

      {/* ══ Modal Detalhe ══ */}
      {modal === 'detail' && detail && (
        <div className="modal-overlay" onClick={close}>
          <div className="modal" style={{ maxWidth: 700 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <span className="modal-title">{detail.vehicles?.marca} {detail.vehicles?.modelo}</span>
                <div style={{ display: 'flex', gap: 8, marginTop: 4, alignItems: 'center' }}>
                  <span className={'badge ' + STATUS_BADGE[detail.status]}>{STATUS_LABEL[detail.status]}</span>
                  <span style={{ fontSize: 11, color: 'var(--muted)' }}>{detail.clients?.nome}</span>
                  <span style={{ fontSize: 11, color: 'var(--muted)' }}>{formatDate((detail.data_venda || detail.created_at || '').slice(0, 10))}</span>
                  {detail.tipo_venda === 'antiga' && <span style={{ fontSize: 10, color: 'var(--muted)', background: 'var(--bg4)', borderRadius: 4, padding: '1px 6px' }}>📂 Retroativo</span>}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <button className="btn btn-outline btn-sm" onClick={() => handleDownload(detail.id)}><Download size={13} /> Contrato PDF</button>
                <button className="modal-close" onClick={close}>✕</button>
              </div>
            </div>
            <div className="modal-body">
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(130px,1fr))', gap: 10, marginBottom: 20 }}>
                {[
                  ['Valor Total', formatMoney(detail.valor_venda), 'var(--text)'],
                  ['Entrada', formatMoney(detail.valor_entrada), 'var(--green)'],
                  ['Financiado', formatMoney(detail.valor_venda - detail.valor_entrada), '#F59E0B'],
                  ['Parcelas', detail.parcelas > 1 ? detail.parcelas + 'x' : 'À vista', 'var(--text)'],
                  ...(parseFloat(detail.juros_percentual || 0) > 0 ? [['Juros a.m.', detail.juros_percentual + '%', '#EF4444']] : []),
                ].map(([l, v, c]) => (
                  <div key={l} style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 14px' }}>
                    <div style={{ fontSize: 10, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 1 }}>{l}</div>
                    <div style={{ fontSize: 18, fontFamily: 'Bebas Neue', letterSpacing: 1, color: c, marginTop: 2 }}>{v}</div>
                  </div>
                ))}
              </div>

              {parcelas.length > 0 && (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: 'var(--dim)' }}>Carnê / Parcelas</span>
                    <span style={{ fontSize: 11, color: 'var(--muted)' }}>
                      {pagas}/{parcelas.length} pagas
                      {vencidas > 0 && <span style={{ color: 'var(--red)', marginLeft: 8 }}>⚠ {vencidas} vencida(s)</span>}
                    </span>
                  </div>
                  <div style={{ height: 6, background: 'var(--bg4)', borderRadius: 4, marginBottom: 12, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: (parcelas.length > 0 ? (pagas / parcelas.length) * 100 : 0) + '%', background: 'var(--green)', borderRadius: 4, transition: 'width 0.4s' }} />
                  </div>
                  <div className="section-card" style={{ marginBottom: 12 }}>
                    <div className="table-wrap">
                      <table>
                        <thead><tr><th>#</th><th>Vencimento</th><th>Valor</th><th>Situação</th><th>Pago em</th><th style={{ width: 90 }}>Ação</th></tr></thead>
                        <tbody>
                          {parcelas.map((p, i) => {
                            const venc = !p.pago && p.data_vencimento < new Date().toISOString().slice(0, 10)
                            return (
                              <tr key={p.id} style={{ opacity: p.pago ? 0.65 : 1 }}>
                                <td style={{ fontFamily: 'DM Mono', fontSize: 11 }}>{i + 1}</td>
                                <td style={{ color: venc ? 'var(--red)' : 'inherit', fontWeight: venc ? 700 : 400 }}>
                                  {formatDate(p.data_vencimento)}{venc && <span style={{ fontSize: 9, marginLeft: 4, color: 'var(--red)' }}>VENCIDA</span>}
                                </td>
                                <td><strong>{formatMoney(p.valor)}</strong></td>
                                <td>
                                  {p.pago ? <span className="badge badge-green"><CheckCircle2 size={10} style={{ marginRight: 3 }} />Paga</span>
                                    : venc ? <span className="badge badge-red"><XCircle size={10} style={{ marginRight: 3 }} />Vencida</span>
                                      : <span className="badge badge-yellow"><Clock size={10} style={{ marginRight: 3 }} />Pendente</span>}
                                </td>
                                <td style={{ fontSize: 11, color: 'var(--muted)' }}>
                                  {p.data_pagamento ? formatDate(p.data_pagamento) : '—'}
                                  {p.forma_pagamento && <div style={{ fontSize: 10 }}>{p.forma_pagamento}</div>}
                                </td>
                                <td>{!p.pago && <button className="btn btn-primary btn-sm" onClick={() => { setPayModal(p); setPayForma('Dinheiro') }}><DollarSign size={11} /> Pagar</button>}</td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              )}

              {detail.vehicles && (
                <div style={{ fontSize: 12, color: 'var(--dim)', background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 10, padding: '8px 14px' }}>
                  {detail.vehicles.marca} {detail.vehicles.modelo} · {detail.vehicles.ano_fab || '?'}{detail.vehicles.ano_mod ? '/' + detail.vehicles.ano_mod : ''} · {detail.vehicles.cor || '—'} · {detail.vehicles.placa || 'sem placa'}
                </div>
              )}
              {detail.obs && <div style={{ marginTop: 8, fontSize: 12, color: 'var(--muted)', background: 'var(--bg4)', borderRadius: 8, padding: '8px 12px' }}><strong style={{ color: 'var(--dim)' }}>Obs:</strong> {detail.obs}</div>}
            </div>
            {detail.status === 'em_andamento' && isAdmin && (
              <div className="modal-footer">
                <button className="btn btn-danger" onClick={() => handleCancel(detail.id)}><XCircle size={13} /> Cancelar Venda</button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ══ Modal Pagar Parcela ══ */}
      {payModal && !pixParc && (
        <div className="modal-overlay" onClick={() => setPayModal(null)}>
          <div className="modal" style={{ maxWidth: 380 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">Pagar Parcela — {formatMoney(payModal.valor)}</span>
              <button className="modal-close" onClick={() => setPayModal(null)}>✕</button>
            </div>
            <div className="modal-body">
              <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 14 }}>Vencimento: {formatDate(payModal.data_vencimento)}</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {FORMAS.map(f => (
                  <button key={f} onClick={() => setPayForma(f)} style={{
                    padding: '10px 12px', borderRadius: 10, fontSize: 12, fontWeight: 600,
                    border: '1px solid', cursor: 'pointer', fontFamily: 'inherit',
                    background: payForma === f ? 'var(--red)' : 'var(--bg3)',
                    borderColor: payForma === f ? 'var(--red)' : 'var(--border)',
                    color: payForma === f ? '#fff' : 'var(--dim)',
                  }}>{f === 'PIX' ? '⚡ PIX' : f}</button>
                ))}
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setPayModal(null)}>Cancelar</button>
              <button className="btn btn-primary" onClick={() => handlePagarParcela(payForma)} disabled={paying}>
                {paying ? <><div className="spinner" style={{ width: 14, height: 14 }} /> Pagando...</> : 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {pixParc && (
        <PixModal amount={pixParc.valor} txid={pixParc.id?.slice(0, 8)} description={pixParc.descricao || 'Parcela'}
          onClose={() => setPixParc(null)} onConfirm={handleConfirmPix} confirming={paying} />
      )}
    </div>
  )
}
