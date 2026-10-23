import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  Stop,
  Route,
  SafeSpot,
  HelpPoint,
  Report,
  isSafetyRelated,
  haversineM,
} from "../shared/src/index.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function verifySeed(): void {
  console.log("=== TransitIQ Seed Verification ===");

  // 1. Verify stops.json
  const stopsPath = path.resolve(__dirname, "../seed/stops.json");
  const rawStops = JSON.parse(fs.readFileSync(stopsPath, "utf-8"));
  if (!Array.isArray(rawStops)) throw new Error("stops.json must be an array");

  const stops = rawStops.map((s) => Stop.parse(s));
  if (stops.length < 16) throw new Error(`Expected >= 16 stops, found ${stops.length}`);

  const stopA = stops.find((s) => s.id === "stop_A");
  if (!stopA) throw new Error("stop_A not found in stops.json");
  if (stopA.activity !== 0.2) throw new Error(`stop_A activity must be 0.2, got ${stopA.activity}`);
  if (stopA.lighting !== "poor") throw new Error(`stop_A lighting must be poor, got ${stopA.lighting}`);

  const stopB = stops.find((s) => s.id === "stop_B");
  if (!stopB) throw new Error("stop_B not found in stops.json");
  if (stopB.activity !== 0.8) throw new Error(`stop_B activity must be 0.8, got ${stopB.activity}`);

  const distAB = haversineM([stopA.lat, stopA.lng], [stopB.lat, stopB.lng]);
  if (distAB < 300 || distAB > 450) {
    throw new Error(`Distance between Stop A and Stop B must be 300-450m, got ${distAB.toFixed(1)}m`);
  }
  console.log(`✓ stops.json: 16 stops validated (Stop A-B dist: ${distAB.toFixed(1)}m)`);

  // 2. Verify routes.json
  const routesPath = path.resolve(__dirname, "../seed/routes.json");
  const rawRoutes = JSON.parse(fs.readFileSync(routesPath, "utf-8"));
  const routes = rawRoutes.map((r: unknown) => Route.parse(r));
  if (routes.length !== 4) throw new Error(`Expected 4 routes, found ${routes.length}`);

  const r23 = routes.find((r) => r.id === "route_23");
  if (!r23?.stopIds.includes("stop_A")) throw new Error("Route 23 must serve stop_A");

  const r7 = routes.find((r) => r.id === "route_7");
  const r41 = routes.find((r) => r.id === "route_41");
  if (!r7?.stopIds.includes("stop_B") || !r41?.stopIds.includes("stop_B")) {
    throw new Error("Route 7 and Route 41 must serve stop_B");
  }
  console.log("✓ routes.json: 4 routes validated");

  // 3. Verify safeSpots.json
  const safeSpotsPath = path.resolve(__dirname, "../seed/safeSpots.json");
  const rawSafeSpots = JSON.parse(fs.readFileSync(safeSpotsPath, "utf-8"));
  const safeSpots = rawSafeSpots.map((s: unknown) => SafeSpot.parse(s));
  if (safeSpots.length < 10) throw new Error(`Expected >= 10 safe spots, found ${safeSpots.length}`);
  console.log(`✓ safeSpots.json: ${safeSpots.length} safe spots validated`);

  // 4. Verify reports.json
  const reportsPath = path.resolve(__dirname, "../seed/reports.json");
  const rawReports = JSON.parse(fs.readFileSync(reportsPath, "utf-8"));
  const reports = rawReports.map((r: unknown) => Report.parse(r));

  const stopAReports = reports.filter((r) => r.stopId === "stop_A");
  const stopASafetyReports = stopAReports.filter((r) => isSafetyRelated(r.category));

  if (stopAReports.length !== 9) {
    throw new Error(`Stop A must have exactly 9 total reports, found ${stopAReports.length}`);
  }
  if (stopASafetyReports.length !== 7) {
    throw new Error(`Stop A must have exactly 7 safety-related reports, found ${stopASafetyReports.length}`);
  }
  console.log(`✓ reports.json: ${reports.length} reports validated (Stop A: exactly 7 safety-related)`);

  // 5. Verify history.json
  const historyPath = path.resolve(__dirname, "../seed/history.json");
  const history = JSON.parse(fs.readFileSync(historyPath, "utf-8"));

  const stopAHistory = history["stop_A"] as Array<{ hour: number; waitMin: number }>;
  if (!stopAHistory) throw new Error("History missing for stop_A");

  const stopAEvening = stopAHistory.filter((r) => r.hour >= 19 && r.hour <= 22);
  const avgWaitA = stopAEvening.reduce((sum, r) => sum + r.waitMin, 0) / stopAEvening.length;

  if (Math.abs(avgWaitA - 18.0) > 0.5) {
    throw new Error(`Stop A evening average wait must be 18.0 ± 0.5 min, got ${avgWaitA.toFixed(2)}`);
  }

  const stopBHistory = history["stop_B"] as Array<{ hour: number; waitMin: number }>;
  const stopBEvening = stopBHistory.filter((r) => r.hour >= 19 && r.hour <= 22);
  const avgWaitB = stopBEvening.reduce((sum, r) => sum + r.waitMin, 0) / stopBEvening.length;

  if (Math.abs(avgWaitB - 4.0) > 0.5) {
    throw new Error(`Stop B evening average wait must be 4.0 ± 0.5 min, got ${avgWaitB.toFixed(2)}`);
  }
  console.log(
    `✓ history.json: Stop A evening wait = ${avgWaitA.toFixed(2)} min, Stop B = ${avgWaitB.toFixed(2)} min`,
  );

  // 6. Verify incidents.json
  const incidentsPath = path.resolve(__dirname, "../seed/incidents.json");
  const incidents = JSON.parse(fs.readFileSync(incidentsPath, "utf-8"));
  if (!incidents.events || incidents.events.length < 3) {
    throw new Error("incidents.json must contain at least 3 scripted events");
  }
  console.log(`✓ incidents.json: ${incidents.events.length} scripted incidents validated`);

  // 7. Verify helpPoints.json (M6b P2-23)
  const helpPointsPath = path.resolve(__dirname, "../seed/helpPoints.json");
  const rawHelpPoints = JSON.parse(fs.readFileSync(helpPointsPath, "utf-8"));
  const helpPoints = rawHelpPoints.map((h: unknown) => HelpPoint.parse(h));
  if (helpPoints.length < 5) {
    throw new Error(`Expected >= 5 help points, found ${helpPoints.length}`);
  }
  console.log(`✓ helpPoints.json: ${helpPoints.length} emergency help points validated`);

  console.log("=== All seed files verified successfully ===");
}

verifySeed();
