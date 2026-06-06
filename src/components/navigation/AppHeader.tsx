import { Home, LayoutDashboard, LogOut, ShieldPlus, Swords, UserPlus } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link, NavLink, useNavigate } from "react-router";
import { useAuth } from "../../auth/useAuth";
import { useAdminControls } from "../../admin/useAdminControls";
import LanguageSwitch from "../language-switch/LanguageSwitch";
import "./app-header.scss";

export default function AppHeader() {
  const { t } = useTranslation();
  const { logout, user } = useAuth();
  const { isAdmin, manageCharactersEnabled } = useAdminControls();
  const navigate = useNavigate();

  async function handleLogout() {
    await logout();
    navigate("/", { replace: true });
  }

  return (
    <header className="trpg-app-header">
      <Link className="trpg-app-header__brand" to="/" aria-label={t("navigation.home")}>
        <Home size={17} aria-hidden="true" />
        <span>TRPG</span>
      </Link>

      <nav className="trpg-app-header__nav" aria-label={t("navigation.app")}>
        <NavLink to="/teams">
          <Swords size={16} aria-hidden="true" />
          {t("navigation.teams")}
        </NavLink>
        {isAdmin && (
          <NavLink to="/dashboard">
            <LayoutDashboard size={16} aria-hidden="true" />
            {t("navigation.dashboard")}
          </NavLink>
        )}
        {isAdmin && manageCharactersEnabled && (
          <>
            <NavLink to="/characters/new">
              <UserPlus size={16} aria-hidden="true" />
              {t("navigation.newCharacter")}
            </NavLink>
            <NavLink to="/teams/create">
              <ShieldPlus size={16} aria-hidden="true" />
              {t("navigation.newTeam")}
            </NavLink>
          </>
        )}
      </nav>

      <div className="trpg-app-header__tools">
        <LanguageSwitch />
        <button type="button" onClick={handleLogout} title={t("navigation.logout", { username: user?.username })}>
          <LogOut size={16} aria-hidden="true" />
          <span>{t("navigation.logoutShort")}</span>
        </button>
      </div>
    </header>
  );
}
