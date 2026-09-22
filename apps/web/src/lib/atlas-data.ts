import seed from '@/data/seed-v2.json';

type RawFeature = {
  type: 'Feature';
  id: string;
  geometry: { type: 'Point'; coordinates: [number, number] };
  properties: Record<string, unknown>;
};

type RawSeed = {
  type: 'FeatureCollection';
  features: RawFeature[];
};

export interface AtlasCountry {
  id: string;
  iso_code: string;
  iso_code_3: string;
  name_en: string;
  name_zh: string;
  continent: string;
  subregion: string;
}

export interface AtlasClassification {
  id: string;
  code: string;
  path: string;
  name_en: string;
  name_zh: string;
  parent_code: string | null;
  depth: number;
  description_en: string | null;
  tectonic_setting: string | null;
  sort_order: number;
}

export interface AtlasDeposit {
  id: string;
  slug: string;
  name: string;
  nameZh: string | null;
  longitude: number;
  latitude: number;
  countryIso: string;
  stateProvince: string | null;
  primaryMineral: string;
  secondaryMinerals: string[];
  depositTypeCode: string | null;
  tonnageMt: number | null;
  tonnageGradePct: number | null;
  tonnageConfidence: string | null;
  status: string;
  discoveryYear: number | null;
  productionStartYear: number | null;
  operatorCompany: string | null;
  miningMethod: string | null;
  hostRockType: string | null;
  hostRockAgeText: string | null;
  tectonicSetting: string | null;
  geologicalProvince: string | null;
  metallogenicBelt: string | null;
  summaryEn: string | null;
  dataSource: string | null;
  dataQualityScore: number | null;
  isFeatured: boolean;
  tags: string[];
  referenceDois: string[];
  lastVerifiedDate: string | null;
}

const COUNTRY_META: Record<string, Omit<AtlasCountry, 'id' | 'iso_code'>> = {
  AU: { iso_code_3: 'AUS', name_en: 'Australia', name_zh: '澳大利亚', continent: 'Oceania', subregion: 'Australia and New Zealand' },
  BR: { iso_code_3: 'BRA', name_en: 'Brazil', name_zh: '巴西', continent: 'South America', subregion: 'South America' },
  CA: { iso_code_3: 'CAN', name_en: 'Canada', name_zh: '加拿大', continent: 'North America', subregion: 'North America' },
  CD: { iso_code_3: 'COD', name_en: 'Democratic Republic of the Congo', name_zh: '刚果民主共和国', continent: 'Africa', subregion: 'Middle Africa' },
  CL: { iso_code_3: 'CHL', name_en: 'Chile', name_zh: '智利', continent: 'South America', subregion: 'South America' },
  CN: { iso_code_3: 'CHN', name_en: 'China', name_zh: '中国', continent: 'Asia', subregion: 'Eastern Asia' },
  DE: { iso_code_3: 'DEU', name_en: 'Germany', name_zh: '德国', continent: 'Europe', subregion: 'Western Europe' },
  ES: { iso_code_3: 'ESP', name_en: 'Spain', name_zh: '西班牙', continent: 'Europe', subregion: 'Southern Europe' },
  FI: { iso_code_3: 'FIN', name_en: 'Finland', name_zh: '芬兰', continent: 'Europe', subregion: 'Northern Europe' },
  ID: { iso_code_3: 'IDN', name_en: 'Indonesia', name_zh: '印度尼西亚', continent: 'Asia', subregion: 'South-eastern Asia' },
  IN: { iso_code_3: 'IND', name_en: 'India', name_zh: '印度', continent: 'Asia', subregion: 'Southern Asia' },
  IR: { iso_code_3: 'IRN', name_en: 'Iran', name_zh: '伊朗', continent: 'Asia', subregion: 'Southern Asia' },
  KZ: { iso_code_3: 'KAZ', name_en: 'Kazakhstan', name_zh: '哈萨克斯坦', continent: 'Asia', subregion: 'Central Asia' },
  LA: { iso_code_3: 'LAO', name_en: 'Laos', name_zh: '老挝', continent: 'Asia', subregion: 'South-eastern Asia' },
  MN: { iso_code_3: 'MNG', name_en: 'Mongolia', name_zh: '蒙古', continent: 'Asia', subregion: 'Eastern Asia' },
  MX: { iso_code_3: 'MEX', name_en: 'Mexico', name_zh: '墨西哥', continent: 'North America', subregion: 'Central America' },
  PA: { iso_code_3: 'PAN', name_en: 'Panama', name_zh: '巴拿马', continent: 'North America', subregion: 'Central America' },
  PE: { iso_code_3: 'PER', name_en: 'Peru', name_zh: '秘鲁', continent: 'South America', subregion: 'South America' },
  PG: { iso_code_3: 'PNG', name_en: 'Papua New Guinea', name_zh: '巴布亚新几内亚', continent: 'Oceania', subregion: 'Melanesia' },
  PH: { iso_code_3: 'PHL', name_en: 'Philippines', name_zh: '菲律宾', continent: 'Asia', subregion: 'South-eastern Asia' },
  PK: { iso_code_3: 'PAK', name_en: 'Pakistan', name_zh: '巴基斯坦', continent: 'Asia', subregion: 'Southern Asia' },
  PL: { iso_code_3: 'POL', name_en: 'Poland', name_zh: '波兰', continent: 'Europe', subregion: 'Eastern Europe' },
  PT: { iso_code_3: 'PRT', name_en: 'Portugal', name_zh: '葡萄牙', continent: 'Europe', subregion: 'Southern Europe' },
  RU: { iso_code_3: 'RUS', name_en: 'Russia', name_zh: '俄罗斯', continent: 'Europe', subregion: 'Eastern Europe' },
  SE: { iso_code_3: 'SWE', name_en: 'Sweden', name_zh: '瑞典', continent: 'Europe', subregion: 'Northern Europe' },
  US: { iso_code_3: 'USA', name_en: 'United States', name_zh: '美国', continent: 'North America', subregion: 'North America' },
  UZ: { iso_code_3: 'UZB', name_en: 'Uzbekistan', name_zh: '乌兹别克斯坦', continent: 'Asia', subregion: 'Central Asia' },
  ZM: { iso_code_3: 'ZMB', name_en: 'Zambia', name_zh: '赞比亚', continent: 'Africa', subregion: 'Eastern Africa' },
};

export const atlasCountries: AtlasCountry[] = Object.entries(COUNTRY_META)
  .map(([iso_code, meta]) => ({ id: iso_code, iso_code, ...meta }))
  .sort((a, b) => a.name_en.localeCompare(b.name_en));

const classification = (
  code: string,
  path: string,
  name_en: string,
  name_zh: string,
  parent_code: string | null,
  depth: number,
  sort_order: number,
  description_en: string | null = null,
): AtlasClassification => ({
  id: code,
  code,
  path,
  name_en,
  name_zh,
  parent_code,
  depth,
  description_en,
  tectonic_setting: null,
  sort_order,
});

export const atlasClassifications: AtlasClassification[] = [
  classification('POR', 'por', 'Porphyry', '斑岩型', null, 1, 1),
  classification('SED', 'sed', 'Sediment-hosted', '沉积岩容矿型', null, 1, 2),
  classification('VMS', 'vms', 'Volcanogenic Massive Sulfide (VMS)', '火山成因块状硫化物型', null, 1, 3),
  classification('IOCG', 'iocg', 'Iron Oxide Copper Gold (IOCG)', '铁氧化物铜金型', null, 1, 4),
  classification('SKN', 'skn', 'Skarn', '矽卡岩型', null, 1, 5),
  classification('EPI', 'epi', 'Epithermal', '浅成低温热液型', null, 1, 6),
  classification('MAG', 'mag', 'Magmatic Sulfide', '岩浆硫化物型', null, 1, 7),
  classification('OTH', 'oth', 'Other / Unclassified', '其他/未分类', null, 1, 99),
  classification('POR_CUMO', 'por.cumo', 'Porphyry Cu-Mo', '斑岩铜钼型', 'POR', 2, 1),
  classification('POR_CUAU', 'por.cuau', 'Porphyry Cu-Au', '斑岩铜金型', 'POR', 2, 2),
  classification('SED_SSC', 'sed.ssc', 'Sediment-hosted Stratiform Copper (SSC)', '沉积岩容矿层状铜矿', 'SED', 2, 1),
  classification('VMS_BM', 'vms.bm', 'VMS — Bimodal-Mafic', 'VMS 双峰-基性型', 'VMS', 2, 1),
  classification('VMS_BF', 'vms.bf', 'VMS — Bimodal-Felsic', 'VMS 双峰-酸性型', 'VMS', 2, 2),
  classification('SKN_CALC', 'skn.calc', 'Skarn — Calcic', '矽卡岩 钙质型', 'SKN', 2, 1),
  classification('IOCG_MAG', 'iocg.mag', 'IOCG — Magnetite-dominant', 'IOCG 磁铁矿主导型', 'IOCG', 2, 1),
  classification('IOCG_HEM', 'iocg.hem', 'IOCG — Hematite-dominant', 'IOCG 赤铁矿主导型', 'IOCG', 2, 2),
];

const classificationByCode = new Map(atlasClassifications.map((item) => [item.code, item]));
const countryByIso = new Map(atlasCountries.map((item) => [item.iso_code, item]));

function asString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function asNumber(value: unknown): number | null {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
}

function normalize(feature: RawFeature): AtlasDeposit {
  const p = feature.properties;
  const coordinates = feature.geometry.coordinates;
  return {
    id: feature.id,
    slug: feature.id,
    name: asString(p.name_en) || feature.id,
    nameZh: asString(p.name_zh),
    longitude: coordinates[0],
    latitude: coordinates[1],
    countryIso: asString(p.country_iso) || 'UN',
    stateProvince: asString(p.state_province),
    primaryMineral: asString(p.primary_mineral) || 'copper',
    secondaryMinerals: asStringArray(p.secondary_minerals),
    depositTypeCode: asString(p.deposit_type_code),
    tonnageMt: asNumber(p.tonnage_mt),
    tonnageGradePct: asNumber(p.tonnage_grade_pct),
    tonnageConfidence: asString(p.tonnage_confidence),
    status: asString(p.status) || 'unknown',
    discoveryYear: asNumber(p.discovery_year),
    productionStartYear: asNumber(p.production_start_year),
    operatorCompany: asString(p.operator_company),
    miningMethod: asString(p.mining_method),
    hostRockType: asString(p.host_rock_type),
    hostRockAgeText: asString(p.host_rock_age_text),
    tectonicSetting: asString(p.tectonic_setting),
    geologicalProvince: asString(p.geological_province),
    metallogenicBelt: asString(p.metallogenic_belt),
    summaryEn: asString(p.summary_en),
    dataSource: asString(p.data_source),
    dataQualityScore: asNumber(p.data_quality_score),
    isFeatured: p.is_featured === true,
    tags: asStringArray(p.tags),
    referenceDois: asStringArray(p.sources_doi),
    lastVerifiedDate: asString(p.last_verified_date),
  };
}

export const atlasDeposits: AtlasDeposit[] = ((seed as unknown as RawSeed).features || []).map(normalize);

export function findCountry(iso: string | null | undefined): AtlasCountry | null {
  return iso ? countryByIso.get(iso) || null : null;
}

export function findClassification(code: string | null | undefined): AtlasClassification | null {
  return code ? classificationByCode.get(code) || null : null;
}

export function findAtlasDeposit(key: string): AtlasDeposit | null {
  const normalized = decodeURIComponent(key).toLowerCase();
  return (
    atlasDeposits.find((deposit) => deposit.slug.toLowerCase() === normalized) ||
    atlasDeposits.find((deposit) => deposit.id.toLowerCase() === normalized) ||
    null
  );
}

export function toDepositProperties(deposit: AtlasDeposit, detail = false): Record<string, unknown> {
  const country = findCountry(deposit.countryIso);
  const depositType = findClassification(deposit.depositTypeCode);
  const shared = {
    id: deposit.id,
    name: deposit.name,
    name_zh: deposit.nameZh,
    slug: deposit.slug,
    primary_mineral: deposit.primaryMineral,
    secondary_minerals: deposit.secondaryMinerals,
    status: deposit.status,
    country_iso: deposit.countryIso,
    country_name_en: country?.name_en || deposit.countryIso,
    country_name_zh: country?.name_zh || null,
    state_province: deposit.stateProvince,
    tonnage_mt: deposit.tonnageMt,
    tonnage_grade_pct: deposit.tonnageGradePct,
    tonnage_confidence: deposit.tonnageConfidence,
    discovery_year: deposit.discoveryYear,
    production_start_year: deposit.productionStartYear,
    operator_company: deposit.operatorCompany,
    mining_method: deposit.miningMethod,
    host_rock_type: deposit.hostRockType,
    host_rock_age_text: deposit.hostRockAgeText,
    tectonic_setting: deposit.tectonicSetting,
    geological_province: deposit.geologicalProvince,
    metallogenic_belt: deposit.metallogenicBelt,
    summary_en: deposit.summaryEn,
    data_source: deposit.dataSource,
    data_quality_score: deposit.dataQualityScore,
    is_featured: deposit.isFeatured,
    tags: deposit.tags,
    reference_dois: deposit.referenceDois,
    last_verified_date: deposit.lastVerifiedDate,
    deposit_type_code: deposit.depositTypeCode,
    deposit_type_name_en: depositType?.name_en || deposit.depositTypeCode,
    deposit_type_name_zh: depositType?.name_zh || null,
    deposit_type_path: depositType?.path || null,
  };

  if (!detail) return shared;

  return {
    ...shared,
    alternative_names: [],
    longitude: deposit.longitude,
    latitude: deposit.latitude,
    elevation_m: null,
    source_srid: 4326,
    tonnage_mt_low: null,
    tonnage_mt_high: null,
    tonnage_cutoff_pct: null,
    proven_mt: null,
    probable_mt: null,
    measured_mt: null,
    indicated_mt: null,
    inferred_mt: null,
    production_end_year: null,
    owner_companies: [],
    mineralization_age_ma: null,
    mineralization_age_error_ma: null,
    mineralization_age_method: null,
    summary_zh: null,
    geology_en: null,
    geology_zh: null,
    data_source_url: null,
    images: [],
    documents: [],
    properties: {},
  };
}

export function toDepositFeature(deposit: AtlasDeposit, detail = false) {
  return {
    type: 'Feature' as const,
    id: deposit.slug,
    geometry: { type: 'Point' as const, coordinates: [deposit.longitude, deposit.latitude] as [number, number] },
    properties: toDepositProperties(deposit, detail),
  };
}

