# Raw NASA Open-Data Download Cache

This directory caches raw downloaded CSV files from official NASA public repositories:

1. **NASA OSDR `OSD-575`**: SpaceX Inspiration4 Comprehensive Metabolic Panel (`LSDS-8_Comprehensive_Metabolic_Panel_CMP_TRANSFORMED.csv`)
2. **NASA NLSP `CRF_Campaign_3_Daily_Vitals`** (`7153409b-d8a3-5a23-b667-9df8a182dfdc`)
3. **NASA NLSP `MR001G_Campaign_3_Tilt`** (`f4a134da-7131-55f8-a0a1-e67d56509432`)
4. **NASA NLSP `MR010G_Campaign_3_Clinical_Laboratory_Assessment`** (`a36f6361-3492-5590-a675-a0257edf69ac`)
5. **NASA NLSP `CRF_Campaign_3_Symptom_Complaint`** (`625b7cf3-4cef-5983-8ce1-2e33ec807168`)
6. **NASA NLSP `BRSMACT_Campaign_1_Actigraphy`** (`e26501eb-7d7a-5012-8c8e-c5bdb3eecaf6`)

To re-download and verify all 159 CSV files and SHA-256 digests into `data/nasa-normalized/`:

```bash
npx tsx scripts/ingest-nasa-datasets.ts --force
```
