import { useTranslation } from "react-i18next";
import "./language-switch.scss";

type LanguageSwitchStyle = React.CSSProperties & {
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
  const inactiveLanguage = languages.find((language) => language.value !== activeLanguage) ?? languages[0];

  function switchLanguage() {
    i18n.changeLanguage(inactiveLanguage.value);
  }

  return (
    <div
      className="language-switch"
      aria-label={t("common.language.switchTo", { language: t(`common.language.${inactiveLanguage.value}`) })}
      onClick={switchLanguage}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          switchLanguage();
        }
      }}
      role="switch"
      aria-checked={activeLanguage === "en"}
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
          onClick={(event) => {
            event.stopPropagation();
            switchLanguage();
          }}
          aria-label={t("common.language.switchTo", { language: t(`common.language.${language.value}`) })}
          aria-pressed={language.value === activeLanguage}
          tabIndex={-1}
        >
          {language.label}
        </button>
      ))}
    </div>
  );
}
