# File 2: Updated `TRANSITIQ_PRD.md` (v2.0.0)

Save this file in the root of your repository as `TRANSITIQ_PRD.md`. It merges your existing v1.0.8 PRD with all locked decisions (`D1–D12`), the 40-feature *RoutePulse* scope (`M6b` / `U5b`), and strict UI/UX rules (`UI_BUILD_PLAN.md`)[cite: 1, 2, 3, 4].

```markdown
# TransitIQ — Product Requirements Document (PRD)

| Field | Value |
|---|---|
| **Problem statement** | **SI-05+** — Public Transport Route and Timing Tracker with a Women-Safety Layer. Give commuters accurate live bus location, ETA, route guidance and service alerts, while reducing women's exposure to unsafe waiting, isolated stops, skipped buses and uncertain travel times. |
| **Product name** | **TransitIQ** (incorporating the full 40-feature *RoutePulse* specification) |
| **GitHub** | `https://github.com/yogendra12tiwari` |
| **Frontend** | React 18 (TypeScript, Vite, Tailwind CSS) — mobile-first Commuter PWA, desktop Authority Dashboard, Presenter Demo Controller, Driver Panel, and public Trusted-Contact page |
| **Backend** | Firebase only (project id: `transiteiq`; owner: `yogendra12tiwari@gmail.com`) — **TypeScript** Cloud Functions (2nd Gen) + **Genkit**, **Zod** schemas (§7.0). No Python. |
| **Live URL** | `https://transiteiq.web.app` (Firebase Hosting) |
| **Prototype city** | Lucknow, India (simulated bus fleet and data, explicitly labelled `"Simulated data"` on every screen) |
| **Doc version** | **v2.0.0** (Merged with Claude Code Handoff D1–D12, M6b 40-Feature Addendum, and UI Build Plan) |
| **Last updated** | 2026-10-23 |
| **Status** | Active Build Specification — Milestones M1–M6 complete; M6b (Feature Completion) & M7 (Polish) active |

---

## 0. Engineering & UI Rules (MANDATORY)

### 0.1 Commit, Push & Deploy After Every Update
1. **After every logical change — small or major — run tests, commit, push to GitHub, and deploy changed targets to Firebase** (`hosting`, `functions`, `firestore:rules`, `firestore:indexes`). Roll back broken deploys immediately.
2. **One logical change per commit.** Use conventional commits: `feat:`, `fix:`, `docs:`, `test:`, `refactor:`, `chore:`, `prompt:`, `guard:`.
3. **Branching:** Changes to **schemas, security rules, trip state machine, or guardrails** require a branch (`feat/<name>`) + PR.
4. **Zero Secrets in Git:** `.gitignore` blocks `.env*` and service-account keys. LLM keys live in Firebase Secret Manager (`firebase functions:secrets:set`).
5. **Prompt Versions are Code:** Stored in `prompts/<flow>.v<N>.md`. Editing a prompt requires a new version file and a `prompt:` commit.

### 0.2 Core UI/UX Rules (`UI_BUILD_PLAN.md` & `UI_UX_INSTRUCTIONS.md`)
1. **One Screen, One Purpose, One Primary Action:** Every screen has at most **one** primary button placed in the thumb zone.
2. **Touch & Typography:** Tap targets $\ge 48\text{ px}$; body text $\ge 16\text{ px}$; WCAG AA contrast.
3. **No Modals:** Never use pop-up modals. Use inline step-by-step wizards (preserving answers on Back), bottom sheets, and persistent toasts.
4. **Zero Jargon on Rider Screens:** Never show terms like *"exposure minutes"*, *"wait-risk score"*, *"ETA"*, or *"cluster"* to commuters. Use plain English and Hindi (*"Arriving in 6–8 min"*, *"10 minutes less waiting at a quiet stop"*).
5. **Accessible Risk Signalling:** Risk badges always pair **colour + icon shape + text label** (`Low`, `Medium`, `High`).
6. **Three Rider Bottom Tabs Only:** `Home`, `Alerts`, `Report`. Emergency help (`/help`) is accessed via a subtle header/inline text link, never a 4th tab.

---

## 1. Executive Summary & Pitch

TransitIQ is a real-time public-transport intelligence platform. For **all commuters**, it provides live bus tracking, arrival time ranges, journey planning with fare and crowding estimates, bus-number search, stop timetables, and delay/skip alerts. For **women commuters**, it adds a safety-aware layer: **Safe Wait Mode**, **Safer Route Mode**, **trusted-contact live trip sharing**, **emergency help access**, and **privacy-first anonymous reporting**. For **transport authorities**, it provides a 5-tab operational dashboard that turns live fleet telemetry and anonymous reports into ranked, actionable priorities.

> **One-Line Pitch:** *"Most transport apps tell you when a bus will arrive. TransitIQ tells women when it is safe to wait, which route minimizes unsafe waiting, and alerts authorities when service failures create risk."*

**Headline Metric — Exposure Minutes:** Minutes spent waiting or walking under higher-risk conditions.

---

## 2. Locked Architectural Decisions (D1–D12)

| ID | Locked Decision |
|---|---|
| **D1** | **Safety-related report categories:** `poor_lighting`, `harassment_concern`, `long_wait`. Stop A seed has exactly **7** safety-related reports (3 lighting, 2 long wait, 2 harassment) plus 2 service reports (`skipped_bus`, `overcrowding`). |
| **D2** | **Safe Wait two-stage trigger:** Primary *"Leave now"* fires when `etaHighMin <= walkMin + 2`; Escalation *"Arriving sooner"* fires when `etaLowMin <= walkMin + 1`. Each fires once per trip. |
| **D3** | **TTL & Expiry:** Store `expiresAtTs` (Firestore Timestamp) alongside `expiresAt` (epoch ms) on `trips`, `rateLimits`, and `logs`. Security rules enforce `expiresAt > request.time.toMillis()`, backed by hourly `purgeExpired`. |
| **D4** | **Monorepo Bundling:** `@transitiq/shared` is bundled into `functions/` using `tsup` (`noExternal`) so Firebase deploys a self-contained artifact. |
| **D5** | **Exposure Weights:** `waitWeight = 0.2 + 0.8 * riskScore`; `walkWeight = 0.25` (lit main road) or `0.70` (poorly lit segment). |
| **D6** | **Privacy-Preserving Rate Limit:** Key is `sha256(uid + stopId + hourBucket)`. Raw anonymous UIDs are never written to reports. |
| **D7** | **Bilingual AI (`en` / `hi`):** Genkit explanations are generated directly in the active UI language with key-parity across `en.json` and `hi.json`. |
| **D8** | **Deterministic Time:** All engine functions accept `nowMs` (IST) and a seeded PRNG; no internal `Date.now()` or `Math.random()`. |
| **D9** | **Driver Panel Separation:** `/driver` writes only to `sim/overrides`, never directly to `sim/live`. The `/demo` controller merges overrides on every 2-second tick. |
| **D10** | **Authority-Only Heatmap:** The safety report heatmap is visible **only** on the Authority Dashboard. Commuter screens show per-stop waiting risk with plain reasons—never neighbourhood rankings (anti-stigma). |
| **D11** | **Non-Dispatch Emergency Screen (`/help`):** Provides one-tap call links (`112`, `1091`) and nearby `helpPoints` (police, hospitals, 24h pharmacies). No automatic dispatch, no background location broadcasting, no audio/video recording. |
| **D12** | **Aggregate-Only CSV Export:** Operator CSV export outputs stop/route aggregates only—zero report text, zero identifiers, zero coordinates finer than stop level. |

---

## 3. Complete Feature Matrix (40-Feature Coverage across M0–M7 & M6b)

### 3.1 Core Transit Features (SI-05)
| ID | Feature | Milestone | Implementation Detail |
|---|---|---|---|
| **F1** | Live bus tracking | M2 / U1 | Smooth 60fps interpolated buses on Leaflet/OSM across 4 Lucknow routes |
| **F2** | Live ETA with uncertainty range | M3 / U2 | Displays 80% confidence band (`"Arriving in 6–8 min"`), widening with distance/variance |
| **F3** | Journey planner with fare estimate | M4 / M6b (`P2-07`) | Direct & transfer routes, walking distance, duration, and distance-slab `"Estimated fare"` (₹) |
| **F4** | Service & anomaly alerts | M3 / M6b (`P2-20`) | System-detected (`DELAY`, `STALL`, `LIKELY_SKIP`, `GHOST_BUS`, `GPS_GAP`) + Operator-published (`CANCELLATION`, `DIVERSION`, `STOP_CLOSED`) |
| **F11** | Bus search by number | M6b (`P2-03`) | Searching `"23"` on Home opens Bus 23 live route, status, and upcoming stops sheet |
| **F12** | Nearby stops & next arrivals | M6b (`P2-04`) | `"Stops near you"` on Home (opt-in geolocation or fixed Lucknow demo point) |
| **F13** | Stop timetable view (`/stop/:id`) | M6b (`P2-05`) | Scheduled arrivals from route headways + live ETAs; cached for offline use |
| **F14** | Trip progress tracker | M6b (`P2-06`) | Ordered stop list showing `✔` completed stops and upcoming stops with live arrival ranges |
| **F15** | Offline / basic PWA mode | M7 / M6b (`P2-05`) | Service worker caches app shell, static network, timetables, and last known `sim/live` state |

### 3.2 AI & Predictive Intelligence Features (Deterministic Engine + Genkit)
| ID | Feature | Milestone | Implementation Detail |
|---|---|---|---|
| **F16** | AI ETA & wait-time prediction | M3 / M6b (`P2-19`) | Speed + traffic factor + historical stop error; exposed in client and `getEta` callable |
| **F17** | Delay-risk prediction | M6b (`P2-08`) | Probability bus arrives late based on current lag + stop delay distribution (`"Likely on time"` / `"May be late"`) |
| **F18** | No-show, skip & GPS-gap detection | M3 / M6b (`P2-21`) | Detects stalled buses, likely skips, ghost departures, and stale GPS telemetry (`GPS_GAP`) |
| **F19** | Route reliability score (`0–100`) | M6b (`P2-09`) | Composite of punctuality, headway adherence, and skip rate from 30-day history |
| **F20** | Crowding prediction | M6b (`P2-10`) | Simulated occupancy by route/hour (`"Seats likely"`, `"Standing likely"`, `"Very crowded"`) |
| **F21** | Report classification & clustering | M6 | Genkit `triageReport` flow + deterministic regex fallback + corroboration clustering (`count/3`) |
| **F22** | Explainable insights ("Why?") | M3 / M6 / M6b (`P2-11`) | Factor bars + Genkit `explainRisk` (≤ 280 chars) + rule-based delay reason (`"Slow movement near Stop 4"`) |

### 3.3 Women-Safety Layer
| ID | Feature | Milestone | Implementation Detail |
|---|---|---|---|
| **F5** | Safe Wait Mode | M5 / U3 | Two-stage toast (`"Leave now"` / `"Arriving sooner"`) + nearby late-open `safeSpots` within 250m |
| **F6** | Safer Route Mode | M4 / U2 | Side-by-side `RouteCompareCard` (Fastest vs. Safer) + `SpeedSafetySlider` ($\alpha$) |
| **F23** | Transparent wait-risk indicator | M3 / M6b (`P2-22`) | `Low` / `Medium` / `High` badge from 5 weighted factors + `cctv` positive modifier (`"Camera nearby"`) |
| **F7** | Trusted-contact trip sharing | M5 / U3 | 128-bit token URL (`/trip/:token`), expires on completion or 2 hours, zero PII |
| **F8** | Anonymous safety reporting | M6 / U4 | Step-by-step wizard; server-side PII redaction; harassment routed to human `reviewQueue` |
| **F24** | Time-aware evening safety notice | M6b (`P2-12`) | Proactive banner when evening wait $> 15\text{ min}$ or headway $> 20\text{ min}$, recommending Safer Route |
| **F25** | Emergency help access (`/help`) | M6b (`P2-23`) | One-tap `Call 112` (primary button), `1091` helpline, and nearby `helpPoints` list (D11) |

### 3.4 Authority Dashboard & Operator Tools
| ID | Feature | Milestone | Implementation Detail |
|---|---|---|---|
| **F9** | Stop priority ranking & analytics | M6 / U5 | Ranks stops by `risk × ridership`; Recharts wait-by-hour chart; rule + Genkit recommendations |
| **F26** | Authority-only safety heatmap | M6b (`P2-13`) | Toggle on Stops tab showing priority-sized stop circles with colour + text labels (D10) |
| **F27** | Live fleet & delay monitoring tab | M6b (`P2-14`, `P2-15`) | 5th dashboard tab (*Fleet*) with *All / Problems* filter and delayed/stalled/ghost breakdown |
| **F28** | Route performance score | M6b (`P2-16`) | Displays `RouteScore` (`0–100`) combining reliability and commuter feedback on Trends tab |
| **F29** | Incident management workflow | M6b (`P2-17`) | Unified *Incidents* tab where operators mark alerts and reports `NEW`, `IN_REVIEW`, or `RESOLVED` with notes |
| **F30** | Operator service alert publisher | M6b (`P2-20`) | Form inside Fleet tab to publish `CANCELLATION`, `DIVERSION`, or `STOP_CLOSED` (excludes closed stops from planner) |
| **F31** | Aggregate CSV data export | M6b (`P2-18`) | `exportReport` callable downloading PII-free daily/weekly stop & route aggregates (D12) |
| **F32** | Driver / Bus simulator panel | M6b (`P2-24`, `P2-25`) | `/driver` page writing bus status & opt-in phone GPS pings to `sim/overrides` (D9) |

---

## 4. Golden Demo Numbers (Contract Asserted by Automated Tests)

`npm run verify:seed` and `npm run verify:demo` **must pass** after every schema, seed, or weight update:

1. **Stop Risk at 20:00 IST:**
   - **Stop A (Hazratganj — isolated, poorly lit):** Expected wait `18 min`, `7` safety-related reports → Score **`0.795` (`High`)**.
   - **Stop B (busy alternative ~350–400m away):** Expected wait `4 min`, `1` report → Score **`0.325` (`Low`)**.
2. **Route Comparison (Lucknow University → Gomti Nagar at 20:00 IST):**
   - **Fastest Option:** `28 min` travel, `14 min` wait at Stop A, Exposure **`16`**, Risk **`High`**.
   - **Safer Option:** `32 min` travel, `4 min` wait at Stop B, Exposure **`3`**, Risk **`Low`**.
   - **Plain-Language Takeaway:** *"4 minutes longer, but 10 minutes less waiting at a quiet stop."*
3. **Evaluation Targets:**
   - **ETA MAE:** Model MAE $\ge 30\%$ lower than naive schedule baseline (achieved: **1.63m vs. 3.89m — 58.1% improvement**).
   - **Safe Wait Outdoor Wait Reduction:** $\ge 50\%$ reduction vs. naive arrival (achieved: **1.97m vs. 12.68m — 84.5% reduction**).

---

## 5. Data Model & Zod Schemas (`shared/schemas/`)

All boundary data is validated with Zod. No schema may contain PII fields (enforced by automated schema tests).

```ts
// Additions in v2.0.0 (M6b Schema Extensions — shared/schemas/)
export const Stop = z.object({
  id: z.string(),
  name: z.string(),
  nameHi: z.string().optional(),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  activity: z.number().min(0).max(1),
  lighting: z.enum(["good", "moderate", "poor"]),
  cctv: z.boolean().default(false),                 // M6b P2-22: "Camera nearby" indicator
  ridershipPerEvening: z.number().int().nonnegative(),
  skipRate: z.number().min(0).max(1),
  safeSpotIds: z.array(z.string()).default([]),
});

export const Route = z.object({
  id: z.string(),
  name: z.string(),
  color: z.string(),
  stopIds: z.array(z.string()).min(2),
  polyline: z.array(z.tuple([z.number(), z.number()])).min(2),
  headwayMin: z.object({ peak: z.number(), offpeak: z.number(), evening: z.number() }),
  fare: z.object({                                  // M6b P2-07: Distance-slab fare estimate
    baseInr: z.number().nonnegative(),
    perKmInr: z.number().nonnegative(),
    minInr: z.number().nonnegative(),
  }).default({ baseInr: 10, perKmInr: 2, minInr: 10 }),
});

export const DriverStatus = z.enum(["RUNNING", "STALLED", "BREAK", "OUT_OF_SERVICE"]);
export const Bus = z.object({
  id: z.string(),
  routeId: z.string(),
  distanceAlongRouteM: z.number().nonnegative(),
  speedMps: z.number().nonnegative(),
  lat: z.number(),
  lng: z.number(),
  status: z.enum(["RUNNING", "STALLED", "DELAYED", "GHOST"]),
  driverStatus: DriverStatus.default("RUNNING"),    // M6b P2-24
  occupancy: z.number().min(0).max(1).default(0.4), // M6b P2-10: Crowding estimate
  lastPingMs: z.number().optional(),
});

export const AlertType = z.enum([
  "DELAY", "STALL", "LIKELY_SKIP", "GHOST_BUS", "ROUTE_DEVIATION", "OVERCROWDING",
  "CANCELLATION", "DIVERSION", "STOP_CLOSED", "GPS_GAP" // M6b P2-20, P2-21
]);

export const IncidentStatus = z.enum(["NEW", "IN_REVIEW", "RESOLVED"]);

export const Alert = z.object({
  id: z.string(),
  type: AlertType,
  severity: z.enum(["low", "medium", "high"]),
  source: z.enum(["system", "operator"]).default("system"),
  status: IncidentStatus.default("NEW"),
  message: z.string(),
  messageHi: z.string().optional(),
  delayReason: z.string().optional(),               // M6b P2-11
  affectedStopIds: z.array(z.string()),
  routeId: z.string().optional(),
  createdAt: z.number(),
});

export const HelpPoint = z.object({                 // M6b P2-23: seed/helpPoints.json
  id: z.string(),
  name: z.string(),
  nameHi: z.string().optional(),
  kind: z.enum(["police", "hospital", "pharmacy_24h", "helpdesk"]),
  lat: z.number(),
  lng: z.number(),
  phone: z.string().optional(),
});

export const Incident = z.object({                  // M6b P2-17: Operator incident tracking
  id: z.string(),
  kind: z.enum(["alert", "report"]),
  refId: z.string(),
  stopId: z.string().optional(),
  routeId: z.string().optional(),
  status: IncidentStatus,
  note: z.string().max(300).default(""),
  updatedAt: z.number(),
});

export const RouteScore = z.object({                // M6b P2-09 & P2-16
  routeId: z.string(),
  punctuality: z.number().min(0).max(100),
  frequency: z.number().min(0).max(100),
  reliability: z.number().min(0).max(100),
  feedback: z.number().min(0).max(100),
  overall: z.number().min(0).max(100),
  updatedAt: z.number(),
});

export const SimOverrideEntry = z.object({          // M6b P2-24: Written by /driver
  busId: z.string(),
  driverStatus: DriverStatus,
  pingLat: z.number().optional(),
  pingLng: z.number().optional(),
  atMs: z.number(),
});
export const SimOverrides = z.record( z.string(), SimOverrideEntry );