import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import "./campfire-home-button.scss";

export default function CampfireHomeButton() {
  const { t } = useTranslation();

  return (
    <Link className="campfire-home-button" to="/" aria-label={t("navigation.home")} title={t("navigation.home")}>
      <img src="/assets/campfire.svg" alt="" aria-hidden="true" />
    </Link>
  );
}
