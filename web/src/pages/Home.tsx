import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Search, MapPin, Clock } from "lucide-react";
import type { Bus, Stop } from "@transitiq/shared";
import { useNetwork } from "../hooks/useNetwork";
import { useLiveState } from "../hooks/useLiveState";
import { MapView } from "../components/MapView";
import { StopSheet } from "../components/StopSheet";
import { BusSheet } from "../components/BusSheet";
import { Sheet } from "../components/primitives/Sheet";
import { Banner } from "../components/primitives/Banner";
import { Skeleton } from "../components/primitives/Skeleton";
import { Card } from "../components/primitives/Card";

const POPULAR_DESTINATIONS = [
  { name: "Lucknow University", isRecent: true },
  { name: "Charbagh", isRecent: false },
  { name: "Hazratganj", isRecent: false },
  { name: "Alambagh", isRecent: false },
];

export function HomePage() {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const lang = i18n.language === "hi" ? "hi" : "en";

  const { routes, stops, loading: networkLoading } = useNetwork();
  const { data: liveData, isStale, loading: liveLoading } = useLiveState();

  const [isOnline, setIsOnline] = useState<boolean>(() =>
    typeof navigator !== "undefined" ? navigator.onLine : true,
  );
  const [viewMode, setViewMode] = useState<"map" | "list">("map");
  const [selectedBus, setSelectedBus] = useState<Bus | null>(null);
  const [selectedStop, setSelectedStop] = useState<Stop | null>(null);
  const [searchValue, setSearchValue] = useState("");

  const buses = liveData?.buses ?? [];
  const etas = liveData?.etas ?? [];
  const alerts = liveData?.alerts ?? [];

  // Track online/offline status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // Check for likely skip alerts affecting followed stop (e.g. Stop A)
  const activeSkipAlert = alerts.find(
    (a) => a.type === "LIKELY_SKIP" && (a.affectedStopIds.includes("stop_A") || a.affectedStopIds.length > 0),
  );

  const handleSearchSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (searchValue.trim()) {
      navigate(`/plan?to=${encodeURIComponent(searchValue.trim())}`);
    } else {
      navigate("/plan");
    }
  };

  const handleDestinationClick = (name: string) => {
    navigate(`/plan?to=${encodeURIComponent(name)}`);
  };

  const selectedBusRoute = selectedBus ? routes.find((r) => r.id === selectedBus.routeId) : undefined;

  // Loading skeleton state while waiting for initial snapshot
  const isInitialLoading = networkLoading || (liveLoading && !liveData);

  return (
    <div
      data-testid="home-page"
      className="relative w-full h-full flex-1 flex flex-col min-h-[500px] overflow-x-hidden bg-[#F5F7FA]"
    >
      {/* Offline banner (U1-06) */}
      {!isOnline && (
        <div data-testid="offline-banner" className="z-30 p-2">
          <Banner
            variant="warning"
            title={t("offline.banner", "No internet. Showing the last bus positions.")}
          />
        </div>
      )}

      {/* Stale feed banner after 8s of no updates (U1-06) */}
      {isOnline && isStale && (
        <div data-testid="stale-data-banner" className="z-30 p-2">
          <Banner
            variant="warning"
            title={t("home.stale", "Data is taking longer to update. Showing latest bus positions.")}
          />
        </div>
      )}

      {/* Likely skip banner for followed stop */}
      {activeSkipAlert && (
        <div data-testid="home-skip-banner" className="z-30 px-3 pt-2">
          <Banner
            variant="danger"
            title={activeSkipAlert.message || t("alert.skip", "This bus may not stop here")}
            action={
              <button
                type="button"
                onClick={() => navigate("/alerts")}
                className="text-xs font-bold underline cursor-pointer text-[#B91C1C]"
              >
                {t("common.continue", "See options")}
              </button>
            }
          />
        </div>
      )}

      {/* Main Map or Accessible List View */}
      {isInitialLoading ? (
        <div
          data-testid="home-skeleton"
          className="flex-1 w-full flex flex-col p-4 space-y-4"
          aria-busy="true"
        >
          <Skeleton className="w-full flex-1 min-h-[360px] rounded-2xl" />
          <Skeleton className="w-full h-14 rounded-xl" />
          <div className="flex gap-2">
            <Skeleton className="w-28 h-8 rounded-full" />
            <Skeleton className="w-24 h-8 rounded-full" />
            <Skeleton className="w-24 h-8 rounded-full" />
          </div>
        </div>
      ) : viewMode === "map" ? (
        <div className="flex-1 w-full relative min-h-[380px]">
          <MapView
            routes={routes}
            stops={stops}
            buses={buses}
            etas={etas}
            alerts={alerts}
            isStale={isStale}
            onBusSelect={(bus) => {
              setSelectedBus(bus);
              setSelectedStop(null);
            }}
            onStopSelect={(stop) => {
              setSelectedStop(stop);
              setSelectedBus(null);
            }}
          />
        </div>
      ) : (
        /* Accessible List View alternative for screen readers and map-free navigation (U1-05) */
        <div
          data-testid="accessible-list-view"
          className="flex-1 w-full p-4 overflow-y-auto space-y-5 pb-44"
          role="region"
          aria-label={t("home.stopsAndBuses", "Stops and buses")}
        >
          <div className="flex items-center justify-between pb-2 border-b border-[#D8DEE6]">
            <h2 className="text-base font-bold text-[#111827]">
              {t("home.stopsAndBuses", "Stops and buses")}
            </h2>
            <button
              type="button"
              onClick={() => setViewMode("map")}
              className="text-xs font-semibold text-[#0F5BD8] hover:underline min-h-[48px] px-2 flex items-center"
            >
              ← {t("home.mapView", "Map view")}
            </button>
          </div>

          {/* Running buses section */}
          <section aria-labelledby="heading-buses" className="space-y-2">
            <h3 id="heading-buses" className="text-xs font-bold uppercase tracking-wider text-[#4B5563]">
              {t("home.upcomingBuses", "Upcoming buses")} ({buses.length})
            </h3>
            {buses.length === 0 ? (
              <p className="text-xs text-[#4B5563] italic">
                {t("alert.none", "No problems right now. All buses are running.")}
              </p>
            ) : (
              <div className="space-y-2">
                {buses.map((bus) => {
                  const route = routes.find((r) => r.id === bus.routeId);
                  const isDwelling = bus.speedMps === 0;
                  return (
                    <Card
                      key={bus.id}
                      onClick={() => {
                        setSelectedBus(bus);
                        setSelectedStop(null);
                      }}
                      className="p-3 bg-white border-[#D8DEE6] flex items-center justify-between cursor-pointer hover:border-[#0F5BD8]"
                    >
                      <div className="flex items-center gap-2.5">
                        <span
                          className="w-3.5 h-3.5 rounded-full inline-block shrink-0"
                          style={{ backgroundColor: route?.color || "#F59E0B" }}
                          aria-hidden="true"
                        />
                        <div>
                          <div className="font-bold text-sm text-[#111827]">{route?.name || bus.routeId}</div>
                          <div className="text-xs text-[#4B5563]">
                            {isDwelling ? t("home.dwelling", "Waiting at stop") : t("home.moving", "Moving")}
                            {" • "}
                            {Math.round(bus.speedMps * 3.6)} km/h
                          </div>
                        </div>
                      </div>
                      <span className="text-xs text-[#0F5BD8] font-medium">Details →</span>
                    </Card>
                  );
                })}
              </div>
            )}
          </section>

          {/* Stops section */}
          <section aria-labelledby="heading-stops" className="space-y-2">
            <h3 id="heading-stops" className="text-xs font-bold uppercase tracking-wider text-[#4B5563]">
              {lang === "hi" ? "स्टॉप" : "Stops"} ({stops.length})
            </h3>
            <div className="space-y-2">
              {stops.map((stop) => {
                const isQuiet = stop.id === "stop_A" || stop.activity <= 0.3 || stop.lighting === "poor";
                const stopEtas = etas.filter((e) => e.stopId === stop.id);
                return (
                  <Card
                    key={stop.id}
                    onClick={() => {
                      setSelectedStop(stop);
                      setSelectedBus(null);
                    }}
                    className="p-3 bg-white border-[#D8DEE6] flex items-center justify-between cursor-pointer hover:border-[#0F5BD8]"
                  >
                    <div>
                      <div className="font-bold text-sm text-[#111827] flex items-center gap-1.5">
                        {stop.name}
                        {isQuiet && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-rose-100 text-rose-800 border border-rose-300">
                            {t("home.quietStop", "Quiet stop")}
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-[#4B5563] mt-0.5">
                        {stop.lighting === "good" ? "Well lit" : "Poorly lit"}
                        {stopEtas.length > 0 &&
                          stopEtas[0] &&
                          ` • ${stopEtas[0].lowMin}–${stopEtas[0].highMin} min`}
                      </div>
                    </div>
                    <span className="text-xs text-[#0F5BD8] font-medium">Arrivals →</span>
                  </Card>
                );
              })}
            </div>
          </section>
        </div>
      )}

      {/* Bottom Sheet containing the primary search card (U1-01, U1-02) */}
      <Sheet
        position="absolute"
        initialSnap="half"
        title={t("home.search", "Where are you going?")}
        className="pb-20"
      >
        <div className="space-y-3">
          {/* Primary Search Field / Input */}
          <form onSubmit={handleSearchSubmit} className="relative">
            <label htmlFor="home-destination-input" className="sr-only">
              {t("home.search", "Where are you going?")}
            </label>
            <div className="relative flex items-center">
              <input
                id="home-destination-input"
                data-testid="home-search-input"
                type="text"
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
                placeholder={t("home.search", "Where are you going?")}
                className="w-full min-h-[48px] pl-11 pr-24 py-3 bg-[#F5F7FA] border-2 border-[#D8DEE6] focus:border-[#0F5BD8] focus:bg-white rounded-xl text-base text-[#111827] placeholder-[#4B5563] focus:outline-none transition-colors"
              />
              <Search
                className="absolute left-3.5 w-5 h-5 text-[#4B5563] pointer-events-none"
                aria-hidden="true"
              />
              <button
                type="submit"
                data-testid="home-search-button"
                className="absolute right-1.5 min-h-[40px] px-3.5 py-1.5 bg-[#F59E0B] hover:bg-[#D97706] active:bg-[#B45309] text-[#020617] text-xs font-bold rounded-lg transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#111827]"
              >
                {t("common.continue", "Continue")}
              </button>
            </div>
          </form>

          {/* Popular / Recent Destinations Chips */}
          <div>
            <span className="text-xs font-semibold text-[#4B5563] block mb-1.5">
              {t("home.popular", "Popular places")}
            </span>
            <div className="flex flex-wrap gap-2">
              {POPULAR_DESTINATIONS.map((dest) => (
                <button
                  key={dest.name}
                  type="button"
                  data-testid={`popular-${dest.name.toLowerCase().replace(/\s+/g, "-")}`}
                  onClick={() => handleDestinationClick(dest.name)}
                  className={`min-h-[48px] px-3.5 py-2 rounded-xl text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer border ${
                    dest.isRecent
                      ? "bg-[#EFF6FF] border-[#0F5BD8] text-[#0F5BD8]"
                      : "bg-[#F5F7FA] border-[#D8DEE6] text-[#111827] hover:bg-[#E5E7EB]"
                  }`}
                >
                  {dest.isRecent ? (
                    <>
                      <Clock className="w-3.5 h-3.5" aria-hidden="true" />
                      <span>{t("home.recent", `Recent: ${dest.name}`)}</span>
                    </>
                  ) : (
                    <>
                      <MapPin className="w-3.5 h-3.5 text-[#4B5563]" aria-hidden="true" />
                      <span>{dest.name}</span>
                    </>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Map accessibility alternative toggle (U1-05) */}
          <div className="pt-2 border-t border-[#D8DEE6] flex items-center justify-between">
            <button
              type="button"
              data-testid="toggle-list-view"
              onClick={() => setViewMode(viewMode === "map" ? "list" : "map")}
              className="text-xs font-medium text-[#0F5BD8] hover:text-[#0C46A8] underline min-h-[48px] flex items-center cursor-pointer"
            >
              {viewMode === "map" ? t("home.listView", "List view") : t("home.mapView", "Map view")}
            </button>

            <span className="text-[11px] text-[#4B5563]">
              {buses.length > 0 ? `${buses.length} buses live` : "Tracking Lucknow fleet"}
            </span>
          </div>
        </div>
      </Sheet>

      {/* Selected Bus Sheet (U1-04) */}
      {selectedBus && (
        <BusSheet
          bus={selectedBus}
          route={selectedBusRoute}
          stops={stops}
          onClose={() => setSelectedBus(null)}
          lang={lang}
        />
      )}

      {/* Selected Stop Sheet (U1-04) */}
      {selectedStop && (
        <StopSheet
          stop={selectedStop}
          etas={etas.filter((e) => e.stopId === selectedStop.id)}
          onClose={() => setSelectedStop(null)}
          lang={lang}
        />
      )}
    </div>
  );
}
