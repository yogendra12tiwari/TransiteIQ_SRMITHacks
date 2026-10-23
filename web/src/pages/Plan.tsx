import { useState, useMemo, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowLeft, MapPin, Map, Navigation } from "lucide-react";
import { LUCKNOW_PLACES, planRoutes, waitRisk } from "@transitiq/shared";
import { useNetwork } from "../hooks/useNetwork";
import { useLiveState } from "../hooks/useLiveState";
import { SearchField } from "../components/primitives/SearchField";
import { OptionRow } from "../components/primitives/OptionRow";
import { Button } from "../components/primitives/Button";
import { Disclosure } from "../components/primitives/Disclosure";
import { StickyAction } from "../components/primitives/StickyAction";
import { EmptyState } from "../components/primitives/EmptyState";
import { Sheet } from "../components/primitives/Sheet";
import { WhyList } from "../components/primitives/WhyList";
import { TakeawayLine } from "../components/TakeawayLine";
import { RouteOptionCard } from "../components/RouteOptionCard";
import { SpeedSafetySlider } from "../components/SpeedSafetySlider";
import { MapView, type OverlayRoute } from "../components/MapView";

export function PlanPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { t, i18n } = useTranslation();
  const currentLang = i18n.language === "hi" ? "hi" : "en";

  const { routes, stops } = useNetwork();
  const { data: liveData } = useLiveState();
  const buses = liveData?.buses ?? [];
  const alerts = liveData?.alerts ?? [];

  // Determine initial step and target destination from query param
  const destinationQuery = searchParams.get("to") || "";
  const initialDestPlace = destinationQuery
    ? LUCKNOW_PLACES.find(
        (p) =>
          p.name.toLowerCase() === destinationQuery.toLowerCase() ||
          p.id.toLowerCase() === destinationQuery.toLowerCase(),
      )
    : undefined;

  const [step, setStep] = useState<1 | 2 | 3>(() => (initialDestPlace ? 1 : 1));
  const [originId, setOriginId] = useState<string>("place_lohia_crossing");
  const [destId, setDestId] = useState<string>(initialDestPlace ? initialDestPlace.id : "place_gomtinagar");
  const [originSearch, setOriginSearch] = useState<string>("");
  const [destSearch, setDestSearch] = useState<string>("");
  const [alpha, setAlpha] = useState<number>(0.5);
  const [selectedRouteId, setSelectedRouteId] = useState<string | undefined>(undefined);
  const [isMapSheetOpen, setIsMapSheetOpen] = useState<boolean>(false);

  const originPlace = useMemo(
    () => LUCKNOW_PLACES.find((p) => p.id === originId) ?? LUCKNOW_PLACES[0]!,
    [originId],
  );

  const destPlace = useMemo(
    () => LUCKNOW_PLACES.find((p) => p.id === destId) ?? LUCKNOW_PLACES[3]!,
    [destId],
  );

  // Filtered popular places for Step 1
  const filteredOrigins = useMemo(() => {
    if (!originSearch.trim()) return LUCKNOW_PLACES.slice(0, 6);
    const q = originSearch.toLowerCase();
    return LUCKNOW_PLACES.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        (p.nameHi && p.nameHi.includes(q)) ||
        p.category.toLowerCase().includes(q),
    );
  }, [originSearch]);

  // Filtered popular places for Step 2 (excluding origin)
  const filteredDestinations = useMemo(() => {
    const list = LUCKNOW_PLACES.filter((p) => p.id !== originId);
    if (!destSearch.trim()) return list.slice(0, 6);
    const q = destSearch.toLowerCase();
    return list.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        (p.nameHi && p.nameHi.includes(q)) ||
        p.category.toLowerCase().includes(q),
    );
  }, [originId, destSearch]);

  // Compute Route Options for Step 3
  const options = useMemo(() => {
    if (routes.length === 0 || stops.length === 0) return [];
    if (originPlace.id === destPlace.id) return [];

    return planRoutes({
      origin: { lat: originPlace.lat, lng: originPlace.lng },
      destination: { lat: destPlace.lat, lng: destPlace.lng },
      network: { routes, stops },
      hour: 20, // 8 PM evening peak
      alpha,
    });
  }, [originPlace, destPlace, routes, stops, alpha]);

  const fastest = useMemo(() => options.find((o) => o.label === "Fastest"), [options]);
  const safer = useMemo(() => options.find((o) => o.label === "Safer"), [options]);

  // Pre-select Recommended option (or first)
  useEffect(() => {
    if (options.length > 0) {
      const rec = safer ? safer.id : options[0]!.id;
      if (!selectedRouteId || !options.some((o) => o.id === selectedRouteId)) {
        setSelectedRouteId(rec);
      }
    }
  }, [options, safer, selectedRouteId]);

  const selectedOption = useMemo(
    () => options.find((o) => o.id === selectedRouteId) || safer || options[0],
    [options, selectedRouteId, safer],
  );

  // Map Overlay Polylines: Fastest (solid line), Safer (dashed line) -> Dual coding (U2-07)
  const overlayRoutes: OverlayRoute[] = useMemo(() => {
    const list: OverlayRoute[] = [];
    if (fastest) {
      list.push({
        id: "overlay_fastest",
        color: "#E11D48", // Crimson for Fastest
        polyline: fastest.polyline,
        name: `Fastest (${fastest.travelMin}m)`,
        weight: 6,
        dashArray: undefined, // Solid line
      });
    }
    if (safer && safer.id !== fastest?.id) {
      list.push({
        id: "overlay_safer",
        color: "#059669", // Emerald for Safer
        polyline: safer.polyline,
        name: `Safer (${safer.travelMin}m)`,
        weight: 6,
        dashArray: "8, 8", // Dashed line
      });
    }
    return list;
  }, [fastest, safer]);

  // Stop Risk computation for selected option
  const boardingStop = useMemo(
    () => stops.find((s) => s.id === selectedOption?.boardingStopId),
    [stops, selectedOption],
  );

  const stopRiskInfo = useMemo(() => {
    if (!boardingStop) return null;
    return waitRisk(boardingStop, 20, selectedOption?.waitMin ?? 10, 0, currentLang);
  }, [boardingStop, selectedOption, currentLang]);

  // Golden comparison numbers: 4 min longer, 10 min less waiting
  const extraMin = safer && fastest ? Math.max(0, safer.travelMin - fastest.travelMin) : 0;
  const savedMin = safer && fastest ? Math.max(0, fastest.waitMin - safer.waitMin) : 0;
  const isFastestAlsoSafer = fastest && safer && fastest.id === safer.id;

  const handleBack = () => {
    if (step === 3) setStep(2);
    else if (step === 2) setStep(1);
    else navigate("/");
  };

  const handleUseLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        () => {
          // In simulated Lucknow dataset, pick closest hub (e.g. Lohia Path Crossing)
          setOriginId("place_lohia_crossing");
        },
        () => {
          // Graceful fallback
        },
      );
    }
  };

  const handleContinueWithRoute = () => {
    if (!selectedOption) return;
    try {
      localStorage.setItem("transitiq_selected_route", JSON.stringify(selectedOption));
    } catch {
      // Ignore storage errors
    }
    navigate(`/route/${selectedOption.id}`);
  };

  return (
    <div data-testid="plan-page" className="p-4 space-y-4 max-w-lg mx-auto text-[#111827] pb-28 relative">
      {/* Top Navigation & Step Indicator */}
      <div className="flex items-center justify-between pb-2 border-b border-[#D8DEE6]">
        <button
          type="button"
          onClick={handleBack}
          aria-label={t("common.back", "Back")}
          className="min-h-[48px] min-w-[48px] -ml-2 p-2 flex items-center justify-center text-[#4B5563] hover:text-[#111827] rounded-xl transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#111827]"
        >
          <ArrowLeft className="w-5 h-5" aria-hidden="true" />
        </button>

        <span className="text-sm font-semibold text-[#4B5563]" data-testid="step-indicator">
          {t("plan.step", { n: step, total: 3 })}
        </span>
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* STEP 1: WHERE FROM? (R2)                                      */}
      {/* ───────────────────────────────────────────────────────────── */}
      {step === 1 && (
        <section aria-labelledby="step-1-title" className="space-y-4">
          <div>
            <h1 id="step-1-title" className="text-xl font-bold text-[#111827]">
              {t("plan.from.title", "Where are you starting?")}
            </h1>
            <p className="text-xs text-[#4B5563] mt-0.5">
              {currentLang === "hi"
                ? "अपना प्रस्थान स्थान चुनें या खोजें"
                : "Choose or search your starting point in Lucknow"}
            </p>
          </div>

          <SearchField
            id="origin-search"
            label={t("plan.from.title", "Where are you starting?")}
            hideLabel
            placeholder={currentLang === "hi" ? "स्थान खोजें..." : "Type a place..."}
            value={originSearch}
            onChange={(e) => setOriginSearch(e.target.value)}
            data-testid="origin-search-input"
          />

          {/* "Use my location" text link */}
          <div className="flex items-center justify-between pt-1">
            <button
              type="button"
              onClick={handleUseLocation}
              className="text-xs font-semibold text-[#0F5BD8] hover:underline flex items-center gap-1.5 min-h-[48px] cursor-pointer"
            >
              <Navigation className="w-3.5 h-3.5" aria-hidden="true" />
              <span>{t("plan.useLocation", "Use my location")}</span>
            </button>
          </div>

          {/* Popular places list */}
          <div role="radiogroup" aria-label="Starting places" className="space-y-2">
            {filteredOrigins.map((place) => (
              <OptionRow
                key={place.id}
                label={currentLang === "hi" && place.nameHi ? place.nameHi : place.name}
                selected={originId === place.id}
                onClick={() => setOriginId(place.id)}
                icon={<MapPin className="w-4 h-4 text-[#4B5563]" aria-hidden="true" />}
              />
            ))}
          </div>

          {/* Single primary button */}
          <div className="pt-4">
            <Button
              variant="primary"
              onClick={() => setStep(2)}
              disabled={!originId}
              className="w-full"
              data-testid="step-1-continue-btn"
            >
              {t("common.continue", "Continue")}
            </Button>
          </div>
        </section>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* STEP 2: WHERE TO? (R3)                                        */}
      {/* ───────────────────────────────────────────────────────────── */}
      {step === 2 && (
        <section aria-labelledby="step-2-title" className="space-y-4">
          {/* Top context line */}
          <div className="flex items-center justify-between text-xs text-[#4B5563] pb-1">
            <span>
              {t("plan.fromContext", {
                from: currentLang === "hi" && originPlace.nameHi ? originPlace.nameHi : originPlace.name,
              })}
            </span>
            <button
              type="button"
              onClick={() => setStep(1)}
              className="text-[#0F5BD8] font-semibold underline min-h-[48px] px-2 flex items-center cursor-pointer"
            >
              {t("plan.change", "Change")}
            </button>
          </div>

          <div>
            <h1 id="step-2-title" className="text-xl font-bold text-[#111827]">
              {t("plan.to.title", "Where do you want to go?")}
            </h1>
            <p className="text-xs text-[#4B5563] mt-0.5">
              {currentLang === "hi"
                ? "अपना गंतव्य स्थान चुनें या खोजें"
                : "Choose or search your destination point in Lucknow"}
            </p>
          </div>

          <SearchField
            id="destination-search"
            label={t("plan.to.title", "Where do you want to go?")}
            hideLabel
            placeholder={currentLang === "hi" ? "गंतव्य खोजें..." : "Type a place..."}
            value={destSearch}
            onChange={(e) => setDestSearch(e.target.value)}
            data-testid="destination-search-input"
          />

          {/* Popular places list */}
          <div role="radiogroup" aria-label="Destination places" className="space-y-2">
            {filteredDestinations.map((place) => (
              <OptionRow
                key={place.id}
                label={currentLang === "hi" && place.nameHi ? place.nameHi : place.name}
                selected={destId === place.id}
                onClick={() => setDestId(place.id)}
                icon={<MapPin className="w-4 h-4 text-[#4B5563]" aria-hidden="true" />}
              />
            ))}
          </div>

          {/* Single primary button */}
          <div className="pt-4">
            <Button
              variant="primary"
              onClick={() => setStep(3)}
              disabled={!destId || destId === originId}
              className="w-full"
              data-testid="step-2-continue-btn"
            >
              {t("common.continue", "Continue")}
            </Button>
          </div>
        </section>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* STEP 3: CHOOSE HOW TO TRAVEL (R4 CENTREPIECE)                 */}
      {/* ───────────────────────────────────────────────────────────── */}
      {step === 3 && (
        <section aria-labelledby="step-3-title" className="space-y-4">
          {/* Top context line */}
          <div className="flex items-center justify-between text-xs text-[#4B5563]">
            <span className="truncate pr-2">
              {originPlace.name} → {destPlace.name}
            </span>
            <button
              type="button"
              onClick={() => setStep(2)}
              className="text-[#0F5BD8] font-semibold underline shrink-0 min-h-[48px] px-1 flex items-center cursor-pointer"
            >
              {t("plan.change", "Change")}
            </button>
          </div>

          <div>
            <h1 id="step-3-title" className="text-xl font-bold text-[#111827]">
              {t("plan.chooseTravel", "Choose how to travel")}
            </h1>
          </div>

          {/* Empty state: No route available (U2-08) */}
          {options.length === 0 ? (
            <EmptyState
              title={t("plan.noRouteTitle", "No direct route found")}
              description={t("plan.noRouteDesc", "Try choosing another origin or destination.")}
              action={
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="px-4 py-2 bg-[#0F5BD8] text-white text-sm font-semibold rounded-xl min-h-[48px] cursor-pointer"
                >
                  {t("plan.change", "Change destination")}
                </button>
              }
            />
          ) : (
            <>
              {/* Takeaway line (U2-05) - only when there is a tradeoff */}
              {!isFastestAlsoSafer && extraMin > 0 && savedMin > 0 && (
                <TakeawayLine extraMin={extraMin} savedMin={savedMin} />
              )}

              {/* Route Option Cards (U2-05) */}
              <div role="radiogroup" aria-label="Route choices" className="space-y-3">
                {/* Single card when fastest is also safest (U2-08) */}
                {isFastestAlsoSafer && fastest ? (
                  <RouteOptionCard
                    option={fastest}
                    isRecommended={true}
                    isSelected={selectedRouteId === fastest.id}
                    onSelect={() => setSelectedRouteId(fastest.id)}
                    lang={currentLang}
                  />
                ) : (
                  <>
                    {/* Recommended Option (Safer via Stop B) */}
                    {safer && (
                      <RouteOptionCard
                        option={safer}
                        isRecommended={true}
                        isSelected={selectedRouteId === safer.id}
                        onSelect={() => setSelectedRouteId(safer.id)}
                        lang={currentLang}
                      />
                    )}

                    {/* Fastest Option (via Stop A) */}
                    {fastest && fastest.id !== safer?.id && (
                      <RouteOptionCard
                        option={fastest}
                        isRecommended={false}
                        isSelected={selectedRouteId === fastest.id}
                        onSelect={() => setSelectedRouteId(fastest.id)}
                        lang={currentLang}
                      />
                    )}
                  </>
                )}
              </div>

              {/* "Show on map" text link (U2-07) */}
              <div className="pt-1">
                <button
                  type="button"
                  data-testid="show-on-map-link"
                  onClick={() => setIsMapSheetOpen(true)}
                  className="text-xs font-semibold text-[#0F5BD8] hover:underline flex items-center gap-1.5 min-h-[48px] cursor-pointer"
                >
                  <Map className="w-4 h-4" aria-hidden="true" />
                  <span>{t("plan.showOnMap", "Show on map")}</span>
                </button>
              </div>

              {/* "More details" Disclosure (U2-06) */}
              <Disclosure title={t("plan.moreDetails", "More details")} className="bg-white border-[#D8DEE6]">
                <div className="space-y-4 pt-2">
                  {/* Walking minutes */}
                  {selectedOption && (
                    <div className="flex items-center gap-2 text-xs text-[#4B5563]">
                      <MapPin className="w-4 h-4 text-[#0F5BD8]" aria-hidden="true" />
                      <span>{t("plan.walkMin", { n: selectedOption.walkMin })}</span>
                    </div>
                  )}

                  {/* WhyList factor bullets */}
                  {stopRiskInfo && (
                    <WhyList
                      title={t("route.why", "Why this rating?")}
                      items={[
                        currentLang === "hi"
                          ? `प्रतीक्षा समय (30%): ${stopRiskInfo.factors.wait > 0.15 ? "लंबा इंतज़ार" : "सामान्य"}`
                          : `Wait time (30%): ${stopRiskInfo.factors.wait > 0.15 ? "Long wait" : "Normal wait"}`,
                        currentLang === "hi"
                          ? `रात का समय (20%): ${stopRiskInfo.factors.night > 0.1 ? "देर शाम" : "दिन"}`
                          : `Night / Hour (20%): ${stopRiskInfo.factors.night > 0.1 ? "Evening interval" : "Daytime"}`,
                        currentLang === "hi"
                          ? `कम गतिविधि (20%): ${stopRiskInfo.factors.lowActivity > 0.1 ? "शांत क्षेत्र" : "सक्रिय क्षेत्र"}`
                          : `Low activity (20%): ${stopRiskInfo.factors.lowActivity > 0.1 ? "Quiet area" : "Active area"}`,
                        currentLang === "hi"
                          ? `सुरक्षा रिपोर्टें (20%): ${stopRiskInfo.factors.reports > 0.1 ? "कम रोशनी की रिपोर्ट" : "कोई हालिया रिपोर्ट नहीं"}`
                          : `Safety reports (20%): ${stopRiskInfo.factors.reports > 0.1 ? "Poor lighting reported" : "No recent reports"}`,
                        currentLang === "hi"
                          ? "शेड्यूल विश्वसनीयता (10%): सामान्य"
                          : "Schedule reliability (10%): On schedule",
                      ]}
                    />
                  )}

                  {/* Faster ↔ Less waiting alone slider */}
                  <div className="pt-2 border-t border-[#D8DEE6]">
                    <SpeedSafetySlider alpha={alpha} onChange={setAlpha} lang={currentLang} />
                  </div>
                </div>
              </Disclosure>

              {/* Sticky "Continue with this route" action (U2-09) */}
              <StickyAction>
                <Button
                  variant="primary"
                  onClick={handleContinueWithRoute}
                  disabled={!selectedRouteId}
                  className="w-full"
                  data-testid="continue-route-btn"
                >
                  {t("plan.continueWithRoute", "Continue with this route")}
                </Button>
              </StickyAction>
            </>
          )}
        </section>
      )}

      {/* Map Bottom Sheet with dual-coded polylines (U2-07) */}
      {isMapSheetOpen && (
        <Sheet
          position="absolute"
          initialSnap="half"
          title={t("plan.showOnMap", "Route Map")}
          className="pb-6"
        >
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs px-1">
              <span className="flex items-center gap-1.5 font-semibold text-[#E11D48]">
                <span className="w-3 h-1 bg-[#E11D48] rounded" />
                <span>Fastest (solid)</span>
              </span>
              <span className="flex items-center gap-1.5 font-semibold text-[#059669]">
                <span className="w-3 h-1 border-t-2 border-dashed border-[#059669]" />
                <span>Safer (dashed)</span>
              </span>
            </div>

            <div className="h-[320px] rounded-xl overflow-hidden border border-[#D8DEE6]">
              <MapView
                routes={routes}
                stops={stops}
                buses={buses}
                alerts={alerts}
                overlayRoutes={overlayRoutes}
                originCoord={[originPlace.lat, originPlace.lng]}
                destinationCoord={[destPlace.lat, destPlace.lng]}
              />
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setIsMapSheetOpen(false)}
                className="text-xs font-semibold text-[#4B5563] hover:text-[#111827] px-3 py-1.5 rounded-lg border border-[#D8DEE6] min-h-[48px]"
              >
                {t("common.done", "Done")}
              </button>
            </div>
          </div>
        </Sheet>
      )}
    </div>
  );
}
