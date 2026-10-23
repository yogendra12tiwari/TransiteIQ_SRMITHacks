import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import en from "./en.json";
import hi from "./hi.json";
import { setDocumentLanguage } from "../lib/fontLoader";

const initialLang =
  (typeof window !== "undefined" && (localStorage.getItem("transitiq_lang") as "en" | "hi")) || "en";

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    hi: { translation: hi },
  },
  lng: initialLang,
  fallbackLng: "en",
  interpolation: {
    escapeValue: false,
  },
});

if (typeof window !== "undefined") {
  setDocumentLanguage(initialLang);

  i18n.on("languageChanged", (lng) => {
    const lang = lng === "hi" ? "hi" : "en";
    localStorage.setItem("transitiq_lang", lang);
    setDocumentLanguage(lang);
  });
}

export default i18n;
