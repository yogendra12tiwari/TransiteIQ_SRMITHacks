# TransitIQ — UI Build Plan

> **Scope:** UI/UX only (design system, screens, components, states, copy, accessibility, UI tests). Backend, engine, and data work stay in `build_plan.md`.
> **Sources:** `UI_UX_INSTRUCTIONS.md` (design rules), `TRANSITIQ_PRD.md` (features, guardrails), `build_plan.md` §5.7 (screen table and copy guide).
> **Principle:** **One screen. One purpose. One clear next action.**
> **Rule:** every UI change follows PRD §0 — tests → commit → push → deploy (`firebase deploy --only hosting`).
> **Data note:** all data is simulated; every screen shows a small "Simulated data" badge.

| Field           | Value                                                                                   |
| --------------- | --------------------------------------------------------------------------------------- |
| Product         | TransitIQ                                                                               |
| Frontend        | React + TypeScript + Vite, Tailwind CSS, react-leaflet, Recharts, i18next, lucide-react |
| Primary device  | Mobile (360–430 px wide); tablet and desktop are adaptations                            |
| Languages       | English and Hindi (toggle on every screen)                                              |
| UI plan version | v1.0.0                                                                                  |
| Last updated    | 2026-10-23                                                                              |

---

## Table of Contents

1. [Design goals and who we design for](#1-design-goals-and-who-we-design-for)
2. [Design system](#2-design-system)
3. [App map and navigation](#3-app-map-and-navigation)
4. [Rider screens (wireframes and specs)](#4-rider-screens)
5. [Trusted-contact page](#5-trusted-contact-page)
6. [Authority dashboard screens](#6-authority-dashboard-screens)
7. [Demo controller](#7-demo-controller)
8. [Component library](#8-component-library)
9. [States: loading, empty, error, offline](#9-states)
10. [Copy and language (English / Hindi)](#10-copy-and-language)
11. [Accessibility](#11-accessibility)
12. [Motion and feedback](#12-motion-and-feedback)
13. [UI milestones and task checklist (U0–U6)](#13-ui-milestones-and-tasks)
14. [UI testing plan](#14-ui-testing-plan)
15. [UI review checklist](#15-ui-review-checklist)
16. [Performance budget](#16-performance-budget)
17. [Definition of done (UI)](#17-definition-of-done-ui)
18. [Risks and decisions](#18-risks-and-decisions)

---

## 1. Design goals and who we design for

### 1.1 Goals

1. A first-time user understands the app in **5 seconds** and knows the next action.
2. Finding a bus takes **three taps**: open → choose where → choose route.
3. Waiting at a stop never needs the user to read a map or a number they do not understand.
4. Nothing on a rider screen needs training, a tutorial, or technical words.
5. The trusted contact understands their screen with **zero** instructions.
6. The authority user sees **which stop needs attention first** within 3 seconds of opening the dashboard.

### 1.2 Users

| User                              | Context                                                                                           | What they need from the UI                                                     |
| --------------------------------- | ------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| **Priya (primary)**               | 8:40 PM, standing or about to leave, one hand holding the phone, low battery, maybe a weak signal | Big, calm screen. "When do I leave?" in one line. One tap to turn on the alert |
| First-time smartphone user        | Limited reading comfort, prefers Hindi                                                            | Short words, big buttons, no icons-only controls, Hindi everywhere             |
| Trusted contact (parent, sibling) | Opens a link from a message, no app                                                               | One line: where the bus is and when it arrives                                 |
| Authority staff                   | Desktop, calm office setting                                                                      | A ranked list and one clear recommended action per stop                        |

### 1.3 Things we deliberately do **not** do

- No onboarding carousel, tutorial, or tour.
- No sign-up for riders. No account screens.
- No modals or blocking popups.
- No dense dashboards with many competing panels on one screen.
- No jargon ("exposure minutes", "wait-risk score", "ETA", "corroboration", "cluster") on rider screens.
- No decorative gradients, parallax, or heavy animation.
- No permission requests until the moment they are needed.
- No language that blames or scares riders; we describe stops and service, not people.

---

## 2. Design system

### 2.1 Design tokens (Tailwind theme extension)

**Colour** (verify every pair with a contrast checker in U0; target WCAG AA, 4.5:1 for text)

| Token            | Value     | Use                                   |
| ---------------- | --------- | ------------------------------------- |
| `--bg`           | `#FFFFFF` | Page background                       |
| `--surface`      | `#F5F7FA` | Cards, sheets                         |
| `--border`       | `#D8DEE6` | Subtle outlines                       |
| `--text`         | `#111827` | Main text                             |
| `--text-muted`   | `#4B5563` | Secondary text (never lighter)        |
| `--primary`      | `#0F5BD8` | Primary button, links, selected state |
| `--primary-text` | `#FFFFFF` | Text on primary                       |
| `--low`          | `#1B7F3B` | Low waiting risk (with label)         |
| `--medium`       | `#B45309` | Medium waiting risk (with label)      |
| `--high`         | `#B91C1C` | High waiting risk (with label)        |
| `--info-bg`      | `#EAF1FE` | Info banners                          |
| `--warn-bg`      | `#FFF4E0` | Warning banners                       |
| `--danger-bg`    | `#FDECEC` | Error banners                         |
| `--focus`        | `#111827` | 3 px focus ring                       |

Rules: one accent colour only (primary blue). Risk colours are used **only** on risk badges, route lines, and stop rings, and **always** paired with words and an icon shape (check / minus / alert) so they never rely on colour alone. Dark mode is out of scope for the MVP.

**Typography**

- Font: system UI stack (`system-ui, -apple-system, "Segoe UI", Roboto`) plus **Noto Sans Devanagari** for Hindi (loaded only when Hindi is selected).
- Scale: Heading 1 = 24/32 semibold; Heading 2 = 20/28 semibold; Body = 16/24 regular (never smaller); Caption = 14/20 (only for secondary info); Big number (ETA) = 32/36 bold.
- Max line length 60 characters; sentence case everywhere; no all-caps.

**Spacing and shape**

- 4 px grid. Page padding 16 px. Gap between stacked cards 12 px. Section gap 24 px.
- Radius: cards and buttons 12 px; chips 999 px.
- Shadow: one soft shadow for bottom sheets only; cards use a 1 px border.
- Tap targets ≥ **48 × 48 px**; space between adjacent targets ≥ 8 px.
- Safe-area insets respected (bottom bar and sticky button).

**Iconography (lucide-react, max 12 icons)**
`Search`, `MapPin`, `Bus`, `Clock`, `Bell`, `Share2`, `AlertTriangle`, `CheckCircle`, `ChevronLeft`, `ChevronDown`, `Globe`, `Info`.
Icons always sit next to a text label, except the back arrow and language toggle, which have accessible names.

### 2.2 Layout rules

| Breakpoint           | Behaviour                                                                                                                 |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| < 480 px (phone)     | Full-width single column; sticky bottom primary button; bottom tab bar                                                    |
| 480–1023 px (tablet) | Same layout centred, max width 480 px                                                                                     |
| ≥ 1024 px (desktop)  | Rider app shown inside a **phone frame** (390 × 780) centred; dashboard uses full width with a left list and right detail |

### 2.3 Map style rules

- OpenStreetMap tiles, attribution visible but small.
- Route lines 5 px, route colours from data; selected route 7 px; other routes 40% opacity.
- Bus marker: 32 px circle with route number, direction notch; tap area 48 px.
- Stop marker: 20 px circle; risky stop gets a ring and the word "Quiet stop" when selected (colour + text).
- No marker clustering; max visible labels = selected stop and selected bus only.
- Map never takes over the whole screen when a task is in progress: it sits behind a bottom sheet (min 35% visible).

### 2.4 Content design rules

- Write at roughly a 6th-grade reading level.
- Lead with the answer: "Arriving in 6–8 min", not "Estimated time of arrival is…".
- One idea per line. Maximum two lines in a card title.
- Buttons are verbs: "Continue", "Choose this route", "Tell me when to leave", "Share my trip", "Submit", "Done".
- Errors say what happened and what to do: "No internet. We'll show the last bus positions. Check your connection and try again."
- Never show internal codes, IDs, or stack traces.

---

## 3. App map and navigation

```
RIDER (mobile, no login)
 ├─ Home (map + "Where are you going?")        ← bottom tab 1
 │    └─ Plan flow (3 steps) → Route detail → Safe Wait on → Share sheet
 ├─ Alerts                                      ← bottom tab 2
 └─ Report (3 steps)                            ← bottom tab 3

TRUSTED CONTACT (link, no login)
 └─ Trip view (read-only)

AUTHORITY (desktop, sign-in)
 ├─ Stops (priority list → stop detail)         ← tab 1 (default)
 ├─ Reports to review                           ← tab 2
 ├─ Trends                                      ← tab 3
 └─ System                                      ← tab 4

PRESENTER (operator)
 └─ Demo controller
```

Navigation rules: rider has **three** bottom tabs only; every flow has a back arrow at top-left that never loses typed or chosen data; the language toggle is the only other persistent control; no hamburger menu.

---

## 4. Rider screens

Wireframes are low-fidelity (ASCII). `[ ]` = button, `( )` = option, `▓` = map.

### 4.1 R1 — Home

**Purpose:** find a bus. **Primary action:** "Where are you going?".

```
┌──────────────────────────────┐
│ ◌ Simulated data      हिंदी  │  ← badge (left), language (right)
│▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓│
│▓▓▓▓▓▓▓ 🚌23 ▓▓▓▓▓▓▓▓ 🚌7 ▓▓▓▓│
│▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓│
│┌────────────────────────────┐│
││ 🔍 Where are you going?    ││  ← big search field (primary)
││ Recent: Lucknow University ││
│└────────────────────────────┘│
│  Home      Alerts     Report │  ← bottom tabs
└──────────────────────────────┘
```

Details: tapping the field opens Plan step 1 inline (no new modal). Map shows buses moving; tapping a bus or stop opens a small bottom sheet with next arrivals. If an alert affects a followed stop, a single banner appears above the search: "Bus 23 may not stop at Stop A — see options".

### 4.2 R2 — Plan, step 1: Where from?

```
┌──────────────────────────────┐
│ ←                    Step 1/3│
│ Where are you starting?      │
│ ┌──────────────────────────┐ │
│ │ 🔍 Type a place          │ │
│ └──────────────────────────┘ │
│  (•) Lucknow University      │
│  ( ) Charbagh                │
│  ( ) Hazratganj              │
│  ( ) Alambagh                │
│                              │
│ ┌──────────────────────────┐ │
│ │        Continue          │ │  ← only primary button
│ └──────────────────────────┘ │
└──────────────────────────────┘
```

Rules: list shows 6 popular places plus search results; "Use my location" is a small text link (asks permission only when tapped); selecting an option enables **Continue**; progress "Step 1 of 3" is plain text, not a fancy bar.

### 4.3 R3 — Plan, step 2: Where to?

Same layout as R2. Title "Where do you want to go?". Selected "from" is shown as a small line at the top ("From: Lucknow University — Change") so the user never loses context.

### 4.4 R4 — Plan, step 3: Choose a route (the centrepiece)

**Purpose:** pick Fastest or Safer. **Primary action:** "Continue" (a recommended card is pre-selected).

```
┌──────────────────────────────┐
│ ←                    Step 3/3│
│ Choose how to travel         │
│ 4 minutes longer, but 10     │
│ minutes less waiting at a    │
│ quiet stop.                  │
│ ┌──────────────────────────┐ │
│ │(•) Recommended           │ │
│ │ 32 min total             │ │
│ │ Wait 4 min · busy, lit   │ │
│ │ ✔ Low waiting risk       │ │
│ └──────────────────────────┘ │
│ ┌──────────────────────────┐ │
│ │( ) Fastest               │ │
│ │ 28 min total             │ │
│ │ Wait 14 min · quiet stop │ │
│ │ ⚠ High waiting risk      │ │
│ └──────────────────────────┘ │
│  ▾ More details              │  ← collapsed: why, walking, slider
│ ┌──────────────────────────┐ │
│ │        Continue          │ │
│ └──────────────────────────┘ │
└──────────────────────────────┘
```

Details:

- Cards are radio options (whole card tappable, 96 px tall minimum). The recommended one is pre-selected.
- The map is behind a collapsed sheet; tapping "Show on map" (text link) lifts the map with both routes drawn.
- **More details** (collapsed by default) holds: "Why this rating?" (plain factor list), walking minutes, the speed-vs-safety slider labelled "Faster ↔ Less waiting alone", and transfer info.
- If Fastest is also the safest, show a single card with "Fastest and lowest waiting risk" and no takeaway line.
- Takeaway line is generated from real numbers and hidden if they do not support it.

### 4.5 R5 — Route detail

**Purpose:** get ready to travel. **Primary action:** "Tell me when to leave".

```
┌──────────────────────────────┐
│ ←  Bus 23 from Stop B        │
│ Arriving in 6–8 min          │  ← 32 px bold
│ Walk to the stop: 5 min      │
│ ✔ Low waiting risk           │
│ ▾ Why this rating?           │
│ Places to wait nearby        │
│  Pharmacy · 90 m · open late │
│  Petrol pump · 200 m         │
│ ┌──────────────────────────┐ │
│ │  Tell me when to leave   │ │  ← primary
│ └──────────────────────────┘ │
│   Share my trip              │  ← secondary (outlined)
└──────────────────────────────┘
```

Notification permission is requested **only** when the user taps the primary button, with a one-line explanation before the browser prompt: "We'll alert you here when it's time to go." If permission is denied, the in-app alert still works and the screen says so plainly.

### 4.6 R6 — Safe Wait active

```
┌──────────────────────────────┐
│ ←  You're all set            │
│ We'll tell you when to leave │
│ ┌──────────────────────────┐ │
│ │ Bus 23 arrives in 9–11   │ │
│ │ min. Leave in about 4.   │ │
│ └──────────────────────────┘ │
│  Wait here: Pharmacy (90 m)  │
│ ┌──────────────────────────┐ │
│ │       Share my trip      │ │
│ └──────────────────────────┘ │
│  Cancel alert                │  ← text link
└──────────────────────────────┘
```

**Alert toast** (slides down from the top, stays until acknowledged):

```
┌──────────────────────────────┐
│ 🔔 Leave now                  │
│ Bus 23 is about 5 min away.  │
│ It's a 6 min walk.      [OK] │
└──────────────────────────────┘
```

Escalation text: "Bus is arriving sooner. Leave now." One button only (**OK**); "Remind me in 1 min" is a small text link.

### 4.7 R7 — Share my trip (bottom sheet, not a modal)

```
┌──────────────────────────────┐
│  Share my trip               │
│  Your contact sees where the │
│  bus is until your trip ends.│
│ ┌──────────────────────────┐ │
│ │     Send link            │ │  ← uses phone share sheet
│ └──────────────────────────┘ │
│   Copy link                  │
│   Stop sharing               │
└──────────────────────────────┘
```

After creation: "Link ready. It stops working when your trip ends." Wording never mentions the user's identity; no contact details are collected.

### 4.8 R8 — Alerts (tab 2)

List of cards, newest first, each with one line and a time: "This bus may not stop here — Bus 23, Stop A", "This bus has not started — Bus 12, 8:30 PM". Empty state: "No problems right now. All buses are running." Tapping an alert opens the stop sheet. No filters.

### 4.9 R9 — Report (tab 3, one question per step)

Step 1 — "Which stop is this about?" (list/search, Continue).
Step 2 — "What happened?" (large option rows; one choice):

- Long wait
- Dark or poorly lit
- Bus didn't stop or didn't come
- Too crowded
- I felt uncomfortable
- Something else
  Step 3 — "Want to add more? (optional)" with a text area and the line "Please don't include names or phone numbers." Primary: **Submit**.
  Success: "Thank you. Your report is anonymous and helps fix this stop." One button **Done**. Rate-limit error: "You've sent several reports. Please try again in an hour."
  The anonymity note appears on step 1 as one line; no legal text.

---

## 5. Trusted-contact page

**Purpose:** reassure. **Primary action:** none needed (read-only).

```
┌──────────────────────────────┐
│ ◌ Simulated data             │
│ Bus 23 is on the way         │
│ Arriving at Gomti Nagar in   │
│ 14–16 min                    │
│ Next stop: Patrakarpuram     │
│ ▓▓▓▓▓ small map ▓▓▓▓▓▓▓▓▓▓▓▓ │
│ This link stops working when │
│ the trip ends.               │
└──────────────────────────────┘
```

States: **Waiting** ("Waiting for Bus 23 at Stop B — arriving in 6–8 min"), **On the bus**, **Arrived** ("Trip finished. This link has ended."), **Expired/invalid** ("This link is no longer active."). No buttons, no login, no personal details, no map controls beyond zoom. Page refreshes live without the user doing anything and shows "Updated just now" in small text; if the feed stalls: "Updates paused. Last update 2 min ago."

---

## 6. Authority dashboard screens

Desktop-first, but readable on a tablet. **Rule:** one tab = one purpose; never more than one chart on screen.

### 6.1 D0 — Sign-in

Single card: "Authority sign-in" with one **Sign in with Google** button. Non-operators see: "This area is for transport staff." with a link back to the rider app.

### 6.2 D1 — Stops (default tab)

**Purpose:** know where to act first. **Primary action:** "See what to do" on the top stop.

```
┌───────────────────────────────────────────────────────────┐
│ TransitIQ · Authority      Stops | Reports | Trends | System│
├───────────────────────────────────────────────────────────┤
│ ┌───────────────────────────────────────────────────────┐ │
│ │ Stop A needs attention first                          │ │
│ │ Average evening wait 18 min · 7 safety-related reports │ │
│ │ ⚠ High waiting risk                                    │ │
│ │ [ See what to do ]                                    │ │
│ └───────────────────────────────────────────────────────┘ │
│ Other stops                                               │
│  2. Munshi Pulia   9 min wait   2 reports   Medium        │
│  3. Lohia Path     8 min wait   1 report    Medium        │
│  4. Lucknow Univ.  6 min wait   1 report    Low           │
│  (top 5 only; "Show all stops" link)                      │
└───────────────────────────────────────────────────────────┘
```

Right-hand side (desktop ≥ 1200 px): small map showing the selected stop only; no heatmap.

### 6.3 D2 — Stop detail ("What to do")

**Purpose:** decide an action. **Primary action:** "Mark as planned" (stores a status only; no automated enforcement).

- Heading: "Stop A".
- "Why it's flagged": the factor list in plain words (long evening waits, low activity nearby, poor lighting, repeated reports).
- "Suggested actions": up to 3 (for example "Add a 7:45 PM departure", "Improve lighting at this stop", "Review reports").
- One small chart: wait by hour (the only chart on this screen).
- Back arrow returns to the list at the same scroll position.

### 6.4 D3 — Reports to review

**Purpose:** a human reads sensitive reports. **Primary action:** "Mark as reviewed" per item.

- List of items needing human review (harassment-related first), each showing stop, time, redacted text, and status chips (New / In review / Done).
- Banner at top: "These reports are private. No automatic action is taken."
- Never shown on any rider or contact screen; never exported from the UI.

### 6.5 D4 — Trends

**Purpose:** see patterns. One chart at a time with a simple selector ("Waiting time by hour" / "Reports by type"). Evaluation numbers appear as three plain tiles: "Arrival time accuracy: model 1.2 min vs schedule-only 2.1 min (simulated)", "Waiting at quiet stops: 16 → 3 min on the safer route", "Alert reduces time outside: 62%". Values come from evaluation scripts; each tile carries "Simulated data".

### 6.6 D5 — System

**Purpose:** confirm everything is healthy. Four plain lines: Live feed (running/paused), AI helper (on / using backup rules), Last report received, Prompt versions. No charts.

---

## 7. Demo controller

**Purpose:** let the presenter run the demo reliably. **Primary action:** "Start demo".

```
┌────────────────────────────────┐
│ Demo controller (operator)     │
│ [ Start demo ]                 │
│ Time: 8:00 PM   Writes: 24     │
│ ▾ More (hour, speed, replay)   │
└────────────────────────────────┘
```

Rules: not linked from any rider screen; visible only to operators; shows a countdown to auto-stop and a write counter; "More" holds hour slider, speed, replay toggle, reset. A "Presenter notes" overlay is available with `?presenter=1` and shows the next demo step in one line.

---

## 8. Component library

All components live in `web/src/components/ui/` (primitives) or `web/src/components/` (feature components). Primitives are built first (U0) and reused everywhere.

### 8.1 Primitives

| Component                   | Props (main)                                                           | Behaviour and rules                                                                                                                                                                         |
| --------------------------- | ---------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Button`                    | `variant: primary \| secondary \| text`, `loading`, `disabled`, `full` | Min 48 px height; primary = filled blue; secondary = outlined; text = link style. Only **one** primary per screen (dev-time warning if two render). Loading shows a spinner and keeps width |
| `Card`                      | `selected`, `onSelect`                                                 | 1 px border, 12 px radius; `selected` adds 2 px primary border and a check icon (not colour alone)                                                                                          |
| `Step`                      | `index`, `total`, `title`, `onBack`                                    | Header with back arrow, plain "Step 1 of 3", title; keeps focus on the title on change                                                                                                      |
| `StickyAction`              | `children`                                                             | Bottom-pinned container for the primary button, respects safe-area inset                                                                                                                    |
| `Sheet`                     | `open`, `onClose`, `snap`                                              | Bottom sheet with drag handle; not a modal: map stays visible and interactive above it; close by drag, back, or tap outside                                                                 |
| `Toast`                     | `kind`, `action`, `persist`                                            | Top-anchored; `persist` for Safe Wait until the user acknowledges; announced with `role="status"` or `role="alert"` for urgent                                                              |
| `Banner`                    | `kind: info \| warn \| error`                                          | Inline message, icon + text, never colour alone                                                                                                                                             |
| `Badge`                     | `kind`, `label`                                                        | Used for status labels                                                                                                                                                                      |
| `RiskBadge`                 | `level: low \| medium \| high`, `compact`                              | Icon (check/minus/alert) + words ("Low waiting risk") + colour. Includes expandable "Why this rating?"                                                                                      |
| `TextField` / `SearchField` | `label`, `error`, `hint`                                               | Always has a visible label; 16 px font so iOS does not zoom                                                                                                                                 |
| `OptionRow`                 | `selected`, `label`, `description`                                     | Large radio-style row (min 56 px)                                                                                                                                                           |
| `Disclosure`                | `title`, `children`                                                    | "More details" collapsible; closed by default                                                                                                                                               |
| `EmptyState`                | `title`, `body`, `action?`                                             | Friendly, one sentence, optional single action                                                                                                                                              |
| `ErrorState`                | `title`, `body`, `retry`                                               | Plain language plus a **Try again** button                                                                                                                                                  |
| `Skeleton`                  | `lines`                                                                | Loading placeholder, no spinner storms                                                                                                                                                      |
| `LanguageToggle`            | —                                                                      | Text button "हिंदी" / "English"; `lang` attribute updates on `<html>`                                                                                                                       |
| `SimulatedDataBadge`        | —                                                                      | Small pill, top-left, always visible, 12 px text allowed here only                                                                                                                          |
| `BottomTabs`                | `active`                                                               | 3 tabs with icon + text, 64 px high                                                                                                                                                         |

### 8.2 Feature components

| Component                | Used on          | Notes                                                                                                    |
| ------------------------ | ---------------- | -------------------------------------------------------------------------------------------------------- |
| `MapView`                | Home, Plan, Trip | Leaflet; exposes `focus(stopId)`, `showRoutes(options)`; never blocks scrolling of the page below        |
| `BusSheet` / `StopSheet` | Home             | Next arrivals as plain lines ("Bus 23 · 6–8 min") with `RiskBadge`                                       |
| `EtaText`                | Many             | Formats "Arriving in 6–8 min" in the active language; handles "Arriving now" and "Bus may not stop here" |
| `RouteOptionCard`        | Plan step 3      | Radio card: label, total time, wait text, `RiskBadge`; recommended tag                                   |
| `TakeawayLine`           | Plan step 3      | Computed sentence; hidden if numbers do not support it                                                   |
| `WhyList`                | RiskBadge, D2    | 3–5 plain-language bullets generated from factors                                                        |
| `SafeSpotList`           | Route detail     | Max 3 items, distance, "open late" text                                                                  |
| `SafeWaitStatus`         | R6               | Shows when to leave in one line                                                                          |
| `ShareSheet`             | R7               | Create/copy/stop; uses Web Share API if available                                                        |
| `ReportStep`             | Report           | One question per screen; keeps answers in state when going back                                          |
| `AlertCard`              | Alerts           | One line + time + stop name                                                                              |
| `TripStatus`             | Trip page        | Big status sentence plus next stop                                                                       |
| `HeadlineCard`           | D1               | "Stop A needs attention first" with numbers and one button                                               |
| `StopRow`                | D1               | Rank, name, wait, reports, `RiskBadge`                                                                   |
| `ActionList`             | D2               | Up to 3 suggested actions                                                                                |
| `ReviewItem`             | D3               | Redacted text, status chips, "Mark as reviewed"                                                          |
| `ChartCard`              | D2, D4           | One Recharts chart with a text summary beneath for screen readers                                        |
| `StatTile`               | D4               | Number + plain label + "Simulated data"                                                                  |
| `DemoControls`           | Demo             | Start/Stop plus "More" disclosure                                                                        |

### 8.3 State and data hooks used by UI

`useLiveState`, `useStops`, `usePlan` (origin, destination, chosen option; persisted in memory across steps), `useSafeWait`, `useTrip`, `useReportDraft` (keeps answers between steps), `useLang`, `useOperator`.

---

## 9. States

Every screen implements all five states. Copy shown is English; Hindi equivalents live in `hi.json`.

| Screen        | Loading                                 | Empty                                             | Error                                                                                                                 | Offline / stale                                                    | Success                                |
| ------------- | --------------------------------------- | ------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ | -------------------------------------- |
| Home          | Skeleton search card, map tiles loading | —                                                 | "We couldn't load the map. Try again."                                                                                | Banner: "No internet. Showing the last bus positions (2 min ago)." | Buses moving                           |
| Plan step 1/2 | Skeleton list                           | "No places match. Try another name."              | "Couldn't load places. Try again."                                                                                    | Uses cached list                                                   | Option selected, Continue enabled      |
| Plan step 3   | "Finding the best routes…"              | "No bus goes there directly. Try a nearby place." | "Couldn't find routes. Try again."                                                                                    | Cached routes with "may be out of date"                            | Cards shown                            |
| Route detail  | Skeleton lines                          | —                                                 | "Couldn't load this bus. Try again."                                                                                  | "Arrival time may be out of date."                                 | "You're all set"                       |
| Safe Wait     | —                                       | —                                                 | If notifications blocked: "Alerts are blocked in your browser. We'll still show an alert here while the app is open." | Keeps countdown from last data; marks "may be out of date"         | Toast shown                            |
| Alerts        | Skeleton rows                           | "No problems right now. All buses are running."   | "Couldn't load alerts. Try again."                                                                                    | Last alerts + banner                                               | List                                   |
| Report        | —                                       | —                                                 | "Couldn't send. Your answers are saved. Try again." / "Please try again in an hour."                                  | "You're offline. We'll send it when you're back." (queued locally) | "Thank you. Your report is anonymous." |
| Trip page     | Skeleton                                | —                                                 | "We couldn't load this trip."                                                                                         | "Updates paused. Last update 2 min ago."                           | Live status                            |
| Trip expired  | —                                       | "This link is no longer active."                  | —                                                                                                                     | —                                                                  | —                                      |
| Dashboard     | Skeleton rows                           | "No stops need attention right now."              | "Couldn't load data. Try again."                                                                                      | Banner with last updated time                                      | Headline card                          |
| Review queue  | Skeleton                                | "Nothing to review."                              | "Couldn't load reports."                                                                                              | Banner                                                             | Items                                  |

Rules: errors always include one next step; never show codes; loading states appear only after 300 ms to avoid flicker; the map never shows a blank grey area without a message.

---

## 10. Copy and language

All strings live in `web/src/i18n/{en,hi}.json` using keys `area.screen.name`. **Have a Hindi speaker review all Hindi strings before M7 closes.**

### 10.1 Core strings

| Key                        | English                                                                       | Hindi                                                                    |
| -------------------------- | ----------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| `home.search`              | Where are you going?                                                          | आप कहाँ जा रहे हैं?                                                      |
| `plan.from.title`          | Where are you starting?                                                       | आप कहाँ से शुरू कर रहे हैं?                                              |
| `plan.to.title`            | Where do you want to go?                                                      | आप कहाँ जाना चाहते हैं?                                                  |
| `plan.step`                | Step {{n}} of {{total}}                                                       | चरण {{n}} / {{total}}                                                    |
| `common.continue`          | Continue                                                                      | आगे बढ़ें                                                                |
| `common.back`              | Back                                                                          | वापस                                                                     |
| `common.done`              | Done                                                                          | हो गया                                                                   |
| `common.submit`            | Submit                                                                        | भेजें                                                                    |
| `common.tryAgain`          | Try again                                                                     | फिर कोशिश करें                                                           |
| `plan.recommended`         | Recommended                                                                   | सुझाया गया                                                               |
| `plan.fastest`             | Fastest                                                                       | सबसे तेज़                                                                |
| `plan.total`               | {{n}} min total                                                               | कुल {{n}} मिनट                                                           |
| `plan.wait`                | Wait {{n}} min                                                                | {{n}} मिनट इंतज़ार                                                       |
| `plan.takeaway`            | {{extra}} minutes longer, but {{saved}} minutes less waiting at a quiet stop. | {{extra}} मिनट ज़्यादा, लेकिन सुनसान स्टॉप पर {{saved}} मिनट कम इंतज़ार। |
| `plan.moreDetails`         | More details                                                                  | और जानकारी                                                               |
| `risk.low`                 | Low waiting risk                                                              | इंतज़ार में कम जोखिम                                                     |
| `risk.medium`              | Some risk while waiting                                                       | इंतज़ार में थोड़ा जोखिम                                                  |
| `risk.high`                | High waiting risk                                                             | इंतज़ार में ज़्यादा जोखिम                                                |
| `stop.busyLit`             | Busy and well lit                                                             | भीड़-भाड़ वाला और रोशनी वाला                                             |
| `stop.quiet`               | Quiet stop, long wait                                                         | सुनसान स्टॉप, लंबा इंतज़ार                                               |
| `eta.arriving`             | Arriving in {{low}}–{{high}} min                                              | {{low}}–{{high}} मिनट में पहुँचेगी                                       |
| `eta.now`                  | Arriving now                                                                  | अभी पहुँच रही है                                                         |
| `route.walk`               | Walk to the stop: {{n}} min                                                   | स्टॉप तक पैदल: {{n}} मिनट                                                |
| `route.why`                | Why this rating?                                                              | यह रेटिंग क्यों?                                                         |
| `route.safeSpots`          | Places to wait nearby                                                         | पास में इंतज़ार की जगहें                                                 |
| `safewait.cta`             | Tell me when to leave                                                         | बताइए कब निकलना है                                                       |
| `safewait.set`             | You're all set                                                                | सब तैयार है                                                              |
| `safewait.toast`           | Bus {{n}} is about {{m}} min away. It's a {{w}} min walk.                     | बस {{n}} लगभग {{m}} मिनट दूर है। पैदल {{w}} मिनट लगेंगे।                 |
| `safewait.title`           | Leave now                                                                     | अभी निकलिए                                                               |
| `safewait.sooner`          | Bus is arriving sooner. Leave now.                                            | बस जल्दी आ रही है। अभी निकलिए।                                           |
| `safewait.ok`              | OK                                                                            | ठीक है                                                                   |
| `safewait.remind`          | Remind me in 1 min                                                            | 1 मिनट में याद दिलाएँ                                                    |
| `safewait.cancel`          | Cancel alert                                                                  | अलर्ट रद्द करें                                                          |
| `share.cta`                | Share my trip                                                                 | मेरी यात्रा साझा करें                                                    |
| `share.explain`            | Your contact sees where the bus is until your trip ends.                      | आपके संपर्क को आपकी यात्रा खत्म होने तक बस की जगह दिखेगी।                |
| `share.send`               | Send link                                                                     | लिंक भेजें                                                               |
| `share.copy`               | Copy link                                                                     | लिंक कॉपी करें                                                           |
| `share.stop`               | Stop sharing                                                                  | साझा करना बंद करें                                                       |
| `alert.skip`               | This bus may not stop here                                                    | यह बस यहाँ नहीं रुक सकती                                                 |
| `alert.ghost`              | This bus has not started                                                      | यह बस अभी शुरू नहीं हुई                                                  |
| `alert.none`               | No problems right now. All buses are running.                                 | अभी कोई समस्या नहीं। सभी बसें चल रही हैं।                                |
| `report.title`             | Tell us about this stop                                                       | इस स्टॉप के बारे में बताइए                                               |
| `report.q1`                | Which stop is this about?                                                     | यह किस स्टॉप के बारे में है?                                             |
| `report.q2`                | What happened?                                                                | क्या हुआ?                                                                |
| `report.opt.wait`          | Long wait                                                                     | लंबा इंतज़ार                                                             |
| `report.opt.light`         | Dark or poorly lit                                                            | अंधेरा या कम रोशनी                                                       |
| `report.opt.skip`          | Bus didn't stop or didn't come                                                | बस नहीं रुकी या नहीं आई                                                  |
| `report.opt.crowd`         | Too crowded                                                                   | बहुत भीड़                                                                |
| `report.opt.uncomfortable` | I felt uncomfortable                                                          | मुझे असहज महसूस हुआ                                                      |
| `report.opt.other`         | Something else                                                                | कुछ और                                                                   |
| `report.q3`                | Want to add more? (optional)                                                  | कुछ और जोड़ना चाहते हैं? (वैकल्पिक)                                      |
| `report.noPii`             | Please don't include names or phone numbers.                                  | कृपया नाम या फ़ोन नंबर न लिखें।                                          |
| `report.thanks`            | Thank you. Your report is anonymous and helps fix this stop.                  | धन्यवाद। आपकी रिपोर्ट गुमनाम है और इस स्टॉप को सुधारने में मदद करती है।  |
| `report.limit`             | You've sent several reports. Please try again in an hour.                     | आपने कई रिपोर्ट भेजी हैं। कृपया एक घंटे बाद फिर कोशिश करें।              |
| `trip.onWay`               | Bus {{n}} is on the way                                                       | बस {{n}} रास्ते में है                                                   |
| `trip.ends`                | This link stops working when the trip ends.                                   | यात्रा खत्म होने पर यह लिंक काम करना बंद कर देगा।                        |
| `trip.expired`             | This link is no longer active.                                                | यह लिंक अब चालू नहीं है।                                                 |
| `offline.banner`           | No internet. Showing the last bus positions.                                  | इंटरनेट नहीं है। आखिरी बार की बसों की जगह दिख रही है।                    |
| `badge.simulated`          | Simulated data                                                                | नकली (सिम्युलेटेड) डेटा                                                  |

### 10.2 Words we never use on rider screens

exposure, risk score, ETA, cluster, corroborated, algorithm, AI score, crime, dangerous area, unsafe neighbourhood, victim, suspect. (Enforced by the repo-wide banned-phrase test and a jargon list test for `web/src/i18n/*.json` rider keys.)

### 10.3 Dashboard vocabulary (operators only)

Operators may see: "waiting time", "reports", "priority", "suggested action", "arrival-time accuracy", with a short tooltip on first use. Still no crime language.

### 10.4 AI-generated text

Where Genkit text is shown (the "Why this rating?" sentence), label it "Explained by AI" in small text and always show the plain factor list beneath it. If AI is off, show only the factor list.

---

## 11. Accessibility

- [ ] Contrast: text ≥ 4.5:1; large text and UI components ≥ 3:1; verified for every token pair.
- [ ] Tap targets ≥ 48 × 48 px; spacing ≥ 8 px.
- [ ] Visible focus ring (3 px) on every interactive element; logical tab order; no keyboard traps.
- [ ] Every input has a visible label; errors are linked with `aria-describedby`.
- [ ] Risk and status always colour + text + icon shape.
- [ ] Map: all information on the map is also available as text; map controls have accessible names; a "List view" link under the map shows buses and stops as text.
- [ ] Toast uses `role="alert"` for Safe Wait; other toasts use `role="status"`.
- [ ] `lang` attribute switches with the language toggle; Hindi text uses a proper Devanagari font.
- [ ] Respect `prefers-reduced-motion`: no tweened bus movement, no sliding toast (fade only).
- [ ] Zoom to 200% without horizontal scroll; large-text mode scales the root font to 125%.
- [ ] Screen-reader pass (TalkBack on Android, VoiceOver if available) on the demo path.
- [ ] No time limits on any step; the Safe Wait alert persists until acknowledged.
- [ ] Charts include a text summary and a data table toggle.

---

## 12. Motion and feedback

| Moment                | Animation                      | Duration | Reduced motion       |
| --------------------- | ------------------------------ | -------- | -------------------- |
| Bus moving on the map | Linear tween between snapshots | 2 s      | Jump to new position |
| Step change           | Fade + 8 px slide              | 150 ms   | Fade only            |
| Sheet open/close      | Slide up                       | 200 ms   | Fade                 |
| Toast (Safe Wait)     | Slide down from top            | 200 ms   | Fade                 |
| Button press          | Slight darken, no scale        | 100 ms   | Same                 |
| Skeleton              | Static grey (no shimmer)       | —        | —                    |

Haptics: one short vibration on the Safe Wait toast where supported. No sounds in the MVP.

---

## 13. UI milestones and tasks

UI work is paired with the main build milestones. Task IDs: `U<n>-<nn>`. Each task follows PRD §0 (tests → commit → push → `firebase deploy --only hosting`).

| UI milestone | Pairs with | Outcome                                          |
| ------------ | ---------- | ------------------------------------------------ |
| U0           | M0–M1      | Design system and primitives                     |
| U1           | M2         | Home with live map                               |
| U2           | M3–M4      | Alerts, stop sheet, plan flow, compare card      |
| U3           | M5         | Route detail, Safe Wait, share, trip page        |
| U4           | M6         | Report flow                                      |
| U5           | M6         | Authority dashboard                              |
| U6           | M7         | Demo controller, language, accessibility, polish |

---

### U0 — Design system and primitives

**Objective:** tokens and reusable components so every later screen is consistent and simple.

- [x] U0-01 Add Tailwind theme extension with the tokens in §2.1 (colours, spacing, radius, type scale).
- [x] U0-02 Run a contrast check for every text/background pair; record results in `docs/ui-contrast.md`; adjust tokens that fail.
- [x] U0-03 Add the system font stack and lazy-load Noto Sans Devanagari when Hindi is active.
- [x] U0-04 Configure i18next with `en.json` and `hi.json`; add the key-parity test.
- [x] U0-05 Build `Button` (primary/secondary/text, loading, disabled) with a dev-only warning if two primaries render on one screen.
- [x] U0-06 Build `Card`, `OptionRow`, `Disclosure`, `Banner`, `Badge`.
- [x] U0-07 Build `Step` and `StickyAction` (safe-area aware).
- [x] U0-08 Build `Sheet` (non-modal bottom sheet with snap points and drag).
- [x] U0-09 Build `Toast` (status/alert variants, persist option).
- [x] U0-10 Build `TextField` and `SearchField` (visible label, 16 px text, error linking).
- [x] U0-11 Build `EmptyState`, `ErrorState`, `Skeleton`.
- [x] U0-12 Build `RiskBadge` (icon + words + colour) and `WhyList`.
- [x] U0-13 Build `LanguageToggle`, `SimulatedDataBadge`, `BottomTabs`.
- [x] U0-14 Build `AppShell`: phone frame on ≥ 1024 px, full-width below; top bar with badge and language toggle.
- [x] U0-15 Add a hidden `/ui-kit` route (dev only) showing every component in all states, in both languages.
- [x] U0-16 Tests: each primitive renders, is keyboard operable, has no axe violations; `Button` warns on two primaries.
- [x] U0-17 Commit as small steps (`feat: add button`, `feat: add sheet`, …), push, deploy hosting.

**Done when:** `/ui-kit` shows all primitives; axe reports no violations; contrast table passes; Hindi renders correctly.

---

### U1 — Home with live map (pairs with M2)

- [x] U1-01 Build `HomePage` with `MapView` behind a bottom `Sheet` containing the "Where are you going?" field.
- [x] U1-02 Show only: map, search card, language toggle, simulated badge, three bottom tabs.
- [x] U1-03 Bus markers (32 px) and stop markers (20 px) per §2.3; selected route emphasised, others dimmed.
- [x] U1-04 Tap bus/stop → small `StopSheet`/`BusSheet` with next arrivals as plain text.
- [x] U1-05 "List view" text link that shows buses and stops as text (map accessibility alternative).
- [x] U1-06 Stale-feed banner after 8 s of no updates; offline banner.
- [x] U1-07 Skeleton state while the first `sim/live` snapshot loads.
- [x] U1-08 Tests: search card opens Plan step 1; bus tap shows sheet; stale banner appears; no horizontal scroll at 360 px.
- [x] U1-09 Commit, push, deploy hosting.

**Done when:** on a 360 px screen the user sees buses moving and one obvious field; nothing else competes for attention.

---

### U2 — Alerts, stop sheet, plan flow, compare card (pairs with M3–M4)

- [x] U2-01 Build `EtaText` (range, "Arriving now", "may not stop here") in both languages.
- [x] U2-02 Build `AlertCard` and the Alerts tab with empty/error states.
- [x] U2-03 Build the single skip-alert banner on Home for followed stops.
- [x] U2-04 Build Plan step 1 and step 2 using `Step`, `SearchField`, `OptionRow`; keep choices when going back.
- [x] U2-05 Build `RouteOptionCard` and `TakeawayLine`; pre-select the recommended option.
- [x] U2-06 Build "More details" `Disclosure` with `WhyList`, walking minutes, and the "Faster ↔ Less waiting alone" slider.
- [x] U2-07 "Show on map" link that lifts the map with both routes drawn (colour + line style: solid vs dashed so it is not colour-only).
- [x] U2-08 Handle the "Fastest is also the safest" case and the "no direct route" empty state.
- [x] U2-09 Sticky **Continue** button; disabled until an option is selected.
- [x] U2-10 Tests: takeaway text matches golden numbers (4 and 10); slider re-ranks; card selection by keyboard; back keeps state; Hindi text fits without truncation.
- [x] U2-11 Visual check at 360, 390, 430, 768 px.
- [x] U2-12 Commit, push, deploy hosting.

**Done when:** the compare screen shows "32 min · wait 4 min · Low waiting risk" vs "28 min · wait 14 min · High waiting risk" with the takeaway, one primary button, and nothing else competing.

---

### U3 — Route detail, Safe Wait, share, trip page (pairs with M5)

- [ ] U3-01 Build `RouteDetailPage`: arrival text (32 px), walk time, `RiskBadge`, `SafeSpotList`, primary "Tell me when to leave", secondary "Share my trip".
- [ ] U3-02 Permission flow: one-line explanation then the browser prompt, only after the button tap; plain message if blocked.
- [ ] U3-03 Build `SafeWaitStatus` (R6) with "Leave in about N min" and cancel link.
- [ ] U3-04 Build the persistent Safe Wait `Toast` with single **OK** and "Remind me in 1 min" link; vibration where supported.
- [ ] U3-05 Build the escalation text variant ("arriving sooner").
- [ ] U3-06 Build `ShareSheet` (create, copy, stop) using the Web Share API when available.
- [ ] U3-07 Build `TripPage` with states: waiting, on the bus, arrived, expired/invalid, stalled updates.
- [ ] U3-08 Make the trip page extremely light (no navigation, no login, no buttons) and fast on slow networks.
- [ ] U3-09 After a successful Safe Wait setup, show a one-time, dismissible "Add to home screen" hint (not at first load).
- [ ] U3-10 Tests: toast text matches computed message; OK acknowledges; no second toast after acknowledge; blocked-permission message; expired link screen; copy link works; Stop sharing calls the API.
- [ ] U3-11 Commit, push, deploy hosting.

**Done when:** a first-time user can go from route to "alert on" in one tap, and a contact opening the link understands it with no instructions.

---

### U4 — Report flow (pairs with M6)

- [ ] U4-01 Build `ReportStep` flow: stop → what happened → optional note → submit.
- [ ] U4-02 Keep answers in `useReportDraft` when the user goes back or loses connection.
- [ ] U4-03 Show the "no names or phone numbers" line next to the text field; character counter appears only near the limit.
- [ ] U4-04 Success, error, rate-limit, and offline-queued messages per §9.
- [ ] U4-05 Confirm the request body has no identifying fields (snapshot test).
- [ ] U4-06 Tests: required step 2 answer; optional note; Hindi flow; keyboard-only flow.
- [ ] U4-07 Commit, push, deploy hosting.

**Done when:** a report takes under 20 seconds and three taps.

---

### U5 — Authority dashboard (pairs with M6)

- [ ] U5-01 Build sign-in screen and the "transport staff only" screen.
- [ ] U5-02 Build `DashboardShell` with four tabs (Stops, Reports to review, Trends, System).
- [ ] U5-03 Build `HeadlineCard` ("Stop A needs attention first", "Average evening wait 18 min · 7 safety-related reports", **See what to do**).
- [ ] U5-04 Build `StopRow` list (top 5, "Show all stops" link) with `RiskBadge`.
- [ ] U5-05 Build stop detail: "Why it's flagged", up to 3 `ActionList` items, one wait-by-hour `ChartCard`, "Mark as planned".
- [ ] U5-06 Build `ReviewItem` list with privacy banner and status chips; "Mark as reviewed" only changes status.
- [ ] U5-07 Build Trends with a single chart selector and three `StatTile`s labelled simulated.
- [ ] U5-08 Build System tab with four plain status lines.
- [ ] U5-09 Desktop layout: left list, right detail ≥ 1200 px; tablet shows one pane at a time.
- [ ] U5-10 Tests: headline text exact; only one chart visible on a screen; review queue not reachable by non-operators; charts have text summaries.
- [ ] U5-11 Commit, push, deploy hosting.

**Done when:** within 3 seconds of opening, an operator sees "Stop A needs attention first" with its numbers and one button.

---

### U6 — Demo controller, language, accessibility, polish (pairs with M7)

- [ ] U6-01 Build `DemoControls` ("Start demo", write counter, auto-stop countdown, "More" disclosure).
- [ ] U6-02 Presenter overlay (`?presenter=1`) showing the next demo step in one line.
- [ ] U6-03 Complete Hindi translations; have a Hindi speaker review; fix overflow in Hindi on every screen.
- [ ] U6-04 Accessibility pass per §11 including TalkBack/VoiceOver on the demo path.
- [ ] U6-05 Large-text mode and 200% zoom check.
- [ ] U6-06 PWA install hint, icons, splash colour; offline shell.
- [ ] U6-07 Run the UI review checklist (§15) on every screen; record in `docs/ui-review.md`; fix failures.
- [ ] U6-08 Remove any unused components, dead routes, and extra buttons found during review.
- [ ] U6-09 Capture screenshots at 390 × 844 for the pitch (Home, Compare card, Safe Wait toast, Trip page, Dashboard headline).
- [ ] U6-10 Commit, push, deploy hosting; run the full demo script three times on the live URL.

**Done when:** every screen passes the review checklist and the demo runs cleanly three times in a row.

---

## 14. UI testing plan

| Type                         | Tooling                                   | What it checks                                                                          |
| ---------------------------- | ----------------------------------------- | --------------------------------------------------------------------------------------- |
| Component tests              | Vitest + React Testing Library            | Rendering, text, states, keyboard use                                                   |
| Accessibility                | `vitest-axe`                              | No violations on every page and primitive                                               |
| i18n                         | Vitest                                    | Key parity en/hi; no missing keys; jargon list absent from rider keys                   |
| Single-primary rule          | Custom test helper                        | Each page renders exactly one primary `Button`                                          |
| Language fit                 | Playwright screenshots in Hindi           | No clipped or overflowing text                                                          |
| Responsive                   | Playwright at 360, 390, 430, 768, 1280 px | No horizontal scroll; sticky button visible; tap targets ≥ 48 px                        |
| Banned phrases               | Existing repo-wide scan                   | No crime or blame language in UI strings                                                |
| Flow tests                   | Playwright                                | Home → Plan (3 steps) → Route → Safe Wait → Share; Report (3 steps); Dashboard headline |
| Offline                      | Playwright (offline mode)                 | Banner appears; cached screens still work                                               |
| Visual regression (optional) | Playwright snapshots                      | Layout drift on key screens                                                             |

---

## 15. UI review checklist

Run on **every** screen (from `UI_UX_INSTRUCTIONS.md`). A screen passes only if all answers are "yes".

1. Does a first-time user immediately understand this screen?
2. Is it obvious what to do next?
3. Is there anything we can remove?
4. Is the number of choices small (ideally one primary action)?
5. Is the language simple (no jargon, short sentences)?
6. Can the task be done in fewer steps?
7. Is the primary action instantly recognisable and reachable with the thumb?
8. Do error, loading, empty, and offline states exist and make sense?
9. Does it work at 360 px and in Hindi?
10. Does it pass the keyboard and screen-reader check?

---

## 16. Performance budget

- First load on a mid-range phone over 3G-like throttling: usable in **< 4 s**.
- Initial JavaScript for the rider app ≤ **250 KB gzip** (route-level code splitting; Leaflet loaded with the map screen; Recharts and dashboard code only for operators).
- Dashboard and demo code never loaded by rider routes.
- Images: none in the MVP beyond icons; SVG icons inlined.
- Fonts: system fonts by default; Devanagari font loaded only for Hindi.
- Trip page budget: ≤ **150 KB gzip** total (no routing library features it doesn't use).
- Lighthouse targets: Performance ≥ 85, Accessibility ≥ 95, PWA installable.

---

## 17. Definition of done (UI)

- [ ] Every screen in §4–§7 is built and matches its purpose and primary action.
- [ ] Each page has exactly one primary button; no modals anywhere.
- [ ] Plan and Report flows are step-by-step and keep answers when going back.
- [ ] All states in §9 exist for every screen.
- [ ] English and Hindi complete, reviewed, and fit without clipping.
- [ ] Contrast, tap-target, focus, and axe checks pass.
- [ ] Rider screens contain none of the banned jargon or blame language.
- [ ] Simulated-data badge on every screen.
- [ ] UI review checklist (§15) passes on every screen and is recorded in `docs/ui-review.md`.
- [ ] Performance budget met on the live URL.
- [ ] Every UI change committed, pushed, and deployed (PRD §0).

---

## 18. Risks and decisions

| #    | Item                                                       | Decision / mitigation                                                                    |
| ---- | ---------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| UR1  | The PRD has many features; the UI doc wants simplicity     | Keep every feature, but each lives behind one clear step or a collapsed "More details"   |
| UR2  | Compare card needs two choices but only one primary button | Cards act as radio options; one sticky **Continue** button                               |
| UR3  | Dashboard could feel crowded                               | One tab = one purpose; headline card first; one chart per screen                         |
| UR4  | Hindi text is longer and may overflow                      | Test every screen in Hindi at 360 px; allow two-line labels                              |
| UR5  | Map is not accessible by itself                            | Always provide a text "List view" and text status lines                                  |
| UR6  | Notifications are limited in browsers                      | In-app persistent toast is the supported path; explain plainly if blocked                |
| UR7  | Colour-only risk signalling                                | Icon shape + words + colour; dashed vs solid route lines                                 |
| UR8  | Demo-only controls leaking into the rider UI               | Demo controls live only on `/demo` for operators                                         |
| UR9  | AI text could include scary or blaming wording             | Guardrails from PRD §10.3; plain factor list always shown beside it                      |
| UR10 | Scope creep in visuals                                     | No dark mode, illustrations, or onboarding in the MVP; logged in `docs/roadmap-ideas.md` |

_End of UI build plan. Pair each UI milestone with its main milestone in `build_plan.md`._
