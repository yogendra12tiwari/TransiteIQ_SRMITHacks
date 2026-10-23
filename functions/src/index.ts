import { onCall } from "firebase-functions/v2/https";
import { setGlobalOptions } from "firebase-functions/v2";
import { getApps, initializeApp } from "firebase-admin/app";
import { getFirestore, type Firestore } from "firebase-admin/firestore";
import { PACKAGE_NAME, VERSION } from "@transitiq/shared";
import { createTripShareHandler } from "./callables/createTripShare.js";
import { endTripHandler, type StoredTripDoc } from "./callables/endTrip.js";
import { submitReportHandler } from "./callables/submitReport.js";
import { dashboardSummaryHandler } from "./callables/dashboardSummary.js";
import { createOperatorAlertHandler } from "./callables/createOperatorAlert.js";
import { updateIncidentHandler } from "./callables/updateIncident.js";
import { exportReportHandler } from "./callables/exportReport.js";
import { getEtaHandler } from "./callables/getEta.js";
import { explainRiskFlow } from "./flows/explainRisk.js";

// PRD §8: Default region asia-south1 (Mumbai)
setGlobalOptions({ region: "asia-south1" });

function getSafeDb(): Firestore | null {
  try {
    if (getApps().length === 0) {
      initializeApp();
    }
    const db = getFirestore();
    try {
      db.settings({ ignoreUndefinedProperties: true });
    } catch {
      // Ignore if settings already locked
    }
    return db;
  } catch {
    return null;
  }
}

function cleanUndefined<T extends Record<string, unknown>>(obj: T): Record<string, unknown> {
  const res: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined) {
      res[k] = v;
    }
  }
  return res;
}

export const health = onCall((_request) => {
  return {
    ok: true,
    package: PACKAGE_NAME,
    version: VERSION,
    timestamp: Date.now(),
  };
});

export const createTripShare = onCall(async (request) => {
  return createTripShareHandler(request.data, request.auth?.uid, Date.now(), async (token, tripDoc) => {
    const db = getSafeDb();
    if (db) await db.collection("trips").doc(token).set(cleanUndefined(tripDoc));
  });
});

export const endTrip = onCall(async (request) => {
  return endTripHandler(
    request.data,
    request.auth?.uid,
    async (token) => {
      const db = getSafeDb();
      if (!db) return null;
      const snap = await db.collection("trips").doc(token).get();
      return snap.exists ? (snap.data() as unknown as StoredTripDoc) : null;
    },
    async (token, updates) => {
      const db = getSafeDb();
      if (db) await db.collection("trips").doc(token).set(cleanUndefined(updates), { merge: true });
    },
  );
});

export const submitReport = onCall(async (request) => {
  return submitReportHandler(request.data, request.auth?.uid, Date.now(), async (col, id, data) => {
    const db = getSafeDb();
    if (db) await db.collection(col).doc(id).set(cleanUndefined(data));
  });
});

export const dashboardSummary = onCall(async (request) => {
  const role = (request.auth?.token as { role?: string } | undefined)?.role;
  return dashboardSummaryHandler(request.data, role);
});

export const explainRisk = onCall(async (request) => {
  return explainRiskFlow(request.data);
});

export const createOperatorAlert = onCall(async (request) => {
  const role = (request.auth?.token as { role?: string } | undefined)?.role;
  return createOperatorAlertHandler(request.data, role, Date.now(), async (col, id, data) => {
    const db = getSafeDb();
    if (db) await db.collection(col).doc(id).set(cleanUndefined(data));
  });
});

export const updateIncident = onCall(async (request) => {
  const role = (request.auth?.token as { role?: string } | undefined)?.role;
  return updateIncidentHandler(request.data, role, Date.now(), async (col, id, data) => {
    const db = getSafeDb();
    if (db) await db.collection(col).doc(id).set(cleanUndefined(data));
  });
});

export const exportReport = onCall(async (request) => {
  const role = (request.auth?.token as { role?: string } | undefined)?.role;
  return exportReportHandler(role);
});

export const getEta = onCall(async (request) => {
  return getEtaHandler(request.data);
});

// Flow and utility exports
export * from "./flows/constants.js";
export * from "./flows/triageReport.js";
export * from "./flows/explainRisk.js";
export * from "./flows/recommendActions.js";
export * from "./lib/aiLog.js";
