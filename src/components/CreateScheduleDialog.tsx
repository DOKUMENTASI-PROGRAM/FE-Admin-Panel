import { useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/services/api";
import { useInstructors, useRooms, useCourses } from "@/hooks/useQueries";
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
  course_id: z.string().min(1, "Kursus wajib dipilih"),
  instructor_id: z.string().min(1, "Instruktur wajib dipilih"),
  room_id: z.string().min(1, "Ruangan wajib dipilih"),
  // start_date: z.string().min(1, "Start date is required"),
  // end_date: z.string().min(1, "End date is required"),
  max_students: z.coerce.number().min(1, "Maksimal siswa minimal 1"),
  schedule: z.array(
    z.object({
      day_of_week: z.string().min(1, "Hari wajib dipilih"),
      start_time: z.string().min(1, "Waktu mulai wajib dipilih"),
      end_time: z.string().min(1, "Waktu selesai wajib dipilih"),
      duration: z.coerce.number().min(1, "Durasi wajib diisi"),
    })
  ).min(1, "Minimal satu slot jadwal diperlukan"),
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
  
  const { data: instructorsData } = useInstructors(1, 1000);
  const instructors = instructorsData?.data || [];

  const { data: roomsData } = useRooms();
  const rooms = roomsData?.data || [];

  const { data: coursesData } = useCourses(1, 1000);
  const courses = coursesData?.data || [];

  const form = useForm<ScheduleFormValues>({
    resolver: zodResolver(scheduleSchema),
    defaultValues: {
      course_id: courseId || "",
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

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "schedule",
  });

  const selectedCourseId = form.watch("course_id");
  
  // Find the selected course object
  // If courseId prop is passed (e.g. from Courses page), we try to find that course in the list
  const activeCourseId = courseId || selectedCourseId;
  const selectedCourse = courses.find((c: any) => c.id === activeCourseId);

  const filteredInstructors = instructors.filter((instructor: any) => {
    if (!activeCourseId) return true; 
    if (!selectedCourse) return true;

    // Normalizing strings for comparison
    const courseInstrument = selectedCourse.instrument?.toLowerCase();
    const courseType = selectedCourse.type_course?.toLowerCase();
    
    if (!courseInstrument || !courseType) return true;

    // Check specialization (array of strings)
    // Instructor specialization must include the course instrument
    const hasSpecialization = Array.isArray(instructor.specialization) && 
      instructor.specialization.some((s: string) => s.toLowerCase() === courseInstrument);

    // Check teaching_categories (array of strings)
    // Instructor categories must include the course type
    const hasCategory = Array.isArray(instructor.teaching_categories) && 
      instructor.teaching_categories.some((c: string) => c.toLowerCase() === courseType);

    return hasSpecialization && hasCategory;
  });

  const mutation = useMutation({
    mutationFn: async (values: ScheduleFormValues) => {
      const response = await api.post("/api/admin/schedules", values);
      return response.data;
    },
    onSuccess: () => {
      toast({
        title: "Berhasil",
        description: "Jadwal berhasil dibuat",
      });
      queryClient.invalidateQueries({ queryKey: ["schedules"] });
      setOpen(false);
      form.reset();
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.response?.data?.message || "Gagal membuat jadwal",
      });
    },
  });

  const onSubmit = (values: ScheduleFormValues) => {
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

  const timeOptions: string[] = [];
  for (let i = 0; i < 24; i++) {
    const hour = i.toString().padStart(2, '0');
    timeOptions.push(`${hour}:00`);
    timeOptions.push(`${hour}:30`);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || <Button variant="outline">Buat Jadwal</Button>}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Buat Jadwal {courseTitle ? `untuk ${courseTitle}` : ""}</DialogTitle>
          <DialogDescription>
            Atur jadwal baru untuk kursus ini.
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
                    <FormLabel>Kursus</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Pilih kursus" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {courses.map((course: any) => (
                          <SelectItem key={course.id} value={course.id}>
                            {course.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
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
                    <FormLabel>Instruktur</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value} disabled={!selectedCourseId && !courseId}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Pilih instruktur" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {filteredInstructors.map((instructor: any) => (
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
                    <FormLabel>Ruangan</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Pilih ruangan" />
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



            <FormField
              control={form.control}
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

            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h4 className="text-sm font-medium">Jadwal Mingguan</h4>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => append({ day_of_week: "monday", start_time: "09:00", end_time: "09:30", duration: 30 })}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Tambah Slot
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
                          <FormLabel className="text-xs">Hari</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {days.map((day) => (
                                <SelectItem key={day} value={day}>
                                  {dayNames[day as keyof typeof dayNames]}
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
                            <FormLabel className="text-xs">Mulai</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent className="max-h-[200px]">
                                {timeOptions.map((time) => (
                                  <SelectItem key={time} value={time}>
                                    {time}
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
                        name={`schedule.${index}.end_time`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs">Selesai</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent className="max-h-[200px]">
                                {timeOptions.map((time) => (
                                  <SelectItem key={time} value={time}>
                                    {time}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
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
                          <FormLabel className="text-xs">Durasi (mnt)</FormLabel>
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
                Batal
              </Button>
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending ? "Membuat..." : "Buat Jadwal"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
