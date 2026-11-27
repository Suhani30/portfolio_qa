import { NextResponse } from "next/server";
import { getContent, isValidContent, saveContent } from "@/lib/content";
import { isAuthenticated } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(await getContent());
}

export async function PUT(req: Request) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await req.json().catch(() => null);
  if (!isValidContent(body)) {
    return NextResponse.json({ error: "Invalid content payload" }, { status: 400 });
  }
  try {
    await saveContent(body);
    return NextResponse.json({ ok: true, savedAt: new Date().toISOString() });
  } catch {
    return NextResponse.json(
      { error: "Could not write data/content.json. Is the filesystem read-only?" },
      { status: 500 }
    );
  }
}
