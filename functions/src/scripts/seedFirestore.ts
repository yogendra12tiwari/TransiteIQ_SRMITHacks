import admin from "firebase-admin";
import type { Firestore } from "@google-cloud/firestore";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export interface SeedResult {
  stopsCount: number;
  routesCount: number;
  safeSpotsCount: number;
  historyCount: number;
  reportsCount: number;
  aggregatesCount: number;
  helpPointsCount?: number;
  incidentsCount?: number;
}

function getCliAccessToken(): string | null {
  const configPath = path.join(os.homedir(), ".config", "configstore", "firebase-tools.json");
  if (fs.existsSync(configPath)) {
    try {
      const config = JSON.parse(fs.readFileSync(configPath, "utf-8"));
      return config.tokens?.access_token || null;
    } catch {
      return null;
    }
  }
  return null;
}

function toFirestoreValue(val: unknown): Record<string, unknown> {
  if (val === null || val === undefined) return { nullValue: null };
  if (typeof val === "boolean") return { booleanValue: val };
  if (typeof val === "number") {
    return Number.isInteger(val) ? { integerValue: String(val) } : { doubleValue: val };
  }
  if (typeof val === "string") return { stringValue: val };
  if (Array.isArray(val)) {
    return { arrayValue: { values: val.map(toFirestoreValue) } };
  }
  if (typeof val === "object") {
    const fields: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(val as Record<string, unknown>)) {
      fields[k] = toFirestoreValue(v);
    }
    return { mapValue: { fields } };
  }
  return { stringValue: String(val) };
}

async function writeDocRest(
  projectId: string,
  docPath: string,
  data: Record<string, unknown>,
  token: string,
): Promise<void> {
  const fields: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(data)) {
    fields[k] = toFirestoreValue(v);
  }
  const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/${docPath}`;
  const res = await fetch(url, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ fields }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`REST write to ${docPath} failed (${res.status}): ${text}`);
  }
}

export async function seedFirestore(options?: { isDryRun?: boolean }): Promise<SeedResult> {
  const seedDir = path.resolve(__dirname, "../../../seed");
  const projectId = process.env.GCLOUD_PROJECT || "transiteiq";

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
  const helpPointsPath = path.join(seedDir, "helpPoints.json");
  const helpPoints = fs.existsSync(helpPointsPath)
    ? (JSON.parse(fs.readFileSync(helpPointsPath, "utf-8")) as Array<{ id: string; [k: string]: unknown }>)
    : [];
  const incidentsPath = path.join(seedDir, "incidents.json");
  const rawIncidents = fs.existsSync(incidentsPath)
    ? JSON.parse(fs.readFileSync(incidentsPath, "utf-8"))
    : { events: [] };
  const incidents: Array<{ id: string; [k: string]: unknown }> = Array.isArray(rawIncidents)
    ? rawIncidents
    : (rawIncidents.events || []).map((e: Record<string, unknown>, idx: number) => {
        const item: Record<string, unknown> = {
          id: `inc_${String(idx + 1).padStart(3, "0")}`,
          kind: "alert",
          refId: (e.busId as string) || (e.routeId as string) || `event_${idx + 1}`,
          status: "NEW",
          note: (e.description as string) || "",
          updatedAt: Date.now(),
        };
        if (e.stopId) item.stopId = e.stopId;
        if (e.routeId) item.routeId = e.routeId;
        return item;
      });

  if (options?.isDryRun) {
    return {
      stopsCount: stops.length,
      routesCount: routes.length,
      safeSpotsCount: safeSpots.length,
      historyCount: Object.keys(history).length,
      reportsCount: reports.length,
      aggregatesCount: stops.length,
      helpPointsCount: helpPoints.length,
      incidentsCount: incidents.length,
    };
  }

  const cliToken = !process.env.FIRESTORE_EMULATOR_HOST ? getCliAccessToken() : null;

  if (cliToken) {
    // REST execution using authenticated CLI token
    // 1. Stops
    for (const stop of stops) {
      await writeDocRest(projectId, `stops/${stop.id}`, stop, cliToken);
    }

    // 2. Routes (convert polyline tuples to maps for Firestore)
    for (const route of routes) {
      const firestoreRoute = {
        ...route,
        polyline: ((route.polyline as unknown[]) || []).map((pt) => {
          if (Array.isArray(pt)) {
            return { lat: pt[0], lng: pt[1] };
          }
          return pt;
        }),
      };
      await writeDocRest(projectId, `routes/${route.id}`, firestoreRoute, cliToken);
    }

    // 3. Safe spots
    for (const spot of safeSpots) {
      await writeDocRest(projectId, `safeSpots/${spot.id}`, spot, cliToken);
    }

    // 4. History
    for (const [stopId, records] of Object.entries(history)) {
      await writeDocRest(projectId, `history/${stopId}`, { stopId, records }, cliToken);
    }

    // 5. Reports
    for (const report of reports) {
      await writeDocRest(projectId, `reports/${report.id}`, report, cliToken);
    }

    // 6. Aggregates
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

      await writeDocRest(
        projectId,
        `aggregates/stops/stops/${stop.id}`,
        {
          stopId: stop.id,
          avgEveningWaitMin,
          safetyReports30d: safetyReports.length,
          serviceReports30d: serviceReports.length,
          corroborationWeight,
          waitByHour,
          priority,
          updatedAt: Date.now(),
        },
        cliToken,
      );
    }

    // 7. Sim live placeholder
    await writeDocRest(
      projectId,
      "sim/live",
      {
        simTimeMs: Date.now(),
        hour: 20,
        buses: [],
        etas: [],
        alerts: [],
        tick: 0,
        scenario: "live",
      },
      cliToken,
    );

    // 6. Help points
    for (const hp of helpPoints) {
      await writeDocRest(projectId, `helpPoints/${hp.id}`, hp, cliToken);
    }

    // 7. Incidents
    for (const inc of incidents) {
      await writeDocRest(projectId, `incidents/${inc.id}`, inc, cliToken);
    }

    return {
      stopsCount: stops.length,
      routesCount: routes.length,
      safeSpotsCount: safeSpots.length,
      historyCount: Object.keys(history).length,
      reportsCount: reports.length,
      aggregatesCount: stops.length,
      helpPointsCount: helpPoints.length,
      incidentsCount: incidents.length,
    };
  }

  // Admin SDK execution (Emulator or environment with ADC)
  if (admin.apps.length === 0) {
    admin.initializeApp({ projectId });
  }
  const db = admin.firestore() as unknown as Firestore;
  db.settings({ ignoreUndefinedProperties: true });

  let batch = db.batch();
  let count = 0;

  for (const stop of stops) {
    batch.set(db.collection("stops").doc(stop.id), stop);
    count++;
    if (count % 400 === 0) {
      await batch.commit();
      batch = db.batch();
    }
  }

  for (const route of routes) {
    const firestoreRoute = {
      ...route,
      polyline: ((route.polyline as unknown[]) || []).map((pt) => {
        if (Array.isArray(pt)) {
          return { lat: pt[0], lng: pt[1] };
        }
        return pt;
      }),
    };
    batch.set(db.collection("routes").doc(route.id), firestoreRoute);
    count++;
    if (count % 400 === 0) {
      await batch.commit();
      batch = db.batch();
    }
  }

  for (const spot of safeSpots) {
    batch.set(db.collection("safeSpots").doc(spot.id), spot);
    count++;
    if (count % 400 === 0) {
      await batch.commit();
      batch = db.batch();
    }
  }

  for (const [stopId, records] of Object.entries(history)) {
    batch.set(db.collection("history").doc(stopId), { stopId, records });
    count++;
    if (count % 400 === 0) {
      await batch.commit();
      batch = db.batch();
    }
  }

  for (const report of reports) {
    batch.set(db.collection("reports").doc(report.id), report);
    count++;
    if (count % 400 === 0) {
      await batch.commit();
      batch = db.batch();
    }
  }

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

  for (const hp of helpPoints) {
    batch.set(db.collection("helpPoints").doc(hp.id), hp);
    count++;
    if (count % 400 === 0) {
      await batch.commit();
      batch = db.batch();
    }
  }

  for (const inc of incidents) {
    batch.set(db.collection("incidents").doc(inc.id), inc);
    count++;
    if (count % 400 === 0) {
      await batch.commit();
      batch = db.batch();
    }
  }

  batch.set(db.collection("sim").doc("live"), {
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
    helpPointsCount: helpPoints.length,
    incidentsCount: incidents.length,
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
      console.log(`  HelpPoints: ${result.helpPointsCount}`);
      console.log(`  Incidents: ${result.incidentsCount}`);
      process.exit(0);
    })
    .catch((err) => {
      console.error("Error seeding Firestore:", err);
      process.exit(1);
    });
}
