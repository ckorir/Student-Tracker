import { 
  users, 
  rooms, 
  attendanceRecords, 
  sessions,
  type User, 
  type InsertUser, 
  type Room, 
  type InsertRoom,
  type AttendanceRecord, 
  type InsertAttendance,
  type Session
} from "@shared/schema";
import { db } from "./db";
import { eq, and, gte, lte } from "drizzle-orm";

export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Room methods
  getRoom(id: string): Promise<Room | undefined>;
  getAllRooms(): Promise<Room[]>;
  createRoom(room: InsertRoom): Promise<Room>;

  // Attendance methods
  getAttendanceRecord(id: number): Promise<AttendanceRecord | undefined>;
  getAttendanceByStudent(studentId: number): Promise<AttendanceRecord[]>;
  getAttendanceByRoom(roomId: string): Promise<AttendanceRecord[]>;
  getAttendanceByRoomAndDate(roomId: string, date: Date): Promise<AttendanceRecord[]>;
  createAttendance(attendance: InsertAttendance): Promise<AttendanceRecord>;
  checkDuplicateAttendance(studentId: number, roomId: string, date: Date): Promise<boolean>;

  // Session methods
  createSession(session: Omit<Session, 'id'>): Promise<Session>;
  getSession(token: string): Promise<Session | undefined>;
  deleteSession(token: string): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  // User methods
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }

  // Room methods
  async getRoom(id: string): Promise<Room | undefined> {
    const [room] = await db.select().from(rooms).where(eq(rooms.id, id));
    return room || undefined;
  }

  async getAllRooms(): Promise<Room[]> {
    return await db.select().from(rooms).where(eq(rooms.isActive, true));
  }

  async createRoom(room: InsertRoom): Promise<Room> {
    const [newRoom] = await db
      .insert(rooms)
      .values(room)
      .returning();
    return newRoom;
  }

  // Attendance methods
  async getAttendanceRecord(id: number): Promise<AttendanceRecord | undefined> {
    const [record] = await db.select().from(attendanceRecords).where(eq(attendanceRecords.id, id));
    return record || undefined;
  }

  async getAttendanceByStudent(studentId: number): Promise<AttendanceRecord[]> {
    return await db.select()
      .from(attendanceRecords)
      .where(eq(attendanceRecords.studentId, studentId))
      .orderBy(attendanceRecords.timestamp);
  }

  async getAttendanceByRoom(roomId: string): Promise<AttendanceRecord[]> {
    return await db.select()
      .from(attendanceRecords)
      .where(eq(attendanceRecords.roomId, roomId))
      .orderBy(attendanceRecords.timestamp);
  }

  async getAttendanceByRoomAndDate(roomId: string, date: Date): Promise<AttendanceRecord[]> {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    return await db.select()
      .from(attendanceRecords)
      .where(
        and(
          eq(attendanceRecords.roomId, roomId),
          gte(attendanceRecords.timestamp, startOfDay),
          lte(attendanceRecords.timestamp, endOfDay)
        )
      )
      .orderBy(attendanceRecords.timestamp);
  }

  async createAttendance(insertAttendance: InsertAttendance): Promise<AttendanceRecord> {
    const [attendance] = await db
      .insert(attendanceRecords)
      .values({
        ...insertAttendance,
        method: insertAttendance.method || "BLE",
        status: insertAttendance.status || "present",
      })
      .returning();
    return attendance;
  }

  async checkDuplicateAttendance(studentId: number, roomId: string, date: Date): Promise<boolean> {
    const records = await this.getAttendanceByRoomAndDate(roomId, date);
    return records.some(record => record.studentId === studentId && record.isValid);
  }

  // Session methods
  async createSession(sessionData: Omit<Session, 'id'>): Promise<Session> {
    const [session] = await db
      .insert(sessions)
      .values({
        id: `sess_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        ...sessionData,
      })
      .returning();
    return session;
  }

  async getSession(token: string): Promise<Session | undefined> {
    const [session] = await db.select().from(sessions).where(eq(sessions.token, token));
    if (session && new Date() > session.expiresAt) {
      await db.delete(sessions).where(eq(sessions.token, token));
      return undefined;
    }
    return session || undefined;
  }

  async deleteSession(token: string): Promise<void> {
    await db.delete(sessions).where(eq(sessions.token, token));
  }
}

export const storage = new DatabaseStorage();
