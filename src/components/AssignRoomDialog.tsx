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
  course_id: z.string().min(1, "Kursus wajib dipilih"),
  room_id: z.string().min(1, "Ruangan wajib dipilih"),
  schedule: z.object({
    days: z.array(z.string()).min(1, "Pilih minimal satu hari"),
    time: z.string().min(1, "Waktu wajib diisi"),
    duration: z.coerce.number().min(1, "Durasi wajib diisi"),
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
        title: "Berhasil",
        description: "Ruangan berhasil ditetapkan",
      });
      queryClient.invalidateQueries({ queryKey: ["schedules"] }); // Assuming this affects schedules/slots
      setOpen(false);
      form.reset();
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.response?.data?.message || "Gagal menetapkan ruangan",
      });
    },
  });

  const onSubmit = (values: AssignRoomFormValues) => {
    mutation.mutate(values);
  };

  const days = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
  const dayNames = {
    monday: "Senin",
    tuesday: "Selasa",
    wednesday: "Rabu",
    thursday: "Kamis",
    friday: "Jumat",
    saturday: "Sabtu",
    sunday: "Minggu"
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || <Button variant="secondary" size="sm">Tetapkan Ruangan</Button>}
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Tetapkan Ruangan {courseTitle ? `untuk ${courseTitle}` : ""}</DialogTitle>
          <DialogDescription>
            Tetapkan ruangan dan waktu untuk kursus ini.
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
                    <FormLabel>ID Kursus</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="UUID Kursus" />
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
                  <FormLabel>Ruangan</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Pilih ruangan" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {(Array.isArray(rooms) ? rooms : (rooms as any)?.data || []).map((room: any) => (
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
                    <FormLabel className="text-base">Hari</FormLabel>
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
                                {dayNames[day as keyof typeof dayNames]}
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
                    <FormLabel>Waktu</FormLabel>
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
                    <FormLabel>Durasi (mnt)</FormLabel>
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
                Batal
              </Button>
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending ? "Menetapkan..." : "Tetapkan Ruangan"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
