import { useState, useEffect, useCallback, useRef } from "react";
import { Hammer } from "lucide-react";
import { useLocation, useParams, Link } from "react-router";
import { useTranslation } from "react-i18next";
import { useAdminControls } from "../../../admin/useAdminControls";
import { useAuth } from "../../../auth/useAuth";
import characterService from "../../../services/character.service";
import CharacterCard from "../../character-card/CharacterCard";
import useCharacterLightBook from "../../light-book/useCharacterLightBook";
import PageNavigation from "../../navigation/PageNavigation";
import { characterParent, characterPath, withOrigin } from "../../navigation/navigationPaths";
import "./character.scss";
import axios from "axios";
import type Character from "../../../models/character";

type Props = {
  presetSlug?: string;
  portraitUrl?: string;
};

export default function CharacterPage({ presetSlug, portraitUrl }: Props) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { manageCharactersEnabled } = useAdminControls();
  const { search, hash } = useLocation();
  const params = useParams();
  const slug = presetSlug ?? params.slug ?? "";
  const [char, setChar] = useState<Character | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [notFound, setNotFound] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isDesignMode, setIsDesignMode] = useState(false);
  const requestRevision = useRef(0);

  const fetchCharacter = useCallback(async () => {
    const revision = ++requestRevision.current;
    if (!slug) {
      setLoading(false);
      setNotFound(true);
      return;
    }

    setLoading(true);
    setError(null);
    setNotFound(false);

    try {
      const response = await characterService.getBySlug(slug);
      if (revision === requestRevision.current) setChar(response);
    } catch (err: unknown) {
      if (revision !== requestRevision.current) return;
      console.error("Error fetching character:", err);
      if (axios.isAxiosError(err) && err.response?.status === 404) {
        setNotFound(true);
      } else {
        setError(t("characterPage.error"));
      }
    } finally {
      if (revision === requestRevision.current) setLoading(false);
    }
  }, [slug, t]);

  useEffect(() => {
    void fetchCharacter();
    return () => { requestRevision.current += 1; };
  }, [fetchCharacter]);

  useEffect(() => {
    if (!char?.name) return;

    const firstCompanyName = char.teams[0]?.name;
    document.title = firstCompanyName ? `${char.name} - ${firstCompanyName}` : char.name;

    return () => {
      document.title = t("characterPage.documentTitle");
    };
  }, [char, t]);

  const visibleCharacter = !loading && !error && !notFound && char?.slug === slug ? char : null;
  const parent = characterParent(search, user?.role === "admin");
  const firstTeam = visibleCharacter?.teams[0];
  const backTo = parent ?? (firstTeam ? `/teams/${encodeURIComponent(firstTeam.uuid)}` : "/characters");
  const backLabel = backTo === "/dashboard" ? "navigation.backToDashboard"
    : backTo === "/teams" ? "teams.returnToTeams"
    : backTo.split("?", 1)[0] === "/characters" ? "navigation.backToCharacters" : "navigation.backToCompany";
  const sheetHref = characterPath(slug, parent);
  const toolViewer = visibleCharacter && user && (user.role === "admin" || user.id === visibleCharacter.ownerUserId)
    ? user.id
    : null;
  const canOpenForge = toolViewer !== null && visibleCharacter?.hearthstomancer.enabled === true;
  const { book: lightBook, retry: retryLightBook } = useCharacterLightBook(visibleCharacter?.slug ?? null, toolViewer);
  const moduleHash = hash === "#deck" || (hash === "#light-book" && lightBook) ? hash : null;

  useEffect(() => {
    if (!visibleCharacter || !moduleHash) return;
    const module = document.getElementById(moduleHash.slice(1));
    module?.scrollIntoView?.({ block: "center" });
    module?.focus({ preventScroll: true });
  }, [visibleCharacter, moduleHash]);

  const computedPortrait = portraitUrl ?? (slug ? `/assets/${slug}_jdr.jpg` : undefined);
  const canEdit = Boolean(
    char &&
    (
      (user?.role === "player" && char.ownerUserId === user.id) ||
      (user?.role === "admin" && manageCharactersEnabled)
    )
  );

  return (<>
    <PageNavigation to={backTo} label={t(backLabel)}>
      {lightBook && <Link to={withOrigin("/light-words", sheetHref)}>{t("lightBook.catalogue.title")}</Link>}
      {retryLightBook && (
        <button type="button" className="trpg-page-nav__retry" onClick={retryLightBook}>
          {t("lightBook.errors.load")} {t("lightBook.retry")}
        </button>
      )}
      {visibleCharacter?.hearthstomancer.configured && (
        <Link to={withOrigin(`${characterPath(slug)}/deck`, sheetHref)}>{t("hearthstomancer.actions.openDeck")}</Link>
      )}
      {canOpenForge && (
        <Link to={withOrigin("/hearthstone-forge", sheetHref)}>
          <Hammer size={16} aria-hidden="true" /> {t("navigation.forge")}
        </Link>
      )}
    </PageNavigation>
    <div className="page">
      {loading && (
        <div className="character-message loading">
          <div className="spinner" aria-hidden="true" />
          <p>{t("characterPage.loading")}</p>
        </div>
      )}

      {error && !loading && (
        <div className="character-message error">
          <h2>{t("common.errors.wentWrong")}</h2>
          <p>{error}</p>
          <p>
            <button type="button" onClick={() => void fetchCharacter()}>{t("common.actions.retry")}</button>
          </p>
        </div>
      )}

      {notFound && !loading && (
        <div className="character-message not-found">
          <h2>{t("characterPage.notFoundTitle")}</h2>
          <p>{t("characterPage.notFound", { slug })}</p>
        </div>
      )}

      {visibleCharacter && (
        <CharacterCard
          portraitUrl={computedPortrait}
          refresh={fetchCharacter}
          character={visibleCharacter}
          sheetHref={sheetHref}
          lightBook={lightBook}
          canEdit={canEdit}
          designMode={isDesignMode}
          onToggleDesignMode={() => setIsDesignMode((value) => !value)}
        />
      )}
    </div>
  </>);
}
