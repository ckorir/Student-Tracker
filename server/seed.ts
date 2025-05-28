import { db } from "./db";
import { users, rooms } from "@shared/schema";

async function seedDatabase() {
  try {
    console.log("🌱 Seeding database...");

    // Seed default users
    const defaultUsers = [
      { username: "STU12345", password: "password123", name: "Jane Doe", role: "student", deviceId: "ABC-XYZ-123" },
      { username: "STU12346", password: "password123", name: "John Smith", role: "student", deviceId: "DEF-ABC-456" },
      { username: "FAC001", password: "faculty123", name: "Dr. Williams", role: "faculty", deviceId: null },
    ];

    for (const userData of defaultUsers) {
      await db
        .insert(users)
        .values(userData)
        .onConflictDoNothing();
    }

    // Seed default rooms
    const defaultRooms = [
      { id: "room-a", name: "Computer Science Lab", beaconId: "BEACON-CS-001", isActive: true },
      { id: "room-b", name: "Physics Lab", beaconId: "BEACON-PH-002", isActive: true },
      { id: "room-c", name: "Main Auditorium", beaconId: "BEACON-AU-003", isActive: true },
    ];

    for (const roomData of defaultRooms) {
      await db
        .insert(rooms)
        .values(roomData)
        .onConflictDoNothing();
    }

    console.log("✅ Database seeded successfully!");
  } catch (error) {
    console.error("❌ Error seeding database:", error);
    throw error;
  }
}

// Run the seed function if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  seedDatabase()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

export { seedDatabase };