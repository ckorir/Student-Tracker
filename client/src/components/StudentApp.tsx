import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Bluetooth, CheckCircle, History, BarChart3, LogOut, AlertTriangle, Clock } from "lucide-react";
import { useMyAttendance, useRooms, useMarkAttendance, useProximitySimulation } from "@/hooks/use-attendance";
import { User } from "@/lib/auth";
import { cn } from "@/lib/utils";

interface StudentAppProps {
  user: User;
  onLogout: () => void;
}

export function StudentApp({ user, onLogout }: StudentAppProps) {
  const { data: rooms = [] } = useRooms();
  const { data: attendanceHistory = [] } = useMyAttendance();
  const markAttendanceMutation = useMarkAttendance();
  
  const {
    proximityDistance,
    setProximityDistance,
    selectedRoomId,
    setSelectedRoomId,
    isBluetoothEnabled,
    isInRange,
    canMarkAttendance,
    getProximityStatus,
    getStatusClass,
  } = useProximitySimulation();

  const [activeTab, setActiveTab] = useState<"attendance" | "history">("attendance");
  const [lastUpdate, setLastUpdate] = useState("Just now");

  useEffect(() => {
    const interval = setInterval(() => {
      setLastUpdate("Just now");
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleMarkAttendance = () => {
    if (!canMarkAttendance) return;
    
    markAttendanceMutation.mutate({
      roomId: selectedRoomId,
      proximity: proximityDistance,
      method: "BLE",
      status: "present",
    });
  };

  const selectedRoom = rooms.find(room => room.id === selectedRoomId);

  const formatAttendanceDate = (timestamp: string) => {
    const date = new Date(timestamp);
    return {
      date: date.toLocaleDateString("en-US", { 
        month: "short", 
        day: "numeric", 
        year: "numeric" 
      }),
      time: date.toLocaleTimeString("en-US", { 
        hour: "numeric", 
        minute: "2-digit", 
        hour12: true 
      }),
    };
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "present":
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case "late":
        return <Clock className="w-4 h-4 text-amber-600" />;
      default:
        return <AlertTriangle className="w-4 h-4 text-red-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "present":
        return "bg-green-100 text-green-800";
      case "late":
        return "bg-amber-100 text-amber-800";
      default:
        return "bg-red-100 text-red-800";
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border px-4 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Attendance</h1>
            <p className="text-sm text-muted-foreground">{user.name} - {user.username}</p>
          </div>
          <div className="flex items-center space-x-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={onLogout}
              className="text-muted-foreground hover:text-destructive"
            >
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="px-4 py-6 pb-24">
        {activeTab === "attendance" && (
          <>
            {/* Bluetooth Status */}
            <Card className="mb-6">
              <CardContent className="p-4">
                <div className="flex items-center space-x-3">
                  <div className={cn(
                    "w-8 h-8 bg-primary rounded-full flex items-center justify-center",
                    isBluetoothEnabled && "bluetooth-connected"
                  )}>
                    <Bluetooth className="w-4 h-4 text-primary-foreground" />
                  </div>
                  <span className="text-primary font-medium">
                    {isBluetoothEnabled ? "Bluetooth is enabled" : "Bluetooth is disabled"}
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Proximity Simulation Controls */}
            <Card className="mb-6">
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold text-foreground mb-4">BLE Proximity Simulation</h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">Room Selection</label>
                    <Select value={selectedRoomId} onValueChange={setSelectedRoomId}>
                      <SelectTrigger className="h-12">
                        <SelectValue placeholder="Select a room" />
                      </SelectTrigger>
                      <SelectContent>
                        {rooms.map((room) => (
                          <SelectItem key={room.id} value={room.id}>
                            {room.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">Distance from Beacon</label>
                    <Slider
                      value={[proximityDistance]}
                      onValueChange={(value) => setProximityDistance(value[0])}
                      min={0}
                      max={10}
                      step={0.1}
                      className="w-full"
                    />
                    <div className="flex justify-between text-xs text-muted-foreground mt-1">
                      <span>0m (In range)</span>
                      <span>{proximityDistance.toFixed(1)}m</span>
                      <span>10m+ (Out of range)</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Attendance Action */}
            <div className="text-center mb-8">
              <div className="relative inline-block">
                <div className="w-48 h-48 bg-muted rounded-full flex items-center justify-center proximity-pulse mb-4">
                  <Button
                    onClick={handleMarkAttendance}
                    disabled={!canMarkAttendance || markAttendanceMutation.isPending}
                    className={cn(
                      "w-40 h-40 rounded-full flex flex-col items-center justify-center text-center bg-primary text-primary-foreground transition-all duration-300 ease-in-out",
                      "shadow-lg hover:shadow-xl hover:scale-105 transform-gpu",
                      "disabled:opacity-70 disabled:cursor-not-allowed disabled:scale-95",
                      markAttendanceMutation.isPending && "animate-pulse"
                    )}
                  >
                    <div className="space-y-2">
                      <span className="text-xl font-bold tracking-wide">Mark <br />Attendance</span>
                    </div>
                  </Button>
                </div>
              </div>
              
              <div className="text-center">
                <p className={getStatusClass()}>
                  {getProximityStatus()}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  Last updated: {lastUpdate}
                </p>
              </div>
            </div>

            {/* Recent Activity */}
            <Card>
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold text-foreground mb-4">Recent Activity</h3>
                
                <div className="space-y-3">
                  {attendanceHistory.length === 0 ? (
                    <div className="text-center py-8">
                      <p className="text-muted-foreground">No attendance records yet</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        Mark your first attendance to see it here
                      </p>
                    </div>
                  ) : (
                    attendanceHistory.slice(0, 5).map((record) => {
                      const { date, time } = formatAttendanceDate(record.timestamp);
                      const room = rooms.find(r => r.id === record.roomId);
                      
                      return (
                        <div key={record.id} className="flex items-center justify-between p-4 bg-muted rounded-xl">
                          <div className="flex items-center space-x-3">
                            <div className={cn(
                              "w-8 h-8 rounded-full flex items-center justify-center",
                              getStatusColor(record.status)
                            )}>
                              {getStatusIcon(record.status)}
                            </div>
                            <div>
                              <p className="font-medium text-foreground">{date}</p>
                              <p className="text-sm text-muted-foreground">
                                {record.status === "present" ? "Marked" : record.status} - {room?.name || "Unknown Room"}
                              </p>
                            </div>
                          </div>
                          <span className="text-xs text-muted-foreground">{time}</span>
                        </div>
                      );
                    })
                  )}
                </div>
              </CardContent>
            </Card>
          </>
        )}

        {activeTab === "history" && (
          <Card>
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold text-foreground mb-4">Attendance History</h3>
              
              <div className="space-y-3">
                {attendanceHistory.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground">No attendance history available</p>
                  </div>
                ) : (
                  attendanceHistory.map((record) => {
                    const { date, time } = formatAttendanceDate(record.timestamp);
                    const room = rooms.find(r => r.id === record.roomId);
                    
                    return (
                      <div key={record.id} className="border border-border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center space-x-2">
                            {getStatusIcon(record.status)}
                            <Badge className={getStatusColor(record.status)}>
                              {record.status}
                            </Badge>
                          </div>
                          <span className="text-sm text-muted-foreground">{date} at {time}</span>
                        </div>
                        <p className="font-medium text-foreground">{room?.name || "Unknown Room"}</p>
                        <p className="text-sm text-muted-foreground">
                          Method: {record.method} • Proximity: {record.proximity.toFixed(1)}m
                        </p>
                      </div>
                    );
                  })
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border px-4 py-2">
        <div className="flex justify-center space-x-8">
          <Button
            variant="ghost"
            onClick={() => setActiveTab("attendance")}
            className={cn(
              "flex flex-col items-center py-2 px-4",
              activeTab === "attendance" ? "text-primary" : "text-muted-foreground"
            )}
          >
            <CheckCircle className="w-6 h-6 mb-1" />
            <span className="text-xs font-medium">Attendance</span>
          </Button>
          <Button
            variant="ghost"
            onClick={() => setActiveTab("history")}
            className={cn(
              "flex flex-col items-center py-2 px-4",
              activeTab === "history" ? "text-primary" : "text-muted-foreground"
            )}
          >
            <History className="w-6 h-6 mb-1" />
            <span className="text-xs font-medium">History</span>
          </Button>
        </div>
      </nav>
    </div>
  );
}
