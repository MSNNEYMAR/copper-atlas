# Copper Atlas — Coverage Dashboard

> 全球铜矿床图谱 — 覆盖率仪表盘
> 2026-07-04 · 102 deposits · 28 countries · Goal: 500+

---

## Continent Summary

| Continent | Countries | Deposits | % Global |
|-----------|-----------|----------|----------|
| South America | 4 of 5 | 30 | 29% |
| North America | 4 of 5 | 16 | 16% |
| Asia | 10 of 16 | 18 | 18% |
| Africa | 3 of 8 | 10 | 10% |
| Europe | 5 of 7 | 16 | 16% |
| Oceania | 2 of 3 | 12 | 12% |

---

## Top 10 Countries by Deposit Count

| Rank | Country | Count | % of DB |
|------|---------|-------|---------|
| 1 | Chile | 16 | 15.7% |
| 2 | USA | 12 | 11.8% |
| 3 | Peru | 9 | 8.8% |
| 4 | Australia | 7 | 6.9% |
| 5 | DRC | 6 | 5.9% |
| 6 | Zambia | 6 | 5.9% |
| 7 | Canada | 5 | 4.9% |
| 8 | China | 5 | 4.9% |
| 9 | Mexico | 3 | 2.9% |
| 10 | Mongolia | 3 | 2.9% |

---

## Deposit Type Coverage

| Type | Count | % |
|------|-------|---|
| Porphyry Cu-Mo (POR_CUMO) | 41 | 40% |
| Porphyry Cu-Au (POR_CUAU) | 24 | 24% |
| Sediment-hosted SSC (SED_SSC) | 18 | 18% |
| IOCG Hematite (IOCG_HEM) | 8 | 8% |
| IOCG Magnetite (IOCG_MAG) | 3 | 3% |
| Magmatic Sulfide (MAG) | 3 | 3% |
| Skarn Calcic (SKN_CALC) | 2 | 2% |
| VMS Bimodal-Felsic (VMS_BF) | 2 | 2% |
| VMS Bimodal-Mafic (VMS_BM) | 1 | 1% |

---

## Gaps — Countries With No Data (🔴 Critical)

```
🇦🇷 Argentina    (est. 30+ deposits — Josemaria, Los Azules, Taca Taca)
🇨🇴 Colombia     (est. 10+ — Mocoa, Quebradona)
🇪🇨 Ecuador      (est. 15+ — Cascabel, Mirador)
🇿🇦 South Africa (est. 20+ — Palabora, Okiep)
🇹🇷 Turkey       (est. 15+ — Siirt, Kure)
🇸🇦 Saudi Arabia (est. 10+ — Jabal Sayid)
🇲🇲 Myanmar      (est. 5+ — Monywa)
🇻🇳 Vietnam      (est. 5+ — Sin Quyen)
🇯🇵 Japan        (est. 5+ — Hishikari)
🇰🇬 Kyrgyzstan   (est. 5+)
🇷🇸 Serbia       (est. 5+ — Bor, Majdanpek)
🇧🇬 Bulgaria     (est. 5+ — Chelopech)
🇳🇿 New Zealand  (est. 5+)
🇨🇺 Cuba         (est. 5+)
🇧🇼 Botswana    (est. 5+)
🇲🇦 Morocco      (est. 10+)
🇲🇬 Madagascar   (est. 5+)
```

## Underrepresented (🟡 <5 deposits, should be 10+)

```
🇨🇳 China       (5 — should be 50+)
🇷🇺 Russia      (3 — should be 30+)
🇮🇳 India       (2 — should be 20+)
🇮🇩 Indonesia   (2 — should be 15+)
🇵🇭 Philippines (1 — should be 10+)
🇸🇪 Sweden      (1 — should be 5+)
🇧🇷 Brazil      (2 — should be 15+)
🇮🇷 Iran        (2 — should be 10+)
🇵🇰 Pakistan    (1 — should be 3+)
🇰🇿 Kazakhstan  (3 — should be 15+)
🇲🇳 Mongolia    (3 — should be 15+)
```

---

## Run This SQL for Live Coverage Stats

```sql
-- Total deposits
SELECT COUNT(*) FROM deposits WHERE is_active=true AND primary_mineral='copper';

-- By continent
SELECT co.continent, COUNT(*) as n
FROM deposits d JOIN countries co ON d.country_id=co.id
WHERE d.is_active=true AND d.primary_mineral='copper'
GROUP BY co.continent ORDER BY n DESC;

-- Empty countries
SELECT c.name_en, c.continent
FROM countries c
WHERE c.id NOT IN (
  SELECT DISTINCT country_id FROM deposits WHERE is_active=true AND primary_mineral='copper'
) ORDER BY c.continent;

-- Missing coordinates
SELECT COUNT(*) FROM deposits
WHERE is_active=true AND primary_mineral='copper' AND (
  location IS NULL OR ST_X(location)=0 AND ST_Y(location)=0
);

-- Missing source
SELECT COUNT(*) FROM deposits
WHERE is_active=true AND primary_mineral='copper' AND (
  data_source IS NULL OR data_source=''
);

-- Missing tonnage
SELECT COUNT(*) FROM deposits
WHERE is_active=true AND primary_mineral='copper' AND tonnage_mt IS NULL;
```
