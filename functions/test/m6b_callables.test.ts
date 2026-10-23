import { describe, it, expect, vi } from "vitest";
import { createOperatorAlertHandler } from "../src/callables/createOperatorAlert.js";
import { updateIncidentHandler } from "../src/callables/updateIncident.js";
import { exportReportHandler } from "../src/callables/exportReport.js";
import { getEtaHandler } from "../src/callables/getEta.js";

describe("Milestone M6b: Cloud Functions Callables", () => {
  describe("createOperatorAlert (M6b P2-20)", () => {
    it("rejects non-operator callers with permission-denied", async () => {
      await expect(
        createOperatorAlertHandler(
          {
            type: "STOP_CLOSED",
            severity: "high",
            message: "Stop closed due to construction",
            affectedStopIds: ["stop_A"],
          },
          undefined,
        ),
      ).rejects.toThrow(/Operator claim required/);
    });

    it("publishes service alert when called by operator", async () => {
      const writer = vi.fn().mockResolvedValue(undefined);
      const alert = await createOperatorAlertHandler(
        {
          type: "DIVERSION",
          severity: "medium",
          message: "Route 23 diverted via Ring Road",
          messageHi: "रूट 23 रिंग रोड के रास्ते डायवर्ट किया गया",
          affectedStopIds: ["stop_A", "stop_B"],
          routeId: "route_23",
        },
        "operator",
        1700000000000,
        writer,
      );

      expect(alert.type).toBe("DIVERSION");
      expect(alert.source).toBe("operator");
      expect(alert.severity).toBe("medium");
      expect(alert.status).toBe("NEW");
      expect(writer).toHaveBeenCalledWith("alerts", alert.id, expect.any(Object));
    });
  });

  describe("updateIncident (M6b P2-17)", () => {
    it("rejects non-operator callers", async () => {
      await expect(
        updateIncidentHandler(
          {
            id: "inc_1",
            kind: "alert",
            refId: "alert_1",
            status: "IN_REVIEW",
            note: "Investigating delay",
          },
          "rider",
        ),
      ).rejects.toThrow(/Operator claim required/);
    });

    it("updates incident status and operator note", async () => {
      const writer = vi.fn().mockResolvedValue(undefined);
      const inc = await updateIncidentHandler(
        {
          id: "inc_1",
          kind: "report",
          refId: "rep_123",
          stopId: "stop_A",
          status: "RESOLVED",
          note: "Street light repaired by municipality",
        },
        "operator",
        1700000050000,
        writer,
      );

      expect(inc.status).toBe("RESOLVED");
      expect(inc.note).toBe("Street light repaired by municipality");
      expect(writer).toHaveBeenCalledWith("incidents", "inc_1", expect.any(Object));
    });
  });

  describe("exportReport (M6b P2-18 / D12)", () => {
    it("rejects non-operator callers", async () => {
      await expect(exportReportHandler(undefined)).rejects.toThrow(/Operator claim required/);
    });

    it("exports PII-free stop and route aggregates in CSV format", async () => {
      const res = await exportReportHandler("operator");
      expect(res.rowCount).toBeGreaterThan(0);
      expect(res.csv).toContain("stop_id,stop_name,ridership_evening");
      expect(res.csv).toContain('"stop_A"');
      // Assert zero PII / no phone numbers or personal names
      expect(res.csv).not.toMatch(/phone|email|password|token/i);
    });
  });

  describe("getEta (F16)", () => {
    it("computes authoritative ETA confidence band for stops", async () => {
      const resA = await getEtaHandler({ stopId: "stop_A" });
      expect(resA.meanMin).toBe(14);
      expect(resA.lowMin).toBeLessThan(resA.meanMin);
      expect(resA.highMin).toBeGreaterThan(resA.meanMin);
      expect(resA.confidence).toBe(0.8);

      const resB = await getEtaHandler({ stopId: "stop_B" });
      expect(resB.meanMin).toBe(4);
    });
  });
});
