import { useState, useEffect, useMemo } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/services/api';
import { useAllCourses, queryKeys } from '@/hooks/useQueries';
import { CreateCourseDialog } from "@/components/CreateCourseDialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Eye, Edit, Trash } from 'lucide-react';
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
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { TableSkeleton } from '@/components/TableSkeleton';
import { PaginationControls } from '@/components/ui/pagination-controls';

const updateCourseSchema = z.object({
  title: z.string().min(2, "Judul wajib diisi"),
  description: z.string().optional(),
  instrument: z.string().min(1, "Instrumen wajib dipilih"),
  level: z.string().min(1, "Level wajib dipilih"),
  duration_minutes: z.coerce.number().min(1),
  price_per_session: z.coerce.number().min(0),
  max_students: z.coerce.number().min(1),
  is_active: z.boolean(),
  type_course: z.enum(["reguler", "hobby", "karyawan", "ministry", "privat"]),
});

type UpdateCourseFormValues = z.infer<typeof updateCourseSchema>;

export default function CoursesPage() {
  const [selectedBatch, setSelectedBatch] = useState<string | null>(null);
  
  // Dialog states
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState<any>(null);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Pagination state (client-side for courses list)
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  
  // Fetch ALL courses
  const { data: allCourses = [], isLoading, error } = useAllCourses();

  // Reset page when batch changes
  useEffect(() => {
    setPage(1);
  }, [selectedBatch]);

  // Compute batches (instruments)
  const batches = useMemo(() => {
    const map = new Map<string, {
      instrument: string;
      total: number;
      active: number;
      types: Set<string>;
    }>();

    allCourses.forEach((course: any) => {
      const instrument = course.instrument || 'Unassigned';
      if (!map.has(instrument)) {
        map.set(instrument, {
          instrument,
          total: 0,
          active: 0,
          types: new Set(),
        });
      }
      const batch = map.get(instrument)!;
      batch.total++;
      if (course.is_active) batch.active++;
      if (course.type_course) batch.types.add(course.type_course);
    });

    return Array.from(map.values()).sort((a, b) => a.instrument.localeCompare(b.instrument));
  }, [allCourses]);

  // Derived courses for selected batch
  const filteredCourses = useMemo(() => {
    if (!selectedBatch) return [];
    return allCourses.filter((c: any) => (c.instrument || 'Unassigned') === selectedBatch);
  }, [allCourses, selectedBatch]);

  // Client-side pagination for filtered courses
  const paginatedCourses = useMemo(() => {
    const startIndex = (page - 1) * limit;
    return filteredCourses.slice(startIndex, startIndex + limit);
  }, [filteredCourses, page, limit]);

  const editForm = useForm<UpdateCourseFormValues>({
    resolver: zodResolver(updateCourseSchema),
    defaultValues: {
      title: "",
      description: "",
      instrument: "",
      level: "Beginner",
      duration_minutes: 0,
      price_per_session: 0,
      max_students: 1,
      is_active: true,
      type_course: "privat",
    },
  });

  // Reset form when selected course changes
  useEffect(() => {
    if (selectedCourse) {
      editForm.reset({
        title: selectedCourse.title || "",
        description: selectedCourse.description || "",
        instrument: selectedCourse.instrument || "",
        level: selectedCourse.level || "Beginner",
        duration_minutes: selectedCourse.duration_minutes || 0,
        price_per_session: selectedCourse.price_per_session || selectedCourse.price || 0,
        max_students: selectedCourse.max_students || 5,
        is_active: selectedCourse.is_active !== undefined ? selectedCourse.is_active : true,
        type_course: selectedCourse.type_course || "privat",
      });
    }
  }, [selectedCourse, editForm]);

  // Update course - PUT /courses/:id
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateCourseFormValues }) => {
      return api.put(`/api/courses/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.courses() });
      setIsEditOpen(false);
      setSelectedCourse(null);
      editForm.reset();
      toast({ title: "Berhasil", description: "Kursus berhasil diperbarui" });
    },
    onError: (error: any) => {
      toast({ 
        variant: "destructive", 
        title: "Error", 
        description: error.response?.data?.message || "Gagal memperbarui kursus" 
      });
    },
  });

  // Delete course - DELETE /courses/:id
  const deleteMutation = useMutation({
    mutationFn: (id: string) => {
      return api.delete(`/api/courses/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.courses() });
      setIsDeleteOpen(false);
      setSelectedCourse(null);
      toast({ title: "Berhasil", description: "Kursus berhasil dihapus" });
    },
    onError: (error: any) => {
      toast({ 
        variant: "destructive", 
        title: "Error", 
        description: error.response?.data?.message || "Gagal menghapus kursus" 
      });
    },
  });

  const handleOpenView = (course: any) => {
    setSelectedCourse(course);
    setIsViewOpen(true);
  };

  const handleOpenEdit = (course: any) => {
    setSelectedCourse(course);
    setIsEditOpen(true);
  };

  const handleOpenDelete = (course: any) => {
    setSelectedCourse(course);
    setIsDeleteOpen(true);
  };

  function onEditSubmit(values: UpdateCourseFormValues) {
    if (selectedCourse) {
      updateMutation.mutate({ id: selectedCourse.id, data: values });
    }
  }

  if (isLoading) return <TableSkeleton columnCount={7} rowCount={10} />;
  if (error) return <div>Error memuat kursus</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
            {selectedBatch && (
                <Button variant="outline" onClick={() => setSelectedBatch(null)}>
                    &larr; Kembali ke Batch
                </Button>
            )}
            <h2 className="text-3xl font-bold tracking-tight">
                {selectedBatch ? `Kursus: ${selectedBatch}` : "Batch Kursus"}
            </h2>
        </div>
        <CreateCourseDialog />
      </div>
      
      <div className="border rounded-md">
        {!selectedBatch ? (
            // BATCH VIEW
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Instrumen</TableHead>
                        <TableHead>Total Kursus</TableHead>
                        <TableHead>Kursus Aktif</TableHead>
                        <TableHead>Tipe</TableHead>
                        <TableHead className="text-right">Aksi</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {batches.map((batch) => (
                        <TableRow key={batch.instrument}>
                            <TableCell className="font-medium text-sm">{batch.instrument}</TableCell>
                            <TableCell>
                                <Badge variant="secondary" className="text-xs">
                                    {batch.total} Kursus
                                </Badge>
                            </TableCell>
                            <TableCell>
                                <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50">
                                    {batch.active} Aktif
                                </Badge>
                            </TableCell>
                            <TableCell>
                                <div className="flex flex-wrap gap-1">
                                    {Array.from(batch.types).map(t => (
                                        <Badge key={t} variant="outline" className="capitalize text-xs">
                                            {t}
                                        </Badge>
                                    ))}
                                </div>
                            </TableCell>
                            <TableCell className="text-right">
                                <Button size="sm" onClick={() => setSelectedBatch(batch.instrument)}>
                                    Lihat Detail
                                </Button>
                            </TableCell>
                        </TableRow>
                    ))}
                    {batches.length === 0 && (
                        <TableRow>
                            <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                                Tidak ada kursus ditemukan. Buat kursus untuk memulai.
                            </TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </Table>
        ) : (
            // COURSE VIEW (Filtered)
            <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Judul</TableHead>
                      <TableHead>Instrumen</TableHead>
                      <TableHead>Tipe</TableHead>
                      <TableHead>Level</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedCourses.map((course: any) => (
                      <TableRow key={course.id}>
                        <TableCell className="font-medium">{course.title}</TableCell>
                        <TableCell>{course.instrument || '-'}</TableCell>
                        <TableCell className="capitalize">{course.type_course || '-'}</TableCell>
                        <TableCell>{course.level}</TableCell>
                        <TableCell>
                          <Badge variant={course.is_active ? 'default' : 'secondary'}>
                            {course.is_active ? 'aktif' : 'tidak aktif'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex space-x-1">
                            <Button
                        variant="ghost"
                        size="icon"
                        className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                        onClick={() => handleOpenView(course)}
                        title="Lihat Detail"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-amber-600 hover:text-amber-700 hover:bg-amber-50"
                        onClick={() => handleOpenEdit(course)}
                        title="Edit"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => handleOpenDelete(course)}
                        title="Hapus"
                      >
                        <Trash className="h-4 w-4" />
                      </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    {paginatedCourses.length === 0 && (
                        <TableRow>
                            <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                                Tidak ada kursus ditemukan di batch ini.
                            </TableCell>
                        </TableRow>
                    )}
                  </TableBody>
                </Table>
                <PaginationControls
                  currentPage={page}
                  totalCount={filteredCourses.length}
                  limit={limit}
                  onPageChange={setPage}
                  onLimitChange={setLimit}
                  isLoading={isLoading}
                />
            </>
        )}
      </div>

      {/* View Course Dialog */}
      <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Detail Kursus</DialogTitle>
          </DialogHeader>
          {selectedCourse && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">Judul</label>
                  <p className="text-sm font-semibold">{selectedCourse.title || '-'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Tipe</label>
                  <p className="text-sm capitalize">{selectedCourse.type_course || '-'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Status</label>
                  <p className="text-sm">
                    <Badge variant={selectedCourse.is_active ? 'default' : 'secondary'}>
                      {selectedCourse.is_active ? 'Aktif' : 'Tidak Aktif'}
                    </Badge>
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Instrumen</label>
                  <p className="text-sm">{selectedCourse.instrument || '-'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Level</label>
                  <p className="text-sm">{selectedCourse.level || '-'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Maks Siswa</label>
                  <p className="text-sm">{selectedCourse.max_students || '-'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Durasi (Menit)</label>
                  <p className="text-sm">{selectedCourse.duration_minutes || '-'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Harga per Sesi</label>
                  <p className="text-sm">
                    {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' })
                      .format(selectedCourse.price_per_session || selectedCourse.price || 0)}
                  </p>
                </div>

              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Deskripsi</label>
                <p className="text-sm">{selectedCourse.description || '-'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Dibuat Pada</label>
                <p className="text-sm">
                  {selectedCourse.created_at 
                    ? new Date(selectedCourse.created_at).toLocaleDateString("id-ID") 
                    : '-'}
                </p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsViewOpen(false)}>
              Tutup
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Course Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Kursus</DialogTitle>
            <DialogDescription>
              Perbarui informasi kursus.
            </DialogDescription>
          </DialogHeader>
          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-4">
              <FormField
                control={editForm.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Judul</FormLabel>
                    <FormControl>
                      <Input {...field} />
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
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={editForm.control}
                  name="instrument"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Instrumen</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
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
                  control={editForm.control}
                  name="level"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Level</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
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
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={editForm.control}
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
                  control={editForm.control}
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
                <FormField
                  control={editForm.control}
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
              </div>
              <FormField
                control={editForm.control}
                name="is_active"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select 
                      onValueChange={(value) => field.onChange(value === 'true')} 
                      value={field.value ? 'true' : 'false'}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="true">Aktif</SelectItem>
                        <SelectItem value="false">Tidak Aktif</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editForm.control}
                name="type_course"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipe Kursus</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
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
              Tindakan ini akan menghapus kursus "{selectedCourse?.title}" secara permanen. 
              Tindakan ini tidak dapat dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (selectedCourse) {
                  deleteMutation.mutate(selectedCourse.id);
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
