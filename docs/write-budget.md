# Simulator Write Budget & Firestore Usage

**Milestone:** M2 (Simulator and Live Map)  
**Date:** 2026-10-23  
**Project:** `transiteiq`  
**Owner:** `yogendra12tiwari@gmail.com`

---

## 1. Tick Rate and Write Frequency

The transit fleet simulator runs in the operator controller (`/demo`) and periodically publishes the fleet telemetry to the single Cloud Firestore document at `sim/live`.

| Metric                       | Measured Value      | Design Limit      |
| ---------------------------- | ------------------- | ----------------- |
| **Tick Interval**            | 2.0 seconds         | 2.0 seconds       |
| **Writes per Minute**        | 30 writes/min       | 30 writes/min     |
| **Session Duration Cap**     | 10 minutes (600 s)  | 10 minutes        |
| **Writes per Session**       | 300 writes          | 300 writes        |
| **Daily Free Tier Quota**    | 20,000 writes/day   | 20,000 writes/day |
| **Session % of Daily Quota** | **1.5%**            | < 2%              |
| **Warning Threshold**        | 16,000 writes (80%) | 80% banner        |

---

## 2. Throttling and Safety Controls

1. **Auto-Stop Timer**: The controller hard-stops write emission after 10 continuous minutes (`600s`) with an active countdown timer on `/demo`.
2. **Single-Tab Guard**: Implemented using the browser `BroadcastChannel("transitiq-sim-controller")` API. If a second operator tab attempts to control the simulation, it is immediately placed in standby mode to prevent conflicting or doubled writes.
3. **Session Write Counter**: Persisted in browser `localStorage` and displayed in real time to the operator.
4. **Smooth Interpolation**: Riders reading from `onSnapshot` receive 60fps movement via linear interpolation (linear tween) over each 2-second tick, achieving smooth visual motion without high Firestore write frequencies.
