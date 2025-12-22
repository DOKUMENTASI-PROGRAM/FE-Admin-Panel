import { useDashboard, useBookings, useUsers, useCourses } from '@/hooks/useQueries';
import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Users, BookOpen, Calendar, DollarSign, ArrowUpRight, Activity, Plus, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { DashboardSkeleton } from '@/components/DashboardSkeleton';

interface RecentActivityItem {
  id: string;
  title: string;
  description: string;
  time: string;
  status: string;
}

export default function Dashboard() {
  const { data, isLoading, error } = useDashboard();
  const { data: bookingsData } = useBookings();
  const { data: usersData = [] } = useUsers();
  const { data: coursesData = [] } = useCourses();

  const studentMap = useMemo(() => {
    const lookup: { [key: string]: string } = {};
    if (Array.isArray(usersData)) {
      usersData.forEach((user: any) => {
        if (user && user.id) {
          lookup[user.id] = user.full_name || user.name || user.email || user.id;
        }
      });
    }
    return lookup;
  }, [usersData]);

  const courseMap = useMemo(() => {
    const lookup: { [key: string]: string } = {};
    if (Array.isArray(coursesData)) {
      coursesData.forEach((course: any) => {
        if (course && course.id) {
          lookup[course.id] = course.title || course.name || course.id;
        }
      });
    }
    return lookup;
  }, [coursesData]);

  const recentActivity: RecentActivityItem[] = useMemo(() => {
    if (!bookingsData) return [];
    const bookings = Array.isArray(bookingsData) ? bookingsData : (bookingsData.bookings || []);
    
    return bookings
      .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 5)
      .map((booking: any) => {
        const studentName = booking.applicant_full_name || studentMap[booking.user_id] || 'Unknown Student';
        const courseName = courseMap[booking.course_id] || 'Course';
        
        // Calculate time ago
        const date = new Date(booking.created_at);
        const now = new Date();
        const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
        let timeAgo = '';
        
        if (diffInSeconds < 60) timeAgo = 'Just now';
        else if (diffInSeconds < 3600) timeAgo = `${Math.floor(diffInSeconds / 60)} mins ago`;
        else if (diffInSeconds < 86400) timeAgo = `${Math.floor(diffInSeconds / 3600)} hours ago`;
        else timeAgo = date.toLocaleDateString();

        return {
          id: booking.id,
          title: `New booking ${booking.status}`,
          description: `Student ${studentName} booked ${courseName}`,
          time: timeAgo,
          status: booking.status
        };
      });
  }, [bookingsData, studentMap, courseMap]);

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  if (error) {
    return (
      <div className="p-6 bg-red-50 text-red-600 rounded-lg border border-red-100">
        Error loading dashboard data. Please try again later.
      </div>
    );
  }

  const stats = [
    {
      title: "Total Users",
      value: data?.userStats?.totalUsers || 0,
      icon: Users,
      description: "Active users in the system",
      color: "text-blue-600",
      bgColor: "bg-blue-100",
      trend: "+12% from last month"
    },
    {
      title: "Total Courses",
      value: data?.courseStats?.totalCourses || 0,
      icon: BookOpen,
      description: "Available courses",
      color: "text-purple-600",
      bgColor: "bg-purple-100",
      trend: "+4 new courses"
    },
    {
      title: "Total Bookings",
      value: data?.bookingStats?.totalBookings || 0,
      icon: Calendar,
      description: "All time bookings",
      color: "text-green-600",
      bgColor: "bg-green-100",
      trend: "+8% increase"
    },
    {
      title: "Revenue",
      value: new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(data?.revenue || 0),
      icon: DollarSign,
      description: "Total revenue",
      color: "text-orange-600",
      bgColor: "bg-orange-100",
      trend: "+2.5% from last month"
    }
  ];

  const quickActions = [
    { label: "Add New Student", href: "/students", icon: Plus },
    { label: "Create Course", href: "/courses", icon: BookOpen },
    { label: "View Schedule", href: "/schedules", icon: Calendar },
    { label: "Manage Booking", href: "/bookings", icon: Calendar },
  ];

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-gray-900">Dashboard Overview</h2>
          <p className="text-muted-foreground mt-1">Welcome back, here's what's happening with your music school today.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2">
            <Calendar className="h-4 w-4" />
            {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
          </Button>
          <Button className="gap-2">
            <ArrowUpRight className="h-4 w-4" />
            Generate Report
          </Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <Card key={index} className="border-none shadow-md hover:shadow-lg transition-shadow duration-200">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {stat.title}
                </CardTitle>
                <div className={`p-2 rounded-full ${stat.bgColor}`}>
                  <Icon className={`h-4 w-4 ${stat.color}`} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-900">{stat.value}</div>
                <div className="flex items-center text-xs text-muted-foreground mt-1">
                  <span className="text-green-600 font-medium flex items-center mr-1">
                    <ArrowUpRight className="h-3 w-3 mr-0.5" />
                    {stat.trend}
                  </span>
                </div>
                <p className="text-xs text-gray-400 mt-2">
                  {stat.description}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid gap-6 md:grid-cols-7">
        {/* Quick Actions & Recent Activity Placeholder */}
        <Card className="md:col-span-4 border-none shadow-md">
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Frequently used actions for easy access.</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            {quickActions.map((action, i) => (
              <Link key={i} to={action.href}>
                <div className="flex flex-col items-center justify-center p-6 bg-gray-50 hover:bg-primary/5 border border-gray-100 rounded-xl transition-colors cursor-pointer group text-center h-full">
                  <div className="p-3 bg-white rounded-full shadow-sm mb-3 group-hover:scale-110 transition-transform">
                    <action.icon className="h-6 w-6 text-primary" />
                  </div>
                  <span className="font-medium text-gray-900 group-hover:text-primary transition-colors">{action.label}</span>
                </div>
              </Link>
            ))}
          </CardContent>
        </Card>

        <Card className="md:col-span-3 border-none shadow-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary" />
              Recent Activity
            </CardTitle>
            <CardDescription>Latest system events and updates.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentActivity.length > 0 ? (
                recentActivity.map((activity, i) => (
                  <div key={i} className="flex items-start gap-4 pb-4 border-b last:border-0 last:pb-0">
                    <div className="h-2 w-2 mt-2 rounded-full bg-primary" />
                    <div className="space-y-1">
                      <p className="text-sm font-medium leading-none">{activity.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {activity.description}
                      </p>
                      <p className="text-xs text-gray-400">{activity.time}</p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center text-muted-foreground py-4">
                  No recent activity
                </div>
              )}
            </div>
            <Button variant="ghost" className="w-full mt-4 text-primary hover:text-primary/80 hover:bg-primary/5" asChild>
              <Link to="/bookings">
                View All Activity <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
