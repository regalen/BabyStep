import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { user, account, session } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { requireSession, checkRole } from "@/lib/auth-helpers";
import { scryptAsync } from "@noble/hashes/scrypt.js";
import { bytesToHex, randomBytes } from "@noble/hashes/utils.js";

// Matches better-auth's internal scrypt password format: "salt:hash"
async function hashPassword(password: string): Promise<string> {
  const salt = bytesToHex(randomBytes(16));
  const key = await scryptAsync(password.normalize("NFKC"), salt, { N: 16384, r: 16, p: 1, dkLen: 64, maxmem: 128 * 16384 * 16 * 2 });
  return `${salt}:${bytesToHex(key)}`;
}

export async function GET() {
  const s = await requireSession();
  if (s instanceof NextResponse) return s;
  const forbidden = checkRole(s, "admin");
  if (forbidden) return forbidden;

  const users = await db
    .select({
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt,
    })
    .from(user)
    .orderBy(user.createdAt);

  return NextResponse.json(users);
}

export async function POST(request: NextRequest) {
  const s = await requireSession();
  if (s instanceof NextResponse) return s;
  const forbidden = checkRole(s, "admin");
  if (forbidden) return forbidden;

  const body = await request.json();
  const { firstName, lastName, email, password, role: newRole } = body;

  if (!firstName || !lastName || !email || !password) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const validRoles = ["admin", "user", "read_only"];
  const assignedRole = validRoles.includes(newRole) ? newRole : "user";

  // Check email uniqueness
  const [existing] = await db.select({ id: user.id }).from(user).where(eq(user.email, email)).limit(1);
  if (existing) return NextResponse.json({ error: "Email already in use" }, { status: 409 });

  const now = new Date();
  const userId = crypto.randomUUID();
  const hashedPassword = await hashPassword(password);

  const [newUser] = await db
    .insert(user)
    .values({
      id: userId,
      name: `${firstName} ${lastName}`,
      email,
      emailVerified: false,
      firstName,
      lastName,
      role: assignedRole,
      createdAt: now,
      updatedAt: now,
    })
    .returning();

  await db.insert(account).values({
    id: crypto.randomUUID(),
    accountId: userId,
    providerId: "credential",
    userId,
    password: hashedPassword,
    createdAt: now,
    updatedAt: now,
  });

  return NextResponse.json(
    { id: newUser.id, firstName: newUser.firstName, lastName: newUser.lastName, email: newUser.email, role: newUser.role },
    { status: 201 }
  );
}

export async function PATCH(request: NextRequest) {
  const s = await requireSession();
  if (s instanceof NextResponse) return s;
  const forbidden = checkRole(s, "admin");
  if (forbidden) return forbidden;

  const body = await request.json();
  const { id, role: newRole, firstName, lastName } = body;
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const [existing] = await db.select({ id: user.id }).from(user).where(eq(user.id, id)).limit(1);
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const validRoles = ["admin", "user", "read_only"];
  const updates: Partial<typeof user.$inferInsert> = { updatedAt: new Date() };
  if (newRole !== undefined && validRoles.includes(newRole)) updates.role = newRole;
  if (firstName !== undefined) updates.firstName = firstName;
  if (lastName !== undefined) updates.lastName = lastName;
  if (firstName !== undefined || lastName !== undefined) {
    const [current] = await db.select({ firstName: user.firstName, lastName: user.lastName }).from(user).where(eq(user.id, id)).limit(1);
    updates.name = `${firstName ?? current.firstName} ${lastName ?? current.lastName}`;
  }

  const [updated] = await db.update(user).set(updates).where(eq(user.id, id)).returning({
    id: user.id,
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    role: user.role,
  });

  return NextResponse.json(updated);
}

export async function DELETE(request: NextRequest) {
  const s = await requireSession();
  if (s instanceof NextResponse) return s;
  const forbidden = checkRole(s, "admin");
  if (forbidden) return forbidden;

  const id = request.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  // Prevent self-deletion
  if (id === s.user.id) {
    return NextResponse.json({ error: "Cannot delete your own account" }, { status: 400 });
  }

  const [existing] = await db.select({ id: user.id }).from(user).where(eq(user.id, id)).limit(1);
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Cascade: delete sessions and accounts (schema has onDelete cascade, but be explicit)
  await db.delete(session).where(eq(session.userId, id));
  await db.delete(account).where(eq(account.userId, id));
  await db.delete(user).where(eq(user.id, id));

  return NextResponse.json({ ok: true });
}
