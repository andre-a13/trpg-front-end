import { useLayoutEffect } from "react";
import { useTranslation } from "react-i18next";
import { Link, Route, Routes, useLocation } from "react-router";
import ProtectedRoute from "./auth/ProtectedRoute";
import { useAuth } from "./auth/useAuth";
import { characterToolReturn } from "./components/navigation/navigationPaths";
import Home from "./components/pages/home/Home";
import Dashboard from "./components/pages/admin/Dashboard";
import Login from "./components/pages/auth/Login";
import Register from "./components/pages/auth/Register";
import CharacterPage from "./components/pages/trpg/Character";
import CharactersPage from "./components/pages/trpg/Characters";
import CreateCharacter from "./components/pages/trpg/CreateCharacter";
import CreateTeam from "./components/pages/trpg/CreateTeam";
import HearthstonePrinter from "./components/pages/trpg/HearthstonePrinter";
import HearthstoneForge from "./components/pages/trpg/hearthstone-forge/HearthstoneForge";
import DeckPage from "./components/pages/trpg/Deck";
import LightWordsCatalogue from "./components/light-book/LightWordsCatalogue";
import Team from "./components/pages/trpg/Team";
import Teams from "./components/pages/trpg/Teams";

function NotFoundPage() {
  const { t } = useTranslation();
  const { isAuthenticated } = useAuth();

  return (
    <main className="page">
      <section className="character-message not-found">
        <h1>{t("navigation.notFound")}</h1>
        <p><Link to={isAuthenticated ? "/teams" : "/"}>{t(isAuthenticated ? "teams.returnToTeams" : "common.actions.returnHome")}</Link></p>
      </section>
    </main>
  );
}

function HearthstoneWorkshopRoute({ printer = false }: { printer?: boolean }) {
  const { user } = useAuth();
  const { search } = useLocation();
  const sheetReturn = characterToolReturn(search, user?.role === "admin", "deck");

  return printer ? <HearthstonePrinter sheetReturn={sheetReturn} /> : <HearthstoneForge sheetReturn={sheetReturn} />;
}

export default function AppRoutes() {
  const { pathname, search } = useLocation();

  useLayoutEffect(() => { window.scrollTo(0, 0); }, [pathname, search]);

  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route element={<ProtectedRoute />}>
        <Route path="/sylvae" element={<CharacterPage presetSlug="sylvae" portraitUrl="/assets/sylvae_jdr.jpg" />} />
        <Route path="/aleatarius" element={<CharacterPage presetSlug="aleatarius" portraitUrl="/assets/aleatarius_jdr.jpg" />} />
        <Route path="/jace" element={<CharacterPage presetSlug="jace" portraitUrl="/assets/jace_jdr.jpg" />} />
        <Route path="/maribeth" element={<CharacterPage presetSlug="maribeth" portraitUrl="/assets/maribeth_jdr.jpg" />} />
        <Route path="/characters" element={<CharactersPage />} />
        <Route path="/characters/:slug" element={<CharacterPage />} />
        <Route path="/characters/:slug/deck" element={<DeckPage />} />
        <Route path="/light-words" element={<LightWordsCatalogue />} />
        <Route path="/teams" element={<Teams />} />
        <Route path="/teams/:uuid" element={<Team />} />
        <Route path="/hearthstone-printer" element={<HearthstoneWorkshopRoute printer />} />
        <Route path="/hearthstone-forge" element={<HearthstoneWorkshopRoute />} />
        <Route element={<ProtectedRoute requiredRole="admin" />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/characters/new" element={<CreateCharacter />} />
          <Route path="/teams/create" element={<CreateTeam />} />
        </Route>
        <Route path="/:slug" element={<CharacterPage />} />
      </Route>
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
