import { useQuery } from '@tanstack/react-query';
import api from '@/services/api';

/**
 * Standard query keys for caching
 * Using array format allows React Query to automatically deduplicate requests
 */
export const queryKeys = {
  all: ['data'] as const,
  users: () => [...queryKeys.all, 'users'] as const,
  students: () => [...queryKeys.all, 'students'] as const,
  instructors: () => [...queryKeys.all, 'instructors'] as const,
  courses: () => [...queryKeys.all, 'courses'] as const,
  bookings: () => [...queryKeys.all, 'bookings'] as const,
  rooms: () => [...queryKeys.all, 'rooms'] as const,
  schedules: () => [...queryKeys.all, 'schedules'] as const,
  dashboard: () => [...queryKeys.all, 'dashboard'] as const,
  availabilitySlots: () => [...queryKeys.all, 'availabilitySlots'] as const,
};

/**
 * Fetch users - reusable across all pages
 */
export function useUsers(page?: number, limit?: number) {
  return useQuery({
    queryKey: page ? [...queryKeys.users(), page, limit] : queryKeys.users(),
    queryFn: async () => {
      const url = page ? `/api/admin/users?page=${page}&limit=${limit}` : '/api/admin/users';
      const res = await api.get(url);
      const raw = res.data.data || [];
      
      // Handle paginated response
      if (raw && !Array.isArray(raw) && raw.users) {
           return { data: raw.users, total: raw.total || 0 };
      }
      
      // Handle array response (fallback/non-paginated)
      const list = Array.isArray(raw) ? raw : [];
      return { data: list, total: list.length };
    },
  });
}

/**
 * Fetch students - reusable across all pages
 */
export function useStudents(page = 1, limit = 10) {
  return useQuery({
    queryKey: [...queryKeys.students(), page, limit],
    queryFn: async () => {
      const res = await api.get(`/api/admin/students?page=${page}&limit=${limit}`);
      const raw = res.data.data;
      // Check for total at multiple levels including pagination object
      const totalFromRoot = res.data.total;
      const totalFromPagination = raw?.pagination?.total;
      
      if (raw && !Array.isArray(raw) && raw.students) {
        return { data: raw.students, total: totalFromPagination || raw.total || totalFromRoot || 0 };
      }
      
      const list = Array.isArray(raw) ? raw : [];
      return { data: list, total: totalFromPagination || totalFromRoot || list.length };
    },
  });
}

/**
 * Fetch one student by ID
 */
export function useStudent(id: string | null | undefined) {
  return useQuery({
    queryKey: [...queryKeys.students(), id],
    queryFn: async () => {
      if (!id) return null;
      const res = await api.get(`/api/admin/students/${id}`);
      return res.data.data;
    },
    enabled: !!id,
  });
}

/**
 * Fetch instructors - reusable across all pages
 * Updated to use /api/admin/instructor endpoint as per documentation
 */
export function useInstructors(page = 1, limit = 10) {
  return useQuery({
    queryKey: [...queryKeys.instructors(), page, limit],
    queryFn: async () => {
      const res = await api.get(`/api/admin/instructor?page=${page}&limit=${limit}`);
      const raw = res.data.data;
      // Check for total at multiple levels including pagination object
      const totalFromRoot = res.data.total;
      const totalFromPagination = raw?.pagination?.total;

      // Handle nested instructors object: { data: { instructors: [], pagination: { total: N } } }
      if (raw && !Array.isArray(raw) && raw.instructors) {
        return { data: raw.instructors, total: totalFromPagination || raw.total || totalFromRoot || 0 };
      }

      // Handle direct array response
      const list = Array.isArray(raw) ? raw : (Array.isArray(res.data) ? res.data : []);
      return { data: list, total: totalFromPagination || totalFromRoot || list.length };
    },
  });
}

/**
 * Fetch courses - reusable across all pages
 */
export function useCourses(page?: number, limit?: number) {
  return useQuery({
    queryKey: page ? [...queryKeys.courses(), page, limit] : queryKeys.courses(),
    queryFn: async () => {
      const url = page ? `/api/admin/courses?page=${page}&limit=${limit}` : '/api/admin/courses';
      const res = await api.get(url);
      const raw = res.data.data;

      // Handle paginated response
      if (raw && !Array.isArray(raw) && raw.courses) {
        return { data: raw.courses, total: raw.total || 0 };
      }

      // Handle array response (fallback/non-paginated)
      const list = Array.isArray(raw) ? raw : [];
      return { data: list, total: list.length };
    },
  });
}

/**
 * Fetch bookings - reusable across all pages
 */
export function useBookings(page = 1, limit = 10) {
  return useQuery({
    queryKey: [...queryKeys.bookings(), page, limit],
    queryFn: async () => {
      const res = await api.get(`/api/admin/bookings?page=${page}&limit=${limit}`);
      const raw = res.data.data;
      // Check for total at multiple levels including pagination object
      const totalFromRoot = res.data.total;
      const totalFromPagination = raw?.pagination?.total;

      // Handle nested bookings object: { data: { bookings: [], pagination: { total: N } } }
      if (raw && !Array.isArray(raw) && raw.bookings) {
        return { data: raw.bookings, total: totalFromPagination || raw.total || totalFromRoot || 0 };
      }

      const list = Array.isArray(raw) ? raw : [];
      return { data: list, total: totalFromPagination || totalFromRoot || list.length };
    },
  });
}

/**
 * Fetch ALL bookings for reporting/export
 */
export function useAllBookings() {
  return useQuery({
    queryKey: [...queryKeys.bookings(), 'all'],
    queryFn: async () => {
      const limit = 1000;
      const res = await api.get(`/api/admin/bookings?page=1&limit=${limit}`);
      console.log('useAllBookings RAW RES:', res);
      const raw = res.data.data;
      console.log('useAllBookings RAW DATA:', raw);
      
      let allBookings: any[] = [];
      
      if (raw && !Array.isArray(raw) && raw.bookings) {
        allBookings = raw.bookings;
      } else if (Array.isArray(raw)) {
        allBookings = raw;
      }
      console.log('useAllBookings FINAL:', allBookings);
      
      return allBookings;
    },
  });
}

/**
 * Fetch rooms - reusable across all pages
 */
export function useRooms(page?: number, limit?: number) {
  return useQuery({
    queryKey: page ? [...queryKeys.rooms(), page, limit] : queryKeys.rooms(),
    queryFn: async () => {
      const url = page ? `/api/admin/rooms?page=${page}&limit=${limit}` : '/api/admin/rooms';
      const res = await api.get(url);
      const raw = res.data.data;
      // Check for total at multiple levels
      const totalFromRoot = res.data.total;

      // Handle paginated response
      if (raw && !Array.isArray(raw) && raw.rooms) {
        return { data: raw.rooms, total: raw.total || totalFromRoot || 0 };
      }

      // Handle array response (fallback/non-paginated)
      const list = Array.isArray(raw) ? raw : [];
      return { data: list, total: totalFromRoot || list.length };
    },
  });
}

/**
 * Fetch schedules - reusable across all pages
 */
export function useSchedules(page = 1, limit = 10) {
  return useQuery({
    queryKey: [...queryKeys.schedules(), page, limit],
    queryFn: async () => {
      const res = await api.get(`/api/admin/schedules?page=${page}&limit=${limit}`);
      const raw = res.data.data;

      if (raw && !Array.isArray(raw) && (raw.schedules || raw.data)) {
        return { data: raw.schedules || raw.data, total: raw.total || 0 };
      }

      const list = Array.isArray(raw) ? raw : [];
      return { data: list, total: list.length };
    },
  });
}

/**
 * Fetch ALL schedules for dropdowns/lookups
 */
export function useAllSchedules() {
  return useQuery({
    queryKey: [...queryKeys.schedules(), 'all'],
    queryFn: async () => {
      // Use a large limit to get all schedules
      const res = await api.get(`/api/admin/schedules?page=1&limit=1000`);
      const raw = res.data.data;

      if (raw && !Array.isArray(raw) && (raw.schedules || raw.data)) {
        return { data: raw.schedules || raw.data, total: raw.total || 0 };
      }

      const list = Array.isArray(raw) ? raw : [];
      return { data: list, total: list.length };
    },
  });
}

/**
 * Fetch dashboard data
 */
export function useDashboard() {
  return useQuery({
    queryKey: queryKeys.dashboard(),
    queryFn: async () => {
      const res = await api.get('/api/admin/dashboard');
      return res.data.data;
    },
  });
}

/**
 * Fetch availability slots with enrollment data
 * Uses /api/booking/availability/find-slots?include_all=true
 * Returns slots with current_enrollments, pending_count, confirmed_count, etc.
 */
export function useAvailabilitySlots(courseId?: string, instructorId?: string) {
  return useQuery({
    queryKey: [...queryKeys.availabilitySlots(), courseId, instructorId],
    queryFn: async () => {
      let url = '/api/booking/availability/find-slots?include_all=true';
      if (courseId) url += `&course_id=${courseId}`;
      if (instructorId) url += `&instructor_id=${instructorId}`;
      
      const res = await api.get(url);
      const data = res.data.data;
      
      return {
        slots: data?.slots || [],
        meta: res.data.meta || {},
      };
    },
  });
}
