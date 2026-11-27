import { getContent } from "@/lib/content";
import { resolveGame } from "@/lib/types";
import Nav from "@/components/site/Nav";
import Hero from "@/components/site/Hero";
import Marquee from "@/components/site/Marquee";
import About from "@/components/site/About";
import Projects from "@/components/site/Projects";
import ExperienceSection from "@/components/site/Experience";
import Skills from "@/components/site/Skills";
import Credentials from "@/components/site/Credentials";
import CustomSections from "@/components/site/CustomSections";
import Contact from "@/components/site/Contact";
import Footer from "@/components/site/Footer";
import Spotlight from "@/components/site/Spotlight";
import ScrollProgress from "@/components/site/ScrollProgress";
import { GameSettingsProvider } from "@/components/game/settings";
import { BugHuntProvider } from "@/components/game/BugHuntProvider";
import BugHuntHUD from "@/components/game/BugHuntHUD";
import { CoinExplorerProvider } from "@/components/game/CoinExplorer";
import CoinHUD from "@/components/game/CoinHUD";

export const dynamic = "force-dynamic";

export default async function Home() {
  const c = await getContent();
  const v = c.visibility;
  const g = resolveGame(c.game, v.game);

  const links = [
    v.about && { href: "#about", label: "About" },
    v.projects && { href: "#work", label: "Work" },
    v.experience && { href: "#experience", label: "Experience" },
    v.skills && { href: "#skills", label: "Skills" },
    ...c.customSections.filter((s) => s.visible).map((s) => ({ href: `#${s.id}`, label: s.label })),
    v.contact && { href: "#contact", label: "Contact" },
  ].filter(Boolean) as { href: string; label: string }[];

  const tools = c.skills.flatMap((s) => s.items.map((i) => i.name));

  return (
    <GameSettingsProvider value={g}>
      <BugHuntProvider enabled={g.bugHunt} bugCount={g.bugCount}>
        {/* Coin Explorer wraps the page: every section in <main> becomes an island */}
        <CoinExplorerProvider>
          <ScrollProgress />
          <Spotlight />
          <Nav name={c.profile.name} links={links} />
          <main>
            <Hero profile={c.profile} stats={c.stats} />
            <Marquee items={tools} />
            {v.about && <About about={c.about} softSkills={c.softSkills} />}
            {v.projects && <Projects projects={c.projects} />}
            {v.experience && <ExperienceSection items={c.experience} />}
            {v.skills && <Skills groups={c.skills} />}
            {v.credentials && <Credentials education={c.education} training={c.training} />}
            <CustomSections sections={c.customSections} />
            {v.contact && <Contact contact={c.contact} profile={c.profile} />}
          </main>
          <Footer profile={c.profile} />
          <CoinHUD />
          <BugHuntHUD />
        </CoinExplorerProvider>
      </BugHuntProvider>
    </GameSettingsProvider>
  );
}
