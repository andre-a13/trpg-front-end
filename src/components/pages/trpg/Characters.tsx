import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useLocation } from "react-router";
import type Character from "../../../models/character";
import characterService from "../../../services/character.service";
import { characterListPath, characterPath, readCharacterListPage } from "../../navigation/navigationPaths";
import PageNavigation from "../../navigation/PageNavigation";
import "./teams.scss";

const pageSize = 24;

export default function Characters() {
  const { t } = useTranslation();
  const { search } = useLocation();
  const page = readCharacterListPage(search);
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState<{ page: number; attempt: number; rows: Character[] | null } | null>(null);

  useEffect(() => {
    let current = true;
    characterService.list({ limit: pageSize + 1, offset: (page - 1) * pageSize }).then(
      (rows) => { if (current) setResult({ page, attempt, rows }); },
      () => { if (current) setResult({ page, attempt, rows: null }); },
    );
    return () => { current = false; };
  }, [page, attempt]);

  const currentResult = result?.page === page && result.attempt === attempt ? result : null;
  const characters = currentResult?.rows;

  return (<>
    <PageNavigation to="/teams" label={t("teams.returnToTeams")} />
    <main className="page">
      <section className="teams-list">
        <header className="teams-list__header"><h1>{t("navigation.characters")}</h1></header>
        {!currentResult && <p role="status">{t("common.loading")}</p>}
        {currentResult?.rows === null && (
          <p role="alert">{t("navigation.charactersError")} <button type="button" onClick={() => setAttempt(attempt + 1)}>{t("common.actions.retry")}</button></p>
        )}
        {characters?.length === 0 && <p>{t("navigation.charactersEmpty")}</p>}
        {characters && (
          <div className="teams-list__grid">
            {characters.slice(0, pageSize).map((character) => (
              <article className="team-card" key={character.id}>
                <div className="team-card__body">
                  <h2><Link to={characterPath(character.slug, characterListPath(page))}>{character.name}</Link></h2>
                  <p>{character.race}</p>
                </div>
              </article>
            ))}
          </div>
        )}
        {(page > 1 || (characters?.length ?? 0) > pageSize) && (
          <nav className="trpg-page-nav" aria-label={t("navigation.pagination")}>
            {page > 1 && <Link to={characterListPath(page - 1)}>{t("navigation.previous")}</Link>}
            {(characters?.length ?? 0) > pageSize && <Link to={characterListPath(page + 1)}>{t("navigation.next")}</Link>}
          </nav>
        )}
      </section>
    </main>
  </>);
}
