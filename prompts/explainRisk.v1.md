# Flow: explainRisk (v1)

## Purpose

Convert numeric wait-risk factor breakdown into a concise, transparent, non-blaming explanation for transit riders under 280 characters.

## Inputs

- `stopId`: Stop identifier
- `stopName`: Display name of the stop (e.g. "Stop A", "Stop B (Market Junction)")
- `factors`: Weight breakdown:
  - `wait`: wait duration component
  - `night`: night/evening hour factor
  - `lowActivity`: pedestrian activity level proxy
  - `reports`: recent passenger reports factor
  - `unreliability`: bus arrival variance factor
- `expectedWaitMin`: Expected waiting time in minutes
- `hour`: Hour of day (0-23)
- `lang`: Language code (`en` or `hi`)

## Output Requirements

- Maximum length: 280 characters.
- Tone: objective, factual, transparent, service-focused.
- Safety: No crime prediction, no passenger-blaming, no neighborhood stereotyping.

## Few-Shot Examples

### Example 1 (English - High Waiting Risk)

**Input:**

- stopName: "Stop A"
- expectedWaitMin: 18
- hour: 20
- factors: { "wait": 0.28, "night": 0.15, "lowActivity": 0.16, "reports": 0.14, "unreliability": 0.05 }
- lang: "en"

**Output:**

```
High waiting risk: 18 min expected wait, evening hours, low pedestrian activity nearby, and 7 recent service reports.
```

### Example 2 (English - Moderate Waiting Risk)

**Input:**

- stopName: "Stop B"
- expectedWaitMin: 10
- hour: 20
- factors: { "wait": 0.15, "night": 0.15, "lowActivity": 0.04, "reports": 0.02, "unreliability": 0.04 }
- lang: "en"

**Output:**

```
Moderate waiting risk: 10 min wait, evening hours, moderate street activity and normal transit operations.
```

### Example 3 (English - Low Waiting Risk)

**Input:**

- stopName: "Stop B (Market Junction)"
- expectedWaitMin: 4
- hour: 18
- factors: { "wait": 0.06, "night": 0.0, "lowActivity": 0.04, "reports": 0.02, "unreliability": 0.02 }
- lang: "en"

**Output:**

```
Low waiting risk: short wait (4 min), active well-lit stop, reliable scheduled service.
```

### Example 4 (Hindi - High Waiting Risk)

**Input:**

- stopName: "Stop A"
- expectedWaitMin: 18
- hour: 20
- factors: { "wait": 0.28, "night": 0.15, "lowActivity": 0.16, "reports": 0.14, "unreliability": 0.05 }
- lang: "hi"

**Output:**

```
अधिक प्रतीक्षा जोखिम: 18 मिनट अनुमानित प्रतीक्षा, शाम का समय, आसपास कम गतिविधि और 7 हालिया सेवा रिपोर्टें।
```

### Example 5 (Hindi - Moderate Waiting Risk)

**Input:**

- stopName: "Stop B"
- expectedWaitMin: 10
- hour: 20
- factors: { "wait": 0.15, "night": 0.15, "lowActivity": 0.04, "reports": 0.02, "unreliability": 0.04 }
- lang: "hi"

**Output:**

```
मध्यम प्रतीक्षा जोखिम: 10 मिनट प्रतीक्षा, सामान्य बस सेवा और आसपास मध्यम गतिविधि।
```

### Example 6 (Hindi - Low Waiting Risk)

**Input:**

- stopName: "Stop B"
- expectedWaitMin: 4
- hour: 18
- factors: { "wait": 0.06, "night": 0.0, "lowActivity": 0.04, "reports": 0.02, "unreliability": 0.02 }
- lang: "hi"

**Output:**

```
कम प्रतीक्षा जोखिम: कम प्रतीक्षा (4 मिनट), सक्रिय और अच्छी रोशनी वाला स्टॉप, विश्वसनीय सेवा।
```
