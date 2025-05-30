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
      console.log(`Login attempt for username: ${username}`);
      
      const user = await storage.getUserByUsername(username);
      if (!user) {
        console.log(`User not found for username: ${username}`);
        return res.status(401).json({ message: "Invalid credentials" });
      }

      // For demo purposes, we're not hashing passwords
      // In production, use bcrypt.compare(password, user.password)
      if (password !== user.password) {
        console.log(`Password mismatch for username: ${username}`);
        return res.status(401).json({ message: "Invalid credentials" });
      }

      const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);
      console.log(`Creating session for user: ${user.id}`);

      await storage.createSession({
        userId: user.id,
        token,
        expiresAt,
      });

      const { password: _, ...userWithoutPassword } = user;
      console.log(`Login successful for user: ${user.id}`);
      res.json({ user: userWithoutPassword, token });
    } catch (error) {
      console.error("Login error:", error);
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

  // Test endpoint
  app.post("/api/test", (req, res) => {
    console.log("TEST ENDPOINT HIT!");
    res.json({ message: "Test successful" });
  });

  // Attendance routes
  app.get("/api/attendance/room/:roomId", authenticateToken, async (req: any, res) => {
    try {
      // Only faculty can view room attendance
      if (req.user.role !== 'faculty') {
        return res.status(403).json({ message: "Faculty access required" });
      }

      const roomId = req.params.roomId;
      const date = req.query.date ? new Date(req.query.date as string) : new Date();

      const records = await storage.getAttendanceByRoomAndDate(roomId, date);
      res.json(records);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch attendance records" });
    }
  });

  app.post("/api/attendance/mark", async (req: any, res) => {
    console.log("=== ATTENDANCE ENDPOINT HIT ===");
    console.log("Headers:", req.headers);
    console.log("Body:", req.body);
    
    // Check authentication manually
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) {
      console.log("No token provided");
      return res.status(401).json({ message: 'Access token required' });
    }

    try {
      const session = await storage.getSession(token);
      if (!session) {
        console.log("Invalid session");
        return res.status(401).json({ message: 'Invalid or expired token' });
      }

      const user = await storage.getUser(session.userId);
      if (!user) {
        console.log("User not found");
        return res.status(401).json({ message: 'User not found' });
      }

      console.log("User authenticated:", user.username);

      // Create attendance record
      const attendance = await storage.createAttendance({
        roomId: req.body.roomId || "room-a",
        proximity: req.body.proximity || 2.5,
        method: "BLE",
        status: "present",
        studentId: user.id,
      });

      console.log("Attendance created:", attendance);
      res.status(201).json(attendance);
    } catch (error) {
      console.error("Error:", error);
      res.status(500).json({ message: "Server error", error: String(error) });
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

  app.get("/api/analytics/stats/:roomId", authenticateToken, async (req: any, res) => {
    try {
      // Only faculty can view room attendance
      if (req.user.role !== 'faculty') {
        return res.status(403).json({ message: "Faculty access required" });
      }

      const roomId = req.params.roomId;
      const date = req.query.date ? new Date(req.query.date as string) : new Date();

      // Get all attendance records for the room and date
      const records = await storage.getAttendanceByRoomAndDate(roomId, date);

      // Calculate statistics
      const stats = {
        present: records.filter(r => r.status === "present").length,
        late: records.filter(r => r.status === "late").length,
        absent: records.filter(r => r.status === "absent").length,
        total: records.length,
        attendanceRate: `${Math.round((records.filter(r => r.status === "present").length / records.length) * 100)}%`
      };

      res.json(stats);
    } catch (error) {
      console.error("Stats error:", error);
      res.status(500).json({ message: "Failed to fetch attendance statistics" });
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

  // Report generation endpoint
  app.post("/api/reports/generate", authenticateToken, async (req: any, res) => {
    try {
      if (req.user.role !== 'faculty') {
        return res.status(403).json({ message: "Faculty access required" });
      }

      const { reportType, roomIds, startDate, endDate, format, includeAbsent, includeStats } = req.body;
      
      const start = new Date(startDate);
      const end = new Date(endDate);

      // Gather attendance data for all selected rooms
      let allAttendanceData = [];
      const roomNames = await storage.getAllRooms().then(rooms => 
        rooms.reduce((acc: Record<string, string>, room) => {
          acc[room.id] = room.name;
          return acc;
        }, {} as Record<string, string>)
      );

      for (const roomId of roomIds) {
        const room = await storage.getRoom(roomId);
        if (room) {
          const records = await storage.getAttendanceByRoomAndDate(roomId, start);
          
          // Join with student data
          const recordsWithStudents = await Promise.all(
            records.map(async (record) => {
              const student = await storage.getUser(record.studentId);
              return {
                ...record,
                student: student ? { id: student.id, name: student.name, username: student.username } : null,
                roomName: room.name
              };
            })
          );
          
          allAttendanceData.push(...recordsWithStudents);
        }
      }

      // Generate CSV content
      if (format === "csv") {
        const headers = [
          "Date",
          "Time", 
          "Room",
          "Student ID",
          "Student Name",
          "Status",
          "Method",
          "Proximity (m)"
        ];

        if (includeStats) {
          headers.push("Attendance Rate");
        }

        let csvContent = headers.join(",") + "\n";

        // Add attendance records
        allAttendanceData.forEach(record => {
          const date = new Date(record.timestamp);
          const row = [
            date.toLocaleDateString(),
            date.toLocaleTimeString(),
            record.roomName,
            record.student?.username || "Unknown",
            record.student?.name || "Unknown",
            record.status,
            record.method,
            record.proximity.toFixed(1)
          ];

          if (includeStats) {
            row.push(""); // Placeholder for attendance rate
          }

          csvContent += row.map(field => `"${field}"`).join(",") + "\n";
        });

        // Add statistics summary if requested
        if (includeStats) {
          csvContent += "\n\nSUMMARY STATISTICS\n";
          csvContent += "Room,Total Present,Total Records,Attendance Rate\n";
          
          for (const roomId of roomIds) {
            const roomRecords = allAttendanceData.filter(r => r.roomId === roomId);
            const presentCount = roomRecords.filter(r => r.status === "present" || r.status === "late").length;
            const totalRecords = roomRecords.length;
            const rate = totalRecords > 0 ? ((presentCount / totalRecords) * 100).toFixed(1) : "0";
            
            csvContent += `"${roomNames[roomId]}",${presentCount},${totalRecords},${rate}%\n`;
          }
        }

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="attendance_report_${start.toISOString().split('T')[0]}.csv"`);
        res.send(csvContent);
      } else {
        // For now, only CSV is implemented
        res.status(400).json({ message: "Only CSV format is currently supported" });
      }

    } catch (error) {
      console.error("Report generation error:", error);
      res.status(500).json({ message: "Failed to generate report" });
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
