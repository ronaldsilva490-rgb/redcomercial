/**
 * SuperAdminLayout — Layout exclusivo do superadmin.
 * Sem menus de empresa. Sidebar só com ferramentas de sistema.
 */
import { useState, useEffect } from 'react'
import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import {
  Shield, Building2, Bot, Database, GitBranch,
  Activity, LogOut, Menu, ScrollText,
} from 'lucide-react'
import useAuthStore from '../../store/authStore'
import toast from 'react-hot-toast'

const NAV = [
  { to: '/superadmin',          icon: Activity,    label: 'Status do Sistema', end: true },
  { to: '/superadmin/empresas', icon: Building2,   label: 'Empresas' },
  { to: '/superadmin/ai',       icon: Bot,         label: 'AI Agent' },
  { to: '/superadmin/db',       icon: Database,    label: 'Banco de Dados' },
  { to: '/superadmin/deploy',   icon: GitBranch,   label: 'Deploy / Git' },
  { to: '/superadmin/logs',     icon: ScrollText,  label: 'Logs' },
]

export default function SuperAdminLayout() {
  const { logout } = useAuthStore()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const onKey = e => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])

  const handleLogout = async () => {
    await logout()
    navigate('/login', { replace: true })
    toast.success('Sessão encerrada')
  }

  const linkStyle = ({ isActive }) => ({
    display: 'flex', alignItems: 'center', gap: 10,
    padding: '9px 14px', borderRadius: 9, textDecoration: 'none',
    fontSize: 13, fontWeight: 500, transition: 'all 0.15s',
    color:      isActive ? 'var(--text)'  : 'var(--dim)',
    background: isActive ? 'var(--bg4)'   : 'transparent',
    borderLeft: isActive ? '2px solid var(--red)' : '2px solid transparent',
  })

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg)' }}>

      {open && (
        <div onClick={() => setOpen(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.72)', zIndex: 299 }} />
      )}

      <aside className={`sidebar${open ? ' open' : ''}`} style={{
        position: 'fixed', left: 0, top: 0, bottom: 0, width: 220,
        background: 'var(--bg2)', borderRight: '1px solid var(--border)',
        display: 'flex', flexDirection: 'column',
        overflowY: 'auto', padding: '14px 10px',
      }}>
        <div style={{ padding: '6px 6px 20px', borderBottom: '1px solid var(--border)', marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10,
              background: 'linear-gradient(135deg, var(--red), #ff4d5e)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 0 16px rgba(232,25,44,0.3)', flexShrink: 0,
            }}>
              <Shield size={18} color="#fff" />
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--text)', letterSpacing: 0.5 }}>Super Admin</div>
              <div style={{ fontSize: 10, color: 'var(--red)', fontWeight: 700, marginTop: 1 }}>SISTEMA</div>
            </div>
          </div>
        </div>

        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 9, color: 'var(--muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1.5, padding: '0 12px 8px' }}>
            Ferramentas
          </div>
          {NAV.map(item => {
            const Icon = item.icon
            return (
              <NavLink key={item.to} to={item.to} end={item.end} style={linkStyle} onClick={() => setOpen(false)}>
                <Icon size={14} />
                <span>{item.label}</span>
              </NavLink>
            )
          })}
        </div>

        <button onClick={handleLogout} style={{
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

      <div className="layout-main-area" style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, marginLeft: 220 }}>
        <div style={{
          display: 'flex', alignItems: 'center',
          padding: '0 16px', borderBottom: '1px solid var(--border)',
          background: 'var(--bg2)', position: 'sticky', top: 0, zIndex: 100,
          height: 52, flexShrink: 0,
        }}>
          <button onClick={() => setOpen(v => !v)} className="mobile-hamburger"
            aria-label="Menu"
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--dim)',
              padding: 6, marginRight: 8, display: 'none',
              alignItems: 'center', justifyContent: 'center', borderRadius: 8 }}>
            <Menu size={22} />
          </button>
          <span className="mobile-logo" style={{ fontFamily: 'Bebas Neue', fontSize: 18, letterSpacing: 2, color: 'var(--red)', display: 'none' }}>
            SUPER ADMIN
          </span>
          <div style={{ flex: 1 }} />
          <div style={{ fontSize: 11, padding: '4px 10px', background: 'var(--bg4)', borderRadius: 6, border: '1px solid var(--red-border)', color: 'var(--red)', fontWeight: 700 }}>
            🔴 MODO ADMIN
          </div>
        </div>

        <main style={{ flex: 1, padding: '24px', width: '100%', boxSizing: 'border-box' }}>
          <Outlet />
        </main>
      </div>

      <style>{`
        .sidebar { z-index: 40; }
        @media (max-width: 768px) {
          .sidebar { transform: translateX(-100%); transition: transform 0.25s cubic-bezier(0.4,0,0.2,1); z-index: 400 !important; }
          .sidebar.open { transform: translateX(0) !important; }
          .layout-main-area { margin-left: 0 !important; }
          .mobile-hamburger { display: flex !important; }
          .mobile-logo { display: inline !important; }
        }
      `}</style>
    </div>
  )
}
