# TransitIQ — Seed Data Documentation

> **IMPORTANT NOTICE:** All datasets in this directory are **100% simulated** for Lucknow prototype demonstration. No real commuter PII, actual GPS telemetry, or live operational records are stored.

---

## Seed Files Overview

### 1. `stops.json`

- **Schema:** Validated by `shared/src/schemas/network.ts` (`Stop`).
- **Contents:** 16 bus stops along major Lucknow corridors (Charbagh, Hazratganj, Gomti Nagar, Alambagh, Chowk, Lucknow University, etc.).
- **Key Entities:**
  - `stop_A` ("Stop A (Example)"): Isolated stretch, lighting = "poor", activity = 0.20, skip rate = 0.25, ridership = 400.
  - `stop_B` ("Stop B (Market Junction)"): Busy lit stretch ~350m from Stop A, lighting = "good", activity = 0.80, skip rate = 0.05.

### 2. `routes.json`

- **Schema:** Validated by `shared/src/schemas/network.ts` (`Route`).
- **Contents:** 4 simulated bus routes:
  - `route_23` (Bus 23, Red): Charbagh → Hazratganj → Lohia Path → **Stop A** → Gomti Nagar.
  - `route_12` (Bus 12, Blue): Alambagh → Naka Hindola → Aminabad → Lucknow University.
  - `route_7` (Bus 7, Green): Chowk → Hazratganj → **Stop B** → Munshi Pulia → Indira Nagar.
  - `route_41` (Bus 41, Orange): Charbagh → Aminabad → Hazratganj → **Stop B** → Gomti Nagar.

### 3. `safeSpots.json`

- **Schema:** Validated by `shared/src/schemas/network.ts` (`SafeSpot`).
- **Contents:** 12 safe waiting points (24/7 pharmacies, petrol pumps, guarded ATMs, well-lit shops) positioned within walking distance of stops, particularly Stop A and Stop B.

### 4. `reports.json`

- **Schema:** Validated by `shared/src/schemas/reports.ts` (`Report`).
- **Contents:** 29 simulated reports in Hindi and English.
- **Stop A Contract:** Contains exactly **9 total reports**:
  - **7 safety-related reports** (3 `poor_lighting`, 2 `long_wait`, 2 `harassment_concern`).
  - **2 service reports** (1 `skipped_bus`, 1 `overcrowding`).
- **Privacy Guarantee:** Zero personal data, no names, no phone numbers, no location coordinates.

### 5. `history.json`

- **Generator:** `scripts/generate-history.ts` using seeded RNG (`20261023`).
- **Contents:** 30 days × 16 stops × hours 6–22 of simulated wait times, delay minutes, skip events, and ETA errors.
- **Calibrated Targets:**
  - Stop A evening average wait (hours 19–22) = **18.0 min** (± 0.5).
  - Stop B evening average wait (hours 19–22) = **4.0 min** (± 0.5).

### 6. `incidents.json`

- **Contents:** Scripted timeline for the demo:
  - t = 120s: Bus 23 stalls for 6 minutes.
  - t = 125s: `LIKELY_SKIP` alert triggers for Stop A.
  - t = 180s: Route 12 scheduled departure ghost bus detected.
