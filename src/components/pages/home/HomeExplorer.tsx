import { useEffect, useState } from "react";
import { ArrowRight, BookOpen, Hammer, Search, ScrollText, Shield, Swords, Users } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import { useAuth } from "../../../auth/useAuth";
import teamService from "../../../services/team.service";
import type { TeamDto } from "../../../types/api";

type View = "companies" | "characters" | "tools";
const views = ["companies", "characters", "tools"] as const;
const viewIcons = { companies: Swords, characters: Users, tools: Hammer };
const tools = [
  { key: "forge", to: "/hearthstone-forge", Icon: Hammer },
  { key: "printer", to: "/hearthstone-printer", Icon: ScrollText },
] as const;

export default function HomeExplorer() {
  const { t } = useTranslation();
  const { user, isAuthenticated, isInitializing } = useAuth();
  const userId = user?.id ?? null;
  const [view, setView] = useState<View>("companies");
  const [query, setQuery] = useState("");
  const [load, setLoad] = useState<{ userId: number | null; teams: TeamDto[]; state: "loading" | "ready" | "error" }>({ userId: null, teams: [], state: "loading" });
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (userId === null || !isAuthenticated) return;
    let active = true;
    teamService.list().then(
      (teams) => { if (active) setLoad({ userId, teams, state: "ready" }); },
      () => { if (active) setLoad({ userId, teams: [], state: "error" }); },
    );
    return () => { active = false; };
  }, [userId, isAuthenticated, attempt]);
  const teams = load.userId === userId && isAuthenticated ? load.teams : [];
  const state = load.userId === userId ? load.state : "loading";
  const search = query.trim().toLocaleLowerCase();
  const companies = teams.filter((team) => team.name.toLocaleLowerCase().includes(search));
  const characters = [...new Map(teams.flatMap((team) => team.characters).map((member) => [member.id, member])).values()]
    .filter((member) => `${member.name} ${member.race}`.toLocaleLowerCase().includes(search));
  function retry() {
    setLoad({ userId, teams: [], state: "loading" });
    setAttempt((value) => value + 1);
  }
  return (
    <section className="home-explorer" aria-labelledby="home-explorer-title">
      <div className="home-explorer__topline"><span className="home-explorer__index">02</span><h3 id="home-explorer-title">{t("home.explorer.title")}</h3><BookOpen size={19} aria-hidden="true" /></div>
      <div className="home-explorer__views" role="group" aria-label={t("home.explorer.views")}>
        {views.map((key) => {
          const Icon = viewIcons[key];
          return <button type="button" key={key} aria-pressed={view === key} onClick={() => { setView(key); setQuery(""); }}><Icon size={17} aria-hidden="true" />{t(`home.explorer.${key}`)}</button>;
        })}
      </div>
      <div className="home-explorer__content">
        {view === "tools" ? (
          <div className="home-explorer__entries">
            {tools.map(({ key, to, Icon }) => <Link className="home-explorer__entry" to={isAuthenticated ? to : "/login"} key={key}><span className="home-explorer__symbol"><Icon size={23} aria-hidden="true" /></span><span><strong>{t(`home.explorer.${key}.title`)}</strong><small>{t(`home.explorer.${key}.description`)}</small></span><ArrowRight size={19} aria-hidden="true" /></Link>)}
            {!isAuthenticated && <p className="home-explorer__note">{t("home.explorer.toolsLogin")}</p>}
          </div>
        ) : isInitializing ? (
          <p className="home-explorer__message" role="status">{t("common.loading")}</p>
        ) : !isAuthenticated ? (
          <div className="home-explorer__guest"><Shield size={31} aria-hidden="true" /><h4>{t("home.explorer.guestTitle")}</h4><p>{t("home.explorer.guestIntro")}</p><Link to="/login">{t("home.actions.login")}<ArrowRight size={17} aria-hidden="true" /></Link></div>
        ) : state === "loading" ? (
          <p className="home-explorer__message" role="status">{t("home.explorer.loading")}</p>
        ) : state === "error" ? (
          <div className="home-explorer__message"><p role="alert">{t("home.explorer.failed")}</p><button type="button" onClick={retry}>{t("home.explorer.retry")}</button></div>
        ) : teams.length === 0 ? (
          <div className="home-explorer__message"><p>{t("home.explorer.empty")}</p><Link to="/teams">{t("home.explorer.allCompanies")}<ArrowRight size={17} aria-hidden="true" /></Link></div>
        ) : (
          <>
            <label className="home-explorer__search"><Search size={17} aria-hidden="true" /><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} aria-label={t(`home.explorer.search.${view}`)} placeholder={t(`home.explorer.search.${view}`)} /></label>
            <div className="home-explorer__entries" aria-label={t(`home.explorer.${view}`)}>
              {view === "companies" ? companies.slice(0, 4).map((team) => (
                <Link className="home-explorer__entry" key={team.uuid} to={`/teams/${team.uuid}`}>
                  <span className="home-explorer__symbol">{team.illustrationUrl ? <img src={team.illustrationUrl} alt="" /> : <Swords size={23} aria-hidden="true" />}</span>
                  <span><strong>{team.name}</strong><small>{t("home.explorer.memberCount", { count: team.characters.length })}<span className="home-explorer__dot">·</span>{t("home.explorer.healthAccess")}</small></span><ArrowRight size={19} aria-hidden="true" />
                </Link>
              )) : characters.slice(0, 4).map((member) => (
                <Link className="home-explorer__entry" key={member.id} to={`/characters/${member.slug}`}>
                  <span className="home-explorer__symbol"><Users size={23} aria-hidden="true" /></span><span><strong>{member.name}</strong><small>{member.race}<span className="home-explorer__dot">·</span>{t("home.explorer.hp", { current: member.current_hp, max: member.max_hp })}</small></span><ArrowRight size={19} aria-hidden="true" />
                </Link>
              ))}
              {(view === "companies" ? companies.length : characters.length) === 0 && <p className="home-explorer__message">{t("home.explorer.noResults")}</p>}
            </div>
            <Link className="home-explorer__all" to="/teams">{t("home.explorer.allCompanies")}<ArrowRight size={17} aria-hidden="true" /></Link>
          </>
        )}
      </div>
    </section>
  );
}
