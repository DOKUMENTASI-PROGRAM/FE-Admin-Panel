import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/services/api';
import { useStudents, queryKeys } from '@/hooks/useQueries';
import { uploadToStorage } from '@/lib/supabase';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";

import { Plus, Loader2, X, Upload } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { TableSkeleton } from '@/components/TableSkeleton';
import { PaginationControls } from '@/components/ui/pagination-controls';
import { Button } from '@/components/ui/button';
import { Eye, Pencil, Trash2 } from 'lucide-react';
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
import { useToast } from '@/components/ui/use-toast';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Checkbox } from '@/components/ui/checkbox';
const studentSchema = z.object({
  // Student Data
  display_name: z.string().min(2, "Nama minimal 2 karakter"),
  email: z.string().email("Format email tidak valid"),
  instrument: z.string().optional(),
  level: z.string().optional(),
  has_instrument: z.boolean().default(false),
  photo_url: z.string().optional(),
  highlight_quote: z.string().optional(),
  can_publish: z.boolean().default(false),
});

interface StudentFormProps {
  form: any;
  onSubmit: (values: z.infer<typeof studentSchema>) => void;
  photoPreview?: string | null;
  onPhotoSelect?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemovePhoto?: () => void;
  isUploading?: boolean;
}

const StudentForm = ({ 
  form, 
  onSubmit, 
  photoPreview, 
  onPhotoSelect, 
  onRemovePhoto, 
  isUploading 
}: StudentFormProps) => (
  <Form {...form}>
    <form id="student-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
      {/* Section 1: Data Dasar Siswa */}
      <div className="space-y-4">
        <h3 className="font-semibold text-lg border-b pb-2">Data Dasar Siswa</h3>
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="display_name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nama Lengkap</FormLabel>
                <FormControl>
                  <Input placeholder="Nama Siswa" {...field} value={field.value || ""} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input placeholder="siswa@example.com" {...field} value={field.value || ""} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      </div>

      {/* Section 2: Data Musik */}
      <div className="space-y-4">
        <h3 className="font-semibold text-lg border-b pb-2">Data Musik</h3>
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="instrument"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Instrumen</FormLabel>
                <FormControl>
                  <Input placeholder="Contoh: Piano" {...field} value={field.value || ""} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="level"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Level</FormLabel>
                <Select onValueChange={field.onChange} value={field.value || ""}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih Level" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="Beginner">Beginner</SelectItem>
                    <SelectItem value="Intermediate">Intermediate</SelectItem>
                    <SelectItem value="Advanced">Advanced</SelectItem>
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
            name="has_instrument"
            render={({ field }) => (
              <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                <FormControl>
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
                <div className="space-y-1 leading-none">
                  <FormLabel>Memiliki Instrumen Sendiri</FormLabel>
                </div>
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="can_publish"
            render={({ field }) => (
              <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                <FormControl>
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
                <div className="space-y-1 leading-none">
                  <FormLabel>Izinkan Publikasi</FormLabel>
                  <p className="text-sm text-muted-foreground">
                    Tampilkan profil siswa di halaman publik
                  </p>
                </div>
              </FormItem>
            )}
          />
        </div>
      </div>

      {/* Section 3: Profil Publik */}
      <div className="space-y-4">
        <h3 className="font-semibold text-lg border-b pb-2">Profil Publik</h3>
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="photo_url"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Foto</FormLabel>
                <div className="flex items-start gap-4">
                  {(photoPreview || field.value) && (
                    <div className="relative w-24 h-24">
                      <img 
                        src={photoPreview || field.value} 
                        alt="Preview" 
                        className="w-24 h-24 rounded-lg object-cover border"
                      />
                      {onRemovePhoto && (
                        <Button
                          type="button"
                          variant="destructive"
                          size="icon"
                          className="absolute -top-2 -right-2 h-6 w-6 rounded-full"
                          onClick={onRemovePhoto}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  )}
                  <div className="flex-1 space-y-2">
                    <FormControl>
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          className="flex-1"
                          onClick={() => document.getElementById('fe-file-input')?.click()}
                          disabled={isUploading}
                        >
                          <Upload className="mr-2 h-4 w-4" />
                          {field.value ? "Ganti Foto" : "Pilih Foto"}
                        </Button>
                        <Input 
                          id="fe-file-input"
                          type="file" 
                          accept="image/*"
                          onChange={onPhotoSelect}
                          className="hidden"
                          disabled={isUploading}
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                    {isUploading && (
                      <div className="flex items-center text-sm text-yellow-600">
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Mengupload foto...
                      </div>
                    )}
                    <p className="text-xs text-muted-foreground">
                      Format: JPG, PNG, GIF. Max size: 5MB
                    </p>
                  </div>
                </div>
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="highlight_quote"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Kutipan Utama</FormLabel>
                <FormControl>
                  <Textarea placeholder="Quote menarik tentang musik..." {...field} value={field.value || ""} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      </div>
    </form>
  </Form>
);

export default function StudentsFEPage() {
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Photo state
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const { data: studentsData, isLoading: isStudentsLoading, error } = useStudents(page, limit);

  const form = useForm<z.infer<typeof studentSchema>>({
    resolver: zodResolver(studentSchema),
    defaultValues: {
      display_name: '',
      email: '',
      instrument: '',
      level: '',
      has_instrument: false,
      photo_url: '',
      highlight_quote: '',
      can_publish: false,
    },
  });

  useEffect(() => {
    if (isCreateOpen) {
      form.reset({
        display_name: '',
        email: '',
        instrument: '',
        level: '',
        has_instrument: false,
        photo_url: '',
        highlight_quote: '',
        can_publish: false,
      });
    }
    if (!isCreateOpen) {
        setPhotoPreview(null);
    }
  }, [isCreateOpen, form]);
  useEffect(() => {
    if (selectedStudent && isEditOpen) {
      form.reset({
        display_name: selectedStudent.display_name || selectedStudent.full_name || '',
        email: selectedStudent.email || '',
        instrument: selectedStudent.instrument || '',
        level: selectedStudent.level || '',
        has_instrument: selectedStudent.has_instrument || false,
        photo_url: selectedStudent.photo_url || '',
        highlight_quote: selectedStudent.highlight_quote || '',
        can_publish: selectedStudent.can_publish || false,
      });
      setPhotoPreview(null); // Reset preview when switching students
    }
  }, [selectedStudent, isEditOpen, form]);

  const createMutation = useMutation({
    mutationFn: (data: z.infer<typeof studentSchema>) => api.post('/api/admin/students', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.students() });
      setIsCreateOpen(false);
      form.reset();
      form.reset();
      toast({ title: "Berhasil", description: "Siswa berhasil dibuat" });
    },
    onError: (error: any) => {
        toast({ variant: "destructive", title: "Error", description: error.response?.data?.message || "Gagal membuat siswa" });
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: z.infer<typeof studentSchema> }) => api.put(`/api/admin/students/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.students() });
      setIsEditOpen(false);
      setSelectedStudent(null);
      form.reset();
      form.reset();
      toast({ title: "Berhasil", description: "Siswa berhasil diperbarui" });
    },
    onError: (error: any) => {
        toast({ variant: "destructive", title: "Error", description: error.response?.data?.message || "Gagal memperbarui siswa" });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => {
      return api.delete(`/api/admin/students/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.students() });
      setIsDeleteOpen(false);
      setSelectedStudent(null);
      setIsDeleteOpen(false);
      setSelectedStudent(null);
      toast({ title: "Berhasil", description: "Siswa berhasil dihapus" });
    },
    onError: (error: any) => {
      toast({ 
        variant: "destructive", 
        title: "Error", 
        description: error.response?.data?.message || "Gagal menghapus siswa" 
      });
    },
  });

  const handlePhotoSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Format file tidak didukung. Gunakan JPEG, PNG, WebP, atau GIF."
      });
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Ukuran file maksimal 5MB."
      });
      return;
    }

    // Show preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setPhotoPreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);

    // Upload to Supabase
    try {
      setIsUploadingPhoto(true);
      const photoUrl = await uploadToStorage(file);
      form.setValue('photo_url', photoUrl);
      
      toast({
        title: "Success",
        description: "Foto berhasil diupload."
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Gagal mengupload foto."
      });
      setPhotoPreview(null);
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const handleRemovePhoto = () => {
    setPhotoPreview(null);
    form.setValue('photo_url', '');
  };

  function onSubmit(values: z.infer<typeof studentSchema>) {
    if (isEditOpen && selectedStudent) {
      updateMutation.mutate({ id: selectedStudent.id, data: values });
    } else {
      createMutation.mutate(values);
    }
  }

  if (isStudentsLoading) return <TableSkeleton columnCount={5} rowCount={10} />;
  if (error) return <div className="p-4 text-red-500">Gagal memuat data siswa</div>;


  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold tracking-tight">Siswa (FE)</h2>
        <Button onClick={() => setIsCreateOpen(true)}>
          <Plus className="mr-2 h-4 w-4" /> Tambah Siswa
        </Button>
      </div>
      
      <div className="border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nama</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Foto</TableHead>
              <TableHead>Publikasi</TableHead>
              <TableHead className="text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {studentsData?.data && studentsData.data.length > 0 ? (
              studentsData.data.map((student: any) => (
                <TableRow key={student.id}>
                  <TableCell className="font-medium">
                    {student.display_name || student.full_name || student.name || '-'}
                  </TableCell>
                  <TableCell>
                    {student.email || '-'}
                  </TableCell>
                  <TableCell>
                    {student.photo_url ? (
                      <img 
                        src={student.photo_url} 
                        alt={student.display_name || 'Student'} 
                        className="h-10 w-10 rounded-full object-cover"
                      />
                    ) : (
                      '-'
                    )}
                  </TableCell>
                  <TableCell>
                    {student.can_publish ? (
                      <Badge variant="default" className="bg-green-600 hover:bg-green-700">Ya</Badge>
                    ) : (
                      <Badge variant="secondary">Tidak</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setSelectedStudent(student);
                          setIsViewOpen(true);
                        }}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setSelectedStudent(student);
                          setIsEditOpen(true);
                        }}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive"
                        onClick={() => {
                          setSelectedStudent(student);
                          setIsDeleteOpen(true);
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-4 text-gray-500">
                  Tidak ada siswa ditemukan
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>

        <PaginationControls
          currentPage={page}
          totalCount={studentsData?.total || 0}
          limit={limit}
          onPageChange={setPage}
          onLimitChange={setLimit}
          isLoading={isStudentsLoading}
        />
      </div>


      {/* View Student Dialog */}
      <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
        <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detail Siswa</DialogTitle>
          </DialogHeader>
          {selectedStudent && (
            <div className="space-y-6">
              {selectedStudent.photo_url && (
                <div className="flex justify-center">
                  <img
                    src={selectedStudent.photo_url}
                    alt={selectedStudent.display_name || selectedStudent.full_name || 'Student'}
                    className="w-32 h-32 object-cover rounded-lg border"
                  />
                </div>
              )}
              <div>
                <h3 className="font-semibold text-lg border-b pb-2 mb-3">Data Dasar</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-500">Nama Lengkap</label>
                    <p className="text-sm">{selectedStudent.display_name || selectedStudent.full_name || '-'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Email</label>
                    <p className="text-sm">{selectedStudent.email || '-'}</p>
                  </div>
                </div>
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

      {/* Create Student Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Tambah Siswa Baru</DialogTitle>
            <DialogDescription>
              Isi data lengkap siswa baru.
            </DialogDescription>
          </DialogHeader>
          <StudentForm 
            form={form} 
            onSubmit={onSubmit}
            photoPreview={photoPreview}
            onPhotoSelect={handlePhotoSelect}
            onRemovePhoto={handleRemovePhoto}
            isUploading={isUploadingPhoto}
          />
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Batal</Button>
            <Button type="submit" form="student-form" disabled={createMutation.isPending}>
              {createMutation.isPending ? "Menyimpan..." : "Simpan Siswa"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Student Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
         <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Siswa</DialogTitle>
            <DialogDescription>
              Perbarui data siswa.
            </DialogDescription>
          </DialogHeader>
          <StudentForm 
            form={form} 
            onSubmit={onSubmit}
            photoPreview={photoPreview}
            onPhotoSelect={handlePhotoSelect}
            onRemovePhoto={handleRemovePhoto}
            isUploading={isUploadingPhoto}
          />
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setIsEditOpen(false)}>Batal</Button>
             <Button type="submit" form="student-form" disabled={updateMutation.isPending}>
              {updateMutation.isPending ? "Menyimpan..." : "Simpan Perubahan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Apakah anda yakin?</AlertDialogTitle>
            <AlertDialogDescription>
              Tindakan ini tidak dapat dibatalkan. Data siswa 
              <span className="font-semibold"> {selectedStudent?.display_name || selectedStudent?.full_name} </span> 
              akan dihapus permanen dari sistem.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => selectedStudent && deleteMutation.mutate(selectedStudent.id)}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleteMutation.isPending ? "Menghapus..." : "Hapus"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
