import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { sleeps, babies } from "@/lib/db/schema";
import { eq, desc, and, isNull } from "drizzle-orm";
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

// PATCH to end an active sleep
export async function PATCH(request: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { sleepId, endTime } = body;

  if (!sleepId || !endTime) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const [updated] = await db
    .update(sleeps)
    .set({ endTime: new Date(endTime) })
    .where(eq(sleeps.id, sleepId))
    .returning();

  return NextResponse.json(updated);
}
