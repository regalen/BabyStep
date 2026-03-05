import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { medicationPresets, babies } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { headers } from "next/headers";

async function getBabyForUser(userId: string, babyId: string) {
  const result = await db
    .select()
    .from(babies)
    .where(and(eq(babies.id, babyId), eq(babies.userId, userId)))
    .limit(1);
  return result[0] ?? null;
}

export async function GET(request: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const babyId = request.nextUrl.searchParams.get("babyId");
  if (!babyId) return NextResponse.json({ error: "babyId required" }, { status: 400 });

  const baby = await getBabyForUser(session.user.id, babyId);
  if (!baby) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const presets = await db
    .select()
    .from(medicationPresets)
    .where(eq(medicationPresets.babyId, babyId))
    .orderBy(medicationPresets.name);

  return NextResponse.json(presets);
}

export async function POST(request: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { babyId, name, defaultDosage } = body;

  if (!babyId || !name) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const baby = await getBabyForUser(session.user.id, babyId);
  if (!baby) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const [preset] = await db
    .insert(medicationPresets)
    .values({
      babyId,
      name,
      defaultDosage: defaultDosage || null,
    })
    .returning();

  return NextResponse.json(preset, { status: 201 });
}

export async function DELETE(request: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const id = request.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  // Validate ownership via baby → user join
  const preset = await db
    .select({ id: medicationPresets.id, babyId: medicationPresets.babyId })
    .from(medicationPresets)
    .where(eq(medicationPresets.id, id))
    .limit(1);

  if (!preset[0]) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const baby = await getBabyForUser(session.user.id, preset[0].babyId);
  if (!baby) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  await db.delete(medicationPresets).where(eq(medicationPresets.id, id));
  return NextResponse.json({ success: true });
}
