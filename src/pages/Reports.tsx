import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '@/services/api';
import { supabase } from '@/lib/supabase';
import { useAllBookings, useStudents, useCourses, useInstructors } from '@/hooks/useQueries';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RefreshCw, Download, Activity, DollarSign, Users, CalendarDays, FileSpreadsheet } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { TableSkeleton } from '@/components/TableSkeleton';
import { DashboardSkeleton } from '@/components/DashboardSkeleton';

interface ActivityLog {
  id: string;
  action: string;
  entity_type: string;
  entity_id: string;
  user_id: string;
  user_email?: string;
  description?: string;
  timestamp: string;
  created_at: string;
}

interface RevenueReport {
  period: string;
  total_revenue: number;
  booking_count: number;
  course_revenue: number;
  average_per_booking: number;
}

// We will derive these stats client-side now
interface DashboardStats {
  total_bookings: number;
  total_revenue: number;
  total_courses: number;
  total_students: number;
  active_instructors: number;
  pending_bookings: number;
  completed_bookings: number;
  cancelled_bookings: number;
}

export default function ReportsPage() {
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [reportType, setReportType] = useState<'activity' | 'revenue' | 'summary'>('summary');
  const [isExporting, setIsExporting] = useState(false);
  const { toast } = useToast();

  // Fetch activity logs
  const { 
    data: activityLogs, 
    isLoading: isLoadingLogs, 
    refetch: refetchLogs 
  } = useQuery({
    queryKey: ['activity-logs', dateFrom, dateTo],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (dateFrom) params.append('from', dateFrom);
      if (dateTo) params.append('to', dateTo);
      const response = await api.get(`/api/admin/activity-logs?${params.toString()}`);
      return response.data as ActivityLog[];
    },
    enabled: reportType === 'activity',
  });

  // Fetch all data for client-side aggregation
  const { 
    data: allBookings, 
    isLoading: isLoadingBookings, 
    refetch: refetchBookings 
  } = useAllBookings();

  const { data: studentsData, isLoading: isLoadingStudents } = useStudents(1, 1000); // Fetch enough for count or rely on total
  const { data: coursesData, isLoading: isLoadingCourses } = useCourses(1, 1000);
  const { data: instructorsData, isLoading: isLoadingInstructors } = useInstructors(1, 1000);

  // LOGGING FOR DEBUGGING
  if (allBookings) {
      console.log('Reports - All Bookings:', allBookings);
      console.log('Reports - Sample Booking:', allBookings[0]);
  }

  // Calculate Dashboard Stats Client-Side
  const statsData: DashboardStats | null = useMemo(() => {
    if (!allBookings || !studentsData || !coursesData || !instructorsData) return null;

    let filteredBookings = allBookings;
    
    // Apply date filters if set
    if (dateFrom || dateTo) {
      filteredBookings = allBookings.filter((booking: any) => {
        const bookingDate = new Date(booking.created_at);
        if (dateFrom && bookingDate < new Date(dateFrom)) return false;
        if (dateTo) {
          const toDate = new Date(dateTo);
          toDate.setHours(23, 59, 59);
          if (bookingDate > toDate) return false;
        }
        return true;
      });
    }

    const totalRevenue = filteredBookings.reduce((sum: number, booking: any) => {
       if (booking.status === 'confirmed' || booking.status === 'completed') {
           const price = Number(booking.price || booking.courses?.price || 0);
           return sum + price;
       }
       return sum;
    }, 0);

    return {
      total_bookings: filteredBookings.length,
      total_revenue: totalRevenue,
      // For entities like students/courses, we usually display the TOTAL in the system, 
      // not filtered by date, unless specifically requested. Keeping it simple:
      total_students: studentsData.total || 0, 
      total_courses: coursesData.total || 0,
      active_instructors: instructorsData.total || 0,
      
      pending_bookings: filteredBookings.filter((b: any) => b.status === 'pending').length,
      completed_bookings: filteredBookings.filter((b: any) => b.status === 'completed').length,
      cancelled_bookings: filteredBookings.filter((b: any) => b.status === 'cancelled').length,
    };
  }, [allBookings, studentsData, coursesData, instructorsData, dateFrom, dateTo]);


  // Aggregate revenue data from bookings
  const revenueData = useMemo(() => {
    if (!allBookings) return [];

    const monthlyData: { [key: string]: RevenueReport } = {};

    allBookings.forEach((booking: any) => {
      // Filter by date range if set
      const bookingDate = new Date(booking.created_at);
      if (dateFrom && bookingDate < new Date(dateFrom)) return;
      if (dateTo) {
        const toDate = new Date(dateTo);
        toDate.setHours(23, 59, 59); // include the end of the day
        if (bookingDate > toDate) return;
      }

      // Consider confirmed and completed bookings for revenue
      if (booking.status !== 'confirmed' && booking.status !== 'completed') return;

      const monthYear = bookingDate.toLocaleString('default', { month: 'long', year: 'numeric' });

      if (!monthlyData[monthYear]) {
        monthlyData[monthYear] = {
          period: monthYear,
          total_revenue: 0,
          booking_count: 0,
          course_revenue: 0,
          average_per_booking: 0
        };
      }

      // Determine price - prioritize booking price, fallback to course price
      const price = Number(booking.price || booking.courses?.price || 0);

      monthlyData[monthYear].total_revenue += price;
      monthlyData[monthYear].booking_count += 1;
      monthlyData[monthYear].course_revenue += price;
    });

    // Calculate averages and convert to array
    return Object.values(monthlyData).map(report => ({
      ...report,
      average_per_booking: report.booking_count > 0 ? report.total_revenue / report.booking_count : 0
    })).sort((a, b) => new Date(b.period).getTime() - new Date(a.period).getTime());
  }, [allBookings, dateFrom, dateTo]);

  const handleRefresh = () => {
    refetchBookings();
    if (reportType === 'activity') {
      refetchLogs();
    }
    toast({ title: "Refreshed", description: "Report data has been refreshed" });
  };

  const handleExport = async () => {
    setIsExporting(true);
    try {
      if ((reportType === 'revenue' || reportType === 'summary') && allBookings && allBookings.length > 0) {
        // Generate CSV from client-side data to avoid schema/relationship issues
        // and ensure consistency with what's displayed
        
        // Define headers
        const headers = [
          'Booking ID',
          'Date',
          'Status',
          'Price',
          'User Name',
          'User Email',
          'Course Title'
        ];

        // Map data to CSV rows
        const checkValue = (val: any) => val || '-';
        
        const rows = allBookings.map((booking: any) => {
           const date = new Date(booking.created_at).toLocaleDateString();
           const price = booking.price || booking.courses?.price || 0;
           return [
             checkValue(booking.id),
             checkValue(date),
             checkValue(booking.status),
             price,
             checkValue(booking.applicant_full_name || booking.users?.full_name),
             checkValue(booking.applicant_email || booking.users?.email),
             checkValue(booking.courses?.title)
           ].map(field => `"${String(field).replace(/"/g, '""')}"`).join(','); // Escape quotes
        });

        const csvContent = [headers.join(','), ...rows].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `bookings_export_${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        toast({ title: "Exported", description: "Bookings data exported as CSV" });
      } else {
        // Fallback or empty data handling
        if (reportType === 'activity' && activityLogs) {
             const blob = new Blob([JSON.stringify(activityLogs, null, 2)], { type: 'application/json' });
             const url = URL.createObjectURL(blob);
             const a = document.createElement('a');
             a.href = url;
             a.download = `activity-logs-${new Date().toISOString().split('T')[0]}.json`;
             document.body.appendChild(a);
             a.click();
             document.body.removeChild(a);
             URL.revokeObjectURL(url);
             toast({ title: "Exported", description: "Activity logs exported as JSON" });
        } else if (!allBookings || allBookings.length === 0) {
            toast({ variant: "destructive", title: "Export Failed", description: "No data available to export" });
        }
      }
    } catch (error: any) {
      console.error('Export error:', error);
      toast({ 
        variant: "destructive", 
        title: "Export Failed", 
        description: error.message || "Failed to export data" 
      });
    } finally {
      setIsExporting(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const getActionBadgeVariant = (action: string) => {
    switch (action.toLowerCase()) {
      case 'create':
        return 'default';
      case 'update':
        return 'secondary';
      case 'delete':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  // Determine button text and icon
  const getExportButtonContent = () => {
      if (isExporting) {
          return <><RefreshCw className="mr-2 h-4 w-4 animate-spin" /> Exporting...</>;
      }
      if (reportType === 'activity') {
          return <><Download className="mr-2 h-4 w-4" /> Export JSON</>;
      }
      return <><FileSpreadsheet className="mr-2 h-4 w-4" /> Export CSV</>;
  };

  const isLoading = isLoadingLogs || isLoadingBookings || isLoadingStudents || isLoadingCourses || isLoadingInstructors;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold tracking-tight">Reports & Monitoring</h2>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleRefresh} disabled={isLoading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button variant="outline" onClick={handleExport} disabled={isExporting}>
            {getExportButtonContent()}
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Report Filters</CardTitle>
          <CardDescription>Select report type and date range</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Report Type</label>
              <Select value={reportType} onValueChange={(value: 'activity' | 'revenue' | 'summary') => setReportType(value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select report type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="summary">Dashboard Summary</SelectItem>
                  <SelectItem value="activity">Activity Logs</SelectItem>
                  <SelectItem value="revenue">Revenue Report</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">From Date</label>
              <Input 
                type="date" 
                value={dateFrom} 
                onChange={(e) => setDateFrom(e.target.value)} 
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">To Date</label>
              <Input 
                type="date" 
                value={dateTo} 
                onChange={(e) => setDateTo(e.target.value)} 
              />
            </div>
            <div className="flex items-end">
              <Button onClick={handleRefresh} disabled={isLoading}>
                Apply Filters
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Report */}
      {reportType === 'summary' && (
        <div className="space-y-4">
          {isLoading ? (
            <DashboardSkeleton />
          ) : statsData ? (
            <>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {formatCurrency(statsData.total_revenue || 0)}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      From {statsData.total_bookings || 0} bookings
                    </p>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Students</CardTitle>
                    <Users className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{statsData.total_students || 0}</div>
                    <p className="text-xs text-muted-foreground">
                      Active learners
                    </p>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Active Instructors</CardTitle>
                    <Activity className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{statsData.active_instructors || 0}</div>
                    <p className="text-xs text-muted-foreground">
                      Teaching courses
                    </p>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Courses</CardTitle>
                    <CalendarDays className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{statsData.total_courses || 0}</div>
                    <p className="text-xs text-muted-foreground">
                      Available courses
                    </p>
                  </CardContent>
                </Card>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm font-medium">Pending Bookings</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-yellow-600">
                      {statsData.pending_bookings || 0}
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm font-medium">Completed Bookings</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-green-600">
                      {statsData.completed_bookings || 0}
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm font-medium">Cancelled Bookings</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-red-600">
                      {statsData.cancelled_bookings || 0}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </>
          ) : (
            <Card>
              <CardContent className="py-8 text-center text-gray-500">
                No summary data available.
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Activity Logs */}
      {reportType === 'activity' && (
        <Card>
          <CardHeader>
            <CardTitle>Activity Logs</CardTitle>
            <CardDescription>Recent admin activities in the system</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingLogs ? (
              <TableSkeleton columnCount={6} rowCount={5} />
            ) : activityLogs && activityLogs.length > 0 ? (
              <div className="border rounded-md">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Timestamp</TableHead>
                      <TableHead>Action</TableHead>
                      <TableHead>Entity Type</TableHead>
                      <TableHead>Entity ID</TableHead>
                      <TableHead>User</TableHead>
                      <TableHead>Description</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {activityLogs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell className="text-sm">
                          {new Date(log.timestamp || log.created_at).toLocaleString()}
                        </TableCell>
                        <TableCell>
                          <Badge variant={getActionBadgeVariant(log.action)}>
                            {log.action}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-medium">{log.entity_type}</TableCell>
                        <TableCell className="text-xs font-mono">
                          {log.entity_id?.substring(0, 8)}...
                        </TableCell>
                        <TableCell className="text-sm">
                          {log.user_email || log.user_id?.substring(0, 8) || '-'}
                        </TableCell>
                        <TableCell className="text-sm text-gray-600 max-w-xs truncate">
                          {log.description || '-'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                No activity logs found.
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Revenue Report */}
      {reportType === 'revenue' && (
        <Card>
          <CardHeader>
            <CardTitle>Revenue Report</CardTitle>
            <CardDescription>Revenue breakdown by period (from Bookings)</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingBookings ? (
              <TableSkeleton columnCount={5} rowCount={5} />
            ) : revenueData && revenueData.length > 0 ? (
              <div className="border rounded-md">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Period</TableHead>
                      <TableHead className="text-right">Total Revenue</TableHead>
                      <TableHead className="text-right">Booking Count</TableHead>
                      <TableHead className="text-right">Course Revenue</TableHead>
                      <TableHead className="text-right">Avg per Booking</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {revenueData.map((report, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium">{report.period}</TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(report.total_revenue)}
                        </TableCell>
                        <TableCell className="text-right">{report.booking_count}</TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(report.course_revenue)}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(report.average_per_booking)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                No revenue data found based on confirmed bookings.
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
