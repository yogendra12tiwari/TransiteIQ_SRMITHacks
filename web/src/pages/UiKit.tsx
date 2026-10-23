import { useState } from "react";
import {
  Button,
  Card,
  OptionRow,
  Disclosure,
  Banner,
  Badge,
  Step,
  StickyAction,
  Toast,
  TextField,
  SearchField,
  EmptyState,
  ErrorState,
  Skeleton,
  WhyList,
  LanguageToggle,
  BottomTabs,
} from "../components/primitives";
import { RiskBadge } from "../components/RiskBadge";
import { SimulatedDataBadge } from "../components/SimulatedDataBadge";
import { MapPin, Bus, Clock } from "lucide-react";
import { useTranslation } from "react-i18next";

export function UiKitPage() {
  const { t, i18n } = useTranslation();
  const [searchValue, setSearchValue] = useState("Lucknow University");
  const [selectedOption, setSelectedOption] = useState("opt1");
  const [showToast, setShowToast] = useState(false);
  const [toastVariant, setToastVariant] = useState<"alert" | "status">("status");

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-10 text-left bg-white text-[#111827]">
      {/* Header */}
      <div className="border-b border-[#D8DEE6] pb-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">TransitIQ UI Kit (U0-15)</h1>
          <p className="text-sm text-[#4B5563] mt-0.5">
            Design tokens, primitives, states, and bilingual rendering
          </p>
        </div>
        <div className="flex items-center gap-2">
          <SimulatedDataBadge />
          <LanguageToggle />
        </div>
      </div>

      <div className="text-xs text-[#4B5563]">
        Active Language: <strong className="text-[#0F5BD8]">{i18n.language.toUpperCase()}</strong>
      </div>

      {/* 1. Buttons */}
      <section className="space-y-3">
        <h2 className="text-lg font-bold border-b border-[#D8DEE6] pb-1">1. Buttons (§2.1 &amp; U0-05)</h2>
        <div className="flex flex-wrap gap-3 items-center">
          <Button variant="primary">Primary Button</Button>
          <Button variant="secondary">Secondary Button</Button>
          <Button variant="text">Text Button</Button>
          <Button variant="primary" loading>
            Loading
          </Button>
          <Button variant="secondary" disabled>
            Disabled
          </Button>
        </div>
      </section>

      {/* 2. Text and Search Inputs */}
      <section className="space-y-4">
        <h2 className="text-lg font-bold border-b border-[#D8DEE6] pb-1">2. Inputs (§2.1 &amp; U0-10)</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <TextField
            label="Stop Name"
            placeholder="e.g. Hazratganj"
            helperText="Enter the name of your boarding stop"
          />
          <TextField
            label="Phone Number (Error state)"
            defaultValue="9876543210"
            error="Please do not enter phone numbers (PII protection)"
          />
        </div>
        <SearchField
          label={t("home.search", "Where are you going?")}
          value={searchValue}
          onChange={(e) => setSearchValue(e.target.value)}
          onClear={() => setSearchValue("")}
        />
      </section>

      {/* 3. Cards & Option Rows */}
      <section className="space-y-3">
        <h2 className="text-lg font-bold border-b border-[#D8DEE6] pb-1">
          3. Cards &amp; Selection Rows (U0-06)
        </h2>
        <div className="space-y-2">
          <OptionRow
            label="Stop A (Hazratganj)"
            sublabel="Busy and well lit • 4 min walk"
            selected={selectedOption === "opt1"}
            onClick={() => setSelectedOption("opt1")}
            icon={<MapPin className="w-5 h-5" />}
          />
          <OptionRow
            label="Stop B (Charbagh)"
            sublabel="Major interchange • 8 min walk"
            selected={selectedOption === "opt2"}
            onClick={() => setSelectedOption("opt2")}
            icon={<Bus className="w-5 h-5" />}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
          <Card>
            <div className="font-semibold text-sm">Standard Card</div>
            <p className="text-xs text-[#4B5563] mt-1">
              Contains stop information or trip summary with 1px border.
            </p>
          </Card>
          <Card selected>
            <div className="font-semibold text-sm text-[#0F5BD8]">Selected Card</div>
            <p className="text-xs text-[#4B5563] mt-1">Highlighted recommendation card for route planning.</p>
          </Card>
        </div>
      </section>

      {/* 4. Badges & Risk Signals */}
      <section className="space-y-3">
        <h2 className="text-lg font-bold border-b border-[#D8DEE6] pb-1">
          4. Badges &amp; Risk Labels (U0-06 &amp; U0-12)
        </h2>
        <div className="flex flex-wrap gap-2 items-center">
          <RiskBadge label="Low" score={0.15} />
          <RiskBadge label="Medium" score={0.42} />
          <RiskBadge label="High" score={0.78} />
          <Badge variant="primary" icon={<Clock className="w-3 h-3" />}>
            ETA 6-8m
          </Badge>
          <Badge variant="subtle">Scheduled</Badge>
          <SimulatedDataBadge />
        </div>

        <WhyList
          items={[
            "Average evening wait is 18 minutes (high)",
            "Lighting reported poor after 8:00 PM",
            "Bus 23 experienced corridor delay today",
          ]}
        />
      </section>

      {/* 5. Banners & Notifications */}
      <section className="space-y-3">
        <h2 className="text-lg font-bold border-b border-[#D8DEE6] pb-1">5. Banners (U0-06)</h2>
        <Banner variant="info" title="Service Notice">
          Bus 23 is arriving in 5 minutes at Platform 2.
        </Banner>
        <Banner variant="warn" title="Likely Skip Alert">
          Bus 11 may skip Hazratganj due to traffic congestion on MG Road.
        </Banner>
        <Banner variant="danger" title="Connection Interrupted">
          No internet. Showing the last bus positions.
        </Banner>
      </section>

      {/* 6. Disclosures */}
      <section className="space-y-3">
        <h2 className="text-lg font-bold border-b border-[#D8DEE6] pb-1">6. Disclosures (U0-06)</h2>
        <Disclosure title="More details (Walking minutes &amp; stops)">
          <div className="py-2 space-y-1">
            <p>• Total walk distance: 340 meters (approx 4 minutes)</p>
            <p>• Intermediate stops: 6 stops along Corridor 10</p>
            <p>• Scheduled frequency: every 12 minutes</p>
          </div>
        </Disclosure>
      </section>

      {/* 7. Steps & Sticky Action */}
      <section className="space-y-3">
        <h2 className="text-lg font-bold border-b border-[#D8DEE6] pb-1">7. Multistep Flow (U0-07)</h2>
        <div className="border border-[#D8DEE6] p-4 rounded-[12px] bg-[#F5F7FA]">
          <Step
            currentStep={1}
            totalSteps={3}
            title={t("plan.from.title", "Where are you starting?")}
            onBack={() => alert("Back clicked")}
          >
            <p className="text-sm text-[#4B5563]">Choose from recent places or search your boarding stop.</p>
          </Step>
        </div>
      </section>

      {/* 8. States: Empty, Error, Skeleton */}
      <section className="space-y-3">
        <h2 className="text-lg font-bold border-b border-[#D8DEE6] pb-1">
          8. States: Empty, Error, Skeleton (U0-11)
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <EmptyState
            title="No alerts right now"
            description="All buses are running smoothly according to schedule."
          />
          <ErrorState
            message="Could not connect to live fleet feed. Check your connection and try again."
            onRetry={() => alert("Retrying connection")}
          />
        </div>

        <div className="space-y-2 mt-4">
          <div className="text-xs font-semibold text-[#4B5563]">Skeletons:</div>
          <Skeleton className="h-6 w-3/4" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      </section>

      {/* 9. Interactive Toasts Trigger */}
      <section className="space-y-3 pb-24">
        <h2 className="text-lg font-bold border-b border-[#D8DEE6] pb-1">
          9. Toasts &amp; Navigation (U0-09 &amp; U0-13)
        </h2>
        <div className="flex gap-3">
          <Button
            variant="secondary"
            onClick={() => {
              setToastVariant("alert");
              setShowToast(true);
            }}
          >
            Trigger Safe Wait Alert Toast
          </Button>
          <Button
            variant="secondary"
            onClick={() => {
              setToastVariant("status");
              setShowToast(true);
            }}
          >
            Trigger Status Toast
          </Button>
        </div>

        <Toast
          visible={showToast}
          variant={toastVariant}
          title={toastVariant === "alert" ? t("safewait.title", "Leave now") : "Trip Shared Successfully"}
          message={
            toastVariant === "alert"
              ? "Bus 23 is about 5 min away. It's a 4 min walk."
              : "Your trusted contact can view your live bus progress."
          }
          onAcknowledge={() => setShowToast(false)}
          secondaryAction={
            toastVariant === "alert" ? (
              <button
                type="button"
                onClick={() => setShowToast(false)}
                className="text-xs text-amber-300 underline font-medium hover:text-white"
              >
                Remind in 1m
              </button>
            ) : null
          }
        />

        <div className="pt-4 border-t border-[#D8DEE6]">
          <h3 className="text-sm font-semibold mb-2">BottomTabs Preview:</h3>
          <div className="border border-[#D8DEE6] rounded-[12px] p-2 bg-[#F5F7FA]">
            <BottomTabs className="relative! bottom-auto! left-auto! right-auto! shadow-none!" />
          </div>
        </div>
      </section>

      {/* Sticky Action Demo */}
      <StickyAction>
        <Button variant="primary" onClick={() => alert("Action triggered")}>
          Continue to Route Selection
        </Button>
      </StickyAction>
    </div>
  );
}
