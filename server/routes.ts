import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { loginSchema, insertAttendanceSchema } from "@shared/schema";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";

const JWT_SECRET = process.env.JWT_SECRET || "attendance_secret_key";
const JWT_EXPIRES_IN = "7d";

// Middleware to verify JWT token
async function authenticateToken(req: any, res: any, next: any) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Access token required' });
  }

  try {
    const session = await storage.getSession(token);
    if (!session) {
      return res.status(401).json({ message: 'Invalid or expired token' });
    }

    const user = await storage.getUser(session.userId);
    if (!user) {
      return res.status(401).json({ message: 'User not found' });
    }

    req.user = user;
    req.token = token;
    next();
  } catch (error) {
    return res.status(403).json({ message: 'Invalid token' });
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth routes
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { username, password } = loginSchema.parse(req.body);
      
      const user = await storage.getUserByUsername(username);
      if (!user) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      // For demo purposes, we're not hashing passwords
      // In production, use bcrypt.compare(password, user.password)
      if (password !== user.password) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);

      await storage.createSession({
        userId: user.id,
        token,
        expiresAt,
      });

      const { password: _, ...userWithoutPassword } = user;
      res.json({ user: userWithoutPassword, token });
    } catch (error) {
      res.status(400).json({ message: "Invalid request data" });
    }
  });

  app.post("/api/auth/logout", authenticateToken, async (req: any, res) => {
    try {
      await storage.deleteSession(req.token);
      res.json({ message: "Logged out successfully" });
    } catch (error) {
      res.status(500).json({ message: "Logout failed" });
    }
  });

  app.get("/api/auth/me", authenticateToken, async (req: any, res) => {
    const { password: _, ...userWithoutPassword } = req.user;
    res.json(userWithoutPassword);
  });

  // Room routes
  app.get("/api/rooms", authenticateToken, async (req, res) => {
    try {
      const rooms = await storage.getAllRooms();
      res.json(rooms);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch rooms" });
    }
  });

  app.get("/api/rooms/:roomId", authenticateToken, async (req, res) => {
    try {
      const room = await storage.getRoom(req.params.roomId);
      if (!room) {
        return res.status(404).json({ message: "Room not found" });
      }
      res.json(room);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch room" });
    }
  });

  // Attendance routes
  app.post("/api/attendance/mark", authenticateToken, async (req: any, res) => {
    try {
      console.log("Attendance request body:", req.body);
      const attendanceData = insertAttendanceSchema.parse(req.body);
      
      // Validate proximity threshold (3 meters max)
      if (attendanceData.proximity > 3.0) {
        return res.status(400).json({ 
          message: "You must be within 3 meters of the beacon to mark attendance" 
        });
      }

      // Check for duplicate attendance on the same day
      const today = new Date();
      const isDuplicate = await storage.checkDuplicateAttendance(
        req.user.id, 
        attendanceData.roomId, 
        today
      );

      if (isDuplicate) {
        return res.status(409).json({ 
          message: "Attendance already marked for this room today" 
        });
      }

      // Validate room exists
      const room = await storage.getRoom(attendanceData.roomId);
      if (!room) {
        return res.status(404).json({ message: "Room not found" });
      }

      const attendance = await storage.createAttendance({
        ...attendanceData,
        studentId: req.user.id,
      });

      res.status(201).json(attendance);
    } catch (error) {
      console.error("Attendance marking error:", error);
      console.error("Error details:", JSON.stringify(error, null, 2));
      res.status(400).json({ message: "Invalid attendance data", error: error.message || String(error) });
    }
  });

  app.get("/api/attendance/student/:studentId", authenticateToken, async (req: any, res) => {
    try {
      const studentId = parseInt(req.params.studentId);
      
      // Users can only view their own attendance unless they're faculty
      if (req.user.role !== 'faculty' && req.user.id !== studentId) {
        return res.status(403).json({ message: "Access denied" });
      }

      const records = await storage.getAttendanceByStudent(studentId);
      res.json(records);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch attendance records" });
    }
  });

  app.get("/api/attendance/room/:roomId", authenticateToken, async (req: any, res) => {
    try {
      // Only faculty can view room attendance
      if (req.user.role !== 'faculty') {
        return res.status(403).json({ message: "Faculty access required" });
      }

      const roomId = req.params.roomId;
      const date = req.query.date ? new Date(req.query.date as string) : new Date();
      
      const records = await storage.getAttendanceByRoomAndDate(roomId, date);
      
      // Join with user data
      const recordsWithStudents = await Promise.all(
        records.map(async (record) => {
          const student = await storage.getUser(record.studentId);
          return {
            ...record,
            student: student ? { id: student.id, name: student.name, username: student.username } : null
          };
        })
      );

      res.json(recordsWithStudents);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch room attendance" });
    }
  });

  app.get("/api/attendance/my", authenticateToken, async (req: any, res) => {
    try {
      const records = await storage.getAttendanceByStudent(req.user.id);
      res.json(records);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch your attendance records" });
    }
  });

  // Faculty analytics routes
  app.get("/api/analytics/stats/:roomId", authenticateToken, async (req: any, res) => {
    try {
      if (req.user.role !== 'faculty') {
        return res.status(403).json({ message: "Faculty access required" });
      }

      const roomId = req.params.roomId;
      const date = req.query.date ? new Date(req.query.date as string) : new Date();
      
      const records = await storage.getAttendanceByRoomAndDate(roomId, date);
      const presentCount = records.filter(r => r.status === 'present').length;
      const lateCount = records.filter(r => r.status === 'late').length;
      
      // Mock total enrolled students for the room
      const totalEnrolled = 30;
      const absentCount = totalEnrolled - presentCount - lateCount;
      const attendanceRate = totalEnrolled > 0 ? ((presentCount + lateCount) / totalEnrolled * 100).toFixed(1) : "0";

      res.json({
        present: presentCount,
        late: lateCount,
        absent: absentCount,
        total: totalEnrolled,
        attendanceRate: `${attendanceRate}%`
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch analytics" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
