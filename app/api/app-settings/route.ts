import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { appSettings } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { requireSession, checkRole } from "@/lib/auth-helpers";

const DEFAULT_ACTIVITIES = '["feeding","diaper","sleep","medication","milestones"]';

/** Get or create the single global settings row. */
async function getOrCreateSettings() {
  const existing = await db.select().from(appSettings).limit(1);
  if (existing[0]) return existing[0];

  const [created] = await db
    .insert(appSettings)
    .values({ enabledActivities: DEFAULT_ACTIVITIES })
    .returning();
  return created;
}

async function applyPatch(
  body: { units?: string; formulaOnly?: boolean; enabledActivities?: string[] }
) {
  const patch: Partial<typeof appSettings.$inferInsert> = { updatedAt: new Date() };
  if (body.units !== undefined) patch.units = body.units as "metric" | "imperial";
  if (body.formulaOnly !== undefined) patch.formulaOnly = body.formulaOnly;
  if (body.enabledActivities !== undefined)
    patch.enabledActivities = JSON.stringify(body.enabledActivities);

  const existing = await getOrCreateSettings();
  const [result] = await db
    .update(appSettings)
    .set(patch)
    .where(eq(appSettings.id, existing.id))
    .returning();
  return result;
}

function format(row: typeof appSettings.$inferSelect) {
  return { ...row, enabledActivities: JSON.parse(row.enabledActivities) as string[] };
}

export async function GET() {
  const session = await requireSession();
  if (session instanceof NextResponse) return session;

  const settings = await getOrCreateSettings();
  return NextResponse.json(format(settings));
}

/** POST — used by setup wizard; no admin check (user is just being created). */
export async function POST(request: NextRequest) {
  const session = await requireSession();
  if (session instanceof NextResponse) return session;

  const body = await request.json();
  const result = await applyPatch(body);
  return NextResponse.json(format(result));
}

/** PATCH — admin-only; used by settings page. */
export async function PATCH(request: NextRequest) {
  const session = await requireSession();
  if (session instanceof NextResponse) return session;

  const forbidden = checkRole(session, "admin");
  if (forbidden) return forbidden;

  const body = await request.json();
  const result = await applyPatch(body);
  return NextResponse.json(format(result));
}
