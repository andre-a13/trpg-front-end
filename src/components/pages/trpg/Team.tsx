import { type ChangeEvent, type DragEvent, type FormEvent, useCallback, useEffect, useRef, useState } from "react";
import axios from "axios";
import { useTranslation } from "react-i18next";
import { Link, useParams } from "react-router";
import { useAdminControls } from "../../../admin/useAdminControls";
import { useAuth } from "../../../auth/useAuth";
import Character from "../../../models/character";
import characterService from "../../../services/character.service";
import teamService from "../../../services/team.service";
import type { TeamCharacterDto, TeamDto } from "../../../interface/IAddTeam";
import TeamHealthDashboard from "./TeamHealthDashboard";
import "./team.scss";

const ALLOWED_TEAM_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const TEAM_IMAGE_MAX_SIZE_BYTES = 15 * 1024 * 1024;
const SHOW_TEAM_ILLUSTRATION_UPLOAD = false;

type HpSave = {
  desiredHp: number;
  confirmedHp: number;
  maxHp: number;
  completion?: Promise<void>;
};

export default function Team() {
  const { t } = useTranslation();
  const { uuid } = useParams();
  const { user } = useAuth();
  const { isAdmin, manageCharactersEnabled } = useAdminControls();
  const [team, setTeam] = useState<TeamDto | null>(null);
  const [availableCharacters, setAvailableCharacters] = useState<Character[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isAddingMember, setIsAddingMember] = useState(false);
  const [memberSlug, setMemberSlug] = useState("");
  const [memberStatus, setMemberStatus] = useState<string | null>(null);
  const [memberSubmitting, setMemberSubmitting] = useState(false);
  const [isDraggingUpload, setIsDraggingUpload] = useState(false);
  const [illustrationStatus, setIllustrationStatus] = useState<string | null>(null);
  const [isUploadingIllustration, setIsUploadingIllustration] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const hpRequests = useRef(new Map<string, HpSave>());
  const activeTeamUuid = useRef(uuid);
  const [hpSaving, setHpSaving] = useState<Record<string, boolean>>({});
  const [hpErrors, setHpErrors] = useState<Record<string, string | null>>({});

  const fetchTeam = useCallback(async () => {
    if (!uuid) {
      setLoading(false);
      setNotFound(true);
      return;
    }

    setLoading(true);
    setError(null);
    setHpErrors({});
    setNotFound(false);

    try {
      const [data, roster] = await Promise.all([
        teamService.getByUuid(uuid),
        isAdmin && manageCharactersEnabled ? characterService.list() : Promise.resolve([]),
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
  }, [isAdmin, manageCharactersEnabled, t, uuid]);

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
    activeTeamUuid.current = uuid;
    fetchTeam();
  }, [fetchTeam, uuid]);

  function canEditMember(character: TeamCharacterDto) {
    return Boolean(
      (user?.role === "admin" && manageCharactersEnabled) ||
      (user?.role === "player" && character.ownerUserId === user.id)
    );
  }

  function showHp(slug: string, currentHp: number, maxHp: number) {
    setTeam((previous) => previous ? {
      ...previous,
      characters: previous.characters.map((member) => member.slug === slug ? {
        ...member, current_hp: currentHp, max_hp: maxHp,
      } : member),
    } : previous);
  }

  async function persistHp(slug: string, request: HpSave) {
    try {
      while (true) {
        const sentHp = request.desiredHp;
        const response = await characterService.patch(slug, { current_hp: sentHp });
        const updated = new Character(response.data);
        request.confirmedHp = updated.current_hp;
        request.maxHp = updated.getMaxHp();
        const hasNewClicks = request.desiredHp !== sentHp;
        if (!hasNewClicks) request.desiredHp = request.confirmedHp;
        showHp(slug, request.desiredHp, request.maxHp);
        if (!hasNewClicks || request.desiredHp === request.confirmedHp) break;
      }
    } catch {
      showHp(slug, request.confirmedHp, request.maxHp);
      setHpErrors((previous) => ({ ...previous, [slug]: t("teamHealth.saveFailed") }));
    } finally {
      hpRequests.current.delete(slug);
      setHpSaving((previous) => ({ ...previous, [slug]: false }));
    }
  }

  function handleAdjustHp(slug: string, delta: number) {
    const character = team?.characters.find((member) => member.slug === slug);
    if (!character || !canEditMember(character) ||
        !Number.isInteger(delta) || delta === 0 || Math.abs(delta) > 9999) return;

    const pending = hpRequests.current.get(slug);
    const currentHp = pending?.desiredHp ?? character.current_hp;
    const maxHp = pending?.maxHp ?? character.max_hp;
    const nextHp = delta < 0
      ? Math.max(0, currentHp + delta)
      : Math.max(currentHp, Math.min(maxHp, currentHp + delta));
    if (nextHp === currentHp) return;

    showHp(slug, nextHp, maxHp);
    setHpErrors((previous) => ({ ...previous, [slug]: null }));
    if (pending) {
      pending.desiredHp = nextHp;
      return;
    }
    const request: HpSave = { desiredHp: nextHp, confirmedHp: currentHp, maxHp };
    hpRequests.current.set(slug, request);
    setHpSaving((previous) => ({ ...previous, [slug]: true }));
    request.completion = persistHp(slug, request);
  }

  async function refreshHealth() {
    const requestedUuid = uuid;
    while (hpRequests.current.size > 0) {
      await Promise.all([...hpRequests.current.values()].map((request) => request.completion));
    }
    if (activeTeamUuid.current === requestedUuid) await fetchTeam();
  }

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

  function validateIllustrationFile(file: File) {
    if (!ALLOWED_TEAM_IMAGE_TYPES.has(file.type)) {
      return t("teams.upload.invalidFormat");
    }
    if (file.size > TEAM_IMAGE_MAX_SIZE_BYTES) {
      return t("teams.upload.tooLarge");
    }
    return null;
  }

  async function uploadIllustrationFile(file: File) {
    if (!team) return;

    const validationError = validateIllustrationFile(file);
    if (validationError) {
      setIllustrationStatus(validationError);
      return;
    }

    setIllustrationStatus(t("teams.upload.uploading", { team: team.name }));
    setIsUploadingIllustration(true);

    try {
      const updatedTeam = await teamService.uploadIllustration(team.uuid, file);
      setTeam(updatedTeam);
      setIllustrationStatus(t("teams.upload.success", { team: updatedTeam.name }));
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        setIllustrationStatus(t("common.errors.status", { status: err.response?.status ?? "network", message: err.message }));
        return;
      }
      setIllustrationStatus(t("teams.upload.failed"));
    } finally {
      setIsUploadingIllustration(false);
      setIsDraggingUpload(false);
    }
  }

  function handleIllustrationInputChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (file) void uploadIllustrationFile(file);
    event.target.value = "";
  }

  function handleIllustrationDragOver(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    event.dataTransfer.dropEffect = "copy";
    setIsDraggingUpload(true);
  }

  function handleIllustrationDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDraggingUpload(false);
    const file = event.dataTransfer.files?.[0];
    if (file) void uploadIllustrationFile(file);
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
            <div>
              <Link className="team-detail__back" to="/teams">{t("teams.returnToTeams")}</Link>
              <h1>{team.name}</h1>
              <p>{t("teams.memberCount", { count: team.characters?.length ?? 0 })}</p>
            </div>
            {isAdmin && manageCharactersEnabled && (
              <button type="button" onClick={() => setIsAddingMember((value) => !value)}>
                {t("teams.addMember")}
              </button>
            )}
          </header>

          {isAdmin && manageCharactersEnabled && isAddingMember && (
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
                      <span className="team-detail__picker-meta">{character.race} - {character.slug}</span>
                    </button>
                  ))}
                </div>
              )}
            </form>
          )}

          {memberStatus && <p className="team-detail__member-status">{memberStatus}</p>}

          {SHOW_TEAM_ILLUSTRATION_UPLOAD && (
            <>
              <section
                className={`team-detail__upload-rail ${isDraggingUpload ? "is-dragging" : ""}`}
                onDragOver={handleIllustrationDragOver}
                onDragLeave={() => setIsDraggingUpload(false)}
                onDrop={handleIllustrationDrop}
              >
                <div className="team-detail__upload-track" aria-hidden="true" />
                {team.illustrationUrl && (
                  <img className="team-detail__upload-preview" src={team.illustrationUrl} alt="" />
                )}
                <div className="team-detail__upload-controls">
                  <span>{t("teams.upload.currentTeam", { team: team.name })}</span>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploadingIllustration}
                  >
                    {isUploadingIllustration ? t("teams.upload.uploadingShort") : t("teams.upload.choose")}
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handleIllustrationInputChange}
                  />
                </div>
                <p>{t("teams.upload.dropHint")}</p>
              </section>

              {illustrationStatus && <p className="team-detail__member-status">{illustrationStatus}</p>}
            </>
          )}

          {(team.characters ?? []).length === 0 ? (
            <p className="team-detail__empty">{t("teams.noCharacters")}</p>
          ) : (
            <TeamHealthDashboard
              key={team.uuid}
              members={team.characters.map((character) => ({
                slug: character.slug,
                name: character.name,
                race: character.race,
                portraitUrl: character.portraitUrl,
                currentHp: character.current_hp,
                maxHp: character.max_hp,
                canEdit: canEditMember(character),
                isSaving: hpSaving[character.slug] ?? false,
                error: hpErrors[character.slug] ?? null,
              }))}
              onAdjustHp={handleAdjustHp}
              onRefresh={() => { void refreshHealth(); }}
              refreshing={loading}
            />
          )}
        </section>
      )}
    </div>
  );
}
