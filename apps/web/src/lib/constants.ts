/**
 * Copper Atlas — Constants
 * 全球铜矿床图谱 — 常量定义
 *
 * Mineral registry — the central extensibility point for mineral types.
 * Adding a new mineral: 1) add entry here, 2) seed data, 3) enable in DB.
 */

export interface MineralConfig {
  code: string;
  chemicalSymbol: string;
  nameEn: string;
  nameZh: string;
  color: string;
  enabled: boolean;
  phase: number;
}

export const MINERAL_REGISTRY: Record<string, MineralConfig> = {
  copper: {
    code: 'copper',
    chemicalSymbol: 'Cu',
    nameEn: 'Copper',
    nameZh: '铜',
    color: '#E74C3C',
    enabled: true,
    phase: 1,
  },
  gold: {
    code: 'gold',
    chemicalSymbol: 'Au',
    nameEn: 'Gold',
    nameZh: '金',
    color: '#F1C40F',
    enabled: false,
    phase: 2,
  },
  iron: {
    code: 'iron',
    chemicalSymbol: 'Fe',
    nameEn: 'Iron',
    nameZh: '铁',
    color: '#95A5A6',
    enabled: false,
    phase: 2,
  },
  lithium: {
    code: 'lithium',
    chemicalSymbol: 'Li',
    nameEn: 'Lithium',
    nameZh: '锂',
    color: '#2ECC71',
    enabled: false,
    phase: 2,
  },
  zinc: {
    code: 'zinc',
    chemicalSymbol: 'Zn',
    nameEn: 'Zinc',
    nameZh: '锌',
    color: '#3498DB',
    enabled: false,
    phase: 3,
  },
};

export const DEPOSIT_TYPE_COLORS: Record<string, string> = {
  POR: '#E74C3C',
  POR_CUMO: '#E74C3C',
  POR_CUAU: '#C0392B',
  SED: '#3498DB',
  SED_SSC: '#2980B9',
  VMS: '#9B59B6',
  IOCG: '#E67E22',
  IOCG_HEM: '#D35400',
  SKN: '#2ECC71',
  SKN_CALC: '#27AE60',
  EPI: '#F39C12',
  EPI_HS: '#E67E22',
  MAG: '#1ABC9C',
  OTH: '#95A5A6',
};
