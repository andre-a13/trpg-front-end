import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import en from "../locales/en.json";
import fr from "../locales/fr.json";

const supportedLanguages = ["fr", "en"] as const;
type SupportedLanguage = typeof supportedLanguages[number];

const isSupportedLanguage = (language: string): language is SupportedLanguage => {
  return supportedLanguages.includes(language as SupportedLanguage);
};

const normalizeLanguage = (language?: string | null): SupportedLanguage | undefined => {
  if (!language) return undefined;
  const normalized = language.split("-")[0].toLowerCase();
  return isSupportedLanguage(normalized) ? normalized : undefined;
};

const getInitialLanguage = (): SupportedLanguage => {
  if (typeof window === "undefined") return "fr";

  const storedLanguage = normalizeLanguage(window.localStorage.getItem("trpg-language"));
  if (storedLanguage) return storedLanguage;

  const browserLanguage = normalizeLanguage(window.navigator.language);
  return browserLanguage ?? "fr";
};

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    fr: { translation: fr },
  },
  lng: getInitialLanguage(),
  fallbackLng: "fr",
  supportedLngs: supportedLanguages,
  returnNull: false,
  interpolation: {
    escapeValue: false,
  },
});

i18n.on("languageChanged", (language) => {
  const nextLanguage = normalizeLanguage(language);
  if (!nextLanguage || typeof window === "undefined") return;

  window.localStorage.setItem("trpg-language", nextLanguage);
  document.documentElement.lang = nextLanguage;
});

if (typeof document !== "undefined") {
  document.documentElement.lang = i18n.resolvedLanguage ?? i18n.language;
}

export default i18n;
