import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { user } from "@/lib/db/schema";
import { sql } from "drizzle-orm";

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
