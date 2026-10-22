# Judge Q&A Preparation

_Supporting reference: TRANSITIQ_SPEC.md §23, TRANSITIQ_PRD.md §3.3, §9.2, §9.7._

---

## 1. ETA Evaluation & Baseline Metrics (Milestone M3)

### Evaluated Result:

```text
ETA Evaluation: Model MAE = 1.63 min vs Baseline MAE = 3.89 min (58.1% improvement, 95.6% 80%-band coverage)
```

- **Dataset**: Evaluated over 30-day simulated history across all 16 Lucknow stops and transport hours (8,160 observation records from `seed/history.json`).
- **Target (PRD §3.3)**: Model MAE must be at least 30% lower than baseline MAE ($\le 0.70 \times \text{baseline}$).
- **Achieved**: Model MAE is **58.1% lower** than baseline ($0.42 \times \text{baseline}$), substantially exceeding target.
- **Uncertainty Band Coverage**: **95.6%** of actual arrivals fall within the dynamic 80% confidence interval ($[\text{lowMin}, \text{highMin}]$).
- **CLI Command**: Run `npm run eval:eta` to reproduce anytime.

### Q: Why does the TransitIQ ETA model outperform the schedule baseline?

1. **Dynamic Traffic Modeling**: The model incorporates time-of-day traffic congestion curves (`trafficFactor(hour)`: 0.6 in evening peaks vs 1.0 in late evenings) rather than assuming a static scheduled speed.
2. **Real-time Velocity EMA**: Uses an exponential moving average (`alpha = 0.2`) of recent bus speeds to adapt to slowdowns and intersection delays.
3. **Stop-Specific Error Variance**: Incorporates historical stop variance (`hist.errorMin[stop.id]`) to dynamically widen the uncertainty band ($mean \pm 1.28\sigma$) for historically bottlenecked stops like Stop A (Charbagh).

---

## 2. Wait-Risk Transparency & No Crime Prediction (PRD §9.3 & §10.1)

### Q: Does TransitIQ predict crime or label neighborhoods as dangerous?

**No.** TransitIQ explicitly adheres to a strict objective safety framework:

- **No Crime Prediction**: The algorithm never predicts crime or uses police crime statistics.
- **Waiting Risk Only**: Risk reflects environmental and service conditions while waiting at a bus stop (long waits, darkness after sunset, low nearby commercial activity, uncorroborated skip rates, and crowdsourced service/safety reports).
- **Objective Factor Breakdown**: Every wait-risk badge reveals a transparent "Why?" drawer showing the exact contributions of all 5 weighted factors:
  1. Expected Wait Time (30% weight)
  2. Night / Lighting (20% weight)
  3. Low Nearby Activity (20% weight)
  4. Community Safety Reports (20% weight)
  5. Schedule Unreliability / Skip Rate (10% weight)
- **Banned Phrase Filter**: Automated post-filters scan and block phrases like "crime rate", "dangerous area", "criminal", "unsafe neighborhood", or any victim-blaming language.

---

## 3. Client-Side Replay Mode (Zero Firestore Writes)

### Q: How can judges verify the demo without consuming Firestore write quota?

TransitIQ features a client-side **Replay Mode**:

- `generateReplayTape` precomputes the full multi-minute scripted incident sequence into memory (`ReplayTape`).
- The client plays, pauses, seeks, and inspects the animated fleet, ETAs, and active alerts locally.
- **Zero writes** are made to Firestore during replay, protecting the daily spark-plan budget.
