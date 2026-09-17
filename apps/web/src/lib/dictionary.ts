/**
 * Copper Atlas — Translation Dictionary
 *
 * Maps database codes to localized display strings.
 * ALL enum/classification fields translate through this dictionary.
 * Free-text fields (description, name) use _en/_zh suffix pattern.
 *
 * Usage: translate('status', 'production', 'zh') → '生产中'
 *        translate('deposit_type', 'POR_CUMO', 'en') → 'Porphyry Cu-Mo'
 */

import type { Locale } from './i18n';

// ============================================================================
// Translation tables — every enum code gets {en, zh}
// ============================================================================

const STATUS_DICT: Record<string, Record<Locale, string>> = {
  exploration: { en: 'Exploration', zh: '勘探' },
  feasibility: { en: 'Feasibility', zh: '可行性研究' },
  development: { en: 'Development', zh: '开发建设' },
  production: { en: 'Production', zh: '生产中' },
  suspended: { en: 'Suspended', zh: '暂停' },
  closed: { en: 'Closed', zh: '已关闭' },
  depleted: { en: 'Depleted', zh: '已采尽' },
  unknown: { en: 'Unknown', zh: '未知' },
};

const MINING_METHOD_DICT: Record<string, Record<Locale, string>> = {
  open_pit: { en: 'Open Pit', zh: '露天开采' },
  underground: { en: 'Underground', zh: '地下开采' },
  block_caving: { en: 'Block Caving', zh: '块体崩落法' },
  in_situ_leaching: { en: 'In-Situ Leaching', zh: '原地浸出' },
  'open-pit;block_caving': { en: 'Open Pit + Block Cave', zh: '露天+块体崩落' },
  'open-pit_underground': { en: 'Open Pit & Underground', zh: '露天+地下联合' },
};

const TECTONIC_SETTING_DICT: Record<string, Record<Locale, string>> = {
  continental_arc: { en: 'Continental Arc', zh: '大陆弧' },
  island_arc: { en: 'Island Arc', zh: '岛弧' },
  island_arc_collision: { en: 'Island Arc Collision', zh: '岛弧碰撞带' },
  back_arc_basin: { en: 'Back-Arc Basin', zh: '弧后盆地' },
  intracratonic_rif: { en: 'Intracratonic Rift', zh: '陆内裂谷' },
  intracratonic: { en: 'Intracratonic', zh: '陆内构造环境' },
  craton_margin: { en: 'Craton Margin', zh: '克拉通边缘' },
  continental_collision: { en: 'Continental Collision', zh: '大陆碰撞带' },
  large_igneous_province: { en: 'Large Igneous Province', zh: '大火成岩省' },
};

const GEOLOGICAL_PROVINCE_DICT: Record<string, Record<Locale, string>> = {
  central_andes: { en: 'Central Andes', zh: '中安第斯' },
  basin_and_range: { en: 'Basin and Range', zh: '盆岭省' },
  canadian_cordillera: { en: 'Canadian Cordillera', zh: '加拿大科迪勒拉' },
  sierra_madre_occidental: { en: 'Sierra Madre Occidental', zh: '西马德雷山脉' },
  central_african_copperbelt: { en: 'Central African Copperbelt', zh: '中非铜带' },
  gawler_craton: { en: 'Gawler Craton', zh: '高勒克拉通' },
  tibetan_plateau: { en: 'Tibetan Plateau', zh: '青藏高原' },
  siberian_craton: { en: 'Siberian Craton', zh: '西伯利亚克拉通' },
  central_asian_orogenic_belt: { en: 'Central Asian Orogenic Belt', zh: '中亚造山带' },
  tian_shan: { en: 'Tian Shan', zh: '天山' },
  mount_isa_inlier: { en: 'Mount Isa Inlier', zh: '芒特艾萨地块' },
  iberian_pyrite_belt: { en: 'Iberian Pyrite Belt', zh: '伊比利亚黄铁矿带' },
  fennoscandian_shield: { en: 'Fennoscandian Shield', zh: '芬诺斯坎迪亚地盾' },
  carajas_mineral_province: { en: 'Carajas Mineral Province', zh: '卡拉加斯成矿省' },
  chilean_iron_belt: { en: 'Chilean Iron Belt', zh: '智利铁成矿带' },
  papua_fold_belt: { en: 'Papua Fold Belt', zh: '巴布亚褶皱带' },
  yangtze_craton: { en: 'Yangtze Craton', zh: '扬子克拉通' },
  north_china_craton: { en: 'North China Craton', zh: '华北克拉通' },
  sanjiang_orogen: { en: 'Sanjiang Orogen', zh: '三江造山带' },
  alaska_range: { en: 'Alaska Range', zh: '阿拉斯加山脉' },
  rocky_mountains: { en: 'Rocky Mountains', zh: '落基山脉' },
  macquarie_arc: { en: 'Macquarie Arc', zh: '麦夸里弧' },
  lachlan_fold_belt: { en: 'Lachlan Fold Belt', zh: '拉克兰褶皱带' },
  alborz_azerbaijan: { en: 'Alborz-Azerbaijan', zh: '阿尔博兹-阿塞拜疆' },
  central_american_arc: { en: 'Central American Arc', zh: '中美洲弧' },
  southern_permian_basin: { en: 'Southern Permian Basin', zh: '南二叠纪盆地' },
  chagai_arc: { en: 'Chagai Arc', zh: '查盖弧' },
  central_indian_tectonic_zone: { en: 'Central Indian Tectonic Zone', zh: '中印度构造带' },
  aravalli_delhi_belt: { en: 'Aravalli-Delhi Belt', zh: '阿拉瓦利-德里带' },
  midcontinent_rif: { en: 'Midcontinent Rift', zh: '中陆裂谷' },
};

const METALLOGENIC_BELT_DICT: Record<string, Record<Locale, string>> = {
  andean_porphyry_belt: { en: 'Andean Porphyry Belt', zh: '安第斯斑岩成矿带' },
  western_us_porphyry_belt: { en: 'Western US Porphyry Belt', zh: '美国西部斑岩成矿带' },
  central_african_copperbelt: { en: 'Central African Copperbelt', zh: '中非铜带' },
  central_asian_porphyry_belt: { en: 'Central Asian Porphyry Belt', zh: '中亚斑岩成矿带' },
  southeast_asian_porphyry_belt: { en: 'Southeast Asian Porphyry Belt', zh: '东南亚斑岩成矿带' },
  papua_new_guinea_belt: { en: 'Papua-New Guinea Mineral Belt', zh: '巴布亚新几内亚成矿带' },
  east_china_porphyry_belt: { en: 'East China Porphyry Belt', zh: '中国东部斑岩成矿带' },
  tethyan_metallogenic_belt: { en: 'Tethyan Metallogenic Belt', zh: '特提斯成矿带' },
  sanjiang_metallogenic_belt: { en: 'Sanjiang Metallogenic Belt', zh: '三江成矿带' },
  zhongtiao_metallogenic_belt: { en: 'Zhongtiao Metallogenic Belt', zh: '中条成矿带' },
  canadian_porphyry_belt: { en: 'Canadian Porphyry Belt', zh: '加拿大斑岩成矿带' },
  carajas_iocg_province: { en: 'Carajas IOCG Province', zh: '卡拉加斯IOCG省' },
  gawler_iocg_province: { en: 'Gawler-IOCG Province', zh: '高勒IOCG省' },
  cloncurry_iocg_province: { en: 'Cloncurry IOCG Province', zh: '克朗克里IOCG省' },
  norrbotten_iocg_province: { en: 'Norrbotten IOCG Province', zh: '北博滕IOCG省' },
  kupferschiefer_belt: { en: 'Kupferschiefer Belt', zh: '含铜页岩带' },
  iberian_pyrite_belt: { en: 'Iberian Pyrite Belt', zh: '伊比利亚黄铁矿带' },
  chilean_iocg_belt: { en: 'Chilean IOCG Belt', zh: '智利IOCG带' },
  punta_del_cobre_iocg_belt: { en: 'Punta del Cobre IOCG Belt', zh: '铜角IOCG带' },
  keweenaw_copper_district: { en: 'Keweenaw Copper District', zh: '基威诺铜矿区' },
  udokan_chiney_belt: { en: 'Udokan-Chiney Belt', zh: '乌多坎-奇涅带' },
  indian_porphyry_belt: { en: 'Indian Porphyry Belt', zh: '印度斑岩成矿带' },
};

const GEOLOGICAL_AGE_DICT: Record<string, Record<Locale, string>> = {
  // Eons
  archean: { en: 'Archean', zh: '太古宙' },
  proterozoic: { en: 'Proterozoic', zh: '元古宙' },
  phanerozoic: { en: 'Phanerozoic', zh: '显生宙' },
  // Eras
  paleoproterozoic: { en: 'Paleoproterozoic', zh: '古元古代' },
  mesoproterozoic: { en: 'Mesoproterozoic', zh: '中元古代' },
  neoproterozoic: { en: 'Neoproterozoic', zh: '新元古代' },
  paleozoic: { en: 'Paleozoic', zh: '古生代' },
  mesozoic: { en: 'Mesozoic', zh: '中生代' },
  cenozoic: { en: 'Cenozoic', zh: '新生代' },
  // Periods
  cambrian: { en: 'Cambrian', zh: '寒武纪' },
  ordovician: { en: 'Ordovician', zh: '奥陶纪' },
  silurian: { en: 'Silurian', zh: '志留纪' },
  devonian: { en: 'Devonian', zh: '泥盆纪' },
  carboniferous: { en: 'Carboniferous', zh: '石炭纪' },
  permian: { en: 'Permian', zh: '二叠纪' },
  triassic: { en: 'Triassic', zh: '三叠纪' },
  jurassic: { en: 'Jurassic', zh: '侏罗纪' },
  cretaceous: { en: 'Cretaceous', zh: '白垩纪' },
  paleogene: { en: 'Paleogene', zh: '古近纪' },
  neogene: { en: 'Neogene', zh: '新近纪' },
  quaternary: { en: 'Quaternary', zh: '第四纪' },
  // Epochs
  paleocene: { en: 'Paleocene', zh: '古新世' },
  eocene: { en: 'Eocene', zh: '始新世' },
  oligocene: { en: 'Oligocene', zh: '渐新世' },
  miocene: { en: 'Miocene', zh: '中新世' },
  pliocene: { en: 'Pliocene', zh: '上新世' },
  pleistocene: { en: 'Pleistocene', zh: '更新世' },
};
// ============================================================================
// Deposit classification codes — matches deposit_classification.code
// ============================================================================
const CLASSIFICATION_DICT: Record<string, Record<Locale, string>> = {
  POR: { en: 'Porphyry', zh: '斑岩型' },
  POR_CUMO: { en: 'Porphyry Cu-Mo', zh: '斑岩铜钼型' },
  POR_CUAU: { en: 'Porphyry Cu-Au', zh: '斑岩铜金型' },
  POR_AU: { en: 'Porphyry Au', zh: '斑岩金型' },
  SED: { en: 'Sediment-hosted', zh: '沉积岩容矿型' },
  SED_SSC: { en: 'Sediment-hosted Stratiform Cu', zh: '沉积岩容矿层状铜矿' },
  SED_SEDEX: { en: 'Sedimentary Exhalative', zh: '沉积喷流型' },
  VMS: { en: 'Volcanogenic Massive Sulfide', zh: '火山成因块状硫化物型' },
  VMS_BM: { en: 'VMS Bimodal-Mafic', zh: 'VMS双峰-基性型' },
  VMS_BF: { en: 'VMS Bimodal-Felsic', zh: 'VMS双峰-酸性型' },
  VMS_PM: { en: 'VMS Pelitic-Mafic', zh: 'VMS泥质-基性型' },
  IOCG: { en: 'Iron Oxide Copper Gold', zh: '铁氧化物铜金型' },
  IOCG_HEM: { en: 'IOCG Hematite-dominant', zh: 'IOCG赤铁矿主导型' },
  IOCG_MAG: { en: 'IOCG Magnetite-dominant', zh: 'IOCG磁铁矿主导型' },
  SKN: { en: 'Skarn', zh: '矽卡岩型' },
  SKN_CALC: { en: 'Calcic Skarn', zh: '钙质矽卡岩型' },
  SKN_MAG: { en: 'Magnesian Skarn', zh: '镁质矽卡岩型' },
  EPI: { en: 'Epithermal', zh: '浅成低温热液型' },
  EPI_HS: { en: 'Epithermal High-Sulfidation', zh: '高硫化浅成低温热液型' },
  EPI_LS: { en: 'Epithermal Low-Sulfidation', zh: '低硫化浅成低温热液型' },
  EPI_IS: { en: 'Epithermal Intermediate-Sulf.', zh: '中硫化浅成低温热液型' },
  MAG: { en: 'Magmatic Sulfide', zh: '岩浆硫化物型' },
  OTH: { en: 'Other / Unclassified', zh: '其他/未分类' },
};

// ============================================================================
// Translate function — all layers call this
// ============================================================================

export function translateCode(
  category:
    | 'status'
    | 'mining_method'
    | 'tectonic_setting'
    | 'geological_province'
    | 'metallogenic_belt'
    | 'geological_age'
    | 'classification',
  code: string | null | undefined,
  locale: Locale,
): string {
  if (!code) return '—';
  const key = normalize(code);
  let dict: Record<string, Record<Locale, string>>;
  switch (category) {
    case 'status':
      dict = STATUS_DICT;
      break;
    case 'mining_method':
      dict = MINING_METHOD_DICT;
      break;
    case 'tectonic_setting':
      dict = TECTONIC_SETTING_DICT;
      break;
    case 'geological_province':
      dict = GEOLOGICAL_PROVINCE_DICT;
      break;
    case 'metallogenic_belt':
      dict = METALLOGENIC_BELT_DICT;
      break;
    case 'geological_age':
      dict = GEOLOGICAL_AGE_DICT;
      break;
    case 'classification':
      dict = CLASSIFICATION_DICT;
      break;
    default:
      return String(code);
  }
  if (dict[code]) return dict[code][locale];
  if (dict[key]) return dict[key][locale];
  for (const dk of Object.keys(dict)) {
    if (key.includes(dk) || dk.includes(key)) return dict[dk][locale];
  }
  return code;
}

// ============================================================================
// Normalization — strip special chars and lowercase for dictionary lookup
// ============================================================================

function normalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/[()]/g, '')
    .replace(/[^a-z0-9_]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');
}
