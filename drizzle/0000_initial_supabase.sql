CREATE TYPE "public"."content_source_type" AS ENUM('demo', 'provider');--> statement-breakpoint
CREATE TYPE "public"."mobile_platform" AS ENUM('android', 'ios');--> statement-breakpoint
CREATE TYPE "public"."mobile_release_status" AS ENUM('draft', 'approved', 'withdrawn');--> statement-breakpoint
CREATE TYPE "public"."provider_approval_status" AS ENUM('pending', 'approved', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."provider_environment" AS ENUM('development', 'test', 'production');--> statement-breakpoint
CREATE TYPE "public"."provider_setup_status" AS ENUM('not_configured', 'configured', 'tested', 'active');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('user', 'admin');--> statement-breakpoint
CREATE TABLE "admin_audit_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"actorUserId" integer NOT NULL,
	"action" varchar(120) NOT NULL,
	"providerId" integer,
	"metadata" jsonb,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "content_items" (
	"id" varchar(80) PRIMARY KEY NOT NULL,
	"kind" varchar(32) NOT NULL,
	"providerId" integer,
	"title" varchar(240) NOT NULL,
	"subtitle" text,
	"description" text,
	"artworkUrl" text,
	"heroUrl" text,
	"year" varchar(32),
	"rating" numeric(3, 1),
	"duration" varchar(40),
	"language" varchar(64),
	"genres" jsonb,
	"details" jsonb,
	"sourceType" "content_source_type" DEFAULT 'demo' NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "favorites" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"contentId" varchar(80) NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mobile_releases" (
	"id" serial PRIMARY KEY NOT NULL,
	"version" varchar(32) NOT NULL,
	"platform" "mobile_platform" NOT NULL,
	"status" "mobile_release_status" DEFAULT 'draft' NOT NULL,
	"downloadUrl" text,
	"releaseNotes" jsonb NOT NULL,
	"minimumRequirement" varchar(180),
	"sha256" varchar(128),
	"publishedAt" timestamp with time zone,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "provider_health_checks" (
	"id" serial PRIMARY KEY NOT NULL,
	"providerId" integer NOT NULL,
	"ok" boolean NOT NULL,
	"message" text,
	"checkedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "providers" (
	"id" serial PRIMARY KEY NOT NULL,
	"providerKey" varchar(80) NOT NULL,
	"name" varchar(180) NOT NULL,
	"category" varchar(64) NOT NULL,
	"docsUrl" text,
	"baseUrl" text,
	"authType" varchar(64),
	"environment" "provider_environment" DEFAULT 'development' NOT NULL,
	"credentialRef" varchar(180),
	"subscriptionInfo" text,
	"setupStatus" "provider_setup_status" DEFAULT 'not_configured' NOT NULL,
	"approvalStatus" "provider_approval_status" DEFAULT 'pending' NOT NULL,
	"enabled" boolean DEFAULT false NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "providers_providerKey_unique" UNIQUE("providerKey")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"openId" varchar(64) NOT NULL,
	"name" text,
	"email" varchar(320),
	"loginMethod" varchar(64),
	"role" "user_role" DEFAULT 'user' NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
	"lastSignedIn" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_openId_unique" UNIQUE("openId")
);
--> statement-breakpoint
CREATE TABLE "viewing_progress" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"contentId" varchar(80) NOT NULL,
	"progress" numeric(5, 4) DEFAULT '0' NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
