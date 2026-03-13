import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, Car, Users, Wrench, DollarSign, Package,
  LayoutGrid, ShoppingCart, CreditCard, UtensilsCrossed, ChefHat,
  Bike, Receipt, AlertCircle, BoxesIcon, UserCog, Settings,
  ShieldCheck, TrendingUp, LogOut, Palette, Sun, Moon,
  BedDouble, Map, Zap
} from 'lucide-react'
import useAuthStore from '../../store/authStore'
import useThemeStore, { THEMES } from '../../store/themeStore'
import toast from 'react-hot-toast'

// ─── MASTER MENU (Filtragem Dinâmica Multi-Tenant) ────────────────────
export const MASTER_MENU = [
  { to: '/',         icon: LayoutDashboard, label: 'Caixa / Painel',   allowedTypes: ['ALL'], allowedRoles: ['dono', 'gerente', 'mecanico', 'caixa', 'vendedor'] },
  
  // -- Vendas & Balcão --
  { to: '/pdv',      icon: ShoppingCart,    label: 'PDV / Caixa', allowedTypes: ['comercio', 'supermercado', 'distribuidora', 'farmacia'], allowedRoles: ['dono', 'gerente', 'caixa'] },
  { to: '/caixa',    icon: CreditCard,      label: 'Frente de Caixa', allowedTypes: ['comercio', 'supermercado'], allowedRoles: ['dono', 'gerente', 'caixa'] },
  { to: '/caixa',    icon: CreditCard,      label: 'Frente de Caixa', allowedTypes: ['restaurante', 'padaria_confeitaria'], allowedRoles: ['dono', 'gerente', 'caixa'] },
  
  // -- Concessionária & Serviços --
  { to: '/leads',    icon: Zap,             label: 'Leads (CRM)', allowedTypes: ['concessionaria'], allowedRoles: ['dono', 'gerente', 'vendedor'] },
  { to: '/vehicles', icon: Car,             label: 'Estoque de Veículos', allowedTypes: ['concessionaria'], allowedRoles: ['dono', 'gerente', 'vendedor'] },
  { to: '/sales',    icon: Receipt,         label: 'Vendas de Veículos', allowedTypes: ['concessionaria'], allowedRoles: ['dono', 'gerente', 'vendedor'] },
  { to: '/workshop', icon: Wrench,          label: 'Oficina / OS',allowedTypes: ['concessionaria', 'servicos_oficina'], allowedRoles: ['dono', 'gerente', 'mecanico'] },
  
  // -- Restaurante & Delivery --
  { to: '/tables',   icon: LayoutGrid,      label: 'Mesas',       allowedTypes: ['restaurante', 'padaria_confeitaria'], allowedRoles: ['dono', 'gerente', 'garcom'], requiredModule: 'mesas' },
  { to: '/orders',   icon: UtensilsCrossed, label: 'Pedidos / Comandas', allowedTypes: ['restaurante', 'padaria_confeitaria'], allowedRoles: ['dono', 'gerente', 'caixa'] },
  { to: '/orders',   icon: Receipt,         label: 'Pedidos',     allowedTypes: ['comercio', 'supermercado', 'distribuidora'], allowedRoles: ['dono', 'gerente'] },
  { to: '/garcom',   icon: UtensilsCrossed, label: 'Atendimento', allowedTypes: ['restaurante', 'padaria_confeitaria'], allowedRoles: ['dono', 'gerente', 'garcom'], requiredModule: 'mesas' },
  { to: '/cozinha',  icon: ChefHat,         label: 'Cozinha',     allowedTypes: ['restaurante', 'padaria_confeitaria'], allowedRoles: ['dono', 'gerente', 'cozinheiro'], requiredModule: 'cozinha' },
  { to: '/entregas', icon: Bike,            label: 'Entregas',    allowedTypes: ['restaurante', 'padaria_confeitaria', 'comercio'], allowedRoles: ['dono', 'gerente', 'entregador'], requiredModule: 'delivery' },
  
  // -- Hotelaria & Hospedagem --
  { to: '/acomodacoes', icon: BedDouble,     label: 'Quartos',      allowedTypes: ['hotel_hospedagem'], allowedRoles: ['dono', 'gerente'] },
  { to: '/reservas',    icon: Map,           label: 'Reservas',     allowedTypes: ['hotel_hospedagem'], allowedRoles: ['dono', 'gerente', 'caixa'] },

  // -- Cadastros Base --
  { to: '/products', icon: Package,         label: 'Produtos',    allowedTypes: ['comercio', 'supermercado', 'distribuidora', 'farmacia'], allowedRoles: ['dono', 'gerente'] },
  { to: '/products', icon: Package,         label: 'Cardápio / Produtos', allowedTypes: ['restaurante', 'padaria_confeitaria', 'hotel_hospedagem'], allowedRoles: ['dono', 'gerente'] },
  { to: '/stock',    icon: BoxesIcon,       label: 'Peças / Estoque',     allowedTypes: ['concessionaria', 'comercio', 'supermercado', 'distribuidora', 'farmacia', 'restaurante', 'padaria_confeitaria', 'servicos_oficina'], allowedRoles: ['dono', 'gerente'] },
  { to: '/clients',  icon: Users,           label: 'Clientes',    allowedTypes: ['ALL'], allowedRoles: ['dono', 'gerente', 'vendedor', 'caixa'] },
  
  // -- Financeiro --
  { divider: true,   label: 'Financeiro',   allowedTypes: ['ALL'], allowedRoles: ['dono', 'gerente', 'caixa'] },
  { to: '/bills',    icon: AlertCircle,     label: 'Contas a Pagar', allowedTypes: ['ALL'], allowedRoles: ['dono', 'gerente', 'caixa'] },
  { to: '/finance',  icon: DollarSign,      label: 'Financeiro Geral', allowedTypes: ['ALL'], allowedRoles: ['dono', 'gerente', 'caixa'] },
]

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
  const { tenant, papel, logout, user, getDisplayName } = useAuthStore()
  const { currentTheme, setTheme }                      = useThemeStore()
  const navigate = useNavigate()

  const tipo = tenant?.tipo || 'comercio'
  const papelLogado = papel || 'dono'
  const modulosAtivos = tenant?.config?.modulos_ativos || []
  const papelCfg = PAPEL_VISUAL[papelLogado] || { label: papelLogado || '—', color: 'var(--muted)' }

  // Filtragem Dinâmica
  const navItems = MASTER_MENU.filter(item => {
    // 1. Checa se o tipo do estabelecimento (tenant) pode ver este menu
    const isTypeAllowed = item.allowedTypes.includes('ALL') || item.allowedTypes.includes(tipo)
    if (!isTypeAllowed) return false
    
    // 2. Checa se o Cargo (papel) pode ver este menu
    const isRoleAllowed = item.allowedRoles.includes(papelLogado)
    if (!isRoleAllowed) return false

    // 3. Checa se o Tenant tem o Módulo Ativado (se a View exigir algum)
    if (item.requiredModule && !modulosAtivos.includes(item.requiredModule)) {
      return false
    }
    
    return true
  })

  // Remove divisores inúteis que ficaram sozinhos
  const cleanNavItems = navItems.filter((item, index) => {
    if (item.divider) {
      if (index === navItems.length - 1) return false; // Ultimo nulo
      if (navItems[index + 1].divider) return false; // Dois divisores seguidos
    }
    return true;
  })

  const isAdmin = papelLogado === 'dono' || papelLogado === 'gerente'

  const handleLogout = async () => {
    await logout()
    navigate('/login', { replace: true })
    toast.success('Sessão encerrada! Volte sempre 👋')
  }

  const isRed = currentTheme === 'red'

  const linkStyle = ({ isActive }) => ({
    display: 'flex', alignItems: 'center', gap: 10,
    padding: '9px 12px', borderRadius: 8, textDecoration: 'none',
    margin: '0 8px 4px', // Cria respiro lateral pras bordas não colarem
    fontSize: 13, fontWeight: isActive ? 600 : 500, transition: 'all 0.15s',
    color: isActive
      ? (isRed ? '#fff' : 'var(--text)')
      : (isRed ? 'rgba(255,255,255,0.45)' : 'var(--dim)'),
    background: isActive
      ? (isRed ? 'rgba(196,18,23,0.15)' : 'var(--bg4)')
      : 'transparent',
    border: isActive
      ? `1px solid ${isRed ? 'rgba(237,16,24,0.35)' : 'var(--accent)'}`
      : '1px solid transparent',
    boxShadow: isActive ? (isRed ? '0 0 14px rgba(196,18,23,0.15)' : 'none') : 'none'
  })

  return (
    <>
      <aside
        style={{
          position: 'fixed', left: 0, top: 0, bottom: 0, width: 220,
          background: isRed ? '#050202' : 'var(--bg2)',
          borderRight: isRed ? '1px solid rgba(196,18,23,0.25)' : '1px solid var(--border)',
          display: 'flex', flexDirection: 'column', boxSizing: 'border-box',
          overflowY: 'auto', padding: '14px 10px',
        }}
        className={`sidebar${open ? ' open' : ''}`}
      >
        {/* Logo + tenant */}
        <div style={{
          padding: '12px', marginBottom: 14,
          background: currentTheme === 'red' ? 'rgba(5,2,2,0.6)' : 'transparent',
          borderRadius: 12, flexShrink: 0,
          border: currentTheme === 'red' ? '1px solid rgba(196,18,23,0.35)' : 'none',
          boxShadow: currentTheme === 'red' ? '0 4px 16px rgba(196,18,23,0.1)' : 'none',
          position: 'relative', overflow: 'hidden'
        }}>
          {currentTheme === 'red' && (
            <div style={{
              position: 'absolute', inset: 0,
              background: 'linear-gradient(135deg, rgba(220,20,30,0.1) 0%, transparent 60%)',
              pointerEvents: 'none',
            }} />
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, position: 'relative' }}>
            {tenant?.logo_url ? (
              <img
                src={tenant.logo_url} alt="logo"
                style={{
                  width: 36, height: 36, borderRadius: 8, objectFit: 'contain',
                  background: 'var(--bg3)', padding: 2,
                  boxShadow: currentTheme === 'red' ? '0 0 12px rgba(196,18,23,0.3)' : 'none'
                }}
              />
            ) : (
              <div style={{
                width: 36, height: 36, borderRadius: 8,
                background: currentTheme === 'red' ? 'transparent' : 'var(--red-glow)',
                border: currentTheme === 'red' ? '1px solid rgba(196,18,23,0.5)' : '1px solid var(--red-border)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: 'Bebas Neue', fontSize: 16, color: currentTheme === 'red' ? '#ff3b30' : 'var(--accent)',
                boxShadow: currentTheme === 'red' ? 'inset 0 0 10px rgba(196,18,23,0.2)' : 'none'
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

          {/* Gerenciamento (Tenant Admin) */}
          {isAdmin && (
            <>
              <div style={{ fontSize: 9, color: 'var(--muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1.5, padding: '16px 12px 4px' }}>
                Gerenciamento
              </div>
              <NavLink to="/gerenciamento/equipe"       style={linkStyle} onClick={onClose}><UserCog  size={14} /><span>Equipe</span></NavLink>
              <NavLink to="/gerenciamento/meu-negocio"  style={linkStyle} onClick={onClose}><Settings size={14} /><span>Meu Negócio</span></NavLink>
            </>
          )}

        </div>

        <button
          onClick={() => {
            const isLight = currentTheme === 'light'
            setTheme(isLight ? 'dark' : 'light', tenant?.id, user?.id)
          }}
          style={{
            display: 'flex', alignItems: 'center', gap: 8,
            width: '100%', padding: '9px 12px', borderRadius: 9,
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'var(--muted)', fontSize: 13, marginTop: 'auto',
            fontFamily: 'inherit', transition: 'color 0.15s',
          }}
          onMouseEnter={e => e.currentTarget.style.color = 'var(--text)'}
          onMouseLeave={e => e.currentTarget.style.color = 'var(--muted)'}
        >
          {currentTheme === 'light' ? <Moon size={14} /> : <Sun size={14} />}
          <span>{currentTheme === 'light' ? 'Modo Escuro' : 'Modo Claro'}</span>
        </button>

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
