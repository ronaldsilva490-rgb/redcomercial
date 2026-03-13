/**
 * themeStore — Sistema de 3 Temas Globais v2.0
 * - Escuro Padrão (dark)
 * - Claro Moderno (light)
 * - RED Premium (red) — baseado no visual do AdminDashboard
 * Persiste no localStorage por user_id. Se não tiver user, usa tenant_id.
 */
import { create } from 'zustand'

export const THEMES = {
  dark: {
    id: 'dark',
    label: 'Escuro',
    emoji: '🌑',
    description: 'Modo noturno padrão. Elegante e confortável.',
    preview: ['#0D0D0F', '#111113', '#E8192C'],
    vars: {
      '--bg':       '#0D0D0F',
      '--bg2':      '#111113',
      '--bg3':      '#17171A',
      '--bg4':      '#1C1C20',
      '--border':   'rgba(255,255,255,0.07)',
      '--text':     '#F0F0F2',
      '--dim':      'rgba(240,240,242,0.7)',
      '--muted':    'rgba(240,240,242,0.35)',
      '--red':      '#E8192C',
      '--red-border':'rgba(232,25,44,0.35)',
      '--red-glow': 'rgba(232,25,44,0.1)',
      '--green':    '#22C55E',
      '--blue':     '#3B82F6',
      '--yellow':   '#F59E0B',
      '--accent':   '#E8192C',
      '--sidebar-bg': '#0A0A0C',
      '--card-shadow': '0 4px 24px rgba(0,0,0,0.4)',
    },
  },

  light: {
    id: 'light',
    label: 'Claro',
    emoji: '☀️',
    description: 'Modo diurno limpo. Ideal para ambientes iluminados.',
    preview: ['#F8F9FA', '#FFFFFF', '#E8192C'],
    vars: {
      '--bg':       '#F0F2F5',
      '--bg2':      '#FFFFFF',
      '--bg3':      '#F8F9FA',
      '--bg4':      '#EAECEF',
      '--border':   'rgba(0,0,0,0.09)',
      '--text':     '#111827',
      '--dim':      'rgba(17,24,39,0.75)',
      '--muted':    'rgba(17,24,39,0.45)',
      '--red':      '#DC2626',
      '--red-border':'rgba(220,38,38,0.3)',
      '--red-glow': 'rgba(220,38,38,0.07)',
      '--green':    '#16A34A',
      '--blue':     '#2563EB',
      '--yellow':   '#D97706',
      '--accent':   '#DC2626',
      '--sidebar-bg': '#FFFFFF',
      '--card-shadow': '0 2px 12px rgba(0,0,0,0.08)',
    },
  },

  red: {
    id: 'red',
    label: 'RED Premium',
    emoji: '🔴',
    description: 'Tema exclusivo RED. Escuro intenso com glow vermelho.',
    preview: ['#08060C', '#120008', '#C41217'],
    vars: {
      '--bg':       '#08060C',
      '--bg2':      '#0E0A12',
      '--bg3':      '#120010',
      '--bg4':      '#190012',
      '--border':   'rgba(196,18,23,0.18)',
      '--text':     '#F5F0FF',
      '--dim':      'rgba(245,240,255,0.75)',
      '--muted':    'rgba(245,240,255,0.38)',
      '--red':      '#C41217',
      '--red-border':'rgba(196,18,23,0.5)',
      '--red-glow': 'rgba(196,18,23,0.18)',
      '--green':    '#22C55E',
      '--blue':     '#60A5FA',
      '--yellow':   '#FBBF24',
      '--accent':   '#FF1A1A',
      '--sidebar-bg': '#05030A',
      '--card-shadow': '0 0 20px rgba(196,18,23,0.15), 0 8px 32px rgba(0,0,0,0.6)',
    },
  },
}

function applyTheme(vars) {
  const root = document.documentElement
  Object.entries(vars).forEach(([k, v]) => root.style.setProperty(k, v))
  // Aplica o atributo data-theme no body para seletores CSS
  document.body.setAttribute('data-theme', Object.keys(THEMES).find(
    id => THEMES[id].vars['--bg'] === vars['--bg']
  ) || 'dark')
}

function getStorageKey(userId, tenantId) {
  // Prioridade: por usuário. Fallback: por tenant. Fallback final: global.
  if (userId) return `theme_user_${userId}`
  if (tenantId) return `theme_tenant_${tenantId}`
  return 'theme_global'
}

const useThemeStore = create((set, get) => ({
  currentTheme: 'dark',

  init: (tenantId, userId) => {
    const key     = getStorageKey(userId, tenantId)
    const saved   = localStorage.getItem(key)
    const themeId = saved ? JSON.parse(saved).themeId : 'dark'
    const theme   = THEMES[themeId] || THEMES.dark
    applyTheme(theme.vars)
    set({ currentTheme: themeId })
  },

  setTheme: (themeId, tenantId, userId) => {
    const theme = THEMES[themeId]
    if (!theme) return
    applyTheme(theme.vars)
    const key = getStorageKey(userId, tenantId)
    localStorage.setItem(key, JSON.stringify({ themeId }))
    set({ currentTheme: themeId })
  },

  getTheme: () => THEMES[get().currentTheme] || THEMES.dark,
}))

export default useThemeStore
