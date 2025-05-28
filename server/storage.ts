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

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private rooms: Map<string, Room>;
  private attendanceRecords: Map<number, AttendanceRecord>;
  private sessions: Map<string, Session>;
  private currentUserId: number;
  private currentAttendanceId: number;

  constructor() {
    this.users = new Map();
    this.rooms = new Map();
    this.attendanceRecords = new Map();
    this.sessions = new Map();
    this.currentUserId = 1;
    this.currentAttendanceId = 1;
    
    this.seedData();
  }

  private seedData() {
    // Seed default users
    const defaultUsers = [
      { username: "STU12345", password: "password123", name: "Jane Doe", role: "student", deviceId: "ABC-XYZ-123" },
      { username: "STU12346", password: "password123", name: "John Smith", role: "student", deviceId: "DEF-ABC-456" },
      { username: "FAC001", password: "faculty123", name: "Dr. Williams", role: "faculty", deviceId: null },
    ];

    defaultUsers.forEach(user => {
      const id = this.currentUserId++;
      this.users.set(id, { ...user, id });
    });

    // Seed default rooms
    const defaultRooms = [
      { id: "room-a", name: "Computer Science Lab", beaconId: "BEACON-CS-001", isActive: true },
      { id: "room-b", name: "Physics Lab", beaconId: "BEACON-PH-002", isActive: true },
      { id: "room-c", name: "Main Auditorium", beaconId: "BEACON-AU-003", isActive: true },
    ];

    defaultRooms.forEach(room => {
      this.rooms.set(room.id, room);
    });
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.username === username);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentUserId++;
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  // Room methods
  async getRoom(id: string): Promise<Room | undefined> {
    return this.rooms.get(id);
  }

  async getAllRooms(): Promise<Room[]> {
    return Array.from(this.rooms.values()).filter(room => room.isActive);
  }

  async createRoom(room: InsertRoom): Promise<Room> {
    this.rooms.set(room.id, room);
    return room;
  }

  // Attendance methods
  async getAttendanceRecord(id: number): Promise<AttendanceRecord | undefined> {
    return this.attendanceRecords.get(id);
  }

  async getAttendanceByStudent(studentId: number): Promise<AttendanceRecord[]> {
    return Array.from(this.attendanceRecords.values())
      .filter(record => record.studentId === studentId)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }

  async getAttendanceByRoom(roomId: string): Promise<AttendanceRecord[]> {
    return Array.from(this.attendanceRecords.values())
      .filter(record => record.roomId === roomId)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }

  async getAttendanceByRoomAndDate(roomId: string, date: Date): Promise<AttendanceRecord[]> {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    return Array.from(this.attendanceRecords.values())
      .filter(record => {
        const recordDate = new Date(record.timestamp);
        return record.roomId === roomId && 
               recordDate >= startOfDay && 
               recordDate <= endOfDay;
      })
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }

  async createAttendance(insertAttendance: InsertAttendance): Promise<AttendanceRecord> {
    const id = this.currentAttendanceId++;
    const attendance: AttendanceRecord = {
      ...insertAttendance,
      id,
      timestamp: new Date(),
      isValid: true,
    };
    this.attendanceRecords.set(id, attendance);
    return attendance;
  }

  async checkDuplicateAttendance(studentId: number, roomId: string, date: Date): Promise<boolean> {
    const records = await this.getAttendanceByRoomAndDate(roomId, date);
    return records.some(record => record.studentId === studentId && record.isValid);
  }

  // Session methods
  async createSession(sessionData: Omit<Session, 'id'>): Promise<Session> {
    const id = `sess_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const session: Session = { ...sessionData, id };
    this.sessions.set(sessionData.token, session);
    return session;
  }

  async getSession(token: string): Promise<Session | undefined> {
    const session = this.sessions.get(token);
    if (session && new Date() > session.expiresAt) {
      this.sessions.delete(token);
      return undefined;
    }
    return session;
  }

  async deleteSession(token: string): Promise<void> {
    this.sessions.delete(token);
  }
}

export const storage = new MemStorage();
