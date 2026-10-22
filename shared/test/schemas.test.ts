import { describe, it, expect } from "vitest";
import {
  Stop,
  Route,
  SafeSpot,
  Bus,
  EtaResult,
  Alert,
  SimLive,
  WaitRisk,
  RouteOption,
  ReportInput,
  Report,
  Trip,
  StopAggregate,
  AiLog,
  SAFETY_CATEGORIES,
  isSafetyRelated,
} from "../src/index.js";
import {
  validStop,
  validRoute,
  validSafeSpot,
  validBus,
  validEta,
  validAlert,
  validSimLive,
  validWaitRisk,
  validRouteOption,
  validReportInput,
  validReport,
  validTrip,
  validStopAggregate,
  validAiLog,
} from "./fixtures/schemas.fixtures.js";

describe("Zod Schemas — Valid Fixtures", () => {
  it("validates Stop", () => {
    expect(Stop.parse(validStop)).toMatchObject(validStop);
  });

  it("validates Route", () => {
    expect(Route.parse(validRoute)).toMatchObject(validRoute);
  });

  it("validates SafeSpot", () => {
    expect(SafeSpot.parse(validSafeSpot)).toMatchObject(validSafeSpot);
  });

  it("validates Bus", () => {
    expect(Bus.parse(validBus)).toMatchObject(validBus);
  });

  it("validates EtaResult", () => {
    expect(EtaResult.parse(validEta)).toMatchObject(validEta);
  });

  it("validates Alert", () => {
    expect(Alert.parse(validAlert)).toMatchObject(validAlert);
  });

  it("validates SimLive", () => {
    expect(SimLive.parse(validSimLive)).toMatchObject(validSimLive);
  });

  it("validates WaitRisk", () => {
    expect(WaitRisk.parse(validWaitRisk)).toMatchObject(validWaitRisk);
  });

  it("validates RouteOption", () => {
    expect(RouteOption.parse(validRouteOption)).toMatchObject(validRouteOption);
  });

  it("validates ReportInput and Report", () => {
    expect(ReportInput.parse(validReportInput)).toMatchObject(validReportInput);
    expect(Report.parse(validReport)).toMatchObject(validReport);
  });

  it("validates Trip", () => {
    expect(Trip.parse(validTrip)).toMatchObject(validTrip);
  });

  it("validates StopAggregate", () => {
    expect(StopAggregate.parse(validStopAggregate)).toMatchObject(validStopAggregate);
  });

  it("validates AiLog", () => {
    expect(AiLog.parse(validAiLog)).toMatchObject(validAiLog);
  });

  it("correctly evaluates safety-related categories (Decision D1)", () => {
    expect(SAFETY_CATEGORIES).toContain("poor_lighting");
    expect(SAFETY_CATEGORIES).toContain("harassment_concern");
    expect(SAFETY_CATEGORIES).toContain("long_wait");
    expect(isSafetyRelated("poor_lighting")).toBe(true);
    expect(isSafetyRelated("harassment_concern")).toBe(true);
    expect(isSafetyRelated("long_wait")).toBe(true);
    expect(isSafetyRelated("skipped_bus")).toBe(false);
    expect(isSafetyRelated("overcrowding")).toBe(false);
  });
});

describe("Zod Schemas — Invalid Fixtures & Boundary Rejections", () => {
  it("rejects Stop with lat > 90 or activity > 1", () => {
    expect(() => Stop.parse({ ...validStop, lat: 95 })).toThrow();
    expect(() => Stop.parse({ ...validStop, activity: 1.5 })).toThrow();
  });

  it("rejects Route with less than 2 stops", () => {
    expect(() => Route.parse({ ...validRoute, stopIds: ["stop_1"] })).toThrow();
  });

  it("rejects SimLive with hour > 23", () => {
    expect(() => SimLive.parse({ ...validSimLive, hour: 24 })).toThrow();
  });

  it("rejects ReportInput with text > 500 characters", () => {
    const longText = "a".repeat(501);
    expect(() => ReportInput.parse({ ...validReportInput, text: longText })).toThrow();
  });

  it("rejects Trip with token length != 32", () => {
    expect(() => Trip.parse({ ...validTrip, token: "too_short" })).toThrow();
    expect(() => Trip.parse({ ...validTrip, token: "a".repeat(33) })).toThrow();
  });

  it("rejects WaitRisk with score out of bounds", () => {
    expect(() => WaitRisk.parse({ ...validWaitRisk, score: 1.2 })).toThrow();
    expect(() => WaitRisk.parse({ ...validWaitRisk, score: -0.1 })).toThrow();
  });
});

describe("M1-12 No-PII Schema Guarantee", () => {
  it("asserts Report schema shape has no PII keys", () => {
    const reportKeys = Object.keys(Report.shape);
    const piiPattern = /^(name|phone|mobile|email|uid|device|lat|lng|location)$/i;

    for (const key of reportKeys) {
      expect(key).not.toMatch(piiPattern);
    }
  });

  it("asserts Trip schema shape has no personal identification keys", () => {
    const tripKeys = Object.keys(Trip.shape);
    const piiPattern = /^(name|phone|mobile|email|uid|device|rider|passenger)$/i;

    for (const key of tripKeys) {
      expect(key).not.toMatch(piiPattern);
    }
  });
});
