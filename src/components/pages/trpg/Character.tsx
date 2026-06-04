import { useState, useEffect, useCallback } from "react";
import { useParams, Link } from "react-router";
import { useTranslation } from "react-i18next";
import characterService from "../../../services/character.service";
import CharacterCard from "../../character-card/CharacterCard";
import "./character.scss";
import axios from "axios";
import type Character from "../../../models/character";

type Props = {
  presetSlug?: string;
  portraitUrl?: string;
};

export default function CharacterPage({ presetSlug, portraitUrl }: Props) {
  const { t } = useTranslation();
  const params = useParams();
  const slug = presetSlug ?? params.slug ?? "";
  const [char, setChar] = useState<Character | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [notFound, setNotFound] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isDesignMode, setIsDesignMode] = useState(false);

  const fetchCharacter = useCallback(async () => {
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
      setChar(response);
    } catch (err: unknown) {
      console.error("Error fetching character:", err);
      if (axios.isAxiosError(err) && err.response?.status === 404) {
        setNotFound(true);
      } else {
        setError(t("characterPage.error"));
      }
    } finally {
      setLoading(false);
    }
  }, [slug, t]);

  useEffect(() => {
    fetchCharacter();
  }, [fetchCharacter]);

  useEffect(() => {
    if (!char?.name) return;

    const firstCompanyName = char.teams[0]?.name;
    document.title = firstCompanyName ? `${char.name} - ${firstCompanyName}` : char.name;

    return () => {
      document.title = t("characterPage.documentTitle");
    };
  }, [char, t]);

  const computedPortrait = portraitUrl ?? (slug ? `/assets/${slug}_jdr.jpg` : undefined);

  return (
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
            <Link to="/">{t("common.actions.returnHome")}</Link>
          </p>
        </div>
      )}

      {notFound && !loading && (
        <div className="character-message not-found">
          <h2>{t("characterPage.notFoundTitle")}</h2>
          <p>{t("characterPage.notFound", { slug })}</p>
          <p>
            <Link to="/">{t("common.actions.returnHome")}</Link>
          </p>
        </div>
      )}

      {!loading && !error && !notFound && char && (
        <CharacterCard
          portraitUrl={computedPortrait}
          refresh={fetchCharacter}
          character={char}
          designMode={isDesignMode}
          onToggleDesignMode={() => setIsDesignMode((value) => !value)}
        />
      )}
    </div>
  );
}
