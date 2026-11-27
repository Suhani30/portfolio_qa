import { NextResponse } from "next/server";
import { createSessionToken, cookieOptions, SESSION_COOKIE, verifyPassword } from "@/lib/auth";

export async function POST(req: Request) {
  const { password } = (await req.json().catch(() => ({}))) as { password?: string };
  if (!password || !(await verifyPassword(password))) {
    return NextResponse.json({ error: "Incorrect password" }, { status: 401 });
  }
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, await createSessionToken(), cookieOptions);
  return res;
}

export async function GET() {
  const { isAuthenticated } = await import("@/lib/auth");
  return NextResponse.json({ authenticated: await isAuthenticated() });
}
