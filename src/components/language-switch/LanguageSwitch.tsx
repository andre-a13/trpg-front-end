import type { CSSProperties } from "react";
import { useTranslation } from "react-i18next";
import "./language-switch.scss";

type LanguageSwitchStyle = CSSProperties & {
  "--active-index": number;
};

const languages = [
  { label: "FR", value: "fr" },
  { label: "EN", value: "en" },
];

export default function LanguageSwitch() {
  const { i18n, t } = useTranslation();
  const activeLanguage = i18n.resolvedLanguage ?? i18n.language;
  const activeIndex = Math.max(
    languages.findIndex((language) => language.value === activeLanguage),
    0
  );
  const switchStyle: LanguageSwitchStyle = { "--active-index": activeIndex };

  function switchLanguage(language: string) {
    if (language !== activeLanguage) i18n.changeLanguage(language);
  }

  return (
    <div
      className="language-switch"
      aria-label={t("common.language.current")}
      role="group"
      tabIndex={0}
      style={switchStyle}
    >
      <span className="language-switch__thumb" aria-hidden="true" />
      {languages.map((language) => (
        <button
          className={
            language.value === activeLanguage
              ? "language-switch__item language-switch__item--active"
              : "language-switch__item"
          }
          key={language.value}
          type="button"
          onClick={() => switchLanguage(language.value)}
          aria-label={t("common.language.switchTo", { language: t(`common.language.${language.value}`) })}
          aria-pressed={language.value === activeLanguage}
        >
          {language.label}
        </button>
      ))}
    </div>
  );
}
