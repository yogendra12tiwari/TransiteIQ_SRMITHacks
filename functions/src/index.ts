import { onCall } from "firebase-functions/v2/https";
import { setGlobalOptions } from "firebase-functions/v2";
import { PACKAGE_NAME, VERSION } from "@transitiq/shared";

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
