import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { medications, babies } from "@/lib/db/schema";
import { eq, desc, and } from "drizzle-orm";
import { headers } from "next/headers";

async function getBabyForUser(userId: string, babyId: string) {
  const result = await db
    .select()
    .from(babies)
    .where(and(eq(babies.id, babyId), eq(babies.userId, userId)))
    .limit(1);
  return result[0] ?? null;
}

async function getMedForUser(userId: string, medId: string) {
  const result = await db
    .select({ babyId: medications.babyId })
    .from(medications)
    .where(eq(medications.id, medId))
    .limit(1);
  if (!result[0]) return null;
  const baby = await getBabyForUser(userId, result[0].babyId);
  return baby ? result[0] : null;
}

export async function GET(request: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const babyId = request.nextUrl.searchParams.get("babyId");
  if (!babyId) return NextResponse.json({ error: "babyId required" }, { status: 400 });

  const baby = await getBabyForUser(session.user.id, babyId);
  if (!baby) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const result = await db
    .select()
    .from(medications)
    .where(eq(medications.babyId, babyId))
    .orderBy(desc(medications.timestamp))
    .limit(50);

  return NextResponse.json(result);
}

export async function POST(request: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { babyId, name, dosage, timestamp, notes } = body;

  if (!babyId || !name || !dosage || !timestamp) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const baby = await getBabyForUser(session.user.id, babyId);
  if (!baby) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const [med] = await db
    .insert(medications)
    .values({
      babyId,
      name,
      dosage,
      timestamp: new Date(timestamp),
      notes: notes ?? null,
    })
    .returning();

  return NextResponse.json(med, { status: 201 });
}

export async function PATCH(request: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { id, name, dosage, timestamp, notes } = body;
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const owned = await getMedForUser(session.user.id, id);
  if (!owned) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const [updated] = await db
    .update(medications)
    .set({
      ...(name !== undefined && { name }),
      ...(dosage !== undefined && { dosage }),
      ...(notes !== undefined && { notes: notes || null }),
      ...(timestamp !== undefined && { timestamp: new Date(timestamp) }),
    })
    .where(eq(medications.id, id))
    .returning();

  return NextResponse.json(updated);
}

export async function DELETE(request: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const id = request.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const owned = await getMedForUser(session.user.id, id);
  if (!owned) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await db.delete(medications).where(eq(medications.id, id));
  return NextResponse.json({ ok: true });
}
