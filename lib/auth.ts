import { promises as fs } from "fs";
import path from "path";
import crypto from "crypto";
import { cookies } from "next/headers";

/**
 * Lightweight, file-based admin auth for the local CMS.
 * No environment variables needed: the password hash lives in data/auth.json.
 * Default password is "admin123" until changed from Admin → Settings.
 */
const AUTH_FILE = path.join(process.cwd(), "data", "auth.json");
export const SESSION_COOKIE = "qa_cms_session";
const DEFAULT_PASSWORD = "admin123";

type AuthFile = { salt: string; hash: string };

function hashPassword(password: string, salt: string) {
  return crypto.scryptSync(password, salt, 32).toString("hex");
}

async function readAuth(): Promise<AuthFile> {
  try {
    return JSON.parse(await fs.readFile(AUTH_FILE, "utf8")) as AuthFile;
  } catch {
    const salt = crypto.randomBytes(16).toString("hex");
    const auth = { salt, hash: hashPassword(DEFAULT_PASSWORD, salt) };
    await fs.writeFile(AUTH_FILE, JSON.stringify(auth, null, 2), "utf8");
    return auth;
  }
}

function sessionToken(auth: AuthFile) {
  return crypto.createHmac("sha256", auth.hash).update("cms-session-v1").digest("hex");
}

function safeEqual(a: string, b: string) {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && crypto.timingSafeEqual(ab, bb);
}

export async function verifyPassword(password: string) {
  const auth = await readAuth();
  return safeEqual(hashPassword(password, auth.salt), auth.hash);
}

export async function createSessionToken() {
  return sessionToken(await readAuth());
}

export async function isAuthenticated() {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return false;
  return safeEqual(token, sessionToken(await readAuth()));
}

export async function changePassword(next: string) {
  const salt = crypto.randomBytes(16).toString("hex");
  const auth = { salt, hash: hashPassword(next, salt) };
  await fs.writeFile(AUTH_FILE, JSON.stringify(auth, null, 2), "utf8");
  return sessionToken(auth);
}

export const cookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  path: "/",
  secure: process.env.NODE_ENV === "production",
  maxAge: 60 * 60 * 24 * 7,
};
