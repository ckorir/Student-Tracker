import { pgTable, text, serial, integer, boolean, timestamp, real } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  name: text("name").notNull(),
  role: text("role").notNull().default("student"), // student, faculty, admin
  deviceId: text("device_id"),
});

export const rooms = pgTable("rooms", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  beaconId: text("beacon_id").notNull(),
  isActive: boolean("is_active").default(true),
});

export const attendanceRecords = pgTable("attendance_records", {
  id: serial("id").primaryKey(),
  studentId: integer("student_id").notNull(),
  roomId: text("room_id").notNull(),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
  proximity: real("proximity").notNull(), // distance in meters
  method: text("method").notNull().default("BLE"), // BLE, manual, QR
  status: text("status").notNull().default("present"), // present, late, absent
  isValid: boolean("is_valid").default(true),
});

export const sessions = pgTable("sessions", {
  id: text("id").primaryKey(),
  userId: integer("user_id").notNull(),
  token: text("token").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
});

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
});

export const insertRoomSchema = createInsertSchema(rooms);

export const insertAttendanceSchema = createInsertSchema(attendanceRecords).omit({
  id: true,
  timestamp: true,
  studentId: true,
}).extend({
  method: z.string().optional(),
  status: z.string().optional(),
});

export const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Room = typeof rooms.$inferSelect;
export type InsertRoom = z.infer<typeof insertRoomSchema>;
export type AttendanceRecord = typeof attendanceRecords.$inferSelect;
export type InsertAttendance = z.infer<typeof insertAttendanceSchema>;
export type Session = typeof sessions.$inferSelect;
export type LoginRequest = z.infer<typeof loginSchema>;
