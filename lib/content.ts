import { promises as fs } from "fs";
import path from "path";
import type { SiteContent } from "./types";

const DATA_DIR = path.join(process.cwd(), "data");
const CONTENT_FILE = path.join(DATA_DIR, "content.json");

export async function getContent(): Promise<SiteContent> {
  const raw = await fs.readFile(CONTENT_FILE, "utf8");
  return JSON.parse(raw) as SiteContent;
}

export async function saveContent(content: SiteContent): Promise<void> {
  const json = JSON.stringify(content, null, 2) + "\n";
  const tmp = CONTENT_FILE + ".tmp";
  await fs.writeFile(tmp, json, "utf8");
  await fs.rename(tmp, CONTENT_FILE);
}

export function isValidContent(value: unknown): value is SiteContent {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.profile === "object" &&
    Array.isArray(v.projects) &&
    Array.isArray(v.experience) &&
    Array.isArray(v.skills) &&
    typeof v.visibility === "object"
  );
}
