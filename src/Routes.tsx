import { Link, Route, Routes } from "react-router";
import CharacterPage from "./components/pages/trpg/Character";
import CreateCharacter from "./components/pages/trpg/CreateCharacter";
import CreateTeam from "./components/pages/trpg/CreateTeam";
import HearthstonePrinter from "./components/pages/trpg/HearthstonePrinter";
import Team from "./components/pages/trpg/Team";
import Teams from "./components/pages/trpg/Teams";

function Home() {
  return (
    <main className="page trpg-home">
      <section className="trpg-home__panel">
        <p className="trpg-home__eyebrow">TRPG tools</p>
        <h1>Tabletop Companion</h1>
        <nav className="trpg-home__links" aria-label="TRPG navigation">
          <Link to="/teams">Teams</Link>
          <Link to="/characters/new">Create Character</Link>
          <Link to="/teams/create">Create Team</Link>
          <Link to="/hearthstone-printer">Hearthstone Printer</Link>
        </nav>
      </section>
    </main>
  );
}

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/sylvae" element={<CharacterPage presetSlug="sylvae" portraitUrl="/assets/sylvae_jdr.jpg" />} />
      <Route path="/aleatarius" element={<CharacterPage presetSlug="aleatarius" portraitUrl="/assets/aleatarius_jdr.jpg" />} />
      <Route path="/jace" element={<CharacterPage presetSlug="jace" portraitUrl="/assets/jace_jdr.jpg" />} />
      <Route path="/maribeth" element={<CharacterPage presetSlug="maribeth" portraitUrl="/assets/maribeth_jdr.jpg" />} />
      <Route path="/characters/:slug" element={<CharacterPage />} />
      <Route path="/characters/new" element={<CreateCharacter />} />
      <Route path="/teams" element={<Teams />} />
      <Route path="/teams/create" element={<CreateTeam />} />
      <Route path="/teams/:uuid" element={<Team />} />
      <Route path="/hearthstone-printer" element={<HearthstonePrinter />} />
      <Route path="/:slug" element={<CharacterPage />} />
    </Routes>
  );
}
