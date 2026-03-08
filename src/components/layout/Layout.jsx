import { Outlet, Navigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { Menu } from 'lucide-react'
import Sidebar from './Sidebar'
import NotifBell from '../ui/NotifBell'
import useNotifStore from '../../store/notifStore'
import useAuthStore from '../../store/authStore'

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { startPolling, stopPolling } = useNotifStore()
  const { tenant, papel } = useAuthStore()

  useEffect(() => {
    startPolling()
    return () => stopPolling()
  }, [])

  useEffect(() => {
    const onKey = e => { if (e.key === 'Escape') setSidebarOpen(false) }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg)' }}>

      {/* Overlay mobile — SEM backdropFilter para nao borrar a sidebar */}
      {sidebarOpen && (
        <div onClick={() => setSidebarOpen(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.72)', zIndex: 299 }} />
      )}

      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Area principal: marginLeft 220 apenas no desktop */}
      <div className="layout-main-area"
        style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, marginLeft: 220 }}>

        {/* Top bar */}
        <div style={{
          display: 'flex', alignItems: 'center',
          padding: '0 16px', borderBottom: '1px solid var(--border)',
          background: 'var(--bg2)', position: 'sticky', top: 0, zIndex: 100,
          height: 52, flexShrink: 0,
        }}>
          <button onClick={() => setSidebarOpen(v => !v)} className="mobile-hamburger"
            aria-label="Abrir menu"
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--dim)',
              padding: 6, marginRight: 8, display: 'none',
              alignItems: 'center', justifyContent: 'center', borderRadius: 8 }}>
            <Menu size={22} />
          </button>
          <span className="mobile-logo"
            style={{ fontFamily: 'Bebas Neue', fontSize: 18, letterSpacing: 2, color: 'var(--text)',
              display: 'none', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 200 }}>
            {tenant?.nome || 'RED'}
          </span>
          <div style={{ flex: 1 }} />
          <NotifBell />
        </div>

        {/* Conteudo */}
        <main style={{ flex: 1, padding: '24px', width: '100%', boxSizing: 'border-box', minHeight: 0 }}>
          <Outlet />
        </main>
      </div>
    </div>
  )
}
