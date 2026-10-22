import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { findPlaceById, planRoutes, generateTakeaway, type Stop, type Route } from "../shared/src/index.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function verifyDemo(): void {
  console.log("=== TransitIQ Demo Route Numbers Verification (M4-13, M4-27) ===\n");

  const stopsPath = path.resolve(__dirname, "../seed/stops.json");
  const routesPath = path.resolve(__dirname, "../seed/routes.json");

  const stops: Stop[] = JSON.parse(fs.readFileSync(stopsPath, "utf-8"));
  const routes: Route[] = JSON.parse(fs.readFileSync(routesPath, "utf-8"));
  const network = { stops, routes };

  const origin = findPlaceById("place_lohia_crossing");
  if (!origin) throw new Error("place_lohia_crossing place not found");

  const destination = findPlaceById("place_gomtinagar");
  if (!destination) throw new Error("place_gomtinagar place not found");

  const options = planRoutes({
    origin,
    destination,
    network,
    hour: 20,
    alpha: 0.5,
  });

  const fastest = options.find((o) => o.label === "Fastest");
  const safer = options.find((o) => o.label === "Safer");

  if (!fastest) throw new Error("No Fastest option produced");
  if (!safer) throw new Error("No Safer option produced");

  console.log("Planned Trip: Lohia Path Crossing → Gomti Nagar at 20:00 (Evening Peak)");
  console.log("--------------------------------------------------------------------------------");
  console.log(
    `Fastest: Travel ${fastest.travelMin}m | Wait ${fastest.waitMin}m (${fastest.boardingStopId}) | Exposure ${fastest.exposureMinutes}m | Risk: ${fastest.riskLabel}`,
  );
  console.log(
    `Safer:   Travel ${safer.travelMin}m | Wait ${safer.waitMin}m (${safer.boardingStopId}) | Exposure ${safer.exposureMinutes}m | Risk: ${safer.riskLabel}`,
  );

  const takeaway = generateTakeaway(fastest, safer, "en");
  console.log(`Takeaway: "${takeaway}"\n`);

  // Assert golden contract
  if (fastest.travelMin !== 28) throw new Error(`Fastest travel must be 28, got ${fastest.travelMin}`);
  if (fastest.waitMin !== 14) throw new Error(`Fastest wait must be 14, got ${fastest.waitMin}`);
  if (fastest.exposureMinutes !== 16)
    throw new Error(`Fastest exposure must be 16, got ${fastest.exposureMinutes}`);
  if (fastest.riskLabel !== "High") throw new Error(`Fastest risk must be High, got ${fastest.riskLabel}`);
  if (fastest.boardingStopId !== "stop_A")
    throw new Error(`Fastest boarding stop must be stop_A, got ${fastest.boardingStopId}`);

  if (safer.travelMin !== 32) throw new Error(`Safer travel must be 32, got ${safer.travelMin}`);
  if (safer.waitMin !== 4) throw new Error(`Safer wait must be 4, got ${safer.waitMin}`);
  if (safer.exposureMinutes !== 3) throw new Error(`Safer exposure must be 3, got ${safer.exposureMinutes}`);
  if (safer.riskLabel !== "Low") throw new Error(`Safer risk must be Low, got ${safer.riskLabel}`);
  if (safer.boardingStopId !== "stop_B")
    throw new Error(`Safer boarding stop must be stop_B, got ${safer.boardingStopId}`);

  if (takeaway !== "4 extra minutes saves 10 minutes of unsafe waiting") {
    throw new Error(`Takeaway text mismatch: "${takeaway}"`);
  }

  console.log("✓ All demo numbers match golden contract (build_plan §8.4 / PRD §9.4)");
}

try {
  verifyDemo();
} catch (err) {
  console.error("❌ Demo verification failed:", err);
  process.exit(1);
}
