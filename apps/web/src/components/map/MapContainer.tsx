/**
 * Copper Atlas — Map Container
 *
 * Basemap switching: changes ONLY the raster tile URL.
 * Style/sources/layers are NEVER destroyed.
 * All copper layers (cluster, circle, label, hover, click) survive every basemap switch.
 */
'use client';

import { useTranslations } from '@/lib/i18n';
import { useFilterStore } from '@/stores/filterStore';
import { type ClusterMetric, useMapStore } from '@/stores/mapStore';
import { useUIStore } from '@/stores/uiStore';
import maplibregl from 'maplibre-gl';
import type { GeoJSONSource, Map } from 'maplibre-gl';
import { useCallback, useEffect, useRef, useState } from 'react';

const API_BASE = '/api/v1';
const MAP_DATA_LIMIT = 5000;
const CLUSTER_MAX_ZOOM = 12;
const CLUSTER_RADIUS = 45;

const BASEMAP_TILES: Record<string, { tiles: string[]; attribution: string }> = {
  osm: {
    tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
    attribution: '© OpenStreetMap',
  },
  satellite: {
    tiles: [
      'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    ],
    attribution: '© Esri',
  },
  terrain: {
    tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
    attribution: '© OpenStreetMap',
  },
  dark: {
    tiles: ['https://basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png'],
    attribution: '© CARTO',
  },
};

function clusterRadiusByMetric(metric: ClusterMetric): any {
  if (metric === 'tonnage') {
    return [
      'interpolate',
      ['linear'],
      ['ln', ['max', ['coalesce', ['get', 'total_tonnage_mt'], 1], 1]],
      0,
      14,
      Math.log(10),
      18,
      Math.log(100),
      25,
      Math.log(1000),
      34,
    ];
  }
  return ['step', ['get', 'point_count'], 14, 10, 22, 50, 30];
}

function clusterLabelByMetric(metric: ClusterMetric): any {
  if (metric === 'tonnage') {
    return [
      'case',
      ['>', ['coalesce', ['get', 'total_tonnage_mt'], 0], 0],
      ['concat', ['number-format', ['get', 'total_tonnage_mt'], { 'max-fraction-digits': 0 }], ' Mt'],
      '{point_count_abbreviated}',
    ];
  }
  return '{point_count_abbreviated}';
}

function radiusByTonnage(levels: readonly [number, number, number, number, number]): any {
  return [
    'interpolate',
    ['linear'],
    ['ln', ['max', ['coalesce', ['get', 'tonnage_mt'], 1], 1]],
    0,
    levels[0],
    Math.log(3),
    levels[1],
    Math.log(10),
    levels[2],
    Math.log(50),
    levels[3],
    Math.log(150),
    levels[4],
  ];
}
/** Create copper deposit layers on the map. Called exactly once on map load. */
function addCopperLayers(map: Map) {
  // Shared GeoJSON source with clustering
  map.addSource('copper-deposits-geojson', {
    type: 'geojson',
    data: { type: 'FeatureCollection', features: [] },
    cluster: true,
    clusterMaxZoom: CLUSTER_MAX_ZOOM,
    clusterRadius: CLUSTER_RADIUS,
    clusterProperties: {
      total_tonnage_mt: ['+', ['coalesce', ['get', 'tonnage_mt'], 0]],
      producing_count: ['+', ['case', ['==', ['get', 'status'], 'production'], 1, 0]],
    },
  });

  // Cluster circles
  map.addLayer({
    id: 'copper-clusters',
    type: 'circle',
    source: 'copper-deposits-geojson',
    filter: ['has', 'point_count'],
    paint: {
      'circle-radius': clusterRadiusByMetric('count'),
      'circle-color': '#E74C3C',
      'circle-opacity': 0.7,
      'circle-stroke-width': 2,
      'circle-stroke-color': '#fff',
    },
  });
  // Cluster count labels
  map.addLayer({
    id: 'copper-cluster-count',
    type: 'symbol',
    source: 'copper-deposits-geojson',
    filter: ['has', 'point_count'],
    layout: {
      'text-field': clusterLabelByMetric('count'),
      'text-font': ['Open Sans Semibold'],
      'text-size': 13,
    },
    paint: { 'text-color': '#fff' },
  });
  // Individual deposit circles
  map.addLayer({
    id: 'copper-deposits-circle',
    type: 'circle',
    source: 'copper-deposits-geojson',
    filter: ['!', ['has', 'point_count']],
    paint: {
      'circle-radius': [
        'interpolate',
        ['linear'],
        ['zoom'],
        2,
        radiusByTonnage([2.5, 3, 6, 10, 14]),
        8,
        radiusByTonnage([4, 5, 9, 14, 19]),
        16,
        radiusByTonnage([7, 8, 13, 20, 26]),
      ],
      'circle-color': [
        'match',
        ['get', 'deposit_type_code'],
        'POR',
        '#E74C3C',
        'POR_CUMO',
        '#E74C3C',
        'POR_CUAU',
        '#C0392B',
        'POR_AU',
        '#C0392B',
        'SED',
        '#3498DB',
        'SED_SSC',
        '#2980B9',
        'SED_SEDEX',
        '#2980B9',
        'VMS',
        '#9B59B6',
        'VMS_BM',
        '#9B59B6',
        'VMS_BF',
        '#9B59B6',
        'VMS_PM',
        '#9B59B6',
        'IOCG',
        '#E67E22',
        'IOCG_HEM',
        '#D35400',
        'IOCG_MAG',
        '#D35400',
        'SKN',
        '#2ECC71',
        'SKN_CALC',
        '#27AE60',
        'SKN_MAG',
        '#27AE60',
        'EPI',
        '#F39C12',
        'EPI_HS',
        '#E67E22',
        'EPI_LS',
        '#F1C40F',
        'EPI_IS',
        '#F39C12',
        'MAG',
        '#1ABC9C',
        '#95A5A6',
      ],
      'circle-opacity': 0.85,
      'circle-stroke-width': 1.5,
      'circle-stroke-color': '#fff',
    },
  });
  // Name labels
  map.addLayer({
    id: 'copper-deposit-labels',
    type: 'symbol',
    source: 'copper-deposits-geojson',
    filter: ['!', ['has', 'point_count']],
    minzoom: 5,
    layout: {
      'text-field': ['get', 'name'],
      'text-font': ['Open Sans Regular'],
      'text-size': 10,
      'text-offset': [0, 1.5],
      'text-anchor': 'top',
    },
    paint: { 'text-color': '#333', 'text-halo-color': '#fff', 'text-halo-width': 2 },
  });
}

export function MapContainer() {
  const mapRef = useRef<Map | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const t = useTranslations('map');
  const [mapReady, setMapReady] = useState(false);
  const bboxRef = useRef<[number, number, number, number] | null>(null);
  const lastFetchRef = useRef<string>('');
  const fetchAbortRef = useRef<AbortController | null>(null);
  const loadDepositsRef = useRef<() => void>(() => {});

  const filters = useFilterStore();
  const { setBbox, setViewport, selectDeposit, setMapLoaded, setMapError, basemap, clusterMetric } =
    useMapStore();
  const { openDetailPanel } = useUIStore();

  // Track current basemap for tile URL updates (avoids stale closure)
  const basemapRef = useRef(basemap);
  const appliedBasemapRef = useRef(basemap);
  basemapRef.current = basemap;

  const buildApiUrl = useCallback(() => {
    const p = new URLSearchParams();
    p.set('mineral', filters.mineral);
    p.set('size', String(MAP_DATA_LIMIT));
    if (bboxRef.current) p.set('bbox', bboxRef.current.join(','));
    if (filters.countryIsos.length) p.set('country', filters.countryIsos.join(','));
    if (filters.statuses.length) p.set('status', filters.statuses.join(','));
    if (filters.depositTypePaths.length) p.set('deposit_type', filters.depositTypePaths.join(','));
    if (filters.tonnageRange[0] > 0) p.set('min_tonnage', String(filters.tonnageRange[0]));
    if (filters.tonnageRange[1] < 200) p.set('max_tonnage', String(filters.tonnageRange[1]));
    if (filters.gradeRange[0] > 0) p.set('min_grade', String(filters.gradeRange[0]));
    if (filters.gradeRange[1] < 5) p.set('max_grade', String(filters.gradeRange[1]));
    if (filters.searchQuery) p.set('search', filters.searchQuery);
    return `${API_BASE}/deposits?${p}`;
  }, [filters]);

  const loadDeposits = useCallback(async () => {
    if (!mapRef.current) return;
    const src = mapRef.current.getSource('copper-deposits-geojson') as GeoJSONSource | undefined;
    if (!src) return;
    const url = buildApiUrl();
    if (url === lastFetchRef.current) return;

    fetchAbortRef.current?.abort();
    const controller = new AbortController();
    fetchAbortRef.current = controller;
    lastFetchRef.current = url;

    try {
      const res = await fetch(url, { signal: controller.signal });
      if (!res.ok) return;
      const data = await res.json();
      if (controller.signal.aborted) return;
      src.setData({
        type: 'FeatureCollection',
        features: (data.features || []).filter((f: any) => f.geometry?.coordinates),
      });
    } catch (error) {
      if ((error as Error).name !== 'AbortError') lastFetchRef.current = '';
    }
  }, [buildApiUrl]);

  useEffect(() => {
    loadDepositsRef.current = loadDeposits;
  }, [loadDeposits]);

  // ---- INIT (runs once) ----
  useEffect(() => {
    if (!containerRef.current) return;
    let map: Map | null = null;
    let moveEndTimer: ReturnType<typeof setTimeout> | undefined;

    (async () => {
      try {
        map = new maplibregl.Map({
          container: containerRef.current!,
          // Start with a single raster source for the basemap
          style: {
            version: 8,
            glyphs: 'https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf',
            sources: {
              basemap: {
                type: 'raster',
                tiles: BASEMAP_TILES.osm.tiles,
                tileSize: 256,
                attribution: BASEMAP_TILES.osm.attribution,
              },
            },
            layers: [{ id: 'basemap-layer', type: 'raster', source: 'basemap' }],
          },
          center: [0, 20],
          zoom: 2.5,
          minZoom: 1,
          maxZoom: 18,
          attributionControl: false,
          maxTileCacheSize: 200,
          fadeDuration: 100,
        });

        map.addControl(new maplibregl.NavigationControl({ showCompass: true }), 'top-right');
        map.addControl(new maplibregl.ScaleControl({ unit: 'metric' }), 'bottom-left');
        map.addControl(new maplibregl.AttributionControl({ compact: true }), 'bottom-right');

        map.once('style.load', () => {
          addCopperLayers(map!);
          setMapReady(true);
          setMapLoaded(true);
          loadDepositsRef.current();
        });

        map.on('moveend', () => {
          const currentMap = map;
          if (!currentMap) return;
          const b = currentMap.getBounds();
          bboxRef.current = [b.getWest(), b.getSouth(), b.getEast(), b.getNorth()];
          setBbox(bboxRef.current);
          const center = currentMap.getCenter();
          setViewport({
            center: [center.lng, center.lat],
            zoom: currentMap.getZoom(),
            bearing: currentMap.getBearing(),
            pitch: currentMap.getPitch(),
          });
          if (moveEndTimer) clearTimeout(moveEndTimer);
          moveEndTimer = setTimeout(() => loadDepositsRef.current(), 180);
        });

        map.once('idle', () => loadDepositsRef.current());

        map.on('click', 'copper-deposits-circle', (e) => {
          if (e.features?.[0]?.properties?.id) {
            selectDeposit(e.features[0].properties.id);
            openDetailPanel();
          }
        });
        map.on('click', 'copper-clusters', (e) => {
          const f = e.features?.[0];
          if (f?.properties?.cluster_id) {
            const s = map?.getSource('copper-deposits-geojson') as any;
            s.getClusterExpansionZoom(f.properties.cluster_id, (_: any, zoom: number) => {
              map?.flyTo({
                center: (f.geometry as any).coordinates,
                zoom: Math.min(zoom, 16),
                duration: 500,
              });
            });
          }
        });
        for (const layer of ['copper-deposits-circle', 'copper-clusters']) {
          const currentMap = map;
          if (!currentMap) continue;
          currentMap.on('mouseenter', layer, () => {
            currentMap.getCanvas().style.cursor = 'pointer';
          });
          currentMap.on('mouseleave', layer, () => {
            currentMap.getCanvas().style.cursor = '';
          });
        }

        mapRef.current = map;
        (window as any).__mapInstance = map;
      } catch {
        setMapError(true);
      }
    })();

    return () => {
      if (moveEndTimer) clearTimeout(moveEndTimer);
      fetchAbortRef.current?.abort();
      map?.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load data when map ready
  useEffect(() => {
    if (mapReady) loadDeposits();
  }, [mapReady, loadDeposits]);

  // ---- BASEMAP SWITCH — swap tiles, NOT style ----
  useEffect(() => {
    const m = mapRef.current;
    if (!m || !mapReady || appliedBasemapRef.current === basemap) return;
    const cfg = BASEMAP_TILES[basemap] || BASEMAP_TILES.osm;
    const src = m.getSource('basemap') as any;
    if (src?.setTiles) {
      src.setTiles(cfg.tiles);
      appliedBasemapRef.current = basemap;
      // attribution stays with the map, tiles are the only thing that changes
    }
  }, [basemap, mapReady]);

  useEffect(() => {
    const m = mapRef.current;
    if (!m || !mapReady || !m.getLayer('copper-clusters')) return;
    m.setPaintProperty('copper-clusters', 'circle-radius', clusterRadiusByMetric(clusterMetric));
    m.setLayoutProperty('copper-cluster-count', 'text-field', clusterLabelByMetric(clusterMetric));
    m.setLayoutProperty('copper-cluster-count', 'text-size', clusterMetric === 'tonnage' ? 11 : 13);
  }, [clusterMetric, mapReady]);

  // Reload data when filters change
  useEffect(() => {
    if (mapReady) {
      lastFetchRef.current = '';
      loadDepositsRef.current();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 h-full w-full"
      role="application"
      aria-label={t('mapApplication')}
    />
  );
}
