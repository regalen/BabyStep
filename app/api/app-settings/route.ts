import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { appSettings } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { headers } from "next/headers";

const DEFAULT_ACTIVITIES = '["feeding","diaper","sleep","medication","milestones"]';

async function getOrCreateSettings(userId: string) {
  const existing = await db
    .select()
    .from(appSettings)
    .where(eq(appSettings.userId, userId))
    .limit(1);

  if (existing[0]) return existing[0];

  const [created] = await db
    .insert(appSettings)
    .values({ userId, enabledActivities: DEFAULT_ACTIVITIES })
    .returning();
  return created;
}

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const settings = await getOrCreateSettings(session.user.id);
  return NextResponse.json({
    ...settings,
    enabledActivities: JSON.parse(settings.enabledActivities) as string[],
  });
}

export async function POST(request: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { units, formulaOnly, enabledActivities } = body;

  const patch: Partial<typeof appSettings.$inferInsert> = {
    updatedAt: new Date(),
  };
  if (units !== undefined) patch.units = units;
  if (formulaOnly !== undefined) patch.formulaOnly = formulaOnly;
  if (enabledActivities !== undefined)
    patch.enabledActivities = JSON.stringify(enabledActivities);

  // Upsert
  const existing = await db
    .select()
    .from(appSettings)
    .where(eq(appSettings.userId, session.user.id))
    .limit(1);

  let result;
  if (existing[0]) {
    [result] = await db
      .update(appSettings)
      .set(patch)
      .where(eq(appSettings.userId, session.user.id))
      .returning();
  } else {
    [result] = await db
      .insert(appSettings)
      .values({ userId: session.user.id, ...patch, enabledActivities: patch.enabledActivities ?? DEFAULT_ACTIVITIES })
      .returning();
  }

  return NextResponse.json({
    ...result,
    enabledActivities: JSON.parse(result.enabledActivities) as string[],
  });
}

export async function PATCH(request: NextRequest) {
  return POST(request);
}
