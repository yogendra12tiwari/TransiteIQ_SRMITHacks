export const validStop = {
  id: "stop_A",
  name: "Stop A (Example)",
  lat: 26.8528,
  lng: 80.9655,
  activity: 0.2,
  lighting: "poor",
  ridershipPerEvening: 400,
  skipRate: 0.25,
  safeSpotIds: ["spot_1", "spot_2"],
};

export const validRoute = {
  id: "route_23",
  name: "Bus 23",
  color: "#e11d48",
  stopIds: ["stop_1", "stop_2", "stop_A"],
  polyline: [
    [26.84, 80.94],
    [26.85, 80.95],
  ] as [number, number][],
  headwayMin: {
    peak: 10,
    offpeak: 15,
    evening: 25,
  },
};

export const validSafeSpot = {
  id: "spot_1",
  name: "Apollo Pharmacy",
  kind: "pharmacy",
  lat: 26.853,
  lng: 80.966,
  openLate: true,
};

export const validBus = {
  id: "bus_23_1",
  routeId: "route_23",
  distanceAlongRouteM: 4210,
  speedMps: 6.4,
  lat: 26.85,
  lng: 80.94,
  status: "RUNNING",
};

export const validEta = {
  busId: "bus_23_1",
  stopId: "stop_A",
  meanMin: 7.0,
  lowMin: 6.0,
  highMin: 8.0,
  confidence: 0.8,
};

export const validAlert = {
  id: "alert_001",
  type: "LIKELY_SKIP",
  severity: "high",
  message: "Bus 23 is running late and may skip Stop A.",
  messageHi: "बस 23 देरी से चल रही है।",
  affectedStopIds: ["stop_A"],
  createdAt: 1729700000000,
};

export const validSimLive = {
  simTimeMs: 1729700000000,
  hour: 20,
  buses: [validBus],
  etas: [validEta],
  alerts: [validAlert],
  tick: 42,
  scenario: "live",
  promptVersions: {
    triageReport: "v1",
    explainRisk: "v1",
  },
};

export const validWaitRisk = {
  stopId: "stop_A",
  score: 0.795,
  label: "High",
  factors: {
    wait: 0.27,
    night: 0.2,
    lowActivity: 0.16,
    reports: 0.14,
    unreliability: 0.025,
  },
  explanation: "High waiting risk due to long wait and low evening activity.",
};

export const validRouteOption = {
  id: "opt_fast",
  label: "Fastest",
  travelMin: 28,
  waitMin: 14,
  walkMin: 6,
  boardingStopId: "stop_A",
  exposureMinutes: 16,
  riskLabel: "High",
  polyline: [
    [26.84, 80.94],
    [26.85, 80.95],
  ],
  cost: 22,
};

export const validReportInput = {
  stopId: "stop_A",
  category: "poor_lighting",
  text: "Stop par raat mein andhera rehta hai",
};

export const validReport = {
  ...validReportInput,
  id: "rep_001",
  textRedacted: "Stop par raat mein andhera rehta hai",
  lang: "hi",
  severity: "medium",
  clusterId: "cl_1",
  needsHumanReview: false,
  triage: {
    source: "rules",
    promptVersion: "v1",
  },
  createdAt: 1729700000000,
};

export const validTrip = {
  token: "0123456789abcdef0123456789abcdef", // exactly 32 hex chars
  routeId: "route_23",
  busId: "bus_23_1",
  boardingStopId: "stop_A",
  destinationStopId: "stop_gomtinagar",
  state: "WAITING",
  expiresAt: 1729707200000,
  createdAt: 1729700000000,
};

export const validStopAggregate = {
  stopId: "stop_A",
  avgEveningWaitMin: 18.0,
  safetyReports30d: 7,
  serviceReports30d: 2,
  corroborationWeight: 1.0,
  waitByHour: {
    "19": 17.5,
    "20": 18.2,
    "21": 18.5,
  },
  priority: 318,
  updatedAt: 1729700000000,
};

export const validAiLog = {
  flow: "triageReport",
  promptVersion: "triageReport.v1",
  model: "gemini-2.0-flash",
  source: "genkit",
  inputHash: "sha256_mock_hash",
  guard: {
    piiRedacted: true,
    injectionFlag: false,
    bannedPhraseBlocked: false,
  },
  latencyMs: 340,
  outcome: "ok",
  expiresAt: 1729707200000,
};
