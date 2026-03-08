import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { diapers, babies } from "@/lib/db/schema";
import { eq, desc, and, gte } from "drizzle-orm";
import { headers } from "next/headers";

async function getBabyForUser(userId: string, babyId: string) {
  const result = await db
    .select()
    .from(babies)
    .where(and(eq(babies.id, babyId), eq(babies.userId, userId)))
    .limit(1);
  return result[0] ?? null;
}

async function getDiaperForUser(userId: string, diaperId: string) {
  const result = await db
    .select({ babyId: diapers.babyId })
    .from(diapers)
    .where(eq(diapers.id, diaperId))
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

  const fromParam = request.nextUrl.searchParams.get("from");
  const limitParam = request.nextUrl.searchParams.get("limit");
  const limit = limitParam ? parseInt(limitParam, 10) : 50;

  const whereClause = fromParam
    ? and(eq(diapers.babyId, babyId), gte(diapers.timestamp, new Date(fromParam)))
    : eq(diapers.babyId, babyId);

  const result = await db
    .select()
    .from(diapers)
    .where(whereClause)
    .orderBy(desc(diapers.timestamp))
    .limit(limit);

  return NextResponse.json(result);
}

export async function POST(request: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { babyId, type, color, notes, timestamp } = body;

  if (!babyId || !type || !timestamp) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const baby = await getBabyForUser(session.user.id, babyId);
  if (!baby) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const [diaper] = await db
    .insert(diapers)
    .values({
      babyId,
      type,
      color: color ?? null,
      notes: notes ?? null,
      timestamp: new Date(timestamp),
    })
    .returning();

  return NextResponse.json(diaper, { status: 201 });
}

export async function PATCH(request: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { id, type, color, notes, timestamp } = body;
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const owned = await getDiaperForUser(session.user.id, id);
  if (!owned) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const [updated] = await db
    .update(diapers)
    .set({
      ...(type !== undefined && { type }),
      ...(color !== undefined && { color: color || null }),
      ...(notes !== undefined && { notes: notes || null }),
      ...(timestamp !== undefined && { timestamp: new Date(timestamp) }),
    })
    .where(eq(diapers.id, id))
    .returning();

  return NextResponse.json(updated);
}

export async function DELETE(request: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const id = request.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const owned = await getDiaperForUser(session.user.id, id);
  if (!owned) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await db.delete(diapers).where(eq(diapers.id, id));
  return NextResponse.json({ ok: true });
}
