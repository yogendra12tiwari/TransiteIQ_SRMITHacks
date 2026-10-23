# Flow: triageReport (v1)

## Purpose

Triage passenger-submitted reports into structured categories, severity ratings, detected language, and concise themes. Identify any issues requiring human operator review.

## Inputs

- `text`: Passenger report text (pre-redacted, PII removed)
- `category`: Category selected by user (`long_wait`, `poor_lighting`, `skipped_bus`, `overcrowding`, `harassment_concern`, `other`)
- `stopId`: Transit stop identifier

## Output Schema

```json
{
  "category": "long_wait | poor_lighting | skipped_bus | overcrowding | harassment_concern | other",
  "severity": "low | medium | high",
  "lang": "en | hi",
  "theme": "string (concise summary under 100 characters)",
  "needsHumanReview": "boolean"
}
```

## Safety Rules

1. Never blame passengers or suggest commuter actions contributed to an issue.
2. Never predict crime or characterize any transit location or neighborhood as bad or hazardous.
3. Focus solely on service reliability, schedules, lighting, infrastructure, and passenger comfort.
4. Any mention of harassment, verbal intimidation, stalking, physical misconduct, or safety threats MUST set `severity` to `high` and `needsHumanReview` to `true`.
5. Maintain strict privacy: do not echo personal names, contact numbers, or identifiers.

## Few-Shot Examples

### Example 1 (English - Long Wait)

**Input:**

- text: "Bus 23 was scheduled for 8:15 PM but hasn't arrived. Been waiting here for 35 minutes in the cold."
- category: "long_wait"
- stopId: "stop_A"

**Output:**

```json
{
  "category": "long_wait",
  "severity": "high",
  "lang": "en",
  "theme": "Significant bus delay exceeding 30 minutes",
  "needsHumanReview": false
}
```

### Example 2 (English - Poor Lighting)

**Input:**

- text: "Streetlights at the shelter are non-functional and the boarding area is completely dark."
- category: "poor_lighting"
- stopId: "stop_A"

**Output:**

```json
{
  "category": "poor_lighting",
  "severity": "high",
  "lang": "en",
  "theme": "Non-functional shelter lighting",
  "needsHumanReview": false
}
```

### Example 3 (English - Skipped Bus)

**Input:**

- text: "Bus 41 drove straight past Stop B at 7:30 PM without stopping even though people were signalling."
- category: "skipped_bus"
- stopId: "stop_B"

**Output:**

```json
{
  "category": "skipped_bus",
  "severity": "medium",
  "lang": "en",
  "theme": "Bus bypassed stop with waiting passengers",
  "needsHumanReview": false
}
```

### Example 4 (English - Harassment Concern)

**Input:**

- text: "Group of individuals making inappropriate lewd remarks and blocking passenger shelter access."
- category: "harassment_concern"
- stopId: "stop_A"

**Output:**

```json
{
  "category": "harassment_concern",
  "severity": "high",
  "lang": "en",
  "theme": "Verbal misconduct near passenger shelter",
  "needsHumanReview": true
}
```

### Example 5 (Hindi - Long Wait)

**Input:**

- text: "बस 23 पिछले 40 मिनट से नहीं आई है, स्टॉप पर बहुत देर से इंतज़ार कर रहे हैं।"
- category: "long_wait"
- stopId: "stop_A"

**Output:**

```json
{
  "category": "long_wait",
  "severity": "high",
  "lang": "hi",
  "theme": "बस का अत्यधिक विलंब",
  "needsHumanReview": false
}
```

### Example 6 (Hindi - Poor Lighting)

**Input:**

- text: "स्टॉप पर लगी लाइटें बंद पड़ी हैं, चारों तरफ काफी अंधेरा है।"
- category: "poor_lighting"
- stopId: "stop_A"

**Output:**

```json
{
  "category": "poor_lighting",
  "severity": "medium",
  "lang": "hi",
  "theme": "स्टॉप पर रोशनी की कमी",
  "needsHumanReview": false
}
```

### Example 7 (Hindi - Skipped Bus)

**Input:**

- text: "ड्राइवर ने हाथ देने के बावजूद बस नहीं रोकी और तेज़ी से निकाल ले गया।"
- category: "skipped_bus"
- stopId: "stop_B"

**Output:**

```json
{
  "category": "skipped_bus",
  "severity": "medium",
  "lang": "hi",
  "theme": "यात्रियों के संकेत पर बस न रोकना",
  "needsHumanReview": false
}
```

### Example 8 (Hindi - Harassment Concern)

**Input:**

- text: "स्टॉप के पास कुछ लोग बदतमीज़ी और फब्तियां कस रहे हैं, तुरंत सुरक्षा सहायता चाहिए।"
- category: "harassment_concern"
- stopId: "stop_A"

**Output:**

```json
{
  "category": "harassment_concern",
  "severity": "high",
  "lang": "hi",
  "theme": "स्टॉप के पास अनुचित व्यवहार",
  "needsHumanReview": true
}
```
