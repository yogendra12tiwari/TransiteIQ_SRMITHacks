# TransitIQ — Full Project Specification

> **Hackathon problem statement:** SI-05 — Public Transport Route and Timing Tracker
> **Extended with:** a Women-Safety Layer ("SI-05+")
> **City for prototype:** Lucknow, India
> **Platform:** Mobile-first PWA (rider) + desktop web dashboard (authority) + shareable web link (trusted contact)
> **Data:** 100% simulated for the MVP, clearly labelled as such in the UI

This file is the single source of truth for building the project with Claude Code. Read it fully before writing any code.

---

## Table of Contents

1. [One-Line Pitch](#1-one-line-pitch)
2. [Problem Statement (Detailed)](#2-problem-statement-detailed)
3. [Solution Overview](#3-solution-overview)
4. [Target Users and Personas](#4-target-users-and-personas)
5. [Features](#5-features)
6. [Core Features (MVP Must-Haves)](#6-core-features-mvp-must-haves)
7. [AI / Intelligence Components](#7-ai--intelligence-components)
8. [System Architecture](#8-system-architecture)
9. [Tech Stack](#9-tech-stack)
10. [Data Models](#10-data-models)
11. [Simulator Design](#11-simulator-design)
12. [Algorithms and Formulas](#12-algorithms-and-formulas)
13. [API Contract](#13-api-contract)
14. [UI Screens and UX](#14-ui-screens-and-ux)
15. [Seed Data](#15-seed-data)
16. [Privacy, Ethics, and Safety Rules](#16-privacy-ethics-and-safety-rules)
17. [Folder Structure](#17-folder-structure)
18. [Build Plan and Milestones](#18-build-plan-and-milestones)
19. [Acceptance Criteria](#19-acceptance-criteria)
20. [Demo Script](#20-demo-script)
21. [Risks and Mitigations](#21-risks-and-mitigations)
22. [Production Roadmap](#22-production-roadmap)
23. [Judge Q&A Preparation](#23-judge-qa-preparation)
24. [Instructions for Claude Code](#24-instructions-for-claude-code)

---

## 1. One-Line Pitch

> "Most transport apps tell you when a bus will arrive. TransitIQ tells women when it is safe to wait, which route minimizes unsafe waiting, and alerts authorities when service failures create risk."

**Core insight:** The root problem is **uncertainty, which turns into exposure**. If a commuter knows exactly when the bus arrives, she does not need to stand at an isolated stop. Reliable information is itself a safety intervention.

---

## 2. Problem Statement (Detailed)

### 2.1 Original problem (SI-05)
Public transport users lack accurate, real-time information about bus routes, locations, and timings. This causes long waits, missed connections, and poor trip planning.

### 2.2 The invisible problem
Women commuters face additional, largely invisible risks that are not fully captured in official records because many concerns go unreported:

- Unsafe waiting at poorly lit or isolated stops, especially after dark
- Unreliable, delayed, or skipped buses ("ghost buses")
- Uncertain travel times that force long waits outdoors
- Poorly planned travel windows (late evening, low-frequency periods)
- Harassment concerns that never reach authorities

### 2.3 Three gaps the problem creates

| Layer | Gap | Who feels it |
|---|---|---|
| Information gap | No reliable ETA, skipped or ghost buses | Everyone |
| Exposure gap | Long waits at poorly lit or isolated stops, especially after dark | Disproportionately women |
| Visibility gap | Authorities never see unreported harassment or unsafe stops | Operators and planners |

### 2.4 Merged problem statement
Design an AI-enabled public-transport route and timing tracker that gives commuters accurate live bus location, ETA, route guidance, and service alerts, while specifically reducing women's exposure to unsafe waiting, isolated stops, skipped buses, and uncertain travel times.

### 2.5 Why existing apps fall short
Apps like Google Maps or Chalo optimize for arrival time and shortest travel time. None of them:
- Quantify **waiting risk** at a stop
- Rank routes by **exposure** instead of only speed
- Detect **ghost buses** and communicate how reliable a listed bus really is
- Give authorities a **feedback loop** that turns commuter experience into actionable priorities

---

## 3. Solution Overview

**TransitIQ** is a real-time public-transport intelligence platform.

- **For all commuters:** live bus tracking, ETA with uncertainty, route planning, and delay or skip alerts.
- **For women commuters (the safety layer):** Safe Wait Mode, Safer Route Mode, trusted-contact trip sharing, and anonymous reporting.
- **For authorities:** a dashboard that converts live data and anonymous reports into ranked, actionable priorities.

### 3.1 One data pipeline, three outcomes
A single stream of bus GPS, rider events, and anonymous reports feeds:
1. **Rider experience** (ETA, alerts, route ranking)
2. **Safety layer** (wait-risk scoring, safe waiting spots, trip sharing)
3. **Authority insight** (stop priority, recommended interventions)

### 3.2 Headline metric: Exposure Minutes
**Exposure Minutes** = minutes a commuter spends waiting or walking under higher-risk conditions. Everything (route ranker, dashboard, impact claims) is built around this one metric.

### 3.3 Design principles
1. **Waiting is the hero.** Optimize unsafe waiting time, not just travel time.
2. **Explainable, not magical.** Every score shows its contributing factors.
3. **Not crime prediction.** Output is "waiting risk" and "service reliability" only.
4. **Privacy by design.** No names, no phone numbers, no precise home location.
5. **Humans in the loop.** Reports and alerts support people; they never trigger automated enforcement.
6. **Burden on the system, not on women.** The product pressures operators to fix stops, lighting, and schedules.

---

## 4. Target Users and Personas

### 4.1 Primary: Women commuters
**Priya, 21, college student, Lucknow.** Takes a bus home from Lucknow University around 8:30 PM. Doesn't know whether the bus is coming, hates waiting at an isolated stop, and avoids evening travel when she can.

### 4.2 Secondary: All commuters
Office workers, students, elderly and disabled riders who benefit from accurate ETAs and delay alerts.

### 4.3 Trusted contacts
A parent, sibling, or friend who receives a temporary link to watch a trip. They need no app and no account.

### 4.4 Authorities
Transport corporation planners and operators who need to know where buses are delayed, which stops have long waits, and where repeated safety reports cluster.

---

## 5. Features

### 5.1 Complete feature list

| # | Feature | Description | Audience | Priority |
|---|---|---|---|---|
| 1 | Live bus tracking | Current location, route, direction, next stops on a map | All | Core |
| 2 | ETA with uncertainty | "6-8 min, ~80% confidence" from GPS, traffic, time of day, history | All | Core |
| 3 | Route planner | Routes, transfer points, stops, walking distance, travel time | All | Core |
| 4 | Service alerts | Delays, cancellations, overcrowding, route deviation, likely skipped stops | All | Core |
| 5 | Safe Wait Mode | "Leave now" notification timed to arrival so users wait indoors or in a safer place | Women | Core |
| 6 | Safer Route Mode | Ranks routes by wait, walking exposure, stop activity, reliability, reports | Women | Core |
| 7 | Trusted-contact trip sharing | Temporary link with bus number, live location, ETA | Women | Core |
| 8 | Anonymous feedback | Report long waits, poor lighting, skipped buses, crowding, harassment concerns | All | Core |
| 9 | Authority dashboard | Delays, long-wait stops, repeated safety reports, recommended actions | Authority | Core |
| 10 | Safe waiting spots | Nearby open, staffed places (pharmacy, petrol pump, 24h shop) | Women | Should have |
| 11 | Time-of-day slider | Drag 5 PM to 10 PM and watch risk and waits change (demo feature) | Demo | Should have |
| 12 | Ghost-bus detection | Scheduled trips that don't show in GPS data | All | Should have |
| 13 | Journey check-in | "Are you okay?" prompt on unusual stops or deviations | Women | Nice to have |
| 14 | Discreet SOS | Hidden trigger that shares live location with contact and optionally helpline | Women | Roadmap |
| 15 | Last-mile safety | Suggested lit, main-road walking path from the drop-off stop | Women | Roadmap |
| 16 | Hindi and regional languages | UI and voice alerts | All | Nice to have |
| 17 | SMS / WhatsApp fallback | "BUS 23 STOP 14" returns ETA, for basic phones | All | Roadmap |
| 18 | Group commute matching | Opt-in anonymous "others on this bus" | Women | Roadmap |
| 19 | Accessibility | Voice guidance, large text, elderly and disabled support | All | Roadmap |

### 5.2 Feature details

#### Live bus tracking
- Interactive map (Leaflet) with 3-4 routes drawn as polylines.
- Bus markers move smoothly with heading indicators.
- Tapping a bus shows route, direction, next stops, and ETA to each.

#### ETA with uncertainty
- Shows a range, not a single number: "6-8 min".
- Range widens with distance and stop unreliability.
- The Safe Wait trigger uses the **late end** of the range.

#### Route planner
- Input: origin and destination (picked from a list of Lucknow locations or tapped on the map).
- Output: 2-3 candidate routes with travel time, walking distance, boarding stop, expected wait, transfers.

#### Service alerts
Types: `DELAY`, `STALL`, `LIKELY_SKIP`, `GHOST_BUS`, `ROUTE_DEVIATION`, `OVERCROWDING`.
Each alert has `type, severity, message, affected_stops, created_at`.

#### Safe Wait Mode
- User picks a route and taps **Enable Safe Wait**.
- Before the alert: shows nearby safe waiting spots.
- Alert fires when `now + walk_time + buffer >= late_eta`: "Bus 23 is ~5 min away. Leave now (6 min walk)."

#### Safer Route Mode
- Ranks routes with `cost = alpha * travel_time + (1 - alpha) * exposure_minutes`.
- `alpha` is controlled by a **speed vs safety slider**.
- Automatically weights lighting, stop activity, and wait more heavily after sunset.

#### Trusted-contact trip sharing
- Generates `/trip/<token>`, valid until the trip ends or 2 hours.
- Receiver sees bus number, live marker, next stop, ETA. No login, no app.
- Stores only `token -> trip state` with expiry. No names or phone numbers.

#### Anonymous feedback
- Categories: long wait, poor lighting, skipped bus, overcrowding, harassment concern, other.
- Inputs: stop ID, category, optional free text (Hindi or English). No identity, no precise location.

#### Authority dashboard
- Priority ranking by `risk x ridership`.
- Headline row example: **"Stop A: average evening wait 18 minutes, 7 safety-related reports."**
- Wait-by-hour chart, report clusters, recommended interventions, harassment-tagged reports in a human-review queue.

---

## 6. Core Features (MVP Must-Haves)

The MVP is deliberately narrow. These **eight** are what must work flawlessly in the demo.

| # | Core feature | Demo proof |
|---|---|---|
| C1 | Interactive Lucknow map with 3-4 routes and moving simulated buses | Buses visibly move; ETAs update every second |
| C2 | Live ETA with a range | "6-8 min" updates as buses move |
| C3 | Delayed or skipped-bus alert | A scripted stall on Bus 23 triggers "Likely to skip your stop" |
| C4 | **Fastest vs safer route comparison card** | Side-by-side card plus two colored routes on the map |
| C5 | Safe Wait notification | Phone-frame notification: "Bus 23 is 5 min away; leave now" |
| C6 | Trusted-contact trip sharing | Link opened in a second window shows the live trip |
| C7 | Anonymous report form | Submitting a report updates the dashboard |
| C8 | Authority dashboard | Shows "Stop A: 18-min evening wait, 7 safety reports" plus a recommended action |

### 6.1 Should-haves (if time allows)
Time-of-day slider, safe waiting spots, ghost-bus indicator, speed-vs-safety slider.

### 6.2 Explicitly out of scope for MVP
Real GPS integration, real SOS, SMS/WhatsApp, native apps, group matching, real user accounts, real payments. Place these on the roadmap slide.

---

## 7. AI / Intelligence Components

| AI feature | Input | Output | MVP implementation | Production upgrade |
|---|---|---|---|---|
| ETA prediction | GPS traces, traffic, time of day, historical delays | "6-8 min" with band | Distance / speed x time-of-day factor, error band from history | Gradient boosting or LSTM with quantile outputs |
| Delay / no-show detection | GPS gaps, route deviations, stop arrival records | "Likely delayed or skipped" | Rule-based thresholds plus historical skip rate | Anomaly detection model |
| Wait-risk scoring | Wait duration, stop activity, lighting reports, time of day | Low / Medium / High label with factor breakdown | Transparent weighted formula | Logistic regression calibrated on reports |
| Safer-route ranking | Routes, ETA, walking distance, reports, stop activity | Recommended safer route | Weighted cost function over exposure minutes | Learned preference weights |
| Complaint clustering | Anonymous text reports, stop/route metadata | Themes and hotspots | Keyword tagging plus TF-IDF similarity | Multilingual sentence embeddings |
| Ghost-bus detection | Scheduled vs observed departures | "This 8:30 PM bus ran 6 of 10 days" | Compare schedule to simulated traces | Statistical model on real GPS |

**Honesty rule:** Present the MVP as "transparent rule-based baseline today, ML upgrade path with real data." Report ETA **MAE vs a naive schedule-only baseline** computed on simulated history, and show that single number.

---

## 8. System Architecture

```
Simulator (buses, riders, reports)
        |  WebSocket, 1 tick per second
        v
Backend (FastAPI)
  |- ETA engine
  |- Delay / skip / ghost detector
  |- Wait-risk scorer
  |- Route ranker
  |- Report store + clustering
        |
        v
Rider PWA (map, route card, Safe Wait)
Trusted-contact page (/trip/<token>)
Authority dashboard (/dashboard)
```

### 8.1 Data tiers for real-world deployment (design now, mention in pitch)
1. Official GPS / ITMS feeds
2. Low-cost GPS trackers or a conductor/driver app
3. Crowdsourced rider location

The MVP uses simulation but is designed so the ingestion layer can be swapped for any of these.

---

## 9. Tech Stack

| Layer | Choice | Reason |
|---|---|---|
| Frontend | React + Vite + TypeScript | Fast, familiar |
| Styling | Tailwind CSS | Quick, consistent UI |
| Map | Leaflet + OpenStreetMap tiles | Free, no API key |
| Charts | Recharts | Easy dashboard charts |
| Backend | FastAPI (Python) | Fast to build, WebSocket support |
| Realtime | WebSockets | Live bus positions |
| Storage | In-memory state + SQLite (optional) | No setup |
| Notifications | In-app toast + phone-frame mockup; optional Telegram bot | Reliable demo |
| PWA | Vite PWA plugin (manifest + service worker) | Installable, offline cache |
| Deploy | Vercel (frontend), Render or Railway (backend) | Live link for judges |

**Keep it simple:** no Postgres, no Docker requirement, no auth.

---

## 10. Data Models

### 10.1 Stop
```json
{
  "id": "stop_A",
  "name": "Stop A (Example)",
  "lat": 26.8467,
  "lng": 80.9462,
  "activity": 0.2,
  "lighting": "poor",
  "ridership_per_evening": 400,
  "skip_rate": 0.25,
  "nearby_safe_spots": ["spot_12", "spot_18"]
}
```
- `activity`: 0-1, higher means busier (nearby shops, amenities).
- `lighting`: `good | moderate | poor`.

### 10.2 Route
```json
{
  "id": "route_23",
  "name": "Bus 23",
  "color": "#e11d48",
  "stops": ["stop_1", "stop_2", "stop_A"],
  "polyline": [[26.84, 80.94], [26.85, 80.95]],
  "headway_min": {"peak": 8, "offpeak": 15, "evening": 20}
}
```

### 10.3 Bus
```json
{
  "id": "bus_23_1",
  "route_id": "route_23",
  "distance_along_route_m": 4210,
  "speed_mps": 6.4,
  "status": "RUNNING",
  "last_update": "2026-01-01T20:40:00"
}
```
`status`: `RUNNING | STALLED | DELAYED | GHOST`.

### 10.4 ETA result
```json
{
  "bus_id": "bus_23_1",
  "stop_id": "stop_A",
  "eta_mean_min": 7.0,
  "eta_low_min": 6.0,
  "eta_high_min": 8.0,
  "confidence": 0.8
}
```

### 10.5 Alert
```json
{
  "id": "alert_001",
  "type": "LIKELY_SKIP",
  "severity": "high",
  "message": "Bus 23 is running late and may skip Stop A.",
  "affected_stops": ["stop_A"],
  "created_at": "2026-01-01T20:41:00"
}
```

### 10.6 Wait-risk result
```json
{
  "stop_id": "stop_A",
  "score": 0.78,
  "label": "High",
  "factors": {
    "wait": 0.30,
    "night": 0.20,
    "low_activity": 0.16,
    "reports": 0.14,
    "unreliability": 0.02
  },
  "explanation": "High because: long expected wait (18 min), evening hours, low nearby activity, repeated reports."
}
```

### 10.7 Route option
```json
{
  "id": "opt_fast",
  "label": "Fastest",
  "travel_min": 28,
  "wait_min": 14,
  "walk_min": 6,
  "boarding_stop": "stop_A",
  "exposure_minutes": 16,
  "risk_label": "High",
  "polyline": []
}
```

### 10.8 Report (anonymous)
```json
{
  "id": "rep_001",
  "stop_id": "stop_A",
  "category": "poor_lighting",
  "text": "Stop par raat mein andhera rehta hai",
  "created_at": "2026-01-01T20:10:00",
  "cluster_id": "cl_3",
  "severity": "medium"
}
```
Categories: `long_wait | poor_lighting | skipped_bus | overcrowding | harassment_concern | other`.
**No user ID, no device ID, no precise location.**

### 10.9 Trip share
```json
{
  "token": "k3j9x2...",
  "bus_id": "bus_23_1",
  "route_id": "route_23",
  "expires_at": "2026-01-01T22:40:00",
  "active": true
}
```

---

## 11. Simulator Design

The simulator is the heart of the demo. **Build it first.**

### 11.1 Routes
Define 3-4 routes through real Lucknow areas, for example:
- **Route 23:** Charbagh to Hazratganj to Gomti Nagar
- **Route 12:** Alambagh to Aminabad to Lucknow University
- **Route 7:** Chowk to Hazratganj to Indira Nagar
- **Route 41:** Charbagh to Aminabad to Gomti Nagar (alternative)

Verify all coordinates visually on the map. Mark **Stop A** as a deliberately isolated, poorly lit stop with long evening waits.

### 11.2 Bus movement
- Each bus tracks `distance_along_route_m`.
- Each tick advances by `speed x dt`.
- Position is interpolated along the route polyline.
- `speed = base_speed x traffic_factor[hour] x noise`.

### 11.3 Time-of-day behavior

| Period | Hours | Traffic factor | Headway |
|---|---|---|---|
| Morning peak | 8-10 | 0.6 | 8 min |
| Midday | 11-16 | 0.9 | 15 min |
| Evening peak | 17-19 | 0.6 | 10 min |
| Late evening | 20-22 | 1.0 | 20+ min (fewer buses) |

### 11.4 Scripted incidents (do not rely on randomness during the pitch)
- **t = 2:00 into the demo:** Bus 23 stalls for ~6 minutes, triggering `STALL` then `LIKELY_SKIP` for Stop A.
- **t = 3:00:** One scheduled 8:30 PM bus on Route 12 is a `GHOST` (never appears).
- A **replay mode** can run this scripted timeline from a saved file for demo reliability.

### 11.5 Time slider
Judges can set the simulated time between 5 PM and 10 PM. The simulator re-initializes with that hour's traffic factor and headway, and risk scores and waits update accordingly.

### 11.6 Simulated history
Generate 30 days of per-stop, per-hour wait times, delays, and skip events. Use it for:
- ETA error bands
- Skip rates
- The MAE vs baseline calculation
- Dashboard wait-by-hour charts

---

## 12. Algorithms and Formulas

### 12.1 ETA with uncertainty
```python
def eta(bus, stop, hour):
    dist = route_distance(bus.position, stop)          # metres along the route
    speed = bus.recent_avg_speed * traffic_factor[hour]
    mean = dist / speed / 60                            # minutes
    sigma = mean * 0.15 + historical_error[stop.id]
    low, high = mean - 1.28 * sigma, mean + 1.28 * sigma   # ~80% band
    return mean, max(low, 0), high
```

### 12.2 Wait-risk score (transparent)
```python
def wait_risk(stop, hour, expected_wait_min):
    night    = 1.0 if (hour >= 19 or hour < 6) else 0.2
    wait     = min(expected_wait_min / 20, 1.0)       # 20+ min = max
    activity = 1.0 - stop.activity                    # low activity -> higher risk
    reports  = min(stop.recent_reports / 10, 1.0)
    unreliab = stop.skip_rate

    factors = {
        "wait":          0.30 * wait,
        "night":         0.20 * night,
        "low_activity":  0.20 * activity,
        "reports":       0.20 * reports,
        "unreliability": 0.10 * unreliab,
    }
    score = sum(factors.values())
    label = "Low" if score < 0.35 else ("High" if score > 0.65 else "Medium")
    return score, label, factors
```
**Always return the factor breakdown** and show it in the UI.

### 12.3 Exposure minutes
```python
exposure = wait_min * wait_risk_weight(boarding_stop) + walk_min * walk_risk_weight(path)
```
Use weights between 0.2 (low risk) and 1.0 (high risk).

### 12.4 Route ranking
```python
cost = alpha * travel_min + (1 - alpha) * exposure_minutes
# alpha in [0, 1] from the speed-vs-safety slider; default 0.5
# after sunset, increase exposure weights for lighting and low activity
```
Generate 2-3 candidates by varying boarding stops (for example a busier stop 400 m away or a transfer point). Return them sorted by cost, and label the lowest travel-time option "Fastest" and the lowest-cost option "Safer".

### 12.5 Delay, stall, skip, ghost detection
- **Delay:** actual position lags schedule-implied position by more than N minutes.
- **Stall:** speed near zero for more than 3 minutes while away from a stop.
- **Likely skip:** bus is running behind and the historical skip rate at that stop and hour exceeds a threshold, or the bus passes the stop's expected window.
- **Ghost bus:** scheduled departure with no GPS trace within 10 minutes.

### 12.6 Safe Wait trigger
```python
if now + walk_time_to_stop + buffer_min >= late_eta:
    send("Bus {n} is ~{m} min away. Leave now ({w} min walk).")
```
`buffer_min` is about 2 minutes.

### 12.7 Complaint clustering
1. Keyword-tag text (Hindi and English) into categories.
2. Compute TF-IDF vectors and group similar reports by stop and category.
3. Apply a **corroboration rule:** a stop's report weight rises only when several independent reports arrive.
4. Route `harassment_concern` reports to a **human-review queue**. Never auto-action.

### 12.8 Authority priority
```python
priority = risk_score * ridership_per_evening
```
Rule-based recommended actions:
- avg evening wait > 15 min: "Add a departure around the peak gap (for example 7:45 PM)."
- lighting reports >= 3: "Improve lighting at this stop."
- skip_rate > 0.2: "Investigate skipped services on this route."
- harassment-tagged reports present: "Escalate to human review and consider staffed presence."

### 12.9 Evaluation (show on a slide)
- ETA **MAE (minutes)** of the model vs a naive schedule-only baseline on simulated history.
- **Average exposure minutes** per trip: fastest vs safer route.
- Number of simulated trips where Safe Wait reduced outdoor waiting.

---

## 13. API Contract

Base URL: `/api`. All data is simulated. JSON everywhere.

### REST

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/routes` | All routes with stops and polylines |
| GET | `/api/stops` | All stops with attributes |
| GET | `/api/buses` | Current bus positions and statuses |
| GET | `/api/eta?stop_id=&route_id=` | ETA results for a stop |
| GET | `/api/alerts` | Active service alerts |
| GET | `/api/risk/{stop_id}?hour=` | Wait-risk result with factor breakdown |
| POST | `/api/plan` | Body: `{origin, destination, alpha, hour}`, returns route options |
| POST | `/api/safewait` | Body: `{route_id, stop_id, walk_min}`, enables Safe Wait |
| POST | `/api/trip/share` | Creates a share token for a trip |
| GET | `/api/trip/{token}` | Returns live trip state (404 if expired) |
| POST | `/api/trip/{token}/end` | Ends and invalidates a trip |
| POST | `/api/reports` | Submits an anonymous report |
| GET | `/api/reports?stop_id=` | Lists reports (dashboard only) |
| GET | `/api/dashboard/summary` | Ranked stops, headline stats, recommendations |
| GET | `/api/dashboard/stop/{stop_id}` | Wait-by-hour data, report clusters |
| POST | `/api/sim/time` | Body: `{hour}`, sets simulated hour (time slider) |
| POST | `/api/sim/replay` | Starts the scripted demo timeline |

### WebSocket

`/ws/live` pushes one message per tick:
```json
{
  "t": "2026-01-01T20:40:05",
  "buses": [{"id": "bus_23_1", "lat": 26.85, "lng": 80.94, "status": "RUNNING"}],
  "etas": [{"bus_id": "bus_23_1", "stop_id": "stop_A", "low": 6, "high": 8}],
  "alerts": [],
  "safewait": [{"message": "Bus 23 is ~5 min away. Leave now (6 min walk)."}]
}
```

---

## 14. UI Screens and UX

### 14.1 Rider PWA (mobile-first, max width ~420px, shown in a phone frame on desktop)

1. **Home / Map**
   - Full-screen Leaflet map with routes and moving buses.
   - Bottom sheet: origin, destination, "Find routes" button.
   - Top badge: "Simulated data".
2. **Route options**
   - Fastest vs Safer comparison card (the visual centerpiece).
   - Speed-vs-safety slider.
   - Both routes drawn in different colors; risky stop highlighted.
3. **Route detail**
   - Boarding stop, ETA range, walk time, risk label with **"Why?" factor breakdown**.
   - Safe waiting spots nearby.
   - Buttons: **Enable Safe Wait**, **Share trip**.
4. **Safe Wait notification**
   - Phone-frame push-style toast: "Bus 23 is ~5 min away. Leave now (6 min walk)."
5. **Alerts feed**
   - Delay, stall, likely skip, ghost bus cards with severity colors.
6. **Report form**
   - Category chips, stop selector, optional text. Reassuring anonymity message. Success state.
7. **Time slider** (demo control)
   - 5 PM to 10 PM; updates waits, risk, headways.

### 14.2 Trusted-contact page (`/trip/:token`)
- Minimal, read-only, mobile-friendly.
- Shows bus number, live marker on a small map, next stop, ETA, and "Trip ends automatically" note.
- Expired link shows a friendly message.

### 14.3 Authority dashboard (`/dashboard`, desktop)
- **KPI row:** avg evening wait, delayed buses now, total safety reports, ghost-bus rate.
- **Priority table:** stops ranked by `risk x ridership`; headline row for Stop A with "18-min average evening wait, 7 safety-related reports", risk badge, recommended action.
- **Map heatmap** of stop priority.
- **Wait-by-hour chart** for the selected stop.
- **Report clusters panel:** themes (lighting, skipped bus, crowding, harassment), with harassment items in a **human-review queue**.
- **Recommended actions** list.

### 14.4 UX rules
- Hindi/English toggle for key strings (at least the Safe Wait message and report form).
- Colors: Low = green, Medium = amber, High = red, always paired with text labels (accessibility).
- Language must never blame victims. Use "waiting risk" and "service reliability".
- Use clear "Simulated data" labelling everywhere.

---

## 15. Seed Data

Keep in `data/` as JSON files.

| File | Contents |
|---|---|
| `routes.json` | 3-4 routes: stops, coordinates, polylines, headways |
| `stops.json` | Stop attributes: activity, lighting, ridership, skip rate. Include **Stop A** (activity 0.2, poor lighting, high evening wait) and at least one busy, safer alternative stop nearby |
| `safe_spots.json` | Pharmacies, petrol pumps, 24-hour shops near stops (seed from OpenStreetMap or invent plausibly) |
| `history.json` | 30 days of simulated wait times, delays, and skips per stop and hour |
| `reports.json` | 30-50 synthetic reports in Hindi and English; **Stop A has exactly 7 safety-related reports** |
| `incidents.json` | Scripted demo timeline (stall, skip, ghost bus) |

### Required demo numbers
- **Stop A:** average evening wait **18 minutes**, **7** safety-related reports, risk label **High**.
- **Fastest route:** 28 min travel, 14 min wait at Stop A, exposure 16, High.
- **Safer route:** 32 min travel, 4 min wait at a busier stop, exposure 3, Low.
- Takeaway line: **"4 extra minutes saves 10 minutes of unsafe waiting."**

All values must be reproducible from the formulas (tune stop attributes and weights to hit these numbers, and keep the data labelled as simulated).

---

## 16. Privacy, Ethics, and Safety Rules

These are **hard requirements**, not suggestions.

1. **No PII:** never store names, phone numbers, or precise home locations.
2. **Approximate locations:** reports reference stop IDs only; analytics use grid-rounded coordinates.
3. **Rotating anonymous IDs** for any session-level data.
4. **Expiring share links:** trip tokens expire when the trip ends or after 2 hours; receivers need no account.
5. **Explainable scores:** always show contributing factors. Never present safety scores as crime predictions.
6. **No victim-blaming language.** Focus on improving stops, routes, lighting, and service reliability.
7. **Anti-stigma guardrail:** do not publicly brand neighbourhoods "unsafe". Show scores contextually, with a focus on fixes.
8. **Human in the loop:** alerts and reports support users and authorities; they never trigger automated enforcement. Harassment-tagged reports go to a human-review queue.
9. **Abuse resistance:** rate-limit report submission, apply corroboration thresholds.
10. **Language support:** Hindi and regional languages for wider adoption.
11. **Honest labelling:** every screen shows that MVP data is simulated.

---

## 17. Folder Structure

```
transitiq/
|- TRANSITIQ_SPEC.md          # this file
|- README.md
|- data/
|  |- routes.json
|  |- stops.json
|  |- safe_spots.json
|  |- history.json
|  |- reports.json
|  `- incidents.json
|- backend/
|  |- main.py                   # FastAPI app, routes, websocket
|  |- sim/
|  |  |- simulator.py           # bus movement, time-of-day, incidents
|  |  `- history_gen.py         # 30-day simulated history
|  |- engine/
|  |  |- eta.py
|  |  |- detect.py              # delay, stall, skip, ghost
|  |  |- risk.py                # wait-risk scorer
|  |  |- ranker.py              # route ranking, exposure minutes
|  |  |- safewait.py
|  |  `- clustering.py          # keyword tagging, TF-IDF
|  |- store.py                  # in-memory state, trip tokens, reports
|  |- eval.py                   # ETA MAE vs baseline
|  `- requirements.txt
`- frontend/
   |- index.html
   |- vite.config.ts
   |- public/manifest.webmanifest
   `- src/
      |- main.tsx
      |- App.tsx
      |- api/                  # REST + WebSocket client
      |- components/
      |  |- MapView.tsx
      |  |- RouteCompareCard.tsx
      |  |- RiskBadge.tsx      # with "Why?" breakdown
      |  |- SafeWaitToast.tsx
      |  |- AlertFeed.tsx
      |  |- ReportForm.tsx
      |  |- TimeSlider.tsx
      |  `- PhoneFrame.tsx
      |- pages/
      |  |- Rider.tsx
      |  |- TripShare.tsx      # /trip/:token
      |  `- Dashboard.tsx      # /dashboard
      `- i18n/                 # en.json, hi.json
```

---

## 18. Build Plan and Milestones

Build in this order. Each milestone must run end to end before moving on.

### Milestone 1: Foundation
- Repo scaffold, FastAPI + Vite apps running, CORS configured.
- Seed JSON files created and loaded.
- **Done when:** `/api/routes` and `/api/stops` return data and the frontend shows an empty map.

### Milestone 2: Simulator and live map
- Bus movement along polylines, time-of-day factors, WebSocket feed.
- Map shows routes and moving buses.
- **Done when:** buses visibly move smoothly and update every second.

### Milestone 3: ETA, alerts, risk
- ETA engine with ranges, delay/stall/skip/ghost detection, wait-risk scorer with factors.
- Scripted incidents and replay mode.
- **Done when:** Bus 23's stall produces a `LIKELY_SKIP` alert for Stop A and the ETA range updates live.

### Milestone 4: Route comparison (centerpiece)
- Route planner and ranker with exposure minutes and an alpha slider.
- `RouteCompareCard` plus two colored routes on the map.
- **Done when:** the Fastest vs Safer card shows the required demo numbers.

### Milestone 5: Safe Wait and trip sharing
- Safe Wait trigger and phone-frame toast.
- Trip tokens, `/trip/:token` page, expiry.
- **Done when:** a second browser window shows the live trip and the toast fires at the right time.

### Milestone 6: Reports and dashboard
- Report form, storage, keyword tagging, clustering, human-review queue.
- Dashboard with KPIs, priority table, heatmap, wait-by-hour chart, recommendations.
- **Done when:** the Stop A headline row appears and a newly submitted report updates the dashboard.

### Milestone 7: Polish
- Time slider, safe waiting spots, Hindi strings, "Simulated data" labels, PWA manifest.
- ETA MAE evaluation script and result.
- Replay mode, backup demo video.
- **Done when:** the full demo script runs without errors three times in a row.

### Scope freeze
No new features after Milestone 6. Only bug fixes and polish.

---

## 19. Acceptance Criteria

- [ ] Map shows 3-4 Lucknow routes and moving buses
- [ ] ETA shows a range and updates live
- [ ] Scripted stall triggers a delay or skip alert
- [ ] Route comparison card shows Fastest (28 min, 14 min wait, exposure 16, High) vs Safer (32 min, 4 min wait, exposure 3, Low)
- [ ] Both routes are drawn on the map in different colors
- [ ] Wait-risk labels show a "Why?" factor breakdown
- [ ] Safe Wait notification fires at the correct moment and displays in a phone frame
- [ ] Trip share link works in a second window and expires correctly
- [ ] Report submission updates the dashboard
- [ ] Dashboard shows "Stop A: average evening wait 18 minutes, 7 safety-related reports" and a recommended action
- [ ] Harassment-tagged reports appear in a human-review queue only
- [ ] Time slider changes waits and risk
- [ ] "Simulated data" label visible on all screens
- [ ] No PII stored anywhere (verify the data models)
- [ ] ETA MAE vs baseline computed and displayed
- [ ] App is responsive and installable as a PWA

---

## 20. Demo Script

Total: about 3 minutes. Tell a story, not a feature list.

1. **Hook (20 s):** "It's 8:40 PM at Stop A in Lucknow. Priya has no idea whether her bus is coming."
2. **Live map (20 s):** 3-4 buses move, ETAs show ranges like "6-8 min".
3. **Delay alert (20 s):** Bus 23 stalls; the app warns "Likely to skip your stop."
4. **Route comparison (30 s):** Fastest 28 min with a 14-minute wait at an isolated stop (High) vs Safer 32 min with a 4-minute wait at a busy stop (Low). "Four extra minutes saved ten minutes of unsafe waiting."
5. **Why? (10 s):** Open the factor breakdown to show the score is explainable.
6. **Safe Wait (20 s):** Phone-frame notification: "Bus 23 is ~5 min away. Leave now."
7. **Trusted contact (20 s):** Open the share link on a second screen and show the live trip.
8. **Time slider (10 s):** Drag from 5 PM to 10 PM and watch risk and waits change.
9. **Authority dashboard (30 s):** "Stop A: average evening wait 18 minutes, 7 safety-related reports." Show the recommended action.
10. **Close (10 s):** the one-line pitch, plus "data is simulated; here is our pilot plan."

**Backups:** replay mode and a recorded video of the full run.

---

## 21. Risks and Mitigations

| Risk | Mitigation |
|---|---|
| Map and simulator bugs consume the schedule | Build simulator and map first; freeze scope after Milestone 6 |
| Live demo fails | Replay mode plus recorded video |
| Overclaiming AI | State "rule-based baseline today, ML upgrade path"; show MAE vs baseline |
| Safety score seen as biased or crime prediction | Explainable factors, "waiting risk" wording, anti-stigma guardrail |
| Cold-start (no reports early) | Seed with objective proxies: wait variance, time of day, stop activity from OSM |
| Fake or abusive reports | Rate limits, corroboration thresholds, human review |
| No real GPS in many cities | Tiered data sourcing and crowdsourcing story |
| Browser limits on background notifications | Demo with in-app toast or Telegram; native Android app is the production path |
| Scope creep | Roadmap slide for check-in, SOS, group matching |

---

## 22. Production Roadmap

| Phase | Scope |
|---|---|
| Hackathon MVP | Mobile-first PWA, authority web dashboard, simulated fleet |
| Pilot (one corridor, one month) | PWA, SMS/WhatsApp bot, GTFS and GTFS-Realtime ingestion, low-cost GPS trackers or conductor app |
| Scale | Native Android app with reliable background push, Hindi and regional voice alerts, gradient-boosted ETA on real traces, journey check-in, SOS, last-mile safety |

**Pilot success metrics:** reduction in average waiting time, ETA error (MAE), exposure minutes per trip, report-to-action time, share of trips using trusted-contact sharing.

**Business model:** free for riders. Funded by city transport authorities (B2G), smart-city programs, and CSR or women-safety grants. Partnerships with the city transport corporation, local NGOs for report validation, and women's helplines.

**Expected impact:**
- Reduced waiting time and uncertainty
- Lower exposure of women to unsafe waiting and poorly planned travel windows
- Better identification of delayed, skipped, or unreliable services
- Actionable insights for authorities on routes, schedules, lighting, and stop safety
- A scalable model for other Indian and rapidly urbanizing cities

---

## 23. Judge Q&A Preparation

- **How is this different from Google Maps or Chalo?** They give arrival times. We give waiting risk, exposure-based safer routing, ghost-bus reliability, and an authority feedback loop.
- **Can the safety score be wrong or biased?** Yes, which is why it is transparent, uses reliability and exposure rather than crime prediction, shows its factors, and keeps humans in the loop.
- **What if buses have no GPS?** Tiered sourcing (official feeds, low-cost trackers or a conductor app, crowdsourcing).
- **What about the cold-start problem?** Seed with objective proxies from OpenStreetMap and wait data, then add reports as they arrive.
- **Why would authorities act?** The dashboard ranks stops by risk x ridership and suggests concrete, costed fixes.
- **What about basic-phone users?** SMS/WhatsApp and Hindi voice alerts are the pilot-phase fallback.
- **Privacy?** No PII, grid-rounded locations, expiring links.
- **Is the AI real?** The MVP is a transparent rule-based baseline with a measured MAE against a naive baseline, and we have a clear upgrade path once real data exists.

---

## 24. Instructions for Anti-gravity 

**Goal:** Implement the MVP described above as a working, demo-ready web project.

**Working rules**
1. Read this entire file first. Follow the milestones in Section 18 in order.
2. Keep it simple: in-memory state, no auth, no Postgres, no Docker requirement.
3. Use the exact tech stack in Section 9 unless something blocks you; explain any deviation.
4. Treat the seed data in Section 15 as authoritative. Tune stop attributes and weights so the formulas **reproduce the required demo numbers** (Stop A: 18-min evening wait, 7 reports, High risk; Fastest vs Safer card values).
5. Every score and risk label must return and display its **factor breakdown**.
6. Enforce all rules in Section 16. Never store PII. Never call the score "crime risk".
7. Label all data as simulated in the UI.
8. After each milestone, run the app, verify the milestone's "Done when" condition, and summarize what works before continuing.
9. Write the ETA MAE vs naive baseline script (`backend/eval.py`) and print the result.
10. Provide a `README.md` with setup and run commands for backend and frontend, plus how to start replay mode.
11. Prefer small, readable modules matching the folder structure in Section 17. Add brief comments to formulas.
12. Do not add features outside Section 6 before the scope freeze. Roadmap items are documentation only.



**Definition of done:** all items in Section 19 are checked and the demo script in Section 20 runs cleanly three times in a row.