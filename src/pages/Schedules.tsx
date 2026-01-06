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
import { Eye, Trash, Plus } from 'lucide-react';
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

  // Reset edit form when selected schedule changes
  useEffect(() => {
    if (selectedSchedule) {
      editForm.reset({
        course_id: selectedSchedule.course_id || "",
        instructor_id: selectedSchedule.instructor_id || "",
        room_id: selectedSchedule.room_id || "",
        // start_date: selectedSchedule.start_date ? selectedSchedule.start_date.split('T')[0] : "",
        // end_date: selectedSchedule.end_date ? selectedSchedule.end_date.split('T')[0] : "",
        max_students: selectedSchedule.max_students || 5,
        schedule: selectedSchedule.schedule || selectedSchedule.slots || [
          { day_of_week: "monday", start_time: "09:00", end_time: "09:30", duration: 30 }
        ],
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
      return api.put(`/api/admin/schedules/${id}`, data);
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

  // Build lookup maps
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

  const schedules = schedulesData?.data || [];
  const availabilitySlots = availabilitySlotsData?.slots || [];

  // Build lookup map for availability slots by schedule_id
  const availabilityMap: { [key: string]: any } = {};
  availabilitySlots.forEach((slot: any) => {
    if (slot.schedule_id) {
      availabilityMap[slot.schedule_id] = slot;
    }
  });

  // Grouping Logic with enrollment data from availability slots
  const groupedSchedules = schedules.reduce((acc: any, schedule: any) => {
    const key = `${schedule.course_id}-${schedule.instructor_id}-${schedule.room_id}`;
    if (!acc[key]) {
      acc[key] = {
        ...schedule,
        items: [],
        total_current_enrollments: 0,
        total_pending_count: 0,
        total_confirmed_count: 0,
        total_max_students: 0,
        instructor_name_from_slot: null,
        room_name_from_slot: null,
      };
    }
    acc[key].items.push(schedule);
    
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
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={createForm.control}
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
                            {courses.map((course: any) => (
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
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select instructor" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {instructors.map((instructor: any) => (
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
              <TableHead>Course</TableHead>
              <TableHead>Instructor</TableHead>
              <TableHead>Room</TableHead>
              <TableHead>Current Enrollments</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {groupedSchedulesArray.length > 0 ? (
              groupedSchedulesArray.map((group: any, index: number) => (
                <TableRow key={index}>
                  <TableCell className="font-medium">
                    {courseMap[group.course_id] || group.course_id || '-'}
                  </TableCell>
                  <TableCell>
                    {instructorMap[group.instructor_id] || group.instructor_name_from_slot || group.instructor_id || '-'}
                  </TableCell>
                  <TableCell>
                    {roomMap[group.room_id] || group.room_name_from_slot || group.room_id || '-'}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-medium">{group.total_current_enrollments || 0}</span>
                      <span className="text-xs text-muted-foreground">
                        {group.total_pending_count > 0 && (
                          <span className="text-yellow-600">{group.total_pending_count} pending</span>
                        )}
                        {group.total_pending_count > 0 && group.total_confirmed_count > 0 && ' / '}
                        {group.total_confirmed_count > 0 && (
                          <span className="text-green-600">{group.total_confirmed_count} confirmed</span>
                        )}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right space-x-1">
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={() => handleOpenView(group)}
                      title="View Details"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-4 text-gray-500">
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
                          {courses.map((course: any) => (
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
                          {instructors.map((instructor: any) => (
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
    </div>
  );
}
