import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/services/api";
import { useRooms } from "@/hooks/useQueries";
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
// Checkbox component is implemented inline below
import { useToast } from "@/components/ui/use-toast";

// I'll use a multi-select for days if I can, or just checkboxes.
// Since I don't have a multi-select component ready, I'll use a group of checkboxes.

const assignRoomSchema = z.object({
  course_id: z.string().min(1, "Course is required"),
  room_id: z.string().min(1, "Room is required"),
  schedule: z.object({
    days: z.array(z.string()).min(1, "Select at least one day"),
    time: z.string().min(1, "Time is required"),
    duration: z.coerce.number().min(1, "Duration is required"),
  }),
});

type AssignRoomFormValues = z.infer<typeof assignRoomSchema>;

interface AssignRoomDialogProps {
  courseId?: string;
  courseTitle?: string;
  trigger?: React.ReactNode;
}

export function AssignRoomDialog({ courseId, courseTitle, trigger }: AssignRoomDialogProps) {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: rooms = [] } = useRooms();

  const form = useForm<AssignRoomFormValues>({
    resolver: zodResolver(assignRoomSchema),
    defaultValues: {
      course_id: courseId || "",
      room_id: "",
      schedule: {
        days: [],
        time: "09:00",
        duration: 60,
      },
    },
  });

  const mutation = useMutation({
    mutationFn: async (values: AssignRoomFormValues) => {
      const response = await api.post("/booking/api/admin/assign-room", values);
      return response.data;
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Room assigned successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["schedules"] }); // Assuming this affects schedules/slots
      setOpen(false);
      form.reset();
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.response?.data?.message || "Failed to assign room",
      });
    },
  });

  const onSubmit = (values: AssignRoomFormValues) => {
    mutation.mutate(values);
  };

  const days = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || <Button variant="secondary" size="sm">Assign Room</Button>}
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Assign Room {courseTitle ? `to ${courseTitle}` : ""}</DialogTitle>
          <DialogDescription>
            Assign a room and time slots for this course.
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

            <FormField
              control={form.control}
              name="schedule.days"
              render={() => (
                <FormItem>
                  <div className="mb-4">
                    <FormLabel className="text-base">Days</FormLabel>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {days.map((day) => (
                      <FormField
                        key={day}
                        control={form.control}
                        name="schedule.days"
                        render={({ field }) => {
                          return (
                            <FormItem
                              key={day}
                              className="flex flex-row items-start space-x-3 space-y-0"
                            >
                              <FormControl>
                                <input
                                  type="checkbox"
                                  className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                                  checked={field.value?.includes(day)}
                                  onChange={(checked) => {
                                    return checked.target.checked
                                      ? field.onChange([...(field.value || []), day])
                                      : field.onChange(
                                          field.value?.filter(
                                            (value) => value !== day
                                          )
                                        )
                                  }}
                                />
                              </FormControl>
                              <FormLabel className="font-normal capitalize">
                                {day}
                              </FormLabel>
                            </FormItem>
                          )
                        }}
                      />
                    ))}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="schedule.time"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Time</FormLabel>
                    <FormControl>
                      <Input type="time" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="schedule.duration"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Duration (min)</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="flex justify-end space-x-2 pt-4">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending ? "Assigning..." : "Assign Room"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
