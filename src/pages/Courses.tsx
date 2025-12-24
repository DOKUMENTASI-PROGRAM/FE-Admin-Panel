import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/services/api';
import { useCourses, useInstructors, queryKeys } from '@/hooks/useQueries';
import { CreateScheduleDialog } from "@/components/CreateScheduleDialog";
import { AssignRoomDialog } from "@/components/AssignRoomDialog";
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
  title: z.string().min(2, "Title is required"),
  description: z.string().optional(),
  instrument: z.string().min(1, "Instrument is required"),
  level: z.string().min(1, "Level is required"),
  duration_weeks: z.coerce.number().min(1),
  sessions_per_week: z.coerce.number().min(1),
  price: z.coerce.number().min(0),
  instructor_id: z.string().optional(),
  max_students: z.coerce.number().min(1),
  is_active: z.boolean(),
});

type UpdateCourseFormValues = z.infer<typeof updateCourseSchema>;

export default function CoursesPage() {
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState<any>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  
  const { data: coursesData, isLoading, error } = useCourses(page, limit);
  const { data: instructorsData } = useInstructors();

  const editForm = useForm<UpdateCourseFormValues>({
    resolver: zodResolver(updateCourseSchema),
    defaultValues: {
      title: "",
      description: "",
      instrument: "",
      level: "Beginner",
      duration_weeks: 4,
      sessions_per_week: 1,
      price: 0,
      instructor_id: "",
      max_students: 5,
      is_active: true,
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
        duration_weeks: selectedCourse.duration_weeks || 4,
        sessions_per_week: selectedCourse.sessions_per_week || 1,
        price: selectedCourse.price || selectedCourse.price_per_session || 0,
        instructor_id: selectedCourse.instructor_id || "",
        max_students: selectedCourse.max_students || 5,
        is_active: selectedCourse.is_active !== undefined ? selectedCourse.is_active : true,
      });
    }
  }, [selectedCourse, editForm]);

  // Update course - PUT /courses/:id
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateCourseFormValues }) => {
      return api.put(`/courses/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.courses() });
      setIsEditOpen(false);
      setSelectedCourse(null);
      editForm.reset();
      toast({ title: "Success", description: "Course updated successfully" });
    },
    onError: (error: any) => {
      toast({ 
        variant: "destructive", 
        title: "Error", 
        description: error.response?.data?.message || "Failed to update course" 
      });
    },
  });

  // Delete course - DELETE /courses/:id
  const deleteMutation = useMutation({
    mutationFn: (id: string) => {
      return api.delete(`/courses/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.courses() });
      setIsDeleteOpen(false);
      setSelectedCourse(null);
      toast({ title: "Success", description: "Course deleted successfully" });
    },
    onError: (error: any) => {
      toast({ 
        variant: "destructive", 
        title: "Error", 
        description: error.response?.data?.message || "Failed to delete course" 
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

  const instructors = instructorsData?.data || [];

  if (isLoading) return <TableSkeleton columnCount={7} rowCount={10} />;
  if (error) return <div>Error loading courses</div>;

  const courses = coursesData?.data || [];
  const totalCourses = coursesData?.total || 0;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold tracking-tight">Courses</h2>
        <CreateCourseDialog />
      </div>
      
      <div className="border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Instructor</TableHead>
              <TableHead>Instrument</TableHead>
              <TableHead>Level</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Students</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {courses.map((course: any) => (
              <TableRow key={course.id}>
                <TableCell className="font-medium">{course.title}</TableCell>
                <TableCell>{course.instructor_name || '-'}</TableCell>
                <TableCell>{course.instrument || '-'}</TableCell>
                <TableCell>{course.level}</TableCell>
                <TableCell>
                  <Badge variant={course.is_active ? 'default' : 'secondary'}>
                    {course.is_active ? 'active' : 'inactive'}
                  </Badge>
                </TableCell>
                <TableCell>{course.total_students || 0}</TableCell>
                <TableCell>
                  <div className="flex space-x-1">
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={() => handleOpenView(course)}
                      title="View Details"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={() => handleOpenEdit(course)}
                      title="Edit"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon"
                      className="text-destructive hover:text-destructive"
                      onClick={() => handleOpenDelete(course)}
                      title="Delete"
                    >
                      <Trash className="h-4 w-4" />
                    </Button>
                    <CreateScheduleDialog courseId={course.id} courseTitle={course.title} />
                    <AssignRoomDialog courseId={course.id} courseTitle={course.title} />
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <PaginationControls
          currentPage={page}
          totalCount={totalCourses}
          limit={limit}
          onPageChange={setPage}
          onLimitChange={setLimit}
          isLoading={isLoading}
        />
      </div>

      {/* View Course Dialog */}
      <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Course Details</DialogTitle>
          </DialogHeader>
          {selectedCourse && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">Title</label>
                  <p className="text-sm font-semibold">{selectedCourse.title || '-'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Status</label>
                  <p className="text-sm">
                    <Badge variant={selectedCourse.is_active ? 'default' : 'secondary'}>
                      {selectedCourse.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Instructor</label>
                  <p className="text-sm">{selectedCourse.instructor_name || '-'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Instrument</label>
                  <p className="text-sm">{selectedCourse.instrument || '-'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Level</label>
                  <p className="text-sm">{selectedCourse.level || '-'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Max Students</label>
                  <p className="text-sm">{selectedCourse.max_students || '-'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Duration (Weeks)</label>
                  <p className="text-sm">{selectedCourse.duration_weeks || '-'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Sessions/Week</label>
                  <p className="text-sm">{selectedCourse.sessions_per_week || '-'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Price</label>
                  <p className="text-sm">
                    {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' })
                      .format(selectedCourse.price || selectedCourse.price_per_session || 0)}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Total Students</label>
                  <p className="text-sm">{selectedCourse.total_students || 0}</p>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Description</label>
                <p className="text-sm">{selectedCourse.description || '-'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Created At</label>
                <p className="text-sm">
                  {selectedCourse.created_at 
                    ? new Date(selectedCourse.created_at).toLocaleDateString() 
                    : '-'}
                </p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsViewOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Course Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Course</DialogTitle>
            <DialogDescription>
              Update course information.
            </DialogDescription>
          </DialogHeader>
          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-4">
              <FormField
                control={editForm.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Title</FormLabel>
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
                    <FormLabel>Description</FormLabel>
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
                      <FormLabel>Instrument</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
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
                            <SelectValue placeholder="Select level" />
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
                  control={editForm.control}
                  name="instructor_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Instructor</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select instructor" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {instructors.map((instructor: any) => (
                            <SelectItem 
                              key={instructor.user_id || instructor.id} 
                              value={instructor.user_id || instructor.id}
                            >
                              {instructor.full_name || instructor.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editForm.control}
                  name="max_students"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Max Students</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <FormField
                  control={editForm.control}
                  name="duration_weeks"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Duration (Weeks)</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editForm.control}
                  name="sessions_per_week"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Sessions/Week</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editForm.control}
                  name="price"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Price</FormLabel>
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
                        <SelectItem value="true">Active</SelectItem>
                        <SelectItem value="false">Inactive</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsEditOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={updateMutation.isPending}>
                  {updateMutation.isPending ? "Saving..." : "Save Changes"}
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
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the course "{selectedCourse?.title}". 
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (selectedCourse) {
                  deleteMutation.mutate(selectedCourse.id);
                }
              }}
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
