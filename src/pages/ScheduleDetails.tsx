import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/services/api';
import { useSchedules, useCourses, useInstructors, useRooms, useAvailabilitySlots, queryKeys } from '@/hooks/useQueries';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Edit, Trash, ArrowLeft, Plus, Music, User, MapPin, ChevronDown, ChevronRight } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { TimePicker } from '@/components/ui/time-picker';
import { TableSkeleton } from '@/components/TableSkeleton';

const scheduleSchema = z.object({
  course_id: z.string().min(1, "Kursus wajib diisi"),
  instructor_id: z.string().min(1, "Instruktur wajib diisi"),
  room_id: z.string().min(1, "Ruangan wajib diisi"),
  max_students: z.coerce.number().min(1, "Maksimal siswa minimal 1"),
  schedule: z.array(
    z.object({
      day_of_week: z.string().min(1, "Hari wajib diisi"),
      start_time: z.string().min(1, "Waktu mulai wajib diisi"),
      end_time: z.string().min(1, "Waktu selesai wajib diisi"),
      duration: z.coerce.number().min(1, "Durasi wajib diisi"),
    })
  ).min(1, "Setidaknya satu slot jadwal wajib diisi"),
});

type ScheduleFormValues = z.infer<typeof scheduleSchema>;

const CollapsibleSection = ({ title, children, defaultOpen = false }: { title: string, children: React.ReactNode, defaultOpen?: boolean }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="border rounded-md overflow-hidden bg-card text-card-foreground shadow-sm mb-4">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between w-full p-4 bg-muted/30 hover:bg-muted/50 transition-colors"
      >
        <span className="font-semibold text-lg tracking-tight">{title}</span>
        {isOpen ? <ChevronDown className="h-5 w-5 text-muted-foreground" /> : <ChevronRight className="h-5 w-5 text-muted-foreground" />}
      </button>
      {isOpen && (
        <div className="border-t">
          {children}
        </div>
      )}
    </div>
  );
};

export default function ScheduleDetailsPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const courseId = searchParams.get('courseId');
  const instructorId = searchParams.get('instructorId');
  const roomId = searchParams.get('roomId');

  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState<any>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: schedulesData, isLoading, error } = useSchedules();
  const { data: availabilitySlotsData } = useAvailabilitySlots(courseId || undefined, instructorId || undefined);
  const { data: coursesData } = useCourses();
  const { data: instructorsData } = useInstructors(1, 1000);
  const { data: roomsData } = useRooms();
  
  // Moved up to fix ReferenceError
  const courses = Array.isArray(coursesData) ? coursesData : (coursesData?.data || []);
  const instructors = Array.isArray(instructorsData) ? instructorsData : (instructorsData?.data || []);
  const rooms = Array.isArray(roomsData) ? roomsData : (roomsData?.data || []);

  const days = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];

  const dayMap: { [key: string]: string } = {
    monday: "Senin",
    tuesday: "Selasa",
    wednesday: "Rabu",
    thursday: "Kamis",
    friday: "Jumat",
    saturday: "Sabtu",
    sunday: "Minggu"
  };

  const dayOrder: { [key: string]: number } = {
    monday: 1, tuesday: 2, wednesday: 3, thursday: 4, friday: 5, saturday: 6, sunday: 7
  };

  const timeOptions = [];
  for (let i = 0; i < 24; i++) {
    const hour = i.toString().padStart(2, '0');
    timeOptions.push(`${hour}:00`);
    timeOptions.push(`${hour}:30`);
  }

  const editForm = useForm<ScheduleFormValues>({
    resolver: zodResolver(scheduleSchema),
    defaultValues: {
      course_id: "",
      instructor_id: "",
      room_id: "",
      max_students: 1,
      schedule: [
        { day_of_week: "monday", start_time: "09:00", end_time: "09:30", duration: 30 }
      ],
    },
  });

  const { fields: editFields, append: editAppend, remove: editRemove } = useFieldArray({
    control: editForm.control,
    name: "schedule",
  });

  const addForm = useForm<ScheduleFormValues>({
    resolver: zodResolver(scheduleSchema),
    defaultValues: {
      course_id: "",
      instructor_id: "",
      room_id: "",
      max_students: 1,
      schedule: [
        { day_of_week: "monday", start_time: "09:00", end_time: "09:30", duration: 30 }
      ],
    },
  });

  const { fields: addFields, append: addAppend, remove: addRemove } = useFieldArray({
    control: addForm.control,
    name: "schedule",
  });

  const [editInstrument, setEditInstrument] = useState<string>("");
  const [createInstrument, setCreateInstrument] = useState<string>("");

  useEffect(() => {
    if (selectedSchedule) {
      const course = courses.find((c: any) => c.id === selectedSchedule.course_id);
      if (course && course.instrument) {
        setEditInstrument(course.instrument);
      } else {
        setEditInstrument("");
      }

      // Check if schedule is already an array (grouped/nested) or flat fields
      let scheduleSlots = [
          { day_of_week: "monday", start_time: "09:00", end_time: "09:30", duration: 30 }
      ];

      if (selectedSchedule.schedule && selectedSchedule.schedule.length > 0) {
        scheduleSlots = selectedSchedule.schedule;
      } else if (selectedSchedule.slots && selectedSchedule.slots.length > 0) {
        scheduleSlots = selectedSchedule.slots;
      } else {
         // Fallback for flat fields (legacy or specific API structure)
         // Check for day_of_week OR day
         const day = selectedSchedule.day_of_week || selectedSchedule.day;
         // Check for start_time OR start_time_of_day
         const start = selectedSchedule.start_time || selectedSchedule.start_time_of_day;
         // Check for end_time OR end_time_of_day
         const end = selectedSchedule.end_time || selectedSchedule.end_time_of_day;

         if (day && start && end) {
             scheduleSlots = [{
                day_of_week: day,
                start_time: start.slice(0, 5), // Ensure HH:MM format
                end_time: end.slice(0, 5),     // Ensure HH:MM format
                duration: selectedSchedule.duration || 30 
             }];
         }
      }

      editForm.reset({
        course_id: selectedSchedule.course_id || "",
        instructor_id: selectedSchedule.instructor_id || "",
        room_id: selectedSchedule.room_id || "",
        max_students: selectedSchedule.max_students || 5,
        schedule: scheduleSlots,
      });
    }
  }, [selectedSchedule, editForm]);

  const uniqueInstruments = Array.from(new Set(courses.map((c: any) => c.instrument).filter(Boolean))) as string[];
  
  // Filter Logic for Add Form
  const filteredCreateCourses = courses.filter((c: any) => 
    !createInstrument || (c.instrument && c.instrument === createInstrument)
  );

  const createSelectedCourseId = addForm.watch("course_id");
  const createSelectedCourse = courses.find((c: any) => c.id === createSelectedCourseId);

  const filteredCreateInstructors = instructors.filter((instructor: any) => {
    if (!createSelectedCourse) return false;
    
    // Normalizing strings for comparison
    const courseInstrument = createSelectedCourse.instrument?.toLowerCase();
    const courseType = createSelectedCourse.type_course?.toLowerCase();
    
    if (!courseInstrument || !courseType) return false;

    // Check specialization (array of strings)
    const hasSpecialization = Array.isArray(instructor.specialization) && 
      instructor.specialization.some((s: string) => s.toLowerCase() === courseInstrument);

    // Check teaching_categories (array of strings)
    const hasCategory = Array.isArray(instructor.teaching_categories) && 
      instructor.teaching_categories.some((c: string) => c.toLowerCase() === courseType);

    return hasSpecialization && hasCategory;
  });

  // Filter Logic for Edit Form
  const filteredEditCourses = courses.filter((c: any) => 
    !editInstrument || (c.instrument && c.instrument === editInstrument)
  );

  // Filter rooms by instrument for Add form
  const filteredCreateRooms = rooms.filter((room: any) => {
    if (!createInstrument) return true; // Show all if no instrument selected
    return Array.isArray(room.instruments) && room.instruments.includes(createInstrument);
  });

  // Filter rooms by instrument for Edit form
  const filteredEditRooms = rooms.filter((room: any) => {
    if (!editInstrument) return true; // Show all if no instrument selected
    return Array.isArray(room.instruments) && room.instruments.includes(editInstrument);
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: ScheduleFormValues }) => {
      const payload = {
        ...data,
        schedule: data.schedule.map(({ start_time, end_time, ...rest }: any) => ({
          ...rest,
          start_time_of_day: start_time,
          end_time_of_day: end_time,
        })),
      };
      return api.put(`/api/admin/schedules/${id}`, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["schedules"] });
      setIsEditOpen(false);
      setSelectedSchedule(null);
      editForm.reset();
      toast({ title: "Berhasil", description: "Jadwal berhasil diperbarui" });
    },
    onError: (error: any) => {
      toast({ 
        variant: "destructive", 
        title: "Error", 
        description: error.response?.data?.message || "Gagal memperbarui jadwal" 
      });
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: ScheduleFormValues) => {
      return api.post(`/api/admin/schedules`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.schedules() });
      setIsAddOpen(false);
      
      // Reset logic is handled in handleOpenAdd mostly, but here we can just close
      // or optionally reset to default state if we want next add to be fresh
      // But meaningful resets happen on open based on context.
      
      toast({ title: "Berhasil", description: "Jadwal berhasil dibuat" });
    },
    onError: (error: any) => {
      toast({ 
        variant: "destructive", 
        title: "Error", 
        description: error.response?.data?.message || "Gagal membuat jadwal" 
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => {
      return api.delete(`/api/admin/schedules/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.schedules() });
      setIsDeleteOpen(false);
      setSelectedSchedule(null);
      toast({ title: "Berhasil", description: "Jadwal berhasil dihapus" });
    },
    onError: (error: any) => {
      toast({ 
        variant: "destructive", 
        title: "Error", 
        description: error.response?.data?.message || "Gagal menghapus jadwal" 
      });
    },
  });

  const handleOpenEdit = (schedule: any) => {
    setSelectedSchedule(schedule);
    setIsEditOpen(true);
  };

  const handleOpenDelete = (schedule: any) => {
    setSelectedSchedule(schedule);
    setIsDeleteOpen(true);
  };

  const handleOpenAdd = () => {
    const baseSchedule = filteredSchedules[0] || {};
    // Use query params first, then fallback to first schedule in list if filtered, else empty
    const defaultCourseId = courseId || baseSchedule.course_id || "";
    const defaultInstructorId = instructorId || baseSchedule.instructor_id || "";
    const defaultRoomId = roomId || baseSchedule.room_id || "";

    // Find course to set default instrument
    const selectedCourse = courses.find((c: any) => c.id === defaultCourseId);
    if (selectedCourse && selectedCourse.instrument) {
        setCreateInstrument(selectedCourse.instrument);
    } else {
        setCreateInstrument("");
    }

    addForm.reset({
      course_id: defaultCourseId,
      instructor_id: defaultInstructorId,
      room_id: defaultRoomId,
      max_students: 1,
      schedule: [
        { day_of_week: "monday", start_time: "09:00", end_time: "09:30", duration: 30 }
      ],
    });
    setIsAddOpen(true);
  };

  function onAddSubmit(values: ScheduleFormValues) {
    createMutation.mutate(values);
  }

  function onEditSubmit(values: ScheduleFormValues) {
    if (selectedSchedule) {
      updateMutation.mutate({ id: selectedSchedule.id, data: values });
    }
  }

  const courseMap: { [key: string]: string } = {};
  courses.forEach((course: any) => {
    if (course && course.id) {
      courseMap[course.id] = course.title || course.name || course.id;
    }
  });

  const instructorMap: { [key: string]: string } = {};
  instructors.forEach((instructor: any) => {
    if (instructor) {
      const id = instructor.user_id || instructor.id;
      instructorMap[id] = instructor.full_name || instructor.name || id;
    }
  });

  const roomMap: { [key: string]: string } = {};
  rooms.forEach((room: any) => {
    if (room && room.id) {
      roomMap[room.id] = room.name || room.id;
    }
  });

  if (isLoading) return <TableSkeleton columnCount={6} rowCount={10} />;
  if (error) return <div className="p-4 text-red-500">Error memuat jadwal</div>;

  const allSchedules = Array.isArray(schedulesData) ? schedulesData : (schedulesData?.data || []);
  const availabilitySlots = availabilitySlotsData?.slots || [];

  // Build lookup map for availability slots by schedule_id
  const availabilityMap: { [key: string]: any } = {};
  const busyInstructorMap: { [key: string]: string } = {};

  availabilitySlots.forEach((slot: any) => {
    if (slot.schedule_id) {
      availabilityMap[slot.schedule_id] = slot;
    }
    // Populate busyInstructorMap if slot is booked (active enrollment)
    if ((slot.current_enrollments && slot.current_enrollments > 0) || (slot.confirmed_count && slot.confirmed_count > 0)) {
        const normalizedDay = slot.day_of_week?.toLowerCase();
        const normalizedTime = slot.start_time ? slot.start_time.slice(0, 5) : '';
        const key = `${slot.instructor_id}-${normalizedDay}-${normalizedTime}`;
        busyInstructorMap[key] = slot.room_name;
    }
  });

  // Helpers for checking impacted status
  const getScheduleDay = (item: any) => {
      if (item.schedule && item.schedule.length > 0) return item.schedule[0].day_of_week;
      if (item.slots && item.slots.length > 0) return item.slots[0].day_of_week;
      return item.day_of_week || item.day;
  };

  const getScheduleStartTime = (item: any) => {
      if (item.schedule && item.schedule.length > 0) return item.schedule[0].start_time;
      if (item.slots && item.slots.length > 0) return item.slots[0].start_time;
      return item.start_time || item.start_time_of_day;
  };
  
  // Filter schedules based on query params
  const filteredSchedules = allSchedules.filter((s: any) => {
    const matchCourse = !courseId || courseId === 'undefined' || courseId === 'null' || String(s.course_id) === String(courseId);
    const matchInstructor = !instructorId || instructorId === 'undefined' || instructorId === 'null' || String(s.instructor_id) === String(instructorId);
    const matchRoom = !roomId || roomId === 'undefined' || roomId === 'null' || String(s.room_id) === String(roomId);
    
    return matchCourse && matchInstructor && matchRoom;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-4">
          <Button variant="outline" size="icon" onClick={() => navigate('/schedules')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h2 className="text-3xl font-bold tracking-tight">Detail Jadwal</h2>
        </div>
        <Button onClick={handleOpenAdd}>
          <Plus className="h-4 w-4 mr-2" />
          Tambah Jadwal
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Instrument</CardTitle>
            <Music className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold truncate">
              {(() => {
                  // 1. Try to get from specific filtered Course
                  if (courseId && courseId !== 'undefined' && courseId !== 'null') {
                      const course = courses.find((c: any) => String(c.id) === String(courseId));
                      return course?.instrument || 'Semua Instrument';
                  }

                  // 2. Try to infer from the visible schedules (context)
                  if (filteredSchedules.length > 0) {
                      const firstSchedule = filteredSchedules[0];
                      const course = courses.find((c: any) => c.id === firstSchedule.course_id);
                      if (course?.instrument) {
                          return course.instrument;
                      }
                  }

                  return 'Semua Instrument';
              })()}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Instruktur</CardTitle>
            <User className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold truncate" title={instructorId ? (instructorMap[instructorId] || instructorId) : 'Semua Instruktur'}>
              {instructorId ? (instructorMap[instructorId] || instructorId) : 'Semua Instruktur'}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ruangan</CardTitle>
            <MapPin className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold truncate" title={roomId ? (roomMap[roomId] || roomId) : 'Semua Ruangan'}>
              {roomId ? (roomMap[roomId] || roomId) : 'Semua Ruangan'}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Grouped Schedules View */}
      <div className="space-y-4">
        {Object.entries(
          filteredSchedules.reduce((acc: any, schedule: any) => {
            const course = courses.find((c: any) => c.id === schedule.course_id);
            const type = (course?.type_course || 'Uncategorized').toUpperCase();
            const groupKey = `KURSUS ${type}`;
            
            if (!acc[groupKey]) acc[groupKey] = [];
            acc[groupKey].push(schedule);
            return acc;
          }, {})
        ).map(([groupTitle, schedules]: [string, any], index) => (
          <CollapsibleSection key={index} title={groupTitle} defaultOpen={true}>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[200px]">Hari & Jam</TableHead>
                  <TableHead className="w-[150px]">Ruangan</TableHead>
                  <TableHead className="w-[150px]">Murid / Kapasitas</TableHead>
                  <TableHead className="w-[300px]">Status</TableHead>
                  <TableHead className="text-right w-[200px]">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {schedules.sort((a: any, b: any) => {
                  // Helper to get day and time
                  const getDayTime = (item: any) => {
                    let d = item.day_of_week || item.day || '';
                    let t = item.start_time || item.start_time_of_day || '';
                    
                    if (item.schedule && item.schedule.length > 0) {
                        d = item.schedule[0].day_of_week;
                        t = item.schedule[0].start_time;
                    } else if (item.slots && item.slots.length > 0) {
                        d = item.slots[0].day_of_week;
                        t = item.slots[0].start_time;
                    }
                    return { d: d?.toLowerCase(), t };
                  };

                  const { d: dayA, t: timeA } = getDayTime(a);
                  const { d: dayB, t: timeB } = getDayTime(b);

                  const orderA = dayOrder[dayA] || 8;
                  const orderB = dayOrder[dayB] || 8;

                  if (orderA !== orderB) return orderA - orderB;
                  return timeA.localeCompare(timeB);
                }).map((schedule: any) => {
                  const availability = availabilityMap[schedule.id] || {};
                  const roomName = roomMap[schedule.room_id] || schedule.room_name || '-';
                  
                  // Format Day & Time
                  const slots = schedule.schedule || schedule.slots || [];
                  let timeDisplay;

                  if (slots.length > 0) {
                    timeDisplay = slots.map((slot: any) => 
                      `${dayMap[slot.day_of_week]} ${slot.start_time?.slice(0, 5)} - ${slot.end_time?.slice(0, 5)}`
                    ).join(' | ');
                  } else {
                    const day = schedule.day_of_week 
                      ? dayMap[schedule.day_of_week] 
                      : (schedule.day ? dayMap[schedule.day] : '-');
                    const start = schedule.start_time?.slice(0, 5) || schedule.start_time_of_day?.slice(0, 5) || '-';
                    const end = schedule.end_time?.slice(0, 5) || schedule.end_time_of_day?.slice(0, 5) || '-';
                    timeDisplay = `${day}, ${start} - ${end}`;
                  }

                  // Strict availability data usage
                  const hasAvailabilityData = !!availability;
                  const current = hasAvailabilityData ? (availability.current_enrollments ?? 0) : 0;
                  const max = hasAvailabilityData ? (availability.max_students ?? schedule.max_students ?? '-') : (schedule.max_students ?? '-');
                  const status = hasAvailabilityData ? availability.status : undefined;
                  
                  // Check for impacted status
                  let impactedRoom = null;
                  if (hasAvailabilityData && status !== 'available') {
                      const dayRaw = getScheduleDay(schedule);
                      const timeRaw = getScheduleStartTime(schedule);
                      
                      const normalizedDay = dayRaw ? String(dayRaw).toLowerCase() : '';
                      const normalizedTime = timeRaw ? String(timeRaw).slice(0, 5) : '';
                      
                      const slotKey = `${schedule.instructor_id}-${normalizedDay}-${normalizedTime}`;
                      const busyRoom = busyInstructorMap[slotKey];
                      
                      if (busyRoom && busyRoom !== roomName) {
                          impactedRoom = busyRoom;
                      }
                  }

                  return (
                    <TableRow key={schedule.id}>
                      <TableCell className="font-medium">
                        {timeDisplay}
                      </TableCell>
                      <TableCell>{roomName}</TableCell>
                      <TableCell>
                        <span className={current >= max && max !== '-' ? "text-destructive font-medium" : ""}>
                          {current}
                        </span>
                        <span className="text-muted-foreground"> / {max} Siswa</span>
                      </TableCell>
                      <TableCell>
                         {hasAvailabilityData ? (
                             status === 'available' ? (
                                 <Badge variant="secondary" className="bg-green-100 text-green-800 hover:bg-green-200">Tersedia</Badge>
                             ) : impactedRoom ? (
                                 <Badge variant="secondary" className="bg-amber-100 text-amber-800 hover:bg-amber-200">
                                     Instruktur Terpakai di {impactedRoom}
                                 </Badge>
                             ) : (
                                 <Badge variant="destructive">Penuh</Badge>
                             )
                         ) : (
                             <Badge variant="outline" className="text-muted-foreground">Memuat...</Badge>
                         )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end items-center gap-2">
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => handleOpenEdit(schedule)}
                              className="h-8 px-2 text-amber-600 hover:text-amber-700 hover:bg-amber-50"
                            >
                              <Edit className="h-3.5 w-3.5 mr-1" /> Edit
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => handleOpenDelete(schedule)}
                              className="h-8 px-2 text-destructive hover:text-destructive hover:bg-destructive/10"
                            >
                              <Trash className="h-3.5 w-3.5 mr-1" /> Hapus
                            </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CollapsibleSection>
        ))}
        
        {filteredSchedules.length === 0 && (
          <div className="text-center py-8 text-muted-foreground border rounded-md">
            Tidak ada jadwal yang ditemukan yang sesuai kriteria.
          </div>
        )}
      </div>

      {/* Edit Schedule Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>

        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Jadwal</DialogTitle>
            <DialogDescription>
              Perbarui informasi jadwal.
            </DialogDescription>
          </DialogHeader>
          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-4">
              <div className="space-y-4">
                <FormItem>
                  <FormLabel>Instrumen</FormLabel>
                  <Select 
                    onValueChange={(value) => {
                      setEditInstrument(value);
                      editForm.setValue("course_id", "");
                      editForm.setValue("instructor_id", "");
                      editForm.setValue("room_id", "");
                    }} 
                    value={editInstrument}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Pilih instrumen" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {uniqueInstruments.map((instrument) => (
                        <SelectItem key={instrument} value={instrument}>
                          {instrument}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormItem>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={editForm.control}
                    name="course_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Kursus</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Pilih kursus" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {filteredEditCourses.map((course: any) => (
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
                  
                  {(() => {
                    const selectedCourseId = editForm.watch("course_id");
                    const selectedCourse = courses.find((c: any) => c.id === selectedCourseId);
                    
                    const filteredEditInstructors = instructors.filter((instructor: any) => {
                      if (!selectedCourse) return true; // Show all if no course selected (fallback)
                      
                      const courseInstrument = selectedCourse.instrument?.toLowerCase();
                      const courseType = selectedCourse.type_course?.toLowerCase();
                      
                      if (!courseInstrument || !courseType) return true;

                      const hasSpecialization = Array.isArray(instructor.specialization) && 
                        instructor.specialization.some((s: string) => s.toLowerCase() === courseInstrument);

                      const hasCategory = Array.isArray(instructor.teaching_categories) && 
                        instructor.teaching_categories.some((c: string) => c.toLowerCase() === courseType);

                      return hasSpecialization && hasCategory;
                    });

                    return (
                        <FormField
                          control={editForm.control}
                          name="instructor_id"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Instruktur</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Pilih instruktur" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {filteredEditInstructors.map((instructor: any) => (
                                    <SelectItem 
                                      key={instructor.user_id || instructor.id} 
                                      value={instructor.user_id || instructor.id}
                                    >
                                      {instructor.full_name || instructor.name}
                                    </SelectItem>
                                  ))}
                                  {filteredEditInstructors.length === 0 && (
                                    <div className="p-2 text-sm text-muted-foreground text-center">
                                        Tidak ada instruktur yang cocok ditemukan
                                    </div>
                                  )}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                    );
                })()}

              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={editForm.control}
                  name="room_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Ruangan</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Pilih ruangan" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {filteredEditRooms.map((room: any) => (
                            <SelectItem key={room.id} value={room.id}>
                              {room.name}
                            </SelectItem>
                          ))}
                          {filteredEditRooms.length === 0 && (
                            <div className="p-2 text-sm text-muted-foreground text-center">
                                Tidak ada ruangan yang cocok ditemukan
                            </div>
                          )}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editForm.control}
                  name="max_students"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Maks Siswa</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h4 className="text-sm font-medium">Slot Jadwal</h4>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => editAppend({ day_of_week: "monday", start_time: "09:00", end_time: "09:30", duration: 30 })}
                  >
                    <Plus className="h-4 w-4 mr-2" /> Tambah Slot
                  </Button>
                </div>

                {editFields.map((field, index) => (
                  <div key={field.id} className="grid grid-cols-12 gap-2 items-end border p-2 rounded">
                    <div className="col-span-3">
                      <FormField
                        control={editForm.control}
                        name={`schedule.${index}.day_of_week`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs">Hari</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {days.map((day) => (
                                  <SelectItem key={day} value={day}>
                                    {dayMap[day]}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <div className="col-span-3">
                      <FormField
                        control={editForm.control}
                        name={`schedule.${index}.start_time`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs">Mulai</FormLabel>
                            <FormControl>
                              <TimePicker 
                                value={field.value} 
                                onChange={field.onChange} 
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <div className="col-span-3">
                      <FormField
                        control={editForm.control}
                        name={`schedule.${index}.end_time`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs">Selesai</FormLabel>
                            <FormControl>
                              <TimePicker 
                                value={field.value} 
                                onChange={field.onChange} 
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <div className="col-span-2">
                      <FormField
                        control={editForm.control}
                        name={`schedule.${index}.duration`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs">Durasi</FormLabel>
                            <FormControl>
                              <Input type="number" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <div className="col-span-1">
                      {editFields.length >= 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="text-destructive"
                          onClick={() => editRemove(index)}
                        >
                          <Trash className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
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
              Tindakan ini akan menghapus jadwal ini secara permanen. 
              Tindakan ini tidak dapat dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (selectedSchedule) {
                  deleteMutation.mutate(selectedSchedule.id);
                }
              }}
            >
              {deleteMutation.isPending ? "Menghapus..." : "Hapus"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Add Schedule Dialog */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Tambah Jadwal</DialogTitle>
            <DialogDescription>
              Tambahkan jadwal baru.
            </DialogDescription>
          </DialogHeader>

          <Form {...addForm}>
            <form onSubmit={addForm.handleSubmit(onAddSubmit)} className="space-y-4">
              <div className="space-y-4">
                <FormItem>
                  <FormLabel>Instrumen</FormLabel>
                  <Select 
                    onValueChange={(value) => {
                      setCreateInstrument(value);
                      addForm.setValue("course_id", "");
                      addForm.setValue("instructor_id", "");
                      addForm.setValue("room_id", "");
                    }} 
                    value={createInstrument}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Pilih instrumen" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {uniqueInstruments.map((instrument) => (
                        <SelectItem key={instrument} value={instrument}>
                          {instrument}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormItem>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={addForm.control}
                    name="course_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Kursus</FormLabel>
                        <Select 
                          onValueChange={(val) => {
                            field.onChange(val);
                            addForm.setValue("instructor_id", "");
                          }} 
                          value={field.value}
                          disabled={!createInstrument}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Pilih kursus" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {filteredCreateCourses.map((course: any) => (
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
                  
                  <FormField
                    control={addForm.control}
                    name="instructor_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Instruktur</FormLabel>
                        <Select 
                          onValueChange={field.onChange} 
                          value={field.value}
                          disabled={!createSelectedCourseId}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Pilih instruktur" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {filteredCreateInstructors.map((instructor: any) => (
                              <SelectItem 
                                key={instructor.user_id || instructor.id} 
                                value={instructor.user_id || instructor.id}
                              >
                                {instructor.full_name || instructor.name}
                              </SelectItem>
                            ))}
                            {filteredCreateInstructors.length === 0 && (
                              <div className="p-2 text-sm text-muted-foreground text-center">
                                  Tidak ada instruktur yang cocok ditemukan
                              </div>
                            )}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={addForm.control}
                  name="room_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Ruangan</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Pilih ruangan" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {filteredCreateRooms.map((room: any) => (
                            <SelectItem key={room.id} value={room.id}>
                              {room.name}
                            </SelectItem>
                          ))}
                          {filteredCreateRooms.length === 0 && (
                            <div className="p-2 text-sm text-muted-foreground text-center">
                                Tidak ada ruangan yang cocok ditemukan
                            </div>
                          )}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={addForm.control}
                  name="max_students"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Maks Siswa</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h4 className="text-sm font-medium">Slot Jadwal</h4>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => addAppend({ day_of_week: "monday", start_time: "09:00", end_time: "09:30", duration: 30 })}
                  >
                    <Plus className="h-4 w-4 mr-2" /> Tambah Slot
                  </Button>
                </div>

                {addFields.map((field, index) => (
                  <div key={field.id} className="grid grid-cols-12 gap-2 items-end border p-2 rounded">
                    <div className="col-span-3">
                      <FormField
                        control={addForm.control}
                        name={`schedule.${index}.day_of_week`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs">Hari</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {days.map((day) => (
                                  <SelectItem key={day} value={day}>
                                    {dayMap[day]}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <div className="col-span-3">
                      <FormField
                        control={addForm.control}
                        name={`schedule.${index}.start_time`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs">Mulai</FormLabel>
                            <FormControl>
                              <TimePicker 
                                value={field.value} 
                                onChange={field.onChange} 
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <div className="col-span-3">
                      <FormField
                        control={addForm.control}
                        name={`schedule.${index}.end_time`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs">Selesai</FormLabel>
                            <FormControl>
                              <TimePicker 
                                value={field.value} 
                                onChange={field.onChange} 
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <div className="col-span-2">
                      <FormField
                        control={addForm.control}
                        name={`schedule.${index}.duration`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs">Durasi</FormLabel>
                            <FormControl>
                              <Input type="number" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <div className="col-span-1">
                      {addFields.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="text-destructive"
                          onClick={() => addRemove(index)}
                        >
                          <Trash className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsAddOpen(false)}>
                  Batal
                </Button>
                <Button type="submit" disabled={createMutation.isPending}>
                  {createMutation.isPending ? "Membuat..." : "Buat Jadwal"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
