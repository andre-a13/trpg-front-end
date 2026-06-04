import { type FormEvent, useCallback, useEffect, useState } from "react";
import axios from "axios";
import { useTranslation } from "react-i18next";
import { Link, useParams } from "react-router";
import type Character from "../../../models/character";
import characterService from "../../../services/character.service";
import teamService from "../../../services/team.service";
import type { TeamCharacterDto, TeamDto } from "../../../interface/IAddTeam";
import "./team.scss";

export default function Team() {
  const { t } = useTranslation();
  const { uuid } = useParams();
  const [team, setTeam] = useState<TeamDto | null>(null);
  const [availableCharacters, setAvailableCharacters] = useState<Character[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isAddingMember, setIsAddingMember] = useState(false);
  const [memberSlug, setMemberSlug] = useState("");
  const [memberStatus, setMemberStatus] = useState<string | null>(null);
  const [memberSubmitting, setMemberSubmitting] = useState(false);

  const fetchTeam = useCallback(async () => {
    if (!uuid) {
      setLoading(false);
      setNotFound(true);
      return;
    }

    setLoading(true);
    setError(null);
    setNotFound(false);

    try {
      const [data, roster] = await Promise.all([
        teamService.getByUuid(uuid),
        characterService.list(),
      ]);
      setTeam(data);
      setAvailableCharacters(roster);
    } catch (err: unknown) {
      console.error("Error fetching team:", err);
      if (axios.isAxiosError(err) && err.response?.status === 404) {
        setNotFound(true);
      } else if (axios.isAxiosError(err)) {
        setError(t("common.errors.status", { status: err.response?.status ?? "network", message: err.message }));
      } else {
        setError(t("teams.fetchDetailFailed"));
      }
    } finally {
      setLoading(false);
    }
  }, [t, uuid]);

  const assignedSlugs = new Set((team?.characters ?? []).map((character) => character.slug));
  const charactersToAdd = availableCharacters.filter((character) => !assignedSlugs.has(character.slug));
  const memberQuery = memberSlug.trim().toLowerCase();
  const matchingCharacters = charactersToAdd
    .filter((character) => {
      if (!memberQuery) return true;
      return (
        character.slug.toLowerCase().includes(memberQuery) ||
        character.name.toLowerCase().includes(memberQuery) ||
        character.race.toLowerCase().includes(memberQuery)
      );
    })
    .slice(0, 6);

  useEffect(() => {
    fetchTeam();
  }, [fetchTeam]);

  async function handleAddMember(e: FormEvent) {
    e.preventDefault();
    if (!uuid || !memberSlug.trim()) return;

    setMemberSubmitting(true);
    setMemberStatus(null);

    const selectedCharacter = charactersToAdd.find((character) => {
      const query = memberSlug.trim().toLowerCase();
      return character.slug.toLowerCase() === query || character.name.toLowerCase() === query;
    });

    try {
      await teamService.addMember(uuid, selectedCharacter?.slug ?? memberSlug.trim());
      setMemberSlug("");
      setIsAddingMember(false);
      setMemberStatus(t("teams.memberAdded"));
      await fetchTeam();
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        setMemberStatus(t("common.errors.status", { status: err.response?.status ?? "network", message: err.message }));
        return;
      }
      setMemberStatus(t("teams.addMemberFailed"));
    } finally {
      setMemberSubmitting(false);
    }
  }

  return (
    <div className="page">
      {loading && (
        <div className="character-message loading">
          <div className="spinner" aria-hidden="true" />
          <p>{t("teams.loadingDetail")}</p>
        </div>
      )}

      {error && !loading && (
        <div className="character-message error">
          <h2>{t("common.errors.wentWrong")}</h2>
          <p>{error}</p>
          <p>
            <Link to="/teams">{t("teams.returnToTeams")}</Link>
          </p>
        </div>
      )}

      {notFound && !loading && (
        <div className="character-message not-found">
          <h2>{t("teams.notFoundTitle")}</h2>
          <p>{t("teams.notFound", { uuid })}</p>
          <p>
            <Link to="/teams">{t("teams.returnToTeams")}</Link>
          </p>
        </div>
      )}

      {!loading && !error && !notFound && team && (
        <section className="team-detail">
          <header className="team-detail__header">
            <h1>{team.name}</h1>
            <button type="button" onClick={() => setIsAddingMember((value) => !value)}>
              {t("teams.addMember")}
            </button>
          </header>

          {isAddingMember && (
            <form className="team-detail__member-form" onSubmit={handleAddMember}>
              <label htmlFor="team-member-picker">{t("teams.characterPicker")}</label>
              <div className="team-detail__member-row">
                <input
                  id="team-member-picker"
                  list="team-member-options"
                  value={memberSlug}
                  onChange={(e) => setMemberSlug(e.target.value)}
                  placeholder={t("teams.characterPickerPlaceholder")}
                  required
                />
                <datalist id="team-member-options">
                  {charactersToAdd.map((character) => (
                    <option
                      key={character.slug}
                      value={character.slug}
                      label={`${character.name} - ${character.race}`}
                    />
                  ))}
                </datalist>
                <button type="submit" disabled={memberSubmitting}>
                  {memberSubmitting ? t("teams.adding") : t("common.actions.add")}
                </button>
              </div>
              <p className="team-detail__member-help">
                {charactersToAdd.length > 0 ? t("teams.characterPickerHelp") : t("teams.noAvailableCharacters")}
              </p>
              {charactersToAdd.length > 0 && (
                <div className="team-detail__picker-list" aria-label={t("teams.characterPicker")}>
                  {matchingCharacters.map((character) => (
                    <button
                      key={character.slug}
                      type="button"
                      className={memberSlug === character.slug ? "is-selected" : ""}
                      onClick={() => setMemberSlug(character.slug)}
                    >
                      <span>{character.name}</span>
                      <small>{character.race} - {character.slug}</small>
                    </button>
                  ))}
                </div>
              )}
            </form>
          )}

          {memberStatus && <p className="team-detail__member-status">{memberStatus}</p>}

          {(team.characters ?? []).length === 0 ? (
            <p className="team-detail__empty">{t("teams.noCharacters")}</p>
          ) : (
            <div className="team-detail__grid">
              {(team.characters ?? []).map((character: TeamCharacterDto) => {
                const portraitUrl = character.portraitUrl || `/assets/${character.slug}_jdr.jpg`;

                return (
                  <Link className="team-detail__portrait" key={character.slug} to={`/characters/${character.slug}`}>
                    <img src={portraitUrl} alt={character.name} />
                    <span>
                      <strong>{character.name}</strong>
                      <small>{character.race}</small>
                    </span>
                  </Link>
                );
              })}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
