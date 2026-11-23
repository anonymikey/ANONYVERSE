import {
  boolean,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  serial,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";

export const userRoleEnum = pgEnum("user_role", ["user", "admin"]);
export const providerEnvironmentEnum = pgEnum("provider_environment", ["development", "test", "production"]);
export const providerSetupStatusEnum = pgEnum("provider_setup_status", ["not_configured", "configured", "tested", "active"]);
export const providerApprovalStatusEnum = pgEnum("provider_approval_status", ["pending", "approved", "rejected"]);
export const contentSourceTypeEnum = pgEnum("content_source_type", ["demo", "provider"]);
export const mobilePlatformEnum = pgEnum("mobile_platform", ["android", "ios"]);
export const mobileReleaseStatusEnum = pgEnum("mobile_release_status", ["draft", "approved", "withdrawn"]);

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: userRoleEnum("role").default("user").notNull(),
  createdAt: timestamp("createdAt", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updatedAt", { withTimezone: true }).defaultNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn", { withTimezone: true }).defaultNow().notNull(),
});
export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

export const providers = pgTable("providers", {
  id: serial("id").primaryKey(),
  providerKey: varchar("providerKey", { length: 80 }).notNull().unique(),
  name: varchar("name", { length: 180 }).notNull(),
  category: varchar("category", { length: 64 }).notNull(),
  docsUrl: text("docsUrl"),
  baseUrl: text("baseUrl"),
  authType: varchar("authType", { length: 64 }),
  environment: providerEnvironmentEnum("environment").default("development").notNull(),
  credentialRef: varchar("credentialRef", { length: 180 }),
  subscriptionInfo: text("subscriptionInfo"),
  setupStatus: providerSetupStatusEnum("setupStatus").default("not_configured").notNull(),
  approvalStatus: providerApprovalStatusEnum("approvalStatus").default("pending").notNull(),
  enabled: boolean("enabled").default(false).notNull(),
  createdAt: timestamp("createdAt", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updatedAt", { withTimezone: true }).defaultNow().notNull(),
});

export const contentItems = pgTable("content_items", {
  id: varchar("id", { length: 80 }).primaryKey(),
  kind: varchar("kind", { length: 32 }).notNull(),
  providerId: integer("providerId"),
  title: varchar("title", { length: 240 }).notNull(),
  subtitle: text("subtitle"),
  description: text("description"),
  artworkUrl: text("artworkUrl"),
  heroUrl: text("heroUrl"),
  year: varchar("year", { length: 32 }),
  rating: numeric("rating", { precision: 3, scale: 1 }),
  duration: varchar("duration", { length: 40 }),
  language: varchar("language", { length: 64 }),
  genres: jsonb("genres"),
  details: jsonb("details"),
  sourceType: contentSourceTypeEnum("sourceType").default("demo").notNull(),
  createdAt: timestamp("createdAt", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updatedAt", { withTimezone: true }).defaultNow().notNull(),
});

export const favorites = pgTable("favorites", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(),
  contentId: varchar("contentId", { length: 80 }).notNull(),
  createdAt: timestamp("createdAt", { withTimezone: true }).defaultNow().notNull(),
});

export const viewingProgress = pgTable("viewing_progress", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(),
  contentId: varchar("contentId", { length: 80 }).notNull(),
  progress: numeric("progress", { precision: 5, scale: 4 }).default("0").notNull(),
  updatedAt: timestamp("updatedAt", { withTimezone: true }).defaultNow().notNull(),
});

export const providerHealthChecks = pgTable("provider_health_checks", {
  id: serial("id").primaryKey(),
  providerId: integer("providerId").notNull(),
  ok: boolean("ok").notNull(),
  message: text("message"),
  checkedAt: timestamp("checkedAt", { withTimezone: true }).defaultNow().notNull(),
});

export const adminAuditEvents = pgTable("admin_audit_events", {
  id: serial("id").primaryKey(),
  actorUserId: integer("actorUserId").notNull(),
  action: varchar("action", { length: 120 }).notNull(),
  providerId: integer("providerId"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("createdAt", { withTimezone: true }).defaultNow().notNull(),
});

export const mobileReleases = pgTable("mobile_releases", {
  id: serial("id").primaryKey(),
  version: varchar("version", { length: 32 }).notNull(),
  platform: mobilePlatformEnum("platform").notNull(),
  status: mobileReleaseStatusEnum("status").default("draft").notNull(),
  downloadUrl: text("downloadUrl"),
  releaseNotes: jsonb("releaseNotes").notNull(),
  minimumRequirement: varchar("minimumRequirement", { length: 180 }),
  sha256: varchar("sha256", { length: 128 }),
  publishedAt: timestamp("publishedAt", { withTimezone: true }),
  createdAt: timestamp("createdAt", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updatedAt", { withTimezone: true }).defaultNow().notNull(),
});
export type MobileRelease = typeof mobileReleases.$inferSelect;
export type InsertMobileRelease = typeof mobileReleases.$inferInsert;
