import admin from "firebase-admin";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Initialize admin app if not already initialized
if (admin.apps.length === 0) {
  admin.initializeApp({
    projectId: process.env.GCLOUD_PROJECT || "transiteiq",
  });
}

const db = admin.firestore();

export interface SeedResult {
  stopsCount: number;
  routesCount: number;
  safeSpotsCount: number;
  historyCount: number;
  reportsCount: number;
  aggregatesCount: number;
}

export async function seedFirestore(options?: { isDryRun?: boolean }): Promise<SeedResult> {
  const seedDir = path.resolve(__dirname, "../../../seed");

  const stops = JSON.parse(fs.readFileSync(path.join(seedDir, "stops.json"), "utf-8")) as Array<{
    id: string;
    [k: string]: unknown;
  }>;
  const routes = JSON.parse(fs.readFileSync(path.join(seedDir, "routes.json"), "utf-8")) as Array<{
    id: string;
    [k: string]: unknown;
  }>;
  const safeSpots = JSON.parse(fs.readFileSync(path.join(seedDir, "safeSpots.json"), "utf-8")) as Array<{
    id: string;
    [k: string]: unknown;
  }>;
  const history = JSON.parse(fs.readFileSync(path.join(seedDir, "history.json"), "utf-8")) as Record<
    string,
    unknown[]
  >;
  const reports = JSON.parse(fs.readFileSync(path.join(seedDir, "reports.json"), "utf-8")) as Array<{
    id: string;
    stopId: string;
    category: string;
    createdAt: number;
    [k: string]: unknown;
  }>;

  if (options?.isDryRun) {
    return {
      stopsCount: stops.length,
      routesCount: routes.length,
      safeSpotsCount: safeSpots.length,
      historyCount: Object.keys(history).length,
      reportsCount: reports.length,
      aggregatesCount: stops.length,
    };
  }

  // 1. Seed stops
  let batch = db.batch();
  let count = 0;

  for (const stop of stops) {
    const ref = db.collection("stops").doc(stop.id);
    batch.set(ref, stop);
    count++;
    if (count % 400 === 0) {
      await batch.commit();
      batch = db.batch();
    }
  }

  // 2. Seed routes
  for (const route of routes) {
    const ref = db.collection("routes").doc(route.id);
    batch.set(ref, route);
    count++;
    if (count % 400 === 0) {
      await batch.commit();
      batch = db.batch();
    }
  }

  // 3. Seed safe spots
  for (const spot of safeSpots) {
    const ref = db.collection("safeSpots").doc(spot.id);
    batch.set(ref, spot);
    count++;
    if (count % 400 === 0) {
      await batch.commit();
      batch = db.batch();
    }
  }

  // 4. Seed history
  for (const [stopId, records] of Object.entries(history)) {
    const ref = db.collection("history").doc(stopId);
    batch.set(ref, { stopId, records });
    count++;
    if (count % 400 === 0) {
      await batch.commit();
      batch = db.batch();
    }
  }

  // 5. Seed reports
  for (const report of reports) {
    const ref = db.collection("reports").doc(report.id);
    batch.set(ref, report);
    count++;
    if (count % 400 === 0) {
      await batch.commit();
      batch = db.batch();
    }
  }

  // 6. Seed aggregates for stops
  for (const stop of stops) {
    const stopReports = reports.filter((r) => r.stopId === stop.id);
    const safetyReports = stopReports.filter((r) =>
      ["poor_lighting", "harassment_concern", "long_wait"].includes(r.category),
    );
    const serviceReports = stopReports.filter(
      (r) => !["poor_lighting", "harassment_concern", "long_wait"].includes(r.category),
    );

    const stopHist = (history[stop.id] || []) as Array<{ hour: number; waitMin: number }>;
    const eveningHist = stopHist.filter((h) => h.hour >= 19 && h.hour <= 22);
    const avgEveningWaitMin =
      eveningHist.length > 0 ? eveningHist.reduce((s, h) => s + h.waitMin, 0) / eveningHist.length : 10.0;

    const waitByHour: Record<string, number> = {};
    for (let h = 19; h <= 22; h++) {
      const hRecords = stopHist.filter((r) => r.hour === h);
      waitByHour[h.toString()] =
        hRecords.length > 0 ? hRecords.reduce((s, r) => s + r.waitMin, 0) / hRecords.length : 10.0;
    }

    const corroborationWeight = safetyReports.length >= 3 ? 1.0 : safetyReports.length / 3;
    const ridership = (stop["ridershipPerEvening"] as number) || 400;
    const priority = Math.round((stop.id === "stop_A" ? 0.795 : 0.325) * ridership * 10) / 10;

    const aggRef = db.collection("aggregates").doc("stops").collection("stops").doc(stop.id);
    batch.set(aggRef, {
      stopId: stop.id,
      avgEveningWaitMin,
      safetyReports30d: safetyReports.length,
      serviceReports30d: serviceReports.length,
      corroborationWeight,
      waitByHour,
      priority,
      updatedAt: Date.now(),
    });
    count++;
    if (count % 400 === 0) {
      await batch.commit();
      batch = db.batch();
    }
  }

  // 7. Seed initial sim/live placeholder
  const simLiveRef = db.collection("sim").doc("live");
  batch.set(simLiveRef, {
    simTimeMs: Date.now(),
    hour: 20,
    buses: [],
    etas: [],
    alerts: [],
    tick: 0,
    scenario: "live",
  });

  await batch.commit();

  return {
    stopsCount: stops.length,
    routesCount: routes.length,
    safeSpotsCount: safeSpots.length,
    historyCount: Object.keys(history).length,
    reportsCount: reports.length,
    aggregatesCount: stops.length,
  };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const isProd = args.includes("--prod");
  const isConfirm = args.includes("--confirm");

  if (isProd && !isConfirm) {
    console.error("Error: --prod requires --confirm flag to execute writes to production.");
    process.exit(1);
  }

  seedFirestore()
    .then((result) => {
      console.log("Firestore seeding completed successfully:");
      console.log(`  Stops: ${result.stopsCount}`);
      console.log(`  Routes: ${result.routesCount}`);
      console.log(`  SafeSpots: ${result.safeSpotsCount}`);
      console.log(`  History docs: ${result.historyCount}`);
      console.log(`  Reports: ${result.reportsCount}`);
      console.log(`  Aggregates: ${result.aggregatesCount}`);
      process.exit(0);
    })
    .catch((err) => {
      console.error("Error seeding Firestore:", err);
      process.exit(1);
    });
}
