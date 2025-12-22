import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '@/services/api';
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
import { RefreshCw, Download, Activity, DollarSign, Users, CalendarDays } from 'lucide-react';
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

  // Fetch revenue report
  const { 
    data: revenueData, 
    isLoading: isLoadingRevenue, 
    refetch: refetchRevenue 
  } = useQuery({
    queryKey: ['revenue-report', dateFrom, dateTo],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (dateFrom) params.append('from', dateFrom);
      if (dateTo) params.append('to', dateTo);
      const response = await api.get(`/api/admin/reports/revenue?${params.toString()}`);
      return response.data as RevenueReport[];
    },
    enabled: reportType === 'revenue',
  });

  // Fetch dashboard stats for summary
  const { 
    data: statsData, 
    isLoading: isLoadingStats, 
    refetch: refetchStats 
  } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      const response = await api.get('/api/admin/dashboard');
      return response.data as DashboardStats;
    },
    enabled: reportType === 'summary',
  });

  const handleRefresh = () => {
    if (reportType === 'activity') {
      refetchLogs();
    } else if (reportType === 'revenue') {
      refetchRevenue();
    } else {
      refetchStats();
    }
    toast({ title: "Refreshed", description: "Report data has been refreshed" });
  };

  const handleExport = () => {
    let data: any[] = [];
    let filename = '';

    if (reportType === 'activity' && activityLogs) {
      data = activityLogs;
      filename = `activity-logs-${new Date().toISOString().split('T')[0]}.json`;
    } else if (reportType === 'revenue' && revenueData) {
      data = revenueData;
      filename = `revenue-report-${new Date().toISOString().split('T')[0]}.json`;
    } else if (reportType === 'summary' && statsData) {
      data = [statsData];
      filename = `summary-report-${new Date().toISOString().split('T')[0]}.json`;
    }

    if (data.length > 0) {
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast({ title: "Exported", description: `Report exported as ${filename}` });
    } else {
      toast({ variant: "destructive", title: "Error", description: "No data to export" });
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

  const isLoading = isLoadingLogs || isLoadingRevenue || isLoadingStats;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold tracking-tight">Reports & Monitoring</h2>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleRefresh} disabled={isLoading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button variant="outline" onClick={handleExport}>
            <Download className="mr-2 h-4 w-4" />
            Export
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
          {isLoadingStats ? (
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
                No summary data available. The dashboard stats endpoint may not be configured.
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
                No activity logs found. Activity logs may not be configured or no activities recorded yet.
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
            <CardDescription>Revenue breakdown by period</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingRevenue ? (
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
                No revenue data found. Revenue reports may not be configured or no revenue recorded yet.
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
