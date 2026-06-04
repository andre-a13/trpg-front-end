import React from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import type { CharacterTeamDto } from "../../../interface/IAddCharacter";


interface IdentityProps {
    race: string;
    firstTeam?: CharacterTeamDto;
}


export const Identity: React.FC<IdentityProps> = ({ race, firstTeam }) => {
    const { t } = useTranslation();

    return (
        <section className="ccard-identity" aria-label={t("characterCard.identity.label")}>
            <div className="ccard-field">
                <div className="ccard-label">{t("characterCard.identity.race")}</div>
                <div className="ccard-text" aria-label={t("characterCard.identity.raceA11y")}>{race}</div>
            </div>
            <div className="ccard-field">
                <div className="ccard-label">{t("characterCard.identity.company")}</div>
                {firstTeam ? (
                    <Link className="ccard-text ccard-teamLink" to={`/teams/${firstTeam.uuid}`}>
                        {firstTeam.name}
                    </Link>
                ) : (
                    <div className="ccard-text" aria-label={t("characterCard.identity.companyA11y")}>{t("characterCard.identity.none")}</div>
                )}
            </div>
        </section>
    );
};
