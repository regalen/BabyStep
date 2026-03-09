import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sleeps, babies } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { requireSession, checkRole } from "@/lib/auth-helpers";

async function babyExists(babyId: string) {
  const [baby] = await db.select({ id: babies.id }).from(babies).where(eq(babies.id, babyId)).limit(1);
  return baby ?? null;
}

export async function GET(request: NextRequest) {
  const session = await requireSession();
  if (session instanceof NextResponse) return session;

  const babyId = request.nextUrl.searchParams.get("babyId");
  if (!babyId) return NextResponse.json({ error: "babyId required" }, { status: 400 });
  if (!await babyExists(babyId)) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const limitParam = request.nextUrl.searchParams.get("limit");
  const limit = limitParam ? parseInt(limitParam, 10) : 20;

  const result = await db
    .select()
    .from(sleeps)
    .where(eq(sleeps.babyId, babyId))
    .orderBy(desc(sleeps.startTime))
    .limit(limit);

  return NextResponse.json(result);
}

export async function POST(request: NextRequest) {
  const session = await requireSession();
  if (session instanceof NextResponse) return session;
  const forbidden = checkRole(session, "user");
  if (forbidden) return forbidden;

  const body = await request.json();
  const { babyId, startTime, endTime, notes } = body;

  if (!babyId || !startTime) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }
  if (!await babyExists(babyId)) return NextResponse.json({ error: "Not found" }, { status: 404 });

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

export async function PATCH(request: NextRequest) {
  const session = await requireSession();
  if (session instanceof NextResponse) return session;
  const forbidden = checkRole(session, "user");
  if (forbidden) return forbidden;

  const body = await request.json();
  const { sleepId, endTime, startTime, notes } = body;
  if (!sleepId) return NextResponse.json({ error: "sleepId required" }, { status: 400 });

  const [existing] = await db.select({ id: sleeps.id }).from(sleeps).where(eq(sleeps.id, sleepId)).limit(1);
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

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
  const session = await requireSession();
  if (session instanceof NextResponse) return session;
  const forbidden = checkRole(session, "user");
  if (forbidden) return forbidden;

  const id = request.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const [existing] = await db.select({ id: sleeps.id }).from(sleeps).where(eq(sleeps.id, id)).limit(1);
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await db.delete(sleeps).where(eq(sleeps.id, id));
  return NextResponse.json({ ok: true });
}
