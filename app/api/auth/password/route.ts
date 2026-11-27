import { NextResponse } from "next/server";
import { changePassword, cookieOptions, isAuthenticated, SESSION_COOKIE, verifyPassword } from "@/lib/auth";

export async function POST(req: Request) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { current, next } = (await req.json().catch(() => ({}))) as { current?: string; next?: string };
  if (!current || !(await verifyPassword(current))) {
    return NextResponse.json({ error: "Current password is incorrect" }, { status: 400 });
  }
  if (!next || next.length < 8) {
    return NextResponse.json({ error: "New password must be at least 8 characters" }, { status: 400 });
  }
  const token = await changePassword(next);
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, token, cookieOptions);
  return res;
}
