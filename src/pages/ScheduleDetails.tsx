import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/services/api';
import { useSchedules, useCourses, useInstructors, useRooms, queryKeys } from '@/hooks/useQueries';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from '@/components/ui/button';
import { Edit, Trash, ArrowLeft, Plus, BookOpen, User, MapPin } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
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
import { TableSkeleton } from '@/components/TableSkeleton';

const scheduleSchema = z.object({
  course_id: z.string().min(1, "Course is required"),
  instructor_id: z.string().min(1, "Instructor is required"),
  room_id: z.string().min(1, "Room is required"),
  start_date: z.string().min(1, "Start date is required"),
  end_date: z.string().min(1, "End date is required"),
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

export default function ScheduleDetailsPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const courseId = searchParams.get('courseId');
  const instructorId = searchParams.get('instructorId');
  const roomId = searchParams.get('roomId');

  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState<any>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: schedulesData, isLoading, error } = useSchedules();
  const { data: coursesData } = useCourses();
  const { data: instructorsData } = useInstructors();
  const { data: roomsData } = useRooms();

  const days = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];

  const editForm = useForm<ScheduleFormValues>({
    resolver: zodResolver(scheduleSchema),
    defaultValues: {
      course_id: "",
      instructor_id: "",
      room_id: "",
      start_date: "",
      end_date: "",
      max_students: 5,
      schedule: [
        { day_of_week: "monday", start_time: "09:00", end_time: "10:00", duration: 60 }
      ],
    },
  });

  const { fields: editFields, append: editAppend, remove: editRemove } = useFieldArray({
    control: editForm.control,
    name: "schedule",
  });

  useEffect(() => {
    if (selectedSchedule) {
      editForm.reset({
        course_id: selectedSchedule.course_id || "",
        instructor_id: selectedSchedule.instructor_id || "",
        room_id: selectedSchedule.room_id || "",
        start_date: selectedSchedule.start_date ? selectedSchedule.start_date.split('T')[0] : "",
        end_date: selectedSchedule.end_date ? selectedSchedule.end_date.split('T')[0] : "",
        max_students: selectedSchedule.max_students || 5,
        schedule: selectedSchedule.schedule || selectedSchedule.slots || [
          { day_of_week: "monday", start_time: "09:00", end_time: "10:00", duration: 60 }
        ],
      });
    }
  }, [selectedSchedule, editForm]);

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

  function onEditSubmit(values: ScheduleFormValues) {
    if (selectedSchedule) {
      updateMutation.mutate({ id: selectedSchedule.id, data: values });
    }
  }

  const courses = Array.isArray(coursesData) ? coursesData : (coursesData?.data || []);
  const instructors = instructorsData?.instructors || (Array.isArray(instructorsData) ? instructorsData : (instructorsData?.data || []));
  const rooms = Array.isArray(roomsData) ? roomsData : (roomsData?.data || []);

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
  
  // Filter schedules based on query params
  const filteredSchedules = allSchedules.filter((s: any) => {
    const matchCourse = !courseId || courseId === 'undefined' || courseId === 'null' || String(s.course_id) === String(courseId);
    const matchInstructor = !instructorId || instructorId === 'undefined' || instructorId === 'null' || String(s.instructor_id) === String(instructorId);
    const matchRoom = !roomId || roomId === 'undefined' || roomId === 'null' || String(s.room_id) === String(roomId);
    
    return matchCourse && matchInstructor && matchRoom;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-4 mb-6">
        <Button variant="outline" size="icon" onClick={() => navigate('/schedules')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h2 className="text-3xl font-bold tracking-tight">Schedule Details</h2>
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

      <div className="border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date Range</TableHead>
              <TableHead>Max Students</TableHead>
              <TableHead>Sessions</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredSchedules.length > 0 ? (
              filteredSchedules.map((schedule: any) => (
                <TableRow key={schedule.id}>
                  <TableCell>
                    {schedule.start_date 
                      ? `${new Date(schedule.start_date).toLocaleDateString()} - ${schedule.end_date ? new Date(schedule.end_date).toLocaleDateString() : ''}`
                      : schedule.start_time 
                        ? new Date(schedule.start_time).toLocaleDateString()
                        : '-'
                    }
                  </TableCell>
                  <TableCell>{schedule.max_students || schedule.rooms?.capacity || '-'}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-2">
                      {(schedule.schedule || schedule.slots || []).map((slot: any, i: number) => (
                        <Badge key={i} variant="secondary">
                          {slot.day_of_week?.charAt(0).toUpperCase() + slot.day_of_week?.slice(1)} {slot.start_time?.slice(0, 5)}-{slot.end_time?.slice(0, 5)}
                        </Badge>
                      ))}
                      {(!schedule.schedule && !schedule.slots && schedule.start_time && schedule.end_time) && (
                        <Badge variant="secondary">
                          {new Date(schedule.start_time).toLocaleDateString('en-US', { weekday: 'long' })} {new Date(schedule.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}-{new Date(schedule.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right space-x-1">
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={() => handleOpenEdit(schedule)}
                      title="Edit"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon"
                      className="text-destructive hover:text-destructive"
                      onClick={() => handleOpenDelete(schedule)}
                      title="Delete"
                    >
                      <Trash className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-4 text-gray-500">
                  No schedules found for this group.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
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

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={editForm.control}
                  name="start_date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Start Date</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editForm.control}
                  name="end_date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>End Date</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
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
                    onClick={() => editAppend({ day_of_week: "monday", start_time: "09:00", end_time: "10:00", duration: 60 })}
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
                              <Input type="time" {...field} />
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
                              <Input type="time" {...field} />
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
