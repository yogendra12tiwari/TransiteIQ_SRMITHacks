# TransitIQ — Product Requirements Document (PRD)

| Field | Value |
|---|---|
| Problem statement | **SI-05+** — Public Transport Route and Timing Tracker with a Women-Safety Layer. Give commuters accurate live bus location, ETA, route guidance and service alerts, while reducing women's exposure to unsafe waiting, isolated stops, skipped buses and uncertain travel times. |
| Product name | **TransitIQ** |
| github | https://github.com/yogendra12tiwari |
| Frontend | React (TypeScript, Vite) — responsive web app / PWA (mobile-first rider app, desktop authority dashboard, public trusted-contact page) |
| Backend | Firebase only (project id: `transiteiq` — fill in; owner account: `yogendra12tiwari@gmail.com` — the email used to log in to Firebase) — **TypeScript** Cloud Functions + **Genkit**, **zod** schemas (§7.0). No Python. |
| Live URL | `https://transiteiq.web.app` (Firebase Hosting site, deploy target `hosting`) |
| Prototype city | Lucknow, India (simulated bus fleet, simulated data, labelled as such everywhere in the UI) |
| Doc version | v1.0.2 |
| Last updated | 2026-10-23 |
| Status | Draft — open questions in §17 must be resolved before build starts |

---

## 0. Engineering rule: commit, push & deploy after every update (MANDATORY)

This rule applies to **every** contributor and every AI coding agent (including Claude Code) working on this repo.

1. **After every change — small or major — commit and push to GitHub, then deploy to Firebase** (`firebase deploy --only <changed targets>`: `hosting`, `functions`, `firestore:rules`, `firestore:indexes`). Deploy only after tests pass. A broken deploy is rolled back immediately (`firebase hosting:rollback` / redeploy the previous functions commit). No local-only work lasting longer than one logical change. A "change" is any of: a new file, a bug fix, a prompt edit, a schema change, a test, a doc edit, a config tweak.
2. **One logical change per commit.** Don't bundle unrelated edits.
3. **Conventional commit messages:** `feat:`, `fix:`, `docs:`, `test:`, `refactor:`, `chore:`, `prompt:` (prompt/template changes), `guard:` (guardrail changes). Example: `guard: redact phone numbers in report text before storage`.
4. **Branching:** small changes may go to `main` directly during the hackathon; anything touching the **trip state machine, guardrails, security rules, or the data model** goes through a short-lived branch `feat/<name>` → PR → merge, and is still pushed after every commit.
5. **Never push** secrets (`.env`, API keys, service-account JSON), real user data, or personal information. `.gitignore` must cover these from commit #1. Genkit/LLM API keys live in Firebase Secret Manager (`firebase functions:secrets:set`), never in the repo.
6. **Tests before push & deploy:** `npm test` in `web/` (Vitest + React Testing Library) and `npm test` in `functions/` (Vitest — every module's suite: trip state machine, ETA, wait-risk, exposure/route ranking, detectors, Safe Wait scheduler, guardrails, LLM module, judge — run against the Firebase Emulator Suite) must pass locally. GitHub Actions re-runs them on every push and, on `main`, deploys to Firebase automatically (service-account secret stored in GitHub Secrets, never in the repo).
7. **Prompt versions are code.** Every prompt lives in `prompts/<flow>.v<N>.md`; editing a prompt = new version file + commit. Logs record which prompt version produced every output (§11).
8. **Update this PRD's changelog (§18)** whenever scope, design, or a decision changes — and push it in the same commit series.

---

## 1. Summary

TransitIQ is a real-time public-transport intelligence platform. For **all commuters** it provides live bus tracking, ETA with an uncertainty range, route planning and delay/skip alerts. For **women commuters** it adds a safety-aware layer: **Safe Wait Mode**, **Safer Route Mode**, **trusted-contact trip sharing** and **anonymous reporting**. For **transport authorities** it provides a dashboard that turns live service data and anonymous reports into ranked, actionable priorities.

> **Pitch:** "Most transport apps tell you when a bus will arrive. TransitIQ tells women when it is safe to wait, which route minimizes unsafe waiting, and alerts authorities when service failures create risk."

**Core insight:** the root problem is **uncertainty, which turns into exposure**. If a commuter knows exactly when the bus arrives, she does not need to stand at an isolated stop. Reliable information is itself a safety intervention.

**Headline metric: Exposure Minutes** — minutes spent waiting or walking under higher-risk conditions. The route ranker, dashboard and impact claims are all built around this one metric.

---

## 2. Problem Statement

### 2.1 Original problem (SI-05)
Commuters lack accurate real-time information about bus routes, locations and timings, causing long waits, missed connections and poor trip planning.

### 2.2 The invisible problem
Women face additional risks that official records do not capture because many concerns go unreported:
- Unsafe waiting at poorly lit or isolated stops, especially after dark
- Unreliable, delayed or skipped ("ghost") buses
- Uncertain travel times that force long waits outdoors
- Poorly planned travel windows (late evening, low-frequency periods)
- Harassment concerns that never reach authorities

### 2.3 Three gaps

| Gap | Description | Who feels it |
|---|---|---|
| Information gap | No reliable ETA; skipped or ghost buses | Everyone |
| Exposure gap | Long waits at poorly lit/isolated stops, esp. after dark | Disproportionately women |
| Visibility gap | Authorities never see unreported harassment or unsafe stops | Operators and planners |

### 2.4 Why existing apps fall short
Google Maps / Chalo-style apps optimise arrival time and shortest travel time. They do not quantify waiting risk, rank routes by exposure, expose ghost-bus reliability, or give authorities a feedback loop from commuter experience to action.

---

## 3. Goals, Non-goals, Success Metrics

### 3.1 Goals (MVP)
1. Show live simulated buses on 3–4 Lucknow routes with ETAs as ranges.
2. Detect and alert on delayed, stalled, likely-skipped and ghost buses.
3. Compare **fastest vs safer route** using exposure minutes.
4. Deliver a **Safe Wait** "leave now" notification timed to the late end of the ETA range.
5. Support **trusted-contact trip sharing** via an expiring link (no login for the receiver).
6. Accept **anonymous reports**, triage and cluster them (with Genkit + deterministic fallback), and feed an **authority dashboard**.
7. Run entirely on **Firebase** with a public live URL and automated CI/CD.

### 3.2 Non-goals (MVP)
Real GPS integration, real SOS/emergency dispatch, SMS/WhatsApp, native apps, user accounts with identity, payments, automated enforcement, crime prediction.

### 3.3 Success metrics (reported on simulated data, clearly labelled)
| Metric | Target |
|---|---|
| ETA MAE vs naive schedule-only baseline | Model MAE at least 30% lower than baseline |
| Avg exposure minutes per trip: fastest vs safer route | Safer route ≥ 60% lower (demo: 16 → 3) |
| Safe Wait outdoor-wait reduction (simulated trips) | ≥ 50% |
| Report → dashboard latency | < 5 s |
| Demo run reliability | 3 consecutive clean runs |

---

## 4. Users and Personas

| Persona | Description | Needs |
|---|---|---|
| **Priya (primary)** | 21, college student, Lucknow; bus home ~8:30 PM | Know if/when the bus comes, avoid isolated waiting, share trip with family |
| General commuter | Office worker, elderly or disabled rider | Accurate ETA, delay alerts, route options |
| Trusted contact | Parent/sibling/friend | Watch a trip via a link, no app, no account |
| Transport authority user | Planner/operator at the city transport corporation | Where buses are delayed, which stops have long waits and repeated reports, what to fix |
| Report reviewer (human) | Authority staff or NGO partner | Review harassment-tagged reports; no automated action |

---

## 5. Features

### 5.1 Full feature list

| # | Feature | Audience | Priority |
|---|---|---|---|
| F1 | Live bus tracking (location, route, direction, next stops) | All | **Core** |
| F2 | ETA with uncertainty range (e.g. "6–8 min") | All | **Core** |
| F3 | Route planner (routes, stops, walking distance, travel time) | All | **Core** |
| F4 | Service alerts (delay, stall, likely skip, ghost bus, deviation, crowding) | All | **Core** |
| F5 | Safe Wait Mode ("leave now" notification) | Women | **Core** |
| F6 | Safer Route Mode (exposure-based ranking, speed-vs-safety slider) | Women | **Core** |
| F7 | Trusted-contact trip sharing (expiring link) | Women | **Core** |
| F8 | Anonymous feedback/report form | All | **Core** |
| F9 | Authority dashboard (priority ranking, recommendations, review queue) | Authority | **Core** |
| F10 | Safe waiting spots (pharmacy, petrol pump, 24h shop) | Women | Should |
| F11 | Time-of-day slider (5 PM–10 PM) for demo | Demo | Should |
| F12 | Ghost-bus detection and reliability stat | All | Should |
| F13 | "Why?" explainer for every risk score (factor breakdown + Genkit natural-language explanation) | All | Should |
| F14 | Hindi / English UI and alert strings | All | Should |
| F15 | Journey check-in ("Are you okay?") | Women | Nice |
| F16 | Discreet SOS | Women | Roadmap |
| F17 | Last-mile safe walking path | Women | Roadmap |
| F18 | SMS / WhatsApp fallback for basic phones | All | Roadmap |
| F19 | Group commute matching (opt-in, anonymous) | Women | Roadmap |
| F20 | Voice guidance and accessibility modes | All | Roadmap |

### 5.2 Core MVP features (must work flawlessly in the demo)

| ID | Core feature | Demo proof |
|---|---|---|
| C1 | Interactive Lucknow map, 3–4 routes, moving simulated buses | Buses move; ETAs update every ~2 s |
| C2 | Live ETA with range | "6–8 min" updates live |
| C3 | Delay / likely-skip alert | Scripted stall on Bus 23 → "Likely to skip your stop" |
| C4 | **Fastest vs safer route comparison card** | Side-by-side card + two coloured routes on the map |
| C5 | Safe Wait notification | Phone-frame toast: "Bus 23 is ~5 min away. Leave now (6 min walk)" |
| C6 | Trusted-contact trip sharing | Link opened in a 2nd window shows live trip; expires |
| C7 | Anonymous report form | Submitting a report updates the dashboard |
| C8 | Authority dashboard | "Stop A: average evening wait 18 minutes, 7 safety-related reports" + recommended action |

### 5.3 Feature behaviour details

**F2 ETA:** show `low–high` minutes (~80% band). Band widens with distance and per-stop unreliability. Safe Wait uses the **late end**.

**F5 Safe Wait:** user selects a route and taps *Enable Safe Wait*. Before the alert, nearby safe waiting spots are shown. Alert fires when `now + walk_min + buffer_min >= late_eta`.

**F6 Safer Route:** `cost = alpha·travel_min + (1−alpha)·exposure_min`; `alpha` from a slider (default 0.5). After sunset, lighting/low-activity weights increase.

**F7 Trip sharing:** random 128-bit token; document readable by token only (no listing); expires at trip end or 2 h; stores no names/phone numbers.

**F8 Reports:** categories `long_wait | poor_lighting | skipped_bus | overcrowding | harassment_concern | other`; stop ID only (no precise location, no device/user ID); optional free text in Hindi or English; PII redacted server-side.

**F9 Dashboard:** KPIs, priority table (`risk × ridership`), heatmap, wait-by-hour chart, report clusters, recommended actions, human-review queue for harassment-tagged reports.

---

## 6. Architecture (Firebase only)

```
                    ┌─────────────────────────────────────────┐
                    │          Firebase Hosting (web/)         │
                    │  /            Rider PWA (mobile-first)   │
                    │  /trip/:token Trusted-contact page       │
                    │  /dashboard   Authority dashboard        │
                    │  /demo        Demo controller (simulator)│
                    └──────────────┬──────────────────────────┘
                                   │ Firestore SDK (onSnapshot) + callable functions
        ┌──────────────────────────┼───────────────────────────────┐
        │                          │                               │
 Firebase Auth             Cloud Firestore                  Cloud Functions (TS)
 (Anonymous for riders;    sim/live  stops  routes          submitReport (callable)
  custom claim            alerts  reports  trips            createTripShare (callable)
  role=operator for       aggregates  clusters              endTrip (callable)
  dashboard)              history  logs                     triageReport (Genkit flow)
                                                            explainRisk  (Genkit flow)
                                                            onReportCreated (trigger)
                                                            dashboardSummary (callable)
                                                            seed / admin utilities
                                   │
                          Secret Manager (LLM API key)
                          Firebase Emulator Suite (local dev + tests)
```

### 6.1 Realtime strategy (no WebSocket server)
Cloud Functions cannot hold WebSockets or run sub-minute loops. Realtime is achieved with **Firestore `onSnapshot` listeners**:

- The **Demo Controller** page (`/demo`, operator-only) runs the simulator loop **in the browser** and writes **one document `sim/live`** every ~2 s containing all bus positions, ETAs and active alerts.
- The Rider PWA, trip page and dashboard **listen** to `sim/live`. No per-client polling.
- **Write budget:** Firestore free tier ≈ 20k writes/day. 2 s tick = 1,800 writes/hour. The controller auto-stops after 10 minutes and shows a write counter.
- **Replay mode:** the scripted timeline (`seed/incidents.json`) can be played back **client-side** with zero writes — the reliable fallback for judging.

### 6.2 Where logic runs
| Logic | Runs in |
|---|---|
| Simulator, ETA, detectors, wait-risk, route ranking, Safe Wait trigger | Shared TypeScript package `shared/engine` (imported by `web/` and `functions/`) — pure functions, fully unit-tested |
| Report validation, PII redaction, rate limit, trip token creation, aggregates | Cloud Functions |
| Report triage (category/severity/language/theme) and risk explanation | Genkit flows in Cloud Functions, **with deterministic fallback** |

### 6.3 Billing note
Cloud Functions require the **Blaze (pay-as-you-go)** plan (billing card). Set a **budget alert** in Google Cloud. If Blaze is not available, fall back to the "no-functions" mode in §17 (Q2).

---

## 7. Data Model

### 7.0 Zod schemas (single source of truth)

All data crossing a boundary (client ↔ function, function ↔ Firestore, LLM output) is validated with zod. Schemas live in `shared/schemas/` and are imported by both `web/` and `functions/`.

```ts
// shared/schemas/common.ts
import { z } from "zod";

export const LatLng = z.object({ lat: z.number().min(-90).max(90), lng: z.number().min(-180).max(180) });
export const Lighting = z.enum(["good", "moderate", "poor"]);
export const RiskLabel = z.enum(["Low", "Medium", "High"]);
export const Lang = z.enum(["en", "hi"]);

// shared/schemas/network.ts
export const Stop = z.object({
  id: z.string(),                       // "stop_A"
  name: z.string(),
  ...LatLng.shape,
  activity: z.number().min(0).max(1),   // 0 isolated .. 1 busy (OSM-derived/simulated)
  lighting: Lighting,
  ridershipPerEvening: z.number().int().nonnegative(),
  skipRate: z.number().min(0).max(1),
  safeSpotIds: z.array(z.string()).default([]),
});

export const Route = z.object({
  id: z.string(),                       // "route_23"
  name: z.string(),                     // "Bus 23"
  color: z.string(),
  stopIds: z.array(z.string()).min(2),
  polyline: z.array(z.tuple([z.number(), z.number()])).min(2),
  headwayMin: z.object({ peak: z.number(), offpeak: z.number(), evening: z.number() }),
});

export const SafeSpot = z.object({
  id: z.string(), name: z.string(),
  kind: z.enum(["pharmacy", "petrol_pump", "shop_24h", "mall_entrance", "other"]),
  ...LatLng.shape, openLate: z.boolean(),
});

// shared/schemas/live.ts
export const BusStatus = z.enum(["RUNNING", "STALLED", "DELAYED", "GHOST"]);
export const Bus = z.object({
  id: z.string(), routeId: z.string(),
  distanceAlongRouteM: z.number().nonnegative(),
  speedMps: z.number().nonnegative(),
  lat: z.number(), lng: z.number(),
  status: BusStatus,
});

export const EtaResult = z.object({
  busId: z.string(), stopId: z.string(),
  meanMin: z.number(), lowMin: z.number(), highMin: z.number(),
  confidence: z.number().min(0).max(1).default(0.8),
});

export const AlertType = z.enum(["DELAY", "STALL", "LIKELY_SKIP", "GHOST_BUS", "ROUTE_DEVIATION", "OVERCROWDING"]);
export const Alert = z.object({
  id: z.string(), type: AlertType,
  severity: z.enum(["low", "medium", "high"]),
  message: z.string(), messageHi: z.string().optional(),
  affectedStopIds: z.array(z.string()),
  createdAt: z.number(),                 // epoch ms (simulated clock)
});

export const SimLive = z.object({
  simTimeMs: z.number(),
  hour: z.number().min(0).max(23),
  buses: z.array(Bus),
  etas: z.array(EtaResult),
  alerts: z.array(Alert),
  tick: z.number().int(),
  scenario: z.enum(["live", "replay"]),
  promptVersions: z.record(z.string()).optional(),
});

// shared/schemas/risk.ts
export const RiskFactors = z.object({
  wait: z.number(), night: z.number(), lowActivity: z.number(),
  reports: z.number(), unreliability: z.number(),
});
export const WaitRisk = z.object({
  stopId: z.string(), score: z.number().min(0).max(1),
  label: RiskLabel, factors: RiskFactors,
  explanation: z.string(),               // rule-based text; Genkit can rephrase (§10)
});

export const RouteOption = z.object({
  id: z.string(), label: z.enum(["Fastest", "Safer", "Balanced"]),
  travelMin: z.number(), waitMin: z.number(), walkMin: z.number(),
  boardingStopId: z.string(), exposureMinutes: z.number(),
  riskLabel: RiskLabel, polyline: z.array(z.tuple([z.number(), z.number()])),
  cost: z.number(),
});

// shared/schemas/reports.ts
export const ReportCategory = z.enum([
  "long_wait", "poor_lighting", "skipped_bus", "overcrowding", "harassment_concern", "other",
]);
export const ReportInput = z.object({           // what the client may send
  stopId: z.string(),
  category: ReportCategory,
  text: z.string().max(500).optional(),
});
export const Report = ReportInput.extend({      // what is stored (no user/device id, no location)
  id: z.string(),
  textRedacted: z.string().optional(),
  lang: Lang.optional(),
  severity: z.enum(["low", "medium", "high"]),
  clusterId: z.string().nullable(),
  needsHumanReview: z.boolean(),
  triage: z.object({ source: z.enum(["rules", "genkit"]), promptVersion: z.string().optional() }),
  createdAt: z.number(),
});

// shared/schemas/trips.ts
export const TripState = z.enum(["PLANNED", "WAITING", "BOARDED", "COMPLETED", "EXPIRED", "CANCELLED"]);
export const Trip = z.object({
  token: z.string().length(32),            // random, URL-safe
  routeId: z.string(), busId: z.string().nullable(),
  boardingStopId: z.string(), destinationStopId: z.string(),
  state: TripState,
  expiresAt: z.number(),                   // epoch ms; also Firestore TTL field
  createdAt: z.number(),
});
```

### 7.1 Firestore collections

| Collection / doc | Purpose | Client read | Client write |
|---|---|---|---|
| `stops/{id}`, `routes/{id}`, `safeSpots/{id}` | Static network data (seeded) | public | no |
| `sim/live` | Single live-state doc written by the demo controller | public | operator only |
| `alerts/{id}` | Active service alerts | public | operator only |
| `reports/{id}` | Anonymous reports (redacted) | **operator only** | **no** (callable function only) |
| `clusters/{id}` | Report clusters (theme, stop, count) | operator only | no |
| `aggregates/stops/{stopId}` | Avg wait by hour, report counts, priority | operator only (public subset: wait-risk) | no |
| `history/{stopId}` | 30-day simulated waits/delays/skips | public | no |
| `trips/{token}` | Shared trip (get-by-token only, no list) | `get` if not expired | no (callable only) |
| `reviewQueue/{id}` | Harassment-tagged reports for humans | operator only | operator (mark reviewed) |
| `logs/{id}` | LLM/guardrail logs (§11) | operator only | no |
| `rateLimits/{hashedKey}` | Hashed, short-lived rate-limit counters (TTL) | none | none (functions) |

TTL policies: `trips.expiresAt`, `rateLimits.expiresAt`, `logs.expiresAt` (30 days).

### 7.2 Security rules (principles — implement in `firestore.rules`)

```
rules_version = '2';
service cloud.firestore {
  match /databases/{db}/documents {
    function isOperator() { return request.auth != null && request.auth.token.role == "operator"; }

    match /stops/{id}      { allow read: if true; allow write: if false; }
    match /routes/{id}     { allow read: if true; allow write: if false; }
    match /safeSpots/{id}  { allow read: if true; allow write: if false; }
    match /history/{id}    { allow read: if true; allow write: if false; }

    match /sim/{doc}       { allow read: if true; allow write: if isOperator(); }
    match /alerts/{id}     { allow read: if true; allow write: if isOperator(); }

    match /reports/{id}      { allow read: if isOperator(); allow write: if false; }
    match /clusters/{id}     { allow read: if isOperator(); allow write: if false; }
    match /aggregates/{p=**} { allow read: if isOperator(); allow write: if false; }
    match /reviewQueue/{id}  { allow read, update: if isOperator(); allow create, delete: if false; }
    match /logs/{id}         { allow read: if isOperator(); allow write: if false; }

    // Trip: single-document get by unguessable token while not expired; no list; no client writes
    match /trips/{token} {
      allow get: if resource.data.expiresAt > request.time.toMillis();
      allow list, write: if false;
    }
    match /{document=**} { allow read, write: if false; }   // default deny
  }
}
```
Rule tests (Emulator Suite) are mandatory: riders cannot read `reports`; no client can write `reports`/`trips`; expired trips are unreadable; `trips` cannot be listed.

### 7.3 Indexes
`reports` by (`stopId`, `createdAt desc`); (`category`, `createdAt desc`); `clusters` by (`stopId`, `count desc`). Declared in `firestore.indexes.json`.

### 7.4 Operator role
Dashboard and demo controller require Firebase Auth login (email/Google). A setup script (`functions/scripts/grantOperator.ts`) sets custom claim `role: "operator"` for allow-listed emails (initially `yogendra12tiwari@gmail.com`). Riders use **Anonymous Auth** only (rotating anonymous UID; never linked to identity).

---

## 8. Cloud Functions

All are TypeScript, 2nd gen, region `asia-south1` (Mumbai) — confirm in §17.

| Function | Type | Purpose |
|---|---|---|
| `submitReport` | HTTPS callable | Validate with zod → rate-limit (hashed anon UID + stop, e.g. 5/hour) → PII redaction → deterministic triage → optional Genkit triage → write `reports/{id}` → (if harassment) write `reviewQueue/{id}`. Never stores user/device IDs or location. |
| `onReportCreated` | Firestore trigger | Update `aggregates/stops/{stopId}` (counts, corroboration weight), assign/create cluster, log. |
| `createTripShare` | HTTPS callable | Create `trips/{token}` with 128-bit random token, `expiresAt = min(trip end, now+2h)`. Returns link. |
| `endTrip` | HTTPS callable | Set state `COMPLETED`/`CANCELLED`, set `expiresAt = now`. |
| `dashboardSummary` | HTTPS callable (operator) | Ranked stops (`risk × ridership`), KPIs, recommended actions (rule-based; Genkit narrative optional). |
| `explainRisk` | Genkit flow (callable) | Turns a `WaitRisk.factors` breakdown into a plain-language Hindi/English explanation. Falls back to rule-based text. |
| `triageReport` | Genkit flow (internal) | Classifies category/severity/language/theme for a report; output validated by zod. |
| `seedFirestore` | admin script/callable (operator) | Loads `seed/*.json` into Firestore (idempotent). |
| `purgeExpired` | scheduled (every 60 min) | Safety net for expired trips/rate limits if TTL is late. |

Each function: input schema, output schema, structured log entry (§11), unit tests, emulator tests.

---

## 9. Core Engine (pure TypeScript in `shared/engine/`)

### 9.1 Trip state machine
```
PLANNED ──enable Safe Wait/select route──▶ WAITING ──bus arrives / user boards──▶ BOARDED ──arrive──▶ COMPLETED
   │                                          │                                     │
   └──────────────cancel────────────▶ CANCELLED          expiry (2h or trip end) ──▶ EXPIRED
```
Illegal transitions throw. Every transition is unit-tested. Share links are valid only in `PLANNED|WAITING|BOARDED`.

### 9.2 ETA with uncertainty
```ts
export function eta(bus, stop, hour, hist): EtaResult {
  const distM = routeDistance(bus, stop);
  const speed = Math.max(bus.recentAvgSpeedMps * trafficFactor(hour), 0.5);
  const mean = distM / speed / 60;
  const sigma = mean * 0.15 + hist.errorMin[stop.id];
  return { meanMin: mean, lowMin: Math.max(mean - 1.28 * sigma, 0), highMin: mean + 1.28 * sigma, confidence: 0.8 };
}
```

### 9.3 Wait-risk score (transparent)
```ts
export function waitRisk(stop, hour, expectedWaitMin, recentReports): WaitRisk {
  const night = hour >= 19 || hour < 6 ? 1.0 : 0.2;
  const wait = Math.min(expectedWaitMin / 20, 1);
  const lowActivity = 1 - stop.activity;
  const reports = Math.min(recentReports / 10, 1);          // corroborated count
  const factors = {
    wait: 0.30 * wait, night: 0.20 * night, lowActivity: 0.20 * lowActivity,
    reports: 0.20 * reports, unreliability: 0.10 * stop.skipRate,
  };
  const score = Object.values(factors).reduce((a, b) => a + b, 0);
  const label = score < 0.35 ? "Low" : score > 0.65 ? "High" : "Medium";
  return { stopId: stop.id, score, label, factors, explanation: ruleExplanation(factors, expectedWaitMin, hour) };
}
```
The factor breakdown is **always returned and shown** ("High because: long wait (18 min), evening, low nearby activity").

### 9.4 Exposure minutes and route ranking
```ts
exposure = waitMin * waitRiskWeight(boardingStop) + walkMin * walkRiskWeight(path); // weights 0.2..1.0
cost = alpha * travelMin + (1 - alpha) * exposure;      // alpha from slider, default 0.5
```
Candidates are generated by varying the boarding stop (busier stop 300–500 m away) and transfer points. Sorted by cost; lowest travel time = "Fastest", lowest cost = "Safer". After sunset, lighting and low-activity weights increase.

**Required demo reproduction:** Fastest 28 min travel, 14 min wait at Stop A, exposure 16, High. Safer 32 min, 4 min wait at a busy stop, exposure 3, Low. Takeaway: *"4 extra minutes saves 10 minutes of unsafe waiting."* Tune seed attributes so the formulas reproduce these numbers (unit test asserts them).

### 9.5 Detectors
- **Delay:** actual position lags schedule-implied position by > N min.
- **Stall:** speed ≈ 0 for > 3 min away from a stop.
- **Likely skip:** running behind and (historical skip rate at stop/hour > threshold or bus passes expected window).
- **Ghost bus:** scheduled departure with no trace within 10 min.
Each emits an `Alert` (type, severity, EN + HI message, affected stops).

### 9.6 Safe Wait trigger
```ts
if (nowMs + (walkMin + bufferMin) * 60000 >= nowMs + etaLateMin * 60000) fire(message(busName, remaining, walkMin));
```
`bufferMin ≈ 2`. Fires once per trip (idempotent). Rendered as an in-app toast (phone frame); optional FCM web push on Android.

### 9.7 Evaluation (`functions/src/eval/`)
- ETA MAE vs naive schedule-only baseline on 30-day simulated history → printed and shown on a dashboard card / slide.
- Exposure minutes: fastest vs safer across simulated trips.
- Safe Wait outdoor-wait reduction across simulated trips.

---

## 10. AI Layer (Genkit) and Guardrails

**Principle:** deterministic logic is the source of truth. Genkit adds language understanding (triage, explanation, translation) and **never** decides safety scores, enforcement, or alerts on its own.

### 10.1 Flows

| Flow | Input | Output (zod-validated) | Fallback if LLM fails/blocked |
|---|---|---|---|
| `triageReport` | redacted text, category, stopId | `{ category, severity, lang, theme, needsHumanReview }` | keyword/regex tagging (Hindi + English dictionaries) |
| `explainRisk` | `WaitRisk.factors`, stop name, hour, lang | `{ text }` (≤ 280 chars) | rule-based explanation string |
| `recommendActions` (optional) | stop aggregates | `{ actions: string[] }` | rule-based recommendations (§10.4) |

Implementation notes: use `genkit` with the Firebase plugin and a Gemini model via `@genkit-ai/googleai` (confirm the current model name and package versions against Genkit docs at build time); expose callable flows with Genkit's Firebase helpers; API key via Secret Manager (`defineSecret`). Structured output with zod schemas; **temperature low (≤ 0.2)**; max tokens capped.

### 10.2 Prompts are versioned code
```
prompts/
  triageReport.v1.md
  explainRisk.v1.md
  recommendActions.v1.md
```
Each file has: purpose, inputs, output schema reference, safety rules, 3+ few-shot examples (Hindi + English). Changing a prompt = new `vN+1` file + `prompt:` commit; the code selects the version via a constant and logs it.

### 10.3 Guardrails (non-negotiable; `guard:` commits)
1. **No crime prediction.** Outputs may only talk about waiting risk and service reliability. Banned-phrase list (e.g. "crime rate", "dangerous area", "criminal", "unsafe neighbourhood", victim-blaming phrases like "she should have…", "avoid wearing…") is enforced by a post-filter; violations → discard LLM output, use fallback, log `guard.blocked`.
2. **No victim-blaming.** Language focuses on stop, route, lighting and service fixes, never on what women "should" do differently.
3. **PII redaction before any LLM call.** Regexes for phone numbers, emails, 12-digit Aadhaar-like numbers, vehicle plates, and names-following-cues; redacted text is what is stored and what the LLM sees.
4. **Prompt-injection scan** on report text (instructions like "ignore previous", system-prompt probes); suspicious text is treated as data only, flagged, and routed to fallback.
5. **Harassment always goes to humans.** `harassment_concern` ⇒ `needsHumanReview = true` and is written to `reviewQueue`; no automated action, no auto-escalation, no public display of the text.
6. **Zod-validate every LLM output**; invalid → fallback.
7. **No stigma:** public rider screens never rank or label neighbourhoods; risk is shown per stop *with its factors*. Authority views focus on fixes.
8. **Abuse resistance:** rate limiting, corroboration thresholds (a stop's report weight rises only when multiple independent reports arrive), duplicate-text dampening.
9. **Honest labelling:** all MVP data is labelled "Simulated data"; AI explanations are labelled "AI-generated explanation".

### 10.4 Rule-based recommended actions (always available)
- avg evening wait > 15 min → "Add a departure around the peak gap (e.g. 7:45 PM)."
- lighting reports ≥ 3 or `lighting = poor` → "Improve lighting at this stop."
- skipRate > 0.2 → "Investigate skipped services on this route."
- harassment-tagged reports present → "Escalate to human review; consider staffed presence/CCTV."

### 10.5 Judge (output quality check)
`functions/src/judge/`: a test harness that runs a fixed set of prompts/cases through every flow and checks (a) zod validity, (b) banned-phrase scan, (c) no PII leakage, (d) language matches input, (e) length limits. An optional second Genkit "judge" flow can score outputs 1–5 for tone (non-blaming, factual); CI fails if any hard check fails or mean tone score < 4.

---

## 11. Logging, Observability, Prompt Versioning

Every function emits **structured logs** (Cloud Logging) and a compact `logs/{id}` document for AI flows:

```json
{
  "flow": "triageReport",
  "promptVersion": "triageReport.v1",
  "model": "<model-name>",
  "source": "genkit | rules",
  "inputHash": "sha256…",
  "guard": { "piiRedacted": true, "injectionFlag": false, "bannedPhraseBlocked": false },
  "latencyMs": 412,
  "outcome": "ok | fallback | blocked",
  "expiresAt": 1730000000000
}
```
- Never log raw report text or any PII; store hashes and redacted text only.
- `promptVersions` is also written into `sim/live` and shown in the operator dashboard footer.
- Log retention 30 days (TTL).
- Dashboard "System health" card: AI success vs fallback rate, guard blocks, report latency.

---

## 12. Simulator (Demo Controller)

### 12.1 Routes (Lucknow, verify coordinates visually)
- **Route 23:** Charbagh → Hazratganj → Gomti Nagar
- **Route 12:** Alambagh → Aminabad → Lucknow University
- **Route 7:** Chowk → Hazratganj → Indira Nagar
- **Route 41:** Charbagh → Aminabad → Gomti Nagar (alternative)
**Stop A** is deliberately isolated, poorly lit, low activity with long evening waits; a busier alternative stop sits ~400 m away.

### 12.2 Movement and time-of-day
Buses advance `speed × dt` along the polyline; `speed = baseSpeed × trafficFactor[hour] × noise`.

| Period | Hours | Traffic factor | Headway |
|---|---|---|---|
| Morning peak | 8–10 | 0.6 | 8 min |
| Midday | 11–16 | 0.9 | 15 min |
| Evening peak | 17–19 | 0.6 | 10 min |
| Late evening | 20–22 | 1.0 | 20+ min |

### 12.3 Scripted incidents (do not rely on randomness in the pitch)
- t = 2:00: Bus 23 stalls ~6 min → `STALL` then `LIKELY_SKIP` at Stop A.
- t = 3:00: a scheduled 8:30 PM Route 12 bus is a `GHOST`.
Saved as `seed/incidents.json`; replay mode plays it client-side.

### 12.4 Time slider
5 PM–10 PM; re-initialises headways and traffic; risk and waits update.

### 12.5 Simulated history
`seed/history.json`: 30 days × stops × hours of waits, delays, skips (generated by a seeded RNG for reproducibility). Used for ETA error bands, skip rates, MAE evaluation and dashboard charts.

---

## 13. Frontend (React + TypeScript + Vite)

### 13.1 Stack
React 18, TypeScript, Vite, React Router, Tailwind CSS, Leaflet + OpenStreetMap tiles (no API key), Recharts, Firebase Web SDK (Auth, Firestore, Functions, optional Messaging), vite-plugin-pwa, i18next (en/hi), Vitest + React Testing Library.

### 13.2 Routes
| Path | Screen | Audience |
|---|---|---|
| `/` | Rider home / map | Public (anonymous auth) |
| `/plan` | Route options + fastest-vs-safer card | Public |
| `/route/:id` | Route detail, risk "Why?", safe spots, Enable Safe Wait, Share trip | Public |
| `/alerts` | Alerts feed | Public |
| `/report` | Anonymous report form | Public |
| `/trip/:token` | Trusted-contact live trip (read-only) | Anyone with link |
| `/dashboard` | Authority dashboard | Operator |
| `/demo` | Demo controller (simulator, time slider, replay) | Operator |

### 13.3 Key components
`MapView`, `RouteCompareCard` (visual centerpiece), `RiskBadge` (with "Why?" drawer showing factor breakdown + AI explanation), `SafeWaitToast`, `PhoneFrame`, `AlertFeed`, `ReportForm`, `TimeSlider`, `SpeedSafetySlider`, `TripSharePanel`, `PriorityTable`, `WaitByHourChart`, `ReviewQueue`, `SimulatedDataBadge`, `LanguageToggle`.

### 13.4 UX rules
- Mobile-first (≈ 360–420 px); desktop shows the rider app inside a phone frame.
- Risk colours (green/amber/red) always paired with text labels (accessibility); large tap targets; high contrast.
- Hindi/English toggle for alerts, Safe Wait message, report form, risk explanations.
- "Simulated data" badge on every screen.
- Language never blames victims; use "waiting risk" and "service reliability".
- Offline: PWA caches shell, static network data and last live state.

---

## 14. Privacy, Ethics, Safety

1. No names, phone numbers, or precise home locations stored — ever.
2. Reports reference stop IDs only; analytics use grid-rounded coordinates.
3. Anonymous Auth UIDs are hashed before any rate-limit use and never stored on reports.
4. Trip links: 128-bit tokens, expire at trip end or 2 h, receiver needs no account; Firestore TTL + rules check.
5. Scores are explainable and are **not crime predictions**.
6. Anti-stigma: no public neighbourhood ranking; focus on fixes.
7. Human in the loop: alerts/reports support users and authorities; no automated enforcement.
8. Rate limiting, corroboration thresholds, duplicate dampening.
9. Hindi and regional-language support for wider adoption.
10. All of §10.3 guardrails apply.

---

## 15. Testing Strategy

| Layer | Tooling | Must cover |
|---|---|---|
| Engine (`shared/engine`) | Vitest | ETA bands, wait-risk factors, exposure/route ranking (asserts the 28/32 and 16/3 demo numbers), detectors, Safe Wait trigger, trip state machine (all legal/illegal transitions) |
| Schemas | Vitest | Every zod schema: valid/invalid fixtures |
| Functions | Vitest + Emulator Suite | `submitReport` (validation, PII redaction, rate limit), `createTripShare`/`endTrip`, `onReportCreated` aggregates, `dashboardSummary` (Stop A: 18-min avg evening wait, 7 reports, High) |
| Security rules | Emulator + `@firebase/rules-unit-testing` | See §7.2 list |
| AI/guardrails | Vitest + judge (§10.5) | Banned phrases, PII leakage, injection, fallback paths, language match |
| Frontend | Vitest + React Testing Library | Compare card, risk "Why?" drawer, Safe Wait toast, report form, dashboard rows, i18n switch |
| E2E (optional) | Playwright against emulators | Full demo script (§21) |

CI blocks merge/deploy on any failure.

---

## 16. Deployment and CI/CD

### 16.1 Repository layout
```
transitiq/
├─ TRANSITIQ_PRD.md
├─ README.md
├─ .gitignore                 # .env*, service accounts, node_modules, dist, firebase-debug.log
├─ firebase.json              # hosting, functions, firestore, emulators
├─ .firebaserc                # { "projects": { "default": "transiteiq" } }
├─ firestore.rules
├─ firestore.indexes.json
├─ prompts/                   # versioned prompts (§10.2)
├─ seed/                      # routes.json stops.json safeSpots.json history.json reports.json incidents.json
├─ shared/
│  ├─ schemas/                # zod schemas (§7.0)
│  └─ engine/                 # eta, risk, ranker, detectors, safewait, tripMachine, simulator
├─ functions/
│  ├─ src/{index.ts, flows/, guard/, judge/, eval/, triggers/, scripts/}
│  └─ package.json            # TypeScript, firebase-functions, firebase-admin, genkit, zod, vitest
├─ web/
│  ├─ src/{pages/, components/, api/, i18n/, hooks/}
│  └─ package.json            # React, Vite, Tailwind, Leaflet, Recharts, firebase, vitest
└─ .github/workflows/ci.yml
```

### 16.2 Environments
| Env | Purpose |
|---|---|
| Local | Firebase Emulator Suite (Auth, Firestore, Functions, Hosting); `seedFirestore` against emulator |
| Production | Firebase project `transiteiq`; live URL on Hosting |

### 16.3 Deploy targets
`firebase deploy --only hosting` · `functions` · `firestore:rules` · `firestore:indexes` — deploy only what changed (rule §0.1).

### 16.4 GitHub Actions (sketch)
```yaml
name: ci
on: { push: { branches: ["**"] }, pull_request: {} }
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20 }
      - run: npm ci --prefix web && npm ci --prefix functions
      - run: npm test --prefix web
      - run: npx firebase-tools emulators:exec --only firestore,auth,functions "npm test --prefix functions"
  deploy:
    needs: test
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20 }
      - run: npm ci --prefix web && npm ci --prefix functions && npm run build --prefix web
      - run: npx firebase-tools deploy --project ${{ secrets.FIREBASE_PROJECT_ID }}
        env:
          GOOGLE_APPLICATION_CREDENTIALS_JSON: ${{ secrets.FIREBASE_SERVICE_ACCOUNT }}
```
(Write the service-account JSON to a temp file at runtime or use the official Firebase GitHub Action; never commit credentials. Pin versions at build time.)

### 16.5 Secrets
GitHub Secrets: `FIREBASE_SERVICE_ACCOUNT`, `FIREBASE_PROJECT_ID`. Firebase Secret Manager: LLM API key (`GOOGLE_GENAI_API_KEY` or equivalent). Web config (public Firebase config) is allowed in code; API restrictions and App Check applied.

### 16.6 Rollback
`firebase hosting:rollback`; redeploy the previous functions commit; rules are versioned in git.

---

## 17. Open Questions (resolve before build starts)

| # | Question | Default if unanswered |
|---|---|---|
| Q1 | Firebase project ID and owner email (login account) | Placeholders `transiteiq`, `yogendra12tiwari@gmail.com` |
| Q2 | Is the Blaze plan (billing card) available? If not, drop Cloud Functions/Genkit and run triage, rate-limit-less report writes via client rules and rule-based logic only | Assume Blaze with a budget alert |
| Q3 | Functions region: `asia-south1` (Mumbai) vs other | `asia-south1` |
| Q4 | Which LLM/model and API key for Genkit (Gemini via Google AI Studio?) | Gemini via `@genkit-ai/googleai` |
| Q5 | Realtime store for `sim/live`: Firestore (free-tier write cap) vs Realtime Database (no per-write quota) | Firestore, 2 s tick, 10-min auto-stop; RTDB as upgrade |
| Q6 | Dashboard auth: Google sign-in with allow-list vs hard-coded demo operator | Google sign-in + custom claim |
| Q7 | Custom domain, or default `web.app`? | Default `web.app` |
| Q8 | Real Telegram/FCM push for Safe Wait demo, or in-app toast only? | In-app toast; FCM optional on Android |
| Q9 | Is user research (15–30 women commuters) planned? Quotes feed the pitch | Yes, in parallel |
| Q10 | Any real OSM data pull for stop activity, or fully invented seed values? | Small OSM pull via Overpass saved to `seed/`, else invented and labelled simulated |

---

## 18. Changelog

| Version | Date | Change |
|---|---|---|
| v1.0.0 (draft) | 2026-10-23 | First full PRD for TransitIQ: problem, solution, features, core MVP, Firebase-only architecture (Hosting, Firestore, Functions, Auth), zod schemas, Genkit flows with guardrails, simulator, CI/CD, testing, open questions. Adopts the commit/push/deploy-after-every-update rule. |
| v1.0.2 | 2026-10-23 | Renamed product from SafeRide AI to TransitIQ (docs, repo folder name, file names). No scope change. |
| v1.0.3 | 2026-10-23 | Milestone M1 completed: Added Zod schemas with no-PII assertions, geo/time engines, Lucknow seed datasets (stops, routes, safe spots, history, reports, incidents), verification suite, idempotent Firestore seeding script, and Firestore public-read rules with rules unit testing. Live stop count verified on hosting. |
| v1.0.4 | 2026-10-23 | Milestone M2 completed: Implemented deterministic transit fleet simulator engine with seeded Mulberry32 PRNG and dwell model; deployed operator-only Firestore rules for sim and alerts; added operator auth and RequireOperator route guard; built /demo controller with 10-minute auto-stop and write budget tracking; added Leaflet MapView with OSM attribution, smooth 60fps bus interpolation, route filtering, bus detail bottom sheet, and PhoneFrame layout on desktop. |
| v1.0.5 | 2026-10-23 | Milestone M3 completed: ETA engine with 80% uncertainty bounds (lowMin <= meanMin <= highMin); naive baseline and offline MAE evaluation (Model MAE 1.63m vs Baseline 3.89m, 58.1% improvement, 95.6% band coverage); transparent waitRisk score with 5 factor weights and objective English/Hindi explanations; banned phrase guard; delay, stall, likely-skip, and ghost bus detectors with stable alert IDs and lifecycle management; scripted incident runner; client-side replay tape mode with zero Firestore writes; AlertFeed page (/alerts) with severity styles and language switch; StopSheet with Why-drawer factor bars; MapView likely skip banner and replay chip. |

*(Append a row on every scope, design, or decision change — and push it.)*

---

## 19. Milestones

Each milestone ends with: tests green → commit → push → deploy (§0). No new features after M6 (scope freeze).

| M | Deliverable | Done when |
|---|---|---|
| M0 | Repo scaffold, `.gitignore`, Firebase init, emulators, CI skeleton, PRD committed | `firebase emulators:start` runs; CI green; Hosting shows a placeholder at the live URL |
| M1 | Zod schemas, seed JSON (routes, stops incl. Stop A, safe spots, reports, history), `seedFirestore` | Seeded emulator + prod; schema tests pass |
| M2 | Simulator + demo controller + `sim/live` + live map (buses moving) | Buses move smoothly; rider map updates via `onSnapshot` |
| M3 | ETA ranges, detectors, wait-risk with factors, scripted incidents, replay mode | Bus 23 stall → `LIKELY_SKIP` at Stop A; ETA range updates live |
| M4 | Route planner/ranker, exposure minutes, `RouteCompareCard`, slider | Card shows 28/14/16/High vs 32/4/3/Low; two coloured routes on map |
| M5 | Safe Wait toast + trip state machine + `createTripShare`/`endTrip` + `/trip/:token` | 2nd window shows live trip; toast fires on time; link expires |
| M6 | `submitReport`, guardrails, triage (rules + Genkit), `onReportCreated`, dashboard, review queue, recommended actions | Stop A row: 18 min / 7 reports / High; new report appears on dashboard < 5 s |
| M7 | Polish: time slider, safe spots, Hindi strings, "Why?" explainer, PWA, eval card (MAE), E2E, backup video | Demo script runs clean 3× in a row |

---

## 20. Acceptance Criteria

- [ ] 3–4 Lucknow routes with moving buses on the map
- [ ] ETA shows a range and updates live
- [ ] Scripted stall triggers delay/skip alert; ghost bus detected
- [ ] Route compare card shows Fastest (28 min, 14 min wait, exposure 16, High) vs Safer (32 min, 4 min wait, exposure 3, Low); both routes drawn
- [ ] Every risk label has a "Why?" factor breakdown (and optional AI explanation, labelled)
- [ ] Safe Wait fires at the correct time in a phone-frame toast
- [ ] Trip link works in a second window, then expires; direct `list` of trips is denied
- [ ] Report submission updates the dashboard; clients cannot read reports
- [ ] Dashboard shows "Stop A: average evening wait 18 minutes, 7 safety-related reports" + recommended action
- [ ] Harassment reports go to the human-review queue only; never displayed publicly
- [ ] PII is redacted before storage and before any LLM call; no PII fields exist in schemas
- [ ] Guardrail and judge tests pass; fallback works when the LLM is disabled
- [ ] Time slider changes waits and risk; Hindi/English toggle works
- [ ] "Simulated data" badge on all screens
- [ ] ETA MAE vs baseline computed and displayed
- [ ] PWA installable; responsive
- [ ] CI green; auto-deploy from `main`; live URL works; every change was committed, pushed and deployed (§0)

---

## 21. Demo Script (≈ 3 minutes)

1. **Hook (20 s):** "It's 8:40 PM at Stop A in Lucknow. Priya has no idea whether her bus is coming."
2. **Live map (20 s):** buses move; ETAs as ranges.
3. **Delay alert (20 s):** Bus 23 stalls → "Likely to skip your stop."
4. **Route comparison (30 s):** Fastest 28 min / 14-min wait / High vs Safer 32 min / 4-min wait / Low — "4 extra minutes saves 10 minutes of unsafe waiting."
5. **Why? (10 s):** open the factor breakdown; mention it is not a crime prediction.
6. **Safe Wait (20 s):** toast "Bus 23 is ~5 min away. Leave now."
7. **Trusted contact (20 s):** open the share link in a second window.
8. **Time slider (10 s):** drag 5 PM → 10 PM.
9. **Authority dashboard (30 s):** "Stop A: average evening wait 18 minutes, 7 safety-related reports" → recommended action; show the human-review queue.
10. **Close (10 s):** the one-line pitch; "data is simulated; pilot plan is one corridor."

**Backups:** client-side replay mode + recorded video.

---

## 22. Risks and Mitigations

| Risk | Mitigation |
|---|---|
| Firestore free-tier write cap exhausted by simulator | Single `sim/live` doc, 2 s tick, 10-min auto-stop, write counter; client-side replay; RTDB as upgrade |
| Blaze plan unavailable | "No-functions" fallback mode (Q2) |
| LLM outage / bad output | Deterministic fallback for every flow; zod validation; judge in CI |
| Safety score seen as biased or crime prediction | Explainable factors, banned-phrase guard, no public neighbourhood ranking |
| Cold-start (no reports) | Seed with objective proxies (wait variance, time of day, OSM stop activity) |
| Fake/abusive reports | Rate limits, corroboration thresholds, duplicate dampening, human review |
| No real GPS in many cities | Tiered sourcing roadmap (official feeds, low-cost trackers/conductor app, crowdsourcing) |
| Browser limits on background push (iOS) | In-app toast for demo; native Android + FCM in roadmap |
| Secrets leak | `.gitignore` from commit #1, Secret Manager, GitHub Secrets, secret-scan in CI |
| Scope creep | Scope freeze after M6; roadmap items documentation only |

---

## 23. Roadmap and Impact

| Phase | Scope |
|---|---|
| Hackathon MVP | PWA + authority dashboard + simulated fleet on Firebase |
| Pilot (1 corridor, 1 month) | GTFS / GTFS-Realtime ingestion, low-cost GPS trackers or conductor app, SMS/WhatsApp bot, Hindi voice alerts |
| Scale | Native Android app (reliable background push), learned ETA (gradient boosting) on real traces, journey check-in, SOS, last-mile safety, multilingual embeddings for report clustering |

**Pilot metrics:** reduction in avg waiting time, ETA MAE, exposure minutes per trip, report-to-action time, share of trips using trusted-contact sharing.
**Business model:** free for riders; funded by city transport authorities (B2G), smart-city programs, CSR/women-safety grants; partners: city transport corporation, NGOs for report validation, women's helplines.
**Expected impact:** less waiting and uncertainty; lower exposure of women to unsafe waiting; better detection of delayed/skipped services; actionable insight for routes, schedules, lighting and stop safety; a model scalable across Indian cities.

---

## 24. Instructions for Claude Code

**Goal:** implement the MVP in this PRD as a working, deployed Firebase web project.

1. Read this PRD fully. Follow milestones M0–M7 in order. Respect **§0 after every change**: tests → commit (conventional message) → push → `firebase deploy --only <targets>`.
2. Ask me for the values in §17 Q1–Q2 (Firebase project ID, owner email, billing availability) **before** `firebase init`; use placeholders until answered. Never commit secrets.
3. Put zod schemas in `shared/schemas/` first (M1) and import them everywhere. Validate every boundary.
4. Keep engine logic as pure functions in `shared/engine/`; test them before building UI.
5. Treat the seed numbers in §9.4 and §15/§20 as authoritative; tune seed attributes and weights so formulas reproduce them, and add unit tests asserting them.
6. Implement §10.3 guardrails before enabling any Genkit flow. Every flow must have a deterministic fallback and a prompt file in `prompts/`.
7. Add Firestore rule tests in M6 at the latest; default-deny.
8. Label all data as simulated in the UI. Never use the words "crime", "dangerous area" or victim-blaming language anywhere in the product.
9. After each milestone, run the app against the emulators, verify the "Done when" condition, update the changelog (§18), push, deploy, and summarize what works before continuing.
10. Do not add features outside §5.2 before the scope freeze after M6.



