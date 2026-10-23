# Flow: recommendActions (v1)

## Purpose

Generate prioritized, concrete municipal and transit authority recommendations based on stop risk metrics, waiting times, skip rates, and passenger report aggregates.

## Inputs

- `stopId`: Stop identifier
- `stopName`: Display name of stop
- `aggregates`: Summary metrics:
  - `avgEveningWaitMin`: Average wait time in evening peak
  - `lightingReportsCount`: Number of reports noting poor lighting
  - `skipRate`: Ratio of runs bypassing this stop
  - `harassmentReportsCount`: Number of reports noting harassment or safety concerns
  - `totalSafetyReports`: 30-day count of safety-related reports
- `lang`: Language code (`en` or `hi`)

## Safety Rules

1. Focus strictly on municipal infrastructure, street lighting, schedule frequency, and transit enforcement.
2. Never suggest behavioral restrictions or dress codes for passengers.
3. Avoid any crime prediction language or area stigmatization.

## Few-Shot Examples

### Example 1 (English - Stop A with Wait, Lighting, and Skip Issues)

**Input:**

- stopId: "stop_A"
- stopName: "Stop A"
- aggregates: { "avgEveningWaitMin": 18, "lightingReportsCount": 4, "skipRate": 0.25, "harassmentReportsCount": 1 }
- lang: "en"

**Output:**

```json
{
  "recommendations": [
    "Schedule additional evening bus departures to reduce 18-minute waiting intervals.",
    "Repair and upgrade street illumination around transit shelter.",
    "Investigate driver stop compliance to eliminate 25% skip rate.",
    "Dispatch transit patrol for evening passenger presence."
  ]
}
```

### Example 2 (English - Stop B with Low Issues)

**Input:**

- stopId: "stop_B"
- stopName: "Stop B (Market Junction)"
- aggregates: { "avgEveningWaitMin": 5, "lightingReportsCount": 0, "skipRate": 0.03, "harassmentReportsCount": 0 }
- lang: "en"

**Output:**

```json
{
  "recommendations": [
    "Maintain existing 5-minute evening headway schedule.",
    "Routine inspection of shelter lighting."
  ]
}
```

### Example 3 (Hindi - Stop A)

**Input:**

- stopId: "stop_A"
- stopName: "Stop A"
- aggregates: { "avgEveningWaitMin": 18, "lightingReportsCount": 4, "skipRate": 0.25, "harassmentReportsCount": 1 }
- lang: "hi"

**Output:**

```json
{
  "recommendations": [
    "18 मिनट के लंबे इंतजार को घटाने के लिए शाम के समय अतिरिक्त बसें संचालित करें।",
    "बस शेल्टर और आसपास खराब स्ट्रीट लाइटों की तुरंत मरम्मत करवाएं।",
    "स्टॉप पर बस न रुकने (25% स्किप दर) की जांच कर स्टॉप नियम का पालन कराएं।",
    "शाम के समय यात्रियों की सहायता के लिए सुरक्षा कर्मियों की उपस्थिति बढ़ाएं।"
  ]
}
```
