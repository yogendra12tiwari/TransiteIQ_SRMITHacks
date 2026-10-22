import { useState, useEffect, useRef, useMemo } from "react";
import { MapContainer, TileLayer, Polyline, CircleMarker, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { Route, Stop } from "@transitiq/shared";
import type { Bus } from "@transitiq/shared";

interface MapViewProps {
  routes: Route[];
  stops: Stop[];
  buses: Bus[];
  isStale?: boolean;
  onBusSelect?: (bus: Bus) => void;
}

// Lucknow City Center Coordinates (Hazratganj)
const LUCKNOW_CENTER: [number, number] = [26.8467, 80.9462];

function createBusIcon(color: string, isDwelling: boolean) {
  return L.divIcon({
    className: "transitiq-bus-icon",
    html: `
      <div style="background-color: ${color};" class="relative w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold shadow-xl border-2 ${
        isDwelling ? "border-amber-400 ring-2 ring-amber-400/50" : "border-white"
      } cursor-pointer hover:scale-110 transition-transform">
        <span>🚌</span>
        ${
          isDwelling
            ? '<span class="absolute -top-1 -right-1 w-3 h-3 bg-amber-400 rounded-full border border-slate-900 animate-ping"></span>'
            : ""
        }
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

export function MapView({ routes, stops, buses, isStale = false, onBusSelect }: MapViewProps) {
  // Selected bus for detail modal / bottom sheet
  const [selectedBus, setSelectedBus] = useState<Bus | null>(null);

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
  const selectedBusNextStops = selectedBusRoute
    ? selectedBusRoute.stopIds
        .map((id) => stops.find((s) => s.id === id))
        .filter((s): s is Stop => Boolean(s))
    : [];

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

          {/* Route Polylines */}
          {routes.map((route) => {
            if (visibleRouteIds[route.id] === false) return null;
            return (
              <Polyline
                key={route.id}
                positions={route.polyline as [number, number][]}
                pathOptions={{
                  color: route.color,
                  weight: 5,
                  opacity: 0.85,
                }}
              />
            );
          })}

          {/* Stops Circle Markers */}
          {stops.map((stop) => {
            const isStopA = stop.id === "stop_A";
            const isStopB = stop.id === "stop_B";
            return (
              <CircleMarker
                key={stop.id}
                center={[stop.lat, stop.lng]}
                radius={isStopA ? 9 : isStopB ? 8 : 6}
                pathOptions={{
                  color: isStopA ? "#ef4444" : isStopB ? "#10b981" : "#475569",
                  fillColor: isStopA ? "#f87171" : isStopB ? "#34d399" : "#0f172a",
                  fillOpacity: 0.95,
                  weight: 2.5,
                }}
              >
                <Popup className="transitiq-popup">
                  <div className="text-slate-900 p-1 text-xs space-y-1">
                    <p className="font-bold text-sm">{stop.name}</p>
                    <p className="text-[11px] text-slate-600">
                      Lighting: <span className="capitalize">{stop.lighting}</span> | Activity:{" "}
                      {stop.activity}
                    </p>
                    {isStopA && (
                      <p className="text-rose-700 font-semibold text-[11px]">
                        ⚠️ Target Isolated Stop (Avg Evening Wait: 18 min)
                      </p>
                    )}
                    {isStopB && (
                      <p className="text-emerald-700 font-semibold text-[11px]">
                        ✓ Busy Alternative Hub (~350 m away, Wait: 4 min)
                      </p>
                    )}
                  </div>
                </Popup>
              </CircleMarker>
            );
          })}

          {/* Live Buses Markers */}
          {renderedBuses.map((bus) => {
            if (visibleRouteIds[bus.routeId] === false) return null;
            const color = routeColorMap.get(bus.routeId) || "#6366f1";
            const isDwelling = bus.speedMps === 0;

            return (
              <Marker
                key={bus.id}
                position={[bus.lat, bus.lng]}
                icon={createBusIcon(color, isDwelling)}
                eventHandlers={{
                  click: () => handleBusClick(bus),
                }}
              >
                <Popup className="transitiq-popup">
                  <div className="text-slate-900 p-1 text-xs space-y-1">
                    <p className="font-bold text-sm">
                      {bus.id} ({bus.routeId})
                    </p>
                    <p>
                      Speed: <span className="font-semibold">{(bus.speedMps * 3.6).toFixed(0)} km/h</span> (
                      {bus.speedMps.toFixed(1)} m/s)
                    </p>
                    <p>
                      Status:{" "}
                      <span className={`font-semibold ${isDwelling ? "text-amber-600" : "text-emerald-600"}`}>
                        {isDwelling ? "Dwelling at Stop" : bus.status}
                      </span>
                    </p>
                  </div>
                </Popup>
              </Marker>
            );
          })}
        </MapContainer>
      </div>

      {/* Bus Details Bottom Sheet (M2-27) */}
      {selectedBus && (
        <div
          data-testid="bus-bottom-sheet"
          className="absolute bottom-4 left-4 right-4 z-[1000] p-4 rounded-2xl bg-slate-900/95 backdrop-blur-md border border-slate-700/80 shadow-2xl space-y-3"
        >
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center space-x-2">
                <span
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: selectedBusRoute?.color || "#6366f1" }}
                />
                <h3 className="font-bold text-white text-base">
                  {selectedBusRoute?.name || selectedBus.routeId}
                </h3>
                <span className="text-xs text-slate-400 font-mono">({selectedBus.id})</span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Status:{" "}
                <span
                  className={`font-semibold ${
                    selectedBus.speedMps === 0 ? "text-amber-400" : "text-emerald-400"
                  }`}
                >
                  {selectedBus.speedMps === 0 ? "Dwelling at passenger stop" : selectedBus.status}
                </span>
              </p>
            </div>
            <button
              onClick={() => setSelectedBus(null)}
              className="text-slate-400 hover:text-white p-1 rounded-lg text-sm"
              aria-label="Close sheet"
            >
              ✕
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="p-2 rounded-lg bg-slate-800/60 border border-slate-700/40">
              <span className="text-slate-400">Current Speed:</span>
              <p className="font-semibold text-white font-mono mt-0.5">
                {(selectedBus.speedMps * 3.6).toFixed(0)} km/h ({selectedBus.speedMps.toFixed(1)} m/s)
              </p>
            </div>
            <div className="p-2 rounded-lg bg-slate-800/60 border border-slate-700/40">
              <span className="text-slate-400">Distance along route:</span>
              <p className="font-semibold text-white font-mono mt-0.5">
                {Math.round(selectedBus.distanceAlongRouteM)} m
              </p>
            </div>
          </div>

          {selectedBusNextStops.length > 0 && (
            <div className="space-y-1">
              <span className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold">
                Route Stops
              </span>
              <div className="flex items-center space-x-1.5 overflow-x-auto py-1 text-xs">
                {selectedBusNextStops.map((st, idx) => (
                  <span
                    key={st.id}
                    className="px-2 py-0.5 rounded bg-slate-800 text-slate-200 border border-slate-700/60 whitespace-nowrap text-[11px]"
                  >
                    {idx + 1}. {st.name}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
