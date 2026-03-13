// src/store/preferencesStore.js
// Sincroniza com BD ao invés de localStorage

import { create } from 'zustand';
import api from '../services/api';

export const usePreferencesStore = create((set, get) => ({
  // Estado
  theme: 'dark',
  notifyUpdates: true,
  notifySales: true,
  notifyStock: true,
  currency: 'BRL',
  dateFormat: 'dd/MM/yyyy',
  sidebarCollapsed: false,
  compactMode: false,
  recentSearches: [],
  favoriteProducts: [],
  favoriteClients: [],
  customSettings: {},
  loading: false,
  
  // Carregar do servidor
  loadPreferences: async (tenantId) => {
    try {
      set({ loading: true });
      const response = await api.get(`/preferences?tenant_id=${tenantId}`);
      
      if (response.data?.data) {
        const prefs = response.data.data;
        set({
          theme: prefs.theme || 'dark',
          notifyUpdates: prefs.notify_updates !== false,
          notifySales: prefs.notify_sales !== false,
          notifyStock: prefs.notify_stock !== false,
          currency: prefs.currency || 'BRL',
          dateFormat: prefs.date_format || 'dd/MM/yyyy',
          sidebarCollapsed: prefs.sidebar_collapsed || false,
          compactMode: prefs.compact_mode || false,
          recentSearches: prefs.recent_searches || [],
          favoriteProducts: prefs.favorite_products || [],
          favoriteClients: prefs.favorite_clients || [],
          customSettings: prefs.custom_settings || {},
        });
      }
    } catch (error) {
      console.error('Erro ao carregar preferências:', error);
    } finally {
      set({ loading: false });
    }
  },
  
  // Salvar tudo no servidor
  savePreferences: async (tenantId) => {
    try {
      const state = get();
      await api.post(`/preferences?tenant_id=${tenantId}`, {
        theme: state.theme,
        notify_updates: state.notifyUpdates,
        notify_sales: state.notifySales,
        notify_stock: state.notifyStock,
        currency: state.currency,
        date_format: state.dateFormat,
        sidebar_collapsed: state.sidebarCollapsed,
        compact_mode: state.compactMode,
        recent_searches: state.recentSearches,
        favorite_products: state.favoriteProducts,
        favorite_clients: state.favoriteClients,
        custom_settings: state.customSettings,
      });
    } catch (error) {
      console.error('Erro ao salvar preferências:', error);
    }
  },
  
  // Setters individuais (com auto-save)
  setTheme: async (theme, tenantId) => {
    set({ theme });
    if (tenantId) {
      await api.post(`/preferences/theme?tenant_id=${tenantId}`, { theme });
    }
  },
  
  setSidebarCollapsed: (collapsed, tenantId) => {
    set({ sidebarCollapsed: collapsed });
    if (tenantId) get().savePreferences(tenantId);
  },
  
  setCompactMode: (compact, tenantId) => {
    set({ compactMode: compact });
    if (tenantId) get().savePreferences(tenantId);
  },
  
  toggleNotify: (type, tenantId) => {
    const state = get();
    const updates = {};
    if (type === 'updates') updates.notifyUpdates = !state.notifyUpdates;
    if (type === 'sales') updates.notifySales = !state.notifySales;
    if (type === 'stock') updates.notifyStock = !state.notifyStock;
    set(updates);
    if (tenantId) get().savePreferences(tenantId);
  },
  
  addRecentSearch: (search, tenantId) => {
    const state = get();
    const updated = [search, ...state.recentSearches.filter(s => s !== search)].slice(0, 10);
    set({ recentSearches: updated });
    if (tenantId) get().savePreferences(tenantId);
  },
  
  addFavoriteProduct: async (productId, tenantId) => {
    const state = get();
    if (!state.favoriteProducts.includes(productId)) {
      const updated = [...state.favoriteProducts, productId];
      set({ favoriteProducts: updated });
      if (tenantId) {
        await api.post(`/preferences/favorites/products?tenant_id=${tenantId}`, { product_id: productId });
      }
    }
  },
  
  removeFavoriteProduct: (productId, tenantId) => {
    const state = get();
    const updated = state.favoriteProducts.filter(id => id !== productId);
    set({ favoriteProducts: updated });
    if (tenantId) get().savePreferences(tenantId);
  },
  
  clearAll: async (tenantId) => {
    set({
      theme: 'dark',
      notifyUpdates: true,
      notifySales: true,
      notifyStock: true,
      recentSearches: [],
      favoriteProducts: [],
      favoriteClients: [],
    });
    if (tenantId) await get().savePreferences(tenantId);
  },
}));
