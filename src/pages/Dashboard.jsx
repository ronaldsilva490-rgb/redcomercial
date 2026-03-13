/**
 * Dashboard.jsx v4.0 — Ultimate Dashboards (SaaS Tiers)
 * Motor adaptativo que agrupa as 13 verticais de negócio em 7 Arquétipos Operacionais.
 */
import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ShoppingCart, AlertCircle, Package, DollarSign, Car, Users, Wrench,
  Receipt, TrendingUp, ChefHat, CheckCircle, ClipboardList, Scissors, 
  Stethoscope, BedDouble, LogIn, LogOut, Dumbbell, UserX, Activity, Calendar, Map
} from 'lucide-react'
import useAuthStore from '../store/authStore'
import { formatMoney } from '../utils/format'
import api from '../services/api'
import CaixaSessao from './caixa/CaixaSessao'
import AutomotiveDashboard from './dashboards/AutomotiveDashboard'

// Papéis com rota própria (redirecionam automaticamente)
const PAPEL_HOME = {
  garcom:     '/garcom',
  cozinheiro: '/cozinha',
  entregador: '/entregas',
  mecanico:   '/workshop',
}

// 7 Arquétipos de Negócio Map
const getArchetype = (tipo) => {
  if (['restaurante', 'padaria_confeitaria'].includes(tipo)) return 'food_service'
  if (['comercio', 'supermercado', 'distribuidora', 'farmacia', 'ecommerce'].includes(tipo)) return 'varejo'
  if (['concessionaria'].includes(tipo)) return 'automotivo'
  if (['prestador_servicos'].includes(tipo)) return 'servicos'
  if (['clinica_consultorio', 'salao_beleza'].includes(tipo)) return 'saude_estetica'
  if (['hotel_hospedagem'].includes(tipo)) return 'hospedagem'
  if (['academia'].includes(tipo)) return 'recorrencia'
  return 'varejo' // fallback
}

function KpiCard({ icon: Icon, label, value, color, bg, sub, onClick }) {
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
      marginBottom: 16
    }}>
      <AlertCircle size={16} color={color} />
      <span style={{ fontSize: 13, color, fontWeight: 600 }}>
        {count} {label}
      </span>
    </div>
  )
}

export default function Dashboard() {
  const { papel, tenant } = useAuthStore()
  const navigate = useNavigate()
  const tipo = tenant?.tipo || 'comercio'
  const archetype = getArchetype(tipo)
  const [stats, setStats] = useState(null)
  const [loading, setLoading]= useState(true)

  // Redireciona papéis especializados
  useEffect(() => {
    const home = PAPEL_HOME[papel]
    if (home) navigate(home, { replace: true })
  }, [papel, navigate])

  const loadStats = useCallback(async () => {
    if (!['dono', 'gerente', 'vendedor', 'caixa'].includes(papel)) return
    setLoading(true)
    
    // Core Financeiro Universal
    let baseStats = { archetype, a_receber: 0, vencido_pagar: 0, saldo: 0 }
    try {
      const finRes = await api.get('/api/finance/summary').catch(() => ({ data: { data: {} } }))
      const fin = finRes.data.data || {}
      baseStats.a_receber = fin.a_receber || 0
      baseStats.vencido_pagar = fin.vencido_pagar || 0
      baseStats.saldo = fin.saldo_realizado || 0

      // Separação por Arquétipo
      if (archetype === 'food_service') {
        const [r1, r2, r3, r4] = await Promise.all([
          api.get('/api/orders', { params: { status: 'aberto' } }).catch(() => ({ data: { data: [] } })),
          api.get('/api/orders', { params: { status: 'em_preparo'} }).catch(() => ({ data: { data: [] } })),
          api.get('/api/orders', { params: { status: 'pronto' } }).catch(() => ({ data: { data: [] } })),
          api.get('/api/orders', { params: { status: 'fechado' } }).catch(() => ({ data: { data: [] } })),
        ])
        const fechados = r4.data.data || []
        baseStats = {
          ...baseStats,
          abertos: (r1.data.data || []).length,
          preparo: (r2.data.data || []).length,
          prontos: (r3.data.data || []).length,
          fechados: fechados.length,
          faturamento: fechados.reduce((s, o) => s + parseFloat(o.total || 0), 0),
        }
      } 
      else if (archetype === 'varejo') {
        const r4 = await api.get('/api/orders', { params: { status: 'fechado' } }).catch(() => ({ data: { data: [] } }))
        const fechados = r4.data.data || []
        baseStats = {
          ...baseStats,
          vendas_hoje: fechados.length,
          faturamento: fechados.reduce((s, o) => s + parseFloat(o.total || 0), 0),
          ticket_medio: fechados.length ? (fechados.reduce((s, o) => s + parseFloat(o.total || 0), 0) / fechados.length) : 0,
          estoque_baixo: 4, // Mock Alerta (SaaS Pro/Ultimate)
          vencimento_proximo: tipo === 'farmacia' ? 2 : 0, // Mock Alerta
        }
      }
      else if (archetype === 'automotivo') {
        const [vRes, cRes, sRes] = await Promise.all([
          api.get('/api/vehicles').catch(() => ({ data: { data: [] } })),
          api.get('/api/clients').catch(() => ({ data: { data: [] } })),
          api.get('/api/sales').catch(() => ({ data: { data: [] } })),
        ])
        const veiculos = vRes.data.data || []
        const disponiveis = veiculos.filter(v => v.status === 'disponivel')
        const vendas = sRes.data.data || []
        baseStats = {
          ...baseStats,
          disponiveis: disponiveis.length,
          reservados: veiculos.filter(v => v.status === 'reservado').length,
          vendidos: veiculos.filter(v => v.status === 'vendido').length,
          clientes: (cRes.data.data || []).length,
          emAndamento: vendas.filter(s => s.status === 'em_andamento').length,
          estoque_valor: disponiveis.reduce((s, v) => s + parseFloat(v.preco || 0), 0),
        }
      }
      else if (archetype === 'servicos') {
        // Fallback p/ API OS Futura
        baseStats = { ...baseStats, os_abertas: 0, os_execucao: 0, os_prontas: 0, os_concluidas: 0, faturamento: 0 }
      }
      else if (archetype === 'saude_estetica') {
        // Fallback p/ API de Agenda Futura
        baseStats = { ...baseStats, agendamentos_hoje: 0, em_atendimento: 0, atendidos_hoje: 0, faturamento: 0 }
      }
      else if (archetype === 'hospedagem') {
        const rHotel = await api.get('/api/hotel/dashboard').catch(() => ({ data: { data: {} } }))
        const h = rHotel?.data?.data || {}
        baseStats = { 
          ...baseStats, 
          ocupacao_pct: h.ocupacao_pct || 0, 
          checkins_hoje: h.checkins_hoje || 0, 
          checkouts_hoje: h.checkouts_hoje || 0, 
          reservas_ativas: h.reservas_ativas || 0, 
          receita_hospedes: h.receita_hospedes || 0 
        }
      }
      else if (archetype === 'recorrencia') {
        // Fallback p/ API de Planos/Catraca Futura
        baseStats = { ...baseStats, alunos_ativos: 0, inadimplentes: 0, vencendo_hoje: 0, checkins_hoje: 0, faturamento: 0 }
      }

      setStats(baseStats)
    } catch (e) {
      console.error(e)
    } finally { setLoading(false) }
  }, [papel, archetype, tipo])

  useEffect(() => { loadStats() }, [loadStats])

  if (PAPEL_HOME[papel]) {
    return <div className="loading-page"><div className="spinner" /> Redirecionando...</div>
  }

  // Renderização Dinâmica (Design Pattern Factory para Dashboards)
  const getKpis = () => {
    if (!stats) return []
    const finKpis = [
      { icon: TrendingUp, label: 'A Receber', value: formatMoney(stats.a_receber), color: 'var(--blue)' },
      { icon: DollarSign, label: 'Saldo do Mês', value: formatMoney(stats.saldo), color: stats.saldo >= 0 ? 'var(--green)' : 'var(--red)' },
    ]

    switch(stats.archetype) {
      case 'food_service': return [
        { icon: ShoppingCart, label: 'Pedidos Abertos', value: stats.abertos, color: 'var(--blue)', onClick: () => navigate('/orders') },
        { icon: ChefHat, label: 'Em Preparo', value: stats.preparo, color: '#F97316', onClick: () => navigate('/cozinha') },
        { icon: CheckCircle, label: 'Prontos', value: stats.prontos, color: '#A78BFA', onClick: () => navigate('/caixa') },
        { icon: Package, label: 'Fechados Hoje', value: stats.fechados, color: 'var(--green)', onClick: () => navigate('/orders') },
        ...finKpis
      ]
      case 'varejo': return [
        { icon: ShoppingCart, label: 'Vendas Hoje', value: stats.vendas_hoje, color: 'var(--green)' },
        { icon: Receipt, label: 'Ticket Médio', value: formatMoney(stats.ticket_medio), color: 'var(--blue)' },
        { icon: AlertCircle, label: 'Estoque Baixo', value: stats.estoque_baixo, color: 'var(--red)', sub: 'Produtos em alerta' },
        ...(tipo === 'farmacia' ? [{ icon: Clock, label: 'Vencimento Próximo', value: stats.vencimento_proximo, color: '#F97316' }] : []),
        ...finKpis
      ]
      case 'automotivo': return [
        { icon: Car, label: 'Disponíveis', value: stats.disponiveis, color: 'var(--blue)', onClick: () => navigate('/vehicles') },
        { icon: Car, label: 'Reservados', value: stats.reservados, color: '#F59E0B', onClick: () => navigate('/vehicles') },
        { icon: Receipt, label: 'Vendas em CRM', value: stats.emAndamento, color: 'var(--accent)', onClick: () => navigate('/sales') },
        { icon: Users, label: 'Leads Base', value: stats.clientes, color: '#A78BFA', onClick: () => navigate('/clients') },
        { icon: TrendingUp, label: 'Estoque Valor', value: formatMoney(stats.estoque_valor), color: '#06B6D4' },
        ...finKpis
      ]
      case 'servicos': return [
        { icon: ClipboardList, label: 'OS Abertas', value: stats.os_abertas, color: 'var(--blue)' },
        { icon: Wrench, label: 'OS em Execução', value: stats.os_execucao, color: '#F97316' },
        { icon: CheckCircle, label: 'OS Prontas', value: stats.os_prontas, color: '#A78BFA' },
        { icon: Package, label: 'Concluídas', value: stats.os_concluidas, color: 'var(--green)' },
        ...finKpis
      ]
      case 'saude_estetica': return [
        { icon: Calendar, label: 'Agendamentos', value: stats.agendamentos_hoje, color: 'var(--blue)' },
        { icon: Scissors, label: 'Em Atendimento', value: stats.em_atendimento, color: '#F97316' },
        { icon: CheckCircle, label: 'Atendidos', value: stats.atendidos_hoje, color: 'var(--green)' },
        ...finKpis
      ]
      case 'hospedagem': return [
        { icon: Map, label: 'Ocupação Atual', value: `${stats.ocupacao_pct}%`, color: stats.ocupacao_pct > 80 ? 'var(--red)' : 'var(--green)' },
        { icon: LogIn, label: 'Check-ins Hoje', value: stats.checkins_hoje, color: '#06B6D4' },
        { icon: LogOut, label: 'Check-outs Hoje', value: stats.checkouts_hoje, color: '#F97316' },
        { icon: BedDouble, label: 'Reservas Ativas', value: stats.reservas_ativas, color: '#A78BFA' },
        { icon: TrendingUp, label: 'Receita Estadia', value: formatMoney(stats.receita_hospedes), color: 'var(--green)' },
        ...finKpis
      ]
      case 'recorrencia': return [
        { icon: Activity, label: 'Alunos Ativos', value: stats.alunos_ativos, color: 'var(--blue)' },
        { icon: UserX, label: 'Inadimplentes', value: stats.inadimplentes, color: 'var(--red)' },
        { icon: Clock, label: 'Vencem Hoje', value: stats.vencendo_hoje, color: '#F97316' },
        { icon: Dumbbell, label: 'Frequência (Catraca)', value: stats.checkins_hoje, color: 'var(--green)' },
        ...finKpis
      ]
      default: return finKpis
    }
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">PAINEL DE CONTROLE</div>
          <div className="page-subtitle" style={{ textTransform: 'capitalize' }}>
            {tenant?.nome || 'RED Comercial'} · {tipo.replace('_', ' ')}
          </div>
        </div>
      </div>

      {/* INTEGRAÇÃO DA SESSÃO DE CAIXA NO TOPO (INVERTIDO) */}
      {['dono', 'gerente', 'caixa'].includes(papel) && (
        <div style={{ marginBottom: 32 }}>
          <CaixaSessao embedded={true} />
        </div>
      )}

      {/* Alertas urgentes Financeiros Globais */}
      {stats?.vencido_pagar > 0 && (
        <AlertBadge count={1} label={`em contas vencidas: ${formatMoney(stats.vencido_pagar)}`} color="var(--red)" />
      )}

      {loading ? (
        <div className="card" style={{ textAlign: 'center', padding: '48px 24px' }}>
          <div className="spinner" style={{ margin: '0 auto 16px' }} />
          <div style={{ fontSize: 13, color: 'var(--muted)' }}>Carregando dados da Operação Ultimate...</div>
        </div>
      ) : (
        <div className="dashboard-content">
          {stats.archetype === 'automotivo' ? (
            <AutomotiveDashboard />
          ) : (
            <div className="kpi-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 14 }}>
              {getKpis().map((k, i) => (
                <KpiCard key={i} {...k} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

