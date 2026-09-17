/**
 * Copper Atlas — URL Search Params Sync
 * 全局铜矿床图谱 — URL 搜索参数同步
 *
 * Two-way sync between filterStore and URL search params.
 * Enables shareable filtered views: /en/map?country=CL,PE&status=production
 */

'use client';

import { type DepositStatus, useFilterStore } from '@/stores/filterStore';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useRef } from 'react';

export function useUrlSync() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const initializedRef = useRef(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  // Read URL → Store (on mount only)
  useEffect(() => {
    if (initializedRef.current) return;

    const countries = searchParams.get('country');
    const types = searchParams.get('deposit_type');
    const statuses = searchParams.get('status');
    const mineral = searchParams.get('mineral');
    const search = searchParams.get('search');
    const minT = searchParams.get('min_tonnage');
    const maxT = searchParams.get('max_tonnage');
    const minG = searchParams.get('min_grade');
    const maxG = searchParams.get('max_grade');

    if (countries) useFilterStore.setState({ countryIsos: countries.split(',') });
    if (types) useFilterStore.setState({ depositTypePaths: types.split(',') });
    if (statuses) useFilterStore.setState({ statuses: statuses.split(',') as DepositStatus[] });
    if (mineral) useFilterStore.setState({ mineral: mineral as 'copper' });
    if (search) useFilterStore.setState({ searchQuery: search });
    if (minT || maxT) {
      useFilterStore.setState({
        tonnageRange: [minT ? Number(minT) : 0, maxT ? Number(maxT) : 200],
      });
    }
    if (minG || maxG) {
      useFilterStore.setState({
        gradeRange: [minG ? Number(minG) : 0, maxG ? Number(maxG) : 5],
      });
    }

    initializedRef.current = true;
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Store → URL (on filter change, debounced 500ms)
  const syncToUrl = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(() => {
      const state = useFilterStore.getState();
      const params = new URLSearchParams();

      if (state.countryIsos.length) params.set('country', state.countryIsos.join(','));
      if (state.depositTypePaths.length)
        params.set('deposit_type', state.depositTypePaths.join(','));
      if (state.statuses.length) params.set('status', state.statuses.join(','));
      if (state.mineral !== 'copper') params.set('mineral', state.mineral);
      if (state.searchQuery) params.set('search', state.searchQuery);
      if (state.tonnageRange[0] > 0) params.set('min_tonnage', String(state.tonnageRange[0]));
      if (state.tonnageRange[1] < 200) params.set('max_tonnage', String(state.tonnageRange[1]));
      if (state.gradeRange[0] > 0) params.set('min_grade', String(state.gradeRange[0]));
      if (state.gradeRange[1] < 5) params.set('max_grade', String(state.gradeRange[1]));

      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    }, 500);
  }, [pathname, router]);

  useEffect(() => {
    if (!initializedRef.current) return;
    const unsub = useFilterStore.subscribe(syncToUrl);
    return () => {
      unsub();
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [syncToUrl]);
}
