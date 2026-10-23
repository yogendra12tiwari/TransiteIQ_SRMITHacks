import { useState, useEffect, useRef, useMemo } from "react";
import { MapContainer, TileLayer, Polyline, CircleMarker, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { Route, Stop, Bus, Alert, EtaResult } from "@transitiq/shared";
import { StopSheet } from "./StopSheet";
import { BusSheet } from "./BusSheet";

export interface OverlayRoute {
  id: string;
  color: string;
  polyline: [number, number][];
  name?: string;
  dashArray?: string;
  weight?: number;
}

export interface MapViewProps {
  routes: Route[];
  stops: Stop[];
  buses: Bus[];
  etas?: EtaResult[];
  alerts?: Alert[];
  isStale?: boolean;
  followedStopId?: string;
  selectedRouteId?: string;
  overlayRoutes?: OverlayRoute[];
  originCoord?: [number, number];
  destinationCoord?: [number, number];
  onBusSelect?: (bus: Bus) => void;
  onStopSelect?: (stop: Stop) => void;
}

// Lucknow City Center Coordinates (Hazratganj)
const LUCKNOW_CENTER: [number, number] = [26.8467, 80.9462];

function createBusIcon(routeNumber: string, color: string, isDwelling: boolean, isSelected: boolean = false) {
  return L.divIcon({
    className: "transitiq-bus-icon",
    html: `
      <div class="relative w-12 h-12 -m-2 flex items-center justify-center cursor-pointer select-none" role="button" aria-label="Bus ${routeNumber}">
        <div style="background-color: ${color};" class="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-black shadow-lg border-2 ${
          isSelected
            ? "border-amber-400 ring-4 ring-amber-400/50 scale-110"
            : isDwelling
              ? "border-amber-300 ring-2 ring-amber-300/40"
              : "border-white"
        } transition-transform">
          <span>${routeNumber}</span>
          ${
            isDwelling
              ? '<span class="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-amber-400 rounded-full border border-slate-900 animate-ping"></span>'
              : ""
          }
        </div>
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  });
}

function MapResizer() {
  const map = useMap();
  useEffect(() => {
    // Invalidate map size shortly after mount for proper tile rendering in flex containers
    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 250);
    return () => clearTimeout(timer);
  }, [map]);
  return null;
}

export function MapView({
  routes,
  stops,
  buses,
  etas = [],
  alerts = [],
  isStale = false,
  followedStopId,
  selectedRouteId,
  overlayRoutes = [],
  originCoord,
  destinationCoord,
  onBusSelect,
  onStopSelect,
}: MapViewProps) {
  // Selected bus and stop for detail modals / sheets
  const [selectedBus, setSelectedBus] = useState<Bus | null>(null);
  const [selectedStop, setSelectedStop] = useState<Stop | null>(null);

  // Check for likely skip alerts affecting the followed/selected stop (M3-32)
  const activeSkipAlert = alerts.find(
    (a) =>
      a.type === "LIKELY_SKIP" && a.affectedStopIds.includes(followedStopId ?? selectedStop?.id ?? "stop_A"),
  );

  // Active route visibility filters
  const [visibleRouteIds, setVisibleRouteIds] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    routes.forEach((r) => {
      initial[r.id] = true;
    });
    return initial;
  });

  // Keep visibleRouteIds in sync when routes change
  useEffect(() => {
    setVisibleRouteIds((prev) => {
      const updated = { ...prev };
      routes.forEach((r) => {
        if (updated[r.id] === undefined) updated[r.id] = true;
      });
      return updated;
    });
  }, [routes]);

  // Interpolated bus coordinates for 60fps smooth movement between snapshots
  const [renderedBuses, setRenderedBuses] = useState<Bus[]>(buses);
  const renderedBusesRef = useRef<Bus[]>(buses);
  renderedBusesRef.current = renderedBuses;

  const prevBusesRef = useRef<Map<string, { lat: number; lng: number }>>(new Map());
  const targetBusesRef = useRef<Map<string, { lat: number; lng: number }>>(new Map());
  const lastTweenStartRef = useRef<number>(performance.now());

  useEffect(() => {
    // Whenever new snapshot arrives, record targets and start tween
    const now = performance.now();
    lastTweenStartRef.current = now;

    // Previous positions become current rendered positions
    const newPrev = new Map<string, { lat: number; lng: number }>();
    renderedBusesRef.current.forEach((b) => {
      newPrev.set(b.id, { lat: b.lat, lng: b.lng });
    });
    prevBusesRef.current = newPrev;

    const newTargets = new Map<string, { lat: number; lng: number }>();
    buses.forEach((b) => {
      newTargets.set(b.id, { lat: b.lat, lng: b.lng });
    });
    targetBusesRef.current = newTargets;
  }, [buses]);

  useEffect(() => {
    let animId: number;

    const tick = () => {
      const now = performance.now();
      const elapsed = now - lastTweenStartRef.current;
      const duration = 2000; // 2s tick duration
      const progress = Math.min(1, elapsed / duration);

      setRenderedBuses(() =>
        buses.map((bus) => {
          const prev = prevBusesRef.current.get(bus.id);
          const target = targetBusesRef.current.get(bus.id);
          if (!prev || !target) return bus;

          const lat = prev.lat + (target.lat - prev.lat) * progress;
          const lng = prev.lng + (target.lng - prev.lng) * progress;
          return { ...bus, lat, lng };
        }),
      );

      if (progress < 1) {
        animId = requestAnimationFrame(tick);
      }
    };

    animId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animId);
  }, [buses]);

  const routeColorMap = useMemo(() => {
    const map = new Map<string, string>();
    routes.forEach((r) => map.set(r.id, r.color));
    return map;
  }, [routes]);

  const toggleRoute = (id: string) => {
    setVisibleRouteIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleBusClick = (bus: Bus) => {
    setSelectedBus(bus);
    if (onBusSelect) onBusSelect(bus);
  };

  const selectedBusRoute = selectedBus ? routes.find((r) => r.id === selectedBus.routeId) : null;

  return (
    <div data-testid="map-view-container" className="relative w-full h-full flex flex-col min-h-[500px]">
      {/* Stale Data Warning Banner */}
      {isStale && (
        <div
          data-testid="stale-data-banner"
          className="absolute top-3 left-1/2 -translate-x-1/2 z-[1000] px-4 py-1.5 rounded-full bg-amber-500/90 text-slate-950 font-semibold text-xs shadow-xl backdrop-blur flex items-center space-x-2 select-none"
        >
          <span className="animate-spin text-sm">⏳</span>
          <span>Simulation feed paused / waiting for updates</span>
        </div>
      )}

      {/* Likely Skip Alert Banner (M3-32) */}
      {activeSkipAlert && (
        <div
          data-testid="likely-skip-banner"
          className="absolute top-12 left-1/2 -translate-x-1/2 z-[1000] px-4 py-2 rounded-xl bg-rose-600/95 text-white font-semibold text-xs shadow-2xl backdrop-blur flex items-center space-x-2 border border-rose-400 max-w-[90%]"
        >
          <span className="text-base">⚠️</span>
          <span>{activeSkipAlert.message}</span>
        </div>
      )}

      {/* Route Filter Legend Overlay */}
      <div className="absolute top-3 left-3 z-[1000] p-2.5 rounded-xl bg-slate-900/85 backdrop-blur border border-slate-700/80 shadow-xl max-w-xs space-y-1.5 text-xs text-white">
        <div className="font-bold text-[11px] uppercase tracking-wider text-slate-400">
          Routes ({routes.length})
        </div>
        <div className="flex flex-wrap gap-1.5">
          {routes.map((r) => {
            const isVisible = visibleRouteIds[r.id] !== false;
            return (
              <button
                key={r.id}
                onClick={() => toggleRoute(r.id)}
                className={`px-2.5 py-1 rounded-md text-[11px] font-medium flex items-center space-x-1.5 transition ${
                  isVisible
                    ? "bg-slate-800 text-white border border-slate-600"
                    : "bg-slate-950/60 text-slate-500 border border-slate-800 line-through"
                }`}
              >
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: r.color }} />
                <span>{r.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Map Container */}
      <div className="flex-1 w-full h-full min-h-[500px] relative">
        <MapContainer
          center={LUCKNOW_CENTER}
          zoom={13}
          scrollWheelZoom={true}
          className="w-full h-full min-h-[500px] z-0"
        >
          <MapResizer />

          {/* OpenStreetMap Tile Layer with Required Attribution */}
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {/* Route Polylines: Selected route 7px / 1.0 opacity, other routes dimmed to 40% (U1-03) */}
          {routes.map((route) => {
            if (visibleRouteIds[route.id] === false) return null;
            const activeRouteId = selectedRouteId || selectedBus?.routeId;
            const isAnyEmphasized = Boolean(activeRouteId);
            const isSelected = activeRouteId === route.id;

            return (
              <Polyline
                key={route.id}
                positions={route.polyline as [number, number][]}
                pathOptions={{
                  color: route.color,
                  weight: isSelected ? 7 : 5,
                  opacity: isAnyEmphasized ? (isSelected ? 1.0 : 0.4) : 0.85,
                }}
              />
            );
          })}

          {/* Overlay Route Polylines (e.g., Planner Comparison M4-20) */}
          {overlayRoutes.map((over) => (
            <Polyline
              key={over.id}
              positions={over.polyline}
              pathOptions={{
                color: over.color,
                weight: over.weight ?? 6,
                dashArray: over.dashArray,
                opacity: 0.95,
              }}
            />
          ))}

          {/* Origin and Destination Markers */}
          {originCoord && (
            <CircleMarker
              center={originCoord}
              radius={8}
              pathOptions={{
                color: "#3b82f6",
                fillColor: "#60a5fa",
                fillOpacity: 1,
                weight: 3,
              }}
            >
              <Popup className="transitiq-popup">
                <div className="text-xs font-bold text-slate-900 p-1">Trip Origin</div>
              </Popup>
            </CircleMarker>
          )}

          {destinationCoord && (
            <CircleMarker
              center={destinationCoord}
              radius={8}
              pathOptions={{
                color: "#10b981",
                fillColor: "#34d399",
                fillOpacity: 1,
                weight: 3,
              }}
            >
              <Popup className="transitiq-popup">
                <div className="text-xs font-bold text-slate-900 p-1">Trip Destination</div>
              </Popup>
            </CircleMarker>
          )}

          {/* Stops Circle Markers: 20px (radius 10); risky stop gets ring + "Quiet stop" text (U1-03) */}
          {stops.map((stop) => {
            const isQuiet = stop.id === "stop_A" || stop.activity <= 0.3 || stop.lighting === "poor";
            const isSelectedStop = selectedStop?.id === stop.id;

            return (
              <CircleMarker
                key={stop.id}
                center={[stop.lat, stop.lng]}
                radius={10}
                eventHandlers={{
                  click: () => {
                    setSelectedStop(stop);
                    if (onStopSelect) onStopSelect(stop);
                  },
                }}
                pathOptions={{
                  color: isQuiet ? "#ef4444" : "#10b981",
                  fillColor: isQuiet ? "#f87171" : "#34d399",
                  fillOpacity: 0.95,
                  weight: isSelectedStop ? 4 : 2,
                }}
              >
                <Popup className="transitiq-popup">
                  <div className="text-slate-900 p-1 text-xs space-y-1">
                    <div className="flex items-center gap-1.5">
                      <p className="font-bold text-sm">{stop.name}</p>
                      {isQuiet && (
                        <span className="px-1.5 py-0.5 rounded bg-rose-100 text-rose-800 text-[10px] font-semibold border border-rose-300">
                          Quiet stop
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-600">
                      Lighting: <span className="capitalize">{stop.lighting}</span> | Activity:{" "}
                      {stop.activity}
                    </p>
                    {isQuiet ? (
                      <p className="text-rose-700 font-semibold text-[11px]">Quiet stop • Long wait</p>
                    ) : (
                      <p className="text-emerald-700 font-semibold text-[11px]">Busy and well lit stop</p>
                    )}
                  </div>
                </Popup>
              </CircleMarker>
            );
          })}

          {/* Live Buses Markers: 32px with route number, 48px tap area (U1-03) */}
          {renderedBuses.map((bus) => {
            if (visibleRouteIds[bus.routeId] === false) return null;
            const color = routeColorMap.get(bus.routeId) || "#6366f1";
            const isDwelling = bus.speedMps === 0;
            const isSelected = selectedBus?.id === bus.id;
            const route = routes.find((r) => r.id === bus.routeId);
            const routeNum = route
              ? route.name.replace(/[^0-9]/g, "") || route.name
              : bus.routeId.replace(/[^0-9]/g, "");

            return (
              <Marker
                key={bus.id}
                position={[bus.lat, bus.lng]}
                icon={createBusIcon(routeNum, color, isDwelling, isSelected)}
                eventHandlers={{
                  click: () => handleBusClick(bus),
                }}
              >
                <Popup className="transitiq-popup">
                  <div className="text-slate-900 p-1 text-xs space-y-1">
                    <p className="font-bold text-sm">
                      {route?.name || bus.routeId} ({bus.id})
                    </p>
                    <p>
                      Status:{" "}
                      <span className={`font-semibold ${isDwelling ? "text-amber-600" : "text-emerald-600"}`}>
                        {isDwelling ? "Waiting at stop" : bus.status}
                      </span>
                    </p>
                  </div>
                </Popup>
              </Marker>
            );
          })}
        </MapContainer>
      </div>

      {/* Bus Details Bottom Sheet (U1-04) - only rendered if parent does not handle */}
      {selectedBus && !onBusSelect && (
        <BusSheet
          bus={selectedBus}
          route={selectedBusRoute ?? undefined}
          stops={stops}
          onClose={() => setSelectedBus(null)}
        />
      )}

      {/* Stop Sheet (M3-29) - only rendered if parent does not handle */}
      {selectedStop && !onStopSelect && (
        <StopSheet
          stop={selectedStop}
          onClose={() => setSelectedStop(null)}
          etas={etas.filter((e) => e.stopId === selectedStop.id)}
        />
      )}
    </div>
  );
}
