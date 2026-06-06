import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import { Home } from "lucide-react";
import "./campfire-home-button.scss";

export default function CampfireHomeButton() {
  const { t } = useTranslation();

  return (
    <Link className="campfire-home-button" to="/" aria-label={t("navigation.home")} title={t("navigation.home")}>
      <Home size={17} aria-hidden="true" />
    </Link>
  );
}
