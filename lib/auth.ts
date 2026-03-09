import { betterAuth } from "better-auth";
import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { db } from "@/lib/db";
import * as schema from "@/lib/db/schema";
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { dirname, join } from "path";
import { randomBytes } from "crypto";

function resolveSecret(): string {
  if (process.env.BETTER_AUTH_SECRET) return process.env.BETTER_AUTH_SECRET;
  const dbPath = process.env.DATABASE_PATH ?? "./data/babystep.db";
  const dir = dirname(dbPath);
  const secretFile = join(dir, "babystep.secret");
  try {
    mkdirSync(dir, { recursive: true });
    if (existsSync(secretFile)) return readFileSync(secretFile, "utf-8").trim();
    const secret = randomBytes(32).toString("hex");
    writeFileSync(secretFile, secret, "utf-8");
    return secret;
  } catch {
    // Ephemeral fallback — sessions won't survive restarts without a writable /config
    return randomBytes(32).toString("hex");
  }
}

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "sqlite",
    schema: {
      user: schema.user,
      session: schema.session,
      account: schema.account,
      verification: schema.verification,
    },
  }),
  emailAndPassword: {
    enabled: true,
  },
  secret: resolveSecret(),
  // No baseURL — better-auth auto-detects from the request Host header.
  // Works for any hostname, IP, or port with no configuration required.
  user: {
    additionalFields: {
      firstName: {
        type: "string",
        required: true,
        input: true,
      },
      lastName: {
        type: "string",
        required: true,
        input: true,
      },
      role: {
        type: "string",
        required: false,
        input: false, // role is set server-side only, never from client input
        defaultValue: "user",
      },
    },
  },
});

export type Session = typeof auth.$Infer.Session;
