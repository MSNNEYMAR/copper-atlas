-- ============================================================================
-- Copper Atlas — Seed Data: Deposit Classification Hierarchy
-- 全局铜矿床图谱 — 种子数据：矿床分类层级体系
-- ============================================================================
-- Based on USGS Mineral Deposit Models, Sillitoe (2010), and IUGS classification.
-- Hierarchy: Class → Subclass → Subtype (up to 3 levels deep)
-- ============================================================================

-- === LEVEL 1: Top-level classes ===

INSERT INTO deposit_classification (code, path, name_en, name_zh, parent_code, depth, description_en, typical_grade_range, typical_tonnage_range, tectonic_setting, associated_rocks, key_references, sort_order)
VALUES
-- 1. Porphyry 斑岩型
('POR', 'por', 'Porphyry', '斑岩型', NULL, 1,
 'Magmatic-hydrothermal deposits centered on porphyritic intrusions. World''s primary copper source (~60% of global Cu).',
 '[0.3, 1.2]'::NUMRANGE, '[10, 5000]'::NUMRANGE,
 'Convergent plate margins, continental and island arcs',
 ARRAY['granodiorite','quartz monzonite','diorite','monzonite'],
 ARRAY['Sillitoe, R.H., 2010. Porphyry copper systems. Economic Geology, 105(1), pp.3-41. DOI:10.2113/gsecongeo.105.1.3'],
 1),

-- 2. Sediment-hosted 沉积岩容矿型
('SED', 'sed', 'Sediment-hosted', '沉积岩容矿型', NULL, 1,
 'Stratabound copper deposits hosted in sedimentary rocks. Second most important copper source.',
 '[0.5, 4.0]'::NUMRANGE, '[0.1, 200]'::NUMRANGE,
 'Intracratonic basins, rift basins, passive margins',
 ARRAY['sandstone','shale','carbonate','siltstone'],
 ARRAY['Hitzman, M.W., et al., 2010. The sediment-hosted stratiform copper ore system. Economic Geology.'],
 2),

-- 3. VMS (Volcanogenic Massive Sulfide) 火山成因块状硫化物型
('VMS', 'vms', 'Volcanogenic Massive Sulfide (VMS)', '火山成因块状硫化物型', NULL, 1,
 'Stratiform accumulations of sulfide minerals precipitated at or near the seafloor from hydrothermal fluids.',
 '[0.5, 5.0]'::NUMRANGE, '[0.01, 200]'::NUMRANGE,
 'Extensional tectonic settings, mid-ocean ridges, back-arc basins, island arcs',
 ARRAY['rhyolite','dacite','basalt','volcaniclastic rocks'],
 ARRAY['Galley, A.G., Hannington, M.D. and Jonasson, I.R., 2007. Volcanogenic massive sulphide deposits.'],
 3),

-- 4. IOCG (Iron Oxide Copper Gold) 铁氧化物铜金型
('IOCG', 'iocg', 'Iron Oxide Copper Gold (IOCG)', '铁氧化物铜金型', NULL, 1,
 'Large-tonnage, low-grade deposits characterized by abundant iron oxides (magnetite, hematite) with Cu-Au-U-REE.',
 '[0.2, 2.0]'::NUMRANGE, '[10, 10000]'::NUMRANGE,
 'Extensional to transtensional tectonic settings, craton margins',
 ARRAY['granite','diorite','volcanic rocks','metasedimentary rocks'],
 ARRAY['Williams, P.J., et al., 2005. Iron oxide copper-gold deposits: Geology, space-time distribution, and possible modes of origin.'],
 4),

-- 5. Skarn 矽卡岩型
('SKN', 'skn', 'Skarn', '矽卡岩型', NULL, 1,
 'Metasomatic deposits formed at the contact between intrusive rocks and carbonate country rocks.',
 '[0.5, 3.0]'::NUMRANGE, '[0.1, 500]'::NUMRANGE,
 'Convergent margins, continental arcs',
 ARRAY['limestone','marble','dolomite','granodiorite','diorite'],
 ARRAY['Meinert, L.D., et al., 2005. World skarn deposits. Economic Geology 100th Anniversary Volume.'],
 5),

-- 6. Epithermal 浅成低温热液型
('EPI', 'epi', 'Epithermal', '浅成低温热液型', NULL, 1,
 'Low-temperature hydrothermal deposits formed at shallow depths (<1.5 km) in volcanic arcs.',
 '[0.1, 10.0]'::NUMRANGE, '[0.001, 100]'::NUMRANGE,
 'Island arcs, continental arcs, back-arc settings',
 ARRAY['andesite','dacite','rhyolite','volcaniclastic breccia'],
 ARRAY['Simmons, S.F., White, N.C. and John, D.A., 2005. Geological characteristics of epithermal precious and base metal deposits.'],
 6),

-- 7. Magmatic Sulfide 岩浆硫化物型
('MAG', 'mag', 'Magmatic Sulfide', '岩浆硫化物型', NULL, 1,
 'Ni-Cu-PGE deposits formed by segregation of immiscible sulfide liquid from mafic-ultramafic magmas.',
 '[0.2, 5.0]'::NUMRANGE, '[0.1, 1000]'::NUMRANGE,
 'Intracontinental rifts, craton margins, large igneous provinces',
 ARRAY['norite','gabbro','peridotite','komatiite'],
 ARRAY['Naldrett, A.J., 2010. Secular variation of magmatic sulfide deposits and their source magmas. Economic Geology.'],
 7),

-- 8. Other / Unknown
('OTH', 'oth', 'Other / Unclassified', '其他/未分类', NULL, 1,
 'Deposits that do not fit into the main classification or have not been classified.',
 NULL, NULL, NULL, NULL, NULL, 99);


-- === LEVEL 2: Subclasses ===

-- Porphyry subclasses
INSERT INTO deposit_classification (code, path, name_en, name_zh, parent_code, depth, description_en, typical_grade_range, typical_tonnage_range, tectonic_setting, associated_rocks, sort_order)
VALUES
('POR_CUMO', 'por.cumo', 'Porphyry Cu-Mo', '斑岩铜钼型', 'POR', 2,
 'Porphyry deposits dominated by Cu and Mo, associated with calc-alkaline magmas in continental arcs.',
 '[0.3, 0.8]'::NUMRANGE, '[100, 5000]'::NUMRANGE,
 'Continental arcs, thick crust (>40 km)',
 ARRAY['granodiorite','quartz monzonite','monzogranite'], 1),

('POR_CUAU', 'por.cuau', 'Porphyry Cu-Au', '斑岩铜金型', 'POR', 2,
 'Porphyry deposits rich in Cu and Au, associated with alkaline or high-K calc-alkaline magmas in island arcs.',
 '[0.3, 1.5]'::NUMRANGE, '[10, 2000]'::NUMRANGE,
 'Island arcs, thin crust (<30 km), extensional settings',
 ARRAY['diorite','quartz diorite','monzonite','syenite'], 2),

('POR_AU', 'por.au', 'Porphyry Au', '斑岩金型', 'POR', 2,
 'Gold-rich porphyry deposits where Au is the primary economic metal with subordinate Cu.',
 '[0.2, 1.0]'::NUMRANGE, '[1, 500]'::NUMRANGE,
 'Island arcs, back-arc settings',
 ARRAY['diorite','monzodiorite','syenite'], 3);

-- Sediment-hosted subclasses
INSERT INTO deposit_classification (code, path, name_en, name_zh, parent_code, depth, description_en, typical_grade_range, typical_tonnage_range, tectonic_setting, sort_order)
VALUES
('SED_SSC', 'sed.ssc', 'Sediment-hosted Stratiform Copper (SSC)', '沉积岩容矿层状铜矿', 'SED', 2,
 'Reduced-facies (Kupferschiefer-type) or red-bed type. Copper sulfides in reduced sedimentary layers.',
 '[1.0, 4.0]'::NUMRANGE, '[0.1, 100]'::NUMRANGE,
 'Intracratonic basins, rift-related basins', 1),

('SED_SEDEX', 'sed.sedex', 'Sedimentary Exhalative (SEDEX)', '沉积喷流型', 'SED', 2,
 'Zn-Pb-Ag ± Cu deposits formed by exhalation of hydrothermal fluids into a sedimentary basin.',
 '[0.5, 3.0]'::NUMRANGE, '[1, 200]'::NUMRANGE,
 'Extensional basins, failed rifts', 2);

-- VMS subclasses
INSERT INTO deposit_classification (code, path, name_en, name_zh, parent_code, depth, description_en, sort_order)
VALUES
('VMS_BM', 'vms.bm', 'VMS — Bimodal-Mafic', 'VMS 双峰-基性型', 'VMS', 2,
 'Dominated by basalt with minor rhyolite. Cu-rich, often Zn-poor. Cyprus-type is the end-member.', 1),

('VMS_BF', 'vms.bf', 'VMS — Bimodal-Felsic', 'VMS 双峰-酸性型', 'VMS', 2,
 'Significant felsic volcanic rocks. Zn-Pb-Cu rich. Kuroko-type deposits.', 2),

('VMS_PM', 'vms.pm', 'VMS — Pelitic-Mafic', 'VMS 泥质-基性型', 'VMS', 2,
 'Hosted in turbiditic sediments intercalated with mafic sills. Besshi-type deposits.', 3);

-- Epithermal subclasses
INSERT INTO deposit_classification (code, path, name_en, name_zh, parent_code, depth, description_en, typical_grade_range, sort_order)
VALUES
('EPI_HS', 'epi.hs', 'Epithermal — High Sulfidation', '浅成低温热液 高硫化型', 'EPI', 2,
 'Acid-sulfate type. Formed from oxidized (SO2-rich) magmatic fluids. Cu-Au-As rich. Enargite is characteristic.',
 '[0.1, 10.0]'::NUMRANGE, 1),

('EPI_LS', 'epi.ls', 'Epithermal — Low Sulfidation', '浅成低温热液 低硫化型', 'EPI', 2,
 'Adularia-sericite type. Formed from reduced (H2S-rich) fluids. Au-Ag rich with minor Cu.',
 '[0.1, 50.0]'::NUMRANGE, 2),

('EPI_IS', 'epi.is', 'Epithermal — Intermediate Sulfidation', '浅成低温热液 中硫化型', 'EPI', 2,
 'Intermediate between HS and LS. Important Ag-Pb-Zn ± Cu producers.',
 '[0.1, 5.0]'::NUMRANGE, 3);

-- Skarn subclasses
INSERT INTO deposit_classification (code, path, name_en, name_zh, parent_code, depth, description_en, sort_order)
VALUES
('SKN_CALC', 'skn.calc', 'Skarn — Calcic', '矽卡岩 钙质型', 'SKN', 2,
 'Formed in limestone host rocks. Garnet-pyroxene dominated. Most common skarn Cu type. Associated with porphyry Cu systems.',
 1),

('SKN_MAG', 'skn.mag', 'Skarn — Magnesian', '矽卡岩 镁质型', 'SKN', 2,
 'Formed in dolomite host rocks. Forsterite-diopside dominated. Often Fe-Cu rich.',
 2);

-- IOCG subclasses
INSERT INTO deposit_classification (code, path, name_en, name_zh, parent_code, depth, description_en, sort_order)
VALUES
('IOCG_MAG', 'iocg.mag', 'IOCG — Magnetite-dominant', 'IOCG 磁铁矿主导型', 'IOCG', 2,
 'Magnetite-rich, hematite-poor. Higher temperature, deeper formation. Cu-Au grades typically higher.', 1),

('IOCG_HEM', 'iocg.hem', 'IOCG — Hematite-dominant', 'IOCG 赤铁矿主导型', 'IOCG', 2,
 'Hematite-rich. Lower temperature, shallower formation. Often U-REE-enriched. Olympic Dam-type.', 2);
