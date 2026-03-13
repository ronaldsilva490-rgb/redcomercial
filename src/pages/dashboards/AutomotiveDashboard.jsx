import React, { useEffect, useState } from 'react'
import { 
  Car, Users, TrendingUp, DollarSign, Receipt, 
  Target, Zap, Clock, AlertCircle 
} from 'lucide-react'
import { formatMoney } from '../../utils/format'
import api from '../../services/api'
import { useNavigate } from 'react-router-dom'

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

export default function AutomotiveDashboard() {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    async function loadStats() {
      try {
        const [vRes, sRes, lRes, finRes] = await Promise.all([
          api.get('/api/vehicles'),
          api.get('/api/sales'),
          api.get('/api/leads/stats'),
          api.get('/api/finance/summary')
        ])

        const veiculos = vRes.data.data || []
        const disponiveis = veiculos.filter(v => v.status === 'disponivel')
        
        setStats({
          disponiveis: disponiveis.length,
          reservados: veiculos.filter(v => v.status === 'reservado').length,
          estoque_valor: disponiveis.reduce((s, v) => s + parseFloat(v.preco || 0), 0),
          leads_novos: lRes.data.data?.novo || 0,
          vendas_mes: (sRes.data.data || []).length,
          a_receber: finRes.data.data?.a_receber || 0,
          saldo: finRes.data.data?.saldo_realizado || 0
        })
      } catch (err) {
        console.error("Erro ao carregar dashboard automotivo", err)
      } finally {
        setLoading(false)
      }
    }
    loadStats()
  }, [])

  if (loading) return (
    <div className="card" style={{ textAlign: 'center', padding: '48px 24px' }}>
      <div className="spinner" style={{ margin: '0 auto 16px' }} />
      <div style={{ fontSize: 13, color: 'var(--muted)' }}>Sincronizando estoque e leads...</div>
    </div>
  )

  return (
    <div className="kpi-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 16 }}>
      
      {/* SEÇÃO DE VENDAS E LEADS */}
      <KpiCard 
        icon={Zap} 
        label="Leads Novos (CRM)" 
        value={stats.leads_novos} 
        color="#A78BFA" 
        sub="Pessoas interessadas agora"
        onClick={() => navigate('/leads')}
      />
      
      <KpiCard 
        icon={Target} 
        label="Vendas em CRM" 
        value={stats.vendas_mes} 
        color="var(--accent)" 
        sub="Aguardando faturamento"
        onClick={() => navigate('/sales')}
      />

      {/* SEÇÃO DE ESTOQUE */}
      <KpiCard 
        icon={Car} 
        label="Estoque Disponível" 
        value={stats.disponiveis} 
        color="var(--blue)" 
        sub="Carros prontos para venda"
        onClick={() => navigate('/vehicles')}
      />

      <KpiCard 
        icon={Clock} 
        label="Veículos Reservados" 
        value={stats.reservados} 
        color="#F59E0B" 
        sub="Negociações em andamento"
        onClick={() => navigate('/vehicles')}
      />

      {/* SEÇÃO FINANCEIRA */}
      <KpiCard 
        icon={TrendingUp} 
        label="Patrimônio em Estoque" 
        value={formatMoney(stats.estoque_valor)} 
        color="#06B6D4" 
        sub="Valor total dos disponíveis"
      />

      <KpiCard 
        icon={DollarSign} 
        label="Saldo do Mês" 
        value={formatMoney(stats.saldo)} 
        color={stats.saldo >= 0 ? 'var(--green)' : 'var(--red)'} 
        sub="Geral da concessionária"
      />

      <KpiCard 
        icon={Receipt} 
        label="Contas a Receber" 
        value={formatMoney(stats.a_receber)} 
        color="var(--blue)" 
        sub="Previsão de entrada"
      />

    </div>
  )
}
