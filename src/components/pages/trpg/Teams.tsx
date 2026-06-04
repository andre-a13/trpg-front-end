import { useEffect, useState } from "react";
import axios from "axios";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import teamService from "../../../services/team.service";
import type { TeamDto } from "../../../interface/IAddTeam";
import "./teams.scss";

export default function Teams() {
  const { t } = useTranslation();
  const [teams, setTeams] = useState<TeamDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchTeams() {
      setLoading(true);
      setError(null);

      try {
        const data = await teamService.list();
        setTeams(data);
      } catch (err: unknown) {
        console.error("Error fetching teams:", err);
        if (axios.isAxiosError(err)) {
          setError(t("common.errors.status", { status: err.response?.status ?? "network", message: err.message }));
          return;
        }
        setError(t("teams.fetchListFailed"));
      } finally {
        setLoading(false);
      }
    }

    fetchTeams();
  }, [t]);

  return (
    <div className="page">
      {loading && (
        <div className="character-message loading">
          <div className="spinner" aria-hidden="true" />
          <p>{t("teams.loadingList")}</p>
        </div>
      )}

      {error && !loading && (
        <div className="character-message error">
          <h2>{t("common.errors.wentWrong")}</h2>
          <p>{error}</p>
          <p>
            <Link to="/">{t("common.actions.returnHome")}</Link>
          </p>
        </div>
      )}

      {!loading && !error && (
        <section className="teams-list">
          <div className="teams-list__header">
            <h2>{t("teams.title")}</h2>
            <Link to="/teams/create">{t("teams.create")}</Link>
          </div>

          {teams.length === 0 ? (
            <p className="teams-list__empty">{t("teams.empty")}</p>
          ) : (
            <div className="teams-list__grid">
              {teams.map((team) => (
                <article className="team-card" key={team.uuid}>
                  {team.illustrationUrl && (
                    <img className="team-card__image" src={team.illustrationUrl} alt="" />
                  )}
                  <div className="team-card__body">
                    <h3>
                      <Link to={`/teams/${team.uuid}`}>{team.name}</Link>
                    </h3>
                    <p className="team-card__uuid">{team.uuid}</p>

                    {team.characters && team.characters.length > 0 ? (
                      <div className="team-card__characters">
                        {team.characters.map((character) => (
                          <Link key={character.id} to={`/characters/${character.slug}`}>
                            {character.name}
                          </Link>
                        ))}
                      </div>
                    ) : (
                      <p className="team-card__empty">{t("teams.noCharacters")}</p>
                    )}
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
