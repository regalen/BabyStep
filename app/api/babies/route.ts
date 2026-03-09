import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { babies } from "@/lib/db/schema";
import { eq, and, isNull } from "drizzle-orm";
import { requireSession, checkRole } from "@/lib/auth-helpers";

export async function GET(request: NextRequest) {
  const session = await requireSession();
  if (session instanceof NextResponse) return session;

  const includeArchived = request.nextUrl.searchParams.get("includeArchived") === "true";

  // All authenticated users can see all babies (shared household model)
  const result = await db
    .select()
    .from(babies)
    .where(includeArchived ? undefined : isNull(babies.archivedAt));

  return NextResponse.json(result);
}

export async function POST(request: NextRequest) {
  const session = await requireSession();
  if (session instanceof NextResponse) return session;

  const forbidden = checkRole(session, "admin");
  if (forbidden) return forbidden;

  const body = await request.json();
  const { firstName, lastName, dob, birthWeightGrams, birthTime } = body;

  if (!firstName || !lastName || !dob) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const [baby] = await db
    .insert(babies)
    .values({
      userId: session.user.id, // record creator; not used for access control
      firstName,
      lastName,
      dob,
      birthWeightGrams: birthWeightGrams ?? null,
      birthTime: birthTime ?? null,
    })
    .returning();

  return NextResponse.json(baby, { status: 201 });
}

export async function PATCH(request: NextRequest) {
  const session = await requireSession();
  if (session instanceof NextResponse) return session;

  const forbidden = checkRole(session, "admin");
  if (forbidden) return forbidden;

  const body = await request.json();
  const { id, action } = body;

  if (!id || !["archive", "unarchive"].includes(action)) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const [existing] = await db.select().from(babies).where(eq(babies.id, id));
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const [updated] = await db
    .update(babies)
    .set({ archivedAt: action === "archive" ? new Date() : null })
    .where(eq(babies.id, id))
    .returning();

  return NextResponse.json(updated);
}

export async function DELETE(request: NextRequest) {
  const session = await requireSession();
  if (session instanceof NextResponse) return session;

  const forbidden = checkRole(session, "admin");
  if (forbidden) return forbidden;

  const id = request.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const [existing] = await db.select().from(babies).where(eq(babies.id, id));
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await db.delete(babies).where(eq(babies.id, id));
  return NextResponse.json({ ok: true });
}
