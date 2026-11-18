import { useTranslation } from "react-i18next";
import { useAdminControls } from "../../../admin/useAdminControls";
import Form from "../../form/Form";
import PageNavigation from "../../navigation/PageNavigation";
import "./create-character.scss";

export default function CreateCharacter() {
  const { t } = useTranslation();
  const { manageCharactersEnabled } = useAdminControls();

  return (
    <>
      <PageNavigation to="/dashboard" label={t("navigation.backToDashboard")} />
      <div className="page">
        {manageCharactersEnabled ? <Form /> : (
          <div className="character-message">
            <h2>{t("dashboard.manageRequired.title")}</h2>
            <p>{t("dashboard.manageRequired.body")}</p>
          </div>
        )}
      </div>
    </>
  );
}
