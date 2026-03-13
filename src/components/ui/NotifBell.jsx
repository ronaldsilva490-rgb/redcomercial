import { useState, useRef, useEffect } from 'react'
import { Bell, BellOff, Check, CheckCheck, X } from 'lucide-react'
import useNotifStore from '../../store/notifStore'
import useThemeStore from '../../store/themeStore'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'

const TIPO_ICON = {
  chamar_garcom:        '📢',
  pedido_pronto:        '✅',
  novo_pedido:          '🍽️',
  pedido_cozinha:       '🍳',
  pagamento_solicitado: '💳',
  pedido_entregue:      '📦',
  pedido_saindo:        '🛵',
  pedido_enviado:       '📋',
  pedido_bar:           '🍺',
  pagamento_ok:         '💰',
  default:              '🔔',
}

function timeAgo(ts) {
  try {
    return formatDistanceToNow(new Date(ts), { addSuffix: true, locale: ptBR })
  } catch { return '' }
}

export default function NotifBell() {
  const { items, unread, open, setOpen, markRead, markAllRead, muted, toggleMute } = useNotifStore()
  const { currentTheme } = useThemeStore()
  const isRed = currentTheme === 'red'
  const ref = useRef(null)

  // Fecha ao clicar fora
  useEffect(() => {
    function handler(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    if (open) document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open, setOpen])

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      {/* Bell button */}
      <button
        onClick={() => setOpen(!open)}
        style={{
          position: 'relative', background: 'none', border: 'none',
          cursor: 'pointer', padding: 8, color: 'var(--dim)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          borderRadius: 8, transition: 'background 0.15s',
        }}
        onMouseEnter={e => e.currentTarget.style.background = 'var(--bg4)'}
        onMouseLeave={e => e.currentTarget.style.background = 'none'}
      >
        {muted ? <BellOff size={18} /> : <Bell size={18} />}
        {unread > 0 && (
          <span style={{
            position: 'absolute', top: 4, right: 4,
            background: 'var(--red)', color: '#fff',
            borderRadius: 10, fontSize: 9, fontWeight: 800,
            minWidth: 16, height: 16, display: 'flex',
            alignItems: 'center', justifyContent: 'center',
            padding: '0 4px', lineHeight: 1,
            animation: 'pulse 1.5s ease-in-out infinite',
          }}>
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div style={{
          position: 'absolute', right: 0, top: '100%', marginTop: 6,
          width: 340, maxHeight: 480,
          background: isRed ? '#050202' : 'var(--bg2)',
          border: isRed ? '1px solid rgba(196,18,23,0.3)' : '1px solid var(--border)',
          borderRadius: 14, boxShadow: isRed ? '0 12px 40px rgba(0,0,0,0.8)' : '0 8px 32px rgba(0,0,0,0.5)',
          display: 'flex', flexDirection: 'column',
          zIndex: 9999, overflow: 'hidden',
        }}>
          {/* Header */}
          <div style={{
            padding: '12px 16px', borderBottom: isRed ? '1px solid rgba(196,18,23,0.2)' : '1px solid var(--border)',
            display: 'flex', alignItems: 'center', gap: 8,
          }}>
            <Bell size={13} color="var(--red)" />
            <span style={{ fontWeight: 700, fontSize: 13, flex: 1, color: isRed ? '#fff' : 'inherit' }}>
              Notificações {unread > 0 && <span style={{ color: 'var(--red)' }}>({unread})</span>}
            </span>
            <button onClick={toggleMute} title={muted ? 'Ativar som' : 'Silenciar'}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: 'var(--muted)', display: 'flex' }}>
              {muted ? <BellOff size={13} /> : <Bell size={13} />}
            </button>
            {unread > 0 && (
              <button onClick={markAllRead} title="Marcar tudo como lido"
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: 'var(--muted)', display: 'flex' }}>
                <CheckCheck size={13} />
              </button>
            )}
            <button onClick={() => setOpen(false)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: 'var(--muted)', display: 'flex' }}>
              <X size={13} />
            </button>
          </div>

          {/* Items */}
          <div style={{ overflowY: 'auto', flex: 1 }}>
            {items.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '32px 16px', color: 'var(--muted)', fontSize: 12 }}>
                Nenhuma notificação
              </div>
            ) : (
              items.map(n => (
                <div
                  key={n.id}
                  onClick={() => markRead(n.id)}
                  style={{
                    padding: '12px 16px', cursor: 'pointer',
                    borderBottom: isRed ? '1px solid rgba(196,18,23,0.1)' : '1px solid rgba(255,255,255,0.04)',
                    background: n.lida ? 'transparent' : 'rgba(232,25,44,0.04)',
                    transition: 'background 0.15s',
                    display: 'flex', gap: 10, alignItems: 'flex-start',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = isRed ? 'rgba(196,18,23,0.15)' : 'var(--bg4)'}
                  onMouseLeave={e => e.currentTarget.style.background = n.lida ? 'transparent' : 'rgba(232,25,44,0.04)'}
                >
                  <div style={{ fontSize: 18, flexShrink: 0, marginTop: 1 }}>
                    {TIPO_ICON[n.tipo] || TIPO_ICON.default}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontSize: 12, fontWeight: n.lida ? 500 : 700,
                      color: n.lida ? 'var(--dim)' : (isRed ? '#fff' : 'var(--text)'),
                      lineHeight: 1.3,
                    }}>
                      {n.titulo}
                    </div>
                    {n.mensagem && (
                      <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2, lineHeight: 1.4 }}>
                        {n.mensagem}
                      </div>
                    )}
                    <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 4 }}>
                      {timeAgo(n.created_at)}
                    </div>
                  </div>
                  {!n.lida && (
                    <div style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--red)', flexShrink: 0, marginTop: 4 }} />
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
