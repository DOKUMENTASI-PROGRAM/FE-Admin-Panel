import { useState, useEffect, useMemo, useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/services/api';
import { useStudents, useCourses, useBookings, useUsers, useStudent, useAllSchedules, queryKeys } from '@/hooks/useQueries';
import { uploadToStorage } from '@/lib/supabase';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from '@/components/ui/button';
import { Plus, Upload, X, Loader2, Eye, Pencil, Trash2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { TableSkeleton } from '@/components/TableSkeleton';
import { PaginationControls } from '@/components/ui/pagination-controls';

const DAYS_OF_WEEK = [
  { value: 'monday', label: 'Senin' },
  { value: 'tuesday', label: 'Selasa' },
  { value: 'wednesday', label: 'Rabu' },
  { value: 'thursday', label: 'Kamis' },
  { value: 'friday', label: 'Jumat' },
  { value: 'saturday', label: 'Sabtu' },
  { value: 'sunday', label: 'Minggu' },
];

const EXPERIENCE_LEVELS = [
  { value: 'beginner', label: 'Pemula' },
  { value: 'intermediate', label: 'Menengah' },
  { value: 'advanced', label: 'Mahir' },
];

// Schema untuk membuat student baru (POST /api/admin/students)
const createStudentSchema = z.object({
  // Data Dasar Siswa (Wajib)
  display_name: z.string().min(2, "Nama minimal 2 karakter"),
  email: z.string().email("Format email tidak valid"),
  
  // Pilihan Kursus & Jadwal (Wajib)
  course_id: z.string().uuid("Pilih kursus"),
  first_choice_slot_id: z.string().uuid("Pilih jadwal pilihan pertama"),
  second_choice_slot_id: z.string().uuid("Pilih jadwal pilihan kedua"),
  preferred_days: z.array(z.string()).min(1, "Pilih minimal satu hari"),
  preferred_time_range: z.object({
    start: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Format waktu HH:MM"),
    end: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Format waktu HH:MM"),
  }),
  
  // Data Wali/Orang Tua (Wajib)
  guardian_name: z.string().min(2, "Nama wali wajib diisi"),
  guardian_wa_number: z.string().min(10, "Nomor WhatsApp wajib diisi"),
  
  // Data Pribadi Siswa (Wajib)
  applicant_address: z.string().min(5, "Alamat wajib diisi"),
  applicant_birth_place: z.string().min(2, "Tempat lahir wajib diisi"),
  applicant_birth_date: z.string().min(1, "Tanggal lahir wajib diisi"),
  applicant_school: z.string().min(2, "Nama sekolah wajib diisi"),
  applicant_class: z.string().min(1, "Kelas wajib diisi"),
  
  // Data Opsional
  experience_level: z.enum(['beginner', 'intermediate', 'advanced']).default('beginner'),
  notes: z.string().optional(),
  instrument: z.string().optional(),
  level: z.string().optional(),
  has_instrument: z.boolean().default(false),
  photo_url: z.string().url().optional().or(z.literal('')),
  highlight_quote: z.string().optional(),
  can_publish: z.boolean().default(false),
});

// Schema untuk update student (PUT /api/admin/students/:id)
const updateStudentSchema = z.object({
  // Student Data
  display_name: z.string().min(2, "Nama minimal 2 karakter").optional().or(z.literal('')),
  email: z.string().email("Format email tidak valid").optional().or(z.literal('')),
  booking_id: z.string().uuid().optional().or(z.literal('')),
  user_id: z.string().uuid().optional().or(z.literal('')),
  instrument: z.string().optional().or(z.literal('')),
  level: z.string().optional().or(z.literal('')),
  has_instrument: z.boolean().optional(),
  photo_url: z.string().url().optional().or(z.literal('')),
  highlight_quote: z.string().optional().or(z.literal('')),
  can_publish: z.boolean().optional(),
  
  // Booking Data (jika ingin update booking terkait sekaligus)
  course_id: z.string().uuid().optional().or(z.literal('')),
  first_choice_slot_id: z.string().uuid().optional().or(z.literal('')),
  second_choice_slot_id: z.string().uuid().optional().or(z.literal('')),
  preferred_days: z.array(z.string()).optional(),
  // preferred_time_range with HH:MM format validation - form reset ensures valid defaults
  preferred_time_range: z.object({
    start: z.string().regex(/^([01]?\d|2[0-3]):([0-5]\d)$/, "Format waktu HH:MM (contoh: 14:30)"),
    end: z.string().regex(/^([01]?\d|2[0-3]):([0-5]\d)$/, "Format waktu HH:MM (contoh: 14:30)"),
  }).optional(),
  guardian_name: z.string().optional().or(z.literal('')),
  guardian_wa_number: z.string().optional().or(z.literal('')),
  applicant_address: z.string().optional().or(z.literal('')),
  applicant_birth_place: z.string().optional().or(z.literal('')),
  applicant_birth_date: z.string().optional().or(z.literal('')),
  applicant_school: z.string().optional().or(z.literal('')),
  applicant_class: z.string().optional().or(z.literal('')),
  experience_level: z.enum(['beginner', 'intermediate', 'advanced']).optional().or(z.literal('')),
  notes: z.string().optional().or(z.literal('')),
});

export default function StudentsPage() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [selectedCourseId, setSelectedCourseId] = useState<string>("");
  
  // Photo upload states
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [zoomedPhotoUrl, setZoomedPhotoUrl] = useState<string | null>(null);
  const [editPhotoPreview, setEditPhotoPreview] = useState<string | null>(null);
  const [isUploadingEditPhoto, setIsUploadingEditPhoto] = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const editPhotoInputRef = useRef<HTMLInputElement>(null);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Existing hooks
  const { isLoading: isStudentsLoading, error: studentsError, data: studentsData } = useStudents(1, 1000);
  const { data: coursesData } = useCourses();
  const { data: schedulesData } = useAllSchedules();
  
  // New hooks for table data
  // For Students page, we need ALL bookings to filter confirmed ones, so use high limit
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const { data: bookingsData, isLoading: isBookingsLoading, error: bookingsError } = useBookings(1, 1000); // Fetch all bookings
  const { data: usersData } = useUsers();
  const { data: studentDetail, isLoading: isStudentDetailLoading } = useStudent(selectedStudent?.id);

  // Maps for table display
  const fullStudentMap = useMemo(() => {
    const lookup: { [key: string]: any } = {};
    const students = studentsData?.data || [];
    if (Array.isArray(students)) {
      students.forEach((student: any) => {
        if (student) {
           if (student.user_id) lookup[student.user_id] = student;
           if (student.id) lookup[student.id] = student;
           // Also map by booking_id so we can find student from confirmed booking
           if (student.booking_id) lookup[`booking_${student.booking_id}`] = student;
        }
      });
    }
    return lookup;
  }, [studentsData]);

  const studentMap = useMemo(() => {
    const lookup: { [key: string]: any } = {};
    const users = usersData?.data || [];
    users.forEach((user: any) => {
      if (user && user.id) {
        lookup[user.id] = user;
      }
    });
    return lookup;
  }, [usersData]);

  const courseMap = useMemo(() => {
    const lookup: { [key: string]: string } = {};
    const courses = coursesData?.data || coursesData || [];
    if (Array.isArray(courses)) {
      courses.forEach((course: any) => {
        if (course && course.id) {
          lookup[course.id] = course.title || course.name || course.id;
        }
      });
    }
    return lookup;
  }, [coursesData]);

  const slotsMap = useMemo(() => {
    const lookup: { [key: string]: string } = {};
    
    // Helper to normalize time (remove seconds if present)
    const normalizeTime = (time: string | null | undefined): string => {
      if (!time) return '';
      const parts = time.split(':');
      if (parts.length >= 2) {
        return `${parts[0]}:${parts[1]}`;
      }
      return time;
    };
    
    // Helper function to extract time and day from ISO datetime
    const extractTimeInfo = (dateString: string) => {
      try {
        const date = new Date(dateString);
        return date.toLocaleTimeString('en-US', { 
          hour: '2-digit', 
          minute: '2-digit', 
          hour12: false 
        });
      } catch {
        return dateString;
      }
    };

    const extractDayOfWeek = (dateString: string) => {
      try {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', { weekday: 'long' });
      } catch {
        return 'TBD';
      }
    };
    
    // Handle both array and paginated response for schedules
    const schedules = schedulesData?.data || schedulesData || [];
    
    if (Array.isArray(schedules)) {
      schedules.forEach((schedule: any) => {
        // Handle nested slots array structure
        const nestedSlots = schedule.slots || schedule.schedule || schedule.timings;
        if (Array.isArray(nestedSlots)) {
          nestedSlots.forEach((slot: any) => {
            if (slot.id) {
              let slotInfo: string;
              // Check if it's ISO datetime format
              if (slot.start_time && slot.start_time.includes('T')) {
                const dayOfWeek = extractDayOfWeek(slot.start_time);
                const startTime = extractTimeInfo(slot.start_time);
                const endTime = extractTimeInfo(slot.end_time);
                slotInfo = `${dayOfWeek} ${startTime} - ${endTime}`;
              } else {
                // Use start_time_of_day if start_time is null
                const startTime = normalizeTime(slot.start_time_of_day || slot.start_time || slot.start);
                const endTime = normalizeTime(slot.end_time_of_day || slot.end_time || slot.end);
                slotInfo = `${slot.day_of_week || slot.day || 'TBD'} ${startTime} - ${endTime}`;
              }
              lookup[slot.id] = slotInfo;
            }
          });
        }
        
        // Handle flat structure where schedule itself is the slot
        // Check for start_time_of_day (new format) OR start_time (old format)
        const hasNewFormat = schedule.start_time_of_day && schedule.end_time_of_day;
        const hasOldFormat = schedule.start_time && schedule.end_time;
        
        if (schedule.id && (hasNewFormat || hasOldFormat)) {
          let slotInfo: string;
          
          if (hasNewFormat) {
            // New subscription format with start_time_of_day
            const startTime = normalizeTime(schedule.start_time_of_day);
            const endTime = normalizeTime(schedule.end_time_of_day);
            slotInfo = `${schedule.day_of_week || 'TBD'} ${startTime} - ${endTime}`;
          } else if (schedule.start_time.includes('T')) {
            // Old ISO datetime format
            const dayOfWeek = extractDayOfWeek(schedule.start_time);
            const startTime = extractTimeInfo(schedule.start_time);
            const endTime = extractTimeInfo(schedule.end_time);
            slotInfo = `${dayOfWeek} ${startTime} - ${endTime}`;
          } else {
            // Old simple time format
            slotInfo = `${schedule.day_of_week || 'TBD'} ${schedule.start_time} - ${schedule.end_time}`;
          }
          lookup[schedule.id] = slotInfo;
        }
      });
    }
    return lookup;
  }, [schedulesData]);

  // Filter confirmed bookings
  // Note: useBookings hook already normalizes response to { data: [...], total: N }
  const confirmedBookings = useMemo(() => {
    const bookings = bookingsData?.data || [];
    return Array.isArray(bookings) 
      ? bookings.filter((b: any) => b.status?.toLowerCase() === 'confirmed')
      : [];
  }, [bookingsData]);

  // Helper to get slot text
  const getSlotText = (slotId: string, prefText?: any) => {
    if (slotId && slotsMap[slotId]) return slotsMap[slotId];
    
    if (prefText && typeof prefText === 'object') {
       const day = prefText.day || prefText.day_of_week || 'TBD';
       const start = prefText.start_time || prefText.start || '';
       const end = prefText.end_time || prefText.end || '';
       return `${day} ${start} - ${end}`;
    }

    if (prefText && typeof prefText === 'string') return prefText;
    return '-';
  };

  // Build slots map based on selected course
  const availableSlots = useMemo(() => {
    if (!selectedCourseId || !schedulesData?.data || schedulesData.data.length === 0) {
      return [];
    }

    const extractTimeInfo = (dateString: string) => {
      try {
        const date = new Date(dateString);
        return date.toLocaleTimeString('id-ID', { 
          hour: '2-digit', 
          minute: '2-digit', 
          hour12: false 
        });
      } catch {
        return dateString;
      }
    };

    const extractDayOfWeek = (dateString: string) => {
      try {
        const date = new Date(dateString);
        return date.toLocaleDateString('id-ID', { weekday: 'long' });
      } catch {
        return 'TBD';
      }
    };

    const courseSchedules = schedulesData?.data
      ? schedulesData.data.filter((schedule: any) => schedule.course_id === selectedCourseId)
      : [];

    const slots: any[] = [];
    
    courseSchedules.forEach((schedule: any) => {
      const nestedSlots = schedule.slots || schedule.schedule || schedule.timings;
      let slotsToProcess: any[] = [];
      
      if (Array.isArray(nestedSlots)) {
        slotsToProcess = nestedSlots;
      } else if (schedule.start_time && schedule.end_time) {
        slotsToProcess = [schedule];
      }

      slotsToProcess.forEach((slot: any) => {
        try {
          let slotId, dayOfWeek, startTime, endTime;

          if (slot.day_of_week) {
            slotId = slot.id || `${schedule.id}-${slot.day_of_week}-${slot.start_time}`;
            dayOfWeek = slot.day_of_week || slot.day || 'TBD';
            startTime = slot.start_time || slot.start || '00:00';
            endTime = slot.end_time || slot.end || '00:00';
          } else if (slot.start_time && slot.end_time && (slot.start_time.includes('T') || slot.start_time.includes(':'))) {
            slotId = slot.id || `${schedule.id}-${slot.start_time}-${slot.end_time}`;
            dayOfWeek = extractDayOfWeek(slot.start_time);
            startTime = extractTimeInfo(slot.start_time);
            endTime = extractTimeInfo(slot.end_time);
          } else {
            slotId = slot.id || `${schedule.id}-slot`;
            dayOfWeek = 'TBD';
            startTime = slot.start_time || slot.start || '00:00';
            endTime = slot.end_time || slot.end || '00:00';
          }

          slots.push({
            id: slotId,
            schedule_id: schedule.id,
            label: `${dayOfWeek} ${startTime} - ${endTime}`,
          });
        } catch (err) {
          console.error('Error processing slot:', slot, err);
        }
      });
    });

    return slots;
  }, [selectedCourseId, schedulesData]);

  const createForm = useForm<z.infer<typeof createStudentSchema>>({
    resolver: zodResolver(createStudentSchema),
    defaultValues: {
      display_name: "",
      email: "",
      course_id: "",
      first_choice_slot_id: "",
      second_choice_slot_id: "",
      preferred_days: [],
      preferred_time_range: {
        start: "09:00",
        end: "17:00",
      },
      guardian_name: "",
      guardian_wa_number: "",
      applicant_address: "",
      applicant_birth_place: "",
      applicant_birth_date: "",
      applicant_school: "",
      applicant_class: "",
      experience_level: "beginner",
      notes: "",
      instrument: "",
      level: "",
      has_instrument: false,
      photo_url: "",
      highlight_quote: "",
      can_publish: false,
    },
  });

  const editForm = useForm<z.infer<typeof updateStudentSchema>>({
    resolver: zodResolver(updateStudentSchema),
    defaultValues: {
      display_name: "",
      email: "",
    },
  });

  // Reset edit form when selected student changes
  useEffect(() => {
    if (selectedStudent) {
      // Helper to validate time format HH:MM
      const isValidTimeFormat = (time: any): boolean => {
        if (!time || typeof time !== 'string') return false;
        return /^([01]?\d|2[0-3]):([0-5]\d)$/.test(time);
      };
      
      // Get valid preferred_time_range or use defaults
      const getPreferredTimeRange = () => {
        const ptr = selectedStudent.preferred_time_range;
        if (ptr && isValidTimeFormat(ptr.start) && isValidTimeFormat(ptr.end)) {
          return ptr;
        }
        return { start: "09:00", end: "17:00" };
      };
      
      editForm.reset({
        display_name: selectedStudent.display_name || selectedStudent.full_name || "",
        email: selectedStudent.email || "",
        course_id: selectedStudent.course_id || "",
        first_choice_slot_id: selectedStudent.first_choice_slot_id || "",
        second_choice_slot_id: selectedStudent.second_choice_slot_id || "",
        preferred_days: selectedStudent.preferred_days || [],
        preferred_time_range: getPreferredTimeRange(),
        guardian_name: selectedStudent.guardian_name || "",
        guardian_wa_number: selectedStudent.guardian_wa_number || "",
        applicant_address: selectedStudent.applicant_address || "",
        applicant_birth_place: selectedStudent.applicant_birth_place || "",
        applicant_birth_date: selectedStudent.applicant_birth_date || "",
        applicant_school: selectedStudent.applicant_school || "",
        applicant_class: selectedStudent.applicant_class?.toString() || "",
        experience_level: selectedStudent.experience_level || "beginner",
        notes: selectedStudent.notes || "",
        instrument: selectedStudent.instrument || "",
        level: selectedStudent.level || "",
        has_instrument: selectedStudent.has_instrument || false,
        photo_url: selectedStudent.photo_url || "",
        highlight_quote: selectedStudent.highlight_quote || "",
        can_publish: selectedStudent.can_publish || false,
      });
      if (selectedStudent.course_id) {
        setSelectedCourseId(selectedStudent.course_id);
      }
      // Reset photo preview - show existing photo if available
      setEditPhotoPreview(null);
    }
  }, [selectedStudent, editForm]);

  // Watch course_id changes in create form
  const watchedCourseId = createForm.watch("course_id");
  useEffect(() => {
    if (watchedCourseId) {
      setSelectedCourseId(watchedCourseId);
      // Reset slot selections when course changes
      createForm.setValue("first_choice_slot_id", "");
      createForm.setValue("second_choice_slot_id", "");
    }
  }, [watchedCourseId, createForm]);

  const createMutation = useMutation({
    mutationFn: (newStudent: z.infer<typeof createStudentSchema>) => {
      return api.post('/api/admin/students', newStudent);
    },
    onSuccess: (response) => {
      // Invalidate both students and bookings queries to refresh the table
      queryClient.invalidateQueries({ queryKey: queryKeys.students() });
      queryClient.invalidateQueries({ queryKey: queryKeys.bookings() });
      setIsCreateOpen(false);
      createForm.reset();
      setSelectedCourseId("");
      setPhotoPreview(null);
      const message = response.data?.meta?.message || "Student and booking created successfully";
      toast({ title: "Success", description: message });
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.error?.message 
        || error.response?.data?.message 
        || "Failed to create student";
      toast({ 
        variant: "destructive", 
        title: "Error", 
        description: errorMessage 
      });
    },
  });

  // Update student - PUT /api/admin/students/:id
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: z.infer<typeof updateStudentSchema> }) => {
      return api.put(`/api/admin/students/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.students() });
      setIsEditOpen(false);
      setSelectedStudent(null);
      editForm.reset();
      setEditPhotoPreview(null);
      toast({ title: "Success", description: "Student updated successfully" });
    },
    onError: (error: any) => {
      toast({ 
        variant: "destructive", 
        title: "Error", 
        description: error.response?.data?.message || "Failed to update student" 
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => {
      return api.delete(`/api/admin/students/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.students() });
      setIsDeleteOpen(false);
      setSelectedStudent(null);
      toast({ title: "Success", description: "Student deleted successfully" });
    },
    onError: (error: any) => {
      toast({ 
        variant: "destructive", 
        title: "Error", 
        description: error.response?.data?.message || "Failed to delete student" 
      });
    },
  });

  function onCreateSubmit(values: z.infer<typeof createStudentSchema>) {
    createMutation.mutate(values);
  }

  function onEditSubmit(values: z.infer<typeof updateStudentSchema>) {
    if (selectedStudent) {
      // Filter out empty optional fields
      const filteredData = Object.fromEntries(
        Object.entries(values).filter(([, v]) => v !== "" && v !== undefined)
      );
      updateMutation.mutate({ id: selectedStudent.id, data: filteredData });
    }
  }

  // Photo upload handlers
  const handlePhotoSelect = async (event: React.ChangeEvent<HTMLInputElement>, isEdit: boolean = false) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Format file tidak didukung. Gunakan JPEG, PNG, WebP, atau GIF."
      });
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Ukuran file maksimal 5MB."
      });
      return;
    }

    // Show preview
    const reader = new FileReader();
    reader.onload = (e) => {
      if (isEdit) {
        setEditPhotoPreview(e.target?.result as string);
      } else {
        setPhotoPreview(e.target?.result as string);
      }
    };
    reader.readAsDataURL(file);

    // Upload to Supabase
    try {
      if (isEdit) {
        setIsUploadingEditPhoto(true);
      } else {
        setIsUploadingPhoto(true);
      }

      const photoUrl = await uploadToStorage(file);

      if (isEdit) {
        editForm.setValue('photo_url', photoUrl);
      } else {
        createForm.setValue('photo_url', photoUrl);
      }

      toast({
        title: "Berhasil",
        description: "Foto berhasil diupload."
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Gagal mengupload foto."
      });
      // Reset preview on error
      if (isEdit) {
        setEditPhotoPreview(null);
      } else {
        setPhotoPreview(null);
      }
    } finally {
      if (isEdit) {
        setIsUploadingEditPhoto(false);
      } else {
        setIsUploadingPhoto(false);
      }
    }
  };

  const handleRemovePhoto = (isEdit: boolean = false) => {
    if (isEdit) {
      setEditPhotoPreview(null);
      editForm.setValue('photo_url', '');
      if (editPhotoInputRef.current) {
        editPhotoInputRef.current.value = '';
      }
    } else {
      setPhotoPreview(null);
      createForm.setValue('photo_url', '');
      if (photoInputRef.current) {
        photoInputRef.current.value = '';
      }
    }
  };

  if (isStudentsLoading || isBookingsLoading) return <TableSkeleton columnCount={6} rowCount={10} />;
  if (studentsError || bookingsError) return <div className="p-4 text-red-500">Error loading data</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold tracking-tight">Students</h2>
        <Dialog open={isCreateOpen} onOpenChange={(open) => {
          setIsCreateOpen(open);
          if (!open) {
            createForm.reset();
            setSelectedCourseId("");
            setPhotoPreview(null);
            if (photoInputRef.current) {
              photoInputRef.current.value = '';
            }
          }
        }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" /> Add Student
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add Student</DialogTitle>
              <DialogDescription>
                Tambah siswa baru dengan booking otomatis.
              </DialogDescription>
            </DialogHeader>
            <Form {...createForm}>
              <form onSubmit={createForm.handleSubmit(onCreateSubmit)} className="space-y-6">
                {/* Section 1: Data Dasar Siswa */}
                <div className="space-y-4">
                  <h3 className="font-semibold text-lg border-b pb-2">Data Dasar Siswa</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={createForm.control}
                      name="display_name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nama Lengkap *</FormLabel>
                          <FormControl>
                            <Input placeholder="John Doe" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={createForm.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email *</FormLabel>
                          <FormControl>
                            <Input placeholder="student@example.com" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                {/* Section 2: Pilihan Kursus & Jadwal */}
                <div className="space-y-4">
                  <h3 className="font-semibold text-lg border-b pb-2">Pilihan Kursus & Jadwal</h3>
                  <FormField
                    control={createForm.control}
                    name="course_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Kursus *</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Pilih kursus" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {Array.isArray(coursesData) && coursesData.map((course: any) => (
                              <SelectItem key={course.id} value={course.id}>
                                {course.title || course.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={createForm.control}
                      name="first_choice_slot_id"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Pilihan Jadwal 1 *</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value} disabled={!selectedCourseId}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder={selectedCourseId ? "Pilih jadwal" : "Pilih kursus dulu"} />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {availableSlots.map((slot: any) => (
                                <SelectItem key={slot.id} value={slot.id}>
                                  {slot.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={createForm.control}
                      name="second_choice_slot_id"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Pilihan Jadwal 2 *</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value} disabled={!selectedCourseId}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder={selectedCourseId ? "Pilih jadwal" : "Pilih kursus dulu"} />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {availableSlots.map((slot: any) => (
                                <SelectItem key={slot.id} value={slot.id}>
                                  {slot.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <FormField
                    control={createForm.control}
                    name="preferred_days"
                    render={() => (
                      <FormItem>
                        <FormLabel>Hari yang Diinginkan *</FormLabel>
                        <div className="grid grid-cols-4 gap-2">
                          {DAYS_OF_WEEK.map((day) => (
                            <FormField
                              key={day.value}
                              control={createForm.control}
                              name="preferred_days"
                              render={({ field }) => (
                                <FormItem className="flex items-center space-x-2 space-y-0">
                                  <FormControl>
                                    <Checkbox
                                      checked={field.value?.includes(day.value)}
                                      onCheckedChange={(checked) => {
                                        const current = field.value || [];
                                        if (checked) {
                                          field.onChange([...current, day.value]);
                                        } else {
                                          field.onChange(current.filter((v: string) => v !== day.value));
                                        }
                                      }}
                                    />
                                  </FormControl>
                                  <Label className="text-sm font-normal">{day.label}</Label>
                                </FormItem>
                              )}
                            />
                          ))}
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={createForm.control}
                      name="preferred_time_range.start"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Waktu Mulai *</FormLabel>
                          <FormControl>
                            <Input type="time" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={createForm.control}
                      name="preferred_time_range.end"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Waktu Selesai *</FormLabel>
                          <FormControl>
                            <Input type="time" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                {/* Section 3: Data Wali/Orang Tua */}
                <div className="space-y-4">
                  <h3 className="font-semibold text-lg border-b pb-2">Data Wali/Orang Tua</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={createForm.control}
                      name="guardian_name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nama Wali *</FormLabel>
                          <FormControl>
                            <Input placeholder="Nama orang tua/wali" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={createForm.control}
                      name="guardian_wa_number"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>No. WhatsApp Wali *</FormLabel>
                          <FormControl>
                            <Input placeholder="08123456789" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                {/* Section 4: Data Pribadi Siswa */}
                <div className="space-y-4">
                  <h3 className="font-semibold text-lg border-b pb-2">Data Pribadi Siswa</h3>
                  <FormField
                    control={createForm.control}
                    name="applicant_address"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Alamat *</FormLabel>
                        <FormControl>
                          <Input placeholder="Alamat lengkap" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={createForm.control}
                      name="applicant_birth_place"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Tempat Lahir *</FormLabel>
                          <FormControl>
                            <Input placeholder="Jakarta" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={createForm.control}
                      name="applicant_birth_date"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Tanggal Lahir *</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={createForm.control}
                      name="applicant_school"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nama Sekolah *</FormLabel>
                          <FormControl>
                            <Input placeholder="SMA Negeri 1" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={createForm.control}
                      name="applicant_class"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Kelas *</FormLabel>
                          <FormControl>
                            <Input placeholder="X IPA 1" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                {/* Section 5: Data Opsional */}
                <div className="space-y-4">
                  <h3 className="font-semibold text-lg border-b pb-2">Data Tambahan (Opsional)</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={createForm.control}
                      name="experience_level"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Level Pengalaman</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Pilih level" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {EXPERIENCE_LEVELS.map((level) => (
                                <SelectItem key={level.value} value={level.value}>
                                  {level.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={createForm.control}
                      name="instrument"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Instrumen</FormLabel>
                          <FormControl>
                            <Input placeholder="Piano, Gitar, dll" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <FormField
                    control={createForm.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Catatan</FormLabel>
                        <FormControl>
                          <Input placeholder="Catatan tambahan..." {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Photo Upload Field */}
                  <FormField
                    control={createForm.control}
                    name="photo_url"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Foto Siswa</FormLabel>
                        <FormControl>
                          <div className="space-y-3">
                            {/* Preview */}
                            {(photoPreview || field.value) && (
                              <div className="relative w-32 h-32">
                                <img
                                  src={photoPreview || field.value}
                                  alt="Preview"
                                  className="w-32 h-32 object-cover rounded-lg border"
                                />
                                <button
                                  type="button"
                                  onClick={() => handleRemovePhoto(false)}
                                  className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                                >
                                  <X className="h-4 w-4" />
                                </button>
                              </div>
                            )}
                            
                            {/* Upload Button */}
                            {!photoPreview && !field.value && (
                              <div className="flex items-center gap-2">
                                <input
                                  ref={photoInputRef}
                                  type="file"
                                  accept="image/jpeg,image/png,image/webp,image/gif"
                                  onChange={(e) => handlePhotoSelect(e, false)}
                                  className="hidden"
                                  id="photo-upload"
                                />
                                <Button
                                  type="button"
                                  variant="outline"
                                  onClick={() => photoInputRef.current?.click()}
                                  disabled={isUploadingPhoto}
                                  className="w-full"
                                >
                                  {isUploadingPhoto ? (
                                    <>
                                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                      Mengupload...
                                    </>
                                  ) : (
                                    <>
                                      <Upload className="mr-2 h-4 w-4" />
                                      Pilih Foto
                                    </>
                                  )}
                                </Button>
                              </div>
                            )}
                            <p className="text-xs text-gray-500">
                              Format: JPEG, PNG, WebP, GIF. Maksimal 5MB.
                            </p>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex gap-6">
                    <FormField
                      control={createForm.control}
                      name="has_instrument"
                      render={({ field }) => (
                        <FormItem className="flex items-center space-x-2 space-y-0">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <Label className="text-sm font-normal">Memiliki instrumen sendiri</Label>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={createForm.control}
                      name="can_publish"
                      render={({ field }) => (
                        <FormItem className="flex items-center space-x-2 space-y-0">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <Label className="text-sm font-normal">Boleh dipublikasikan</Label>
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>
                    Batal
                  </Button>
                  <Button type="submit" disabled={createMutation.isPending}>
                    {createMutation.isPending ? "Menyimpan..." : "Simpan"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>
      
      <div className="border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Photo</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>School</TableHead>
              <TableHead>Course</TableHead>
              <TableHead>Schedules</TableHead>
              <TableHead>Can Publish</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {confirmedBookings.length > 0 ? (
              confirmedBookings.map((booking: any) => (
                <TableRow key={booking.id}>
                  <TableCell>
                    {(fullStudentMap[`booking_${booking.id}`]?.photo_url || fullStudentMap[booking.user_id]?.photo_url || booking.applicant_photo || booking.photo_url || studentMap[booking.user_id]?.photo_url) ? (
                      <img
                        src={fullStudentMap[`booking_${booking.id}`]?.photo_url || fullStudentMap[booking.user_id]?.photo_url || booking.applicant_photo || booking.photo_url || studentMap[booking.user_id]?.photo_url}
                        alt="Student"
                        className="w-10 h-10 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 font-medium">
                        {(booking.applicant_full_name?.[0] || studentMap[booking.user_id]?.full_name?.[0] || booking.user_id?.[0] || '?').toUpperCase()}
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="font-medium">
                    {booking.applicant_full_name || studentMap[booking.user_id]?.full_name || studentMap[booking.user_id]?.name || booking.user_id || '-'}
                  </TableCell>
                  <TableCell>
                    {booking.applicant_email || studentMap[booking.user_id]?.email || '-'}
                  </TableCell>
                  <TableCell>
                    {booking.applicant_school || studentMap[booking.user_id]?.school || '-'}
                  </TableCell>
                  <TableCell>
                    {courseMap[booking.course_id] || booking.course_id}
                  </TableCell>
                  <TableCell>
                    {getSlotText(booking.confirmed_slot_id)}
                  </TableCell>
                  <TableCell>
                    {(fullStudentMap[`booking_${booking.id}`]?.can_publish || fullStudentMap[booking.user_id]?.can_publish) ? (
                      <Badge variant="default" className="bg-green-600 hover:bg-green-700">Yes</Badge>
                    ) : (
                      <Badge variant="secondary">No</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          // Try to find student by booking_id first, then user_id
                          const studentFromBookingId = fullStudentMap[`booking_${booking.id}`];
                          const studentFromUserId = fullStudentMap[booking.user_id];
                          const studentFromUsers = studentMap[booking.user_id];
                          
                          // Prioritize student found by booking_id
                          const studentRecord = studentFromBookingId || studentFromUserId;
                          
                          // Create merged object prioritizing student record but falling back to booking/user data
                          const mergedStudent = {
                             ...studentRecord,
                             // Ensure IDs are set
                             id: studentRecord?.id || booking.user_id,
                             booking_id: booking.id, // Always use current booking id
                             
                             // Merge fields - prioritize student record, fallback to booking/user data
                             display_name: studentRecord?.display_name || studentRecord?.full_name || studentFromUsers?.display_name || studentFromUsers?.full_name || booking.applicant_full_name,
                             full_name: studentRecord?.display_name || studentRecord?.full_name || studentFromUsers?.display_name || studentFromUsers?.full_name || booking.applicant_full_name,
                             email: studentRecord?.email || studentFromUsers?.email || booking.applicant_email,
                             
                             // Guardian Data
                             guardian_name: studentRecord?.guardian_name || booking.guardian_name,
                             guardian_wa_number: studentRecord?.guardian_wa_number || booking.guardian_wa_number,
                             
                             // Personal Data
                             applicant_address: studentRecord?.applicant_address || booking.applicant_address,
                             applicant_birth_place: studentRecord?.applicant_birth_place || booking.applicant_birth_place,
                             applicant_birth_date: studentRecord?.applicant_birth_date || booking.applicant_birth_date,
                             applicant_school: studentRecord?.applicant_school || booking.applicant_school,
                             applicant_class: studentRecord?.applicant_class || booking.applicant_class,
                             
                             // Music Data
                             instrument: studentRecord?.instrument || booking.instrument || 'Piano', // Default if needed
                             level: studentRecord?.level || studentRecord?.experience_level || booking.experience_level,
                             experience_level: studentRecord?.experience_level || booking.experience_level,
                             has_instrument: studentRecord?.has_instrument ?? booking.instrument_owned,
                             
                             // System Data
                             created_at: studentRecord?.created_at || booking.created_at,
                             updated_at: studentRecord?.updated_at || booking.updated_at,
                             notes: studentRecord?.notes || booking.notes,
                             
                             // Photo
                             photo_url: studentRecord?.photo_url || booking.applicant_photo || booking.photo_url,
                             can_publish: studentRecord?.can_publish,
                          };

                          setSelectedStudent(mergedStudent);
                          setIsViewOpen(true);
                        }}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                           // Try to find student by booking_id first, then user_id
                           const studentFromBookingId = fullStudentMap[`booking_${booking.id}`];
                           const studentFromUserId = fullStudentMap[booking.user_id];
                           const studentFromUsers = studentMap[booking.user_id];
                           
                           // Prioritize student found by booking_id
                           const studentRecord = studentFromBookingId || studentFromUserId;
                           
                           if (studentRecord && studentRecord.id) {
                             // Merge student data with booking data for complete form auto-fill
                             // Booking data is used as fallback for fields not in student record
                             setSelectedStudent({
                               ...studentRecord,
                               user_id: booking.user_id,
                               // Merge booking data for fields that might not be in student record
                               display_name: studentRecord.display_name || studentFromUsers?.display_name || studentFromUsers?.full_name || booking.applicant_full_name,
                               email: studentRecord.email || studentFromUsers?.email || booking.applicant_email,
                               course_id: studentRecord.course_id || booking.course_id,
                               first_choice_slot_id: studentRecord.first_choice_slot_id || booking.first_choice_slot_id,
                               second_choice_slot_id: studentRecord.second_choice_slot_id || booking.second_choice_slot_id,
                               preferred_days: studentRecord.preferred_days || booking.preferred_days,
                               preferred_time_range: studentRecord.preferred_time_range || booking.preferred_time_range,
                               guardian_name: studentRecord.guardian_name || booking.guardian_name,
                               guardian_wa_number: studentRecord.guardian_wa_number || booking.guardian_wa_number,
                               applicant_address: studentRecord.applicant_address || booking.applicant_address,
                               applicant_birth_place: studentRecord.applicant_birth_place || booking.applicant_birth_place,
                               applicant_birth_date: studentRecord.applicant_birth_date || booking.applicant_birth_date,
                               applicant_school: studentRecord.applicant_school || booking.applicant_school,
                               applicant_class: studentRecord.applicant_class || booking.applicant_class,
                               experience_level: studentRecord.experience_level || booking.experience_level,
                               notes: studentRecord.notes || booking.notes,
                               photo_url: studentRecord.photo_url || booking.applicant_photo || booking.photo_url,
                             });
                             setIsEditOpen(true);
                           } else {
                             // No student record found - show error message
                             toast({
                               variant: "destructive",
                               title: "Error",
                               description: "Data student tidak ditemukan. Pastikan booking sudah di-confirm dan student record sudah dibuat."
                             });
                           }
                        }}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive"
                        onClick={() => {
                           // Try to find student by booking_id first, then user_id
                           const studentFromBookingId = fullStudentMap[`booking_${booking.id}`];
                           const studentFromUserId = fullStudentMap[booking.user_id];
                           
                           // Prioritize student found by booking_id
                           const studentRecord = studentFromBookingId || studentFromUserId;
                           
                           if (studentRecord && studentRecord.id) {
                             setSelectedStudent(studentRecord);
                             setIsDeleteOpen(true);
                           } else {
                             toast({
                               variant: "destructive",
                               title: "Error",
                               description: "Data student tidak ditemukan. Tidak bisa menghapus."
                             });
                           }
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-4 text-gray-500">
                  No confirmed students found
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
        
        <PaginationControls
          currentPage={page}
          totalCount={confirmedBookings.length}
          limit={limit}
          onPageChange={setPage}
          onLimitChange={setLimit}
          isLoading={isBookingsLoading}
        />
      </div>

      {/* View Student Dialog */}
      <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
        <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detail Siswa</DialogTitle>
          </DialogHeader>
          {selectedStudent && (
            <div className="space-y-6">
              {/* Photo */}
              {selectedStudent.photo_url && (
                <div className="flex justify-center">
                  <img
                    src={selectedStudent.photo_url}
                    alt={selectedStudent.display_name || selectedStudent.full_name || 'Student'}
                    className="w-32 h-32 object-cover rounded-lg border cursor-pointer hover:opacity-90 transition-opacity"
                    onClick={() => setZoomedPhotoUrl(selectedStudent.photo_url)}
                  />
                </div>
              )}

              {/* Data Dasar */}
              <div>
                <h3 className="font-semibold text-lg border-b pb-2 mb-3">Data Dasar</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-500">Nama Lengkap</label>
                    <p className="text-sm">{selectedStudent.display_name || selectedStudent.full_name || '-'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Email</label>
                    <p className="text-sm">{selectedStudent.email || '-'}</p>
                  </div>
                  {/* ID fields hidden as per request */}
                </div>
              </div>

              {/* Data Wali */}
              <div>
                <h3 className="font-semibold text-lg border-b pb-2 mb-3">Data Wali/Orang Tua</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-500">Nama Wali</label>
                    <p className="text-sm">{selectedStudent.guardian_name || '-'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">No. WhatsApp Wali</label>
                    <p className="text-sm">{selectedStudent.guardian_wa_number || '-'}</p>
                  </div>
                </div>
              </div>

              {/* Data Pribadi */}
              <div>
                <h3 className="font-semibold text-lg border-b pb-2 mb-3">Data Pribadi</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="text-sm font-medium text-gray-500">Alamat</label>
                    <p className="text-sm">{selectedStudent.applicant_address || '-'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Tempat Lahir</label>
                    <p className="text-sm">{selectedStudent.applicant_birth_place || '-'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Tanggal Lahir</label>
                    <p className="text-sm">{selectedStudent.applicant_birth_date || '-'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Sekolah</label>
                    <p className="text-sm">{selectedStudent.applicant_school || '-'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Kelas</label>
                    <p className="text-sm">{selectedStudent.applicant_class || '-'}</p>
                  </div>
                </div>
              </div>

              {/* Data Musik */}
              <div>
                <h3 className="font-semibold text-lg border-b pb-2 mb-3">Data Musik</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-500">Instrumen</label>
                    <p className="text-sm">{selectedStudent.instrument || '-'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Level</label>
                    <p className="text-sm">{selectedStudent.level || selectedStudent.experience_level || '-'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Memiliki Instrumen</label>
                    <p className="text-sm">{selectedStudent.has_instrument ? 'Ya' : 'Tidak'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Boleh Dipublikasikan</label>
                    <p className="text-sm">{selectedStudent.can_publish ? 'Ya' : 'Tidak'}</p>
                  </div>
                </div>
              </div>

              {/* Info Waktu */}
              <div>
                <h3 className="font-semibold text-lg border-b pb-2 mb-3">Info Sistem</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-500">Dibuat</label>
                    <p className="text-sm">
                      {(studentDetail?.created_at || selectedStudent.created_at)
                        ? new Date(studentDetail?.created_at || selectedStudent.created_at).toLocaleString('id-ID')
                        : '-'}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Diperbarui</label>
                    <p className="text-sm">
                      {(studentDetail?.updated_at || selectedStudent.updated_at)
                        ? new Date(studentDetail?.updated_at || selectedStudent.updated_at).toLocaleString('id-ID')
                        : '-'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Catatan */}
              {(studentDetail?.notes || selectedStudent.notes) && (
                <div>
                  <h3 className="font-semibold text-lg border-b pb-2 mb-3">Catatan</h3>
                  <p className="text-sm">{studentDetail?.notes || selectedStudent.notes}</p>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsViewOpen(false)}>
              Tutup
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Student Dialog */}
      <Dialog open={isEditOpen} onOpenChange={(open) => {
        setIsEditOpen(open);
        if (!open) {
          editForm.reset();
          setSelectedCourseId("");
          setEditPhotoPreview(null);
          if (editPhotoInputRef.current) {
            editPhotoInputRef.current.value = '';
          }
        }
      }}>
        <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Siswa</DialogTitle>
            <DialogDescription>
              Perbarui informasi siswa. Field yang dikosongkan tidak akan diubah.
            </DialogDescription>
          </DialogHeader>
          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit(onEditSubmit, (errors) => {
              // Log validation errors for debugging
              console.log('Form validation errors:', errors);
              toast({
                variant: "destructive",
                title: "Validation Error",
                description: "Ada kesalahan pada form. Periksa kembali data yang diisi."
              });
            })} className="space-y-6">
              {/* Section 1: Data Dasar Siswa */}
              <div className="space-y-4">
                <h3 className="font-semibold text-lg border-b pb-2">Data Dasar Siswa</h3>
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={editForm.control}
                    name="display_name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nama Lengkap</FormLabel>
                        <FormControl>
                          <Input placeholder="John Doe" {...field} value={field.value || ""} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={editForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input placeholder="student@example.com" {...field} value={field.value || ""} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              {/* Section 2: Data Wali/Orang Tua */}
              <div className="space-y-4">
                <h3 className="font-semibold text-lg border-b pb-2">Data Wali/Orang Tua</h3>
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={editForm.control}
                    name="guardian_name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nama Wali</FormLabel>
                        <FormControl>
                          <Input placeholder="Nama orang tua/wali" {...field} value={field.value || ""} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={editForm.control}
                    name="guardian_wa_number"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>No. WhatsApp Wali</FormLabel>
                        <FormControl>
                          <Input placeholder="08123456789" {...field} value={field.value || ""} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              {/* Section 3: Data Pribadi Siswa */}
              <div className="space-y-4">
                <h3 className="font-semibold text-lg border-b pb-2">Data Pribadi Siswa</h3>
                <FormField
                  control={editForm.control}
                  name="applicant_address"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Alamat</FormLabel>
                      <FormControl>
                        <Input placeholder="Alamat lengkap" {...field} value={field.value || ""} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={editForm.control}
                    name="applicant_birth_place"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tempat Lahir</FormLabel>
                        <FormControl>
                          <Input placeholder="Jakarta" {...field} value={field.value || ""} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={editForm.control}
                    name="applicant_birth_date"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tanggal Lahir</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} value={field.value || ""} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={editForm.control}
                    name="applicant_school"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nama Sekolah</FormLabel>
                        <FormControl>
                          <Input placeholder="SMA Negeri 1" {...field} value={field.value || ""} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={editForm.control}
                    name="applicant_class"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Kelas</FormLabel>
                        <FormControl>
                          <Input placeholder="X IPA 1" {...field} value={field.value || ""} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              {/* Section 4: Data Musik */}
              <div className="space-y-4">
                <h3 className="font-semibold text-lg border-b pb-2">Data Musik (Opsional)</h3>
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={editForm.control}
                    name="experience_level"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Level Pengalaman</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value || ""}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Pilih level" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {EXPERIENCE_LEVELS.map((level) => (
                              <SelectItem key={level.value} value={level.value}>
                                {level.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={editForm.control}
                    name="instrument"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Instrumen</FormLabel>
                        <FormControl>
                          <Input placeholder="Piano, Gitar, dll" {...field} value={field.value || ""} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={editForm.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Catatan</FormLabel>
                      <FormControl>
                        <Input placeholder="Catatan tambahan..." {...field} value={field.value || ""} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Photo Upload Field */}
                <FormField
                  control={editForm.control}
                  name="photo_url"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Foto Siswa</FormLabel>
                      <FormControl>
                        <div className="space-y-3">
                          {/* Preview */}
                          {(editPhotoPreview || field.value) && (
                            <div className="relative w-32 h-32">
                              <img
                                src={editPhotoPreview || field.value}
                                alt="Preview"
                                className="w-32 h-32 object-cover rounded-lg border"
                              />
                              <button
                                type="button"
                                onClick={() => handleRemovePhoto(true)}
                                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                              >
                                <X className="h-4 w-4" />
                              </button>
                            </div>
                          )}
                          
                          {/* Upload Button */}
                          {!editPhotoPreview && !field.value && (
                            <div className="flex items-center gap-2">
                              <input
                                ref={editPhotoInputRef}
                                type="file"
                                accept="image/jpeg,image/png,image/webp,image/gif"
                                onChange={(e) => handlePhotoSelect(e, true)}
                                className="hidden"
                                id="edit-photo-upload"
                              />
                              <Button
                                type="button"
                                variant="outline"
                                onClick={() => editPhotoInputRef.current?.click()}
                                disabled={isUploadingEditPhoto}
                                className="w-full"
                              >
                                {isUploadingEditPhoto ? (
                                  <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Mengupload...
                                  </>
                                ) : (
                                  <>
                                    <Upload className="mr-2 h-4 w-4" />
                                    Pilih Foto
                                  </>
                                )}
                              </Button>
                            </div>
                          )}
                          <p className="text-xs text-gray-500">
                            Format: JPEG, PNG, WebP, GIF. Maksimal 5MB.
                          </p>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex gap-6">
                  <FormField
                    control={editForm.control}
                    name="has_instrument"
                    render={({ field }) => (
                      <FormItem className="flex items-center space-x-2 space-y-0">
                        <FormControl>
                          <Checkbox
                            checked={field.value || false}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <Label className="text-sm font-normal">Memiliki instrumen sendiri</Label>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={editForm.control}
                    name="can_publish"
                    render={({ field }) => (
                      <FormItem className="flex items-center space-x-2 space-y-0">
                        <FormControl>
                          <Checkbox
                            checked={field.value || false}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <Label className="text-sm font-normal">Boleh dipublikasikan</Label>
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsEditOpen(false)}>
                  Batal
                </Button>
                <Button type="submit" disabled={updateMutation.isPending}>
                  {updateMutation.isPending ? "Menyimpan..." : "Simpan Perubahan"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Apakah Anda yakin?</AlertDialogTitle>
            <AlertDialogDescription>
              Tindakan ini akan menghapus siswa "{selectedStudent?.display_name || selectedStudent?.full_name}" secara permanen. 
              Tindakan ini tidak dapat dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (selectedStudent) {
                  deleteMutation.mutate(selectedStudent.id);
                }
              }}
            >
              {deleteMutation.isPending ? "Menghapus..." : "Hapus"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Photo Zoom Dialog */}
      <Dialog open={!!zoomedPhotoUrl} onOpenChange={() => setZoomedPhotoUrl(null)}>
        <DialogContent className="sm:max-w-3xl p-0 overflow-hidden bg-black/90 border-none">
            <div className="relative h-[80vh] w-full flex items-center justify-center p-4">
                {zoomedPhotoUrl && (
                    <img 
                        src={zoomedPhotoUrl} 
                        alt="Zoomed" 
                        className="max-h-full max-w-full object-contain"
                    />
                )}
                <Button
                    className="absolute top-4 right-4 rounded-full bg-white/20 hover:bg-white/40 text-white"
                    variant="ghost"
                    size="icon"
                    onClick={() => setZoomedPhotoUrl(null)}
                >
                    <X className="h-6 w-6" />
                </Button>
            </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
