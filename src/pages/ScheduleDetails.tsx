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
import { Edit, Trash, ArrowLeft, Plus, BookOpen, User, MapPin, ChevronDown, ChevronRight } from 'lucide-react';

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
  course_id: z.string().min(1, "Course is required"),
  instructor_id: z.string().min(1, "Instructor is required"),
  room_id: z.string().min(1, "Room is required"),
  max_students: z.coerce.number().min(1, "Max students must be at least 1"),
  schedule: z.array(
    z.object({
      day_of_week: z.string().min(1, "Day is required"),
      start_time: z.string().min(1, "Start time is required"),
      end_time: z.string().min(1, "End time is required"),
      duration: z.coerce.number().min(1, "Duration is required"),
    })
  ).min(1, "At least one schedule slot is required"),
});

type ScheduleFormValues = z.infer<typeof scheduleSchema>;

const addScheduleSchema = z.object({
  max_students: z.coerce.number().min(1, "Max students must be at least 1"),
  schedule: z.array(
    z.object({
      day_of_week: z.string().min(1, "Day is required"),
      start_time: z.string().min(1, "Start time is required"),
      end_time: z.string().min(1, "End time is required"),
      duration: z.coerce.number().min(1, "Duration is required"),
    })
  ).min(1, "At least one schedule slot is required"),
});

type AddScheduleFormValues = z.infer<typeof addScheduleSchema>;


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

  const addForm = useForm<AddScheduleFormValues>({
    resolver: zodResolver(addScheduleSchema),
    defaultValues: {
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
  const filteredEditCourses = courses.filter((c: any) => 
    !editInstrument || (c.instrument && c.instrument === editInstrument)
  );

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
      toast({ title: "Success", description: "Schedule updated successfully" });
    },
    onError: (error: any) => {
      toast({ 
        variant: "destructive", 
        title: "Error", 
        description: error.response?.data?.message || "Failed to update schedule" 
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
      addForm.reset();
      toast({ title: "Success", description: "Schedule created successfully" });
    },
    onError: (error: any) => {
      toast({ 
        variant: "destructive", 
        title: "Error", 
        description: error.response?.data?.message || "Failed to create schedule" 
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
      toast({ title: "Success", description: "Schedule deleted successfully" });
    },
    onError: (error: any) => {
      toast({ 
        variant: "destructive", 
        title: "Error", 
        description: error.response?.data?.message || "Failed to delete schedule" 
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
    addForm.reset({
      max_students: 1,
      schedule: [
        { day_of_week: "monday", start_time: "09:00", end_time: "09:30", duration: 30 }
      ],
    });
    setIsAddOpen(true);
  };

  function onAddSubmit(values: AddScheduleFormValues) {
    // Get course_id, instructor_id, room_id from query params or first schedule
    const baseSchedule = filteredSchedules[0] || {};
    const fullData: ScheduleFormValues = {
      course_id: courseId || baseSchedule.course_id || "",
      instructor_id: instructorId || baseSchedule.instructor_id || "",
      room_id: roomId || baseSchedule.room_id || "",
      max_students: values.max_students,
      schedule: values.schedule,
    };
    createMutation.mutate(fullData);
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
  if (error) return <div className="p-4 text-red-500">Error loading schedules</div>;

  const allSchedules = Array.isArray(schedulesData) ? schedulesData : (schedulesData?.data || []);
  const availabilitySlots = availabilitySlotsData?.slots || [];

  // Build lookup map for availability slots by schedule_id
  const availabilityMap: { [key: string]: any } = {};
  availabilitySlots.forEach((slot: any) => {
    if (slot.schedule_id) {
      availabilityMap[slot.schedule_id] = slot;
    }
  });
  
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
          <h2 className="text-3xl font-bold tracking-tight">Schedule Details</h2>
        </div>
        <Button onClick={handleOpenAdd}>
          <Plus className="h-4 w-4 mr-2" />
          Add Schedule
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Course</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold truncate" title={courseId ? (courseMap[courseId] || courseId) : 'All Courses'}>
              {courseId ? (courseMap[courseId] || courseId) : 'All Courses'}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Instructor</CardTitle>
            <User className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold truncate" title={instructorId ? (instructorMap[instructorId] || instructorId) : 'All Instructors'}>
              {instructorId ? (instructorMap[instructorId] || instructorId) : 'All Instructors'}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Room</CardTitle>
            <MapPin className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold truncate" title={roomId ? (roomMap[roomId] || roomId) : 'All Rooms'}>
              {roomId ? (roomMap[roomId] || roomId) : 'All Rooms'}
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
            const groupKey = `COURSE ${type}`;
            
            if (!acc[groupKey]) acc[groupKey] = [];
            acc[groupKey].push(schedule);
            return acc;
          }, {})
        ).map(([groupTitle, schedules]: [string, any], index) => (
          <CollapsibleSection key={index} title={groupTitle} defaultOpen={true}>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Hari & Jam</TableHead>
                  <TableHead>Ruangan</TableHead>
                  <TableHead>Murid / Kapasitas</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {schedules.map((schedule: any) => {
                  const availability = availabilityMap[schedule.id] || {};
                  const roomName = roomMap[schedule.room_id] || schedule.room_name || '-';
                  
                  // Format Day & Time
                  const slots = schedule.schedule || schedule.slots || [];
                  let timeDisplay;

                  if (slots.length > 0) {
                    timeDisplay = slots.map((slot: any) => 
                      `${slot.day_of_week?.charAt(0).toUpperCase() + slot.day_of_week?.slice(1)}, ${slot.start_time?.slice(0, 5)} - ${slot.end_time?.slice(0, 5)}`
                    ).join(' | ');
                  } else {
                    const day = schedule.day_of_week 
                      ? schedule.day_of_week.charAt(0).toUpperCase() + schedule.day_of_week.slice(1) 
                      : (schedule.day ? schedule.day.charAt(0).toUpperCase() + schedule.day.slice(1) : '-');
                    const start = schedule.start_time?.slice(0, 5) || schedule.start_time_of_day?.slice(0, 5) || '-';
                    const end = schedule.end_time?.slice(0, 5) || schedule.end_time_of_day?.slice(0, 5) || '-';
                    timeDisplay = `${day}, ${start} - ${end}`;
                  }

                  // Format Students / Capacity
                  const current = availability.current_enrollments ?? schedule.current_enrollments ?? 0;
                  const max = availability.max_students || schedule.max_students || schedule.rooms?.capacity || '-';
                  
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
                      <TableCell className="text-right space-x-1">
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
            No schedules found matching the criteria.
          </div>
        )}
      </div>

      {/* Edit Schedule Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>

        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Schedule</DialogTitle>
            <DialogDescription>
              Update schedule information.
            </DialogDescription>
          </DialogHeader>
          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-4">
              <div className="space-y-4">
                <FormItem>
                  <FormLabel>Instrument</FormLabel>
                  <Select 
                    onValueChange={(value) => {
                      setEditInstrument(value);
                      editForm.setValue("course_id", "");
                      editForm.setValue("instructor_id", "");
                    }} 
                    value={editInstrument}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select instrument" />
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
                        <FormLabel>Course</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select course" />
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
                              <FormLabel>Instructor</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select instructor" />
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
                                        No matching instructors found
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
                      <FormLabel>Room</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select room" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {rooms.map((room: any) => (
                            <SelectItem key={room.id} value={room.id}>
                              {room.name}
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
                  name="max_students"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Max Students</FormLabel>
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
                  <h4 className="text-sm font-medium">Schedule Slots</h4>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => editAppend({ day_of_week: "monday", start_time: "09:00", end_time: "09:30", duration: 30 })}
                  >
                    <Plus className="h-4 w-4 mr-2" /> Add Slot
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
                            <FormLabel className="text-xs">Day</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {days.map((day) => (
                                  <SelectItem key={day} value={day}>
                                    {day.charAt(0).toUpperCase() + day.slice(1)}
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
                            <FormLabel className="text-xs">Start</FormLabel>
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
                            <FormLabel className="text-xs">End</FormLabel>
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
                            <FormLabel className="text-xs">Dur (min)</FormLabel>
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
                  Cancel
                </Button>
                <Button type="submit" disabled={updateMutation.isPending}>
                  {updateMutation.isPending ? "Saving..." : "Save Changes"}
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
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this schedule. 
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (selectedSchedule) {
                  deleteMutation.mutate(selectedSchedule.id);
                }
              }}
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Add Schedule Dialog */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Schedule</DialogTitle>
            <DialogDescription>
              Add a new schedule with the same course, instructor, and room.
            </DialogDescription>
          </DialogHeader>

          {/* Show inherited info */}
          <div className="grid grid-cols-3 gap-2 p-3 bg-muted rounded-md text-sm">
            <div>
              <span className="text-muted-foreground">Course:</span>{" "}
              <span className="font-medium">{courseId ? (courseMap[courseId] || courseId) : 'Auto'}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Instructor:</span>{" "}
              <span className="font-medium">{instructorId ? (instructorMap[instructorId] || instructorId) : 'Auto'}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Room:</span>{" "}
              <span className="font-medium">{roomId ? (roomMap[roomId] || roomId) : 'Auto'}</span>
            </div>
          </div>

          <Form {...addForm}>
            <form onSubmit={addForm.handleSubmit(onAddSubmit)} className="space-y-4">
              <FormField
                control={addForm.control}
                name="max_students"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Max Students</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h4 className="text-sm font-medium">Schedule Slots</h4>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => addAppend({ day_of_week: "monday", start_time: "09:00", end_time: "09:30", duration: 30 })}
                  >
                    <Plus className="h-4 w-4 mr-2" /> Add Slot
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
                            <FormLabel className="text-xs">Day</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {days.map((day) => (
                                  <SelectItem key={day} value={day}>
                                    {day.charAt(0).toUpperCase() + day.slice(1)}
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
                            <FormLabel className="text-xs">Start</FormLabel>
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
                            <FormLabel className="text-xs">End</FormLabel>
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
                            <FormLabel className="text-xs">Duration</FormLabel>
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
                  Cancel
                </Button>
                <Button type="submit" disabled={createMutation.isPending}>
                  {createMutation.isPending ? "Creating..." : "Create Schedule"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
