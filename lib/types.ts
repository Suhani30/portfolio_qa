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

export type GameSettings = {
  bugHunt: boolean;
  bugCount: number;
  islandQuest: boolean;
  coinsPerIsland: number;
  islandBonus: number;
};

export const DEFAULT_GAME: GameSettings = {
  bugHunt: true,
  bugCount: 9,
  islandQuest: true,
  coinsPerIsland: 5,
  islandBonus: 10,
};

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
  game?: GameSettings;
};
