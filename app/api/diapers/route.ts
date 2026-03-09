import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { diapers, babies } from "@/lib/db/schema";
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
  const session = await requireSession();
  if (session instanceof NextResponse) return session;
  const forbidden = checkRole(session, "user");
  if (forbidden) return forbidden;

  const body = await request.json();
  const { babyId, type, color, notes, timestamp } = body;

  if (!babyId || !type || !timestamp) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }
  if (!await babyExists(babyId)) return NextResponse.json({ error: "Not found" }, { status: 404 });

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
  const session = await requireSession();
  if (session instanceof NextResponse) return session;
  const forbidden = checkRole(session, "user");
  if (forbidden) return forbidden;

  const body = await request.json();
  const { id, type, color, notes, timestamp } = body;
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const [existing] = await db.select({ id: diapers.id }).from(diapers).where(eq(diapers.id, id)).limit(1);
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

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
  const session = await requireSession();
  if (session instanceof NextResponse) return session;
  const forbidden = checkRole(session, "user");
  if (forbidden) return forbidden;

  const id = request.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const [existing] = await db.select({ id: diapers.id }).from(diapers).where(eq(diapers.id, id)).limit(1);
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await db.delete(diapers).where(eq(diapers.id, id));
  return NextResponse.json({ ok: true });
}
