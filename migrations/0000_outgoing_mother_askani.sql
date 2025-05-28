-- Current sql file was generated after introspecting the database
-- If you want to run this migration please uncomment this code before executing migrations
/*
CREATE TABLE "attendance_records" (
	"id" serial PRIMARY KEY NOT NULL,
	"student_id" integer NOT NULL,
	"room_id" text NOT NULL,
	"timestamp" timestamp DEFAULT now() NOT NULL,
	"proximity" real NOT NULL,
	"method" text DEFAULT 'BLE' NOT NULL,
	"status" text DEFAULT 'present' NOT NULL,
	"is_valid" boolean DEFAULT true
);
--> statement-breakpoint
CREATE TABLE "rooms" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"beacon_id" text NOT NULL,
	"is_active" boolean DEFAULT true
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"token" text NOT NULL,
	"expires_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"username" text NOT NULL,
	"password" text NOT NULL,
	"name" text NOT NULL,
	"role" text DEFAULT 'student' NOT NULL,
	"device_id" text,
	CONSTRAINT "users_username_unique" UNIQUE("username")
);

*/