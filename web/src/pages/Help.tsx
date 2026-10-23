import { useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Phone, Shield, PlusCircle, Pill, Building2, ChevronLeft } from "lucide-react";
import type { HelpPoint } from "@transitiq/shared";
import { Button } from "../components/primitives/Button";
import { Card } from "../components/primitives/Card";
import helpPointsSeed from "../../../seed/helpPoints.json";

export function HelpPage() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language === "hi" ? "hi" : "en";
  const [filter, setFilter] = useState<"all" | "police" | "hospital" | "pharmacy_24h">("all");
  const [helpPoints] = useState<HelpPoint[]>(helpPointsSeed as HelpPoint[]);

  // Filter items
  const filteredPoints = helpPoints.filter((pt) => filter === "all" || pt.kind === filter);

  const getKindIcon = (kind: string) => {
    switch (kind) {
      case "police":
        return <Shield className="w-4 h-4 text-blue-600" aria-hidden="true" />;
      case "hospital":
        return <PlusCircle className="w-4 h-4 text-rose-600" aria-hidden="true" />;
      case "pharmacy_24h":
        return <Pill className="w-4 h-4 text-emerald-600" aria-hidden="true" />;
      default:
        return <Building2 className="w-4 h-4 text-purple-600" aria-hidden="true" />;
    }
  };

  const getKindLabel = (kind: string) => {
    switch (kind) {
      case "police":
        return lang === "hi" ? "पुलिस थाना" : "Police";
      case "hospital":
        return lang === "hi" ? "अस्पताल" : "Hospital";
      case "pharmacy_24h":
        return lang === "hi" ? "24/7 दवाखाना" : "24h Pharmacy";
      default:
        return lang === "hi" ? "सहायता केंद्र" : "Helpdesk";
    }
  };

  return (
    <div data-testid="help-page" className="max-w-md mx-auto w-full flex-1 flex flex-col p-4 space-y-4 pb-24">
      {/* Top back navigation */}
      <div className="flex items-center gap-2">
        <Link
          to="/"
          className="p-2 -ml-2 text-[#4B5563] hover:text-[#111827] min-h-[48px] min-w-[48px] flex items-center justify-center rounded-lg"
          aria-label={t("common.back", "Back")}
        >
          <ChevronLeft className="w-6 h-6" aria-hidden="true" />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-[#111827]">
            {lang === "hi" ? "आपातकालीन सहायता" : "Emergency Help"}
          </h1>
          <p className="text-xs text-[#4B5563]">
            {lang === "hi"
              ? "सीधा कॉल करें · कोई ट्रैकिंग या रिकॉर्डिंग नहीं"
              : "Direct emergency assistance · Zero tracking or recording"}
          </p>
        </div>
      </div>

      {/* Primary Emergency Action (Rule: Exactly one primary button per screen) */}
      <Card className="p-4 bg-rose-50 border-rose-200 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-rose-600 animate-pulse" aria-hidden="true" />
            <span className="font-bold text-sm text-rose-900">
              {lang === "hi" ? "अखिल भारतीय आपातकालीन नंबर" : "All-India Emergency Service"}
            </span>
          </div>
          <span className="text-xs font-bold px-2 py-0.5 rounded bg-rose-200 text-rose-900">24/7</span>
        </div>

        <p className="text-xs text-rose-800">
          {lang === "hi"
            ? "तुरंत पुलिस, एम्बुलेंस या अग्निशमन सहायता के लिए डायल करें।"
            : "Call immediately for police, ambulance, or immediate distress response."}
        </p>

        {/* Single Primary Button */}
        <a href="tel:112" className="block w-full">
          <Button
            variant="primary"
            className="w-full bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white min-h-[52px] text-lg font-bold flex items-center justify-center gap-2"
          >
            <Phone className="w-5 h-5" aria-hidden="true" />
            <span>{lang === "hi" ? "112 पर कॉल करें" : "Call 112 (Emergency)"}</span>
          </Button>
        </a>
      </Card>

      {/* Secondary Helplines */}
      <div className="grid grid-cols-2 gap-2">
        <a href="tel:1091" className="block">
          <Card className="p-3 bg-white border-[#D8DEE6] hover:border-[#0F5BD8] flex flex-col items-center text-center space-y-1">
            <Shield className="w-5 h-5 text-indigo-600" aria-hidden="true" />
            <span className="text-xs font-bold text-[#111827]">1091</span>
            <span className="text-[11px] text-[#4B5563]">
              {lang === "hi" ? "महिला हेल्पलाइन" : "Women Helpline"}
            </span>
          </Card>
        </a>

        <a href="tel:1090" className="block">
          <Card className="p-3 bg-white border-[#D8DEE6] hover:border-[#0F5BD8] flex flex-col items-center text-center space-y-1">
            <Shield className="w-5 h-5 text-purple-600" aria-hidden="true" />
            <span className="text-xs font-bold text-[#111827]">1090</span>
            <span className="text-[11px] text-[#4B5563]">
              {lang === "hi" ? "महिला पावर लाइन" : "Women Power Line"}
            </span>
          </Card>
        </a>
      </div>

      {/* Nearby Help Points Section (D11 / M6b P2-23) */}
      <section className="space-y-3 pt-2">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-[#111827]">
            {lang === "hi" ? "निकटतम सहायता केंद्र (लखनऊ)" : "Nearby Help Points (Lucknow)"}
          </h2>
          <span className="text-xs text-[#4B5563]">{filteredPoints.length} points</span>
        </div>

        {/* Filter chips */}
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          {(["all", "police", "hospital", "pharmacy_24h"] as const).map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setFilter(cat)}
              className={`min-h-[36px] px-3 py-1 rounded-full text-xs font-medium cursor-pointer transition-colors border ${
                filter === cat
                  ? "bg-[#0F5BD8] text-white border-[#0F5BD8]"
                  : "bg-white text-[#4B5563] border-[#D8DEE6] hover:bg-slate-50"
              }`}
            >
              {cat === "all"
                ? lang === "hi"
                  ? "सभी"
                  : "All"
                : cat === "police"
                  ? lang === "hi"
                    ? "पुलिस"
                    : "Police"
                  : cat === "hospital"
                    ? lang === "hi"
                      ? "अस्पताल"
                      : "Hospital"
                    : lang === "hi"
                      ? "दवाखाना"
                      : "24h Pharmacy"}
            </button>
          ))}
        </div>

        {/* List of help points */}
        <div className="space-y-2">
          {filteredPoints.map((pt) => (
            <Card key={pt.id} className="p-3 bg-white border-[#D8DEE6] flex items-center justify-between">
              <div className="space-y-1 pr-2">
                <div className="flex items-center gap-1.5">
                  {getKindIcon(pt.kind)}
                  <span className="text-xs font-semibold px-1.5 py-0.5 rounded bg-slate-100 text-[#4B5563]">
                    {getKindLabel(pt.kind)}
                  </span>
                </div>
                <div className="text-sm font-bold text-[#111827]">
                  {lang === "hi" && pt.nameHi ? pt.nameHi : pt.name}
                </div>
              </div>

              {pt.phone && (
                <a
                  href={`tel:${pt.phone}`}
                  className="shrink-0 min-h-[44px] min-w-[44px] px-3 py-1.5 bg-emerald-50 border border-emerald-300 text-emerald-800 rounded-lg text-xs font-bold flex items-center gap-1 hover:bg-emerald-100"
                  aria-label={`Call ${pt.name}`}
                >
                  <Phone className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Call</span>
                </a>
              )}
            </Card>
          ))}
        </div>
      </section>

      {/* Safety Notice Footer */}
      <div className="p-3 bg-slate-100 rounded-xl text-[11px] text-[#4B5563] space-y-1">
        <p className="font-semibold text-slate-700">
          {lang === "hi" ? "गोपनीयता और सुरक्षा गारंटी" : "Privacy & Safety Guarantee"}
        </p>
        <p>
          {lang === "hi"
            ? "TransitIQ कोई ऑडियो, वीडियो या बैकग्राउंड लोकेशन रिकॉर्ड नहीं करता है। सभी कॉल सीधे आपके फ़ोन से किए जाते हैं।"
            : "TransitIQ does not dispatch police or record audio/video. Your device connects directly to local emergency response."}
        </p>
      </div>
    </div>
  );
}
