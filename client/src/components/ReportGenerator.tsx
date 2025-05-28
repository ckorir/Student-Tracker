import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Download, Calendar as CalendarIcon, FileText, BarChart3 } from "lucide-react";
import { useRooms } from "@/hooks/use-attendance";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

interface ReportGeneratorProps {
  onClose: () => void;
}

export function ReportGenerator({ onClose }: ReportGeneratorProps) {
  const [reportType, setReportType] = useState<"daily" | "weekly" | "monthly" | "custom">("daily");
  const [selectedRooms, setSelectedRooms] = useState<string[]>([]);
  const [startDate, setStartDate] = useState<Date>(new Date());
  const [endDate, setEndDate] = useState<Date>(new Date());
  const [exportFormat, setExportFormat] = useState<"csv" | "pdf" | "excel">("csv");
  const [includeAbsent, setIncludeAbsent] = useState(true);
  const [includeStats, setIncludeStats] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);

  const { data: rooms = [] } = useRooms();
  const { toast } = useToast();

  const handleRoomToggle = (roomId: string, checked: boolean) => {
    if (checked) {
      setSelectedRooms(prev => [...prev, roomId]);
    } else {
      setSelectedRooms(prev => prev.filter(id => id !== roomId));
    }
  };

  const getDateRange = () => {
    const today = new Date();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay());
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);

    switch (reportType) {
      case "daily":
        return { start: today, end: today };
      case "weekly":
        return { start: startOfWeek, end: endOfWeek };
      case "monthly":
        return { start: startOfMonth, end: endOfMonth };
      default:
        return { start: startDate, end: endDate };
    }
  };

  const generateReport = async () => {
    if (selectedRooms.length === 0) {
      toast({
        title: "No Rooms Selected",
        description: "Please select at least one room for the report.",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);

    try {
      const { start, end } = getDateRange();
      
      const reportData = {
        reportType,
        roomIds: selectedRooms,
        startDate: start.toISOString(),
        endDate: end.toISOString(),
        format: exportFormat,
        includeAbsent,
        includeStats,
      };

      const response = await apiRequest("POST", "/api/reports/generate", reportData);
      const blob = await response.blob();
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.style.display = "none";
      a.href = url;
      
      const filename = `attendance_report_${format(start, 'yyyy-MM-dd')}_to_${format(end, 'yyyy-MM-dd')}.${exportFormat}`;
      a.download = filename;
      
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: "Report Generated",
        description: `Attendance report has been downloaded successfully.`,
      });

      onClose();
    } catch (error) {
      console.error("Report generation error:", error);
      toast({
        title: "Report Generation Failed",
        description: "Failed to generate the attendance report. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const selectAllRooms = () => {
    setSelectedRooms(rooms.map(room => room.id));
  };

  const clearAllRooms = () => {
    setSelectedRooms([]);
  };

  return (
    <div className="min-h-screen bg-background/95 backdrop-blur-sm fixed inset-0 z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Generate Attendance Report
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Create comprehensive attendance reports with customizable options
          </p>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Report Type */}
          <div>
            <Label className="text-base font-medium">Report Period</Label>
            <Select value={reportType} onValueChange={(value: any) => setReportType(value)}>
              <SelectTrigger className="mt-2">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">Daily (Today)</SelectItem>
                <SelectItem value="weekly">Weekly (This Week)</SelectItem>
                <SelectItem value="monthly">Monthly (This Month)</SelectItem>
                <SelectItem value="custom">Custom Date Range</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Custom Date Range */}
          {reportType === "custom" && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Start Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal mt-2",
                        !startDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {startDate ? format(startDate, "PPP") : <span>Pick a date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={startDate}
                      onSelect={(date) => date && setStartDate(date)}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
              
              <div>
                <Label>End Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal mt-2",
                        !endDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {endDate ? format(endDate, "PPP") : <span>Pick a date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={endDate}
                      onSelect={(date) => date && setEndDate(date)}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          )}

          {/* Room Selection */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label className="text-base font-medium">Select Rooms</Label>
              <div className="space-x-2">
                <Button variant="ghost" size="sm" onClick={selectAllRooms}>
                  Select All
                </Button>
                <Button variant="ghost" size="sm" onClick={clearAllRooms}>
                  Clear All
                </Button>
              </div>
            </div>
            
            <div className="space-y-2 max-h-40 overflow-y-auto border rounded-md p-3">
              {rooms.map((room) => (
                <div key={room.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={room.id}
                    checked={selectedRooms.includes(room.id)}
                    onCheckedChange={(checked) => handleRoomToggle(room.id, checked as boolean)}
                  />
                  <Label
                    htmlFor={room.id}
                    className="text-sm font-normal cursor-pointer flex-1"
                  >
                    {room.name}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          {/* Format Selection */}
          <div>
            <Label className="text-base font-medium">Export Format</Label>
            <Select value={exportFormat} onValueChange={(value: any) => setExportFormat(value)}>
              <SelectTrigger className="mt-2">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="csv">CSV (Comma Separated Values)</SelectItem>
                <SelectItem value="excel">Excel (.xlsx)</SelectItem>
                <SelectItem value="pdf">PDF Report</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Options */}
          <div>
            <Label className="text-base font-medium mb-3 block">Report Options</Label>
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="include-absent"
                  checked={includeAbsent}
                  onCheckedChange={(checked) => setIncludeAbsent(checked as boolean)}
                />
                <Label htmlFor="include-absent" className="text-sm font-normal">
                  Include absent students in report
                </Label>
              </div>
              
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="include-stats"
                  checked={includeStats}
                  onCheckedChange={(checked) => setIncludeStats(checked as boolean)}
                />
                <Label htmlFor="include-stats" className="text-sm font-normal">
                  Include attendance statistics and summary
                </Label>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3 pt-4">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button 
              onClick={generateReport}
              disabled={isGenerating || selectedRooms.length === 0}
              className="min-w-[120px]"
            >
              {isGenerating ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Generating...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 mr-2" />
                  Generate Report
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}