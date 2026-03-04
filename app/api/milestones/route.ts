import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { milestones, babies } from "@/lib/db/schema";
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

export async function GET(request: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const babyId = request.nextUrl.searchParams.get("babyId");
  if (!babyId) return NextResponse.json({ error: "babyId required" }, { status: 400 });

  const baby = await getBabyForUser(session.user.id, babyId);
  if (!baby) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const result = await db
    .select()
    .from(milestones)
    .where(eq(milestones.babyId, babyId))
    .orderBy(desc(milestones.date))
    .limit(50);

  return NextResponse.json(result);
}

export async function POST(request: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { babyId, title, date, notes } = body;

  if (!babyId || !title || !date) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const baby = await getBabyForUser(session.user.id, babyId);
  if (!baby) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const [milestone] = await db
    .insert(milestones)
    .values({
      babyId,
      title,
      date,
      notes: notes ?? null,
    })
    .returning();

  return NextResponse.json(milestone, { status: 201 });
}
