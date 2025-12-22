import { useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/services/api";
import { useInstructors, useRooms } from "@/hooks/useQueries";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { Plus, Trash } from "lucide-react";

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

interface CreateScheduleDialogProps {
  courseId?: string;
  courseTitle?: string;
  trigger?: React.ReactNode;
}

export function CreateScheduleDialog({ courseId, courseTitle, trigger }: CreateScheduleDialogProps) {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const { data: instructors = [] } = useInstructors();
  const { data: rooms = [] } = useRooms();

  const form = useForm<ScheduleFormValues>({
    resolver: zodResolver(scheduleSchema),
    defaultValues: {
      course_id: courseId || "",
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

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "schedule",
  });

  const mutation = useMutation({
    mutationFn: async (values: ScheduleFormValues) => {
      const response = await api.post("/api/admin/schedules", values);
      return response.data;
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Schedule created successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["schedules"] });
      setOpen(false);
      form.reset();
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.response?.data?.message || "Failed to create schedule",
      });
    },
  });

  const onSubmit = (values: ScheduleFormValues) => {
    mutation.mutate(values);
  };

  const days = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || <Button variant="outline">Create Schedule</Button>}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Schedule {courseTitle ? `for ${courseTitle}` : ""}</DialogTitle>
          <DialogDescription>
            Set up a new schedule for this course.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {!courseId && (
              <FormField
                control={form.control}
                name="course_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Course ID</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Course UUID" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="instructor_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Instructor</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select instructor" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {instructors.map((instructor: any) => (
                          <SelectItem key={instructor.id} value={instructor.id}>
                            {instructor.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="room_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Room</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select room" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {rooms.map((room: any) => (
                          <SelectItem key={room.id} value={room.id}>
                            {room.name} ({room.capacity})
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
                control={form.control}
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
                control={form.control}
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

            <FormField
              control={form.control}
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
                <h4 className="text-sm font-medium">Weekly Schedule</h4>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => append({ day_of_week: "monday", start_time: "09:00", end_time: "10:00", duration: 60 })}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Slot
                </Button>
              </div>

              {fields.map((field, index) => (
                <div key={field.id} className="grid grid-cols-12 gap-2 items-end border p-2 rounded">
                  <div className="col-span-3">
                    <FormField
                      control={form.control}
                      name={`schedule.${index}.day_of_week`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">Day</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
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
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="col-span-3">
                    <FormField
                      control={form.control}
                      name={`schedule.${index}.start_time`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">Start</FormLabel>
                          <FormControl>
                            <Input type="time" {...field} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="col-span-3">
                    <FormField
                      control={form.control}
                      name={`schedule.${index}.end_time`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">End</FormLabel>
                          <FormControl>
                            <Input type="time" {...field} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="col-span-2">
                    <FormField
                      control={form.control}
                      name={`schedule.${index}.duration`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">Dur (min)</FormLabel>
                          <FormControl>
                            <Input type="number" {...field} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="col-span-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => remove(index)}
                      disabled={fields.length === 1}
                    >
                      <Trash className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-end space-x-2 pt-4">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending ? "Creating..." : "Create Schedule"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
