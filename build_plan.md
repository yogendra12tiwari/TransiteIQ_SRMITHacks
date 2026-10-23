# TransitIQ — Build Plan

> **Sources:** `TRANSITIQ_PRD.md` (primary source of truth) and `TRANSITIQ_SPEC.md` (supporting detail).
> **Rule:** where the two conflict, the **PRD wins**. All conflicts found are listed in §3.
> **Mode:** this file is a *plan*. No application code is written, no packages installed, and `firebase init` is not run until the blocking questions in §2 are answered.
> **How to use:** every task is a `- [ ]` checklist item. Tick it only after its tests pass, it is committed, pushed, and deployed (PRD §0).

| Field | Value |
|---|---|
| Product | **TransitIQ** |
| Problem statement | SI-05+ — Public Transport Route and Timing Tracker with a Women-Safety Layer |
| Repo | https://github.com/yogendra12tiwari/TransiteIQ_SRMITHacks.git  |
| Stack | React + TypeScript + Vite (PWA) · Firebase Hosting, Firestore, Auth · TypeScript Cloud Functions (2nd gen) · Genkit · zod |
| Prototype city | Lucknow (simulated fleet, simulated data, labelled as such everywhere) |
| Plan version | v1.0.0 |
| Last updated | 2026-10-23 |
| Status | Draft — waiting on answers to Q1, Q2 (see §2) |

---

## Table of Contents

1. [Summary](#1-summary)
2. [Assumptions and open questions](#2-assumptions-and-open-questions)
3. [Conflicts between PRD and SPEC, and design decisions](#3-conflicts-between-prd-and-spec-and-design-decisions)
4. [Final folder structure](#4-final-folder-structure)
5. [Working conventions](#5-working-conventions)
6. [Milestone plan (M0–M7)](#6-milestone-plan-m0m7)
7. [Dependency map](#7-dependency-map)
8. [Data and seed plan](#8-data-and-seed-plan)
9. [AI and guardrails plan](#9-ai-and-guardrails-plan)
10. [Testing plan](#10-testing-plan)
11. [Deployment plan](#11-deployment-plan)
12. [Risks and mitigations](#12-risks-and-mitigations)
13. [Scope control](#13-scope-control)
14. [Definition of done](#14-definition-of-done)
15. [Next action](#15-next-action)
16. [Appendices](#16-appendices)

---

## 1. Summary

- **What:** TransitIQ is a real-time public-transport intelligence platform: live bus tracking, ETA ranges, route planning, delay/skip alerts for everyone, plus a women-safety layer (Safe Wait, Safer Route, trusted-contact sharing, anonymous reports) and an authority dashboard.
- **Core insight:** uncertainty turns into exposure. Reliable information is itself a safety intervention.
- **Headline metric:** **Exposure Minutes** — minutes spent waiting or walking under higher-risk conditions. Route ranking, dashboard, and impact claims all use it.
- **Architecture:** Firebase only. Rider PWA, trusted-contact page, authority dashboard and a demo controller are served from Firebase Hosting. Realtime comes from Firestore `onSnapshot` on a single `sim/live` document, written by a browser-run simulator. No WebSocket server.
- **Logic location:** pure TypeScript engine in `shared/engine` (ETA, risk, ranking, detectors, Safe Wait, trip state machine, simulator), used by both `web/` and `functions/`.
- **AI:** Genkit flows (`triageReport`, `explainRisk`, optional `recommendActions`) sit behind guardrails and always have a deterministic fallback. Deterministic code decides scores and alerts; the LLM never does.
- **Safety rules:** no PII, no crime prediction, no victim-blaming, harassment reports go to humans only, expiring trip links, default-deny security rules.
- **Plan size:** 8 milestones (M0–M7), about 290 numbered tasks plus supporting checklists. Scope freezes after M6.
- **Demo numbers that must be reproduced:** Stop A has a 18-minute average evening wait, 7 safety-related reports, and risk label High. Fastest route is 28 min / 14 min wait / exposure 16 / High. Safer route is 32 min / 4 min wait / exposure 3 / Low.
- **Rule that governs every task:** tests pass → commit (one logical change) → push → `firebase deploy --only <changed targets>`.

---

## 2. Assumptions and open questions

### 2.1 Open questions from PRD §17

| # | Question | Default used in this plan | Blocks build start? | Status |
|---|---|---|---|---|
| Q1 | Firebase project ID and owner email (login account) | Placeholders `
transiteiq`, `<yogendra12tiwari@gmail.com>` | **YES** — needed for `firebase init`, `.firebaserc`, operator claim, live URL | ⬜ open |
| Q2 | Is the Blaze (pay-as-you-go) plan available? | Assume yes, with a budget alert | **YES** — Cloud Functions and Genkit need it. If no: use the no-functions fallback in §2.3 | ⬜ open |
| Q3 | Functions region | `asia-south1` (Mumbai) | No | ⬜ default |
| Q4 | LLM/model and API key for Genkit | Gemini via `@genkit-ai/googleai`; key in Secret Manager | Blocks M6 AI flows only (rules fallback works without it) | ⬜ default |
| Q5 | Realtime store for `sim/live` | Firestore, 2 s tick, 10-minute auto-stop, write counter. Realtime Database is the upgrade path | No | ⬜ default |
| Q6 | Dashboard auth | Google sign-in + custom claim `role=operator` for allow-listed emails | No | ⬜ default |
| Q7 | Custom domain | Default `<project>.web.app` | No | ⬜ default |
| Q8 | Real push for Safe Wait | In-app toast only; FCM web push optional on Android | No | ⬜ default |
| Q9 | User research with 15–30 women commuters | Yes, in parallel, quotes feed the pitch | No | ⬜ default |
| Q10 | Real OSM pull vs invented seed values | Small Overpass pull saved to `seed/`; otherwise invented and labelled simulated | No | ⬜ default |

### 2.2 Questions the plan adds (need your answer, defaults provided)

| # | Question | Default |
|---|---|---|
| Q11 | Which report categories count as "safety-related" for the "7 reports" number? | `poor_lighting`, `harassment_concern`, `long_wait` (see Decision D1) |
| Q12 | Should the Safe Wait trigger use the late or early end of the ETA range? | Late end per PRD, plus a second "arriving sooner" alert on the early end (Decision D2) |
| Q13 | Node version for local dev and CI | Node 20 LTS |
| Q14 | Package manager | npm with workspaces (matches the PRD's `npm test` commands) |
| Q15 | Is a second device available for the trusted-contact demo? | No → use a second browser window / incognito |
| Q16 | Who is on the team, and who owns which area? | Solo + Claude Code; ownership table in Appendix F is left blank |

### 2.3 No-functions fallback (only if Q2 = no)

- [ ] Remove `functions/` deploy target from CI; keep the directory for local emulator tests.
- [ ] Report submission becomes a direct Firestore create guarded by rules: only allowed fields, category enum, text ≤ 500 chars, `createdAt == request.time`, and no read access.
- [ ] PII redaction runs **client-side** before submit (weaker; documented risk).
- [ ] Trip tokens generated client-side with `crypto.getRandomValues`, written with rules-limited fields.
- [ ] Genkit flows disabled; triage and explanations use the rule-based fallbacks only.
- [ ] Dashboard aggregates computed client-side from `reports` (operator-only read).
- [ ] Record this decision in the PRD changelog (§18) and bump the PRD version.

### 2.4 Blocking checklist before M0 starts

- [ ] Q1 answered: Firebase project ID = `__________`
- [ ] Q1 answered: owner email = `__________`
- [ ] Q2 answered: Blaze plan available? yes / no
- [ ] GitHub repo exists and Claude Code has push access (token or SSH configured; **no secret committed**)
- [ ] Node 20 and npm installed locally; `firebase-tools` installable (global or via `npx`)
- [ ] Java runtime installed (Firestore emulator requires it)

---

## 3. Conflicts between PRD and SPEC, and design decisions

### 3.1 Conflict table

| # | SPEC says | PRD says | Resolution (PRD wins unless noted) |
|---|---|---|---|
| C1 | Backend is FastAPI (Python) | Backend is Firebase only; TypeScript; no Python | Use Firebase. Ignore every Python reference. `eval.py` becomes `functions/src/eval/*.ts` |
| C2 | WebSocket `/ws/live` | No WebSocket server; Firestore `onSnapshot` on `sim/live` | Use Firestore listeners |
| C3 | REST under `/api/*` | Callable functions plus direct Firestore reads | Implement callables; drop REST routes. Keep the SPEC's endpoint list only as a naming guide |
| C4 | In-memory state + optional SQLite | Firestore collections | Firestore |
| C5 | Deploy to Vercel + Render/Railway | Firebase Hosting + Functions | Firebase |
| C6 | Folder `backend/` and `frontend/` | `functions/`, `web/`, `shared/` | Use the PRD layout |
| C7 | Simulator runs on the backend and pushes over WebSocket | Simulator runs in the browser demo controller and writes `sim/live` | Browser simulator in `shared/engine/simulator` |
| C8 | Optional Telegram bot for Safe Wait | In-app toast; optional FCM | In-app toast; Telegram dropped from scope |
| C9 | Rate limit by in-process counter | `rateLimits/{hashedKey}` with TTL, enforced in `submitReport` | Firestore-backed counters |
| C10 | Seed data list includes `incidents.json` | Same, plus replay mode client-side | Same; add `seed/README.md` describing each file |
| C11 | "7 safety-related reports" undefined | Same, undefined | **Decision D1** below |
| C12 | PRD `expiresAt` is epoch ms | Firestore TTL policies need a **Timestamp** field | **Decision D3** below |
| C13 | — | `shared/` imported by `web/` and `functions/` | Firebase deploys only the `functions/` directory, so `shared/` must be bundled in. **Decision D4** below |
| C14 | — | Safe Wait fires on the late end of the ETA range | Missing a bus is itself a risk. **Decision D2** below |
| C15 | — | `explainRisk` listed under Cloud Functions as callable | Expose it as a Genkit flow wrapped as a callable; log with prompt version |

### 3.2 Design decisions made by this plan

**D1 — "Safety-related" reports.** A report is *safety-related* if its category is `poor_lighting`, `harassment_concern`, or `long_wait`. `skipped_bus`, `overcrowding`, `other` are *service* reports. Stop A seed contains exactly **7 safety-related** reports (3 `poor_lighting`, 2 `long_wait`, 2 `harassment_concern`) plus 2 service reports (1 `skipped_bus`, 1 `overcrowding`), so total is 9 but the dashboard headline reads "7 safety-related reports". The wait-risk `reports` factor uses the *corroborated safety-related count in the last 30 simulated days*, so Stop A gets `7/10 = 0.7`.

**D2 — Safe Wait trigger.** Two stages:
1. **Primary "Leave now"** when `etaHighMin <= walkMin + bufferMin` (late end, as in the PRD; minimises waiting outside).
2. **Escalation "Arriving sooner — leave now"** when `etaLowMin <= walkMin + 1` and the primary has not been acknowledged (protects against missing the bus).
Both fire at most once per trip (idempotent). Unit-tested with fixtures.

**D3 — TTL fields.** Keep `expiresAt` (epoch ms) for engine logic and rule checks, and add `expiresAtTs` (Firestore `Timestamp`) on `trips`, `rateLimits`, `logs` as the field the TTL policy targets. TTL deletion can lag by many hours, so (a) the security rule checks expiry itself and (b) the scheduled `purgeExpired` function deletes expired docs hourly.

**D4 — Sharing code with Functions.** Use npm workspaces: `shared` is a workspace package `@transitiq/shared`. `web/` imports it through a Vite alias. `functions/` bundles it using `tsup` with `noExternal: ["@transitiq/shared"]` so the deployed `functions/` directory is self-contained. A `predeploy` script builds the bundle. A test asserts the built `functions/lib` contains no `workspace:` imports.

**D5 — Wait-risk to weight mapping (for exposure minutes).**
`waitWeight = 0.2 + 0.8 × waitRiskScore` (range 0.2–1.0). `walkWeight` comes from the path: `0.25` for a lit main road, `0.7` for a path containing a poorly lit segment, `1.0` reserved for extreme cases. These values are chosen so the demo numbers reproduce (see §8.4) and are documented in the explainer.

**D6 — Anonymous identity.** Riders use Firebase Anonymous Auth. For rate limiting, the key is `sha256(uid + stopId + hourBucket)` computed in the function; the raw UID is never stored on reports.

**D7 — Language of AI output.** Explanations are generated in the language the user's UI is set to (`en` or `hi`). The judge verifies script/language match.

**D8 — Clock.** All engine functions take `nowMs` as an argument (no hidden `Date.now()`), so tests and replay mode are deterministic. Simulated time runs in IST (UTC+5:30).

---

## 4. Final folder structure

```
transitiq/
├─ TRANSITIQ_PRD.md
├─ TRANSITIQ_SPEC.md
├─ build_plan.md                       # this file
├─ README.md
├─ package.json                        # npm workspaces: shared, web, functions
├─ tsconfig.base.json
├─ .eslintrc.cjs / eslint.config.js
├─ .prettierrc
├─ .gitignore                          # .env*, *.json service accounts, node_modules, dist, lib, firebase-debug.log, .firebase/
├─ .firebaserc                         # { "projects": { "default": "<FIREBASE_PROJECT_ID>" } }
├─ firebase.json                       # hosting, functions, firestore, emulators
├─ firestore.rules
├─ firestore.indexes.json
├─ docs/
│  ├─ architecture.md
│  ├─ privacy-and-ethics.md
│  ├─ demo-script.md
│  ├─ judge-qa.md
│  └─ user-research-notes.md           # no personal data; paraphrased quotes only
├─ prompts/
│  ├─ triageReport.v1.md
│  ├─ explainRisk.v1.md
│  └─ recommendActions.v1.md
├─ seed/
│  ├─ README.md
│  ├─ routes.json
│  ├─ stops.json
│  ├─ safeSpots.json
│  ├─ history.json                     # generated, deterministic seed
│  ├─ reports.json
│  └─ incidents.json
├─ scripts/
│  ├─ generate-history.ts              # seeded RNG → seed/history.json
│  ├─ verify-seed.ts                   # checks demo numbers
│  └─ grant-operator.ts                # sets custom claim for allow-listed emails
├─ shared/                             # @transitiq/shared
│  ├─ package.json
│  ├─ tsconfig.json
│  ├─ src/
│  │  ├─ index.ts
│  │  ├─ schemas/                      # zod: common, network, live, risk, reports, trips
│  │  ├─ engine/
│  │  │  ├─ geo.ts                     # haversine, route distance, interpolation
│  │  │  ├─ time.ts                    # IST helpers, period lookup
│  │  │  ├─ eta.ts
│  │  │  ├─ risk.ts
│  │  │  ├─ exposure.ts
│  │  │  ├─ ranker.ts
│  │  │  ├─ detectors.ts
│  │  │  ├─ safewait.ts
│  │  │  ├─ tripMachine.ts
│  │  │  ├─ simulator.ts
│  │  │  ├─ recommendations.ts
│  │  │  └─ explain.ts                 # rule-based explanations (en/hi)
│  │  ├─ guard/
│  │  │  ├─ redact.ts                  # PII redaction
│  │  │  ├─ injection.ts
│  │  │  └─ bannedPhrases.ts
│  │  └─ i18n/                         # shared strings for alerts: en.json, hi.json
│  └─ test/
├─ functions/
│  ├─ package.json
│  ├─ tsconfig.json
│  ├─ tsup.config.ts
│  ├─ src/
│  │  ├─ index.ts
│  │  ├─ callables/                    # submitReport, createTripShare, endTrip, dashboardSummary
│  │  ├─ triggers/                     # onReportCreated
│  │  ├─ scheduled/                    # purgeExpired
│  │  ├─ flows/                        # triageReport, explainRisk, recommendActions (Genkit)
│  │  ├─ lib/                          # admin init, rateLimit, logger, aiLog
│  │  ├─ eval/                         # ETA MAE, exposure, safe-wait evaluation
│  │  ├─ judge/                        # output-quality harness
│  │  └─ scripts/                      # seedFirestore
│  └─ test/
├─ web/
│  ├─ package.json
│  ├─ index.html
│  ├─ vite.config.ts
│  ├─ tailwind.config.ts
│  ├─ public/                          # manifest.webmanifest, icons
│  ├─ src/
│  │  ├─ main.tsx
│  │  ├─ App.tsx
│  │  ├─ firebase.ts                   # init, emulator hookup
│  │  ├─ api/                          # callable wrappers, typed with shared schemas
│  │  ├─ hooks/                        # useLiveState, useStops, useTrip, useOperator, useLang
│  │  ├─ state/                        # lightweight store (zustand) for plan/safe-wait/slider
│  │  ├─ pages/                        # Home, Plan, RouteDetail, Alerts, Report, TripShare, Dashboard, Demo
│  │  ├─ components/                   # MapView, RouteCompareCard, RiskBadge, SafeWaitToast, ...
│  │  ├─ i18n/                         # en.json, hi.json
│  │  └─ styles/
│  └─ test/
├─ e2e/                                # optional Playwright suite
└─ .github/
   ├─ workflows/ci.yml
   └─ pull_request_template.md
```

### 4.1 Folder-structure tasks

- [ ] Create all directories above with `.gitkeep` where empty.
- [ ] Add `seed/README.md` describing every seed file, its schema, and its source (simulated).
- [ ] Add `docs/` stubs so links in the README never 404.
- [ ] Verify the structure with a tree listing and attach it to the M0 commit message body.

---

## 5. Working conventions

### 5.1 Commit and push rules (from PRD §0)

- [ ] One logical change per commit.
- [ ] Conventional messages: `feat:`, `fix:`, `docs:`, `test:`, `refactor:`, `chore:`, `prompt:`, `guard:`.
- [ ] Push after **every** commit; deploy after every push that changes a deploy target.
- [ ] Branch `feat/<name>` + PR for: trip state machine, guardrails, security rules, data model/schemas.
- [ ] Never commit `.env*`, service-account JSON, API keys, real user data.
- [ ] Update the PRD changelog (§18) when scope, design, or a decision changes, and push it.
- [ ] A broken deploy is rolled back immediately (`firebase hosting:rollback` / redeploy previous functions commit).

### 5.2 Which deploy target for which change

| Change in | Deploy command |
|---|---|
| `web/**` | `firebase deploy --only hosting` |
| `functions/**`, `shared/**`, `prompts/**` | `firebase deploy --only functions` (and `hosting` if `shared/` also changed the web build) |
| `firestore.rules` | `firebase deploy --only firestore:rules` |
| `firestore.indexes.json` | `firebase deploy --only firestore:indexes` |
| `seed/**` | no deploy; run `seedFirestore` against emulator, then prod |
| docs only | no deploy; still commit and push |

### 5.3 Code conventions

- [ ] TypeScript `strict: true`, `noUncheckedIndexedAccess: true`, no `any` without a comment explaining why.
- [ ] ESLint + Prettier; CI fails on lint errors.
- [ ] Engine functions are **pure**: inputs in, outputs out, no `Date.now()`, no `Math.random()` (inject a seeded RNG).
- [ ] Units: distance in metres, speed in m/s, durations in minutes unless the name ends with `Ms` or `Sec`.
- [ ] IDs: `stop_<slug>`, `route_<n>`, `bus_<route>_<n>`, `alert_<ulid>`, `rep_<ulid>`; trip tokens are 32 lowercase hex characters (128 bits).
- [ ] Every boundary (callable input, Firestore write, LLM output) is validated with zod from `shared/schemas`.
- [ ] i18n keys: `area.subarea.name`, for example `alerts.likelySkip.title`. No hard-coded UI strings in components.
- [ ] Error messages shown to users never expose stack traces, internal IDs, or hints about other users.
- [ ] Wording rules: use "waiting risk" and "service reliability". Never "crime", "dangerous area", or victim-blaming phrasing (enforced by `bannedPhrases.ts` and a repo-wide lint test that scans `web/src`, `prompts/`, and `shared/i18n`).
- [ ] Every screen renders `SimulatedDataBadge` (enforced by a test that renders each page).

### 5.4 Task definition of done (applies to every checklist item)

- [ ] Code written and reviewed (self-review diff before commit).
- [ ] Unit tests added or updated and passing locally.
- [ ] Lint and typecheck pass.
- [ ] Commit message follows the convention.
- [ ] Pushed to GitHub; CI is green.
- [ ] Deployed if a deploy target changed; live behaviour checked.
- [ ] PRD changelog updated if a decision changed.

### 5.5 Pull request template (to create in M0)

```
## What changed
## Why
## Touches (tick all): [ ] state machine  [ ] guardrails  [ ] security rules  [ ] data model  [ ] prompts
## Tests added/updated
## Deploy targets run
## Screenshots (UI changes)
## PRD sections affected / changelog updated?
```

### 5.6 Local development workflow

1. `npm ci` at the repo root (installs all workspaces).
2. `npm run emulators` (Auth 9099, Functions 5001, Firestore 8080, Hosting 5000, UI 4000).
3. `npm run seed:emulator` to load seed data.
4. `npm run dev --workspace web` (Vite on 5173, connected to emulators when `VITE_USE_EMULATORS=true`).
5. `npm test` runs shared, functions (inside `emulators:exec`), and web suites.

---
## 6. Milestone plan (M0–M7)

Every milestone follows the same loop: **write tests → implement → run emulators → verify "Done when" → update changelog → commit → push → deploy → tick the checklist.** Task IDs use `M<milestone>-<nn>`.

| M | Name | Core outcome | Deploy targets |
|---|---|---|---|
| M0 | Foundation | Repo, Firebase, CI, placeholder live | hosting |
| M1 | Schemas and seed | zod schemas, seed JSON, seeding script | firestore:rules, firestore:indexes (initial), hosting |
| M2 | Simulator and live map | Moving buses via `sim/live` | hosting, firestore:rules |
| M3 | ETA, detectors, risk | Ranges, alerts, factor breakdown, replay | hosting |
| M4 | Route planner and ranker | Fastest vs safer card | hosting |
| M5 | Safe Wait and trip sharing | State machine, callables, trip page | hosting, functions, firestore:rules |
| M6 | Reports, AI, dashboard | Guardrails, triage, dashboard, review queue | hosting, functions, firestore:rules, firestore:indexes |
| M7 | Polish and demo hardening | Slider, Hindi, PWA, eval, E2E, backup video | hosting, functions |

---

### M0 — Foundation

**Objective:** a clean monorepo with Firebase wired up, emulators running, CI green, and a placeholder page live at the Hosting URL.

**Prerequisites:** §2.4 blocking checklist complete (Q1, Q2 answered).

#### Tasks

**Repository and tooling**
- [x] M0-01 Create/confirm the GitHub repo `transitiq`; clone locally.
- [x] M0-02 Add `.gitignore` first (secrets, `node_modules`, `dist`, `lib`, `.firebase`, `*.log`, service-account patterns, `.env*`). Commit and push before anything else.
- [x] M0-03 Add `TRANSITIQ_PRD.md`, `TRANSITIQ_SPEC.md`, `build_plan.md` to the repo root.
- [x] M0-04 Create root `package.json` with npm workspaces (`shared`, `web`, `functions`), `engines.node >= 20`.
- [x] M0-05 Add `tsconfig.base.json` (strict, ES2022, `moduleResolution: bundler`, path alias `@transitiq/shared`).
- [x] M0-06 Add ESLint (typescript-eslint) and Prettier configs; add `npm run lint` and `npm run format:check`.
- [x] M0-07 Add Husky or a simple `pre-push` script that runs lint + typecheck + tests (optional; CI is the enforcement).
- [x] M0-08 Create the folder skeleton from §4 with `.gitkeep` files.
- [x] M0-09 Add `README.md` (what it is, quick start, links to PRD and build plan, "Simulated data" notice).
- [x] M0-10 Add `.github/pull_request_template.md` from §5.5.

**Shared package**
- [x] M0-11 Scaffold `shared/` as `@transitiq/shared` (`package.json`, `tsconfig.json`, `src/index.ts`).
- [x] M0-12 Add Vitest to `shared/` and one sanity test.
- [x] M0-13 Install `zod` in `shared/`.

**Web app**
- [x] M0-14 Scaffold `web/` with Vite + React + TypeScript.
- [x] M0-15 Add Tailwind CSS and base styles (mobile-first, high-contrast palette, focus rings).
- [x] M0-16 Add React Router with placeholder routes from PRD §13.2 (`/`, `/plan`, `/route/:id`, `/alerts`, `/report`, `/trip/:token`, `/dashboard`, `/demo`).
- [x] M0-17 Add `SimulatedDataBadge` component and render it in the app shell.
- [x] M0-18 Add Vitest + React Testing Library to `web/`; write a test that the badge renders on every route.
- [x] M0-19 Add a Vite alias for `@transitiq/shared`.
- [x] M0-20 Add `vite-plugin-pwa` with a minimal manifest (name TransitIQ, theme colour, icons placeholder).

**Functions**
- [x] M0-21 Scaffold `functions/` (TypeScript, 2nd gen, Node 20) with a single `health` callable that returns `{ ok: true }`.
- [x] M0-22 Add `tsup.config.ts` with `noExternal: ["@transitiq/shared"]` (Decision D4).
- [x] M0-23 Add a `predeploy` script that builds `shared` then bundles `functions`.
- [x] M0-24 Add Vitest to `functions/`; write a test for `health`.
- [x] M0-25 Write a test that the built `functions/lib` has no `workspace:` / `@transitiq/shared` import left unresolved.

**Firebase**
- [x] M0-26 Run `firebase login` (owner account from Q1) and `firebase init` for Hosting, Firestore, Functions, Emulators. Choose existing project `<FIREBASE_PROJECT_ID>`.
- [x] M0-27 Configure `firebase.json`: Hosting `public: web/dist`, SPA rewrite `** → /index.html`, headers (cache static assets, no-cache for `index.html` and service worker).
- [x] M0-28 Configure emulator ports (Auth 9099, Functions 5001, Firestore 8080, Hosting 5000, UI 4000) and `singleProjectMode`.
- [x] M0-29 Set Functions region `asia-south1` in code defaults.
- [x] M0-30 Create `firestore.rules` with **default deny** only, and an empty `firestore.indexes.json`.
- [x] M0-31 Enable Firestore (production mode), Anonymous Auth, and Google sign-in in the Firebase console (manual, record in docs).
- [x] M0-32 If Blaze is available: enable it and **set a budget alert** in Google Cloud (record threshold in docs).
- [x] M0-33 Create `web/src/firebase.ts` that initialises the SDK from `VITE_*` env vars and connects to emulators when `VITE_USE_EMULATORS=true`.
- [x] M0-34 Add `.env.example` with variable names only (no values).

**CI/CD skeleton**
- [x] M0-35 Create `.github/workflows/ci.yml` with jobs: install, lint, typecheck, `test:web`, `test:shared`, `test:functions` (inside `emulators:exec`).
- [x] M0-36 Add the deploy job (runs on `main` only, needs `test`) using the service-account secret.
- [x] M0-37 Create a **deploy-only service account** in Google Cloud with least privilege; store JSON as GitHub Secret `FIREBASE_SERVICE_ACCOUNT`; store `FIREBASE_PROJECT_ID` as a secret. Never commit the key.
- [x] M0-38 Add a secret-scan step (for example gitleaks) to CI.
- [x] M0-39 Push and confirm CI is green.

**First deploy**
- [x] M0-40 Build `web` and run `firebase deploy --only hosting`; confirm the placeholder at the live URL.
- [x] M0-41 Record the live URL in README and PRD header; add a changelog row.

#### Files created or changed
`.gitignore`, `package.json`, `tsconfig.base.json`, ESLint/Prettier configs, `README.md`, `.github/**`, `shared/**` (skeleton), `web/**` (skeleton), `functions/**` (skeleton), `firebase.json`, `.firebaserc`, `firestore.rules`, `firestore.indexes.json`, `.env.example`.

#### Tests to write
- `shared`: sanity test.
- `web`: badge renders on all routes; router renders each placeholder.
- `functions`: `health` returns `{ ok: true }`; bundle contains no unresolved workspace imports.

#### Done when
- `npm test` passes in all three workspaces locally and in CI.
- `firebase emulators:start` runs all four emulators without error.
- The live URL shows the placeholder app with the "Simulated data" badge.
- Pushing to `main` triggers an automatic deploy that succeeds.

#### Commits (conventional) and deploy
```
chore: add gitignore
docs: add PRD, SPEC and build plan
chore: set up npm workspaces and base tsconfig
chore: add eslint and prettier
chore: scaffold shared package
feat: scaffold web app with router and simulated-data badge
chore: scaffold functions with health callable
chore: bundle shared into functions with tsup
chore: init firebase hosting, firestore, functions, emulators
chore: add default-deny firestore rules
chore: add ci workflow with test and deploy jobs
docs: record live url and changelog v1.0.2
```
Deploy: `firebase deploy --only hosting` (and `firestore:rules` for the default-deny rules).

#### M0 exit checklist
- [ ] All M0 tasks ticked.
- [ ] Live URL works.
- [ ] CI green on `main`.
- [ ] No secrets in git history (`git log -p | grep -i key` sanity check).

---

### M1 — Schemas and seed data

**Objective:** one source of truth for data shapes (zod), seed files that reproduce the demo numbers, and an idempotent seeding script.

**Prerequisites:** M0 complete.

#### Tasks

**Schemas (branch `feat/schemas`, PR required)**
- [x] M1-01 Implement `schemas/common.ts`: `LatLng`, `Lighting`, `RiskLabel`, `Lang`.
- [x] M1-02 Implement `schemas/network.ts`: `Stop`, `Route`, `SafeSpot` (as in PRD §7.0).
- [x] M1-03 Implement `schemas/live.ts`: `BusStatus`, `Bus`, `EtaResult`, `AlertType`, `Alert`, `SimLive`.
- [x] M1-04 Implement `schemas/risk.ts`: `RiskFactors`, `WaitRisk`, `RouteOption`.
- [x] M1-05 Implement `schemas/reports.ts`: `ReportCategory`, `ReportInput`, `Report`; add a `SAFETY_CATEGORIES` constant (Decision D1) and `isSafetyRelated()` helper.
- [x] M1-06 Implement `schemas/trips.ts`: `TripState`, `Trip`, plus `expiresAtTs` handling note (Decision D3).
- [x] M1-07 Add `schemas/aggregates.ts`: `StopAggregate` (avg wait by hour, counts, corroboration weight, priority).
- [x] M1-08 Add `schemas/log.ts`: `AiLog` (matches PRD §11 JSON).
- [x] M1-09 Export everything from `shared/src/index.ts`.
- [x] M1-10 Write valid and invalid fixtures per schema in `shared/test/fixtures/`.
- [x] M1-11 Write tests: valid passes, each invalid case fails with the expected issue path (for example text > 500 chars, lat out of range, token length ≠ 32).
- [x] M1-12 Add a **no-PII schema test**: assert that `Report` and `Trip` have no keys matching `/name|phone|email|uid|device|lat|lng|location/i`.

**Geo and time helpers (needed by seed verification)**
- [x] M1-13 Implement `engine/geo.ts`: `haversineM`, `polylineLengthM`, `pointAtDistance`, `distanceAlongRoute(stop)`.
- [x] M1-14 Implement `engine/time.ts`: IST conversion, `periodOf(hour)`, `trafficFactor(hour)`, `headwayMin(route, hour)`, `isNight(hour)`.
- [x] M1-15 Tests for geo (known distances, interpolation endpoints) and time (boundaries at 8, 10, 11, 16, 17, 19, 20, 22).

**Seed data (see §8 for exact contents)**
- [x] M1-16 Create `seed/stops.json` (at least 16 stops incl. Stop A and busy alternative Stop B).
- [x] M1-17 Create `seed/routes.json` (4 routes with polylines and stop order).
- [x] M1-18 Create `seed/safeSpots.json` (10–14 spots near Stop A, Stop B, and interchange stops).
- [x] M1-19 Create `seed/reports.json` (40–50 reports, Hindi and English, with Stop A exactly 7 safety-related).
- [x] M1-20 Create `scripts/generate-history.ts` with a seeded RNG; generate `seed/history.json` (30 days × stops × hours).
- [x] M1-21 Create `seed/incidents.json` (scripted timeline: stall, likely skip, ghost bus).
- [x] M1-22 Write `seed/README.md` documenting each file and stating that **all values are simulated**.
- [x] M1-23 Write `scripts/verify-seed.ts` that validates every seed file with zod and asserts the headline numbers (Stop A avg evening wait 18 ± 0.5, 7 safety-related reports, activity 0.2).
- [x] M1-24 Add the verify script as `npm run verify:seed` and run it in CI.

**Seeding to Firestore**
- [x] M1-25 Implement `functions/src/scripts/seedFirestore.ts` (admin SDK; idempotent via `set` with fixed IDs; batched writes ≤ 500).
- [x] M1-26 Add `npm run seed:emulator` (targets emulator host) and `npm run seed:prod` (requires explicit `--confirm` flag).
- [x] M1-27 Test: running the seed twice yields identical document counts.

**Rules (branch `feat/rules-v1`, PR required)**
- [x] M1-28 Replace default-deny with the PRD §7.2 rules for the collections that exist so far (`stops`, `routes`, `safeSpots`, `history` public read; everything else denied).
- [x] M1-29 Add `firestore.indexes.json` entries from PRD §7.3.
- [x] M1-30 Write rules tests with `@firebase/rules-unit-testing`: public can read stops/routes/safeSpots/history; nobody can write them; unknown collections denied.

**Deploy**
- [x] M1-31 Seed production with `npm run seed:prod -- --confirm` (after reviewing the dry-run count).
- [x] M1-32 `firebase deploy --only firestore:rules,firestore:indexes`.
- [x] M1-33 Temporary Home page lists the stop count from Firestore to prove end-to-end reads.

#### Files created or changed
`shared/src/schemas/*`, `shared/src/engine/{geo,time}.ts`, `seed/*`, `scripts/*`, `functions/src/scripts/seedFirestore.ts`, `firestore.rules`, `firestore.indexes.json`, tests.

#### Tests to write
Schema fixtures (valid/invalid), no-PII test, geo/time unit tests, seed verification, seed idempotency, Firestore rules tests.

#### Done when
- `npm run verify:seed` passes and prints Stop A: avg evening wait 18, 7 safety-related reports.
- Emulator and production Firestore contain the seeded stops, routes, safe spots, history.
- Rules tests pass; production rules deployed.
- The live Home page shows the number of stops loaded from Firestore.

#### Commits and deploy
```
feat: add zod schemas for network, live state, risk, reports, trips
test: add schema fixtures and no-pii test
feat: add geo and time helpers with tests
feat: add lucknow seed data for stops, routes, safe spots
feat: add deterministic history generator
feat: add scripted incidents timeline
test: add seed verification for demo numbers
feat: add idempotent firestore seeding script
guard: add public-read firestore rules for static network data
chore: add firestore indexes
```
Deploy: `firestore:rules`, `firestore:indexes`, `hosting`.

#### M1 exit checklist
- [x] All M1 tasks ticked, PR(s) merged.
- [x] Changelog v1.0.3 added.

---

### M2 — Simulator and live map

**Objective:** buses move along four Lucknow routes in the browser, the demo controller writes `sim/live`, and the rider map updates through `onSnapshot`.

**Prerequisites:** M1 complete.

#### Tasks

**Simulator engine (`shared/engine/simulator.ts`)**
- [x] M2-01 Define `SimState` (buses, simTimeMs, tick, rngState, scenario).
- [x] M2-02 Implement `initSim(network, hour, rngSeed)`: spawn buses per route according to `headwayMin(hour)` so spacing matches the period.
- [x] M2-03 Implement `stepSim(state, dtSec, network)`: advance `distanceAlongRouteM += speedMps × dt`; wrap/finish at route end (turnaround → reverse direction or respawn).
- [x] M2-04 Speed model: `speed = baseSpeed × trafficFactor(hour) × (1 + noise)` with noise from an injected seeded RNG, clamped.
- [x] M2-05 Compute `lat/lng` per bus with `pointAtDistance`.
- [x] M2-06 Dwell at stops for 15–30 s (configurable) so ETAs have realistic jitter.
- [x] M2-07 Output a `SimLive` object (schema-validated) containing buses, simTime, hour, tick; ETAs and alerts arrive in M3.
- [x] M2-08 Determinism tests: same seed + same steps ⇒ identical state.
- [x] M2-09 Tests: buses never leave the polyline, speed within bounds, headway spacing per period (±20%).
- [x] M2-10 Tests: night period has fewer buses than peak.

**Firestore rules (branch `feat/rules-sim`)**
- [x] M2-11 Add `sim/{doc}` public read, operator-only write; `alerts/{id}` public read, operator-only write.
- [x] M2-12 Rules tests: anonymous user cannot write `sim/live`; operator can; public can read.

**Operator auth**
- [x] M2-13 Implement `scripts/grant-operator.ts` (admin SDK sets custom claim `role: "operator"` for allow-listed emails; reads the allow-list from an env var, not from code).
- [x] M2-14 Implement Google sign-in UI (`useOperator` hook) that refreshes the ID token and checks the claim.
- [x] M2-15 `RequireOperator` route guard component with a friendly "Operator access only" screen.
- [x] M2-16 Run the grant script once for `<FIREBASE_OWNER_EMAIL>` against production (record the date in docs, not the token).

**Demo controller (`/demo`)**
- [x] M2-17 Build the Demo page: Start, Pause, Reset, speed multiplier (1×, 2×, 5×), scenario (live/replay), hour selector.
- [x] M2-18 Run the loop with a fixed 2 s tick (accumulate dt so tab throttling does not break movement).
- [x] M2-19 Write `sim/live` each tick with `setDoc`; validate with `SimLive.parse` first.
- [x] M2-20 Add a **write counter** and a 10-minute auto-stop with a visible countdown; show a warning at 80% of the daily budget estimate (20k writes).
- [x] M2-21 Add a "single-tab" guard (`BroadcastChannel`) so two controllers cannot write at once.
- [x] M2-22 Tests: controller refuses to write when not operator; auto-stop fires at 10 minutes (fake timers); write counter increments.

**Rider live map**
- [x] M2-23 Install `leaflet` and `react-leaflet`; add OSM tile layer with attribution.
- [x] M2-24 Implement `useLiveState` (Firestore `onSnapshot` on `sim/live`, with loading/error/stale states; marks data stale after 8 s without updates).
- [x] M2-25 Implement `MapView`: draws routes (polylines in route colours), stops (circle markers), buses (icons with heading).
- [x] M2-26 Smooth bus movement by interpolating between consecutive snapshots (linear tween over the tick length).
- [x] M2-27 Bus tap opens a bottom sheet: route name, direction, status, next stops.
- [x] M2-28 Route legend with toggles; "Stale data" banner when the feed pauses.
- [x] M2-29 `PhoneFrame` component wraps the rider UI on desktop widths (≥ 768 px).
- [x] M2-30 Tests: `useLiveState` handles snapshot updates, errors, stale detection; `MapView` renders N bus markers for N buses.

**Deploy and verify**
- [x] M2-31 `firebase deploy --only firestore:rules,hosting`.
- [x] M2-32 Manual: open `/demo` as operator, start the sim; open `/` in another window and watch buses move.
- [x] M2-33 Manual: sign out, confirm `/demo` is blocked and `sim/live` cannot be written from the console.
- [x] M2-34 Measure writes per minute in the Firestore usage tab; record in docs.

#### Files created or changed
`shared/src/engine/simulator.ts`, `web/src/pages/{Home,Demo}.tsx`, `web/src/components/{MapView,PhoneFrame,RequireOperator,SimControls}.tsx`, `web/src/hooks/{useLiveState,useOperator}.ts`, `firestore.rules`, `scripts/grant-operator.ts`, tests.

#### Tests to write
Simulator determinism and bounds; headway per period; rules for `sim`/`alerts`; controller guard, auto-stop, counter; `useLiveState`; `MapView`.

#### Done when
- Buses move smoothly on all four routes and update about every 2 seconds in a second browser window.
- Non-operators cannot write `sim/live` (rules test and manual check).
- The controller stops itself after 10 minutes and shows its write count.

#### Commits and deploy
```
feat: add bus simulator engine with seeded rng
test: add simulator determinism and bounds tests
guard: add operator-only write rules for sim and alerts
feat: add operator sign-in and route guard
feat: add demo controller with write counter and auto-stop
feat: add live state hook with stale detection
feat: add leaflet map with routes, stops and moving buses
feat: add phone frame layout
docs: record write budget measurements and changelog v1.0.4
```
Deploy: `firestore:rules`, `hosting`.

#### M2 exit checklist
- [x] All M2 tasks ticked, PRs merged.
- [x] Screen recording (30 s) of moving buses saved locally (not committed if large).

---

### M3 — ETA, detectors, wait-risk, replay

**Objective:** ETAs as ranges, delayed/stalled/skipped/ghost alerts, wait-risk labels with factor breakdowns, scripted incidents, and a replay mode.

**Prerequisites:** M2 complete.

#### Tasks

**ETA (`engine/eta.ts`)**
- [x] M3-01 Implement `routeDistanceToStop(bus, stop, route)` including wrap-around and "bus already passed" cases (returns `null`).
- [x] M3-02 Implement `recentAvgSpeed(bus)` using an exponential moving average stored on the bus state.
- [x] M3-03 Implement `eta(bus, stop, hour, hist)` per PRD §9.2: mean, 80% band, clamp low ≥ 0.
- [x] M3-04 Implement `nextBusesAtStop(stopId, buses, routes, hour, hist, n=3)` sorted by `meanMin`.
- [x] M3-05 Tests: stationary bus ⇒ large high bound but finite; passed bus ⇒ excluded; band widens with distance; higher `errorMin` widens band.
- [x] M3-06 Property test: `lowMin <= meanMin <= highMin` always.

**Baseline and evaluation**
- [x] M3-07 Implement a naive schedule-only baseline ETA (distance / scheduled average speed).
- [x] M3-08 Implement `eval/etaMae.ts`: replay simulated history, compute MAE for model vs baseline, and coverage of the 80% band.
- [x] M3-09 Test: model MAE ≤ 0.7 × baseline MAE on the seed history (target from PRD §3.3); fail the build if not.
- [x] M3-10 Print a one-line summary (`npm run eval:eta`) used later on a slide and dashboard card.

**Wait-risk (`engine/risk.ts`)**
- [x] M3-11 Implement `waitRisk(stop, hour, expectedWaitMin, recentSafetyReports)` exactly as PRD §9.3.
- [x] M3-12 Implement `ruleExplanation(factors, expectedWaitMin, hour, lang)` in English and Hindi; template-based; never uses banned phrases.
- [x] M3-13 Tests with golden values: Stop A at 20:00 with 18 min wait and 7 reports ⇒ score ≈ 0.795, label High; Stop B with 4 min wait and 1 report ⇒ score ≈ 0.325, label Low.
- [x] M3-14 Tests: factors sum to score; label thresholds at 0.35 and 0.65; night factor changes at 19:00 and 06:00.
- [x] M3-15 Banned-phrase test over every explanation template.

**Detectors (`engine/detectors.ts`)**
- [x] M3-16 Implement `detectDelay`: compare actual position with schedule-implied position; threshold N minutes (default 4).
- [x] M3-17 Implement `detectStall`: near-zero speed for > 3 minutes away from a stop.
- [x] M3-18 Implement `detectLikelySkip`: behind schedule and (historical skip rate at stop/hour > 0.2 or expected window passed).
- [x] M3-19 Implement `detectGhost`: scheduled departure with no trace within 10 minutes.
- [x] M3-20 Alert factory builds `Alert` with English + Hindi messages from `shared/i18n`; stable IDs so repeated detections update rather than duplicate.
- [x] M3-21 Tests for each detector with positive, negative, and boundary cases (exactly 3:00 minutes stall, exactly 10:00 ghost).
- [x] M3-22 Alert lifecycle test: raise → persist while condition holds → clear when resolved.

**Scripted incidents and replay**
- [x] M3-23 Implement an `IncidentRunner` that applies `seed/incidents.json` events to the simulator at given offsets (t=2:00 Bus 23 stalls for 6 minutes; t=3:00 Route 12 ghost).
- [x] M3-24 Implement **replay mode**: precompute the whole scripted timeline into a frame array (`ReplayTape`) and play it client-side with zero Firestore writes.
- [x] M3-25 Replay controls: play/pause/seek, speed 1×/2×; deterministic given the seed.
- [x] M3-26 Tests: incident fires at the right tick; replay tape equals live-sim output for the same seed; replay writes nothing to Firestore (mock).

**Wire into live state and UI**
- [x] M3-27 Extend `stepSim` output to include `etas` (for stops that riders watch) and `alerts`; keep document size well under 1 MB (assert in a test).
- [x] M3-28 Add `AlertFeed` page (`/alerts`) with severity styling and language toggle for messages.
- [x] M3-29 Add `StopSheet` (tap a stop): next buses with `low–high` ETA, risk badge, "Why?" drawer with factor bars.
- [x] M3-30 Add `RiskBadge` with colour **and** text (Low/Medium/High) and an accessible label.
- [x] M3-31 Component tests: ETA range text formatting ("6–8 min"), badge colour/label mapping, drawer shows all five factors.
- [x] M3-32 Banner on the map when a `LIKELY_SKIP` alert affects a followed stop.
- [x] M3-33 Add a visible "Replay" chip when `scenario = replay`.

**Deploy and verify**
- [x] M3-34 `firebase deploy --only hosting`.
- [x] M3-35 Manual: run the scripted scenario; verify Bus 23 stall → `STALL` → `LIKELY_SKIP` at Stop A; ghost bus appears; ETAs update.
- [x] M3-36 Manual: switch to replay; confirm no writes in the Firestore usage tab.

#### Files created or changed
`shared/src/engine/{eta,risk,detectors,explain}.ts`, `shared/src/i18n/{en,hi}.json`, `functions/src/eval/etaMae.ts`, `web/src/pages/Alerts.tsx`, `web/src/components/{StopSheet,RiskBadge,AlertFeed}.tsx`, replay module, tests.

#### Tests to write
ETA bounds and properties; MAE vs baseline; risk golden values; explanation banned-phrase scan; detector boundaries; alert lifecycle; incident timing; replay equivalence and zero writes; document-size guard; component tests.

#### Done when
- Bus 23's scripted stall produces a `LIKELY_SKIP` alert for Stop A, visible in the feed within one tick.
- ETA ranges update live and satisfy `low ≤ mean ≤ high`.
- Stop A shows **High** with its factor breakdown; Stop B shows **Low**.
- `npm run eval:eta` prints model MAE at least 30% below baseline.
- Replay mode runs the full scripted scenario with zero writes.

#### Commits and deploy
```
feat: add eta engine with uncertainty band
feat: add naive baseline and eta mae evaluation
test: assert model mae beats baseline by 30 percent
feat: add transparent wait-risk scorer with factor breakdown
guard: add banned-phrase scan for explanation templates
feat: add delay, stall, likely-skip and ghost detectors
feat: add scripted incident runner and client-side replay tape
feat: add alerts feed and stop sheet with why-drawer
docs: changelog v1.0.5 for m3
```
Deploy: `hosting`.

#### M3 exit checklist
- [x] All M3 tasks ticked, changelog updated.
- [x] MAE line copied into `docs/judge-qa.md`.

---
### M4 — Route planner and ranker (the visual centerpiece)

**Objective:** given an origin and destination, produce Fastest, Safer (and optionally Balanced) options with exposure minutes, and show them in a side-by-side comparison card with both routes drawn on the map.

**Prerequisites:** M3 complete (ETA, risk, live state).

#### Tasks

**Planning engine**
- [x] M4-01 Define the `Place` list: 12–15 named origins/destinations in Lucknow (Lucknow University, Charbagh, Hazratganj, Gomti Nagar, Alambagh, etc.) with coordinates and nearest-stop candidates.
- [x] M4-02 Implement `candidateBoardingStops(origin, network, maxWalkM=600)`: stops within walking range, sorted by distance.
- [x] M4-03 Implement `candidateAlightStops(destination, network, maxWalkM=600)`.
- [x] M4-04 Implement `directOptions(boardStop, alightStop, network)`: routes serving both stops in the right order.
- [x] M4-05 Implement single-transfer options at designated interchange stops (Hazratganj, Aminabad, Charbagh); cap at one transfer for the MVP.
- [x] M4-06 Implement `walkMinutes(distanceM)` (4.5 km/h) and `pathWalkWeight(path)` (Decision D5: 0.25 lit main road, 0.7 poorly lit segment).
- [x] M4-07 Implement `expectedWait(boardStop, route, buses, hour)`: use the next bus's `meanMin` minus walk time (min 0), or headway/2 if no bus is tracked.
- [x] M4-08 Implement `exposureMinutes(option)` per PRD §9.4 with `waitWeight = 0.2 + 0.8 × score` (D5).
- [x] M4-09 Implement `rankOptions(options, alpha, hour)`: `cost = alpha × travelMin + (1 − alpha) × exposure`; after sunset (hour ≥ 19 or < 6) multiply the lighting and low-activity contributions by 1.25 in the risk weights.
- [x] M4-10 Label options: lowest `travelMin` ⇒ **Fastest**, lowest `cost` at the current alpha ⇒ **Safer**, and a **Balanced** option if distinct.
- [x] M4-11 Ensure Fastest ≠ Safer in the demo scenario (if they are equal, the comparison card says "Fastest is also the safest right now" instead of faking a difference).
- [x] M4-12 Return `RouteOption[]` validated by zod, including polylines for drawing (walk legs + bus legs).
- [x] M4-13 Golden tests for the demo pair: Fastest 28 / wait 14 / exposure 16 / High and Safer 32 / wait 4 / exposure 3 / Low at 20:00 with the seeded state.
- [x] M4-14 Property tests: with alpha = 1 the lowest-travel option wins; with alpha = 0 the lowest-exposure option wins; cost is monotonic in alpha.
- [x] M4-15 Tests: no option boards a stop farther than the walking limit; transfers only at interchanges; sorted output is stable.

**Plan UI**
- [x] M4-16 Plan screen: origin and destination pickers (searchable list plus "tap on map"), "Find routes" button.
- [x] M4-17 `RouteCompareCard`: two columns (Fastest, Safer) with travel time, wait (and where), exposure minutes, risk badge, walking time.
- [x] M4-18 Takeaway line generator: "{extraTravel} extra minutes saves {waitSaved} minutes of unsafe waiting" (computed, localised en/hi); hidden when the numbers do not support it.
- [x] M4-19 Speed-vs-safety slider (`SpeedSafetySlider`, alpha 0–1, default 0.5) that re-ranks live; announces changes to screen readers.
- [x] M4-20 Draw both options on the map in different colours; highlight the risky boarding stop with a ring and the safer stop with a different marker.
- [x] M4-21 Route cards expand to show the factor breakdown for each boarding stop via `RiskBadge`.
- [x] M4-22 "Select this route" stores the choice in app state (used by Safe Wait in M5).
- [x] M4-23 Empty/error states: no direct route, origin = destination, outside service area.
- [x] M4-24 Component tests: card renders both options and the takeaway; slider changes ranking; takeaway hidden when not supported; a11y labels present.
- [x] M4-25 Visual QA at 360, 390, 768, 1280 px widths; fix overflow.

**Demo-number calibration**
- [x] M4-26 Tune seed attributes (Stop A/B activity, lighting, walking distances, headways) until the golden test passes **without** editing formulas; record the final values in `seed/README.md`.
- [x] M4-27 Add `npm run verify:demo` that prints the comparison and fails if numbers drift.

**Deploy and verify**
- [x] M4-28 `firebase deploy --only hosting`.
- [x] M4-29 Manual: plan Lucknow University → Gomti Nagar at 20:00; confirm the card matches the golden numbers and both routes draw.

#### Files created or changed
`shared/src/engine/{exposure,ranker}.ts`, `shared/src/engine/places.ts`, `web/src/pages/Plan.tsx`, `web/src/components/{RouteCompareCard,SpeedSafetySlider}.tsx`, `seed/*` (tuning), tests.

#### Tests to write
Golden demo numbers; alpha property tests; walking limit; transfers; takeaway generator; slider interaction; card rendering; a11y.

#### Done when
- The Fastest vs Safer card shows 28/14/16/High vs 32/4/3/Low at 20:00 and the takeaway "4 extra minutes saves 10 minutes of unsafe waiting".
- Both routes are drawn in different colours with the risky stop highlighted.
- Moving the slider re-ranks options immediately.

#### Commits and deploy
```
feat: add place list and stop candidate search
feat: add direct and single-transfer option builder
feat: add exposure minutes and route ranking with alpha
test: add golden test for fastest vs safer demo numbers
feat: add route compare card and speed-vs-safety slider
feat: draw fastest and safer routes on the map
chore: calibrate seed values to demo numbers
docs: changelog v1.0.6 for m4
```
Deploy: `hosting`.

#### M4 exit checklist
- [x] All M4 tasks ticked.
- [x] Screenshot of the comparison card saved for the pitch deck.

---

### M5 — Safe Wait and trusted-contact trip sharing

**Objective:** the trip state machine, Safe Wait "leave now" notification, safe waiting spots, and expiring share links viewable without login.

**Prerequisites:** M4 complete (a selected route exists).

#### Tasks

**Trip state machine (branch `feat/trip-machine`, PR required)**
- [x] M5-01 Implement `tripMachine.ts`: states `PLANNED | WAITING | BOARDED | COMPLETED | EXPIRED | CANCELLED` and the transition table from PRD §9.1.
- [x] M5-02 `transition(trip, event, nowMs)` returns a new trip or throws `IllegalTransitionError`; events: `ENABLE_WAIT`, `BOARD`, `ARRIVE`, `CANCEL`, `EXPIRE`.
- [x] M5-03 `isShareable(state)` true only for `PLANNED | WAITING | BOARDED`.
- [x] M5-04 Exhaustive tests: every legal transition passes; every illegal transition throws; terminal states are final.
- [x] M5-05 Expiry rule test: `expiresAt = min(tripEnd, createdAt + 2h)`; `EXPIRE` triggers automatically when `nowMs ≥ expiresAt`.

**Safe Wait engine**
- [x] M5-06 Implement `safewait.ts` per Decision D2: primary alert when `etaHighMin ≤ walkMin + bufferMin` (buffer 2); escalation when `etaLowMin ≤ walkMin + 1`.
- [x] M5-07 Idempotency: each alert fires at most once per trip; state stored in the trip's local session object.
- [x] M5-08 Message builder (en/hi): "Bus 23 is ~5 min away. Leave now (6 min walk)." with computed minutes; escalation text "Bus is arriving sooner than expected — leave now."
- [x] M5-09 Tests: fires exactly at the boundary tick; does not fire early; escalation fires only if primary unacknowledged; no double fire after re-render; handles bus becoming `LIKELY_SKIP` (switches to "next bus" suggestion).
- [x] M5-10 Evaluation: `eval/safeWait.ts` simulates 200 trips and reports outdoor-wait reduction vs "arrive at stop at ETA − 0"; assert ≥ 50% reduction (PRD §3.3).

**Safe waiting spots**
- [x] M5-11 Implement `nearbySafeSpots(stop, spots, radiusM=250)` sorted by distance, preferring `openLate`.
- [x] M5-12 `SafeSpotsList` component with distance, type icon, "open late" tag; shown before the alert fires.
- [x] M5-13 Tests: radius filter, sort order, late-open preference.

**Safe Wait UI**
- [x] M5-14 `RouteDetail` page: boarding stop, ETA range, walking time, risk badge with "Why?", safe spots, **Enable Safe Wait** and **Share trip** buttons.
- [x] M5-15 Walking-time input: default from the plan; user can adjust (stepper 1–20 min).
- [x] M5-16 `SafeWaitToast` in the phone frame: appears on trigger, with vibration (where supported), acknowledge and "Snooze 1 min" actions.
- [x] M5-17 Optional FCM web push (Q8): only if time allows; the in-app toast is the supported path.
- [x] M5-18 Component tests: toast text matches the computed message; acknowledge cancels the escalation; Hindi toggle changes text.

**Trip sharing — functions (branch `feat/trip-share`, PR required)**
- [x] M5-19 `createTripShare` callable: zod-validate input, require Anonymous Auth, generate a 128-bit token via `crypto.randomBytes(16).toString("hex")`, write `trips/{token}` with `state`, `expiresAt`, `expiresAtTs`.
- [x] M5-20 `endTrip` callable: validates token ownership (by storing a hashed owner key on the trip; never the raw UID), sets state to `COMPLETED` or `CANCELLED`, sets `expiresAt = now`.
- [x] M5-21 Per-user rate limit on `createTripShare` (for example 10 per hour) through `rateLimits`.
- [x] M5-22 `purgeExpired` scheduled function (hourly): delete expired `trips` and `rateLimits` documents.
- [x] M5-23 Function tests (emulator): token length 32 hex; two calls produce different tokens; expiry capped at 2 h; end invalidates; non-owner cannot end; rate limit enforced; unauthenticated call rejected.
- [x] M5-24 TTL policy: configure Firestore TTL on `expiresAtTs` for `trips` and `rateLimits` (console or CLI), record steps in docs (Decision D3).

**Trip sharing — rules (PR required)**
- [x] M5-25 Add rules: `trips/{token}` `get` allowed only if `resource.data.expiresAt > request.time.toMillis()`; `list` and all writes denied.
- [x] M5-26 Rules tests: get with valid token works; get after expiry denied; list denied; client write denied; unauthenticated visitors can `get` (receiver needs no account).

**Trip share page (`/trip/:token`)**
- [x] M5-27 `useTrip(token)` hook: one-shot `get` of the trip, then follows `sim/live` for bus position, next stop, and ETA; handles not-found/expired.
- [x] M5-28 `TripShare` page: minimal read-only view with a small map, bus number, status, next stop, ETA range, and "This link expires automatically" note. No personal information, no riders' names.
- [x] M5-29 Friendly expired/invalid link screen (no hint whether a token ever existed).
- [x] M5-30 `TripSharePanel` in the rider app: create link, copy button, Web Share API where available, "Stop sharing" button (calls `endTrip`).
- [x] M5-31 Component tests: valid trip renders; expired shows the friendly screen; copy button copies the URL; stop sharing calls `endTrip`.
- [x] M5-32 Add `<meta name="robots" content="noindex">` and a `Referrer-Policy: no-referrer` header on `/trip/*` in `firebase.json`.

**Deploy and verify**
- [x] M5-33 `firebase deploy --only firestore:rules,functions,hosting`.
- [x] M5-34 Manual: enable Safe Wait; watch the toast fire at the right moment; open the share link in a private window; end the trip and confirm the link stops working.
- [x] M5-35 Manual: try listing `trips` from the console as a normal user; confirm denial.

#### Files created or changed
`shared/src/engine/{tripMachine,safewait}.ts`, `functions/src/callables/{createTripShare,endTrip}.ts`, `functions/src/scheduled/purgeExpired.ts`, `functions/src/lib/rateLimit.ts`, `firestore.rules`, `firebase.json` (headers), `web/src/pages/{RouteDetail,TripShare}.tsx`, `web/src/components/{SafeWaitToast,SafeSpotsList,TripSharePanel}.tsx`, tests.

#### Tests to write
State machine exhaustive; Safe Wait boundary, idempotency, escalation; safe spots; function tests; rules tests; trip page and toast component tests; Safe Wait evaluation.

#### Done when
- The "Bus 23 is ~5 min away. Leave now (6 min walk)." toast fires at the correct tick.
- The share link opens in a second window without login, shows the live trip, and stops working after the trip ends or after 2 hours.
- Trips cannot be listed; expired trips cannot be read.

#### Commits and deploy
```
feat: add trip state machine with exhaustive tests
feat: add safe wait trigger with escalation
feat: add safe spots lookup and list
feat: add safe wait toast and route detail screen
feat: add createTripShare and endTrip callables
guard: add trip rules (get by token only, expiry check, no list)
feat: add purgeExpired scheduled function
feat: add trusted-contact trip page
chore: add noindex and no-referrer headers for trip pages
docs: changelog v1.0.7 for m5
```
Deploy: `firestore:rules`, `functions`, `hosting`.

#### M5 exit checklist
- [x] All M5 tasks ticked, PRs merged.
- [x] TTL policy confirmed in console.

---

### M6 — Reports, AI, guardrails, authority dashboard

**Objective:** anonymous reports flow through guardrails and triage (rules plus Genkit), update aggregates in real time, and appear on the authority dashboard with recommended actions and a human-review queue.

**Prerequisites:** M5 complete. Q4 (LLM key) needed for Genkit; the rules fallback works without it.

#### Tasks

**Guardrails first (branch `feat/guardrails`, PR required)**
- [x] M6-01 `guard/redact.ts`: redact Indian mobile numbers (with/without +91, spaces, dashes), emails, 12-digit Aadhaar-like numbers, vehicle plates, URLs; return `{ text, redactions[] }`.
- [x] M6-02 Name-after-cue redaction in English and Hindi cues ("my name is", "mera naam", "called") — best effort, documented as such.
- [x] M6-03 `guard/injection.ts`: detect instruction-like patterns ("ignore previous", "system prompt", "you are now", role-play markers, URL payloads) in English and Hindi transliteration; return a flag, never block silently.
- [x] M6-04 `guard/bannedPhrases.ts`: list for crime-prediction language ("crime rate", "dangerous area", "criminal zone", "unsafe neighbourhood") and victim-blaming patterns ("should not have", "asking for it", "avoid wearing"); `scan(text)` returns hits.
- [x] M6-05 Tests: redaction for ≥ 25 phone/email/Aadhaar/plate variants; no false redaction of times ("8:30 PM") and bus numbers ("Bus 23"); injection samples (≥ 15) flagged; benign Hindi/English reports not flagged.
- [x] M6-06 Test: banned-phrase scan over **all** user-visible strings in `web/src`, `shared/i18n`, and `prompts/` (repo-wide guard test; fails CI on any hit).

**Report submission (branch `feat/reports`, PR required)**
- [x] M6-07 Rules: `reports`, `clusters`, `aggregates`, `reviewQueue`, `logs` read for operators only; client writes denied (except operator `update` on `reviewQueue`).
- [x] M6-08 Rules tests: anonymous user cannot read or write `reports`; operator can read; no client can create a report directly.
- [x] M6-09 `submitReport` callable: zod-validate `ReportInput`; require Anonymous Auth; check `stopId` exists; apply rate limit (5/hour per hashed key); redact PII; injection scan; deterministic triage; optional Genkit triage; write `reports/{id}` (no UID, device, or location); write `reviewQueue/{id}` when `harassment_concern`.
- [x] M6-10 Duplicate dampening: identical normalised text from the same hashed key within 24 h counts once.
- [x] M6-11 Deterministic triage (`rules`): keyword dictionaries (Hindi, English, Hinglish) for lighting, wait, skip, crowding, harassment; severity from keywords and category.
- [x] M6-12 Function tests: valid report stored redacted; rate limit blocks the 6th; PII never stored; harassment lands in `reviewQueue` with `needsHumanReview = true`; unknown stop rejected; oversized text rejected; unauthenticated rejected.
- [x] M6-13 `onReportCreated` trigger: update `aggregates/stops/{stopId}` (counts by category, corroboration weight, 30-day safety-related count), create/attach `clusters/{id}`, and write a log entry.
- [x] M6-14 Corroboration rule: a stop's `recentSafetyReports` contributes fully only when ≥ 3 independent hashed keys reported; otherwise scaled by `count/3`.
- [x] M6-15 Trigger tests: aggregates update on create; clusters group by (`stopId`, `category`); corroboration scaling works.

**Genkit flows (branch `feat/genkit`, PR required)**
- [x] M6-16 Set up Genkit in `functions/`: model plugin, API key via `defineSecret`; wrap flows as callables with Genkit's Firebase helper (verify current API against the docs when building).
- [x] M6-17 Write `prompts/triageReport.v1.md` (purpose, inputs, output schema reference, safety rules, ≥ 4 few-shot examples in Hindi and English).
- [x] M6-18 Implement `flows/triageReport.ts`: input = redacted text + category + stopId; output zod `{ category, severity, lang, theme, needsHumanReview }`; temperature ≤ 0.2; max tokens capped; fall back to rules on any failure, invalid output, timeout (4 s), or banned-phrase hit.
- [x] M6-19 Write `prompts/explainRisk.v1.md` and `flows/explainRisk.ts`: converts factor breakdown into ≤ 280 characters in the requested language; non-blaming, no crime language; fallback to `ruleExplanation`.
- [x] M6-20 Write `prompts/recommendActions.v1.md` and `flows/recommendActions.ts` (optional): narrative around rule-based actions; fallback to rules.
- [x] M6-21 `lib/aiLog.ts`: write `logs/{id}` per PRD §11 (flow, promptVersion, model, source, inputHash, guard flags, latency, outcome, `expiresAtTs`); never log raw text.
- [x] M6-22 Version constants in code (`PROMPT_VERSIONS`) read the prompt file name; test that every flow's version string matches an existing file in `prompts/`.
- [x] M6-23 Mock the model in tests: valid output, malformed output, banned phrase in output, PII in output, timeout; assert fallback each time and that the log outcome is correct.

**Judge (`functions/src/judge`)**
- [x] M6-24 Build a fixed case set (≥ 40 cases: Hindi, English, Hinglish, injection attempts, PII, harassment, empty text, very long text).
- [x] M6-25 Hard checks per output: zod valid, banned-phrase free, no PII, language matches, length limit.
- [x] M6-26 Optional soft judge: second Genkit flow scores tone 1–5 (non-blaming, factual); CI threshold mean ≥ 4 when the secret is available; skipped (with a visible notice) when it is not.
- [x] M6-27 Add `npm run judge` and wire the hard checks into CI.

**Dashboard summary**
- [x] M6-28 `engine/recommendations.ts`: rule-based actions per PRD §10.4 (wait > 15 → add departure; lighting reports ≥ 3 or lighting poor → improve lighting; skipRate > 0.2 → investigate; harassment present → human review and staffed presence).
- [x] M6-29 `dashboardSummary` callable (operator only): ranked stops by `risk × ridershipPerEvening`, KPIs (average evening wait, delayed buses now, total safety-related reports, ghost-bus rate), recommended actions, cluster summaries.
- [x] M6-30 Tests: Stop A ranks first with 18-min average evening wait, 7 safety-related reports, High, and the expected recommendations; non-operators rejected.

**Dashboard UI (operator only)**
- [x] M6-31 `/dashboard` layout (desktop): KPI row, priority table, map heatmap, wait-by-hour chart, clusters panel, recommendations, review queue, system-health card.
- [x] M6-32 Priority table with the headline row: "Stop A: average evening wait 18 minutes, 7 safety-related reports" with risk badge and recommended action.
- [x] M6-33 Heatmap: circle markers sized by priority with a colour **and** label legend; no neighbourhood labels, only stop names.
- [x] M6-34 `WaitByHourChart` (Recharts) for the selected stop using `history` and live aggregates.
- [x] M6-35 `ReviewQueue`: list of harassment-tagged reports (redacted), status (new, in review, resolved), reviewer note; no public exposure; resolving only changes status (no automated action).
- [x] M6-36 System-health card: AI success vs fallback rate, guard blocks, report-to-dashboard latency, ETA MAE line from `eval`.
- [x] M6-37 Dashboard footer shows active `promptVersions`.
- [x] M6-38 Component tests: headline row text; queue never renders on non-operator routes; chart renders from fixtures.

**Rider report form**
- [x] M6-39 `/report` page: category chips, stop selector, optional text (500 chars with counter), reassuring anonymity note, success state, error states (rate-limited, offline).
- [x] M6-40 Hindi/English strings for the form; a11y labels; keyboard navigation.
- [x] M6-41 Component tests: validation, success, rate-limit message, no identifying fields in the payload (snapshot of the request body).

**Indexes, deploy, verify**
- [x] M6-42 Finalise `firestore.indexes.json` for `reports`, `clusters`, `aggregates` queries; deploy.
- [x] M6-43 `firebase deploy --only firestore:rules,firestore:indexes,functions,hosting`.
- [x] M6-44 Manual: submit a report from the rider UI; dashboard updates in under 5 seconds; rider cannot open `/dashboard`.
- [x] M6-45 Manual: submit an injection-style and a phone-number report; confirm redaction, flag, and fallback paths in `logs`.
- [x] M6-46 Disable the LLM secret temporarily; confirm every flow falls back and the UI still works.
- [x] M6-47 **Scope freeze** after this milestone (§13).

#### Files created or changed
`shared/src/guard/*`, `shared/src/engine/recommendations.ts`, `functions/src/{callables,triggers,flows,lib,judge}/*`, `prompts/*`, `firestore.rules`, `firestore.indexes.json`, `web/src/pages/{Dashboard,Report}.tsx`, dashboard components, tests.

#### Tests to write
Redaction, injection, banned phrases (including repo-wide scan); rules; `submitReport`; trigger; corroboration; flows with mocked model; judge; dashboard summary; UI tests.

#### Done when
- The dashboard shows **"Stop A: average evening wait 18 minutes, 7 safety-related reports"**, High, with a recommended action.
- A newly submitted report appears on the dashboard in under 5 seconds.
- Harassment-tagged reports appear only in the human-review queue.
- Riders cannot read `reports` (rules test and manual check).
- With the LLM disabled, every flow uses its fallback and the app still works.
- Guardrail and judge tests pass in CI.

#### Commits and deploy
```
guard: add pii redaction with indian formats
guard: add prompt-injection scan
guard: add banned-phrase list and repo-wide scan test
guard: add operator-only rules for reports, clusters, aggregates, queue, logs
feat: add submitReport callable with rate limit and redaction
feat: add onReportCreated aggregates and clusters with corroboration
prompt: add triageReport v1
feat: add triageReport genkit flow with rules fallback
prompt: add explainRisk v1
feat: add explainRisk flow with fallback
prompt: add recommendActions v1
test: add judge harness and hard checks to ci
feat: add dashboardSummary callable and rule-based recommendations
feat: add authority dashboard with priority table, heatmap, chart, queue
feat: add anonymous report form
docs: changelog v1.0.8 for m6 and scope freeze
```
Deploy: `firestore:rules`, `firestore:indexes`, `functions`, `hosting`.

#### M6 exit checklist
- [x] All M6 tasks ticked, PRs merged.
- [x] Scope frozen; roadmap items remain documentation only.

---

### M7 — Polish and demo hardening

**Objective:** make the demo reliable and impressive: time slider, Hindi, PWA, ETA evaluation card, E2E test of the demo script, backup video.

**Prerequisites:** M6 complete. **No new features** (scope freeze).

#### Tasks

**Time slider and scenario control**
- [ ] M7-01 `TimeSlider` (5 PM–10 PM, 15-minute steps): re-initialises headways and traffic; risk, waits, and route comparison update.
- [ ] M7-02 Slider available on the rider app in "demo mode" (flag set from the Demo page) and in the dashboard.
- [ ] M7-03 Tests: changing the hour changes headways per period and flips the night factor at 19:00.

**Language and accessibility**
- [ ] M7-04 Complete `hi.json` for all rider screens, alerts, Safe Wait messages, report form, and risk explanations; have a Hindi speaker review.
- [ ] M7-05 Language toggle persists in `localStorage` (wrapped in try/catch) and respects the browser locale on first load.
- [ ] M7-06 Test that every `en.json` key exists in `hi.json` and vice versa.
- [ ] M7-07 Accessibility pass: colour contrast ≥ 4.5:1, focus order, ARIA labels on map controls, risk always colour + text, reduced-motion support.
- [ ] M7-08 Add large-text mode (root font scale) and test layout at 200% zoom.

**PWA and offline**
- [ ] M7-09 Complete the manifest (icons 192/512, maskable, theme colour); service worker caches the app shell, static network data, and last `sim/live`.
- [ ] M7-10 Offline banner and "last updated" timestamp; confirm the app loads in airplane mode with cached data.
- [ ] M7-11 Lighthouse run: record PWA, accessibility, performance scores; fix any score < 90 where feasible.

**Evaluation and credibility**
- [ ] M7-12 Dashboard "Evaluation" card showing ETA MAE (model vs baseline), exposure minutes (fastest vs safer), Safe Wait outdoor-wait reduction; all labelled "simulated".
- [ ] M7-13 Add `docs/judge-qa.md` with the Q&A from PRD §23 and the measured numbers.
- [ ] M7-14 Add `docs/privacy-and-ethics.md` summarising PRD §14 and the guardrails, with a link in the app footer.

**Demo reliability**
- [ ] M7-15 Replay mode polish: one-click "Run scripted demo" button that sets the hour, starts the tape, and highlights each step.
- [ ] M7-16 Demo checklist overlay for the presenter (optional, hidden behind `?presenter=1`).
- [ ] M7-17 Preflight script `npm run preflight`: checks seeds, rules deployed, operator claim, sim write budget, LLM secret presence, and the live URL's health callable.
- [ ] M7-18 Reset script: clears reports created during rehearsals and resets aggregates to the seeded state (operator only).
- [ ] M7-19 Add error boundaries and friendly fallbacks on every page; no blank screens.

**E2E (optional but recommended)**
- [ ] M7-20 Playwright against emulators: operator starts sim → rider sees buses → stall alert → plan route (golden numbers) → Safe Wait toast → share link in a second context → submit report → dashboard shows Stop A headline.
- [ ] M7-21 Run the E2E three times in a row; fix flakiness (no fixed sleeps; wait on UI state).

**Security and privacy review**
- [ ] M7-22 Re-run the rules test suite; add any missing negative tests.
- [ ] M7-23 Grep the repo and Firestore export for PII patterns; confirm none.
- [ ] M7-24 Verify security headers (`Referrer-Policy`, `X-Content-Type-Options`, CSP report-only if time allows).
- [ ] M7-25 Confirm no API keys or service accounts in git history (secret-scan the full history).
- [ ] M7-26 Confirm the budget alert exists and Firestore usage is well under daily quotas after rehearsals.

**Backup video and docs**
- [ ] M7-27 Record the full demo video (3–4 minutes) with the live URL, including narration of the data-is-simulated notice.
- [ ] M7-28 Take screenshots for slides: map, comparison card, Safe Wait toast, trip page, dashboard headline, evaluation card.
- [ ] M7-29 Update `README.md` with final architecture diagram, run instructions, screenshots, and live URL.
- [ ] M7-30 Final PRD changelog entry and version bump to v1.1.0 (MVP complete).

**Deploy and rehearse**
- [ ] M7-31 `firebase deploy --only functions,hosting`; verify the live site with the preflight script.
- [ ] M7-32 Run the demo script (PRD §21) end to end three times in a row on the **live** URL; fix anything that deviates.
- [ ] M7-33 Rehearse with a timer (target 3 minutes) and with a flaky-network fallback (replay mode).

#### Files created or changed
`web/src/components/TimeSlider.tsx`, `web/src/i18n/hi.json`, manifest and service-worker config, `docs/*`, `scripts/preflight.ts`, `scripts/reset-demo.ts`, `e2e/*`, README, dashboard evaluation card.

#### Tests to write
Slider behaviour; i18n key parity; accessibility checks; offline smoke; preflight; E2E demo run.

#### Done when
- The full demo script runs without errors **three times in a row** on the live URL.
- Hindi/English toggle works on all rider screens.
- Evaluation card shows MAE, exposure minutes, and Safe Wait reduction.
- Backup video and screenshots exist; README is final.

#### Commits and deploy
```
feat: add time-of-day slider for demo
feat: complete hindi translations and key-parity test
feat: add offline caching and pwa manifest
feat: add evaluation card to dashboard
feat: add one-click scripted demo and presenter overlay
chore: add preflight and reset-demo scripts
test: add playwright e2e for demo script
docs: add judge qa, privacy and ethics, final readme
docs: changelog v1.1.0 mvp complete
```
Deploy: `functions`, `hosting`.

#### M7 exit checklist
- [ ] All M7 tasks ticked.
- [ ] Three clean live runs recorded in the demo log (Appendix E).
- [ ] Release tag `v1.1.0` pushed.

---
## 7. Dependency map

### 7.1 Milestone dependency graph

```
M0 Foundation
 └─► M1 Schemas + seed + rules v1
      └─► M2 Simulator + live map + operator auth
           └─► M3 ETA + detectors + risk + replay
                └─► M4 Planner + ranker + compare card
                     └─► M5 Trip machine + Safe Wait + trip sharing
                          └─► M6 Guardrails + reports + AI + dashboard   ── scope freeze ──
                               └─► M7 Polish + E2E + demo hardening
```

### 7.2 Task-level blockers (the ones that matter)

| Task | Blocked by | Why |
|---|---|---|
| M0-26 `firebase init` | Q1 answered | Needs project ID and owner login |
| M0-32 budget alert | Q2 = Blaze enabled | Billing account needed |
| M1-12 no-PII test | M1-05, M1-06 | Needs report and trip schemas |
| M1-23 verify-seed | M1-16…M1-21, M1-13, M1-14 | Needs seed files and geo/time helpers |
| M2-13 grant-operator | M0-26, M0-31 | Needs Firebase project and Auth enabled |
| M2-19 write `sim/live` | M2-11, M2-14 | Needs rules and operator sign-in |
| M3-03 ETA | M2-07 | Needs simulator output |
| M3-13 risk golden tests | M1-16, M1-19 | Needs Stop A/B attributes and reports |
| M4-13 golden demo test | M3-03, M3-11, M4-08 | Needs ETA, risk, exposure |
| M5-19 `createTripShare` | M0-21, M5-01 | Needs functions scaffold and state machine |
| M5-27 `useTrip` | M5-25, M2-24 | Needs rules and live-state hook |
| M6-09 `submitReport` | M6-01…M6-06, M6-07 | Guardrails and rules come first |
| M6-18 triage flow | M6-17, Q4 | Needs prompt file and model key (fallback works without key) |
| M6-29 `dashboardSummary` | M6-13, M6-28 | Needs aggregates and recommendations |
| M7-20 E2E | M6-47 | Needs the frozen feature set |

### 7.3 Parallel lanes (if more than one person, or when Claude Code batches work)

| Lane | Can run in parallel with | Notes |
|---|---|---|
| Seed data (M1-16…M1-22) | Schemas (M1-01…M1-12) | Agree field names first |
| Operator auth (M2-13…M2-16) | Simulator engine (M2-01…M2-10) | Independent |
| Explanation templates and Hindi strings | ETA/detectors | Only need `WaitRisk` shape |
| Report form UI (M6-39) | Guardrails and functions | Use a mocked callable |
| Dashboard UI (M6-31) | `dashboardSummary` function | Use fixture data |
| Docs (`docs/*`) | Everything | Low risk |

### 7.4 Critical path

M0 → M1 (schemas, seed) → M2 (simulator, live map) → M3 (ETA, risk) → M4 (compare card) → M5 (Safe Wait, trip share) → M6 (reports, dashboard) → M7 (hardening).
The **single biggest risk to the schedule** is M2 (simulator + map smoothness) and M4 calibration (demo numbers). Start both early and keep them small.

### 7.5 Suggested effort estimate (solo + Claude Code; adjust to your timeline)

| Milestone | Estimated effort | Notes |
|---|---|---|
| M0 | 2–3 h | Mostly setup and CI |
| M1 | 3–4 h | Seed quality matters |
| M2 | 4–6 h | Map polish takes time |
| M3 | 4–5 h | Many small tested functions |
| M4 | 3–4 h | Calibration loop |
| M5 | 4–5 h | Rules + callables + UI |
| M6 | 6–8 h | Largest milestone |
| M7 | 4–6 h | Hardening and recording |
| **Total** | **≈ 30–41 h** | Fits a 36–48 h hackathon only if scope stays frozen |

If time is short, cut in this order: (1) optional FCM, (2) recommendActions flow, (3) soft LLM judge, (4) Playwright E2E, (5) large-text mode. Never cut: golden demo numbers, guardrails, rules tests, replay mode.

---

## 8. Data and seed plan

All values are **simulated**. Every seed file is validated by zod in `scripts/verify-seed.ts`. Coordinates below are approximate starting points; verify them on the map and with haversine tests before relying on them.

### 8.1 `seed/stops.json` (16 stops)

| ID | Name | Lat | Lng | Activity | Lighting | Ridership/evening | Skip rate | Notes |
|---|---|---|---|---|---|---|---|---|
| stop_alambagh | Alambagh | 26.8130 | 80.9010 | 0.85 | good | 700 | 0.05 | Route 12 start |
| stop_charbagh | Charbagh | 26.8315 | 80.9230 | 0.90 | good | 900 | 0.05 | Interchange (23, 41) |
| stop_aminabad | Aminabad | 26.8470 | 80.9250 | 0.85 | good | 650 | 0.08 | Interchange (12, 41) |
| stop_chowk | Chowk | 26.8710 | 80.9120 | 0.80 | moderate | 500 | 0.08 | Route 7 start |
| stop_kaiserbagh | Kaiserbagh | 26.8530 | 80.9340 | 0.75 | good | 450 | 0.06 | Route 23 |
| stop_lu | Lucknow University | 26.8640 | 80.9250 | 0.60 | moderate | 600 | 0.10 | Demo origin area (Route 12) |
| stop_hazratganj | Hazratganj | 26.8500 | 80.9470 | 0.95 | good | 1000 | 0.04 | Interchange (7, 23, 41) |
| stop_lohia | Lohia Path | 26.8510 | 80.9600 | 0.55 | moderate | 380 | 0.10 | Route 23 |
| **stop_A** | **Stop A (Example)** | 26.8528 | 80.9655 | **0.20** | **poor** | **400** | **0.25** | **Isolated stretch; long evening waits; Route 23 only** |
| **stop_B** | **Stop B (Market Junction)** | 26.8545 | 80.9685 | **0.80** | good | 420 | 0.05 | **~350–400 m from A; Routes 41 and 7; busy, lit** |
| stop_munshipulia | Munshi Pulia | 26.8700 | 80.9800 | 0.50 | moderate | 300 | 0.12 | Route 7 |
| stop_indiranagar | Indira Nagar | 26.8760 | 80.9930 | 0.70 | good | 500 | 0.07 | Route 7 end |
| stop_patrakar | Patrakarpuram | 26.8600 | 80.9960 | 0.65 | moderate | 380 | 0.09 | Route 23/41 |
| stop_gomtinagar | Gomti Nagar | 26.8560 | 81.0010 | 0.85 | good | 800 | 0.05 | Demo destination (23, 41) |
| stop_vibhuti | Vibhuti Khand | 26.8650 | 81.0100 | 0.80 | good | 450 | 0.06 | Route 23/41 end |
| stop_naka | Naka Hindola | 26.8420 | 80.9170 | 0.70 | moderate | 350 | 0.10 | Route 12 |

Checks: Stop A–B distance between 300 and 450 m (haversine test); Stop A is the only stop with `lighting = poor` and `activity ≤ 0.2`.

### 8.2 `seed/routes.json` (4 routes)

| Route | Name | Colour | Stop order | Headway (peak / offpeak / evening) |
|---|---|---|---|---|
| route_23 | Bus 23 | #e11d48 | Charbagh → Kaiserbagh → Hazratganj → Lohia Path → **Stop A** → Patrakarpuram → Gomti Nagar → Vibhuti Khand | 10 / 15 / 25 min |
| route_12 | Bus 12 | #2563eb | Alambagh → Naka Hindola → Aminabad → Lucknow University | 8 / 15 / 20 min |
| route_7 | Bus 7 | #16a34a | Chowk → Hazratganj → **Stop B** → Munshi Pulia → Indira Nagar | 10 / 15 / 20 min |
| route_41 | Bus 41 | #d97706 | Charbagh → Aminabad → Hazratganj → **Stop B** → Patrakarpuram → Gomti Nagar | 12 / 18 / 20 min |

Polylines: 40–80 points per route, snapped by hand or through a one-off OSRM/Overpass export saved to `seed/` (Q10). Verify visually that lines follow roads.

### 8.3 `seed/safeSpots.json` (10–14 spots)

- 3 near Stop A (a 24-hour pharmacy, a petrol pump, a late-open shop) at 120–250 m.
- 3 near Stop B (market stalls, pharmacy, ATM kiosk with guard) within 100 m.
- 4–8 near interchanges (Charbagh, Hazratganj, Aminabad, Gomti Nagar).
- Each: `id`, `name`, `kind`, `lat`, `lng`, `openLate`. Names are invented and labelled simulated.

### 8.4 Numbers that must reproduce (the golden contract)

**Wait-risk at 20:00 (formula from PRD §9.3):**

| Stop | Expected wait | Reports (safety-related) | wait | night | lowActivity | reports | unreliability | Score | Label |
|---|---|---|---|---|---|---|---|---|---|
| Stop A | 18 min | 7 | 0.27 | 0.20 | 0.16 | 0.14 | 0.025 | **0.795** | **High** |
| Stop B | 4 min | 1 | 0.06 | 0.20 | 0.04 | 0.02 | 0.005 | **0.325** | **Low** |

**Exposure minutes (Decision D5):**
- Fastest (board Stop A): `waitWeight = 0.2 + 0.8 × 0.795 = 0.836`; `14 × 0.836 = 11.7`; walk 6 min × 0.7 = 4.2; total **15.9 ≈ 16**.
- Safer (board Stop B): `waitWeight = 0.2 + 0.8 × 0.325 = 0.46`; `4 × 0.46 = 1.84`; walk 5 min × 0.25 = 1.25; total **3.09 ≈ 3**.

| Option | Travel | Wait | Boarding stop | Exposure | Risk |
|---|---|---|---|---|---|
| Fastest | 28 min | 14 min | Stop A | 16 | High |
| Safer | 32 min | 4 min | Stop B | 3 | Low |

Takeaway text: "4 extra minutes saves 10 minutes of unsafe waiting." (32 − 28 = 4 extra; 14 − 4 = 10 wait minutes saved.)

Stop A dashboard headline: "average evening wait **18 minutes**, **7** safety-related reports", priority = risk × ridership = 0.795 × 400 ≈ 318 (highest in the seed).

Calibration order if numbers drift: (1) adjust `expectedWait` through headways and bus positions in the scripted scenario, (2) adjust walking distances, (3) adjust stop activity/skip rate within the table ranges, (4) only then consider changing D5 weights (record in changelog).

### 8.5 `seed/reports.json` (≈ 45 reports)

- **Stop A: 9 reports** — 3 `poor_lighting`, 2 `long_wait`, 2 `harassment_concern` (the 7 safety-related) + 1 `skipped_bus` + 1 `overcrowding`.
- Other stops: 2–4 reports each, mostly `skipped_bus`, `overcrowding`, `long_wait`; Stop B has exactly 1 safety-related.
- Languages: ~50% English, ~35% Hindi (Devanagari), ~15% Hinglish.
- Timestamps spread over the last 30 simulated days, skewed to 18:00–22:00.
- **No names, phone numbers, or identifying details.** Harassment reports are phrased neutrally (for example "felt uncomfortable because a group was loitering near the stop").
- 3 reports intentionally contain PII-like strings (a phone number, an email) **in a separate test fixture only**, not in the production seed.
- 2 reports are injection-style samples in the **test fixture only**.

Example entries (illustrative):

```json
{ "stopId": "stop_A", "category": "poor_lighting", "text": "Stop par raat mein bilkul andhera rehta hai." }
{ "stopId": "stop_A", "category": "long_wait",     "text": "Waited almost 20 minutes after 8 PM, no bus showed up." }
{ "stopId": "stop_A", "category": "harassment_concern", "text": "Felt uncomfortable because a group was loitering near the stop." }
{ "stopId": "stop_B", "category": "overcrowding", "text": "बस में बहुत भीड़ थी।" }
```

### 8.6 `seed/history.json` (generated)

- 30 days × 16 stops × hours 6–22 of: `waitMin`, `delayMin`, `skipped` (boolean), `etaErrorMin`.
- Generated by `scripts/generate-history.ts` with a fixed seed (for example `20261023`), so regeneration is byte-identical.
- Distributions: Stop A evening (19–22) wait mean 18, sd 5; Stop B evening mean 4, sd 2; other stops evening mean 6–10; daytime means lower; peak hours show larger delays.
- After generation, the script **recentres** Stop A's evening average to exactly 18.0 (± 0.1) and prints it; `verify-seed` asserts ± 0.5.
- `etaErrorMin` stats feed `historical_error[stop]` for ETA bands; the baseline (schedule-only) is intentionally less accurate so MAE comparison is meaningful (target ≥ 30% improvement).

### 8.7 `seed/incidents.json` (scripted timeline)

```json
{
  "seed": 20261023,
  "startHour": 20,
  "events": [
    { "atSec": 120, "type": "STALL",  "busId": "bus_23_1", "durationSec": 360 },
    { "atSec": 125, "type": "LIKELY_SKIP", "busId": "bus_23_1", "stopId": "stop_A" },
    { "atSec": 180, "type": "GHOST",  "routeId": "route_12", "scheduledDepartureSec": 150 }
  ]
}
```

Rules: events apply to the simulator by offset; replay tape generated from the same file must match live output (test).

### 8.8 Firestore collection seed order

1. `stops`, `routes`, `safeSpots`
2. `history/{stopId}` (one document per stop with hour arrays, to stay well below document size limits)
3. `reports` (seeded through admin script, bypassing `submitReport`, with `triage.source = "rules"`)
4. `aggregates/stops/{stopId}` (computed by the same code as `onReportCreated`)
5. `clusters`
6. `sim/live` (empty initial state)

---

## 9. AI and guardrails plan

**Principle:** deterministic code is the source of truth. Genkit adds language understanding only. The LLM never sets a safety score, raises an alert, or triggers any action.

### 9.1 Flows and fallbacks

| Flow | Purpose | Input | Output (zod) | Fallback | Prompt file |
|---|---|---|---|---|---|
| `triageReport` | Classify a redacted report | text, category, stopId | `{category, severity, lang, theme, needsHumanReview}` | Keyword/regex rules (Hindi, English, Hinglish) | `prompts/triageReport.v1.md` |
| `explainRisk` | Plain-language explanation of factor breakdown | factors, stop name, hour, lang | `{ text ≤ 280 chars }` | `ruleExplanation()` | `prompts/explainRisk.v1.md` |
| `recommendActions` (optional) | Narrative around rule-based actions | stop aggregates | `{ actions: string[] }` | Rule-based actions | `prompts/recommendActions.v1.md` |

### 9.2 Prompt file template (each prompt file must contain)

```
# <flow> — v<N>
## Purpose
## Inputs (names and types)
## Output schema (reference to the zod schema name)
## Hard rules
- Talk only about waiting risk and service reliability.
- Never mention crime, criminals, or dangerous areas.
- Never blame the person reporting; never advise women to change behaviour.
- Never output personal data; if the input contains any, ignore it.
- If unsure, return the safest classification and set needsHumanReview = true.
## Few-shot examples (≥ 4: Hindi, English, Hinglish, injection attempt)
## Changelog
```

### 9.3 Guardrail pipeline (order matters)

1. zod-validate input (length, enum).
2. **Redact PII** (before storage and before any LLM call).
3. **Injection scan** → flag; flagged text is treated as inert data and sent through rules-only triage.
4. Deterministic triage always runs first (so there is always a result).
5. Optional Genkit triage (timeout 4 s, temperature ≤ 0.2, capped tokens).
6. zod-validate LLM output; **banned-phrase scan**; PII-in-output scan; language check.
7. On any failure, use the rules result and log `outcome = fallback` (or `blocked`).
8. Harassment category ⇒ `needsHumanReview = true` and write to `reviewQueue`, regardless of LLM output.
9. Write log (no raw text, hashes only).

### 9.3.1 Guardrail tasks recap (cross-reference to M6)

- [ ] Redaction library with ≥ 25 variants (M6-01, M6-02, M6-05).
- [ ] Injection scan (M6-03, M6-05).
- [ ] Banned phrases and repo-wide scan (M6-04, M6-06).
- [ ] Fallback tests for every failure mode (M6-23).
- [ ] Judge harness (M6-24…M6-27).
- [ ] Kill switch: environment flag `AI_ENABLED=false` forces rules-only mode (add in M6; test it).

### 9.4 Judge plan

| Check | Type | Hard fail in CI? |
|---|---|---|
| Output matches zod schema | Hard | Yes |
| No banned phrases | Hard | Yes |
| No PII in output | Hard | Yes |
| Language matches input/UI language | Hard | Yes |
| Length within limit | Hard | Yes |
| Tone score ≥ 4 (LLM judge) | Soft | Yes only when the secret is available |
| Fallback used when LLM disabled | Hard | Yes |

Case set composition: 12 English, 12 Hindi, 8 Hinglish, 4 injection, 4 PII, 4 harassment, 2 empty, 2 very long.

### 9.5 Ethics checks built into the product

- [ ] "AI-generated explanation" label wherever LLM text is displayed.
- [ ] Risk shown per stop with factors; no neighbourhood ranking on rider screens.
- [ ] Authority view frames output as fixes (lighting, schedule, staffing), never as blame.
- [ ] No automated enforcement; review queue only changes status.
- [ ] Data minimisation verified by the no-PII schema test and the Firestore export grep (M7-23).

---

## 10. Testing plan

### 10.1 Layers

| Layer | Tooling | Location | Runs in CI |
|---|---|---|---|
| Unit (engine, guard, schemas) | Vitest | `shared/test` | Yes |
| Functions + triggers | Vitest + Emulator Suite (`emulators:exec`) | `functions/test` | Yes |
| Security rules | `@firebase/rules-unit-testing` | `functions/test/rules` | Yes |
| AI flows with mocked model | Vitest | `functions/test/flows` | Yes |
| Judge (hard checks) | Vitest | `functions/src/judge` | Yes |
| Frontend components | Vitest + React Testing Library | `web/test` | Yes |
| Accessibility | `vitest-axe` or equivalent | `web/test` | Yes |
| E2E demo script | Playwright vs emulators | `e2e/` | Optional (nightly or manual) |
| Seed/demo verification | `tsx` scripts | `scripts/` | Yes (`verify:seed`, `verify:demo`) |

### 10.2 What each milestone must cover

| Milestone | Required tests |
|---|---|
| M0 | Sanity; badge on all routes; `health` callable; bundle has no workspace imports |
| M1 | Schema fixtures; no-PII; geo/time; seed verification; seed idempotency; rules for static data |
| M2 | Simulator determinism and bounds; headway per period; rules for `sim`/`alerts`; controller guard/auto-stop; `useLiveState`; `MapView` |
| M3 | ETA properties; MAE vs baseline; risk golden values; banned-phrase scan; detector boundaries; alert lifecycle; incident timing; replay equivalence and zero writes; document-size guard |
| M4 | Golden demo numbers; alpha property tests; walking limit; transfers; takeaway; slider; card a11y |
| M5 | State machine exhaustive; Safe Wait boundary/idempotency/escalation; Safe Wait evaluation; function tests; trip rules; trip page |
| M6 | Redaction/injection/banned phrases; report rules; `submitReport`; trigger; corroboration; flows with mocked model; judge; dashboard summary; report form; queue visibility |
| M7 | Slider; i18n key parity; a11y; offline smoke; preflight; E2E ×3 |

### 10.3 Coverage targets
- Engine and guard modules: ≥ 90% line coverage.
- Functions: ≥ 80%.
- Rules: every collection has at least one allow and one deny test.
- Web: critical components (compare card, risk badge, toast, trip page, report form, dashboard headline) covered; no global target.

### 10.4 Test data rules
- Use fixtures under `*/test/fixtures`; never real user data.
- Seeded RNG everywhere; no flaky time dependence (inject `nowMs`).
- Emulator data is reset between test files.

### 10.5 Manual QA checklist (run before each deploy of a milestone)
- [ ] Mobile viewport (360 × 640) and desktop (1280 × 800).
- [ ] English and Hindi.
- [ ] Signed-out rider and signed-in operator.
- [ ] Slow network (throttled) and offline.
- [ ] Browser: Chrome (Android), Safari (iOS) if available, Firefox desktop.
- [ ] No console errors; no unhandled promise rejections.

---

## 11. Deployment plan

### 11.1 Environments

| Env | Backend | URL | Used for |
|---|---|---|---|
| Local | Firebase Emulator Suite | `localhost:5000` (hosting), `5173` (Vite) | Development, tests, rehearsal |
| Production | Firebase project `<FIREBASE_PROJECT_ID>` | `https://<FIREBASE_PROJECT_ID>.web.app` | Demo and judging |

(A separate staging project is optional; the PRD uses one production project plus emulators.)

### 11.2 CI/CD steps (`.github/workflows/ci.yml`)

1. Trigger: push to any branch and pull requests; deploy job only on `main`.
2. `actions/checkout`, `actions/setup-node` (Node 20, npm cache).
3. `npm ci` at the root.
4. Lint, format check, typecheck for all workspaces.
5. `npm test --workspace shared`.
6. `npm test --workspace web`.
7. `npx firebase-tools emulators:exec --only firestore,auth,functions "npm test --workspace functions"`.
8. `npm run verify:seed` and `npm run verify:demo`.
9. Secret scan (gitleaks).
10. **Deploy job** (needs all above, `main` only): authenticate with the service account, build `web`, bundle `functions`, then `firebase deploy --only <changed targets>` (or full deploy on the first run).

Note on authentication (see Appendix J, item J3): prefer the official `google-github-actions/auth` action or write the secret JSON to a temporary file and set `GOOGLE_APPLICATION_CREDENTIALS` to its path. Do not rely on a made-up environment variable name.

### 11.3 Secrets and configuration

| Item | Where it lives | Never in |
|---|---|---|
| Deploy service-account JSON | GitHub Secret `FIREBASE_SERVICE_ACCOUNT` | Repo, logs |
| Project ID | GitHub Secret `FIREBASE_PROJECT_ID` (and `.firebaserc`, which is not secret) | — |
| LLM API key | Firebase Secret Manager (`GOOGLE_GENAI_API_KEY` or equivalent) via `defineSecret` | Repo, client bundle |
| Operator allow-list | Functions/script environment config | Source code |
| Firebase web config | `VITE_*` env vars (public by design) | — |
| App Check keys (optional) | Firebase console | Repo |

### 11.4 Deployment checklist per release

- [ ] Tests green locally and in CI.
- [ ] `git status` clean; commit message follows convention.
- [ ] Pushed to GitHub.
- [ ] Correct targets deployed (§5.2).
- [ ] Live smoke test: load `/`, `/trip/invalid-token` (friendly error), `/dashboard` (blocked when signed out).
- [ ] Firestore usage and Functions logs checked for errors.
- [ ] Changelog row added.

### 11.5 Rollback procedure

1. **Hosting:** `firebase hosting:rollback` (or choose a previous version in the console).
2. **Functions:** `git revert <bad commit>` → push → redeploy functions; or redeploy the previous tag.
3. **Rules:** `git revert` the rules commit → `firebase deploy --only firestore:rules`.
4. **Data:** re-run `seed:prod -- --confirm` (idempotent) or the reset script to restore the demo state.
5. Record the incident and fix in the changelog.

### 11.6 Monitoring and cost control

- [ ] Budget alert in Google Cloud (threshold recorded in docs).
- [ ] Firestore usage tab checked after each rehearsal (writes/day target < 5k).
- [ ] Functions logs reviewed for guard blocks and fallbacks.
- [ ] `sim/live` auto-stop (10 minutes) and write counter visible in `/demo`.
- [ ] LLM calls capped (rate limits per hashed key plus a daily cap constant).

### 11.7 Release tags

| Tag | When |
|---|---|
| `v0.1.0` | After M1 |
| `v0.3.0` | After M3 |
| `v0.5.0` | After M5 |
| `v1.0.0` | After M6 (feature complete, scope frozen) |
| `v1.1.0` | After M7 (demo-ready MVP) |

---

## 12. Risks and mitigations

| # | Risk | Likelihood | Impact | Mitigation | Owner/trigger |
|---|---|---|---|---|---|
| R1 | Firestore write cap exhausted by simulator | Medium | High | Single `sim/live` doc, 2 s tick, 10-minute auto-stop, write counter, client-side replay, RTDB upgrade path | M2 |
| R2 | Blaze plan unavailable | Medium | High | No-functions fallback (§2.3) | Q2 |
| R3 | LLM outage, quota, or bad output | Medium | Medium | Deterministic fallback for every flow; zod validation; `AI_ENABLED` kill switch; judge in CI | M6 |
| R4 | Safety score read as crime prediction or biased | Medium | High | Explainable factors, banned-phrase guard, no neighbourhood ranking, honest labels | M3, M6 |
| R5 | Cold start (no reports) | High | Medium | Objective proxies (wait variance, time, stop activity) seeded from simulated/OSM data | M1 |
| R6 | Fake or abusive reports | Medium | Medium | Rate limits, corroboration, duplicate dampening, human review | M6 |
| R7 | No real GPS in target cities | High (post-MVP) | Medium | Tiered data sourcing roadmap | Pitch |
| R8 | iOS background push limits | High | Low | In-app toast for demo; native Android + FCM in roadmap | M5 |
| R9 | Secrets leak | Low | Critical | `.gitignore` first, Secret Manager, GitHub Secrets, gitleaks in CI | M0 |
| R10 | Scope creep | High | High | Scope freeze after M6; roadmap items documentation only | §13 |
| R11 | TTL deletion lags | High | Low | Rules check expiry; hourly `purgeExpired` (D3) | M5 |
| R12 | `shared/` not included in deployed functions | Medium | High | `tsup` bundling and a test on build output (D4) | M0 |
| R13 | Genkit/Firebase API changes | Medium | Medium | Verify against current docs at build time; pin versions; isolate in `flows/` | M6 |
| R14 | Hindi translation quality | Medium | Medium | Native-speaker review; key-parity test | M7 |
| R15 | OSM public tile usage limits | Low | Medium | Light demo traffic only; attribution; swap to another provider if needed | M2 |
| R16 | Anonymous auth abused for spam | Medium | Medium | Rate limits by hashed key; App Check (optional) | M6 |
| R17 | Browser tab throttling slows the simulator | Medium | Medium | dt accumulation; keep demo tab in foreground; replay fallback | M2 |
| R18 | Live demo failure (network, venue Wi-Fi) | Medium | High | Replay mode, recorded video, hotspot backup, preflight script | M7 |
| R19 | Demo numbers drift after seed edits | Medium | High | Golden tests in CI (`verify:demo`) | M4 |
| R20 | Time zone bugs (IST vs UTC) | Medium | Medium | Single time helper, `nowMs` injection, boundary tests | M1 |
| R21 | Document size limit (1 MB) on `sim/live` | Low | Medium | Size assertion test; only watched stops get ETAs | M3 |
| R22 | PII leaking into logs | Low | High | Hash-only logging, test for raw-text absence | M6 |
| R23 | Over-claiming AI to judges | Medium | Medium | Say "transparent rule-based baseline + ML upgrade path"; show MAE vs baseline | Pitch |
| R24 | Single-person bottleneck | Medium | Medium | Small tasks, docs, and tests so Claude Code can resume anywhere | Always |

---

## 13. Scope control

### 13.1 In scope (MVP)
Core features C1–C8 (PRD §5.2): live map with moving buses; ETA ranges; delay/skip/ghost alerts; Fastest vs Safer comparison; Safe Wait notification; trusted-contact trip sharing; anonymous reports; authority dashboard. Should-haves that are cheap: time slider, safe waiting spots, "Why?" explainer, Hindi/English toggle, replay mode, PWA basics.

### 13.2 Out of scope (documentation only)
Real GPS ingestion, real SOS and emergency dispatch, SMS/WhatsApp, native apps, group commute matching, journey check-in implementation, last-mile path routing, voice guidance, user accounts with identity, payments, automated enforcement, crime prediction, per-user tracking history.

### 13.3 Scope freeze
- **Freeze point:** end of M6 (task M6-47).
- After the freeze only: bug fixes, polish, accessibility, translations, tests, documentation, and demo tooling (M7).
- Any new idea goes to `docs/roadmap-ideas.md` with a one-line note; it is **not** built.

### 13.4 Change-control process
1. Write the proposed change and why in the PR description.
2. State which PRD section it touches and which milestone it delays.
3. If it adds more than ~1 hour of work after M3, it needs an explicit decision recorded in the changelog.
4. Update the PRD and this plan in the same commit series.

### 13.5 Cut list (if time runs out, cut in this order)
1. FCM web push
2. `recommendActions` Genkit flow (rules-only remain)
3. LLM soft judge
4. Playwright E2E (keep manual runs)
5. Large-text mode
6. Single-transfer routing (direct routes only for the demo pair)
7. Heatmap (keep ranked table)

**Never cut:** golden demo numbers, guardrails, security rules and tests, replay mode, the "Simulated data" badge.

---

## 14. Definition of done

Copied and extended from PRD §20.

### 14.1 Product
- [ ] 3–4 Lucknow routes with moving buses on the map.
- [ ] ETA shows a range and updates live.
- [ ] Scripted stall triggers a delay/skip alert; ghost bus detected.
- [ ] Route compare card shows Fastest (28 min, 14 min wait, exposure 16, High) vs Safer (32 min, 4 min wait, exposure 3, Low); both routes are drawn.
- [ ] Every risk label has a "Why?" factor breakdown (and an optional AI explanation, labelled).
- [ ] Safe Wait fires at the correct time in a phone-frame toast.
- [ ] Trip link works in a second window, then expires; listing trips is denied.
- [ ] Report submission updates the dashboard; clients cannot read reports.
- [ ] Dashboard shows "Stop A: average evening wait 18 minutes, 7 safety-related reports" and a recommended action.
- [ ] Harassment reports go to the human-review queue only and are never displayed publicly.
- [ ] Time slider changes waits and risk; Hindi/English toggle works.
- [ ] "Simulated data" badge appears on all screens.
- [ ] ETA MAE vs baseline computed and displayed.
- [ ] PWA installable and responsive.

### 14.2 Safety and ethics
- [ ] PII redacted before storage and before any LLM call; no PII fields exist in schemas.
- [ ] Guardrail and judge tests pass; fallback works with the LLM disabled.
- [ ] No banned phrases anywhere in UI strings, prompts, or i18n (repo-wide test).
- [ ] No automated enforcement anywhere.

### 14.3 Engineering
- [ ] CI green; auto-deploy from `main` works.
- [ ] Every change was committed, pushed, and deployed (PRD §0).
- [ ] Prompt versions logged for every AI output.
- [ ] Security-rules tests cover every collection (allow and deny).
- [ ] Budget alert exists; usage within free quotas.
- [ ] Preflight script passes on the live URL.

### 14.4 Demo
- [ ] Demo script (PRD §21) runs cleanly **three times in a row** on the live URL.
- [ ] Backup video and screenshots exist.
- [ ] README, `docs/judge-qa.md`, and `docs/privacy-and-ethics.md` are final.
- [ ] Release tag `v1.1.0` pushed.

---

## 15. Next action

### 15.1 First three steps to start M0

1. **Get answers to the blocking questions** (Q1: Firebase project ID and owner email; Q2: is Blaze available). Until then, scaffold only what does not need Firebase (steps M0-01 … M0-25).
2. **Create the repo skeleton and safety nets:** `.gitignore` first (M0-02), then workspaces, tsconfig, lint, folder skeleton, README, PR template (M0-03 … M0-10). Commit and push after each.
3. **Scaffold the three packages** (`shared`, `web`, `functions`) with sanity tests and the `tsup` bundling check (M0-11 … M0-25); then run `firebase init` with the real project (M0-26) and deploy the placeholder page (M0-40).

### 15.2 Questions you must answer before M0 begins

1. What is the **Firebase project ID**?
2. Which **email** owns the Firebase project (used for login and the first operator claim)?
3. Is the **Blaze plan** available (billing card)? If not, confirm the no-functions fallback (§2.3).
4. Which **LLM and API key** should Genkit use (default Gemini)? (Needed by M6 only.)
5. Which **safety-related categories** count toward the "7 reports" number? (Default: `poor_lighting`, `harassment_concern`, `long_wait`.)
6. Should the Safe Wait alert use the **late end** of the ETA range with the early-end escalation (default, Decision D2)?
7. Can a **Hindi speaker** review translations in M7?
8. Will anyone interview commuters (Q9) so real quotes can go in the pitch?

### 15.3 What Claude Code should do right after this file is approved
- [ ] Commit `build_plan.md` with `docs: add build_plan.md` and push.
- [ ] Report the 10-line plan summary, the list of conflicts (§3 and Appendix J), and the pending questions above.
- [ ] Wait for answers to Q1 and Q2 before running `firebase init`.

---

## 16. Appendices

### Appendix A — npm scripts (target set)

**Root `package.json`**
| Script | Purpose |
|---|---|
| `npm run lint` | ESLint across workspaces |
| `npm run format:check` | Prettier check |
| `npm run typecheck` | `tsc --noEmit` in all workspaces |
| `npm test` | shared + web + functions (via emulators) |
| `npm run emulators` | Start Auth, Firestore, Functions, Hosting emulators |
| `npm run seed:emulator` | Seed emulator Firestore |
| `npm run seed:prod -- --confirm` | Seed production (guarded) |
| `npm run verify:seed` | Validate seed files and headline numbers |
| `npm run verify:demo` | Assert the fastest vs safer golden numbers |
| `npm run eval:eta` | Print ETA MAE vs baseline |
| `npm run eval:safewait` | Print Safe Wait outdoor-wait reduction |
| `npm run judge` | Run the AI output judge |
| `npm run preflight` | Pre-demo health checks against the live URL |
| `npm run reset:demo` | Reset reports/aggregates to seeded state (operator) |
| `npm run build` | Build shared, web, functions |

**`web/`:** `dev`, `build`, `preview`, `test`, `test:watch`, `lint`.
**`functions/`:** `build` (tsup), `test`, `serve`, `deploy`.
**`shared/`:** `build`, `test`, `typecheck`.

### Appendix B — Environment variables and secrets

| Name | Scope | Example/format | Secret? |
|---|---|---|---|
| `VITE_FIREBASE_API_KEY` | web | public web key | No (public by design; restrict by referrer) |
| `VITE_FIREBASE_AUTH_DOMAIN` | web | `<project>.firebaseapp.com` | No |
| `VITE_FIREBASE_PROJECT_ID` | web | `<FIREBASE_PROJECT_ID>` | No |
| `VITE_FIREBASE_APP_ID` | web | web app ID | No |
| `VITE_USE_EMULATORS` | web | `true` locally | No |
| `GOOGLE_GENAI_API_KEY` (or equivalent) | functions | Secret Manager | **Yes** |
| `AI_ENABLED` | functions | `true` / `false` | No |
| `OPERATOR_ALLOWLIST` | scripts/functions | comma-separated emails | Treat as sensitive |
| `FIREBASE_SERVICE_ACCOUNT` | GitHub Actions | JSON | **Yes** |
| `FIREBASE_PROJECT_ID` | GitHub Actions | project ID | Low |

### Appendix C — Example documents (shapes only)

**`trips/{token}`**
```json
{
  "token": "9f2c1d7a5b8e4c03a6d1f0e2b7c49a58",
  "routeId": "route_23",
  "busId": "bus_23_1",
  "boardingStopId": "stop_A",
  "destinationStopId": "stop_gomtinagar",
  "state": "WAITING",
  "ownerKeyHash": "sha256:…",
  "expiresAt": 1792789200000,
  "expiresAtTs": "<Firestore Timestamp>",
  "createdAt": 1792782000000
}
```

**`reports/{id}`**
```json
{
  "id": "rep_01J…",
  "stopId": "stop_A",
  "category": "poor_lighting",
  "textRedacted": "Stop par raat mein andhera rehta hai",
  "lang": "hi",
  "severity": "medium",
  "clusterId": "cl_stopA_lighting",
  "needsHumanReview": false,
  "triage": { "source": "rules", "promptVersion": null },
  "createdAt": 1792782000000
}
```

**`aggregates/stops/stop_A`**
```json
{
  "stopId": "stop_A",
  "avgEveningWaitMin": 18.0,
  "safetyReports30d": 7,
  "serviceReports30d": 2,
  "corroborationWeight": 1.0,
  "waitByHour": { "19": 17.2, "20": 18.4, "21": 18.9, "22": 17.5 },
  "priority": 318.0,
  "updatedAt": 1792782000000
}
```

**`sim/live` (truncated)**
```json
{
  "simTimeMs": 1792782000000,
  "hour": 20,
  "tick": 140,
  "scenario": "live",
  "buses": [{ "id": "bus_23_1", "routeId": "route_23", "distanceAlongRouteM": 4210, "speedMps": 0, "lat": 26.8512, "lng": 80.9601, "status": "STALLED" }],
  "etas": [{ "busId": "bus_23_1", "stopId": "stop_A", "meanMin": 9, "lowMin": 7, "highMin": 12, "confidence": 0.8 }],
  "alerts": [{ "id": "alert_01J…", "type": "LIKELY_SKIP", "severity": "high", "message": "Bus 23 is running late and may skip Stop A.", "affectedStopIds": ["stop_A"], "createdAt": 1792782000000 }],
  "promptVersions": { "triageReport": "v1", "explainRisk": "v1" }
}
```

### Appendix D — Test catalog (names to implement)

**Schemas:** `Stop rejects activity > 1`; `Report has no PII keys`; `Trip token must be 32 chars`; `SimLive rejects hour 24`.
**Geo/time:** `haversine Charbagh–Hazratganj ≈ expected`; `pointAtDistance returns endpoints`; `period boundaries at 8/10/11/16/17/19/20/22`; `isNight flips at 19 and 06`.
**Simulator:** `deterministic with same seed`; `bus stays on polyline`; `headway matches period ±20%`; `night has fewer buses than peak`; `dwell at stops`.
**ETA:** `low ≤ mean ≤ high`; `passed bus excluded`; `band widens with distance`; `MAE ≤ 0.7 × baseline`; `80% coverage within 70–90%`.
**Risk:** `Stop A golden 0.795 High`; `Stop B golden 0.325 Low`; `factors sum to score`; `thresholds 0.35/0.65`; `explanation passes banned-phrase scan`; `Hindi explanation length ≤ 280`.
**Detectors:** `stall at exactly 3:00`; `ghost at exactly 10:00`; `likely skip when behind and skip-rate high`; `alert id stable across ticks`; `alert clears when resolved`.
**Replay:** `tape equals live output`; `replay writes nothing`; `seek to t=120s shows stall`.
**Ranker:** `alpha=1 picks fastest`; `alpha=0 picks lowest exposure`; `cost monotonic in alpha`; `golden demo pair`; `no stop beyond walking limit`; `transfer only at interchange`.
**Trip machine:** `all legal transitions`; `all illegal transitions throw`; `terminal states final`; `expiry capped at 2h`.
**Safe Wait:** `fires at boundary tick`; `not before boundary`; `idempotent`; `escalation only if unacknowledged`; `skip alert switches to next bus`; `outdoor wait reduction ≥ 50%`.
**Rules:** `public reads stops`; `no client writes stops`; `anonymous cannot read reports`; `no client creates reports`; `operator reads reports`; `trip get ok before expiry`; `trip get denied after expiry`; `trip list denied`; `anonymous cannot write sim/live`; `operator writes sim/live`; `default deny`.
**Functions:** `submitReport stores redacted text`; `submitReport never stores uid`; `rate limit blocks 6th`; `harassment goes to reviewQueue`; `unknown stop rejected`; `createTripShare token 32 hex`; `endTrip invalidates`; `non-owner cannot end`; `purgeExpired deletes expired only`; `onReportCreated updates aggregates`; `dashboardSummary operator only`; `Stop A ranks first`.
**Guard:** `25 PII variants redacted`; `Bus 23 and 8:30 PM not redacted`; `15 injection samples flagged`; `benign Hindi not flagged`; `repo-wide banned phrase scan`.
**Flows:** `valid LLM output accepted`; `malformed output → fallback`; `banned phrase in output → blocked`; `PII in output → blocked`; `timeout → fallback`; `AI_ENABLED=false → rules only`; `prompt version file exists`.
**Frontend:** `SimulatedDataBadge on every page`; `RiskBadge shows colour and text`; `RouteCompareCard shows both options`; `takeaway hidden when unsupported`; `slider re-ranks`; `SafeWaitToast text matches`; `TripShare expired screen`; `ReportForm payload has no identifying fields`; `Dashboard headline row`; `ReviewQueue hidden for non-operators`; `i18n key parity`.
**E2E:** `demo script end to end`.

### Appendix E — Demo-day checklist and run log

**Night before**
- [ ] Run `npm run preflight`; fix anything red.
- [ ] Confirm operator sign-in works on the demo laptop.
- [ ] Reset demo data (`npm run reset:demo`).
- [ ] Charge devices; pre-load the live URL; install the PWA on the phone.
- [ ] Download the backup video to the laptop and phone.
- [ ] Prepare a mobile hotspot.

**Just before presenting**
- [ ] Open `/demo` (operator) in one window, rider app in a phone frame, trip link in a second window, `/dashboard` in a third.
- [ ] Set hour to 20:00; start the scripted scenario (or replay mode if the network is poor).
- [ ] Confirm the "Simulated data" badge is visible.

**Run log**

| Run # | Date/time | Environment | Result | Issues found | Fixed? |
|---|---|---|---|---|---|
| 1 | | live | | | |
| 2 | | live | | | |
| 3 | | live | | | |

### Appendix F — Ownership and progress tracker

| Milestone | Owner | Status | Started | Finished | Tag |
|---|---|---|---|---|---|
| M0 Foundation | | ⬜ | | | |
| M1 Schemas and seed | | ⬜ | | | v0.1.0 |
| M2 Simulator and live map | | ⬜ | | | |
| M3 ETA, detectors, risk | | ⬜ | | | v0.3.0 |
| M4 Planner and ranker | | ⬜ | | | |
| M5 Safe Wait and trip sharing | | ⬜ | | | v0.5.0 |
| M6 Reports, AI, dashboard | | ⬜ | | | v1.0.0 |
| M7 Polish and hardening | | ⬜ | | | v1.1.0 |

Legend: ⬜ not started · 🟨 in progress · ✅ done · 🟥 blocked.

### Appendix G — Branch plan

| Branch | Purpose | Merge when |
|---|---|---|
| `main` | Always deployable | After tests green |
| `feat/schemas` | Zod schemas (M1) | PR approved, tests green |
| `feat/rules-v1`, `feat/rules-sim` | Security rules | Rules tests green |
| `feat/trip-machine` | State machine (M5) | Exhaustive tests green |
| `feat/trip-share` | Trip callables and rules (M5) | Function + rules tests green |
| `feat/guardrails` | Redaction, injection, banned phrases (M6) | Guard tests green |
| `feat/reports` | `submitReport`, trigger, rules (M6) | Tests green |
| `feat/genkit` | Flows and prompts (M6) | Mocked-model + judge tests green |

### Appendix H — Glossary

- **Exposure Minutes:** minutes spent waiting or walking under higher-risk conditions, weighted by risk.
- **Wait-risk score:** transparent weighted score (0–1) of waiting conditions at a stop; not a crime prediction.
- **Safe Wait:** notification timed so the user leaves for the stop just before the bus arrives.
- **Replay mode:** client-side playback of a precomputed scripted scenario with zero database writes.
- **Operator:** a signed-in authority user with the custom claim `role = operator`.
- **Corroboration:** requirement that several independent reports back a signal before it counts fully.
- **Golden test:** a test asserting exact demo numbers so seed edits cannot silently break the demo.

### Appendix I — Pitch evidence to collect during the build

- [ ] ETA MAE: model vs baseline (from `eval:eta`).
- [ ] Exposure minutes: fastest vs safer (from `verify:demo`).
- [ ] Safe Wait outdoor-wait reduction (from `eval:safewait`).
- [ ] Screenshot set (map, compare card, toast, trip page, dashboard headline, evaluation card).
- [ ] 2–3 paraphrased commuter quotes (no personal details) from user research.
- [ ] Short list of what changed after user feedback.
- [ ] Lighthouse scores (PWA, accessibility).

### Appendix J — Additional conflicts and gaps found while planning

These are in addition to the conflict table in §3.

- **J1 — Firestore location vs functions region.** Firestore's location is fixed at database creation. Create the database in `asia-south1` (or the closest multi-region) to match the functions region in Q3; otherwise latency and cost increase.
- **J2 — TTL needs Timestamp fields.** The PRD stores `expiresAt` as epoch milliseconds; Firestore TTL policies require a Timestamp field. Resolved by Decision D3 (add `expiresAtTs`).
- **J3 — CI authentication variable.** PRD §16.4 sketches `GOOGLE_APPLICATION_CREDENTIALS_JSON` as an environment variable; Google tooling expects a *file path* in `GOOGLE_APPLICATION_CREDENTIALS` (or use `google-github-actions/auth`). Plan uses the supported approach (§11.2).
- **J4 — Shared code packaging.** `functions/` is deployed on its own, so `shared/` must be bundled (Decision D4).
- **J5 — Safe Wait formula.** PRD §9.6's expression simplifies to `walkMin + bufferMin ≥ etaLateMin`, which is correct but trigger-late; missing the bus is also a risk. Resolved with the two-stage design (Decision D2).
- **J6 — "7 safety-related reports" undefined.** Resolved with Decision D1 and a seed that makes it true by construction.
- **J7 — Genkit/Firebase API surface.** Package names and helper functions (for example the callable wrapper for flows) change between versions; verify against current docs at build time and pin versions (R13).
- **J8 — `dashboardSummary` live KPIs.** "Delayed buses now" requires reading `sim/live`; the callable should read that document server-side rather than trusting client input.
- **J9 — Anonymous Auth and abuse.** Anonymous UIDs are cheap to create; rate limiting by UID alone is weak. Add per-IP-ish protection through App Check (optional) and corroboration thresholds; document the residual risk.
- **J10 — OSM tile policy.** Public OSM tile servers have usage limits; acceptable for a demo, not for production (R15).
- **J11 — PRD changelog version numbering.** PRD is at v1.0.1; this plan assumes each milestone adds a patch version (v1.0.2 … v1.0.8) and v1.1.0 at MVP complete.

---

*End of build plan. Total scope: 8 milestones, about 290 numbered tasks. Follow PRD §0 for every change: tests → commit → push → deploy.*
