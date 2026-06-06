import { Link } from "react-router";
import { useTranslation } from "react-i18next";
import { useAdminControls } from "../../../admin/useAdminControls";
import Form from "../../form/Form";
import "./create-character.scss";

export default function CreateCharacter() {
  const { t } = useTranslation();
  const { manageCharactersEnabled } = useAdminControls();

  if (!manageCharactersEnabled) {
    return (
      <div className="page">
        <div className="character-message">
          <h2>{t("dashboard.manageRequired.title")}</h2>
          <p>{t("dashboard.manageRequired.body")}</p>
          <p>
            <Link to="/dashboard">{t("navigation.dashboard")}</Link>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <Form />
    </div>
  );
}
