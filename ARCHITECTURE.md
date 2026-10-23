# TransitIQ — System & Software Architecture (`ARCHITECTURE.md`)

| Field                    | Value                                                                               |
| ------------------------ | ----------------------------------------------------------------------------------- |
| **Product Name**         | TransitIQ (incorporating the _RoutePulse_ 40-feature specification)                 |
| **Problem Statement**    | **SI-05+** — Public Transport Route & Timing Tracker with Women-Safety Intelligence |
| **Architecture Pattern** | Serverless Realtime Event-Driven Monorepo (Firebase + Shared Pure TS Engine)        |
| **Version**              | v2.0.0 (Includes M0–M7 + M6b Feature Completion Addendum)                           |
| **Last Updated**         | 2026-10-23                                                                          |

---

## 1. High-Level System Overview

TransitIQ is built on a **Firebase-only, TypeScript-everywhere** architecture. It eliminates traditional WebSocket servers, Redis caches, and separate Python microservices in favor of a deterministic **Shared TypeScript Core Engine (`@transitiq/shared`)** that executes identically in both the browser (for zero-latency reactive UI and offline replay) and **Firebase Cloud Functions (2nd Gen)** (for authoritative backend service endpoints, guardrails, and **Genkit** AI flows).

### 1.1 The Five Application Surfaces

| Surface                       | Path                                                                    | Target User                                       | Auth Model                                      | Primary Responsibility                                                                                                                                             |
| ----------------------------- | ----------------------------------------------------------------------- | ------------------------------------------------- | ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Commuter PWA**              | `/`, `/plan`, `/route/:id`, `/stop/:id`, `/alerts`, `/report`, `/help`  | Women commuters & general passengers              | Firebase Anonymous Auth                         | Live bus tracking, ETA ranges, Fastest vs. Safer route comparison, Safe Wait alerts, anonymous reporting, timetable & fare/crowding view                           |
| **Trusted-Contact Page**      | `/trip/:token`                                                          | Family / friends                                  | Public (capability token)                       | Read-only live trip progress via 128-bit expiring URL token (no login, no app install)                                                                             |
| **Authority Dashboard**       | `/dashboard` (5 tabs: _Stops, Fleet, Incidents, Trends, System Health_) | Transport Corporation officials & human reviewers | Google Sign-In + Custom Claim `role="operator"` | Priority stop ranking (`risk × ridership`), authority-only safety heatmap, live fleet & delay monitoring, harassment review queue, incident resolution, CSV export |
| **Demo Simulator Controller** | `/demo`                                                                 | Hackathon presenter / operator                    | Operator Custom Claim                           | Runs the deterministic Mulberry32 PRNG transit simulation loop (2 s tick) or zero-write client-side replay                                                         |
| **Driver / Bus Panel**        | `/driver`                                                               | Bus driver / operator                             | Operator Custom Claim                           | Publishes per-bus status (`RUNNING`, `STALLED`, `BREAK`, `OUT_OF_SERVICE`) and optional GPS pings to `sim/overrides`                                               |

---

## 2. System Topology & Data Flow Diagram

```text
  ┌─────────────────────────────────┐      ┌─────────────────────────────────┐
  │   /demo (Presenter Controller)  │      │     /driver (Driver Panel)      │
  │  Deterministic Simulator Loop   │      │  Bus Status & GPS Override UI   │
  └───────────────┬─────────────────┘      └────────────────┬────────────────┘
                  │ writes every 2s                         │ writes on action
                  │ (merges overrides)                      ▼
                  │                                ┌─────────────────┐
                  ▼                                │  sim/overrides  │
         ┌─────────────────┐◄───────reads──────────┤  (Operator R/W) │
         │    sim/live     │                       └─────────────────┘
         │ (Single Doc RT) │
         └────────┬────────┘
                  │ Firestore onSnapshot (Realtime Push, ~2s latency)
     ┌────────────┴─────────────────────────────┬────────────────────────────┐
     ▼                                          ▼                            ▼
┌──────────────────────────┐      ┌──────────────────────────┐  ┌─────────────────────────┐
│   Commuter PWA (Mobile)  │      │   Trusted-Contact View   │  │   Authority Dashboard   │
│  • MapView (60fps lerp)  │      │      (/trip/:token)      │  │      (/dashboard)       │
│  • RouteCompareCard      │      │  • Capability-based get  │  │  • Priority Stops Table │
│  • SafeWaitToast         │      │  • Live stop progress    │  │  • Authority Heatmap    │
│  • Step-by-step Report   │      │  • Auto-expires ≤ 2h     │  │  • Fleet & Delay Tab    │
└────────────┬─────────────┘      └─────────────▲────────────┘  │  • Incidents & Review   │
             │                                  │               └────────────▲────────────┘
             │ HTTPS Callables                  │ reads                      │ Callables /
             ▼                                  │                            │ Triggers
┌───────────────────────────────────────────────┴────────────────────────────┴────────────┐
│                        Firebase Cloud Functions (2nd Gen, TypeScript)                   │
│                                                                                         │
│  ┌───────────────────────────────────────────────────────────────────────────────────┐  │
│  │                     Guardrail & Security Layer (shared/guard)                     │  │
│  │  1. Zod Schema Validation    3. Prompt Injection Scanner (EN/HI)                  │  │
│  │  2. PII Regex Redactor       4. Banned-Phrase Filter (No Crime/Victim-Blaming)    │  │
│  └─────────────────────────────────────────┬─────────────────────────────────────────┘  │
│                                            ▼                                            │
│  ┌──────────────────────────────┐  ┌──────────────────────────────┐  ┌───────────────┐  │
│  │   Core Callables & Triggers  │  │   Genkit + Gemini AI Flows   │  │ Shared Engine │  │
│  │  • submitReport              │  │  • triageReport (v1)         │  │ (@transitiq/  │  │
│  │  • onReportCreated (trigger) │  │  • explainRisk (v1)          │  │    shared)    │  │
│  │  • createTripShare / endTrip │  │  • recommendActions (v1)     │  │  • getEta     │  │
│  │  • dashboardSummary          │  │  *Always backed by instant   │  │  • planRoutes │  │
│  │  • createOperatorAlert       │  │   deterministic rule fallback│  │  • detectors  │  │
│  │  • updateIncident            │  └──────────────────────────────┘  └───────────────┘  │
│  │  • exportReport (CSV)        │                                                       │
│  └──────────────────────────────┘                                                       │
└────────────────────────────────────────────┬────────────────────────────────────────────┘
                                             ▼
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                                 Cloud Firestore Database                                │
│  Public Read:   stops, routes, safeSpots, helpPoints, history, sim/live, alerts         │
│  Capability:    trips/{token} (get-only while expiresAt > request.time)                 │
│  Operator Only: sim/overrides, reports, clusters, aggregates, reviewQueue,              │
│                 incidents, routeScores, logs                                            │
│  Internal Only: rateLimits/{sha256_hash}                                                │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```
