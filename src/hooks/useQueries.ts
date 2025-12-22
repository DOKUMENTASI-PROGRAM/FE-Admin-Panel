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
};

/**
 * Fetch users - reusable across all pages
 */
export function useUsers() {
  return useQuery({
    queryKey: queryKeys.users(),
    queryFn: async () => {
      const res = await api.get('/api/admin/users');
      let users = res.data.data || [];
      if (!Array.isArray(users)) {
        users = [];
      }
      return users;
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
      return res.data.data;
    },
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
      const data = res.data.data;
      // Handle different response structures:
      // - If data is an array, return it directly
      // - If data has an 'instructors' property (paginated response), return that array
      // - Otherwise return empty array
      if (Array.isArray(data)) {
        return data;
      }
      if (data && Array.isArray(data.instructors)) {
        return data.instructors;
      }
      return [];
    },
  });
}

/**
 * Fetch courses - reusable across all pages
 */
export function useCourses() {
  return useQuery({
    queryKey: queryKeys.courses(),
    queryFn: async () => {
      const res = await api.get('/api/admin/courses');
      let courses = res.data.data || [];
      if (!Array.isArray(courses)) {
        courses = [];
      }
      return courses;
    },
  });
}

/**
 * Fetch bookings - reusable across all pages
 */
export function useBookings() {
  return useQuery({
    queryKey: queryKeys.bookings(),
    queryFn: async () => {
      const res = await api.get('/api/admin/bookings');
      return res.data.data;
    },
  });
}

/**
 * Fetch rooms - reusable across all pages
 */
export function useRooms() {
  return useQuery({
    queryKey: queryKeys.rooms(),
    queryFn: async () => {
      const res = await api.get('/api/admin/rooms');
      return res.data.data;
    },
  });
}

/**
 * Fetch schedules - reusable across all pages
 */
export function useSchedules() {
  return useQuery({
    queryKey: queryKeys.schedules(),
    queryFn: async () => {
      const res = await api.get('/api/admin/schedules');
      return res.data.data;
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
