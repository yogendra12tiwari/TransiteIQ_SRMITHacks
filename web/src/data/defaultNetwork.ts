import stopsRaw from "../../../seed/stops.json";
import routesRaw from "../../../seed/routes.json";
import safeSpotsRaw from "../../../seed/safeSpots.json";
import helpPointsRaw from "../../../seed/helpPoints.json";
import { Stop, Route, SafeSpot, HelpPoint } from "@transitiq/shared";

export const DEFAULT_STOPS: Stop[] = stopsRaw.map((s) => Stop.parse(s));
export const DEFAULT_ROUTES: Route[] = routesRaw.map((r) => Route.parse(r));
export const DEFAULT_SAFE_SPOTS: SafeSpot[] = safeSpotsRaw.map((sp) => SafeSpot.parse(sp));
export const DEFAULT_HELP_POINTS: HelpPoint[] = helpPointsRaw.map((hp) => HelpPoint.parse(hp));
