import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, Car, Users, Wrench, DollarSign, Package,
  LayoutGrid, ShoppingCart, CreditCard, UtensilsCrossed, ChefHat,
  Bike, Receipt, AlertCircle, BoxesIcon, UserCog, Settings,
  ShieldCheck, TrendingUp, LogOut, Palette,
} from 'lucide-react'
import useAuthStore from '../../store/authStore'
import useThemeStore, { THEMES } from '../../store/themeStore'
import toast from 'react-hot-toast'

// ─── Menus por tipo de negócio + papel ────────────────────

// Concessionária
const menuConcessionaria = [
  { to: '/',         icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/vehicles', icon: Car,             label: 'Veículos' },
  { to: '/sales',    icon: Receipt,         label: 'Vendas' },
  { to: '/clients',  icon: Users,           label: 'Clientes' },
  { to: '/workshop', icon: Wrench,          label: 'Oficina' },
  { to: '/stock',    icon: BoxesIcon,       label: 'Estoque' },
  { divider: true,   label: 'Financeiro' },
  { to: '/bills',    icon: AlertCircle,     label: 'Contas a Pagar' },
  { to: '/finance',  icon: DollarSign,      label: 'Financeiro Geral' },
]

// Restaurante / Bar
const menuRestaurante = [
  { to: '/',         icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/tables',   icon: LayoutGrid,      label: 'Mesas' },
  { to: '/orders',   icon: UtensilsCrossed, label: 'Pedidos' },
  { to: '/products', icon: Package,         label: 'Cardápio' },
  { to: '/stock',    icon: BoxesIcon,       label: 'Estoque' },
  { to: '/clients',  icon: Users,           label: 'Clientes' },
  { to: '/garcom',   icon: UtensilsCrossed, label: 'Garçom' },
  { to: '/cozinha',  icon: ChefHat,         label: 'Cozinha' },
  { to: '/entregas', icon: Bike,            label: 'Entregas' },
  { to: '/caixa',         icon: CreditCard,      label: 'Caixa' },
  { to: '/sessao-caixa',  icon: DollarSign,      label: 'Sessão de Caixa' },
  { divider: true,   label: 'Financeiro' },
  { to: '/bills',    icon: AlertCircle,     label: 'Contas a Pagar' },
  { to: '/finance',  icon: DollarSign,      label: 'Financeiro Geral' },
]

// Comércio geral
const menuComercio = [
  { to: '/',         icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/pdv',      icon: ShoppingCart,    label: 'PDV / Caixa' },
  { to: '/orders',   icon: Receipt,         label: 'Pedidos' },
  { to: '/products', icon: Package,         label: 'Produtos' },
  { to: '/stock',    icon: BoxesIcon,       label: 'Estoque' },
  { to: '/clients',  icon: Users,           label: 'Clientes' },
  { to: '/entregas', icon: Bike,            label: 'Entregas' },
  { to: '/caixa',    icon: CreditCard,      label: 'Central Pedidos' },
  { to: '/sessao-caixa', icon: DollarSign,  label: 'Sessão de Caixa' },
  { divider: true,   label: 'Financeiro' },
  { to: '/bills',    icon: AlertCircle,     label: 'Contas a Pagar' },
  { to: '/finance',  icon: DollarSign,      label: 'Financeiro Geral' },
]

// Menus especializados por papel (sobrescreve menu principal)
const menuByPapel = {
  garcom:      [{ to: '/garcom',   icon: UtensilsCrossed, label: 'Atendimento' }],
  cozinheiro:  [{ to: '/cozinha',  icon: ChefHat,         label: 'Cozinha' }],
  entregador:  [{ to: '/entregas', icon: Bike,             label: 'Entregas' }],
  mecanico:    [
    { to: '/',         icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/workshop', icon: Wrench,          label: 'Minhas OS' },
  ],
  caixa: [
    { to: '/',             icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/caixa',        icon: CreditCard,      label: 'Central Pedidos' },
    { to: '/sessao-caixa', icon: DollarSign,      label: 'Sessão de Caixa' },
    { to: '/bills',        icon: AlertCircle,     label: 'Contas a Pagar' },
    { to: '/finance',      icon: DollarSign,      label: 'Financeiro' },
  ],
  vendedor: [
    { to: '/',         icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/vehicles', icon: Car,             label: 'Veículos' },
    { to: '/sales',    icon: Receipt,         label: 'Vendas' },
    { to: '/clients',  icon: Users,           label: 'Clientes' },
  ],
}

const PAPEL_VISUAL = {
  dono:       { label: 'Dono',       color: 'var(--red)' },
  gerente:    { label: 'Gerente',    color: '#F59E0B' },
  vendedor:   { label: 'Vendedor',   color: 'var(--blue)' },
  caixa:      { label: 'Caixa',      color: 'var(--green)' },
  garcom:     { label: 'Garçom',     color: '#F97316' },
  cozinheiro: { label: 'Cozinheiro', color: '#A78BFA' },
  entregador: { label: 'Entregador', color: '#06B6D4' },
  mecanico:   { label: 'Mecânico',   color: '#8B5CF6' },
}

export default function Sidebar({ open, onClose }) {
  const { tenant, papel, logout, getDisplayName } = useAuthStore()
  const { currentTheme, setTheme }                = useThemeStore()
  const navigate = useNavigate()

  const tipo = tenant?.tipo || 'comercio'
  const papelCfg = PAPEL_VISUAL[papel] || { label: papel || '—', color: 'var(--muted)' }

  // Seleciona menu
  let navItems
  if (menuByPapel[papel]) {
    navItems = menuByPapel[papel]
  } else if (tipo === 'concessionaria') {
    navItems = menuConcessionaria
  } else if (tipo === 'restaurante') {
    navItems = menuRestaurante
  } else {
    navItems = menuComercio
  }

  const isAdmin = papel === 'dono' || papel === 'gerente'

  const handleLogout = async () => {
    await logout()
    navigate('/login', { replace: true })
    toast.success('Sessão encerrada')
  }

  const linkStyle = ({ isActive }) => ({
    display: 'flex', alignItems: 'center', gap: 10,
    padding: '9px 12px', borderRadius: 9, textDecoration: 'none',
    fontSize: 13, fontWeight: 500, transition: 'all 0.15s',
    color:      isActive ? 'var(--text)'   : 'var(--dim)',
    background: isActive ? 'var(--bg4)'    : 'transparent',
    borderLeft: isActive ? '2px solid var(--accent)' : '2px solid transparent',
  })

  const themeList = Object.values(THEMES)

  return (
    <>
      <aside
        style={{
          position: 'fixed', left: 0, top: 0, bottom: 0, width: 220,
          background: 'var(--bg2)', borderRight: '1px solid var(--border)',
          display: 'flex', flexDirection: 'column',
          overflowY: 'auto', padding: '14px 10px',
        }}
        className={`sidebar${open ? ' open' : ''}`}
      >
        {/* Logo + tenant */}
        <div style={{ padding: '6px 6px 16px', marginBottom: 4 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {tenant?.logo_url ? (
              <img
                src={tenant.logo_url} alt="logo"
                style={{ width: 36, height: 36, borderRadius: 8, objectFit: 'contain', background: 'var(--bg3)', padding: 2 }}
              />
            ) : (
              <div style={{
                width: 36, height: 36, borderRadius: 8, background: 'var(--red-glow)',
                border: '1px solid var(--red-border)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: 'Bebas Neue', fontSize: 16, color: 'var(--accent)',
              }}>
                R
              </div>
            )}
            <div style={{ flex: 1, overflow: 'hidden' }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {tenant?.nome || 'RED'}
              </div>
              <div style={{ fontSize: 10, color: papelCfg.color, fontWeight: 700, marginTop: 1 }}>
                {papelCfg.label}
              </div>
            </div>
          </div>
          <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 8 }}>
            {getDisplayName()}
          </div>
        </div>

        {/* Nav items */}
        <div style={{ flex: 1 }}>
          {navItems.map((item, idx) => {
            if (item.divider) {
              return (
                <div key={idx} style={{
                  fontSize: 9, color: 'var(--muted)', fontWeight: 700,
                  textTransform: 'uppercase', letterSpacing: 1.5,
                  padding: '16px 12px 4px',
                }}>
                  {item.label}
                </div>
              )
            }
            const Icon = item.icon
            return (
              <NavLink key={item.to} to={item.to} end={item.to === '/'} style={linkStyle} onClick={onClose}>
                <Icon size={14} />
                <span>{item.label}</span>
              </NavLink>
            )
          })}

          {/* Admin */}
          {isAdmin && (
            <>
              <div style={{ fontSize: 9, color: 'var(--muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1.5, padding: '16px 12px 4px' }}>
                Admin
              </div>
              <NavLink to="/admin/users"    style={linkStyle} onClick={onClose}><UserCog  size={14} /><span>Funcionários</span></NavLink>
              <NavLink to="/admin/settings" style={linkStyle} onClick={onClose}><Settings size={14} /><span>Meu Negócio</span></NavLink>
            </>
          )}

        </div>

        {/* Seletor de tema */}
        <div style={{ paddingTop: 12, borderTop: '1px solid var(--border)', marginTop: 8 }}>
          <div style={{ fontSize: 9, color: 'var(--muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1.5, padding: '0 4px 8px', display: 'flex', alignItems: 'center', gap: 5 }}>
            <Palette size={10} /> Tema
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6,1fr)', gap: 4, padding: '0 4px' }}>
            {themeList.map(t => (
              <button
                key={t.id}
                onClick={() => setTheme(t.id, tenant?.id)}
                title={t.label}
                style={{
                  all: 'unset', cursor: 'pointer', fontSize: 16,
                  textAlign: 'center', lineHeight: 1.4,
                  borderRadius: 6, padding: '2px',
                  outline: currentTheme === t.id ? '2px solid var(--accent)' : 'none',
                  outlineOffset: 1,
                }}
              >
                {t.emoji}
              </button>
            ))}
          </div>
        </div>

        {/* Logout */}
        <button
          onClick={handleLogout}
          style={{
            display: 'flex', alignItems: 'center', gap: 8,
            width: '100%', padding: '9px 12px', borderRadius: 9,
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'var(--muted)', fontSize: 13, marginTop: 8,
            fontFamily: 'inherit', transition: 'color 0.15s',
          }}
          onMouseEnter={e => e.currentTarget.style.color = 'var(--red)'}
          onMouseLeave={e => e.currentTarget.style.color = 'var(--muted)'}
        >
          <LogOut size={14} />
          <span>Sair</span>
        </button>
      </aside>

      <style>{`
        /* Desktop: sidebar sempre visível, z-index suficiente para ficar sobre conteúdo */
        .sidebar { z-index: 40; }

        @media (max-width: 768px) {
          .sidebar {
            transform: translateX(-100%);
            transition: transform 0.25s cubic-bezier(0.4,0,0.2,1);
            z-index: 400 !important;   /* ACIMA do overlay do Layout (299) */
          }
          .sidebar.open { transform: translateX(0) !important; }
          .sidebar-overlay { display: block !important; }
        }
      `}</style>
    </>
  )
}
