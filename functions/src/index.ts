import { onCall } from "firebase-functions/v2/https";
import { setGlobalOptions } from "firebase-functions/v2";
import { PACKAGE_NAME, VERSION } from "@transitiq/shared";
import { createTripShareHandler } from "./callables/createTripShare.js";
import { endTripHandler } from "./callables/endTrip.js";
import { submitReportHandler } from "./callables/submitReport.js";
import { dashboardSummaryHandler } from "./callables/dashboardSummary.js";
import { explainRiskFlow } from "./flows/explainRisk.js";

// PRD §8: Default region asia-south1 (Mumbai)
setGlobalOptions({ region: "asia-south1" });

export const health = onCall((_request) => {
  return {
    ok: true,
    package: PACKAGE_NAME,
    version: VERSION,
    timestamp: Date.now(),
  };
});

export const createTripShare = onCall(async (request) => {
  return createTripShareHandler(request.data, request.auth?.uid);
});

export const endTrip = onCall(async (request) => {
  return endTripHandler(request.data, request.auth?.uid);
});

export const submitReport = onCall(async (request) => {
  return submitReportHandler(request.data, request.auth?.uid);
});

export const dashboardSummary = onCall(async (request) => {
  const role = (request.auth?.token as { role?: string } | undefined)?.role;
  return dashboardSummaryHandler(request.data, role);
});

export const explainRisk = onCall(async (request) => {
  return explainRiskFlow(request.data);
});

// Flow and utility exports
export * from "./flows/constants.js";
export * from "./flows/triageReport.js";
export * from "./flows/explainRisk.js";
export * from "./flows/recommendActions.js";
export * from "./lib/aiLog.js";
