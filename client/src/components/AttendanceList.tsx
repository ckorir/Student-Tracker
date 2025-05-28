import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { authApi } from "@/lib/auth";

interface Room {
  id: string;
  name: string;
  isActive: boolean | null;
}

export function AttendanceList() {
  const [selectedRoom, setSelectedRoom] = useState<string>("");
  const [status, setStatus] = useState("present");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch available rooms
  const { data: rooms } = useQuery({
    queryKey: ["rooms"],
    queryFn: () => authApi.getRooms(),
  });

  // Mark attendance mutation
  const markAttendance = useMutation({
    mutationFn: () => authApi.markAttendance({ roomId: selectedRoom, status }),
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Attendance marked successfully",
      });
      // Invalidate and refetch the rooms query to refresh the data
      queryClient.invalidateQueries({ queryKey: ["rooms"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to mark attendance",
        variant: "destructive",
      });
    },
  });

  const handleMarkAttendance = () => {
    if (!selectedRoom) {
      toast({
        title: "Error",
        description: "Please select a room",
        variant: "destructive",
      });
      return;
    }

    markAttendance.mutate();
  };

  if (!rooms) return <div>Loading...</div>;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Mark Attendance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <Label>Room</Label>
              <select
                value={selectedRoom}
                onChange={(e) => setSelectedRoom(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="">Select a room</option>
                {rooms.map((room) => (
                  <option key={room.id} value={room.id}>
                    {room.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label>Status</Label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="present">Present</option>
                <option value="late">Late</option>
                <option value="absent">Absent</option>
              </select>
            </div>
            <Button onClick={handleMarkAttendance} disabled={markAttendance.isPending}>
              {markAttendance.isPending ? "Marking..." : "Mark Attendance"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
