/**
 * Copper Atlas — Reference Data Hooks
 * 全局铜矿床图谱 — 参考数据 Hooks
 */
'use client';

import { apiFetch } from '@/lib/api-client';
import type {
  ClassificationNode,
  CountryInfo,
  MineralInfo,
  StatusInfo,
  TimeScaleUnit,
} from '@/types/deposit';
import { useQuery } from '@tanstack/react-query';

const REF_STALE = 30 * 60_000;
const REF_GC = 60 * 60_000;

export function useCountries(mineral = 'copper') {
  return useQuery({
    queryKey: ['reference', 'countries', mineral],
    queryFn: ({ signal }) => apiFetch<CountryInfo[]>(`/countries?mineral=${mineral}`, { signal }),
    staleTime: REF_STALE,
    gcTime: REF_GC,
  });
}

export function useDepositTypes() {
  return useQuery({
    queryKey: ['reference', 'deposit-types'],
    queryFn: ({ signal }) =>
      apiFetch<ClassificationNode[]>('/reference?type=deposit-types', { signal }),
    staleTime: REF_STALE,
    gcTime: REF_GC,
  });
}

export function useTimeScale() {
  return useQuery({
    queryKey: ['reference', 'time-scale'],
    queryFn: ({ signal }) => apiFetch<TimeScaleUnit[]>('/reference?type=time-scale', { signal }),
    staleTime: REF_STALE,
    gcTime: REF_GC,
  });
}

export function useStatuses() {
  return useQuery({
    queryKey: ['reference', 'statuses'],
    queryFn: ({ signal }) => apiFetch<StatusInfo[]>('/reference?type=statuses', { signal }),
    staleTime: REF_STALE,
    gcTime: REF_GC,
  });
}

export function useMinerals() {
  return useQuery({
    queryKey: ['reference', 'minerals'],
    queryFn: ({ signal }) => apiFetch<MineralInfo[]>('/reference?type=minerals', { signal }),
    staleTime: REF_STALE,
    gcTime: REF_GC,
  });
}
