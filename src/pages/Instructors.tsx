import { useState, useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/services/api';
import { useInstructors, queryKeys } from '@/hooks/useQueries';
import { uploadToStorage } from '@/lib/supabase';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from '@/components/ui/button';
import { Plus, Edit, Trash, Eye, Upload, X, Loader2 } from 'lucide-react';
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { TableSkeleton } from '@/components/TableSkeleton';
import { PaginationControls } from '@/components/ui/pagination-controls';
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
import { MultiSelect, Option } from '@/components/ui/multi-select';

const SPECIALIZATION_OPTIONS: Option[] = [
  { label: 'Vokal', value: 'Vokal' },
  { label: 'Piano', value: 'Piano' },
  { label: 'Drum', value: 'Drum' },
  { label: 'Bass', value: 'Bass' },
  { label: 'Gitar', value: 'Guitar' },
  { label: 'Keyboard', value: 'Keyboard' }
];

const TEACHING_CATEGORY_OPTIONS: Option[] = [
  { label: 'Reguler', value: 'Reguler' },
  { label: 'Hobby', value: 'Hobby' },
  { label: 'Karyawan', value: 'Karyawan' },
  { label: 'Ministry', value: 'Ministry' },
  { label: 'Privat', value: 'Privat' },
];

const instructorSchema = z.object({
  email: z.string().email("Format email tidak valid"),
  full_name: z.string().min(2, "Nama lengkap wajib diisi"),
  wa_number: z.string().optional(),
  bio: z.string().optional(),
  specialization: z.array(z.string()).optional(),
  teaching_categories: z.array(z.string()).optional(),
  photo_url: z.string().optional(),
});

type InstructorFormValues = z.infer<typeof instructorSchema>;

export default function InstructorsPage() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedInstructor, setSelectedInstructor] = useState<any>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Photo upload states
  const [createPhotoPreview, setCreatePhotoPreview] = useState<string | null>(null);
  const [editPhotoPreview, setEditPhotoPreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const createFileInputRef = useRef<HTMLInputElement>(null);
  const editFileInputRef = useRef<HTMLInputElement>(null);

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const { data, isLoading, error } = useInstructors(page, limit);

  const createForm = useForm<InstructorFormValues>({
    resolver: zodResolver(instructorSchema),
    defaultValues: {
      email: "",
      full_name: "",
      wa_number: "",
      bio: "",
      specialization: [],
      photo_url: "",
    },
  });

  const editForm = useForm<Omit<InstructorFormValues, 'email'>>({
    resolver: zodResolver(instructorSchema.omit({ email: true })),
    defaultValues: {
      full_name: "",
      wa_number: "",
      bio: "",
      specialization: [],
      photo_url: "",
    },
  });

  // Create instructor - POST /api/admin/instructor
  const createMutation = useMutation({
    mutationFn: (newInstructor: InstructorFormValues) => {
      // Ensure payload matches the requested structure
      return api.post('/api/admin/instructor', {
        email: newInstructor.email,
        full_name: newInstructor.full_name,
        wa_number: newInstructor.wa_number,
        bio: newInstructor.bio,
        specialization: newInstructor.specialization,
        teaching_categories: newInstructor.teaching_categories,
        photo_url: newInstructor.photo_url
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.instructors() });
      setIsCreateOpen(false);
      createForm.reset();
      setCreatePhotoPreview(null);
      if (createFileInputRef.current) createFileInputRef.current.value = '';
      toast({ title: "Berhasil", description: "Instruktur berhasil dibuat" });
    },
    onError: (error: any) => {
      toast({ 
        variant: "destructive", 
        title: "Error", 
        description: error.response?.data?.message || "Gagal membuat instruktur" 
      });
    },
  });

  // Update instructor - PUT /api/admin/instructor/:id
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<InstructorFormValues> }) => {
      return api.put(`/api/admin/instructor/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.instructors() });
      setIsEditOpen(false);
      setSelectedInstructor(null);
      editForm.reset();
      setEditPhotoPreview(null);
      if (editFileInputRef.current) editFileInputRef.current.value = '';
      toast({ title: "Berhasil", description: "Instruktur berhasil diperbarui" });
    },
    onError: (error: any) => {
      toast({ 
        variant: "destructive", 
        title: "Error", 
        description: error.response?.data?.message || "Gagal memperbarui instruktur" 
      });
    },
  });

  // Delete instructor - DELETE /api/admin/instructor/:id
  const deleteMutation = useMutation({
    mutationFn: (id: string) => {
      return api.delete(`/api/admin/instructor/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.instructors() });
      setIsDeleteOpen(false);
      setSelectedInstructor(null);
      toast({ title: "Berhasil", description: "Instruktur berhasil dihapus" });
    },
    onError: (error: any) => {
      toast({ 
        variant: "destructive", 
        title: "Error", 
        description: error.response?.data?.message || "Gagal menghapus instruktur" 
      });
    },
  });

  const handleOpenEdit = (instructor: any) => {
    setSelectedInstructor(instructor);
    editForm.reset({
      full_name: instructor.full_name || "",
      wa_number: instructor.wa_number || "",
      bio: instructor.bio || "",
      specialization: Array.isArray(instructor.specialization) ? instructor.specialization : [],
      teaching_categories: Array.isArray(instructor.teaching_categories) ? instructor.teaching_categories : [],
      photo_url: instructor.photo_url || "",
    });
    setEditPhotoPreview(instructor.photo_url || null);
    setIsEditOpen(true);
  };

  const handleOpenView = (instructor: any) => {
    setSelectedInstructor(instructor);
    setIsViewOpen(true);
  };

  const handleOpenDelete = (instructor: any) => {
    setSelectedInstructor(instructor);
    setIsDeleteOpen(true);
  };

  function onCreateSubmit(values: InstructorFormValues) {
    createMutation.mutate(values);
  }

  function onEditSubmit(values: Partial<InstructorFormValues>) {
    if (selectedInstructor) {
      updateMutation.mutate({ 
        id: selectedInstructor.user_id || selectedInstructor.id, 
        data: values 
      });
    }
  }

  const handlePhotoSelect = async (event: React.ChangeEvent<HTMLInputElement>, isEdit: boolean = false) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Format file tidak valid. Gunakan JPEG, PNG, WebP, atau GIF."
      });
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Ukuran file harus kurang dari 5MB."
      });
      return;
    }

    // Show preview
    const reader = new FileReader();
    reader.onload = (e) => {
      if (isEdit) {
        setEditPhotoPreview(e.target?.result as string);
      } else {
        setCreatePhotoPreview(e.target?.result as string);
      }
    };
    reader.readAsDataURL(file);

    // Upload to Supabase
    try {
      setIsUploading(true);
      const photoUrl = await uploadToStorage(file);

      if (isEdit) {
        editForm.setValue('photo_url', photoUrl);
      } else {
        createForm.setValue('photo_url', photoUrl);
      }

      toast({
        title: "Berhasil",
        description: "Foto berhasil diunggah"
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Gagal mengunggah foto"
      });
      // Reset preview on error
      if (isEdit) {
        setEditPhotoPreview(null);
      } else {
        setCreatePhotoPreview(null);
      }
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemovePhoto = (isEdit: boolean = false) => {
    if (isEdit) {
      setEditPhotoPreview(null);
      editForm.setValue('photo_url', '');
      if (editFileInputRef.current) {
        editFileInputRef.current.value = '';
      }
    } else {
      setCreatePhotoPreview(null);
      createForm.setValue('photo_url', '');
      if (createFileInputRef.current) {
        createFileInputRef.current.value = '';
      }
    }
  };

  if (isLoading) return <TableSkeleton columnCount={6} rowCount={10} />;
  if (error) return <div className="p-4 text-red-500">Error memuat instruktur</div>;

  const instructors = data?.data || [];

  // Transform instructors data - handle both string and object formats
  const transformedInstructors = Array.isArray(instructors) 
    ? instructors.map((instructor: any, index: number) => {
        if (typeof instructor === 'string') {
          return {
            id: `instructor-${index}`,
            user_id: `instructor-${index}`,
            full_name: instructor,
            email: '-',
            wa_number: '-',
            bio: '-',
            specialization: '-',
            teaching_categories: '-',
            photo_url: '-',
          };
        }
        return instructor;
      })
    : [];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold tracking-tight">Instruktur</h2>
        
        {/* Create Instructor Dialog */}
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" /> Buat Instruktur
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Buat Instruktur</DialogTitle>
              <DialogDescription>
                Tambahkan instruktur baru ke sistem. Akun akan dibuat untuk mereka.
              </DialogDescription>
            </DialogHeader>
            <Form {...createForm}>
              <form onSubmit={createForm.handleSubmit(onCreateSubmit)} className="space-y-4">
                <FormField
                  control={createForm.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email *</FormLabel>
                      <FormControl>
                        <Input placeholder="instructor@example.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={createForm.control}
                  name="full_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nama Lengkap *</FormLabel>
                      <FormControl>
                        <Input placeholder="Nama Instruktur" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={createForm.control}
                  name="wa_number"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nomor WhatsApp</FormLabel>
                      <FormControl>
                        <Input placeholder="+628123456789" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={createForm.control}
                  name="specialization"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Spesialisasi</FormLabel>
                      <FormControl>
                        <MultiSelect
                          options={SPECIALIZATION_OPTIONS}
                          selected={field.value || []}
                          onChange={field.onChange}
                          placeholder="Pilih spesialisasi..."
                          className="w-full"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={createForm.control}
                  name="teaching_categories"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Kategori Mengajar</FormLabel>
                      <FormControl>
                        <MultiSelect
                          options={TEACHING_CATEGORY_OPTIONS}
                          selected={field.value || []}
                          onChange={field.onChange}
                          placeholder="Pilih kategori..."
                          className="w-full"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={createForm.control}
                  name="bio"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Bio</FormLabel>
                      <FormControl>
                        <Input placeholder="Instruktur musik berpengalaman..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={createForm.control}
                  name="photo_url"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Foto</FormLabel>
                      <FormControl>
                        <div className="space-y-4">
                          <Input
                            type="hidden"
                            {...field}
                          />
                          <div className="flex items-center gap-4">
                            {createPhotoPreview ? (
                              <div className="relative w-24 h-24">
                                <img
                                  src={createPhotoPreview}
                                  alt="Preview"
                                  className="w-full h-full object-cover rounded-full border"
                                />
                                <button
                                  type="button"
                                  onClick={() => handleRemovePhoto(false)}
                                  className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground rounded-full p-1 hover:bg-destructive/90 transition-colors"
                                >
                                  <X className="h-3 w-3" />
                                </button>
                              </div>
                            ) : (
                              <div className="w-24 h-24 rounded-full border-2 border-dashed flex items-center justify-center bg-muted/50 text-muted-foreground">
                                <Upload className="h-8 w-8 opacity-50" />
                              </div>
                            )}
                            <div className="flex-1">
                              <Button
                                type="button"
                                variant="outline"
                                className="w-full mb-2"
                                onClick={() => createFileInputRef.current?.click()}
                                disabled={isUploading}
                              >
                                <Upload className="mr-2 h-4 w-4" /> 
                                {createForm.getValues('photo_url') ? "Ganti Foto" : "Pilih Foto"}
                              </Button>
                              <Input
                                ref={createFileInputRef}
                                type="file"
                                accept="image/jpeg,image/png,image/webp,image/gif"
                                onChange={(e) => handlePhotoSelect(e, false)}
                                disabled={isUploading}
                                className="hidden"
                              />
                              <p className="text-xs text-muted-foreground mt-2">
                                Ukuran maks 5MB. Format: JPG, PNG, WebP, GIF.
                              </p>
                            </div>
                          </div>
                          {isUploading && (
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Loader2 className="h-4 w-4 animate-spin" />
                              Mengunggah...
                            </div>
                          )}
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>
                    Batal
                  </Button>
                  <Button type="submit" disabled={createMutation.isPending}>
                    {createMutation.isPending ? "Membuat..." : "Buat Instruktur"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>
      
      {/* Instructors Table */}
      <div className="border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nama</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>WhatsApp</TableHead>
              <TableHead>Spesialisasi</TableHead>
              <TableHead>Kategori Mengajar</TableHead>
              <TableHead className="text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {transformedInstructors.length > 0 ? (
              transformedInstructors.map((instructor: any) => (
                <TableRow key={instructor.user_id || instructor.id}>
                  <TableCell className="font-medium">{instructor.full_name}</TableCell>
                  <TableCell>{instructor.email || '-'}</TableCell>
                  <TableCell>{instructor.wa_number || '-'}</TableCell>
                  <TableCell>{Array.isArray(instructor.specialization) ? instructor.specialization.join(', ') : (instructor.specialization || '-')}</TableCell>
                  <TableCell>{Array.isArray(instructor.teaching_categories) ? instructor.teaching_categories.join(', ') : (instructor.teaching_categories || '-')}</TableCell>
                  <TableCell className="text-right space-x-1">
                    <Button 
                      variant="ghost" 
                      size="icon"
                      className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                      onClick={() => handleOpenView(instructor)}
                      title="Lihat Detail"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon"
                      className="text-amber-600 hover:text-amber-700 hover:bg-amber-50"
                      onClick={() => handleOpenEdit(instructor)}
                      title="Edit"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon"
                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={() => handleOpenDelete(instructor)}
                      title="Hapus"
                    >
                      <Trash className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-4 text-gray-500">
                  Tidak ada instruktur ditemukan
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
        <PaginationControls
          currentPage={page}
          totalCount={data?.total || 0}
          limit={limit}
          onPageChange={setPage}
          onLimitChange={setLimit}
          isLoading={isLoading}
        />
      </div>

      <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detail Instruktur</DialogTitle>
          </DialogHeader>
          {selectedInstructor && (
            <div className="space-y-6">
                {/* Header Section */}
                <div className="flex flex-col items-center space-y-4">
                  <div className="relative">
                    {selectedInstructor.photo_url ? (
                      <img 
                        src={selectedInstructor.photo_url} 
                        alt={selectedInstructor.full_name} 
                        className="w-32 h-32 object-cover rounded-full border-4 border-background shadow-lg"
                      />
                    ) : (
                      <div className="w-32 h-32 rounded-full bg-muted flex items-center justify-center border-4 border-background shadow-lg">
                        <span className="text-4xl text-muted-foreground font-semibold">
                          {selectedInstructor.full_name?.charAt(0) || '?'}
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="text-center space-y-2">
                    <h3 className="text-2xl font-bold">{selectedInstructor.full_name}</h3>
                    <Badge variant="secondary" className="px-3 py-1 text-base">
                      {Array.isArray(selectedInstructor.specialization) 
                        ? selectedInstructor.specialization.join(', ') 
                        : (selectedInstructor.specialization || 'Instruktur Umum')}
                    </Badge>
                  </div>
                </div>

                <div className="h-px bg-border w-full" />

                {/* Contact Information */}
                <div>
                  <h3 className="font-semibold text-lg border-b pb-2 mb-3">Informasi Kontak</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-500">Email</label>
                      <p className="text-sm">{selectedInstructor.email || '-'}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">WhatsApp</label>
                      <p className="text-sm">{selectedInstructor.wa_number || '-'}</p>
                    </div>
                  </div>
                </div>

                {/* Additional Info */}
                <div>
                  <h3 className="font-semibold text-lg border-b pb-2 mb-3">Info Tambahan</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-500">Bio</label>
                      <p className="text-sm leading-relaxed text-foreground/90">
                        {selectedInstructor.bio || 'Tidak ada bio.'}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Bergabung</label>
                      <p className="text-sm">
                        {selectedInstructor.created_at 
                          ? new Date(selectedInstructor.created_at).toLocaleDateString("id-ID", {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric'
                            }) 
                          : '-'}
                      </p>
                    </div>
                  </div>
                </div>
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setIsViewOpen(false)}>
              Tutup
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Instructor Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Instruktur</DialogTitle>
            <DialogDescription>
              Perbarui informasi instruktur.
            </DialogDescription>
          </DialogHeader>
          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-4">
              <FormField
                control={editForm.control}
                name="full_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nama Lengkap *</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
                <FormField
                  control={editForm.control}
                  name="wa_number"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nomor WhatsApp</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              <FormField
                control={editForm.control}
                name="specialization"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Spesialisasi</FormLabel>
                    <FormControl>
                        <MultiSelect
                          options={SPECIALIZATION_OPTIONS}
                          selected={field.value || []}
                          onChange={field.onChange}
                          placeholder="Pilih spesialisasi..."
                          className="w-full"
                        />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editForm.control}
                name="teaching_categories"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Kategori Mengajar</FormLabel>
                    <FormControl>
                      <MultiSelect
                        options={TEACHING_CATEGORY_OPTIONS}
                        selected={field.value || []}
                        onChange={field.onChange}
                        placeholder="Pilih kategori..."
                        className="w-full"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editForm.control}
                name="bio"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Bio</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editForm.control}
                name="photo_url"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Foto</FormLabel>
                    <FormControl>
                      <div className="space-y-4">
                        <Input
                          type="hidden"
                          {...field}
                        />
                        <div className="flex items-center gap-4">
                          {editPhotoPreview ? (
                            <div className="relative w-24 h-24">
                              <img
                                src={editPhotoPreview}
                                alt="Preview"
                                className="w-full h-full object-cover rounded-full border"
                              />
                              <button
                                type="button"
                                onClick={() => handleRemovePhoto(true)}
                                className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground rounded-full p-1 hover:bg-destructive/90 transition-colors"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </div>
                          ) : (
                            <div className="w-24 h-24 rounded-full border-2 border-dashed flex items-center justify-center bg-muted/50 text-muted-foreground">
                              <Upload className="h-8 w-8 opacity-50" />
                            </div>
                          )}
                          <div className="flex-1">
                            <Button
                              type="button"
                              variant="outline"
                              className="w-full mb-2"
                              onClick={() => editFileInputRef.current?.click()}
                              disabled={isUploading}
                            >
                              <Upload className="mr-2 h-4 w-4" />
                              {editForm.getValues('photo_url') ? "Ganti Foto" : "Pilih Foto"}
                            </Button>
                            <Input
                              ref={editFileInputRef}
                              type="file"
                              accept="image/jpeg,image/png,image/webp,image/gif"
                              onChange={(e) => handlePhotoSelect(e, true)}
                              disabled={isUploading}
                              className="hidden"
                            />
                            <p className="text-xs text-muted-foreground mt-2">
                              Ukuran maks 5MB. Format: JPG, PNG, WebP, GIF.
                            </p>
                          </div>
                        </div>
                        {isUploading && (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Mengunggah...
                          </div>
                        )}
                      </div>
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
              Tindakan ini akan menghapus instruktur "{selectedInstructor?.full_name}" secara permanen. 
              Tindakan ini tidak dapat dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (selectedInstructor) {
                  deleteMutation.mutate(selectedInstructor.user_id || selectedInstructor.id);
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
