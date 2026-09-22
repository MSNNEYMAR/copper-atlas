# Seed Dataset v0.1 — Data Sources

> 100 Representative Global Copper Deposits
> All data from public, verifiable sources

## Primary Sources

1. **USGS Mineral Resources Data System (MRDS)** — https://mrdata.usgs.gov/mrds/
   Global mineral deposit database maintained by the United States Geological Survey.

2. **USGS Global Copper Assessment** — https://pubs.usgs.gov/sir/2010/5090/
   Undiscovered copper resource assessment. Provides tonnage models for major deposit types.

3. **Sillitoe, R.H. (2010)** — Porphyry Copper Systems. Economic Geology, 105(1), 3-41.
   DOI: 10.2113/gsecongeo.105.1.3 — Definitive review of global porphyry copper systems.

4. **Company Technical Reports (NI 43-101 / JORC)**:
   - Codelco Annual Reports (Chilean state copper company)
   - BHP Annual Reports (Escondida, Olympic Dam)
   - Freeport-McMoRan Technical Reports (Grasberg, Morenci, Cerro Verde)
   - Rio Tinto Annual Reports (Bingham Canyon, Oyu Tolgoi, Resolution)
   - Anglo American Technical Reports (Los Bronces, Collahuasi, Quellaveco)
   - Ivanhoe Mines Technical Reports (Kamoa-Kakula)
   - First Quantum Minerals Reports (Cobre Panama, Kansanshi, Sentinel)
   - KGHM Annual Reports (Lubin-Glogow)

5. **National Geological Surveys**:
   - SERNAGEOMIN (Chile) — Chilean copper deposit database
   - INGEMMET (Peru) — Peruvian mineral deposits
   - Geoscience Australia — Australian mineral deposits
   - GSC (Canada) — Canadian mineral deposits
   - CGS (China) — Chinese mineral deposits

6. **Key Academic Papers**:
   - Richards, J.P. (2003) — Tectono-magmatic precursors for porphyry Cu deposits. Economic Geology.
   - Cooke, D.R. et al. (2005) — Giant porphyry deposits. Economic Geology 100th Anniversary.
   - Hitzman, M.W. et al. (2010) — Sediment-hosted stratiform copper deposits. Economic Geology.
   - Williams, P.J. et al. (2005) — IOCG deposits. Economic Geology 100th Anniversary.
   - Meinert, L.D. et al. (2005) — World skarn deposits. Economic Geology 100th Anniversary.
   - Naldrett, A.J. (2010) — Magmatic sulfide deposits. Economic Geology.

7. **Mining Industry Data**:
   - S&P Global Market Intelligence (formerly SNL Metals & Mining)
   - Mining Intelligence database

## License

- USGS MRDS: Public Domain (US Government work)
- Company reports: Publicly filed documents, cited per fair use
- Academic papers: Cited with DOI
- Geological survey data: Varies by country (mostly public domain or CC-BY)

## Confidence

All 100 deposits in this seed file have `data_quality_score >= 3`.
- Score 5: Verified from NI 43-101 / JORC report or peer-reviewed paper (60+ deposits)
- Score 4: Verified from USGS MRDS or government survey (30+ deposits)
- Score 3: Reliable secondary sources (remaining)

## Verification Status

- 85 deposits: `verified` (cross-referenced with at least 2 independent sources)
- 15 deposits: `pending_final_review` (single source confirmation)

## Coordinate Verification (2026-09-22)

All 100 deposit coordinates were rechecked against the bundled Mindat/Global Copper Deposit dataset, OpenMindat locality export, OpenStreetMap/OpenStreetMap Nominatim, and Wikipedia coordinates where available. The per-record audit trail is stored in `data/seed_v2/coordinate_audit.csv`. Coordinates were also checked against coarse national bounding boxes to catch gross misplacements.
