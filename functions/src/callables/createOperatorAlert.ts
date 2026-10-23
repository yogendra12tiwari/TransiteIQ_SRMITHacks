import { HttpsError } from "firebase-functions/v2/https";
import { type Alert, buildOperatorAlert, AlertType } from "@transitiq/shared";
import { z } from "zod";

const CreateOperatorAlertInput = z.object({
  type: AlertType,
  severity: z.enum(["low", "medium", "high"]),
  message: z.string().min(1).max(500),
  messageHi: z.string().max(500).optional(),
  affectedStopIds: z.array(z.string().min(1)),
  routeId: z.string().optional(),
});

export async function createOperatorAlertHandler(
  input: unknown,
  role?: string,
  nowMs = Date.now(),
  writer?: (col: string, id: string, data: Record<string, unknown>) => Promise<void>,
): Promise<Alert> {
  if (role !== "operator") {
    throw new HttpsError("permission-denied", "Operator claim required to publish service alerts");
  }

  const parsed = CreateOperatorAlertInput.parse(input);
  const alert = buildOperatorAlert({
    type: parsed.type,
    severity: parsed.severity,
    message: parsed.message,
    messageHi: parsed.messageHi,
    affectedStopIds: parsed.affectedStopIds,
    routeId: parsed.routeId,
    nowMs,
  });

  if (writer) {
    await writer("alerts", alert.id, alert as unknown as Record<string, unknown>);
  }

  return alert;
}
