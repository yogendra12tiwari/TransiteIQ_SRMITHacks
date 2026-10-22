import { onCall } from "firebase-functions/v2/https";
import { setGlobalOptions } from "firebase-functions/v2";
import { PACKAGE_NAME, VERSION } from "@transitiq/shared";
import { createTripShareHandler } from "./callables/createTripShare.js";
import { endTripHandler } from "./callables/endTrip.js";

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
