import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

type Role = "admin" | "user" | "read_only";

const ROLE_RANK: Record<Role, number> = { admin: 2, user: 1, read_only: 0 };

export async function getSession() {
  return auth.api.getSession({ headers: await headers() });
}

/**
 * Returns the session or a 401 NextResponse.
 * Usage: const result = await requireSession(); if (result instanceof NextResponse) return result;
 */
export async function requireSession() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return session;
}

/**
 * Checks that the session user has at least the given minimum role.
 * Returns a 403 NextResponse if insufficient, otherwise null.
 */
export function checkRole(
  session: NonNullable<Awaited<ReturnType<typeof getSession>>>,
  minRole: "user" | "admin"
): NextResponse | null {
  const userRole = (session.user as { role?: string }).role ?? "user";
  const rank = ROLE_RANK[userRole as Role] ?? 0;
  const required = ROLE_RANK[minRole];
  if (rank < required) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  return null;
}
