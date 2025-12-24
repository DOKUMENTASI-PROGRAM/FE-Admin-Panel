import { useState, useEffect, useMemo } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/services/api';
import { useStudents, useCourses, useInstructors, useSchedules, queryKeys } from '@/hooks/useQueries';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Plus } from 'lucide-react';
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

const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;

const studentSchema = z.object({
  // Required Fields
  display_name: z.string().min(2, "Nama minimal 2 karakter"),
  email: z.string().email("Format email tidak valid"),
  course_id: z.string().min(1, "Course harus dipilih"),
  first_choice_slot_id: z.string().min(1, "Slot pilihan 1 harus dipilih"),
  second_choice_slot_id: z.string().min(1, "Slot pilihan 2 harus dipilih"),
  preferred_days: z.array(z.string()).min(1, "Pilih minimal 1 hari"),
  preferred_time_range: z.object({
    start: z.string().regex(timeRegex, "Format waktu HH:MM"),
    end: z.string().regex(timeRegex, "Format waktu HH:MM"),
  }),

  // Optional Fields
  instructor_id: z.string().optional(),
  instrument: z.string().optional(),
  level: z.string().optional(),
  has_instrument: z.boolean().default(false),
  photo_url: z.string().optional(),
  highlight_quote: z.string().optional(),
  can_publish: z.boolean().default(false),

  // Booking details
  guardian_name: z.string().optional(),
  guardian_wa_number: z.string().optional(),
  applicant_address: z.string().optional(),
  applicant_birth_place: z.string().optional(),
  applicant_birth_date: z.string().optional(),
  applicant_school: z.string().optional(),
  applicant_class: z.union([z.string(), z.number()]).optional(),
  experience_level: z.enum(['beginner', 'intermediate', 'advanced']).optional(),
  notes: z.string().optional(),
});

interface StudentFormProps {
  form: any;
  onSubmit: (values: z.infer<typeof studentSchema>) => void;
  coursesData: any[];
  slots: any[];
  instructorsData: any[];
}

const StudentForm = ({ form, onSubmit, coursesData, slots, instructorsData }: StudentFormProps) => (
  <Form {...form}>
     <form id="student-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Data Pribadi</h3>
          <FormField
            control={form.control}
            name="display_name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nama Siswa</FormLabel>
                <FormControl>
                  <Input placeholder="Nama Lengkap" {...field} />
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
                  <Input placeholder="email@example.com" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
           <FormField
            control={form.control}
            name="guardian_name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nama Wali</FormLabel>
                <FormControl>
                  <Input placeholder="Nama Orang Tua/Wali" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="guardian_wa_number"
            render={({ field }) => (
              <FormItem>
                <FormLabel>No. WA Wali</FormLabel>
                <FormControl>
                  <Input placeholder="+62..." {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="space-y-4">
          <h3 className="text-lg font-medium">Informasi Kelahiran & Sekolah</h3>
           <FormField
            control={form.control}
            name="applicant_address"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Alamat Siswa</FormLabel>
                <FormControl>
                  <Textarea placeholder="Alamat Lengkap" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
           <div className="grid grid-cols-2 gap-2">
            <FormField
              control={form.control}
              name="applicant_birth_place"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tempat Lahir</FormLabel>
                  <FormControl>
                    <Input placeholder="Kota Lahir" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="applicant_birth_date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tanggal Lahir</FormLabel>
                  <FormControl>
                    <Input type="date" placeholder="YYYY-MM-DD" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
           <div className="grid grid-cols-2 gap-2">
            <FormField
              control={form.control}
              name="applicant_school"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Sekolah</FormLabel>
                  <FormControl>
                    <Input placeholder="Nama Sekolah" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="applicant_class"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Kelas</FormLabel>
                  <FormControl>
                    <Input placeholder="Kelas" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-lg font-medium">Kursus & Jadwal</h3>
           <FormField
            control={form.control}
            name="course_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Kursus</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih Kursus" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {coursesData.map((course: any) => (
                      <SelectItem key={course.id} value={course.id}>{course.title}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <div className="grid grid-cols-2 gap-2">
              <FormField
                control={form.control}
                name="first_choice_slot_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Pilihan Jadwal 1</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Pilih Slot" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {slots.map((slot: any) => (
                          <SelectItem key={slot.id} value={slot.id}>{slot.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
               <FormField
                control={form.control}
                name="second_choice_slot_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Pilihan Jadwal 2</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Pilih Slot" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                         {slots.map((slot: any) => (
                          <SelectItem key={slot.id} value={slot.id}>{slot.label}</SelectItem>
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
            name="instructor_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Instruktur (Opsional)</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih Instruktur" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {instructorsData.map((inst: any) => (
                      <SelectItem key={inst.id} value={inst.id}>{inst.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
         <div className="space-y-4">
           <h3 className="text-lg font-medium">Detail Musik</h3>
           <div className="grid grid-cols-2 gap-2">
              <FormField
                control={form.control}
                name="instrument"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Instrumen</FormLabel>
                    <FormControl>
                      <Input placeholder="Contoh: Piano" {...field} />
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
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                         <SelectTrigger>
                          <SelectValue placeholder="Level" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                         <SelectItem value="beginner">Beginner</SelectItem>
                         <SelectItem value="intermediate">Intermediate</SelectItem>
                         <SelectItem value="advanced">Advanced</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
           </div>
           
            <FormField
              control={form.control}
              name="experience_level"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Pengalaman Musik</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                        <SelectTrigger>
                        <SelectValue placeholder="Pilih Pengalaman" />
                        </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                        <SelectItem value="beginner">Beginner</SelectItem>
                        <SelectItem value="intermediate">Intermediate</SelectItem>
                        <SelectItem value="advanced">Advanced</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

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
                  <FormLabel>
                    Memiliki Instrumen Sendiri?
                  </FormLabel>
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
                  <FormLabel>
                    Izinkan Publikasi
                  </FormLabel>
                   <p className="text-sm text-muted-foreground">
                    Tampilkan profil siswa di halaman publik
                  </p>
                </div>
              </FormItem>
            )}
          />
         </div>

         <div className="space-y-4">
           <h3 className="text-lg font-medium">Lainnya</h3>
            <FormField
            control={form.control}
            name="highlight_quote"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Highlight Quote</FormLabel>
                <FormControl>
                  <Textarea placeholder="Quote menarik..." {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
            <FormField
              control={form.control}
              name="photo_url"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>URL Foto</FormLabel>
                  <FormControl>
                    <Input placeholder="https://..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
             <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Catatan Tambahan</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Catatan khusus..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
             {/* Hidden fields for preferred time range and days logic simplification. 
                  Ideally UI would be complex date pickers. For now relying on slot selection 
                 to imply days/time, or we can add raw inputs if strictly needed.
                 Adding simple inputs for time range to satisfy schema.
             */}
             <div className="grid grid-cols-2 gap-2">
                 <FormField
                    control={form.control}
                    name="preferred_time_range.start"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Pref. Mulai</FormLabel>
                         <FormControl>
                          <Input placeholder="14:00" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                   <FormField
                    control={form.control}
                    name="preferred_time_range.end"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Pref. Selesai</FormLabel>
                         <FormControl>
                          <Input placeholder="16:00" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
             </div>
             <FormField
                control={form.control}
                name="preferred_days"
                render={() => (
                  <FormItem>
                    <FormLabel>Hari Prioritas (Minimal 1)</FormLabel>
                    <div className="flex flex-wrap gap-2">
                      {['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].map((day) => (
                        <FormField
                          key={day}
                          control={form.control}
                          name="preferred_days"
                          render={({ field }) => {
                            return (
                              <FormItem
                                key={day}
                                className="flex flex-row items-start space-x-3 space-y-0"
                              >
                                <FormControl>
                                  <Checkbox
                                    checked={field.value?.includes(day)}
                                    onCheckedChange={(checked) => {
                                      return checked
                                        ? field.onChange([...(field.value || []), day])
                                        : field.onChange(
                                            field.value?.filter(
                                              (value: string) => value !== day
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

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const { data: studentsData, isLoading: isStudentsLoading, error } = useStudents(page, limit);
  const { data: coursesData = [] } = useCourses();
  const { data: instructorsData } = useInstructors();
  const { data: schedulesData } = useSchedules();

  const form = useForm<z.infer<typeof studentSchema>>({
    resolver: zodResolver(studentSchema),
    defaultValues: {
      has_instrument: false,
      can_publish: false,
      preferred_days: [],
      instructor_id: '', 
    },
  });

  const watchCourseId = form.watch('course_id');

  const slots = useMemo(() => {
    const schedules = schedulesData?.data || [];
    if (!schedules || schedules.length === 0) return [];
    
    // Filter by course if selected
    const filteredSchedules = watchCourseId 
      ? schedules.filter((s: any) => s.course_id === watchCourseId)
      : schedules;

    const availableSlots: any[] = [];
    filteredSchedules.forEach((schedule: any) => {
        const nestedSlots = schedule.slots || schedule.schedule || schedule.timings;
        if (Array.isArray(nestedSlots)) {
            nestedSlots.forEach((slot: any) => {
                if(slot.id) {
                     availableSlots.push({ ...slot, schedule_id: schedule.id, label: `${slot.day_of_week || 'TBD'} ${slot.start_time || ''} - ${slot.end_time || ''}` });
                }
            })
        } else if (schedule.start_time && schedule.end_time) {
             availableSlots.push({ ...schedule, schedule_id: schedule.id, label: `${schedule.day_of_week || 'TBD'} ${schedule.start_time} - ${schedule.end_time}` });
        }
    });
    return availableSlots;
  }, [schedulesData, watchCourseId]);

  useEffect(() => {
    if (isCreateOpen) {
      form.reset({
        has_instrument: false,
        can_publish: false,
        preferred_days: [],
        preferred_time_range: { start: '', end: '' },
      });
    }
  }, [isCreateOpen, form]);

  useEffect(() => {
    if (selectedStudent && isEditOpen) {
      form.reset({
         display_name: selectedStudent.display_name || selectedStudent.full_name || '',
         email: selectedStudent.email || '',
         course_id: selectedStudent.course_id || '',
         first_choice_slot_id: selectedStudent.first_choice_slot_id || '',
         second_choice_slot_id: selectedStudent.second_choice_slot_id || '',
         preferred_days: selectedStudent.preferred_days || [],
         preferred_time_range: selectedStudent.preferred_time_range || { start: '', end: '' },
         instructor_id: selectedStudent.instructor_id,
         instrument: selectedStudent.instrument,
         level: selectedStudent.level,
         has_instrument: selectedStudent.has_instrument,
         photo_url: selectedStudent.photo_url,
         highlight_quote: selectedStudent.highlight_quote,
         can_publish: selectedStudent.can_publish,
         guardian_name: selectedStudent.guardian_name,
         guardian_wa_number: selectedStudent.guardian_wa_number,
         applicant_address: selectedStudent.applicant_address,
         applicant_birth_place: selectedStudent.applicant_birth_place,
         applicant_birth_date: selectedStudent.applicant_birth_date,
         applicant_school: selectedStudent.applicant_school,
         applicant_class: selectedStudent.applicant_class,
         experience_level: selectedStudent.experience_level,
         notes: selectedStudent.notes,
      });
    }
  }, [selectedStudent, isEditOpen, form]);

  const createMutation = useMutation({
    mutationFn: (data: z.infer<typeof studentSchema>) => api.post('/api/admin/students', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.students() });
      setIsCreateOpen(false);
      form.reset();
      toast({ title: "Success", description: "Student created successfully" });
    },
    onError: (error: any) => {
        toast({ variant: "destructive", title: "Error", description: error.response?.data?.message || "Failed to create student" });
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: z.infer<typeof studentSchema> }) => api.put(`/api/admin/students/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.students() });
      setIsEditOpen(false);
      setSelectedStudent(null);
      form.reset();
      toast({ title: "Success", description: "Student updated successfully" });
    },
    onError: (error: any) => {
        toast({ variant: "destructive", title: "Error", description: error.response?.data?.message || "Failed to update student" });
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
      toast({ title: "Success", description: "Student deleted successfully" });
    },
    onError: (error: any) => {
      toast({ 
        variant: "destructive", 
        title: "Error", 
        description: error.response?.data?.message || "Failed to delete student" 
      });
    },
  });

  function onSubmit(values: z.infer<typeof studentSchema>) {
    if (isEditOpen && selectedStudent) {
      updateMutation.mutate({ id: selectedStudent.id, data: values });
    } else {
      createMutation.mutate(values);
    }
  }

  if (isStudentsLoading) return <TableSkeleton columnCount={5} rowCount={10} />;
  if (error) return <div className="p-4 text-red-500">Error loading students</div>;

  const students = studentsData?.data || [];


  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold tracking-tight">Students (FE)</h2>
        <Button onClick={() => setIsCreateOpen(true)}>
          <Plus className="mr-2 h-4 w-4" /> Add Student
        </Button>
      </div>
      
      <div className="border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Photo</TableHead>
              <TableHead>Can Publish</TableHead>
              <TableHead className="text-right">Action</TableHead>
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
                      <Badge variant="default" className="bg-green-600 hover:bg-green-700">Yes</Badge>
                    ) : (
                      <Badge variant="secondary">No</Badge>
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
                  No students found
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
            coursesData={coursesData} 
            slots={slots} 
            instructorsData={instructorsData?.data || []} 
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
            coursesData={coursesData} 
            slots={slots} 
            instructorsData={instructorsData?.data || []} 
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
