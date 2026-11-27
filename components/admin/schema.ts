/* Declarative description of every editable part of the site.
 * The admin UI renders forms from this schema, so adding a new field
 * means adding it to lib/types.ts, data/content.json and here. */

export type Field =
  | { key: string; label: string; type: "text" | "textarea" | "url" | "email"; placeholder?: string; help?: string; wide?: boolean }
  | { key: string; label: string; type: "number"; min?: number; max?: number; help?: string }
  | { key: string; label: string; type: "boolean"; help?: string }
  | { key: string; label: string; type: "tags"; help?: string; wide?: boolean }
  | { key: string; label: string; type: "lines"; help?: string; wide?: boolean }
  | { key: string; label: string; type: "group"; fields: Field[]; help?: string }
  | {
      key: string;
      label: string;
      type: "list";
      itemLabel: string;
      titleKey: string;
      subtitleKey?: string;
      fields: Field[];
      newItem: () => Record<string, unknown>;
      help?: string;
    };

export type Section = { id: string; label: string; description: string; fields: Field[] };

const uid = (p: string) => `${p}-${Math.random().toString(36).slice(2, 7)}`;

export const sections: Section[] = [
  {
    id: "profile",
    label: "Profile & Hero",
    description: "Your name, headline, contact links and the animated terminal in the hero.",
    fields: [
      {
        key: "profile",
        label: "Profile",
        type: "group",
        fields: [
          { key: "name", label: "Full name", type: "text" },
          { key: "role", label: "Role / title", type: "text" },
          { key: "location", label: "Location", type: "text" },
          { key: "availability", label: "Availability badge", type: "text", placeholder: "Open to QA roles" },
          { key: "tagline", label: "Tagline (headline)", type: "text", wide: true, help: "Text after the first comma or dash is highlighted in green." },
          { key: "intro", label: "Intro paragraph", type: "textarea", wide: true },
          { key: "email", label: "Email", type: "email" },
          { key: "phone", label: "Phone", type: "text" },
          { key: "linkedin", label: "LinkedIn URL", type: "url" },
          { key: "github", label: "GitHub URL", type: "url" },
          { key: "resumeUrl", label: "Résumé URL (optional)", type: "url", help: "Leave empty to hide the button. Files in /public can be linked as /my-cv.pdf" },
          { key: "terminalCommand", label: "Terminal command", type: "text" },
          { key: "terminalLines", label: "Terminal suites (each shows as PASS)", type: "lines", wide: true },
        ],
      },
      {
        key: "meta",
        label: "SEO",
        type: "group",
        fields: [
          { key: "title", label: "Browser title", type: "text", wide: true },
          { key: "description", label: "Meta description", type: "textarea", wide: true },
        ],
      },
    ],
  },
  {
    id: "stats",
    label: "Key stats",
    description: "The number strip under the hero, which is what a recruiter reads first.",
    fields: [
      {
        key: "stats",
        label: "Stats",
        type: "list",
        itemLabel: "stat",
        titleKey: "value",
        subtitleKey: "label",
        newItem: () => ({ value: "0", label: "New stat" }),
        fields: [
          { key: "value", label: "Value", type: "text" },
          { key: "label", label: "Label", type: "text" },
        ],
      },
    ],
  },
  {
    id: "about",
    label: "About",
    description: "Your story, your approach to quality and your soft skills.",
    fields: [
      {
        key: "about",
        label: "About",
        type: "group",
        fields: [
          { key: "heading", label: "Heading", type: "text", wide: true },
          { key: "paragraphs", label: "Paragraphs", type: "lines", wide: true },
          {
            key: "highlights",
            label: "Highlight cards",
            type: "list",
            itemLabel: "highlight",
            titleKey: "title",
            newItem: () => ({ title: "New highlight", description: "" }),
            fields: [
              { key: "title", label: "Title", type: "text" },
              { key: "description", label: "Description", type: "textarea", wide: true },
            ],
          },
        ],
      },
      { key: "softSkills", label: "Soft skills", type: "tags", wide: true },
    ],
  },
  {
    id: "projects",
    label: "Projects",
    description: "Case studies. Projects marked as featured appear as large cards at the top.",
    fields: [
      {
        key: "projects",
        label: "Projects",
        type: "list",
        itemLabel: "project",
        titleKey: "title",
        subtitleKey: "category",
        newItem: () => ({
          id: uid("project"),
          title: "New project",
          category: "",
          organization: "",
          summary: "",
          challenge: "",
          approach: "",
          coverage: [],
          tags: [],
          link: "",
          featured: false,
        }),
        fields: [
          { key: "title", label: "Title", type: "text" },
          { key: "category", label: "Category", type: "text" },
          { key: "organization", label: "Organisation / client", type: "text" },
          { key: "link", label: "Link (optional)", type: "url" },
          { key: "featured", label: "Featured case study", type: "boolean", help: "Shows as a large card. Two or three works best." },
          { key: "summary", label: "Summary", type: "textarea", wide: true },
          { key: "challenge", label: "Risk / challenge", type: "textarea", wide: true },
          { key: "approach", label: "My approach", type: "textarea", wide: true },
          { key: "coverage", label: "Coverage checklist", type: "tags", wide: true },
          { key: "tags", label: "Tags", type: "tags", wide: true },
        ],
      },
    ],
  },
  {
    id: "experience",
    label: "Experience",
    description: "Your work history, shown as a timeline.",
    fields: [
      {
        key: "experience",
        label: "Positions",
        type: "list",
        itemLabel: "position",
        titleKey: "role",
        subtitleKey: "company",
        newItem: () => ({
          id: uid("job"),
          company: "Company",
          role: "Role",
          start: "",
          end: "Present",
          location: "",
          summary: "",
          achievements: [],
          tags: [],
        }),
        fields: [
          { key: "role", label: "Role", type: "text" },
          { key: "company", label: "Company", type: "text" },
          { key: "start", label: "Start", type: "text", placeholder: "Jan 2024" },
          { key: "end", label: "End", type: "text", placeholder: "Present" },
          { key: "location", label: "Location", type: "text" },
          { key: "summary", label: "Summary", type: "textarea", wide: true },
          { key: "achievements", label: "Achievements", type: "lines", wide: true },
          { key: "tags", label: "Tags", type: "tags", wide: true },
        ],
      },
    ],
  },
  {
    id: "skills",
    label: "Skills",
    description: "Tool groups. Level: 1 = Working, 2 = Proficient, 3 = Advanced.",
    fields: [
      {
        key: "skills",
        label: "Skill groups",
        type: "list",
        itemLabel: "group",
        titleKey: "group",
        newItem: () => ({ id: uid("skills"), group: "New group", description: "", items: [] }),
        fields: [
          { key: "group", label: "Group name", type: "text" },
          { key: "description", label: "Description", type: "text" },
          {
            key: "items",
            label: "Tools",
            type: "list",
            itemLabel: "tool",
            titleKey: "name",
            newItem: () => ({ name: "New tool", level: 2 }),
            fields: [
              { key: "name", label: "Name", type: "text" },
              { key: "level", label: "Level (1–3)", type: "number", min: 1, max: 3 },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "credentials",
    label: "Education & Training",
    description: "Degrees, courses and certifications.",
    fields: [
      {
        key: "education",
        label: "Education",
        type: "list",
        itemLabel: "degree",
        titleKey: "degree",
        subtitleKey: "institution",
        newItem: () => ({ id: uid("edu"), degree: "New degree", institution: "", period: "" }),
        fields: [
          { key: "degree", label: "Degree", type: "text" },
          { key: "institution", label: "Institution", type: "text" },
          { key: "period", label: "Period", type: "text" },
        ],
      },
      {
        key: "training",
        label: "Training",
        type: "list",
        itemLabel: "course",
        titleKey: "title",
        subtitleKey: "provider",
        newItem: () => ({ id: uid("course"), title: "New course", provider: "", period: "", description: "", topics: [] }),
        fields: [
          { key: "title", label: "Title", type: "text" },
          { key: "provider", label: "Provider", type: "text" },
          { key: "period", label: "Period", type: "text" },
          { key: "description", label: "Description", type: "textarea", wide: true },
          { key: "topics", label: "Topics", type: "tags", wide: true },
        ],
      },
    ],
  },
  {
    id: "custom",
    label: "Custom sections",
    description: "Add new sections such as certifications, publications, awards or volunteering. Each one appears on the site and in the navigation.",
    fields: [
      {
        key: "customSections",
        label: "Sections",
        type: "list",
        itemLabel: "section",
        titleKey: "label",
        subtitleKey: "heading",
        newItem: () => ({ id: uid("section"), label: "New section", heading: "", intro: "", visible: true, items: [] }),
        fields: [
          { key: "label", label: "Nav label", type: "text" },
          { key: "id", label: "Anchor id (letters, numbers, dashes)", type: "text" },
          { key: "heading", label: "Heading", type: "text", wide: true },
          { key: "intro", label: "Intro", type: "textarea", wide: true },
          { key: "visible", label: "Visible on site", type: "boolean" },
          {
            key: "items",
            label: "Items",
            type: "list",
            itemLabel: "item",
            titleKey: "title",
            subtitleKey: "subtitle",
            newItem: () => ({ title: "New item", subtitle: "", description: "", link: "" }),
            fields: [
              { key: "title", label: "Title", type: "text" },
              { key: "subtitle", label: "Subtitle", type: "text" },
              { key: "link", label: "Link (optional)", type: "url", wide: true },
              { key: "description", label: "Description", type: "textarea", wide: true },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "contact",
    label: "Contact",
    description: "The closing call to action.",
    fields: [
      {
        key: "contact",
        label: "Contact",
        type: "group",
        fields: [
          { key: "heading", label: "Heading", type: "text", wide: true },
          { key: "message", label: "Message", type: "textarea", wide: true },
          { key: "cta", label: "Button label", type: "text" },
        ],
      },
    ],
  },
  {
    id: "visibility",
    label: "Visibility",
    description: "Show or hide whole sections of the site.",
    fields: [
      {
        key: "visibility",
        label: "Sections",
        type: "group",
        fields: [
          { key: "about", label: "About", type: "boolean" },
          { key: "projects", label: "Projects", type: "boolean" },
          { key: "experience", label: "Experience", type: "boolean" },
          { key: "skills", label: "Skills", type: "boolean" },
          { key: "credentials", label: "Education & Training", type: "boolean" },
          { key: "contact", label: "Contact", type: "boolean" },
        ],
      },
    ],
  },
];
