import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from "@/components/ui/toaster"
import Login from '@/pages/Login'
import Dashboard from '@/pages/Dashboard'
import Layout from '@/components/Layout'
import ProtectedRoute from '@/components/ProtectedRoute'
import StudentsPage from '@/pages/Students'
import StudentsFEPage from '@/pages/StudentsFE'
import CoursesPage from '@/pages/Courses'
import BookingsPage from '@/pages/Bookings'
import InstructorsPage from '@/pages/Instructors'
import RoomsPage from '@/pages/Rooms'
import UsersPage from '@/pages/Users'
import SchedulesPage from '@/pages/Schedules'
import ScheduleDetailsPage from '@/pages/ScheduleDetails'
import ReportsPage from '@/pages/Reports'
import PaymentsPage from '@/pages/Payments'
import { useEffect } from 'react'
import { authService } from '@/services/authService'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 10, // 10 minutes (formerly cacheTime)
      retry: 1,
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
    },
  },
})

function App() {
  useEffect(() => {
    authService.initialize();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <Routes>
          <Route path="/login" element={<Login />} />
          
          <Route element={<ProtectedRoute />}>
          <Route element={<Layout />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/users" element={<UsersPage />} />
            <Route path="/students" element={<StudentsPage />} />
            <Route path="/students-fe" element={<StudentsFEPage />} />
            <Route path="/instructors" element={<InstructorsPage />} />
            <Route path="/rooms" element={<RoomsPage />} />
            <Route path="/courses" element={<CoursesPage />} />
            <Route path="/bookings" element={<BookingsPage />} />
            <Route path="/schedules" element={<SchedulesPage />} />
            <Route path="/schedules/details" element={<ScheduleDetailsPage />} />
            <Route path="/payments" element={<PaymentsPage />} />
            <Route path="/reports" element={<ReportsPage />} />
          </Route>
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
      <Toaster />
    </QueryClientProvider>
  )
}

export default App
