import { useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/services/api";
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
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/components/ui/use-toast";
import { Plus, Trash } from "lucide-react";

const availabilitySchema = z.object({
  schedule: z.array(
    z.object({
      day_of_week: z.string().min(1, "Hari wajib dipilih"),
      start_time: z.string().min(1, "Waktu mulai wajib diisi"),
      end_time: z.string().min(1, "Waktu selesai wajib diisi"),
      is_available: z.boolean().default(true),
    })
  ).min(1, "Minimal satu blok jadwal diperlukan"),
});

type AvailabilityFormValues = z.infer<typeof availabilitySchema>;

interface SetupRoomAvailabilityDialogProps {
  roomId: string;
  roomName: string;
  trigger?: React.ReactNode;
}

export function SetupRoomAvailabilityDialog({ roomId, roomName, trigger }: SetupRoomAvailabilityDialogProps) {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<AvailabilityFormValues>({
    resolver: zodResolver(availabilitySchema),
    defaultValues: {
      schedule: [
        { day_of_week: "monday", start_time: "09:00", end_time: "17:00", is_available: true }
      ],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "schedule",
  });

  const mutation = useMutation({
    mutationFn: async (values: AvailabilityFormValues) => {
      const response = await api.post(`/api/admin/rooms/${roomId}/availability`, values);
      return response.data;
    },
    onSuccess: () => {
      toast({
        title: "Berhasil",
        description: "Ketersediaan ruangan berhasil diperbarui",
      });
      queryClient.invalidateQueries({ queryKey: ["rooms"] });
      setOpen(false);
      form.reset();
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.response?.data?.message || "Gagal memperbarui ketersediaan",
      });
    },
  });

  const onSubmit = (values: AvailabilityFormValues) => {
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
        {trigger || <Button variant="outline" size="sm">Ketersediaan</Button>}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Atur Ketersediaan untuk {roomName}</DialogTitle>
          <DialogDescription>
            Tentukan kapan ruangan ini tersedia untuk dipesan.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h4 className="text-sm font-medium">Blok Ketersediaan</h4>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => append({ day_of_week: "monday", start_time: "09:00", end_time: "17:00", is_available: true })}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Tambah Blok
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
                          <FormLabel className="text-xs">Selesai</FormLabel>
                          <FormControl>
                            <Input type="time" {...field} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="col-span-2 flex items-center justify-center pb-2">
                    <FormField
                      control={form.control}
                      name={`schedule.${index}.is_available`}
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-2 space-y-0">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <FormLabel className="text-xs font-normal">
                            Aktif
                          </FormLabel>
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
                {mutation.isPending ? "Menyimpan..." : "Simpan Ketersediaan"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
