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
    tiles: ['https://tile.openstreetmap.de/{z}/{x}/{y}.png'],
    attribution: '© OpenStreetMap contributors',
  },
  satellite: {
    tiles: [
      'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    ],
    attribution: '© Esri',
  },
  terrain: {
    tiles: [
      'https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}',
    ],
    attribution: '© Esri',
  },
  dark: {
    tiles: ['https://tile.openstreetmap.de/{z}/{x}/{y}.png'],
    attribution: '© OpenStreetMap contributors',
  },
};

function padBbox(
  bbox: [number, number, number, number],
  ratio = 0.18,
): [number, number, number, number] {
  const [west, south, east, north] = bbox;
  const xPad = Math.max((east - west) * ratio, 0.01);
  const yPad = Math.max((north - south) * ratio, 0.01);
  return [west - xPad, south - yPad, east + xPad, north + yPad];
}

function depositTypeColor(): any {
  return [
    'match',
    ['get', 'deposit_type_code'],
    'POR', '#E74C3C',
    'POR_CUMO', '#E74C3C',
    'POR_CUAU', '#C0392B',
    'POR_AU', '#C0392B',
    'SED', '#3498DB',
    'SED_SSC', '#2980B9',
    'SED_SEDEX', '#2980B9',
    'VMS', '#9B59B6',
    'VMS_BM', '#9B59B6',
    'VMS_BF', '#9B59B6',
    'VMS_PM', '#9B59B6',
    'IOCG', '#E67E22',
    'IOCG_HEM', '#D35400',
    'IOCG_MAG', '#D35400',
    'SKN', '#2ECC71',
    'SKN_CALC', '#27AE60',
    'SKN_MAG', '#27AE60',
    'EPI', '#F39C12',
    'EPI_HS', '#E67E22',
    'EPI_LS', '#F1C40F',
    'EPI_IS', '#F39C12',
    'MAG', '#1ABC9C',
    '#95A5A6',
  ];
}

function pointRadiusByTonnage(): any {
  return [
    'interpolate',
    ['linear'],
    ['ln', ['max', ['coalesce', ['get', 'tonnage_mt'], 1], 1]],
    0,
    4,
    Math.log(3),
    6,
    Math.log(10),
    9,
    Math.log(50),
    14,
    Math.log(150),
    20,
  ];
}

function clusterTypeCount(codes: string[]): any {
  const args: any[] = [];
  for (const code of codes) {
    args.push(['==', ['get', 'deposit_type_code'], code], 1);
  }
  args.push(0);
  return ['+', ['case', ...args]];
}

function clusterDominantTypeColor(): any {
  const maxOther = ['max', ['get', 'sediment_count'], ['get', 'vms_count'], ['get', 'iocg_count'], ['get', 'skarn_count'], ['get', 'epithermal_count'], ['get', 'magmatic_count']];
  const maxSkarn = ['max', ['get', 'skarn_count'], ['get', 'epithermal_count'], ['get', 'magmatic_count']];
  const maxIocg = ['max', ['get', 'iocg_count'], ['get', 'skarn_count'], ['get', 'epithermal_count'], ['get', 'magmatic_count']];
  const maxVms = ['max', ['get', 'vms_count'], ['get', 'iocg_count'], ['get', 'skarn_count'], ['get', 'epithermal_count'], ['get', 'magmatic_count']];
  const maxSediment = ['max', ['get', 'sediment_count'], ['get', 'vms_count'], ['get', 'iocg_count'], ['get', 'skarn_count'], ['get', 'epithermal_count'], ['get', 'magmatic_count']];
  const maxEpithermal = ['max', ['get', 'epithermal_count'], ['get', 'magmatic_count']];
  return [
    'case',
    ['>=', ['get', 'porphyry_count'], maxOther], '#E74C3C',
    ['>=', ['get', 'sediment_count'], maxSediment], '#2980B9',
    ['>=', ['get', 'vms_count'], maxVms], '#9B59B6',
    ['>=', ['get', 'iocg_count'], maxIocg], '#D35400',
    ['>=', ['get', 'skarn_count'], maxSkarn], '#27AE60',
    ['>=', ['get', 'epithermal_count'], maxEpithermal], '#F39C12',
    ['>', ['get', 'magmatic_count'], 0], '#1ABC9C',
    '#95A5A6',
  ];
}

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
  map.addSource('world-reference', {
    type: 'vector',
    url: 'https://demotiles.maplibre.org/tiles/tiles.json',
  });
  map.addLayer({
    id: 'world-country-boundaries',
    type: 'line',
    source: 'world-reference',
    'source-layer': 'countries',
    minzoom: 1,
    paint: {
      'line-color': 'rgba(255,255,255,0.72)',
      'line-width': ['interpolate', ['linear'], ['zoom'], 1, 1, 4, 1.6, 8, 2.2],
      'line-opacity': 0.85,
    },
    layout: { 'line-cap': 'round', 'line-join': 'round', visibility: 'none' },
  });
  map.addLayer({
    id: 'world-country-labels',
    type: 'symbol',
    source: 'world-reference',
    'source-layer': 'centroids',
    minzoom: 1.5,
    maxzoom: 7,
    layout: {
      'text-field': ['coalesce', ['get', 'NAME'], ['get', 'ABBREV']],
      'text-font': ['Open Sans Semibold'],
      'text-size': ['interpolate', ['linear'], ['zoom'], 1.5, 9, 4, 11, 6, 13],
      'text-max-width': 8,
      'text-padding': 3,
      visibility: 'none',
    },
    paint: {
      'text-color': '#ffffff',
      'text-halo-color': 'rgba(0,0,0,0.68)',
      'text-halo-width': 1.4,
    },
  });

  map.addSource('copper-deposits-geojson', {
    type: 'geojson',
    data: { type: 'FeatureCollection', features: [] },
    cluster: true,
    clusterMaxZoom: CLUSTER_MAX_ZOOM,
    clusterRadius: CLUSTER_RADIUS,
    clusterProperties: {
      total_tonnage_mt: ['+', ['coalesce', ['get', 'tonnage_mt'], 0]],
      producing_count: ['+', ['case', ['==', ['get', 'status'], 'production'], 1, 0]],
      porphyry_count: clusterTypeCount(['POR', 'POR_CUMO', 'POR_CUAU']),
      sediment_count: clusterTypeCount(['SED', 'SED_SSC', 'SED_SEDEX']),
      vms_count: clusterTypeCount(['VMS', 'VMS_BM', 'VMS_BF', 'VMS_PM']),
      iocg_count: clusterTypeCount(['IOCG', 'IOCG_MAG', 'IOCG_HEM']),
      skarn_count: clusterTypeCount(['SKN', 'SKN_CALC', 'SKN_MAG']),
      epithermal_count: clusterTypeCount(['EPI', 'EPI_HS', 'EPI_LS', 'EPI_IS']),
      magmatic_count: clusterTypeCount(['MAG']),
    },
  });

  map.addLayer({
    id: 'copper-clusters',
    type: 'circle',
    source: 'copper-deposits-geojson',
    filter: ['has', 'point_count'],
    paint: {
      'circle-radius': clusterRadiusByMetric('count'),
      'circle-color': clusterDominantTypeColor(),
      'circle-opacity': 0.78,
      'circle-stroke-width': 2,
      'circle-stroke-color': '#fff',
    },
  });
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
}


const MARKER_TYPE_COLORS: Record<string, string> = {
  POR: '#E74C3C',
  POR_CUMO: '#E74C3C',
  POR_CUAU: '#C0392B',
  POR_AU: '#C0392B',
  SED: '#3498DB',
  SED_SSC: '#2980B9',
  SED_SEDEX: '#2980B9',
  VMS: '#9B59B6',
  VMS_BM: '#9B59B6',
  VMS_BF: '#9B59B6',
  VMS_PM: '#9B59B6',
  IOCG: '#E67E22',
  IOCG_HEM: '#D35400',
  IOCG_MAG: '#D35400',
  SKN: '#2ECC71',
  SKN_CALC: '#27AE60',
  SKN_MAG: '#27AE60',
  EPI: '#F39C12',
  EPI_HS: '#E67E22',
  EPI_LS: '#F1C40F',
  EPI_IS: '#F39C12',
  MAG: '#1ABC9C',
};

function markerSize(tonnage: number | null): number {
  if (tonnage === null || !Number.isFinite(tonnage) || tonnage <= 0) return 8;
  const scaled = Math.log(Math.max(tonnage, 3)) / Math.log(150);
  return Math.round(6 + Math.min(Math.max(scaled, 0), 1) * 14);
}

function markerColor(typeCode: string | null): string {
  return MARKER_TYPE_COLORS[typeCode || ''] || '#95A5A6';
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
  const markersRef = useRef<maplibregl.Marker[]>([]);
  const srcDataRef = useRef<GeoJSON.FeatureCollection>({
    type: 'FeatureCollection',
    features: [],
  });

  const filters = useFilterStore();
  const { setBbox, setViewport, selectDeposit, setMapLoaded, setMapError, basemap, clusterMetric } =
    useMapStore();
  const { openDetailPanel } = useUIStore();

  const renderHighZoomMarkers = useCallback(
    (map: Map, collection: GeoJSON.FeatureCollection) => {
      for (const marker of markersRef.current) marker.remove();
      markersRef.current = [];
      if (map.getZoom() < CLUSTER_MAX_ZOOM) return;

      for (const feature of collection.features) {
        const properties = feature.properties || {};
        const coordinates = feature.geometry?.type === 'Point'
          ? feature.geometry.coordinates
          : null;
        if (!coordinates) continue;

        const id = String(properties.id || feature.id || '');
        if (!id) continue;
        const tonnage = Number(properties.tonnage_mt);
        const size = markerSize(Number.isFinite(tonnage) ? tonnage : null);
        const element = document.createElement('button');
        element.type = 'button';
        element.className = 'copper-point-marker';
        element.setAttribute('aria-label', String(properties.name || id));
        element.title = String(properties.name || id);
        Object.assign(element.style, {
          width: `${size}px`,
          height: `${size}px`,
          padding: '0',
          borderRadius: '50%',
          backgroundColor: markerColor(properties.deposit_type_code as string | null),
          border: '1.5px solid #fff',
          boxShadow: '0 1px 4px rgba(0,0,0,.35)',
          cursor: 'pointer',
        });
        element.addEventListener('click', (event) => {
          event.stopPropagation();
          selectDeposit(id);
          openDetailPanel();
        });

        const marker = new maplibregl.Marker({ element, anchor: 'center' })
          .setLngLat(coordinates as [number, number])
          .addTo(map);
        markersRef.current.push(marker);
      }
    },
    [openDetailPanel, selectDeposit],
  );

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
      const collection = {
        type: 'FeatureCollection' as const,
        features: (data.features || []).filter((f: any) => f.geometry?.coordinates),
      };
      srcDataRef.current = collection;
      src.setData(collection);
      renderHighZoomMarkers(mapRef.current, collection);
    } catch (error) {
      if ((error as Error).name !== 'AbortError') lastFetchRef.current = '';
    }
  }, [buildApiUrl, renderHighZoomMarkers]);

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
              'basemap-osm': {
                type: 'raster',
                tiles: BASEMAP_TILES.osm.tiles,
                tileSize: 256,
                maxzoom: 20,
                attribution: BASEMAP_TILES.osm.attribution,
              },
              'basemap-satellite': {
                type: 'raster',
                tiles: BASEMAP_TILES.satellite.tiles,
                tileSize: 256,
                maxzoom: 19,
                attribution: BASEMAP_TILES.satellite.attribution,
              },
              'basemap-terrain': {
                type: 'raster',
                tiles: BASEMAP_TILES.terrain.tiles,
                tileSize: 256,
                maxzoom: 19,
                attribution: BASEMAP_TILES.terrain.attribution,
              },
              'basemap-dark': {
                type: 'raster',
                tiles: BASEMAP_TILES.dark.tiles,
                tileSize: 256,
                maxzoom: 20,
                attribution: BASEMAP_TILES.dark.attribution,
              },
            },
            layers: [
              { id: 'basemap-osm-layer', type: 'raster', source: 'basemap-osm' },
              {
                id: 'basemap-satellite-layer',
                type: 'raster',
                source: 'basemap-satellite',
                layout: { visibility: 'none' },
              },
              {
                id: 'basemap-terrain-layer',
                type: 'raster',
                source: 'basemap-terrain',
                layout: { visibility: 'none' },
              },
              {
                id: 'basemap-dark-layer',
                type: 'raster',
                source: 'basemap-dark',
                layout: { visibility: 'none' },
                paint: {
                  'raster-saturation': -1,
                  'raster-contrast': 0.16,
                  'raster-brightness-max': 0.58,
                },
              },
            ],
          },
          center: [0, 20],
          zoom: 2.5,
          minZoom: 1,
          maxZoom: 18,
          renderWorldCopies: false,
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
          bboxRef.current = padBbox([b.getWest(), b.getSouth(), b.getEast(), b.getNorth()]);
          setBbox(bboxRef.current);
          const center = currentMap.getCenter();
          setViewport({
            center: [center.lng, center.lat],
            zoom: currentMap.getZoom(),
            bearing: currentMap.getBearing(),
            pitch: currentMap.getPitch(),
          });
          renderHighZoomMarkers(currentMap, srcDataRef.current);
          if (moveEndTimer) clearTimeout(moveEndTimer);
          moveEndTimer = setTimeout(() => loadDepositsRef.current(), 180);
        });

        map.once('idle', () => loadDepositsRef.current());

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
        map.on('mousemove', (e) => {
          const currentMap = map;
          if (!currentMap || !currentMap.getLayer('copper-clusters')) return;
          const hit = currentMap.queryRenderedFeatures(e.point, {
            layers: ['copper-clusters'],
          });
          currentMap.getCanvas().style.cursor = hit.length ? 'pointer' : '';
        });

        mapRef.current = map;
        (window as any).__mapInstance = map;
      } catch {
        setMapError(true);
      }
    })();

    return () => {
      if (moveEndTimer) clearTimeout(moveEndTimer);
      fetchAbortRef.current?.abort();
      for (const marker of markersRef.current) marker.remove();
      markersRef.current = [];
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
    if (!m || !mapReady) return;
    for (const basemapId of Object.keys(BASEMAP_TILES)) {
      const layerId = `basemap-${basemapId}-layer`;
      if (m.getLayer(layerId)) {
        m.setLayoutProperty(layerId, 'visibility', basemapId === basemap ? 'visible' : 'none');
      }
    }
  }, [basemap, mapReady]);

  useEffect(() => {
    const m = mapRef.current;
    if (!m || !mapReady) return;
    const showReferenceOverlay = basemap === 'satellite';
    for (const layerId of ['world-country-boundaries', 'world-country-labels']) {
      if (m.getLayer(layerId)) {
        m.setLayoutProperty(layerId, 'visibility', showReferenceOverlay ? 'visible' : 'none');
      }
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
