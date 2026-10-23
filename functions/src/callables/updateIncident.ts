import { HttpsError } from "firebase-functions/v2/https";
import { type Incident, IncidentStatus } from "@transitiq/shared";
import { z } from "zod";

const UpdateIncidentInput = z.object({
  id: z.string().min(1),
  kind: z.enum(["alert", "report"]).default("alert"),
  refId: z.string().min(1),
  stopId: z.string().optional(),
  routeId: z.string().optional(),
  status: IncidentStatus,
  note: z.string().max(300).default(""),
});

export async function updateIncidentHandler(
  input: unknown,
  role?: string,
  nowMs = Date.now(),
  writer?: (col: string, id: string, data: Record<string, unknown>) => Promise<void>,
): Promise<Incident> {
  if (role !== "operator") {
    throw new HttpsError("permission-denied", "Operator claim required to manage incidents");
  }

  const parsed = UpdateIncidentInput.parse(input);
  const incident: Incident = {
    id: parsed.id,
    kind: parsed.kind,
    refId: parsed.refId,
    stopId: parsed.stopId,
    routeId: parsed.routeId,
    status: parsed.status,
    note: parsed.note,
    updatedAt: nowMs,
  };

  if (writer) {
    await writer("incidents", incident.id, incident as unknown as Record<string, unknown>);
  }

  return incident;
}
