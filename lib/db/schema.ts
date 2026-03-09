import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";

// ─── better-auth required tables ─────────────────────────────────────────────

export const user = sqliteTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: integer("emailVerified", { mode: "boolean" })
    .notNull()
    .default(false),
  image: text("image"),
  createdAt: integer("createdAt", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updatedAt", { mode: "timestamp" }).notNull(),
  // Extended user fields
  firstName: text("firstName").notNull().default(""),
  lastName: text("lastName").notNull().default(""),
  role: text("role", { enum: ["admin", "user", "read_only"] }).notNull().default("user"),
});

export const session = sqliteTable("session", {
  id: text("id").primaryKey(),
  expiresAt: integer("expiresAt", { mode: "timestamp" }).notNull(),
  token: text("token").notNull().unique(),
  createdAt: integer("createdAt", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updatedAt", { mode: "timestamp" }).notNull(),
  ipAddress: text("ipAddress"),
  userAgent: text("userAgent"),
  userId: text("userId")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
});

export const account = sqliteTable("account", {
  id: text("id").primaryKey(),
  accountId: text("accountId").notNull(),
  providerId: text("providerId").notNull(),
  userId: text("userId")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  accessToken: text("accessToken"),
  refreshToken: text("refreshToken"),
  idToken: text("idToken"),
  expiresAt: integer("expiresAt", { mode: "timestamp" }),
  password: text("password"),
  createdAt: integer("createdAt", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updatedAt", { mode: "timestamp" }).notNull(),
});

export const verification = sqliteTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: integer("expiresAt", { mode: "timestamp" }).notNull(),
  createdAt: integer("createdAt", { mode: "timestamp" }),
  updatedAt: integer("updatedAt", { mode: "timestamp" }),
});

// ─── App tables ───────────────────────────────────────────────────────────────

export const babies = sqliteTable("babies", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  userId: text("userId")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  firstName: text("firstName").notNull(),
  lastName: text("lastName").notNull(),
  dob: text("dob").notNull(), // ISO date string YYYY-MM-DD
  birthWeightGrams: real("birthWeightGrams"),
  birthTime: text("birthTime"), // ISO datetime string
  picturePath: text("picturePath"),
  archivedAt: integer("archivedAt", { mode: "timestamp" }),
  createdAt: integer("createdAt", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export const feedings = sqliteTable("feedings", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  babyId: text("babyId")
    .notNull()
    .references(() => babies.id, { onDelete: "cascade" }),
  type: text("type", { enum: ["breast", "bottle"] }).notNull(),
  amountMl: real("amountMl"),
  side: text("side", { enum: ["left", "right", "both"] }),
  startTime: integer("startTime", { mode: "timestamp" }).notNull(),
  endTime: integer("endTime", { mode: "timestamp" }),
  notes: text("notes"),
  createdAt: integer("createdAt", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export const diapers = sqliteTable("diapers", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  babyId: text("babyId")
    .notNull()
    .references(() => babies.id, { onDelete: "cascade" }),
  type: text("type", { enum: ["wet", "dirty", "both"] }).notNull(),
  color: text("color"),
  notes: text("notes"),
  timestamp: integer("timestamp", { mode: "timestamp" }).notNull(),
  createdAt: integer("createdAt", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export const sleeps = sqliteTable("sleeps", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  babyId: text("babyId")
    .notNull()
    .references(() => babies.id, { onDelete: "cascade" }),
  startTime: integer("startTime", { mode: "timestamp" }).notNull(),
  endTime: integer("endTime", { mode: "timestamp" }),
  notes: text("notes"),
  createdAt: integer("createdAt", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export const medications = sqliteTable("medications", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  babyId: text("babyId")
    .notNull()
    .references(() => babies.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  dosage: text("dosage").notNull(),
  timestamp: integer("timestamp", { mode: "timestamp" }).notNull(),
  notes: text("notes"),
  createdAt: integer("createdAt", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export const milestones = sqliteTable("milestones", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  babyId: text("babyId")
    .notNull()
    .references(() => babies.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  date: text("date").notNull(), // ISO date string
  photoPath: text("photoPath"),
  notes: text("notes"),
  createdAt: integer("createdAt", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export const appSettings = sqliteTable("appSettings", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  // nullable — global singleton row not tied to any specific user
  userId: text("userId")
    .references(() => user.id, { onDelete: "set null" }),
  units: text("units", { enum: ["metric", "imperial"] })
    .notNull()
    .default("metric"),
  formulaOnly: integer("formulaOnly", { mode: "boolean" })
    .notNull()
    .default(false),
  // JSON array of enabled activity keys e.g. '["feeding","diaper","sleep","medication","milestones"]'
  enabledActivities: text("enabledActivities")
    .notNull()
    .default('["feeding","diaper","sleep","medication","milestones"]'),
  updatedAt: integer("updatedAt", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export const medicationPresets = sqliteTable("medicationPresets", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  babyId: text("babyId")
    .notNull()
    .references(() => babies.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  defaultDosage: text("defaultDosage"), // null = user enters manually each time
  createdAt: integer("createdAt", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});
