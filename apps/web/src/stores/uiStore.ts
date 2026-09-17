/**
 * Copper Atlas — UI State Store (Zustand)
 * 全局铜矿床图谱 — UI 状态管理
 */

import { create } from 'zustand';

export interface UIState {
  // Panel visibility
  searchPanelOpen: boolean;
  detailPanelOpen: boolean;
  legendOpen: boolean;
  statisticsPanelOpen: boolean;

  // Mobile menu
  mobileMenuOpen: boolean;

  // Actions
  toggleSearchPanel: () => void;
  openDetailPanel: () => void;
  closeDetailPanel: () => void;
  toggleLegend: () => void;
  toggleMobileMenu: () => void;
  setStatisticsPanel: (open: boolean) => void;
}

export const useUIStore = create<UIState>()((set) => ({
  searchPanelOpen: true,
  detailPanelOpen: false,
  legendOpen: false,
  statisticsPanelOpen: false,
  mobileMenuOpen: false,

  toggleSearchPanel: () => set((state) => ({ searchPanelOpen: !state.searchPanelOpen })),

  openDetailPanel: () => set({ detailPanelOpen: true }),

  closeDetailPanel: () => set({ detailPanelOpen: false }),

  toggleLegend: () => set((state) => ({ legendOpen: !state.legendOpen })),

  toggleMobileMenu: () => set((state) => ({ mobileMenuOpen: !state.mobileMenuOpen })),

  setStatisticsPanel: (open) => set({ statisticsPanelOpen: open }),
}));
