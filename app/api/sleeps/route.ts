import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { sleeps, babies } from "@/lib/db/schema";
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

async function getSleepForUser(userId: string, sleepId: string) {
  const result = await db
    .select({ babyId: sleeps.babyId })
    .from(sleeps)
    .where(eq(sleeps.id, sleepId))
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
    .from(sleeps)
    .where(eq(sleeps.babyId, babyId))
    .orderBy(desc(sleeps.startTime))
    .limit(20);

  return NextResponse.json(result);
}

export async function POST(request: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { babyId, startTime, endTime, notes } = body;

  if (!babyId || !startTime) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const baby = await getBabyForUser(session.user.id, babyId);
  if (!baby) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const [sleep] = await db
    .insert(sleeps)
    .values({
      babyId,
      startTime: new Date(startTime),
      endTime: endTime ? new Date(endTime) : null,
      notes: notes ?? null,
    })
    .returning();

  return NextResponse.json(sleep, { status: 201 });
}

// PATCH to update a sleep (endTime, startTime, or notes)
export async function PATCH(request: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { sleepId, endTime, startTime, notes } = body;

  if (!sleepId) {
    return NextResponse.json({ error: "sleepId required" }, { status: 400 });
  }

  const [updated] = await db
    .update(sleeps)
    .set({
      ...(endTime !== undefined && { endTime: endTime ? new Date(endTime) : null }),
      ...(startTime !== undefined && { startTime: new Date(startTime) }),
      ...(notes !== undefined && { notes: notes || null }),
    })
    .where(eq(sleeps.id, sleepId))
    .returning();

  return NextResponse.json(updated);
}

export async function DELETE(request: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const id = request.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const owned = await getSleepForUser(session.user.id, id);
  if (!owned) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await db.delete(sleeps).where(eq(sleeps.id, id));
  return NextResponse.json({ ok: true });
}
