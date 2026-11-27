export type Stat = { value: string; label: string };

export type Profile = {
  name: string;
  role: string;
  location: string;
  availability: string;
  tagline: string;
  intro: string;
  email: string;
  phone: string;
  linkedin: string;
  github: string;
  resumeUrl: string;
  terminalCommand: string;
  terminalLines: string[];
  /** Words typed out after "Currently testing" in the hero */
  rotatingWords?: string[];
};

export type Highlight = { title: string; description: string };

export type About = {
  heading: string;
  paragraphs: string[];
  highlights: Highlight[];
};

export type Project = {
  id: string;
  title: string;
  category: string;
  organization: string;
  summary: string;
  challenge: string;
  approach: string;
  coverage: string[];
  tags: string[];
  link: string;
  featured: boolean;
};

export type Experience = {
  id: string;
  company: string;
  role: string;
  start: string;
  end: string;
  location: string;
  summary: string;
  achievements: string[];
  tags: string[];
};

export type SkillItem = { name: string; level: number };
export type SkillGroup = { id: string; group: string; description: string; items: SkillItem[] };

export type Education = { id: string; degree: string; institution: string; period: string };

export type Training = {
  id: string;
  title: string;
  provider: string;
  period: string;
  description: string;
  topics: string[];
};

export type CustomItem = { title: string; subtitle: string; description: string; link: string };
export type CustomSection = {
  id: string;
  label: string;
  heading: string;
  intro: string;
  visible: boolean;
  items: CustomItem[];
};

export type Visibility = {
  about: boolean;
  projects: boolean;
  experience: boolean;
  skills: boolean;
  credentials: boolean;
  contact: boolean;
  /** Legacy switch for Bug Hunt; superseded by SiteContent.game */
  game?: boolean;
};

export type IslandNames = {
  top: string;
  about: string;
  work: string;
  experience: string;
  skills: string;
  credentials: string;
  contact: string;
};

export type GameSettings = {
  /* General */
  sound: boolean;
  /* Coin Explorer: built into the page */
  coinExplorer: boolean;
  coinsPerIsland: number;
  coinValue: number;
  islandBonus: number;
  showScenery: boolean;
  showBot: boolean;
  botName: string;
  arrivalMessages: boolean;
  achievements: boolean;
  islandNames: IslandNames;
  finishTitle: string;
  finishMessage: string;
  /* Bug Hunt: separate button */
  bugHunt: boolean;
  bugCount: number;
  bugButtonLabel: string;
  bugIntro: string;
  bugHints: boolean;
  rankPrincipal: number;
  rankSenior: number;
  rankEngineer: number;
  /** @deprecated legacy name for coinExplorer */
  islandQuest?: boolean;
};

export const DEFAULT_GAME: GameSettings = {
  sound: true,
  coinExplorer: true,
  coinsPerIsland: 5,
  coinValue: 1,
  islandBonus: 10,
  showScenery: true,
  showBot: true,
  botName: "Testy",
  arrivalMessages: true,
  achievements: true,
  islandNames: {
    top: "Launch Bay",
    about: "Origin Isle",
    work: "Case Study Cove",
    experience: "Timeline Reef",
    skills: "Toolchain Atoll",
    credentials: "Scholar Key",
    contact: "Contact Cape",
  },
  finishTitle: "Full coverage achieved!",
  finishMessage: "You explored every island and collected every coin. That's the kind of thoroughness I bring to every release.",
  bugHunt: true,
  bugCount: 9,
  bugButtonLabel: "Bug Hunt",
  bugIntro: "Release day is here and bugs have crept into this portfolio. Scroll through every section, find them and squash each one before it reaches production.",
  bugHints: true,
  rankPrincipal: 45,
  rankSenior: 90,
  rankEngineer: 180,
};

/** Merge saved settings over defaults (handles older content files). */
export function resolveGame(saved?: Partial<GameSettings>, legacyBugSwitch?: boolean): GameSettings {
  const g = { ...DEFAULT_GAME, ...saved, islandNames: { ...DEFAULT_GAME.islandNames, ...saved?.islandNames } };
  if (saved && saved.coinExplorer === undefined && saved.islandQuest !== undefined) g.coinExplorer = saved.islandQuest;
  if (!saved && legacyBugSwitch === false) g.bugHunt = false;
  return g;
}

export type Contact = { heading: string; message: string; cta: string };

export type SiteContent = {
  meta: { title: string; description: string };
  profile: Profile;
  stats: Stat[];
  about: About;
  projects: Project[];
  experience: Experience[];
  skills: SkillGroup[];
  softSkills: string[];
  education: Education[];
  training: Training[];
  customSections: CustomSection[];
  contact: Contact;
  visibility: Visibility;
  /** Optional so older content files keep working. */
  game?: Partial<GameSettings>;
};
