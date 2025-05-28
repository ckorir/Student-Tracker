import { pgTable, serial, integer, text, timestamp, real, boolean, unique } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"



export const attendanceRecords = pgTable("attendance_records", {
	id: serial().primaryKey().notNull(),
	studentId: integer("student_id").notNull(),
	roomId: text("room_id").notNull(),
	timestamp: timestamp({ mode: 'string' }).defaultNow().notNull(),
	proximity: real().notNull(),
	method: text().default('BLE').notNull(),
	status: text().default('present').notNull(),
	isValid: boolean("is_valid").default(true),
});

export const rooms = pgTable("rooms", {
	id: text().primaryKey().notNull(),
	name: text().notNull(),
	beaconId: text("beacon_id").notNull(),
	isActive: boolean("is_active").default(true),
});

export const sessions = pgTable("sessions", {
	id: text().primaryKey().notNull(),
	userId: integer("user_id").notNull(),
	token: text().notNull(),
	expiresAt: timestamp("expires_at", { mode: 'string' }).notNull(),
});

export const users = pgTable("users", {
	id: serial().primaryKey().notNull(),
	username: text().notNull(),
	password: text().notNull(),
	name: text().notNull(),
	role: text().default('student').notNull(),
	deviceId: text("device_id"),
}, (table) => [
	unique("users_username_unique").on(table.username),
]);
