/**
 * Dashboard.jsx v3.0 — Personalizável por tenant, adapta por tipo de negócio
 * Concessionária: veículos, vendas, parcelas, financeiro
 * Restaurante: mesas, pedidos, cozinha, financeiro
 * Comércio: pedidos, produtos, estoque, financeiro
 */
import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ShoppingCart, AlertCircle, Package, DollarSign, Car, Users, Wrench,
  Receipt, TrendingUp, TrendingDown, BarChart2, ChefHat, Bike,
  LayoutGrid, Clock, CheckCircle, ArrowUpRight,
} from 'lucide-react'
import useAuthStore from '../store/authStore'
import useThemeStore from '../store/themeStore'
import { formatMoney } from '../utils/format'
import api from '../services/api'

// Papéis com rota própria (redirecionam automaticamente)
const PAPEL_HOME = {
  garcom:     '/garcom',
  cozinheiro: '/cozinha',
  entregador: '/entregas',
  mecanico:   '/workshop',
}

function KpiCard({ icon: Icon, label, value, color, bg, sub, link, onClick }) {
  return (
    <div
      className="card"
      onClick={onClick}
      style={{
        display: 'flex', gap: 14, alignItems: 'center',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'transform 0.15s, border-color 0.15s',
        userSelect: 'none',
      }}
      onMouseEnter={e => { if (onClick) { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.borderColor = color + '60' } }}
      onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.borderColor = '' }}
    >
      <div style={{ width: 52, height: 52, borderRadius: 14, background: bg || `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <Icon size={24} color={color} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 10, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 0.8, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{label}</div>
        <div style={{ fontSize: 28, fontWeight: 900, fontFamily: 'Bebas Neue', color, letterSpacing: 1, marginTop: 2, lineHeight: 1 }}>
          {value ?? <span style={{ opacity: 0.4 }}>—</span>}
        </div>
        {sub && <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 3 }}>{sub}</div>}
      </div>
    </div>
  )
}

function AlertBadge({ count, label, color }) {
  if (!count) return null
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8,
      padding: '10px 16px', borderRadius: 10,
      background: `${color}10`, border: `1px solid ${color}30`,
    }}>
      <AlertCircle size={16} color={color} />
      <span style={{ fontSize: 13, color, fontWeight: 600 }}>
        {count} {label}
      </span>
    </div>
  )
}

export default function Dashboard() {
  const { papel, tenant, refreshTenant } = useAuthStore()
  const navigate = useNavigate()
  const tipo     = tenant?.tipo || 'comercio'
  const [stats,  setStats]  = useState(null)
  const [loading,setLoading]= useState(true)

  // Redireciona papéis especializados
  useEffect(() => {
    const home = PAPEL_HOME[papel]
    if (home) navigate(home, { replace: true })
  }, [papel, navigate])

  const loadStats = useCallback(async () => {
    if (!['dono', 'gerente', 'vendedor', 'caixa'].includes(papel)) return
    setLoading(true)
    try {
      const finP = api.get('/api/finance/summary').catch(() => ({ data: { data: {} } }))

      if (tipo === 'concessionaria') {
        const [vRes, cRes, sRes, finRes] = await Promise.all([
          api.get('/api/vehicles').catch(() => ({ data: { data: [] } })),
          api.get('/api/clients').catch(() => ({ data: { data: [] } })),
          api.get('/api/sales').catch(() => ({ data: { data: [] } })),
          finP,
        ])
        const veiculos    = vRes.data.data || []
        const disponiveis = veiculos.filter(v => v.status === 'disponivel').length
        const reservados  = veiculos.filter(v => v.status === 'reservado').length
        const vendidos    = veiculos.filter(v => v.status === 'vendido').length
        const clientes    = (cRes.data.data || []).length
        const vendas      = (sRes.data.data || [])
        const emAndamento = vendas.filter(s => s.status === 'em_andamento').length
        const fin         = finRes.data.data || {}
        setStats({
          tipo: 'concessionaria',
          disponiveis, reservados, vendidos, clientes, emAndamento,
          a_receber:     fin.a_receber     || 0,
          vencido_pagar: fin.vencido_pagar || 0,
          saldo:         fin.saldo_realizado || 0,
          estoque_valor: veiculos.filter(v => v.status === 'disponivel')
            .reduce((s, v) => s + parseFloat(v.preco || 0), 0),
        })
      } else {
        const [r1, r2, r3, r4, finRes] = await Promise.all([
          api.get('/api/orders', { params: { status: 'aberto'    } }).catch(() => ({ data: { data: [] } })),
          api.get('/api/orders', { params: { status: 'em_preparo'} }).catch(() => ({ data: { data: [] } })),
          api.get('/api/orders', { params: { status: 'pronto'    } }).catch(() => ({ data: { data: [] } })),
          api.get('/api/orders', { params: { status: 'fechado'   } }).catch(() => ({ data: { data: [] } })),
          finP,
        ])
        const fechados    = r4.data.data || []
        const faturamento = fechados.reduce((s, o) => s + parseFloat(o.total || 0), 0)
        const fin         = finRes.data.data || {}
        setStats({
          tipo: 'rest_comercio',
          abertos:   (r1.data.data || []).length,
          preparo:   (r2.data.data || []).length,
          prontos:   (r3.data.data || []).length,
          fechados:  fechados.length,
          faturamento,
          a_receber:     fin.a_receber     || 0,
          vencido_pagar: fin.vencido_pagar || 0,
          saldo:         fin.saldo_realizado || 0,
        })
      }
    } catch (e) {
      console.error(e)
    } finally { setLoading(false) }
  }, [papel, tipo])

  useEffect(() => { loadStats() }, [loadStats])

  if (PAPEL_HOME[papel]) {
    return <div className="loading-page"><div className="spinner" /> Redirecionando...</div>
  }

  const kpis = () => {
    if (!stats) return []
    if (stats.tipo === 'concessionaria') return [
      { icon: Car,       label: 'Disponíveis',    value: stats.disponiveis,  color: 'var(--blue)',    link: '/vehicles', onClick: () => navigate('/vehicles') },
      { icon: Car,       label: 'Reservados',     value: stats.reservados,   color: '#F59E0B',        link: '/vehicles' },
      { icon: Receipt,   label: 'Vendas em curso',value: stats.emAndamento,  color: 'var(--accent)',  link: '/sales',    onClick: () => navigate('/sales') },
      { icon: Users,     label: 'Clientes',       value: stats.clientes,     color: '#A78BFA',        link: '/clients',  onClick: () => navigate('/clients') },
      { icon: TrendingUp,label: 'A Receber',      value: formatMoney(stats.a_receber),  color: 'var(--green)', sub: 'parcelas pendentes' },
      { icon: DollarSign,label: 'Saldo do Mês',   value: formatMoney(stats.saldo),     color: stats.saldo >= 0 ? 'var(--green)' : 'var(--red)' },
      { icon: TrendingUp,label: 'Estoque Valor',  value: formatMoney(stats.estoque_valor), color: '#06B6D4', sub: `${stats.disponiveis} veículos` },
      { icon: Car,       label: 'Vendidos',       value: stats.vendidos,     color: 'var(--muted)',   link: '/vehicles' },
    ]

    return [
      { icon: ShoppingCart,  label: 'Pedidos Abertos', value: stats.abertos,  color: 'var(--blue)',   onClick: () => navigate('/orders') },
      { icon: ChefHat,       label: 'Em Preparo',      value: stats.preparo,  color: '#F97316',       onClick: () => navigate('/cozinha') },
      { icon: CheckCircle,   label: 'Prontos',         value: stats.prontos,  color: '#A78BFA',       onClick: () => navigate('/caixa') },
      { icon: Package,       label: 'Fechados Hoje',   value: stats.fechados, color: 'var(--green)',  onClick: () => navigate('/orders') },
      { icon: DollarSign,    label: 'Faturamento Hoje',value: formatMoney(stats.faturamento), color: 'var(--green)', sub: 'pedidos fechados' },
      { icon: TrendingUp,    label: 'A Receber',       value: formatMoney(stats.a_receber), color: 'var(--blue)' },
      { icon: DollarSign,    label: 'Saldo do Mês',    value: formatMoney(stats.saldo), color: stats.saldo >= 0 ? 'var(--green)' : 'var(--red)' },
    ]
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Dashboard</div>
          <div className="page-subtitle">
            {tenant?.nome || 'RED Comercial'} · {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
          </div>
        </div>
      </div>

      {/* Alertas urgentes */}
      {stats?.vencido_pagar > 0 && (
        <div style={{ marginBottom: 16 }}>
          <AlertBadge count={1} label={`em contas vencidas: ${formatMoney(stats.vencido_pagar)}`} color="var(--red)" />
        </div>
      )}

      {loading ? (
        <div className="card" style={{ textAlign: 'center', padding: '48px 24px' }}>
          <div className="spinner" style={{ margin: '0 auto 16px' }} />
          <div style={{ fontSize: 13, color: 'var(--muted)' }}>Carregando indicadores...</div>
        </div>
      ) : (
        <div className="kpi-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 14 }}>
          {kpis().map((k, i) => (
            <KpiCard key={i} {...k} />
          ))}
        </div>
      )}
    </div>
  )
}
