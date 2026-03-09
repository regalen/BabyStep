import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { feedings, babies } from "@/lib/db/schema";
import { eq, desc, and, gte } from "drizzle-orm";
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

  const fromParam = request.nextUrl.searchParams.get("from");
  const limitParam = request.nextUrl.searchParams.get("limit");
  const limit = limitParam ? parseInt(limitParam, 10) : 50;

  const whereClause = fromParam
    ? and(eq(feedings.babyId, babyId), gte(feedings.startTime, new Date(fromParam)))
    : eq(feedings.babyId, babyId);

  const result = await db
    .select()
    .from(feedings)
    .where(whereClause)
    .orderBy(desc(feedings.startTime))
    .limit(limit);

  return NextResponse.json(result);
}

export async function POST(request: NextRequest) {
  const session = await requireSession();
  if (session instanceof NextResponse) return session;
  const forbidden = checkRole(session, "user");
  if (forbidden) return forbidden;

  const body = await request.json();
  const { babyId, type, amountMl, side, startTime, endTime, notes } = body;

  if (!babyId || !type || !startTime) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }
  if (!await babyExists(babyId)) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const [feeding] = await db
    .insert(feedings)
    .values({
      babyId,
      type,
      amountMl: amountMl ?? null,
      side: side ?? null,
      startTime: new Date(startTime),
      endTime: endTime ? new Date(endTime) : null,
      notes: notes ?? null,
    })
    .returning();

  return NextResponse.json(feeding, { status: 201 });
}

export async function PATCH(request: NextRequest) {
  const session = await requireSession();
  if (session instanceof NextResponse) return session;
  const forbidden = checkRole(session, "user");
  if (forbidden) return forbidden;

  const body = await request.json();
  const { id, type, side, amountMl, startTime, endTime, notes } = body;
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const [existing] = await db.select({ id: feedings.id }).from(feedings).where(eq(feedings.id, id)).limit(1);
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const [updated] = await db
    .update(feedings)
    .set({
      ...(type !== undefined && { type }),
      ...(side !== undefined && { side: side || null }),
      ...(amountMl !== undefined && { amountMl: amountMl || null }),
      ...(startTime !== undefined && { startTime: new Date(startTime) }),
      ...(endTime !== undefined && { endTime: endTime ? new Date(endTime) : null }),
      ...(notes !== undefined && { notes: notes || null }),
    })
    .where(eq(feedings.id, id))
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

  const [existing] = await db.select({ id: feedings.id }).from(feedings).where(eq(feedings.id, id)).limit(1);
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await db.delete(feedings).where(eq(feedings.id, id));
  return NextResponse.json({ ok: true });
}
