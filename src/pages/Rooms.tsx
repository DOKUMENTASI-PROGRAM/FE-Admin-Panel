import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/services/api';
import { useRooms, queryKeys } from '@/hooks/useQueries';
// import { SetupRoomAvailabilityDialog } from "@/components/SetupRoomAvailabilityDialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from '@/components/ui/button';
import { Plus, Edit, Trash } from 'lucide-react';
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
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { TableSkeleton } from '@/components/TableSkeleton';
import { PaginationControls } from '@/components/ui/pagination-controls';

const roomSchema = z.object({
  name: z.string().min(2),
  capacity: z.coerce.number().min(1),
  description: z.string().optional(),
});

export default function RoomsPage() {
  const [isOpen, setIsOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState<any>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

  const { data: roomsData, isLoading, error } = useRooms(page, limit);

  const form = useForm<z.infer<typeof roomSchema>>({
    resolver: zodResolver(roomSchema),
    defaultValues: {
      name: "",
      capacity: 1,
      description: "",
    },
  });

  const editForm = useForm<z.infer<typeof roomSchema>>({
    resolver: zodResolver(roomSchema),
    defaultValues: {
      name: "",
      capacity: 1,
      description: "",
    },
  });

  // Reset edit form when selected room changes
  useEffect(() => {
    if (selectedRoom) {
      editForm.reset({
        name: selectedRoom.name || "",
        capacity: selectedRoom.capacity || 1,
        description: selectedRoom.description || "",
      });
    }
  }, [selectedRoom, editForm]);

  const createMutation = useMutation({
    mutationFn: (newRoom: z.infer<typeof roomSchema>) => {
      return api.post('/api/admin/rooms', newRoom);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.rooms() });
      setIsOpen(false);
      form.reset();
      toast({ title: "Berhasil", description: "Ruangan berhasil dibuat" });
    },
    onError: (error: any) => {
      toast({ 
        variant: "destructive", 
        title: "Error", 
        description: error.response?.data?.message || "Gagal membuat ruangan" 
      });
    },
  });

  // Update room - PUT /api/admin/rooms/:id
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: z.infer<typeof roomSchema> }) => {
      return api.put(`/api/admin/rooms/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.rooms() });
      setIsEditOpen(false);
      setSelectedRoom(null);
      editForm.reset();
      toast({ title: "Berhasil", description: "Ruangan berhasil diperbarui" });
    },
    onError: (error: any) => {
      toast({ 
        variant: "destructive", 
        title: "Error", 
        description: error.response?.data?.message || "Gagal memperbarui ruangan" 
      });
    },
  });

  // Delete room - DELETE /api/admin/rooms/:id
  const deleteMutation = useMutation({
    mutationFn: (id: string) => {
      return api.delete(`/api/admin/rooms/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.rooms() });
      setIsDeleteOpen(false);
      setSelectedRoom(null);
      toast({ title: "Berhasil", description: "Ruangan berhasil dihapus" });
    },
    onError: (error: any) => {
      toast({ 
        variant: "destructive", 
        title: "Error", 
        description: error.response?.data?.message || "Gagal menghapus ruangan" 
      });
    },
  });

  function onSubmit(values: z.infer<typeof roomSchema>) {
    createMutation.mutate(values);
  }

  function onEditSubmit(values: z.infer<typeof roomSchema>) {
    if (selectedRoom) {
      updateMutation.mutate({ id: selectedRoom.id, data: values });
    }
  }

  const handleOpenEdit = (room: any) => {
    setSelectedRoom(room);
    setIsEditOpen(true);
  };

  const handleOpenDelete = (room: any) => {
    setSelectedRoom(room);
    setIsDeleteOpen(true);
  };

  if (isLoading) return <TableSkeleton columnCount={4} rowCount={5} />;
  if (error) return <div>Error memuat ruangan</div>;

  const rooms = roomsData?.data || [];
  const totalRooms = roomsData?.total || 0;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold tracking-tight">Ruangan</h2>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" /> Tambah Ruangan
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Tambah Ruangan</DialogTitle>
              <DialogDescription>
                Buat ruangan baru untuk kelas.
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nama</FormLabel>
                      <FormControl>
                        <Input placeholder="Studio A" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="capacity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Kapasitas</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="5" {...field} />
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
                        <Input placeholder="Ruang latihan utama" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <DialogFooter>
                  <Button type="submit" disabled={createMutation.isPending}>
                    {createMutation.isPending ? "Menyimpan..." : "Simpan"}
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
              <TableHead>Nama</TableHead>
              <TableHead>Kapasitas</TableHead>
              <TableHead>Deskripsi</TableHead>
              <TableHead>Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rooms.map((room: any) => (
              <TableRow key={room.id}>
                <TableCell className="font-medium">{room.name}</TableCell>
                <TableCell>{room.capacity}</TableCell>
                <TableCell>{room.description || '-'}</TableCell>
                <TableCell>
                  <div className="flex space-x-1">
                    <Button 
                      variant="ghost" 
                      size="icon"
                      className="text-amber-600 hover:text-amber-700 hover:bg-amber-50"
                      onClick={() => handleOpenEdit(room)}
                      title="Edit"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon"
                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={() => handleOpenDelete(room)}
                      title="Hapus"
                    >
                      <Trash className="h-4 w-4" />
                    </Button>
                    {/* <SetupRoomAvailabilityDialog roomId={room.id} roomName={room.name} /> */}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <PaginationControls
          currentPage={page}
          totalCount={totalRooms}
          limit={limit}
          onPageChange={setPage}
          onLimitChange={setLimit}
          isLoading={isLoading}
        />
      </div>

      {/* Edit Room Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit Ruangan</DialogTitle>
            <DialogDescription>
              Perbarui informasi ruangan.
            </DialogDescription>
          </DialogHeader>
          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-4">
              <FormField
                control={editForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nama</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editForm.control}
                name="capacity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Kapasitas</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Deskripsi</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsEditOpen(false)}>
                  Batal
                </Button>
                <Button type="submit" disabled={updateMutation.isPending}>
                  {updateMutation.isPending ? "Menyimpan..." : "Simpan Perubahan"}
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
            <AlertDialogTitle>Apakah Anda yakin?</AlertDialogTitle>
            <AlertDialogDescription>
              Tindakan ini akan menghapus ruangan "{selectedRoom?.name}" secara permanen. 
              Tindakan ini tidak dapat dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (selectedRoom) {
                  deleteMutation.mutate(selectedRoom.id);
                }
              }}
            >
              {deleteMutation.isPending ? "Menghapus..." : "Hapus"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
