-- ============================================================================
-- Copper Atlas — Seed Data: International Chronostratigraphic Chart
-- 全局铜矿床图谱 — 种子数据：国际地层表
-- ============================================================================
-- Based on ICS (International Commission on Stratigraphy) v2024/12.
-- Ages in Ma (million years before present).
-- Path convention: lowercase, period-delimited.
-- Color hex codes follow ICS/USGS standard color scheme.
-- ============================================================================

-- === EONOTHEM (宙) Level ===
INSERT INTO geological_time_scale (name_en, name_zh, rank_en, rank_zh, base_age_ma, top_age_ma, path, parent_id, color_hex, sort_order)
VALUES
('Hadean',      '冥古宙', 'Eon', '宙', 4567.0, 4031.0, 'hadean', NULL, '#CA8B9A', 10),
('Archean',     '太古宙', 'Eon', '宙', 4031.0, 2500.0, 'archean', NULL, '#F2B4C0', 20),
('Proterozoic', '元古宙', 'Eon', '宙', 2500.0, 538.8,  'proterozoic', NULL, '#FDC08A', 30),
('Phanerozoic', '显生宙', 'Eon', '宙', 538.8,  0.0,    'phanerozoic', NULL, '#99C08A', 40);

-- === ERATHEM (代) Level ===
WITH eons AS (SELECT id, path FROM geological_time_scale WHERE rank_en = 'Eon')
INSERT INTO geological_time_scale (name_en, name_zh, rank_en, rank_zh, base_age_ma, top_age_ma, path, parent_id, color_hex, sort_order)
SELECT v.name_en, v.name_zh, v.rank_en, v.rank_zh, v.base, v.top,
       e.path || v.subpath, e.id, v.color, v.sort
FROM eons e,
(VALUES
 ('Eoarchean',   '始太古代', 'Era', '代', 4031.0, 3600.0, 'eoarchean',   'archean',     '#EADAE2', 1),
 ('Paleoarchean','古太古代', 'Era', '代', 3600.0, 3200.0, 'paleoarchean','archean',     '#F2CCD5', 2),
 ('Mesoarchean', '中太古代', 'Era', '代', 3200.0, 2800.0, 'mesoarchean', 'archean',     '#F2B4C0', 3),
 ('Neoarchean',  '新太古代', 'Era', '代', 2800.0, 2500.0, 'neoarchean',  'archean',     '#F49FAA', 4),
 ('Paleoproterozoic','古元古代','Era','代', 2500.0, 1600.0, 'paleoproterozoic','proterozoic','#FDC08A',5),
 ('Mesoproterozoic','中元古代','Era','代', 1600.0, 1000.0, 'mesoproterozoic','proterozoic','#FED8A0',6),
 ('Neoproterozoic', '新元古代','Era','代', 1000.0, 538.8,  'neoproterozoic', 'proterozoic','#FEE4B3',7),
 ('Paleozoic',   '古生代', 'Era', '代', 538.8,  251.902,'paleozoic',   'phanerozoic','#99C08A', 8),
 ('Mesozoic',    '中生代', 'Era', '代', 251.902,66.0,   'mesozoic',    'phanerozoic','#4EBB8E', 9),
 ('Cenozoic',    '新生代', 'Era', '代', 66.0,   0.0,    'cenozoic',    'phanerozoic','#F2E96B', 10)
) AS v(name_en, name_zh, rank_en, rank_zh, base, top, subpath, eon_path, color, sort)
WHERE e.path = v.eon_path;

-- === PERIOD/SYSTEM (纪) Level — Geological periods relevant to copper mineralization ===
WITH eras AS (SELECT id, path FROM geological_time_scale WHERE rank_en = 'Era')
INSERT INTO geological_time_scale (name_en, name_zh, rank_en, rank_zh, base_age_ma, top_age_ma, path, parent_id, color_hex, sort_order)
SELECT v.name_en, v.name_zh, v.rank_en, v.rank_zh, v.base, v.top,
       er.path || v.subpath, er.id, v.color, v.sort
FROM eras er,
(VALUES
 -- Paleoproterozoic
 ('Siderian',    '成铁纪', 'Period', '纪', 2500.0, 2300.0, 'siderian',    'paleoproterozoic', '#CB8B7F', 1),
 ('Rhyacian',    '层侵纪', 'Period', '纪', 2300.0, 2050.0, 'rhyacian',    'paleoproterozoic', '#CB8B7F', 2),
 ('Orosirian',   '造山纪', 'Period', '纪', 2050.0, 1800.0, 'orosirian',   'paleoproterozoic', '#CB8B7F', 3),
 ('Statherian',  '固结纪', 'Period', '纪', 1800.0, 1600.0, 'statherian',  'paleoproterozoic', '#CB8B7F', 4),
 -- Paleozoic
 ('Cambrian',    '寒武纪', 'Period', '纪', 538.8,  485.4,  'cambrian',    'paleozoic',   '#94B87A', 10),
 ('Ordovician',  '奥陶纪', 'Period', '纪', 485.4,  443.8,  'ordovician',  'paleozoic',   '#4F9476', 11),
 ('Silurian',    '志留纪', 'Period', '纪', 443.8,  419.2,  'silurian',    'paleozoic',   '#A0D3A3', 12),
 ('Devonian',    '泥盆纪', 'Period', '纪', 419.2,  358.9,  'devonian',    'paleozoic',   '#D3A377', 13),
 ('Carboniferous','石炭纪','Period', '纪', 358.9,  298.9,  'carboniferous','paleozoic',  '#81AEC6', 14),
 ('Permian',     '二叠纪', 'Period', '纪', 298.9,  251.902,'permian',     'paleozoic',   '#E4564D', 15),
 -- Mesozoic
 ('Triassic',    '三叠纪', 'Period', '纪', 251.902,201.4,  'triassic',    'mesozoic',    '#B04D8B', 16),
 ('Jurassic',    '侏罗纪', 'Period', '纪', 201.4,  145.0,  'jurassic',    'mesozoic',    '#52A9CC', 17),
 ('Cretaceous',  '白垩纪', 'Period', '纪', 145.0,  66.0,   'cretaceous',  'mesozoic',    '#71BF5A', 18),
 -- Cenozoic
 ('Paleogene',   '古近纪', 'Period', '纪', 66.0,   23.03,  'paleogene',   'cenozoic',    '#F2AC6B', 19),
 ('Neogene',     '新近纪', 'Period', '纪', 23.03,  2.58,   'neogene',     'cenozoic',    '#F6D925', 20),
 ('Quaternary',  '第四纪', 'Period', '纪', 2.58,   0.0,    'quaternary',  'cenozoic',    '#F9F1B7', 21)
) AS v(name_en, name_zh, rank_en, rank_zh, base, top, subpath, era_path, color, sort)
WHERE er.path = v.era_path;

-- === EPOCH/SERIES (世) — Key epochs for copper mineralization ===
WITH periods AS (SELECT id, path FROM geological_time_scale WHERE rank_en = 'Period')
INSERT INTO geological_time_scale (name_en, name_zh, rank_en, rank_zh, base_age_ma, top_age_ma, path, parent_id, sort_order)
SELECT v.name_en, v.name_zh, v.rank_en, v.rank_zh, v.base, v.top,
       p.path || v.subpath, p.id, v.sort
FROM periods p,
(VALUES
 -- Cretaceous 白垩纪 (important for porphyry Cu)
 ('Lower Cretaceous', '早白垩世', 'Epoch', '世', 145.0, 100.5, 'lower', 1),
 ('Upper Cretaceous', '晚白垩世', 'Epoch', '世', 100.5, 66.0,  'upper', 2),
 -- Jurassic 侏罗纪
 ('Lower Jurassic',  '早侏罗世', 'Epoch', '世', 201.4, 174.7, 'lower', 1),
 ('Middle Jurassic', '中侏罗世', 'Epoch', '世', 174.7, 161.5, 'middle', 2),
 ('Upper Jurassic',  '晚侏罗世', 'Epoch', '世', 161.5, 145.0, 'upper', 3),
 -- Triassic 三叠纪
 ('Lower Triassic',  '早三叠世', 'Epoch', '世', 251.902, 247.2, 'lower', 1),
 ('Middle Triassic', '中三叠世', 'Epoch', '世', 247.2, 237.0, 'middle', 2),
 ('Upper Triassic',  '晚三叠世', 'Epoch', '世', 237.0, 201.4, 'upper', 3),
 -- Permian 二叠纪
 ('Cisuralian',     '乌拉尔世', 'Epoch', '世', 298.9, 273.01, 'cisuralian', 1),
 ('Guadalupian',    '瓜德鲁普世','Epoch','世', 273.01, 259.51,'guadalupian',2),
 ('Lopingian',      '乐平世',  'Epoch', '世', 259.51, 251.902,'lopingian', 3),
 -- Carboniferous 石炭纪
 ('Mississippian',  '密西西比世','Epoch','世',358.9, 323.2,'mississippian',1),
 ('Pennsylvanian',  '宾夕法尼亚世','Epoch','世',323.2,298.9,'pennsylvanian',2),
 -- Devonian 泥盆纪
 ('Lower Devonian', '早泥盆世', 'Epoch', '世', 419.2, 393.3, 'lower', 1),
 ('Middle Devonian','中泥盆世', 'Epoch', '世', 393.3, 382.7, 'middle', 2),
 ('Upper Devonian', '晚泥盆世', 'Epoch', '世', 382.7, 358.9, 'upper', 3),
 -- Paleogene 古近纪 (important for porphyry Cu in circum-Pacific)
 ('Paleocene', '古新世', 'Epoch', '世', 66.0, 56.0, 'paleocene', 1),
 ('Eocene',    '始新世', 'Epoch', '世', 56.0, 33.9, 'eocene', 2),
 ('Oligocene', '渐新世', 'Epoch', '世', 33.9, 23.03,'oligocene', 3),
 -- Neogene 新近纪
 ('Miocene',   '中新世', 'Epoch', '世', 23.03, 5.333,'miocene', 1),
 ('Pliocene',  '上新世', 'Epoch', '世', 5.333, 2.58, 'pliocene', 2)
) AS v(name_en, name_zh, rank_en, rank_zh, base, top, subpath, sort)
WHERE p.path = 'phanerozoic.mesozoic.cretaceous' AND v.name_en LIKE '%Cretaceous%'
   OR p.path = 'phanerozoic.mesozoic.jurassic' AND v.name_en LIKE '%Jurassic%'
   OR p.path = 'phanerozoic.mesozoic.triassic' AND v.name_en LIKE '%Triassic%'
   OR p.path = 'phanerozoic.paleozoic.permian' AND v.name_en IN ('Cisuralian','Guadalupian','Lopingian')
   OR p.path = 'phanerozoic.paleozoic.carboniferous' AND v.name_en IN ('Mississippian','Pennsylvanian')
   OR p.path = 'phanerozoic.paleozoic.devonian' AND v.name_en LIKE '%Devonian%'
   OR p.path = 'phanerozoic.cenozoic.paleogene' AND v.name_en IN ('Paleocene','Eocene','Oligocene')
   OR p.path = 'phanerozoic.cenozoic.neogene' AND v.name_en IN ('Miocene','Pliocene');
