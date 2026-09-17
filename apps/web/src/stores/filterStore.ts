/**
 * Copper Atlas — Filter State Store (Zustand)
 * 全局铜矿床图谱 — 筛选状态管理
 *
 * Central filter state for the map/search panel.
 * Persisted to localStorage for session continuity.
 * URL-synced for shareable filtered views.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type MineralCategory = 'copper' | 'gold' | 'iron' | 'lithium';
export type DepositStatus =
  | 'exploration'
  | 'feasibility'
  | 'development'
  | 'production'
  | 'suspended'
  | 'closed'
  | 'depleted'
  | 'unknown';

export interface FilterState {
  // Active filters
  mineral: MineralCategory;
  countryIsos: string[];
  depositTypePaths: string[]; // ltree paths for hierarchical filtering
  statuses: DepositStatus[];
  tonnageRange: [number, number]; // [min, max] in Mt
  gradeRange: [number, number]; // [min, max] in %
  mineralizationAgeRange: [number, number] | null; // [min, max] in Ma
  searchQuery: string;
  classificationCode: string | null; // Specific classification code filter

  // Computed values (selector-based)
  isAnyFilterActive: () => boolean;
  activeFilterCount: () => number;
  resetFilters: () => void;
}

// Default range values
const DEFAULT_TONNAGE_RANGE: [number, number] = [0, 200];
const DEFAULT_GRADE_RANGE: [number, number] = [0, 5];

export const useFilterStore = create<FilterState>()(
  persist(
    (set, get) => ({
      // Initial state
      mineral: 'copper',
      countryIsos: [],
      depositTypePaths: [],
      statuses: [],
      tonnageRange: DEFAULT_TONNAGE_RANGE,
      gradeRange: DEFAULT_GRADE_RANGE,
      mineralizationAgeRange: null,
      searchQuery: '',
      classificationCode: null,

      // Computed helpers
      isAnyFilterActive: () => {
        const s = get();
        return (
          s.countryIsos.length > 0 ||
          s.depositTypePaths.length > 0 ||
          s.statuses.length > 0 ||
          s.tonnageRange[0] > DEFAULT_TONNAGE_RANGE[0] ||
          s.tonnageRange[1] < DEFAULT_TONNAGE_RANGE[1] ||
          s.gradeRange[0] > DEFAULT_GRADE_RANGE[0] ||
          s.gradeRange[1] < DEFAULT_GRADE_RANGE[1] ||
          s.mineralizationAgeRange !== null ||
          s.searchQuery !== '' ||
          s.classificationCode !== null
        );
      },

      activeFilterCount: () => {
        const s = get();
        let count = 0;
        if (s.countryIsos.length > 0) count += 1;
        if (s.depositTypePaths.length > 0) count += s.depositTypePaths.length;
        if (s.statuses.length > 0) count += s.statuses.length;
        if (s.tonnageRange[0] > DEFAULT_TONNAGE_RANGE[0]) count += 1;
        if (s.tonnageRange[1] < DEFAULT_TONNAGE_RANGE[1]) count += 1;
        if (s.gradeRange[0] > DEFAULT_GRADE_RANGE[0]) count += 1;
        if (s.gradeRange[1] < DEFAULT_GRADE_RANGE[1]) count += 1;
        if (s.mineralizationAgeRange !== null) count += 1;
        if (s.searchQuery !== '') count += 1;
        if (s.classificationCode !== null) count += 1;
        return count;
      },

      resetFilters: () =>
        set({
          countryIsos: [],
          depositTypePaths: [],
          statuses: [],
          tonnageRange: DEFAULT_TONNAGE_RANGE,
          gradeRange: DEFAULT_GRADE_RANGE,
          mineralizationAgeRange: null,
          searchQuery: '',
          classificationCode: null,
        }),
    }),
    {
      name: 'copper-atlas-filters',
      partialize: (state) => ({
        mineral: state.mineral,
        // Don't persist search query or ranges (they're transient)
        countryIsos: state.countryIsos,
        depositTypePaths: state.depositTypePaths,
        statuses: state.statuses,
      }),
    },
  ),
);
