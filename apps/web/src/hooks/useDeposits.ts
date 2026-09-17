/**
 * Copper Atlas — Deposit Data Hooks
 * 全局铜矿床图谱 — 矿床数据 Hooks
 *
 * TanStack Query hooks for deposit data fetching.
 * Handles caching, deduplication, background refetch, and optimistic updates.
 */

'use client';

import { apiFetch, buildQueryParams } from '@/lib/api-client';
import { useFilterStore } from '@/stores/filterStore';
import { useMapStore } from '@/stores/mapStore';
import type {
  DepositDetailProperties,
  DepositProperties,
  GeoJsonFeature,
  GeoJsonFeatureCollection,
  SearchResult,
} from '@/types/deposit';
import { keepPreviousData, useQuery } from '@tanstack/react-query';

// ============================================================================
// Constants
// ============================================================================

const STALE_TIME = 30_000; // 30s before data is considered stale
const GC_TIME = 5 * 60_000; // Garbage collect unused cache entries after 5 min
const REFETCH_INTERVAL = 60_000; // Background refetch every 60s for production dashboards

// ============================================================================
// useDeposits — Viewport-bounded deposit listing
// ============================================================================

/**
 * Fetch deposits visible in the current map viewport with active filters.
 * Only fetches when zoom >= 7 (detail view). At low zoom, tiles handle visualization.
 * Uses keepPreviousData for smooth transitions between filter/page changes.
 */
export function useDeposits() {
  const bbox = useMapStore((s) => s.bbox);
  const zoom = useMapStore((s) => s.viewport.zoom);
  const filters = useFilterStore();

  const enabled = zoom >= 7 && bbox !== null;

  return useQuery({
    queryKey: ['deposits', bbox, filters],
    queryFn: async ({ signal }) => {
      if (!bbox) return emptyCollection();

      const params = {
        bbox: bbox.join(','),
        mineral: filters.mineral,
        ...(filters.countryIsos.length && { country: filters.countryIsos }),
        ...(filters.depositTypePaths.length && { deposit_type: filters.depositTypePaths[0] }),
        ...(filters.statuses.length && { status: filters.statuses }),
        ...(filters.tonnageRange[0] > 0 && { min_tonnage: filters.tonnageRange[0] }),
        ...(filters.tonnageRange[1] < 200 && { max_tonnage: filters.tonnageRange[1] }),
        ...(filters.gradeRange[0] > 0 && { min_grade: filters.gradeRange[0] }),
        ...(filters.gradeRange[1] < 5 && { max_grade: filters.gradeRange[1] }),
        ...(filters.searchQuery && { search: filters.searchQuery }),
        size: 100,
      };

      return apiFetch<GeoJsonFeatureCollection<DepositProperties>>(
        `/deposits${buildQueryParams(params)}`,
        { signal },
      );
    },
    enabled,
    staleTime: STALE_TIME,
    gcTime: GC_TIME,
    placeholderData: keepPreviousData,
    refetchInterval: REFETCH_INTERVAL,
  });
}

// ============================================================================
// useDepositDetail — Single deposit by ID
// ============================================================================

export function useDepositDetail(depositId: string | null) {
  return useQuery({
    queryKey: ['deposit', depositId],
    queryFn: async ({ signal }) => {
      return apiFetch<GeoJsonFeature<DepositDetailProperties>>(`/deposits/${depositId}`, {
        signal,
      });
    },
    enabled: depositId !== null,
    staleTime: 60_000,
    gcTime: 10 * 60_000,
  });
}

// ============================================================================
// useNearbyDeposits — Deposits near a center point
// ============================================================================

export function useNearbyDeposits(depositId: string | null, radiusKm = 50, limit = 10) {
  return useQuery({
    queryKey: ['nearby', depositId, radiusKm],
    queryFn: async ({ signal }) => {
      return apiFetch<GeoJsonFeatureCollection<DepositProperties>>(
        `/deposits/${depositId}/nearby?radius_km=${radiusKm}&limit=${limit}`,
        { signal },
      );
    },
    enabled: depositId !== null,
    staleTime: 60_000,
    gcTime: 5 * 60_000,
  });
}

// ============================================================================
// useSearchDeposits — Full-text search
// ============================================================================

export function useSearchDeposits(query: string, enabled = true) {
  return useQuery({
    queryKey: ['search', query],
    queryFn: async ({ signal }) => {
      const params = new URLSearchParams({ q: query, limit: '10' });
      return apiFetch<SearchResult[]>(`/search?${params}`, { signal });
    },
    enabled: enabled && query.length >= 2,
    staleTime: 15_000,
    gcTime: 2 * 60_000,
  });
}

// ============================================================================
// useAutocomplete — Prefix-based autocomplete
// ============================================================================

export function useAutocomplete(prefix: string) {
  return useQuery({
    queryKey: ['autocomplete', prefix],
    queryFn: async ({ signal }) => {
      const params = new URLSearchParams({ q: prefix, limit: '5' });
      return apiFetch<SearchResult[]>(`/search/autocomplete?${params}`, { signal });
    },
    enabled: prefix.length >= 1,
    staleTime: 10_000,
    gcTime: 60_000,
  });
}

// ============================================================================
// Helpers
// ============================================================================

function emptyCollection(): GeoJsonFeatureCollection<DepositProperties> {
  return {
    type: 'FeatureCollection',
    features: [],
    meta: { total: 0, page: 1, size: 100, pages: 0 },
  };
}
