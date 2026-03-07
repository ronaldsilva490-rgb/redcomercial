// src/hooks/usePreferences.js
// Hook customizado para acessar preferences com auto-sync

import { useEffect } from 'react';
import { usePreferencesStore } from '../store/preferencesStore';
import { useAuthStore } from '../store/authStore';

export function usePreferences() {
  const prefs = usePreferencesStore();
  const { tenant_id } = useAuthStore();
  
  // Carregar ao montar
  useEffect(() => {
    if (tenant_id) {
      prefs.loadPreferences(tenant_id);
    }
  }, [tenant_id]);
  
  return {
    theme: prefs.theme,
    setTheme: (t) => prefs.setTheme(t, tenant_id),
    
    sidebarCollapsed: prefs.sidebarCollapsed,
    toggleSidebar: () => prefs.setSidebarCollapsed(!prefs.sidebarCollapsed, tenant_id),
    
    compactMode: prefs.compactMode,
    toggleCompact: () => prefs.setCompactMode(!prefs.compactMode, tenant_id),
    
    notifyUpdates: prefs.notifyUpdates,
    notifySales: prefs.notifySales,
    notifyStock: prefs.notifyStock,
    toggleNotify: (type) => prefs.toggleNotify(type, tenant_id),
    
    recentSearches: prefs.recentSearches,
    addSearch: (s) => prefs.addRecentSearch(s, tenant_id),
    
    isFavorite: (id) => prefs.favoriteProducts.includes(id),
    addFavorite: (id) => prefs.addFavoriteProduct(id, tenant_id),
    removeFavorite: (id) => prefs.removeFavoriteProduct(id, tenant_id),
    
    loading: prefs.loading,
  };
}
