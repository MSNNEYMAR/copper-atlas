"""Seed copper deposits by generating INSERT statements directly in Python.
No SQL file parsing — constructs each INSERT from Python data structures.
"""
import json, os, subprocess, sys

TOKEN = os.environ["SUPABASE_ACCESS_TOKEN"]
REF = "aamagslubcfodgeiiqor"
API = f"https://api.supabase.com/v1/projects/{REF}/database/query"

def run(sql):
    """Execute SQL via curl subprocess (works around urllib SSL issues)."""
    data = json.dumps({"query": sql})
    result = subprocess.run([
        "curl", "-s", "-w", "%{http_code}", "-X", "POST", API,
        "-H", f"Authorization: Bearer {TOKEN}",
        "-H", "Content-Type: application/json",
        "-d", data,
    ], capture_output=True, text=True, timeout=30)
    out = result.stdout.strip()
    code = out[-3:] if len(out) >= 3 else "000"
    return code in ("200", "201"), out[:-3].strip()

def insert_deposit(**kwargs):
    """Build and execute an INSERT INTO deposits statement."""
    cols = list(kwargs.keys())
    vals = []
    for k in cols:
        v = kwargs[k]
        if v is None:
            vals.append("NULL")
        elif isinstance(v, bool):
            vals.append("true" if v else "false")
        elif isinstance(v, (int, float)):
            vals.append(str(v))
        elif isinstance(v, list):
            quoted = ", ".join(f"'{item}'" for item in v)
            vals.append(f"ARRAY[{quoted}]")
        elif isinstance(v, str) and (v.startswith("ST_") or v.startswith("(SELECT")):
            vals.append(v)  # raw SQL expression
        else:
            escaped = str(v).replace("'", "''")
            vals.append(f"'{escaped}'")

    col_str = ", ".join(cols)
    val_str = ", ".join(vals)
    sql = f"INSERT INTO deposits ({col_str}) VALUES ({val_str}) ON CONFLICT (slug) DO NOTHING"
    return run(sql)

# ============================================================================
# Deposit data — extracted from 04_copper_deposits.sql
# ============================================================================

deposits = [
    # CHILE
    {
        "slug": "chuquicamata", "name": "Chuquicamata", "name_zh": "丘基卡马塔",
        "primary_mineral": "copper", "secondary_minerals": ["molybdenum", "gold", "silver"],
        "deposit_classification_id": "(SELECT id FROM deposit_classification WHERE code = 'POR_CUMO')",
        "country_id": "(SELECT id FROM countries WHERE iso_code = 'CL')",
        "state_province": "Antofagasta",
        "location": "ST_SetSRID(ST_MakePoint(-68.900, -22.300), 4326)",
        "tonnage_mt": 98.0, "tonnage_mt_low": 85.0, "tonnage_mt_high": 110.0,
        "tonnage_grade_pct": 0.55, "tonnage_confidence": "NI43-101",
        "status": "production", "discovery_year": 1899, "production_start_year": 1915,
        "operator_company": "Codelco", "mining_method": "open_pit",
        "host_rock_age_text": "Eocene-Oligocene", "host_rock_type": "Granodiorite porphyry",
        "tectonic_setting": "Continental arc", "geological_province": "Central Andes",
        "summary_en": "Chuquicamata is the world's largest open-pit copper mine by excavated volume. A classic giant porphyry Cu-Mo deposit.",
        "data_source": "Codelco annual reports; Sillitoe (2010)",
        "data_quality_score": 5, "is_featured": True,
        "tags": ["giant", "porphyry", "open-pit", "supergene-enrichment", "andes"],
    },
    {
        "slug": "escondida", "name": "Escondida",
        "primary_mineral": "copper", "secondary_minerals": ["gold", "silver", "molybdenum"],
        "deposit_classification_id": "(SELECT id FROM deposit_classification WHERE code = 'POR_CUMO')",
        "country_id": "(SELECT id FROM countries WHERE iso_code = 'CL')",
        "state_province": "Antofagasta",
        "location": "ST_SetSRID(ST_MakePoint(-69.067, -24.267), 4326)",
        "tonnage_mt": 130.0, "tonnage_mt_low": 110.0, "tonnage_mt_high": 150.0,
        "tonnage_grade_pct": 0.55, "tonnage_confidence": "JORC",
        "status": "production", "discovery_year": 1981, "production_start_year": 1990,
        "operator_company": "BHP (57.5%)", "mining_method": "open_pit",
        "host_rock_age_text": "Late Eocene-Early Oligocene",
        "tectonic_setting": "Continental arc",
        "summary_en": "Escondida is the world's largest copper producer by output. A supergene-enriched porphyry Cu deposit in the Domeyko fault system.",
        "data_source": "BHP annual reports; Richards et al. (2001)",
        "data_quality_score": 5, "is_featured": True,
        "tags": ["giant", "porphyry", "open-pit", "supergene-enrichment"],
    },
    {
        "slug": "el-teniente", "name": "El Teniente", "name_zh": "埃尔特尼恩特",
        "primary_mineral": "copper", "secondary_minerals": ["molybdenum", "gold", "silver"],
        "deposit_classification_id": "(SELECT id FROM deposit_classification WHERE code = 'POR_CUMO')",
        "country_id": "(SELECT id FROM countries WHERE iso_code = 'CL')",
        "state_province": "O'Higgins",
        "location": "ST_SetSRID(ST_MakePoint(-70.350, -34.083), 4326)",
        "tonnage_mt": 95.0, "tonnage_grade_pct": 0.63, "tonnage_confidence": "JORC",
        "status": "production", "discovery_year": 1819, "production_start_year": 1905,
        "operator_company": "Codelco", "mining_method": "block_caving",
        "host_rock_age_text": "Miocene-Pliocene", "tectonic_setting": "Continental arc",
        "summary_en": "El Teniente is the world's largest underground copper mine. A giant breccia-hosted porphyry Cu-Mo deposit with exceptionally high grades.",
        "data_source": "Codelco annual reports; Skewes et al. (2002)",
        "data_quality_score": 5, "is_featured": True,
        "tags": ["giant", "porphyry", "underground", "breccia", "andes"],
    },
    {
        "slug": "collahuasi", "name": "Collahuasi",
        "primary_mineral": "copper", "secondary_minerals": ["molybdenum", "silver"],
        "deposit_classification_id": "(SELECT id FROM deposit_classification WHERE code = 'POR_CUMO')",
        "country_id": "(SELECT id FROM countries WHERE iso_code = 'CL')",
        "state_province": "Tarapaca",
        "location": "ST_SetSRID(ST_MakePoint(-68.833, -20.983), 4326)",
        "tonnage_mt": 80.0, "tonnage_grade_pct": 0.80,
        "status": "production", "discovery_year": 1880,
        "operator_company": "Anglo American/Glencore", "mining_method": "open_pit",
        "host_rock_age_text": "Eocene-Oligocene", "tectonic_setting": "Continental arc",
        "summary_en": "Collahuasi is one of the largest copper porphyry districts globally.",
        "data_source": "Anglo American technical reports",
        "data_quality_score": 5, "is_featured": False,
        "tags": ["giant", "porphyry", "open-pit", "andes"],
    },
    {
        "slug": "los-bronces", "name": "Los Bronces",
        "primary_mineral": "copper",
        "deposit_classification_id": "(SELECT id FROM deposit_classification WHERE code = 'POR_CUMO')",
        "country_id": "(SELECT id FROM countries WHERE iso_code = 'CL')",
        "state_province": "Metropolitan",
        "location": "ST_SetSRID(ST_MakePoint(-70.267, -33.150), 4326)",
        "tonnage_mt": 55.0, "tonnage_grade_pct": 0.45,
        "status": "production", "discovery_year": 1860,
        "operator_company": "Anglo American", "mining_method": "open_pit",
        "host_rock_age_text": "Miocene-Pliocene", "tectonic_setting": "Continental arc",
        "summary_en": "Los Bronces is a giant breccia-hosted porphyry Cu-Mo deposit in central Chile.",
        "data_source": "Anglo American technical reports",
        "data_quality_score": 4, "is_featured": False,
        "tags": ["giant", "porphyry", "breccia", "andes"],
    },
    # PERU
    {
        "slug": "cerro-verde", "name": "Cerro Verde",
        "primary_mineral": "copper", "secondary_minerals": ["molybdenum"],
        "deposit_classification_id": "(SELECT id FROM deposit_classification WHERE code = 'POR_CUMO')",
        "country_id": "(SELECT id FROM countries WHERE iso_code = 'PE')",
        "state_province": "Arequipa",
        "location": "ST_SetSRID(ST_MakePoint(-71.550, -16.533), 4326)",
        "tonnage_mt": 40.0, "tonnage_grade_pct": 0.38,
        "status": "production", "discovery_year": 1868,
        "operator_company": "Freeport-McMoRan", "mining_method": "open_pit",
        "host_rock_age_text": "Paleocene-Eocene", "tectonic_setting": "Continental arc",
        "summary_en": "Cerro Verde is one of Peru's largest copper producers, a porphyry Cu-Mo deposit with significant supergene enrichment.",
        "data_source": "Freeport-McMoRan technical reports",
        "data_quality_score": 5, "is_featured": False,
        "tags": ["giant", "porphyry", "supergene-enrichment"],
    },
    {
        "slug": "las-bambas", "name": "Las Bambas",
        "primary_mineral": "copper", "secondary_minerals": ["gold", "molybdenum", "silver"],
        "deposit_classification_id": "(SELECT id FROM deposit_classification WHERE code = 'POR_CUAU')",
        "country_id": "(SELECT id FROM countries WHERE iso_code = 'PE')",
        "state_province": "Apurimac",
        "location": "ST_SetSRID(ST_MakePoint(-72.317, -14.100), 4326)",
        "tonnage_mt": 25.0, "tonnage_grade_pct": 0.61,
        "status": "production",
        "operator_company": "MMG", "mining_method": "open_pit",
        "host_rock_age_text": "Eocene-Oligocene", "tectonic_setting": "Continental arc",
        "summary_en": "Las Bambas is a major skarn-porphyry Cu-Au-Mo system in southern Peru.",
        "data_source": "MMG technical reports",
        "data_quality_score": 5, "is_featured": False,
        "tags": ["giant", "skarn", "porphyry", "andes"],
    },
    {
        "slug": "antamina", "name": "Antamina",
        "primary_mineral": "copper", "secondary_minerals": ["zinc", "molybdenum", "silver", "lead"],
        "deposit_classification_id": "(SELECT id FROM deposit_classification WHERE code = 'SKN_CALC')",
        "country_id": "(SELECT id FROM countries WHERE iso_code = 'PE')",
        "state_province": "Ancash",
        "location": "ST_SetSRID(ST_MakePoint(-77.050, -9.533), 4326)",
        "tonnage_mt": 20.0, "tonnage_grade_pct": 1.00,
        "status": "production", "discovery_year": 1952,
        "operator_company": "Teck/BHP/Glencore/Mitsubishi", "mining_method": "open_pit",
        "host_rock_age_text": "Miocene", "tectonic_setting": "Continental arc",
        "summary_en": "Antamina is the world's largest known skarn deposit, with exceptional Cu-Zn grades in a calcic skarn setting.",
        "data_source": "Teck technical reports; Love et al. (2004)",
        "data_quality_score": 5,
        "tags": ["giant", "skarn", "calcic", "polymetallic"],
    },
    {
        "slug": "quellaveco", "name": "Quellaveco",
        "primary_mineral": "copper",
        "deposit_classification_id": "(SELECT id FROM deposit_classification WHERE code = 'POR_CUMO')",
        "country_id": "(SELECT id FROM countries WHERE iso_code = 'PE')",
        "state_province": "Moquegua",
        "location": "ST_SetSRID(ST_MakePoint(-70.917, -17.117), 4326)",
        "tonnage_mt": 15.0, "tonnage_grade_pct": 0.47,
        "status": "production",
        "operator_company": "Anglo American", "mining_method": "open_pit",
        "host_rock_age_text": "Paleocene-Eocene", "tectonic_setting": "Continental arc",
        "summary_en": "Quellaveco is a major porphyry Cu-Mo deposit in southern Peru, commissioned in 2022.",
        "data_source": "Anglo American technical reports",
        "data_quality_score": 5,
        "tags": ["giant", "porphyry", "andes"],
    },
    # USA
    {
        "slug": "bingham-canyon", "name": "Bingham Canyon (Kennecott)",
        "primary_mineral": "copper", "secondary_minerals": ["gold", "molybdenum", "silver"],
        "deposit_classification_id": "(SELECT id FROM deposit_classification WHERE code = 'POR_CUMO')",
        "country_id": "(SELECT id FROM countries WHERE iso_code = 'US')",
        "state_province": "Utah",
        "location": "ST_SetSRID(ST_MakePoint(-112.150, 40.533), 4326)",
        "tonnage_mt": 35.0, "tonnage_grade_pct": 0.50,
        "status": "production", "discovery_year": 1848, "production_start_year": 1906,
        "operator_company": "Rio Tinto", "mining_method": "open_pit",
        "host_rock_age_text": "Eocene", "tectonic_setting": "Continental arc (Laramide)",
        "summary_en": "Bingham Canyon is one of the world's most productive porphyry Cu-Mo-Au deposits.",
        "data_source": "Rio Tinto annual reports; John (2010)",
        "data_quality_score": 5, "is_featured": True,
        "tags": ["giant", "porphyry", "type-example", "laramide"],
    },
    {
        "slug": "morenci", "name": "Morenci",
        "primary_mineral": "copper",
        "deposit_classification_id": "(SELECT id FROM deposit_classification WHERE code = 'POR_CUMO')",
        "country_id": "(SELECT id FROM countries WHERE iso_code = 'US')",
        "state_province": "Arizona",
        "location": "ST_SetSRID(ST_MakePoint(-109.333, 33.083), 4326)",
        "tonnage_mt": 28.0, "tonnage_grade_pct": 0.26,
        "status": "production", "discovery_year": 1865,
        "operator_company": "Freeport-McMoRan", "mining_method": "open_pit",
        "host_rock_age_text": "Laramide (Paleocene-Eocene)", "tectonic_setting": "Continental arc (Laramide)",
        "summary_en": "Morenci is the largest copper mine in North America by production.",
        "data_source": "Freeport-McMoRan technical reports",
        "data_quality_score": 5,
        "tags": ["giant", "porphyry", "supergene-enrichment", "laramide"],
    },
    {
        "slug": "resolution", "name": "Resolution",
        "primary_mineral": "copper",
        "deposit_classification_id": "(SELECT id FROM deposit_classification WHERE code = 'POR_CUMO')",
        "country_id": "(SELECT id FROM countries WHERE iso_code = 'US')",
        "state_province": "Arizona",
        "location": "ST_SetSRID(ST_MakePoint(-111.083, 33.300), 4326)",
        "tonnage_mt": 25.0, "tonnage_grade_pct": 1.47,
        "status": "development",
        "operator_company": "Rio Tinto/BHP", "mining_method": "block_caving",
        "host_rock_age_text": "Laramide", "tectonic_setting": "Continental arc",
        "summary_en": "Resolution is one of the largest undeveloped copper deposits globally.",
        "data_source": "Rio Tinto technical reports",
        "data_quality_score": 5,
        "tags": ["giant", "porphyry", "undeveloped", "deep", "laramide"],
    },
    # DRC / ZAMBIA
    {
        "slug": "kamoa-kakula", "name": "Kamoa-Kakula",
        "primary_mineral": "copper",
        "deposit_classification_id": "(SELECT id FROM deposit_classification WHERE code = 'SED_SSC')",
        "country_id": "(SELECT id FROM countries WHERE iso_code = 'CD')",
        "state_province": "Lualaba",
        "location": "ST_SetSRID(ST_MakePoint(25.033, -10.667), 4326)",
        "tonnage_mt": 60.0, "tonnage_grade_pct": 3.50,
        "status": "production", "discovery_year": 2008,
        "operator_company": "Ivanhoe Mines/Zijin Mining", "mining_method": "underground",
        "host_rock_age_text": "Neoproterozoic", "tectonic_setting": "Intracratonic rift",
        "geological_province": "Central African Copperbelt",
        "summary_en": "Kamoa-Kakula is the world's highest-grade major copper deposit, discovered in 2008.",
        "data_source": "Ivanhoe Mines technical reports; Hitzman et al. (2012)",
        "data_quality_score": 5, "is_featured": True,
        "tags": ["giant", "sediment-hosted", "high-grade", "copperbelt"],
    },
    {
        "slug": "tenke-fungurume", "name": "Tenke Fungurume",
        "primary_mineral": "copper", "secondary_minerals": ["cobalt"],
        "deposit_classification_id": "(SELECT id FROM deposit_classification WHERE code = 'SED_SSC')",
        "country_id": "(SELECT id FROM countries WHERE iso_code = 'CD')",
        "state_province": "Lualaba",
        "location": "ST_SetSRID(ST_MakePoint(25.650, -10.600), 4326)",
        "tonnage_mt": 35.0, "tonnage_grade_pct": 2.50,
        "status": "production",
        "operator_company": "CMOC Group", "mining_method": "open_pit",
        "host_rock_age_text": "Neoproterozoic", "tectonic_setting": "Intracratonic rift",
        "geological_province": "Central African Copperbelt",
        "summary_en": "Tenke Fungurume is one of the world's largest sediment-hosted Cu-Co deposits in the Central African Copperbelt.",
        "data_source": "Freeport-McMoRan/CMOC technical reports",
        "data_quality_score": 5,
        "tags": ["giant", "sediment-hosted", "cobalt", "copperbelt"],
    },
    # INDONESIA
    {
        "slug": "grasberg", "name": "Grasberg",
        "primary_mineral": "copper", "secondary_minerals": ["gold", "silver"],
        "deposit_classification_id": "(SELECT id FROM deposit_classification WHERE code = 'POR_CUAU')",
        "country_id": "(SELECT id FROM countries WHERE iso_code = 'ID')",
        "state_province": "Papua",
        "location": "ST_SetSRID(ST_MakePoint(137.117, -4.050), 4326)",
        "tonnage_mt": 50.0, "tonnage_grade_pct": 1.00,
        "status": "production", "discovery_year": 1936,
        "operator_company": "PT Freeport Indonesia", "mining_method": "block_caving",
        "host_rock_age_text": "Pliocene", "tectonic_setting": "Island arc collision",
        "summary_en": "Grasberg is one of the world's largest Cu-Au deposits.",
        "data_source": "Freeport-McMoRan technical reports; Cooke et al. (2005)",
        "data_quality_score": 5, "is_featured": True,
        "tags": ["giant", "porphyry", "skarn", "gold-rich", "island-arc"],
    },
    # MONGOLIA
    {
        "slug": "oyu-tolgoi", "name": "Oyu Tolgoi", "name_zh": "奥尤陶勒盖",
        "primary_mineral": "copper", "secondary_minerals": ["gold", "silver", "molybdenum"],
        "deposit_classification_id": "(SELECT id FROM deposit_classification WHERE code = 'POR_CUAU')",
        "country_id": "(SELECT id FROM countries WHERE iso_code = 'MN')",
        "state_province": "Omnogovi",
        "location": "ST_SetSRID(ST_MakePoint(106.867, -43.017), 4326)",
        "tonnage_mt": 45.0, "tonnage_grade_pct": 0.85,
        "status": "production", "discovery_year": 2001,
        "operator_company": "Rio Tinto/Turquoise Hill", "mining_method": "block_caving",
        "host_rock_age_text": "Devonian", "tectonic_setting": "Island arc",
        "summary_en": "Oyu Tolgoi is one of the world's largest Cu-Au porphyry systems, discovered in 2001.",
        "data_source": "Rio Tinto technical reports; Wainwright et al. (2011)",
        "data_quality_score": 5, "is_featured": True,
        "tags": ["giant", "porphyry", "gold-rich", "caob", "gobi"],
    },
    # AUSTRALIA
    {
        "slug": "olympic-dam", "name": "Olympic Dam",
        "primary_mineral": "copper", "secondary_minerals": ["gold", "uranium", "silver", "rare_earth"],
        "deposit_classification_id": "(SELECT id FROM deposit_classification WHERE code = 'IOCG_HEM')",
        "country_id": "(SELECT id FROM countries WHERE iso_code = 'AU')",
        "state_province": "South Australia",
        "location": "ST_SetSRID(ST_MakePoint(136.867, -30.450), 4326)",
        "tonnage_mt": 80.0, "tonnage_grade_pct": 0.80,
        "status": "production", "discovery_year": 1975,
        "operator_company": "BHP", "mining_method": "underground",
        "host_rock_age_text": "Mesoproterozoic", "tectonic_setting": "Intracratonic (Gawler Craton)",
        "summary_en": "Olympic Dam is the largest single uranium deposit and one of the largest copper deposits globally. The type example of an IOCG deposit.",
        "data_source": "BHP annual reports; Ehrig et al. (2012)",
        "data_quality_score": 5, "is_featured": True,
        "tags": ["giant", "iocg", "type-example", "uranium", "proterozoic"],
    },
    {
        "slug": "cadia-ridgeway", "name": "Cadia-Ridgeway",
        "primary_mineral": "copper", "secondary_minerals": ["gold"],
        "deposit_classification_id": "(SELECT id FROM deposit_classification WHERE code = 'POR_CUAU')",
        "country_id": "(SELECT id FROM countries WHERE iso_code = 'AU')",
        "state_province": "New South Wales",
        "location": "ST_SetSRID(ST_MakePoint(149.000, -33.467), 4326)",
        "tonnage_mt": 18.0, "tonnage_grade_pct": 0.40,
        "status": "production",
        "operator_company": "Newmont", "mining_method": "block_caving",
        "host_rock_age_text": "Ordovician", "tectonic_setting": "Island arc (Macquarie Arc)",
        "summary_en": "Cadia-Ridgeway is Australia's largest porphyry Au-Cu system, in the Ordovician Macquarie Arc of NSW.",
        "data_source": "Newmont technical reports; Wilson et al. (2003)",
        "data_quality_score": 5,
        "tags": ["giant", "porphyry", "gold-rich", "ordovician"],
    },
    # RUSSIA / POLAND / OTHERS
    {
        "slug": "udokan", "name": "Udokan",
        "primary_mineral": "copper",
        "deposit_classification_id": "(SELECT id FROM deposit_classification WHERE code = 'SED_SSC')",
        "country_id": "(SELECT id FROM countries WHERE iso_code = 'RU')",
        "location": "ST_SetSRID(ST_MakePoint(118.500, 56.667), 4326)",
        "tonnage_mt": 26.0, "tonnage_grade_pct": 1.05,
        "status": "development",
        "host_rock_age_text": "Paleoproterozoic", "tectonic_setting": "Intracratonic rift",
        "summary_en": "Udokan is the largest undeveloped copper deposit in Russia.",
        "data_source": "Baikal Mining Company reports; USGS",
        "data_quality_score": 4,
        "tags": ["sediment-hosted", "proterozoic", "undeveloped"],
    },
    {
        "slug": "norilsk", "name": "Norilsk-Talnakh",
        "primary_mineral": "copper", "secondary_minerals": ["nickel", "palladium", "platinum", "cobalt", "gold"],
        "deposit_classification_id": "(SELECT id FROM deposit_classification WHERE code = 'MAG')",
        "country_id": "(SELECT id FROM countries WHERE iso_code = 'RU')",
        "location": "ST_SetSRID(ST_MakePoint(88.167, 69.333), 4326)",
        "tonnage_mt": 30.0, "tonnage_grade_pct": 2.00,
        "status": "production",
        "host_rock_age_text": "Permian-Triassic", "tectonic_setting": "Large Igneous Province (Siberian Traps)",
        "summary_en": "The Norilsk region hosts the world's largest magmatic Ni-Cu-PGE sulfide deposits.",
        "data_source": "Nornickel reports; Naldrett (2010)",
        "data_quality_score": 5,
        "tags": ["giant", "magmatic", "nickel", "pgm", "siberian-traps"],
    },
    {
        "slug": "kghm-lubin", "name": "KGHM (Lubin-Glogow)", "name_zh": "卢宾-格沃古夫铜矿带",
        "primary_mineral": "copper", "secondary_minerals": ["silver", "lead", "zinc"],
        "deposit_classification_id": "(SELECT id FROM deposit_classification WHERE code = 'SED_SSC')",
        "country_id": "(SELECT id FROM countries WHERE iso_code = 'PL')",
        "location": "ST_SetSRID(ST_MakePoint(16.167, 51.450), 4326)",
        "tonnage_mt": 40.0, "tonnage_grade_pct": 2.00,
        "status": "production", "discovery_year": 1957,
        "operator_company": "KGHM Polska Miedz", "mining_method": "underground",
        "host_rock_age_text": "Permian (Zechstein)", "tectonic_setting": "Intracratonic basin",
        "summary_en": "The Kupferschiefer is Europe's largest copper district and the type example of reduced-facies SSC deposits.",
        "data_source": "KGHM reports; Oszczepalski (1999)",
        "data_quality_score": 5,
        "tags": ["giant", "sediment-hosted", "kupferschiefer", "silver", "permian"],
    },
    {
        "slug": "cobre-panama", "name": "Cobre Panama",
        "primary_mineral": "copper", "secondary_minerals": ["gold", "molybdenum", "silver"],
        "deposit_classification_id": "(SELECT id FROM deposit_classification WHERE code = 'POR_CUAU')",
        "country_id": "(SELECT id FROM countries WHERE iso_code = 'PA')",
        "location": "ST_SetSRID(ST_MakePoint(-80.683, 8.900), 4326)",
        "tonnage_mt": 18.0, "tonnage_grade_pct": 0.36,
        "status": "suspended",
        "host_rock_age_text": "Miocene-Pliocene", "tectonic_setting": "Island arc (Central American Arc)",
        "summary_en": "Cobre Panama is one of the largest new copper mines opened in the 21st century.",
        "data_source": "First Quantum Minerals reports",
        "data_quality_score": 5,
        "tags": ["giant", "porphyry", "island-arc", "miocene", "suspended"],
    },
    {
        "slug": "kansanshi", "name": "Kansanshi",
        "primary_mineral": "copper", "secondary_minerals": ["gold"],
        "deposit_classification_id": "(SELECT id FROM deposit_classification WHERE code = 'SED_SSC')",
        "country_id": "(SELECT id FROM countries WHERE iso_code = 'ZM')",
        "location": "ST_SetSRID(ST_MakePoint(26.467, -12.133), 4326)",
        "tonnage_mt": 15.0, "tonnage_grade_pct": 0.70,
        "status": "production",
        "operator_company": "First Quantum Minerals", "mining_method": "open_pit",
        "host_rock_age_text": "Neoproterozoic", "geological_province": "Central African Copperbelt",
        "summary_en": "Kansanshi is Africa's largest copper mine by production.",
        "data_source": "First Quantum Minerals reports",
        "data_quality_score": 4,
        "tags": ["sediment-hosted", "gold-rich", "copperbelt"],
    },
    {
        "slug": "sentinel-kalumbila", "name": "Sentinel (Kalumbila)",
        "primary_mineral": "copper",
        "deposit_classification_id": "(SELECT id FROM deposit_classification WHERE code = 'SED_SSC')",
        "country_id": "(SELECT id FROM countries WHERE iso_code = 'ZM')",
        "state_province": "North-Western",
        "location": "ST_SetSRID(ST_MakePoint(25.200, -12.200), 4326)",
        "tonnage_mt": 15.0, "tonnage_grade_pct": 0.50,
        "status": "production",
        "operator_company": "First Quantum Minerals", "mining_method": "open_pit",
        "host_rock_age_text": "Neoproterozoic", "geological_province": "Central African Copperbelt",
        "summary_en": "Sentinel is one of Zambia's largest copper mines, in the Kalumbila district.",
        "data_source": "First Quantum Minerals technical reports",
        "data_quality_score": 4,
        "tags": ["sediment-hosted", "copperbelt"],
    },
]

def main():
    ok, skip, fail = 0, 0, 0
    total = len(deposits)
    for i, d in enumerate(deposits):
        success, msg = insert_deposit(**d)
        if success:
            ok += 1
        elif "already exists" in msg.lower() or "duplicate" in msg.lower() or "no rows" in msg.lower():
            skip += 1
        else:
            fail += 1
            if fail <= 5:
                print(f"  FAIL [{d['slug']}]: {msg[:200]}")

        if (i + 1) % 5 == 0:
            print(f"  [{i+1}/{total}] ok={ok} skip={skip} fail={fail}")

    print(f"\nResults: {ok} OK, {skip} skip, {fail} fail / {total}")
    sys.exit(1 if fail > 0 else 0)

if __name__ == "__main__":
    main()
