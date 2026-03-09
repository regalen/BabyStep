import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { medications, babies } from "@/lib/db/schema";
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
  const limit = limitParam ? parseInt(limitParam, 10) : 50;

  const result = await db
    .select()
    .from(medications)
    .where(eq(medications.babyId, babyId))
    .orderBy(desc(medications.timestamp))
    .limit(limit);

  return NextResponse.json(result);
}

export async function POST(request: NextRequest) {
  const session = await requireSession();
  if (session instanceof NextResponse) return session;
  const forbidden = checkRole(session, "user");
  if (forbidden) return forbidden;

  const body = await request.json();
  const { babyId, name, dosage, timestamp, notes } = body;

  if (!babyId || !name || !dosage || !timestamp) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }
  if (!await babyExists(babyId)) return NextResponse.json({ error: "Not found" }, { status: 404 });

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
  const session = await requireSession();
  if (session instanceof NextResponse) return session;
  const forbidden = checkRole(session, "user");
  if (forbidden) return forbidden;

  const body = await request.json();
  const { id, name, dosage, timestamp, notes } = body;
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const [existing] = await db.select({ id: medications.id }).from(medications).where(eq(medications.id, id)).limit(1);
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

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
  const session = await requireSession();
  if (session instanceof NextResponse) return session;
  const forbidden = checkRole(session, "user");
  if (forbidden) return forbidden;

  const id = request.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const [existing] = await db.select({ id: medications.id }).from(medications).where(eq(medications.id, id)).limit(1);
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await db.delete(medications).where(eq(medications.id, id));
  return NextResponse.json({ ok: true });
}
