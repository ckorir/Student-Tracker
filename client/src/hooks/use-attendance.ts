import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export interface Room {
  id: string;
  name: string;
  beaconId: string;
  isActive: boolean;
}

export interface AttendanceRecord {
  id: number;
  studentId: number;
  roomId: string;
  timestamp: string;
  proximity: number;
  method: string;
  status: string;
  isValid: boolean;
  student?: {
    id: number;
    name: string;
    username: string;
  };
}

export interface AttendanceStats {
  present: number;
  late: number;
  absent: number;
  total: number;
  attendanceRate: string;
}

export const useRooms = () => {
  return useQuery<Room[]>({
    queryKey: ["/api/rooms"],
  });
};

export const useMyAttendance = () => {
  return useQuery<AttendanceRecord[]>({
    queryKey: ["/api/attendance/my"],
  });
};

export const useRoomAttendance = (roomId: string, date?: Date) => {
  const dateParam = date ? date.toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
  
  return useQuery<AttendanceRecord[]>({
    queryKey: ["/api/attendance/room", roomId, dateParam],
    queryFn: async () => {
      const response = await apiRequest("GET", `/api/attendance/room/${roomId}?date=${dateParam}`);
      return response.json();
    },
    enabled: !!roomId,
  });
};

export const useAttendanceStats = (roomId: string, date?: Date) => {
  const dateParam = date ? date.toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
  
  return useQuery<AttendanceStats>({
    queryKey: ["/api/analytics/stats", roomId, dateParam],
    enabled: !!roomId,
  });
};

export const useMarkAttendance = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: { roomId: string; proximity: number; method?: string; status?: string }) => {
      const response = await apiRequest("POST", "/api/attendance/mark", data);
      return response.json();
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/attendance/my"] });
      queryClient.invalidateQueries({ queryKey: ["/api/attendance/room", variables.roomId] });
      queryClient.invalidateQueries({ queryKey: ["/api/analytics/stats", variables.roomId] });
      
      toast({
        title: "Attendance Marked!",
        description: "Your attendance has been successfully recorded.",
        variant: "default",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Attendance Failed",
        description: error.message || "Failed to mark attendance. Please try again.",
        variant: "destructive",
      });
    },
  });
};

export const useProximitySimulation = () => {
  const [proximityDistance, setProximityDistance] = useState(2.3);
  const [selectedRoomId, setSelectedRoomId] = useState("room-a");
  const [isBluetoothEnabled, setIsBluetoothEnabled] = useState(true);

  const isInRange = proximityDistance <= 3.0;
  const canMarkAttendance = isInRange && isBluetoothEnabled;

  const getProximityStatus = () => {
    if (!isBluetoothEnabled) {
      return "Bluetooth is disabled. Please enable Bluetooth to mark attendance.";
    }
    if (isInRange) {
      return "You are in proximity of the building.";
    }
    return "You are too far from the beacon.";
  };

  const getStatusClass = () => {
    if (!isBluetoothEnabled) return "text-red-600 font-medium";
    return isInRange ? "attendance-status-in-range" : "attendance-status-out-of-range";
  };

  return {
    proximityDistance,
    setProximityDistance,
    selectedRoomId,
    setSelectedRoomId,
    isBluetoothEnabled,
    setIsBluetoothEnabled,
    isInRange,
    canMarkAttendance,
    getProximityStatus,
    getStatusClass,
  };
};
