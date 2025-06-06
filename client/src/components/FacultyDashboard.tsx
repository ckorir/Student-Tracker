import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Download, UserCheck, UserX, PieChart, RefreshCw, FileText, LogOut, Calendar } from "lucide-react";
import { format } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";
import { useRooms, useRoomAttendance, useAttendanceStats } from "@/hooks/use-attendance";
import { User } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { ReportGenerator } from "./ReportGenerator";
import { cn } from "@/lib/utils";

interface FacultyDashboardProps {
  onLogout: () => void;
  user: User;
}

export function FacultyDashboard({ onLogout, user }: FacultyDashboardProps) {
  const [selectedRoomId, setSelectedRoomId] = useState("room-a");
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showReportGenerator, setShowReportGenerator] = useState(false);

  const { data: rooms = [] } = useRooms();
  const { data: attendanceRecords = [], isLoading: attendanceLoading, refetch: refetchAttendance } = useRoomAttendance(selectedRoomId, selectedDate);
  const { data: stats, isLoading: statsLoading, refetch: refetchStats } = useAttendanceStats(selectedRoomId, selectedDate);
  const { toast } = useToast();

  useEffect(() => {
    // When date changes, refetch data
    refetchAttendance();
    refetchStats();
  }, [selectedDate]);

  const selectedRoom = rooms.find(room => room.id === selectedRoomId);

  const handleExportCSV = () => {
    if (!attendanceRecords.length) {
      toast({
        title: "No Data",
        description: "No attendance records available for export.",
        variant: "destructive",
      });
      return;
    }

    const csvHeaders = "Student ID,Name,Status,Time,Method,Proximity\n";
    const csvData = attendanceRecords.map(record => {
      const timestamp = new Date(record.timestamp).toLocaleString();
      return [
        record.student?.username || "Unknown",
        record.student?.name || "Unknown",
        record.status,
        timestamp,
        record.method,
        `${record.proximity.toFixed(1)}m`
      ].join(",");
    }).join("\n");

    const csvContent = csvHeaders + csvData;
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.style.display = "none";
    a.href = url;
    a.download = `attendance_${selectedRoom?.name || "room"}_${selectedDate.toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);

    toast({
      title: "Export Successful",
      description: "Attendance report has been downloaded.",
    });
  };

  const handleRefresh = () => {
    refetchAttendance();
    refetchStats();
    toast({
      title: "Refreshed",
      description: "Attendance data has been updated.",
    });
  };

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      present: "bg-green-100 text-green-800 hover:bg-green-100",
      late: "bg-amber-100 text-amber-800 hover:bg-amber-100",
      absent: "bg-red-100 text-red-800 hover:bg-red-100",
    };
    
    return (
      <Badge className={variants[status as keyof typeof variants] || variants.absent}>
        {status}
      </Badge>
    );
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map(word => word[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="bg-primary rounded-full w-8 h-8 flex items-center justify-center">
              <span className="text-primary-foreground font-medium text-sm">
                {getInitials(user.name)}
              </span>
            </div>
            <div>
              <h1 className="text-lg font-semibold">{user.name}</h1>
              <p className="text-sm text-muted-foreground">{user.username}</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowReportGenerator(true)}
            >
              <FileText className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={onLogout}
              className="text-destructive hover:text-destructive/90"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="px-4 py-6 space-y-6">
        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Present</p>
                  <p className="text-2xl font-bold text-green-600">
                    {statsLoading ? "..." : stats?.present || 0}
                  </p>
                </div>
                <UserCheck className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Absent</p>
                  <p className="text-2xl font-bold text-red-500">
                    {statsLoading ? "..." : stats?.absent || 0}
                  </p>
                </div>
                <UserX className="h-8 w-8 text-red-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Attendance Rate</p>
                  <p className="text-2xl font-bold text-primary">
                    {statsLoading ? "..." : stats?.attendanceRate || "0%"}
                  </p>
                </div>
                <PieChart className="h-8 w-8 text-primary" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Room Selection and Controls */}
        <Card>
          <CardContent className="p-6">
            <div className="space-y-4 md:space-y-0">
              <div className="flex flex-col md:flex-col lg:flex-row gap-4">
                <div>
                  <h3 className="text-lg font-semibold text-foreground">Room Monitor</h3>
                  <p className="text-sm text-muted-foreground">Select a room to view live attendance</p>
                </div>
                <div className="flex flex-col md:flex-col lg:flex-row gap-4 w-full">
                  <div className="flex flex-col md:flex-col lg:flex-row gap-2 w-full">
                    <div className="w-full">
                      <input
                        type="date"
                        value={selectedDate.toISOString().split('T')[0]}
                        onChange={(e) => {
                          const date = new Date(e.target.value);
                          setSelectedDate(date);
                          refetchAttendance();
                          refetchStats();
                        }}
                        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      />
                    </div>
                    <div className="w-full">
                      <Select 
                        value={selectedRoomId} 
                        onValueChange={(value) => {
                          setSelectedRoomId(value);
                          refetchAttendance();
                          refetchStats();
                        }}
                      >
                        <SelectTrigger className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50">
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
                  </div>
                  <div className="flex flex-col md:flex-col lg:flex-row gap-2 w-full">
                    <Button
                      variant="outline"
                      onClick={handleRefresh}
                      disabled={attendanceLoading}
                      className="w-full"
                    >
                      <RefreshCw className={cn("h-4 w-4 mr-2", attendanceLoading && "animate-spin")} />
                      Refresh
                    </Button>
                    <Button onClick={handleExportCSV} className="w-full">
                      <Download className="h-4 w-4 mr-2" />
                      Export CSV
                    </Button>
                    <Button 
                      onClick={() => setShowReportGenerator(true)}
                      variant="default"
                      className="w-full"
                    >
                      <FileText className="h-4 w-4 mr-2" />
                      Generate Report
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Live Attendance Table */}
        <Card>
          <CardHeader>
            <CardTitle>
              Live Attendance - {selectedRoom?.name || "Unknown Room"}
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Date: {selectedDate.toLocaleDateString("en-US", { 
                weekday: "long", 
                year: "numeric", 
                month: "long", 
                day: "numeric" 
              })}
            </p>
          </CardHeader>
          <CardContent>
            {attendanceLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : attendanceRecords.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">No attendance records for this room today</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Student</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Time</TableHead>
                      <TableHead>Method</TableHead>
                      <TableHead>Proximity</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {attendanceRecords.map((record) => (
                      <TableRow key={record.id}>
                        <TableCell>
                          <div className="flex items-center space-x-3">
                            <div className="h-10 w-10 rounded-full bg-primary flex items-center justify-center">
                              <span className="text-primary-foreground font-medium text-sm">
                                {getInitials(record.student?.name || "Unknown")}
                              </span>
                            </div>
                            <div>
                              <div className="font-medium text-foreground">
                                {record.student?.name || "Unknown Student"}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                {record.student?.username || "Unknown ID"}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(record.status)}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {formatTime(record.timestamp)}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {record.method}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {record.proximity.toFixed(1)}m
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </main>

      {/* Report Generator Modal */}
      {showReportGenerator && (
        <ReportGenerator onClose={() => setShowReportGenerator(false)} />
      )}
    </div>
    
  );
}
