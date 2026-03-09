import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { user } from "@/lib/db/schema";
import { sql, eq } from "drizzle-orm";

/** Returns whether the app needs first-time setup (no users yet). */
export async function GET() {
  try {
    const result = await db.select({ count: sql<number>`count(*)` }).from(user);
    const count = result[0]?.count ?? 0;
    return NextResponse.json({ needsSetup: count === 0 });
  } catch {
    return NextResponse.json({ needsSetup: true });
  }
}

/**
 * POST /api/setup/promote-admin
 * Called immediately after the setup wizard creates the first user.
 * Promotes that user to admin role. Only works when there is exactly 1 user.
 */
export async function POST() {
  try {
    const result = await db.select({ count: sql<number>`count(*)` }).from(user);
    const count = result[0]?.count ?? 0;
    if (count !== 1) {
      return NextResponse.json({ error: "Not eligible" }, { status: 403 });
    }
    const [firstUser] = await db.select({ id: user.id }).from(user).limit(1);
    if (!firstUser) return NextResponse.json({ error: "No user found" }, { status: 404 });

    await db.update(user).set({ role: "admin" }).where(eq(user.id, firstUser.id));
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Failed to promote admin" }, { status: 500 });
  }
}
