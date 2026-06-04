import { useEffect, useState } from "react";
import axios from "axios";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import { useAuth } from "../../../auth/useAuth";
import teamService from "../../../services/team.service";
import type { TeamDto } from "../../../interface/IAddTeam";
import "./teams.scss";

export default function Teams() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const isAdmin = user?.username === "admin";
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
            <div>
              <h2>{t("teams.title")}</h2>
              <p>{t("teams.listIntro")}</p>
            </div>
            {isAdmin && <Link to="/teams/create">{t("teams.create")}</Link>}
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
                    <div className="team-card__heading">
                      <h3>
                        <Link to={`/teams/${team.uuid}`}>{team.name}</Link>
                      </h3>
                      <span>{t("teams.memberCount", { count: team.characters?.length ?? 0 })}</span>
                    </div>

                    {team.characters && team.characters.length > 0 ? (
                      <div className="team-card__characters">
                        {team.characters.slice(0, 6).map((character) => {
                          const portraitUrl = character.portraitUrl || `/assets/${character.slug}_jdr.jpg`;

                          return (
                            <Link key={character.id} to={`/characters/${character.slug}`}>
                              <img src={portraitUrl} alt="" />
                              <span>
                                <strong>{character.name}</strong>
                                <small>{character.race}</small>
                              </span>
                            </Link>
                          );
                        })}
                        {team.characters.length > 6 && (
                          <Link className="team-card__more" to={`/teams/${team.uuid}`}>
                            {t("teams.moreMembers", { count: team.characters.length - 6 })}
                          </Link>
                        )}
                      </div>
                    ) : (
                      <p className="team-card__empty">{t("teams.noCharacters")}</p>
                    )}

                    <Link className="team-card__open" to={`/teams/${team.uuid}`}>
                      {t("teams.openTeam")}
                    </Link>
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
