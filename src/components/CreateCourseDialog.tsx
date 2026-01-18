import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/services/api";
import { queryKeys } from "@/hooks/useQueries";
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
// Using Input component for description field
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { Plus } from "lucide-react";

const courseSchema = z.object({
  title: z.string().min(2, "Judul wajib diisi"),
  description: z.string().optional(),
  level: z.string().min(1, "Level wajib diisi"),
  price_per_session: z.coerce.number().min(0, "Harga tidak boleh negatif"),
  duration_minutes: z.coerce.number().min(1, "Durasi minimal 1 menit"),
  max_students: z.coerce.number().min(1, "Minimal 1 siswa"),
  instrument: z.string().min(1, "Instrumen wajib dipilih"),
  type_course: z.enum(["reguler", "hobby", "karyawan", "ministry", "privat"]),
});

type CourseFormValues = z.infer<typeof courseSchema>;

export function CreateCourseDialog() {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<CourseFormValues>({
    resolver: zodResolver(courseSchema),
    defaultValues: {
      title: "",
      description: "",
      level: "beginner",
      price_per_session: 0,
      duration_minutes: 30,
      max_students: 1,
      instrument: "",
      type_course: "privat",
    },
  });

  const mutation = useMutation({
    mutationFn: async (values: CourseFormValues) => {
      const response = await api.post("/api/courses", values);
      return response.data;
    },
    onSuccess: () => {
      toast({
        title: "Berhasil",
        description: "Kursus berhasil dibuat",
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.courses() });
      setOpen(false);
      form.reset();
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.response?.data?.message || "Gagal membuat kursus",
      });
    },
  });

  const onSubmit = (values: CourseFormValues) => {
    mutation.mutate(values);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" /> Buat Kursus
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Buat Kursus Baru</DialogTitle>
          <DialogDescription>
            Tambahkan kursus baru ke katalog.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Judul</FormLabel>
                  <FormControl>
                    <Input placeholder="Dasar Piano" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Deskripsi</FormLabel>
                  <FormControl>
                    <Input placeholder="Deskripsi kursus..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="level"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Level</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Pilih level" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="beginner">Pemula (Beginner)</SelectItem>
                        <SelectItem value="intermediate">Menengah (Intermediate)</SelectItem>
                        <SelectItem value="advanced">Lanjutan (Advanced)</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

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
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="price_per_session"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Harga per Sesi</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="duration_minutes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Durasi (Menit)</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="instrument"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Instrumen</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Pilih instrumen" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="Piano">Piano</SelectItem>
                      <SelectItem value="Guitar">Gitar</SelectItem>
                      <SelectItem value="Vokal">Vokal</SelectItem>
                      <SelectItem value="Drum">Drum</SelectItem>
                      <SelectItem value="Bass">Bass</SelectItem>
                      <SelectItem value="Keyboard">Keyboard</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="type_course"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipe Kursus</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Pilih tipe kursus" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="reguler">Reguler</SelectItem>
                      <SelectItem value="hobby">Hobby</SelectItem>
                      <SelectItem value="karyawan">Karyawan</SelectItem>
                      <SelectItem value="ministry">Ministry</SelectItem>
                      <SelectItem value="privat">Privat</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end space-x-2 pt-4">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Batal
              </Button>
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending ? "Membuat..." : "Buat Kursus"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
