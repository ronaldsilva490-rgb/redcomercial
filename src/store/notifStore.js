/**
 * notifStore — polling de notificações a cada 5s. v7
 * Beeps por tipo. Garçom recebe pedido_bar e pedido_balcao.
 */
import { create } from 'zustand'
import api from '../services/api'

function playBeep(freq = 880, duration = 200, vol = 0.3) {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.type = 'sine'
    osc.frequency.value = freq
    gain.gain.setValueAtTime(vol, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration / 1000)
    osc.start(ctx.currentTime)
    osc.stop(ctx.currentTime + duration / 1000)
  } catch { /* sem suporte */ }
}

const BEEPS = {
  chamar_garcom:        () => { playBeep(1200, 150); setTimeout(() => playBeep(1200, 150), 200) },
  pedido_pronto:        () => { playBeep(880, 200); setTimeout(() => playBeep(1100, 200), 300) },
  novo_pedido:          () => playBeep(660, 250),
  pedido_cozinha:       () => { playBeep(550, 180); setTimeout(() => playBeep(700, 180), 250) },
  pagamento_solicitado: () => { playBeep(880, 150); setTimeout(() => playBeep(880, 150), 200); setTimeout(() => playBeep(1100, 250), 400) },
  pedido_entregue:      () => playBeep(990, 300),
  pedido_saindo:        () => playBeep(770, 200),
  pedido_enviado:       () => playBeep(660, 200),
  pagamento_ok:         () => { playBeep(1000, 150); setTimeout(() => playBeep(1200, 200), 200) },
  chamar_caixa:         () => { playBeep(900, 150); setTimeout(() => playBeep(900, 150), 200) },
  // Garçom buscar no bar (beep duplo médio)
  pedido_bar:           () => { playBeep(750, 180); setTimeout(() => playBeep(850, 180), 250) },
  // Garçom buscar no balcão/estoque próprio (beep duplo agudo)
  pedido_balcao:        () => { playBeep(800, 150); setTimeout(() => playBeep(950, 200), 220) },
  // Cancelamento (som grave)
  pedido_cancelado:     () => { playBeep(300, 300); setTimeout(() => playBeep(250, 400), 350) },
  default:              () => playBeep(660, 180),
}

let _timer   = null
let _lastIds = new Set()

const useNotifStore = create((set, get) => ({
  items:   [],
  unread:  0,
  open:    false,
  polling: false,
  muted:   false,

  toggleMute: () => set(s => ({ muted: !s.muted })),
  setOpen:    (v) => set({ open: v }),

  fetch: async () => {
    if (!localStorage.getItem('access_token')) return
    try {
      const { data } = await api.get('/api/notifications')
      const { items, unread } = data.data
      const newIds = new Set(items.map(n => n.id))
      const brand_new = items.filter(n => !_lastIds.has(n.id) && !n.lida)
      _lastIds = newIds

      if (brand_new.length > 0 && !get().muted) {
        const tipo = brand_new[0].tipo
        const beepFn = BEEPS[tipo] || BEEPS.default
        beepFn()
      }

      set({ items, unread })
    } catch { /* silencioso */ }
  },

  startPolling: () => {
    if (_timer) return
    get().fetch()
    _timer = setInterval(() => get().fetch(), 5000)
    set({ polling: true })
  },

  stopPolling: () => {
    if (_timer) { clearInterval(_timer); _timer = null }
    set({ polling: false })
  },

  markRead: async (id) => {
    try {
      await api.patch(`/api/notifications/${id}/read`)
      set(s => ({
        items:  s.items.map(n => n.id === id ? { ...n, lida: true } : n),
        unread: Math.max(0, s.unread - 1),
      }))
    } catch {}
  },

  markAllRead: async () => {
    try {
      await api.post('/api/notifications/read-all')
      set(s => ({ items: s.items.map(n => ({ ...n, lida: true })), unread: 0 }))
    } catch {}
  },

  chamarGarcom: async (mensagem) => {
    await api.post('/api/notifications/chamar-garcom', { mensagem })
  },

  chamarCaixa: async (mensagem) => {
    await api.post('/api/notifications/chamar-caixa', { mensagem })
  },
}))

export default useNotifStore
