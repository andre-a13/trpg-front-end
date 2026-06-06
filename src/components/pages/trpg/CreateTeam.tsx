import React, { useState } from "react";
import axios from "axios";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import { useAdminControls } from "../../../admin/useAdminControls";
import teamService from "../../../services/team.service";
import type { IAddTeam } from "../../../interface/IAddTeam";
import "./create-team.scss";

export default function CreateTeam() {
  const { t } = useTranslation();
  const { manageCharactersEnabled } = useAdminControls();
  const [uuid, setUuid] = useState("");
  const [name, setName] = useState("");
  const [illustrationUrl, setIllustrationUrl] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [createdTeam, setCreatedTeam] = useState<{ uuid: string; name: string } | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus(null);
    setCreatedTeam(null);

    const payload: IAddTeam = {
      name,
      uuid: uuid || undefined,
      illustrationUrl: illustrationUrl || undefined,
    };

    try {
      const res = await teamService.create(payload);
      setStatus(t("createTeam.created", { uuid: res.data.uuid, name: res.data.name }));
      setCreatedTeam({ uuid: res.data.uuid, name: res.data.name });
      setUuid("");
      setName("");
      setIllustrationUrl("");
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        setStatus(t("common.errors.status", { status: err.response?.status ?? "network", message: err.message }));
        return;
      }
      setStatus(t("createTeam.failed"));
    }
  }

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
      <form className="trpg-form" onSubmit={handleSubmit}>
        <h2>{t("createTeam.title")}</h2>

        <div>
          <label htmlFor="team-name">{t("createTeam.name")}</label>
          <input id="team-name" value={name} onChange={(e) => setName(e.target.value)} required />
        </div>

        <div>
          <label htmlFor="team-uuid">{t("createTeam.uuid")}</label>
          <input
            id="team-uuid"
            value={uuid}
            onChange={(e) => setUuid(e.target.value)}
            placeholder={t("createTeam.uuidPlaceholder")}
          />
        </div>

        <div>
          <label htmlFor="team-illustration">{t("createTeam.illustrationUrl")}</label>
          <input
            id="team-illustration"
            type="url"
            value={illustrationUrl}
            onChange={(e) => setIllustrationUrl(e.target.value)}
          />
        </div>

        <div className="trpg-form__actions">
          <button type="submit">{t("common.actions.create")}</button>
        </div>

        {status && (
          <div className="trpg-form__status">
            <strong>{status}</strong>
            {createdTeam && (
              <div className="trpg-form__next-actions">
                <Link to={`/teams/${createdTeam.uuid}`}>{t("createTeam.next.openTeam")}</Link>
                <Link to="/teams/create">{t("createTeam.next.createAnother")}</Link>
                <Link to="/teams">{t("createTeam.next.returnTeams")}</Link>
              </div>
            )}
          </div>
        )}
      </form>
    </div>
  );
}
