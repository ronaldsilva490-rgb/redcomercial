/**
 * themeStore — Temas dinâmicos por tenant. v1.0
 * Persiste no localStorage por tenant_id + sincroniza CSS vars.
 */
import { create } from 'zustand'

export const THEMES = {
  dark_red: {
    id: 'dark_red', label: 'RED Dark', emoji: '🔴',
    vars: {
      '--bg':      '#0D0D0F', '--bg2': '#111113', '--bg3': '#17171A',
      '--bg4':     '#1C1C20', '--border': 'rgba(255,255,255,0.07)',
      '--text':    '#F0F0F2', '--dim': 'rgba(240,240,242,0.7)',
      '--muted':   'rgba(240,240,242,0.35)',
      '--red':     '#E8192C', '--red-border': 'rgba(232,25,44,0.35)',
      '--red-glow':'rgba(232,25,44,0.1)',
      '--green':   '#22C55E', '--blue': '#3B82F6',
      '--yellow':  '#F59E0B', '--accent': '#E8192C',
    },
  },
  dark_blue: {
    id: 'dark_blue', label: 'Azul Profundo', emoji: '🔵',
    vars: {
      '--bg':      '#080C14', '--bg2': '#0D1421', '--bg3': '#121A2B',
      '--bg4':     '#172035', '--border': 'rgba(59,130,246,0.12)',
      '--text':    '#E8F0FE', '--dim': 'rgba(232,240,254,0.7)',
      '--muted':   'rgba(232,240,254,0.35)',
      '--red':     '#3B82F6', '--red-border': 'rgba(59,130,246,0.35)',
      '--red-glow':'rgba(59,130,246,0.1)',
      '--green':   '#34D399', '--blue': '#60A5FA',
      '--yellow':  '#FBBF24', '--accent': '#3B82F6',
    },
  },
  dark_green: {
    id: 'dark_green', label: 'Matrix Verde', emoji: '🟢',
    vars: {
      '--bg':      '#020B02', '--bg2': '#061206', '--bg3': '#0A1A0A',
      '--bg4':     '#0F220F', '--border': 'rgba(34,197,94,0.12)',
      '--text':    '#DCFCE7', '--dim': 'rgba(220,252,231,0.7)',
      '--muted':   'rgba(220,252,231,0.35)',
      '--red':     '#22C55E', '--red-border': 'rgba(34,197,94,0.35)',
      '--red-glow':'rgba(34,197,94,0.08)',
      '--green':   '#4ADE80', '--blue': '#34D399',
      '--yellow':  '#FDE047', '--accent': '#22C55E',
    },
  },
  dark_purple: {
    id: 'dark_purple', label: 'Roxo Neon', emoji: '🟣',
    vars: {
      '--bg':      '#080510', '--bg2': '#0E0A1B', '--bg3': '#130F24',
      '--bg4':     '#1A1430', '--border': 'rgba(139,92,246,0.12)',
      '--text':    '#F0EAFF', '--dim': 'rgba(240,234,255,0.7)',
      '--muted':   'rgba(240,234,255,0.35)',
      '--red':     '#8B5CF6', '--red-border': 'rgba(139,92,246,0.35)',
      '--red-glow':'rgba(139,92,246,0.1)',
      '--green':   '#34D399', '--blue': '#60A5FA',
      '--yellow':  '#FCD34D', '--accent': '#8B5CF6',
    },
  },
  dark_gold: {
    id: 'dark_gold', label: 'Ouro Premium', emoji: '🌟',
    vars: {
      '--bg':      '#0A0800', '--bg2': '#130F00', '--bg3': '#1A1400',
      '--bg4':     '#231C00', '--border': 'rgba(245,158,11,0.12)',
      '--text':    '#FFFBEB', '--dim': 'rgba(255,251,235,0.7)',
      '--muted':   'rgba(255,251,235,0.35)',
      '--red':     '#F59E0B', '--red-border': 'rgba(245,158,11,0.35)',
      '--red-glow':'rgba(245,158,11,0.08)',
      '--green':   '#10B981', '--blue': '#60A5FA',
      '--yellow':  '#FCD34D', '--accent': '#F59E0B',
    },
  },
  light_clean: {
    id: 'light_clean', label: 'Claro Moderno', emoji: '☀️',
    vars: {
      '--bg':      '#F8F9FA', '--bg2': '#FFFFFF', '--bg3': '#F1F3F5',
      '--bg4':     '#E9ECEF', '--border': 'rgba(0,0,0,0.1)',
      '--text':    '#1A1A2E', '--dim': 'rgba(26,26,46,0.7)',
      '--muted':   'rgba(26,26,46,0.45)',
      '--red':     '#E8192C', '--red-border': 'rgba(232,25,44,0.3)',
      '--red-glow':'rgba(232,25,44,0.08)',
      '--green':   '#16A34A', '--blue': '#2563EB',
      '--yellow':  '#D97706', '--accent': '#E8192C',
    },
  },
}

function applyTheme(vars) {
  const root = document.documentElement
  Object.entries(vars).forEach(([k, v]) => root.style.setProperty(k, v))
}

function getStorageKey(tenantId) {
  return tenantId ? `theme_config_${tenantId}` : 'theme_config'
}

const useThemeStore = create((set, get) => ({
  currentTheme: 'dark_red',

  init: (tenantId) => {
    const key     = getStorageKey(tenantId)
    const saved   = localStorage.getItem(key)
    const themeId = saved ? JSON.parse(saved).themeId : 'dark_red'
    const theme   = THEMES[themeId] || THEMES.dark_red
    applyTheme(theme.vars)
    set({ currentTheme: themeId })
  },

  setTheme: (themeId, tenantId) => {
    const theme = THEMES[themeId]
    if (!theme) return
    applyTheme(theme.vars)
    const key = getStorageKey(tenantId)
    localStorage.setItem(key, JSON.stringify({ themeId }))
    set({ currentTheme: themeId })
  },

  getTheme: () => THEMES[get().currentTheme] || THEMES.dark_red,
}))

export default useThemeStore
