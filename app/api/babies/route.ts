import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { babies } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { headers } from "next/headers";

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const result = await db
    .select()
    .from(babies)
    .where(eq(babies.userId, session.user.id));

  return NextResponse.json(result);
}

export async function POST(request: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { firstName, lastName, dob, birthWeightGrams, birthTime } = body;

  if (!firstName || !lastName || !dob) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const [baby] = await db
    .insert(babies)
    .values({
      userId: session.user.id,
      firstName,
      lastName,
      dob,
      birthWeightGrams: birthWeightGrams ?? null,
      birthTime: birthTime ?? null,
    })
    .returning();

  return NextResponse.json(baby, { status: 201 });
}
