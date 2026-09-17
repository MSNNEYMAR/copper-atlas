-- ============================================================================
-- Copper Atlas — Seed Data: Alteration Types, Minerals, Deposit Type i18n
-- 全局铜矿床图谱 — 种子数据：蚀变类型、矿种、矿床类型翻译
-- ============================================================================

-- ============================================================================
-- ALTERATION TYPES
-- ============================================================================
INSERT INTO alteration_type (code, name_en, name_zh, description_en, typical_minerals, typical_zone, associated_deposit_types, temperature_range, sort_order)
VALUES
('potassic',       'Potassic',       '钾化',
 'High-temperature K-feldspar ± biotite alteration in the core of porphyry systems.',
 ARRAY['K-feldspar','biotite','magnetite','anhydrite'],
 'inner', ARRAY['Porphyry Cu-Mo','Porphyry Cu-Au'], '[400,700]'::INT4RANGE, 1),

('phyllic',        'Phyllic (Quartz-Sericite)', '绢英岩化（石英-绢云母）',
 'Quartz-sericite-pyrite alteration forming the typical phyllic halo in porphyry systems.',
 ARRAY['quartz','sericite','pyrite','chalcopyrite'],
 'intermediate', ARRAY['Porphyry'], '[300,450]'::INT4RANGE, 2),

('argillic',       'Argillic',       '泥化',
 'Clay mineral alteration at moderate temperatures. Intermediate and advanced argillic variants exist.',
 ARRAY['kaolinite','montmorillonite','illite','smectite'],
 'intermediate', ARRAY['Porphyry','Epithermal HS'], '[150,300]'::INT4RANGE, 3),

('advanced_argillic','Advanced Argillic','高级泥化',
 'Intense acid leaching forming alunite, pyrophyllite, dickite. Characteristic of high-sulfidation epithermal.',
 ARRAY['alunite','pyrophyllite','dickite','kaolinite','quartz'],
 'inner to intermediate', ARRAY['Epithermal HS'], '[100,350]'::INT4RANGE, 4),

('propylitic',     'Propylitic',     '青磐岩化',
 'Low-temperature, distal alteration halo in porphyry and epithermal systems.',
 ARRAY['chlorite','epidote','calcite','albite','pyrite'],
 'outer', ARRAY['Porphyry','Epithermal','Skarn'], '[200,350]'::INT4RANGE, 5),

('sericitic',      'Sericitic',      '绢云母化',
 'Sericite-dominant alteration, common in shear zone-hosted and orogenic deposits.',
 ARRAY['sericite','quartz','pyrite','carbonate'],
 'intermediate', ARRAY['Porphyry','Orogenic Au'], '[250,400]'::INT4RANGE, 6),

('sodic_calcic',   'Sodic-Calcic',   '钠钙质蚀变',
 'Albite-scapolite- actinolite alteration in IOCG and deeper porphyry environments.',
 ARRAY['albite','scapolite','actinolite','magnetite','apatite'],
 'inner to deep', ARRAY['IOCG','Porphyry Cu-Au'], '[450,700]'::INT4RANGE, 7),

('silicification', 'Silicification', '硅化',
 'Pervasive quartz flooding. Common in many deposit types, especially epithermal and Carlin-type.',
 ARRAY['quartz','chalcedony','opal'],
 'variable', ARRAY['Epithermal','Carlin Au','SEDEX'], '[100,400]'::INT4RANGE, 8),

('skarn_alteration','Skarn Alteration', '矽卡岩蚀变',
 'Calc-silicate alteration at carbonate-intrusive contacts. Prograde (garnet-pyroxene) and retrograde (amphibole-epidote) stages.',
 ARRAY['garnet','pyroxene','wollastonite','amphibole','epidote','magnetite'],
 'contact', ARRAY['Skarn','Porphyry-related Skarn'], '[400,800]'::INT4RANGE, 9),

('greisen',        'Greisen',        '云英岩化',
 'High-temperature, fluorine-rich Li-mica-topaz-quartz alteration. Important for Sn-W ± Cu.',
 ARRAY['quartz','muscovite','topaz','fluorite','zinnwaldite'],
 'inner to intermediate', ARRAY['Greisen Sn-W','Porphyry Mo'], '[300,600]'::INT4RANGE, 10),

('serpentinization','Serpentinization','蛇纹石化',
 'Hydration of ultramafic rocks. Important host for some magmatic Ni-Cu-PGE deposits.',
 ARRAY['serpentine','magnetite','talc','carbonate'],
 'variable', ARRAY['Magmatic Sulfide Ni-Cu'], '[100,500]'::INT4RANGE, 11),

('chloritization', 'Chloritization',  '绿泥石化',
 'Pervasive chlorite replacement. Common in VMS footwall alteration pipes and IOCG systems.',
 ARRAY['chlorite','quartz','pyrite','carbonate'],
 'footwall to proximal', ARRAY['VMS','IOCG','Magmatic Sulfide'], '[150,400]'::INT4RANGE, 12);


-- ============================================================================
-- MINERAL I18N
-- ============================================================================
INSERT INTO mineral_i18n (mineral_code, language, name, description, chemical_symbol, group_name, color_hex, is_enabled, phase, sort_order)
VALUES
-- Copper (Phase 1, enabled)
('copper', 'en', 'Copper',
 'Copper is a ductile metal with very high thermal and electrical conductivity. Essential for electrical wiring, plumbing, and renewable energy infrastructure.',
 'Cu', 'Base Metals', '#E74C3C', true, 1, 1),
('copper', 'zh', '铜',
 '铜是一种具有极高导热和导电性的延展性金属。是电线、管道和可再生能源基础设施的关键材料。',
 'Cu', '有色金属', '#E74C3C', true, 1, 1),

-- Gold (Phase 2, disabled)
('gold', 'en', 'Gold',
 'Precious metal valued for jewelry, investment, and electronics. Often occurs as a by-product of copper mining.',
 'Au', 'Precious Metals', '#F1C40F', false, 2, 2),
('gold', 'zh', '金',
 '贵金属，用于珠宝、投资和电子工业。常作为铜矿开采的副产品产出。',
 'Au', '贵金属', '#F1C40F', false, 2, 2),

-- Iron (Phase 2, disabled)
('iron', 'en', 'Iron',
 'The most widely used metal, primarily for steel production. Iron oxide deposits include BIF, Kiruna-type, and magmatic.',
 'Fe', 'Ferrous Metals', '#95A5A6', false, 2, 3),
('iron', 'zh', '铁',
 '使用最广泛的金属，主要用于钢铁生产。铁氧化物矿床包括 BIF 型、基律纳型和岩浆型。',
 'Fe', '黑色金属', '#95A5A6', false, 2, 3),

-- Lithium (Phase 2, disabled)
('lithium', 'en', 'Lithium',
 'Critical metal for Li-ion batteries. Deposits include salar brines, pegmatites, and sedimentary clays.',
 'Li', 'Battery Metals', '#2ECC71', false, 2, 4),
('lithium', 'zh', '锂',
 '锂离子电池的关键金属。矿床包括盐湖卤水、伟晶岩和沉积粘土。',
 'Li', '电池金属', '#2ECC71', false, 2, 4),

-- Zinc (Phase 3)
('zinc', 'en', 'Zinc', 'Base metal used primarily for galvanizing steel. Key deposit types: SEDEX, MVT, VMS.', 'Zn', 'Base Metals', '#3498DB', false, 3, 5),
('zinc', 'zh', '锌', '主要用于钢铁镀锌。关键矿床类型：SEDEX、MVT、VMS。', 'Zn', '有色金属', '#3498DB', false, 3, 5),

-- Molybdenum (Phase 3)
('molybdenum', 'en', 'Molybdenum',
 'Refractory metal used in steel alloys. Primary Mo deposits (Climax-type) and co-product from porphyry Cu.',
 'Mo', 'Refractory Metals', '#9B59B6', false, 3, 6),
('molybdenum', 'zh', '钼',
 '用于钢合金的难熔金属。原生钼矿（Climax 型）及斑岩铜矿的副产品。',
 'Mo', '难熔金属', '#9B59B6', false, 3, 6);


-- ============================================================================
-- DEPOSIT TYPE I18N — Display names for deposit classifications
-- ============================================================================
INSERT INTO deposit_type_i18n (classification_code, language, display_name, description)
VALUES
('POR', 'en', 'Porphyry', 'Magmatic-hydrothermal deposits. World''s primary source of copper (~60%).'),
('POR', 'zh', '斑岩型', '岩浆-热液矿床。全球铜的主要来源 (~60%)。'),
('POR_CUMO', 'en', 'Porphyry Cu-Mo', 'Cu-Mo dominated porphyry, calc-alkaline magmas, continental arcs.'),
('POR_CUMO', 'zh', '斑岩铜钼型', '铜钼为主，钙碱性岩浆，大陆弧环境。'),
('POR_CUAU', 'en', 'Porphyry Cu-Au', 'Cu-Au rich porphyry, alkaline/high-K magmas, island arcs.'),
('POR_CUAU', 'zh', '斑岩铜金型', '富铜金，碱性/高钾岩浆，岛弧环境。'),
('SED', 'en', 'Sediment-hosted', 'Stratabound copper in sedimentary rocks. Kupferschiefer and Central African Copperbelt types.'),
('SED', 'zh', '沉积岩容矿型', '沉积岩中的层控铜矿。Kupferschiefer 型和中非铜带型。'),
('VMS', 'en', 'VMS', 'Volcanogenic Massive Sulfide. Seafloor hydrothermal deposits in volcanic sequences.'),
('VMS', 'zh', '火山成因块状硫化物型', '海底火山序列中的热液矿床。'),
('IOCG', 'en', 'IOCG', 'Iron Oxide Copper Gold. Large-tonnage, Fe-oxide-rich hydrothermal deposits.'),
('IOCG', 'zh', '铁氧化物铜金型', '大吨位、富铁氧化物的热液矿床。'),
('SKN', 'en', 'Skarn', 'Metasomatic deposits at carbonate-intrusive contacts.'),
('SKN', 'zh', '矽卡岩型', '碳酸盐-侵入体接触带的交代矿床。'),
('EPI', 'en', 'Epithermal', 'Shallow, low-temperature hydrothermal deposits in volcanic settings.'),
('EPI', 'zh', '浅成低温热液型', '火山环境中的浅成低温热液矿床。'),
('MAG', 'en', 'Magmatic Sulfide', 'Ni-Cu-PGE deposits from immiscible sulfide melt segregation.'),
('MAG', 'zh', '岩浆硫化物型', '由不混溶硫化物熔体分凝形成的 Ni-Cu-PGE 矿床。');
