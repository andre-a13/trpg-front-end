import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useLocation, useSearchParams } from "react-router";
import type { LightWordResponse } from "../../api/generated/types.gen";
import { useAuth } from "../../auth/useAuth";
import lightBookService from "../../services/light-book.service";
import PageNavigation from "../navigation/PageNavigation";
import { characterToolReturn, readOrigin } from "../navigation/navigationPaths";
import LightBookManagement from "./LightBookManagement";
import LightWordPage from "./LightWordPage";
import "./light-book.scss";

const WORDS_PER_PAGE = 4;
const PAGES_PER_SPREAD = 2;
const WORDS_PER_SPREAD = WORDS_PER_PAGE * PAGES_PER_SPREAD;

function Catalogue({ canManage, requestedWord }: { canManage: boolean; requestedWord: string | null }) {
  const { t } = useTranslation();
  const [words, setWords] = useState<(LightWordResponse | null)[] | null>(null);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [browsedSpread, setBrowsedSpread] = useState<number | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    lightBookService.listWords(controller.signal).then((entries) => {
      if (!controller.signal.aborted) setWords(entries);
    }).catch(() => {
      if (!controller.signal.aborted) setError(true);
    });
    return () => controller.abort();
  }, [attempt]);

  const entryCount = words?.length ?? 0;
  const spreadCount = Math.ceil(entryCount / WORDS_PER_SPREAD);
  const selectedIndex = requestedWord === null ? -1 : words?.findIndex((entry) => entry?.id.toString() === requestedWord) ?? -1;
  const selectedWordId = words?.[selectedIndex]?.id;
  const spread = browsedSpread ?? Math.floor(Math.max(0, selectedIndex) / WORDS_PER_SPREAD);
  const firstPage = spread * PAGES_PER_SPREAD + 1;
  const offset = spread * WORDS_PER_SPREAD;
  const lastPage = Math.min(firstPage + 1, Math.ceil(entryCount / WORDS_PER_PAGE));

  return (
    <main className="light-catalogue">
      <header className="light-catalogue__header"><h1>{t("lightBook.catalogue.title")}</h1></header>
      {error && (
        <p role="alert">
          {t("lightBook.errors.catalogue")} <button type="button" onClick={() => { setError(false); setAttempt((count) => count + 1); }}>{t("lightBook.retry")}</button>
        </p>
      )}
      {!words && !error && <p role="status">{t("common.loading")}</p>}
      {words && (
        <>
          <div className="light-catalogue__book">
            <LightWordPage pageNumber={firstPage} words={words.slice(offset, offset + WORDS_PER_PAGE)} selectedWordId={selectedWordId} />
            <LightWordPage pageNumber={firstPage + 1} words={words.slice(offset + WORDS_PER_PAGE, offset + WORDS_PER_SPREAD)} selectedWordId={selectedWordId} />
            {!entryCount && <p className="light-catalogue__empty">{t("lightBook.catalogue.empty")}</p>}
          </div>
          {spreadCount > 1 && (
            <nav className="light-catalogue__navigation" aria-label={t("lightBook.catalogue.navigation")}>
              <button type="button" disabled={spread === 0} onClick={() => setBrowsedSpread(spread - 1)}>
                <ChevronLeft size={18} aria-hidden="true" />{t("lightBook.catalogue.previous")}
              </button>
              <p role="status">{t(firstPage === lastPage ? "lightBook.catalogue.page" : "lightBook.catalogue.pageRange", { number: firstPage, start: firstPage, end: lastPage })}</p>
              <button type="button" disabled={spread >= spreadCount - 1} onClick={() => setBrowsedSpread(spread + 1)}>
                {t("lightBook.catalogue.next")}<ChevronRight size={18} aria-hidden="true" />
              </button>
            </nav>
          )}
          {canManage && (
            <LightBookManagement words={words.filter((word) => word !== null)} onCreate={(word) => {
              setBrowsedSpread(Math.floor(entryCount / WORDS_PER_SPREAD));
              setWords((current) => [...(current ?? []), word]);
            }} />
          )}
        </>
      )}
    </main>
  );
}

export default function LightWordsCatalogue() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { search } = useLocation();
  const [params] = useSearchParams();
  const requestedWord = params.get("word");
  const canManage = user?.role === "admin";
  const sheetReturn = characterToolReturn(search, canManage, "light-book");
  const dashboardReturn = canManage && readOrigin(search) === "/dashboard";
  return (
    <>
      <PageNavigation
        to={sheetReturn ?? (dashboardReturn ? "/dashboard" : "/")}
        label={t(sheetReturn ? "navigation.backToSheet" : dashboardReturn ? "navigation.backToDashboard" : "navigation.home")}
      />
      <Catalogue
        key={JSON.stringify([user?.id, user?.role, requestedWord])}
        canManage={canManage}
        requestedWord={requestedWord}
      />
    </>
  );
}
