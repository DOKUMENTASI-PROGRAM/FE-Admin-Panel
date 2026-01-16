import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
import { Trash, Plus } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { TableSkeleton } from '@/components/TableSkeleton';
import { PaginationControls } from '@/components/ui/pagination-controls';
import { TimePicker } from '@/components/ui/time-picker';

const scheduleSchema = z.object({
  course_id: z.string().min(1, "Course is required"),
  instructor_id: z.string().min(1, "Instructor is required"),
  room_id: z.string().min(1, "Room is required"),
  // start_date: z.string().min(1, "Start date is required"),
  // end_date: z.string().min(1, "End date is required"),
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

export default function SchedulesPage() {
  const navigate = useNavigate();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState<any>(null);
  const [scheduleToDelete, setScheduleToDelete] = useState<any>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const { data: schedulesData, isLoading, error } = useSchedules(page, limit);
  const { data: availabilitySlotsData } = useAvailabilitySlots();
  const { data: coursesData } = useCourses();
  const { data: instructorsData } = useInstructors(1, 1000);
  const { data: roomsData } = useRooms();

  const days = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];

  const timeOptions = [];
  for (let i = 0; i < 24; i++) {
    const hour = i.toString().padStart(2, '0');
    timeOptions.push(`${hour}:00`);
    timeOptions.push(`${hour}:30`);
  }

  const createForm = useForm<ScheduleFormValues>({
    resolver: zodResolver(scheduleSchema),
    defaultValues: {
      course_id: "",
      instructor_id: "",
      room_id: "",
      // start_date: "",
      // end_date: "",
      max_students: 1,
      schedule: [
        { day_of_week: "monday", start_time: "09:00", end_time: "09:30", duration: 30 }
      ],
    },
  });

  const editForm = useForm<ScheduleFormValues>({
    resolver: zodResolver(scheduleSchema),
    defaultValues: {
      course_id: "",
      instructor_id: "",
      room_id: "",
      // start_date: "",
      // end_date: "",
      max_students: 1,
      schedule: [
        { day_of_week: "monday", start_time: "09:00", end_time: "09:30", duration: 30 }
      ],
    },
  });

  const { fields: createFields, append: createAppend, remove: createRemove } = useFieldArray({
    control: createForm.control,
    name: "schedule",
  });

  const { fields: editFields, append: editAppend, remove: editRemove } = useFieldArray({
    control: editForm.control,
    name: "schedule",
  });

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
      } else if (selectedSchedule.day_of_week && selectedSchedule.start_time && selectedSchedule.end_time) {
         // Create array from flat fields
         scheduleSlots = [{
            day_of_week: selectedSchedule.day_of_week,
            start_time: selectedSchedule.start_time,
            end_time: selectedSchedule.end_time,
            duration: selectedSchedule.duration || 30 // Ensure duration is calculated or present
         }];
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

  // Create schedule - POST /api/admin/schedules
  const createMutation = useMutation({
    mutationFn: (newSchedule: ScheduleFormValues) => {
      return api.post('/api/admin/schedules', newSchedule);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.schedules() });
      setIsCreateOpen(false);
      createForm.reset();
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

  // Update schedule - PUT /api/admin/schedules/:id
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
      queryClient.invalidateQueries({ queryKey: queryKeys.schedules() });
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

  // Delete schedule - DELETE /api/admin/schedules/:id
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

  // Bulk delete schedules
  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      const promises = ids.map(id => api.delete(`/api/admin/schedules/${id}`));
      return Promise.all(promises);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.schedules() });
      setIsDeleteOpen(false);
      setScheduleToDelete(null);
      toast({ title: "Success", description: "All schedules in group deleted successfully" });
    },
    onError: (error: any) => {
      toast({ 
        variant: "destructive", 
        title: "Error", 
        description: error.response?.data?.message || "Failed to delete schedules" 
      });
    },
  });

  const handleOpenView = (group: any) => {
    const params = new URLSearchParams();
    if (group.course_id) params.append('courseId', group.course_id);
    if (group.instructor_id) params.append('instructorId', group.instructor_id);
    if (group.room_id) params.append('roomId', group.room_id);
    
    navigate(`/schedules/details?${params.toString()}`);
  };

  function onCreateSubmit(values: ScheduleFormValues) {
    createMutation.mutate(values);
  }

  function onEditSubmit(values: ScheduleFormValues) {
    if (selectedSchedule) {
      updateMutation.mutate({ id: selectedSchedule.id, data: values });
    }
  }

  const courses = coursesData?.data || [];
  const instructors = instructorsData?.data || [];
  const rooms = roomsData?.data || [];

  const [createInstrument, setCreateInstrument] = useState<string>("");
  const [editInstrument, setEditInstrument] = useState<string>("");

  const uniqueInstruments = Array.from(new Set(courses.map((c: any) => c.instrument).filter(Boolean))) as string[];

  // Filter Logic for Create Form
  const filteredCreateCourses = courses.filter((c: any) => 
    !createInstrument || (c.instrument && c.instrument === createInstrument)
  );

  const createSelectedCourseId = createForm.watch("course_id");
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

  const editSelectedCourseId = editForm.watch("course_id");
  const editSelectedCourse = courses.find((c: any) => c.id === editSelectedCourseId);

  // Build lookup maps
  const courseMap: { [key: string]: string } = {};
  const instrumentMap: { [key: string]: string } = {};
  
  courses.forEach((course: any) => {
    if (course && course.id) {
      courseMap[course.id] = course.title || course.name || course.id;
      instrumentMap[course.id] = course.instrument || '-';
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

  if (isLoading) return <TableSkeleton columnCount={7} rowCount={10} />;
  if (error) return <div className="p-4 text-red-500">Error loading schedules</div>;

  const schedules = schedulesData?.data || [];
  const availabilitySlots = availabilitySlotsData?.slots || [];

  // Build lookup map for availability slots by schedule_id
  const availabilityMap: { [key: string]: any } = {};
  availabilitySlots.forEach((slot: any) => {
    if (slot.schedule_id) {
      availabilityMap[slot.schedule_id] = slot;
    }
  });

  // Grouping Logic: Instructor + Instrument + Room
  const groupedSchedules = schedules.reduce((acc: any, schedule: any) => {
    // Need to look up the instrument for this schedule's course
    // We can use the already populated instrumentMap or find it in courses
    const scheduleInstrument = instrumentMap[schedule.course_id] || 'Unknown';
    
    // Key based on Instructor + Instrument + Room
    const key = `${schedule.instructor_id}-${scheduleInstrument}-${schedule.room_id}`;
    
    if (!acc[key]) {
      acc[key] = {
        // Base info for the group
        instructor_id: schedule.instructor_id,
        room_id: schedule.room_id,
        instrument: scheduleInstrument,
        // Helper fields
        items: [],
        course_types: new Set<string>(), // To store unique course types (tags)
        
        // Stats
        total_current_enrollments: 0,
        total_pending_count: 0,
        total_confirmed_count: 0,
        total_max_students: 0,
        instructor_name_from_slot: null,
        room_name_from_slot: null,
      };
    }
    
    acc[key].items.push(schedule);

    // Add course type to the set
    const course = courses.find((c: any) => c.id === schedule.course_id);
    if (course && course.type_course) {
        acc[key].course_types.add(course.type_course);
    } else if (course && course.title) {
        // Fallback to title if type_course is missing, or just use a generic tag
         // acc[key].course_types.add(course.title); 
    }
    
    // Get enrollment data from availability map
    const availabilityData = availabilityMap[schedule.id];
    if (availabilityData) {
      acc[key].total_current_enrollments += availabilityData.current_enrollments || 0;
      acc[key].total_pending_count += availabilityData.pending_count || 0;
      acc[key].total_confirmed_count += availabilityData.confirmed_count || 0;
      acc[key].total_max_students += availabilityData.max_students || 0;
      // Store instructor_name and room_name from availability API as fallback
      if (availabilityData.instructor_name && !acc[key].instructor_name_from_slot) {
        acc[key].instructor_name_from_slot = availabilityData.instructor_name;
      }
      if (availabilityData.room_name && !acc[key].room_name_from_slot) {
        acc[key].room_name_from_slot = availabilityData.room_name;
      }
    }
    
    return acc;
  }, {});
  const groupedSchedulesArray = Object.values(groupedSchedules);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold tracking-tight">Schedules</h2>
        
        {/* Create Schedule Dialog */}
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" /> Create Schedule
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create Schedule</DialogTitle>
              <DialogDescription>
                Set up a new schedule for a course.
              </DialogDescription>
            </DialogHeader>
            <Form {...createForm}>
              <form onSubmit={createForm.handleSubmit(onCreateSubmit)} className="space-y-4">
                <div className="space-y-4">
                  <FormItem>
                    <FormLabel>Instrument</FormLabel>
                    <Select 
                      onValueChange={(value) => {
                        setCreateInstrument(value);
                        createForm.setValue("course_id", "");
                        createForm.setValue("instructor_id", "");
                      }} 
                      value={createInstrument}
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
                      control={createForm.control}
                      name="course_id"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Course</FormLabel>
                          <Select 
                            onValueChange={(val) => {
                              field.onChange(val);
                              createForm.setValue("instructor_id", "");
                            }} 
                            value={field.value}
                            disabled={!createInstrument}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select course" />
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
                      control={createForm.control}
                      name="instructor_id"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Instructor</FormLabel>
                          <Select 
                            onValueChange={field.onChange} 
                            value={field.value}
                            disabled={!createSelectedCourseId}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select instructor" />
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
                    control={createForm.control}
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
                    control={createForm.control}
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
                      onClick={() => createAppend({ day_of_week: "monday", start_time: "09:00", end_time: "09:30", duration: 30 })}
                    >
                      <Plus className="h-4 w-4 mr-2" /> Add Slot
                    </Button>
                  </div>

                  {createFields.map((field, index) => (
                    <div key={field.id} className="grid grid-cols-12 gap-2 items-end border p-2 rounded">
                      <div className="col-span-3">
                        <FormField
                          control={createForm.control}
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
                          control={createForm.control}
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
                          control={createForm.control}
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
                          control={createForm.control}
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
                        {createFields.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="text-destructive"
                            onClick={() => createRemove(index)}
                          >
                            <Trash className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>
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

      <div className="border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Instructor</TableHead>
              <TableHead>Instrument</TableHead>
              <TableHead>Available Courses (Tags)</TableHead>
              <TableHead>Room</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {groupedSchedulesArray.length > 0 ? (
              groupedSchedulesArray.map((group: any, index: number) => (
                <TableRow key={index}>
                  <TableCell className="font-medium">
                     {instructorMap[group.instructor_id] || group.instructor_name_from_slot || group.instructor_id || '-'}
                  </TableCell>
                  <TableCell>
                    {group.instrument || '-'}
                  </TableCell>
                  <TableCell>
                     <div className="flex flex-wrap gap-1">
                        {Array.from(group.course_types).map((type: any, i) => (
                            <Badge key={i} variant="outline" className="capitalize text-xs">
                                {type}
                            </Badge>
                        ))}
                         {group.course_types.size === 0 && <span className="text-muted-foreground">-</span>}
                     </div>
                  </TableCell>
                  <TableCell>
                    {roomMap[group.room_id] || group.room_name_from_slot || group.room_id || '-'}
                  </TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                         onClick={() => {
                            if (group.items && group.items.length > 0) {
                                setScheduleToDelete(group);
                                setIsDeleteOpen(true);
                            }
                         }}
                     >
                        <Trash className="h-4 w-4" />
                     </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleOpenView(group)}
                    >
                      Manage Jadwal
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-4 text-gray-500">
                  No schedules found
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
        <PaginationControls
          currentPage={page}
          totalCount={schedulesData?.total || 0}
          limit={limit}
          onPageChange={setPage}
          onLimitChange={setLimit}
          isLoading={isLoading}
        />
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
                      if (!selectedCourse) return true; 
                      
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
                      {editFields.length > 1 && (
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
              This will permanently delete <strong>{scheduleToDelete?.items?.length || 1}</strong> schedule(s) in this group.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (scheduleToDelete && scheduleToDelete.items) {
                   const ids = scheduleToDelete.items.map((s: any) => s.id);
                   bulkDeleteMutation.mutate(ids);
                } else if (selectedSchedule) {
                   // Fallback for single item delete if needed (though we mostly use group delete now for table)
                   deleteMutation.mutate(selectedSchedule.id);
                }
              }}
            >
              {deleteMutation.isPending || bulkDeleteMutation.isPending ? "Deleting..." : "Delete All"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
