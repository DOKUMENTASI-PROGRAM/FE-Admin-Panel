import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/services/api';
import { useInstructors, queryKeys } from '@/hooks/useQueries';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from '@/components/ui/button';
import { Plus, Edit, Trash, Eye } from 'lucide-react';
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

// Schema matching documentation: POST /api/admin/instructor
const instructorSchema = z.object({
  email: z.string().email("Invalid email address"),
  full_name: z.string().min(2, "Full name is required"),
  phone_number: z.string().optional(),
  wa_number: z.string().optional(),
  bio: z.string().optional(),
  specialization: z.string().optional(),
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

  const { data, isLoading, error } = useInstructors();

  const createForm = useForm<InstructorFormValues>({
    resolver: zodResolver(instructorSchema),
    defaultValues: {
      email: "",
      full_name: "",
      phone_number: "",
      wa_number: "",
      bio: "",
      specialization: "",
    },
  });

  const editForm = useForm<Omit<InstructorFormValues, 'email'>>({
    resolver: zodResolver(instructorSchema.omit({ email: true })),
    defaultValues: {
      full_name: "",
      phone_number: "",
      wa_number: "",
      bio: "",
      specialization: "",
    },
  });

  // Create instructor - POST /api/admin/instructor
  const createMutation = useMutation({
    mutationFn: (newInstructor: InstructorFormValues) => {
      return api.post('/api/admin/instructor', newInstructor);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.instructors() });
      setIsCreateOpen(false);
      createForm.reset();
      toast({ title: "Success", description: "Instructor created successfully" });
    },
    onError: (error: any) => {
      toast({ 
        variant: "destructive", 
        title: "Error", 
        description: error.response?.data?.message || "Failed to create instructor" 
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
      toast({ title: "Success", description: "Instructor updated successfully" });
    },
    onError: (error: any) => {
      toast({ 
        variant: "destructive", 
        title: "Error", 
        description: error.response?.data?.message || "Failed to update instructor" 
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
      toast({ title: "Success", description: "Instructor deleted successfully" });
    },
    onError: (error: any) => {
      toast({ 
        variant: "destructive", 
        title: "Error", 
        description: error.response?.data?.message || "Failed to delete instructor" 
      });
    },
  });

  const handleOpenEdit = (instructor: any) => {
    setSelectedInstructor(instructor);
    editForm.reset({
      full_name: instructor.full_name || "",
      phone_number: instructor.phone_number || "",
      wa_number: instructor.wa_number || "",
      bio: instructor.bio || "",
      specialization: instructor.specialization || "",
    });
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

  if (isLoading) return <TableSkeleton columnCount={6} rowCount={10} />;
  if (error) return <div className="p-4 text-red-500">Error loading instructors</div>;

  const instructors = data?.instructors || data || [];

  // Transform instructors data - handle both string and object formats
  const transformedInstructors = Array.isArray(instructors) 
    ? instructors.map((instructor: any, index: number) => {
        if (typeof instructor === 'string') {
          return {
            id: `instructor-${index}`,
            user_id: `instructor-${index}`,
            full_name: instructor,
            email: '-',
            phone_number: '-',
            wa_number: '-',
            bio: '-',
            specialization: '-'
          };
        }
        return instructor;
      })
    : [];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold tracking-tight">Instructors</h2>
        
        {/* Create Instructor Dialog */}
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" /> Create Instructor
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Create Instructor</DialogTitle>
              <DialogDescription>
                Add a new instructor to the system. An account will be created for them.
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
                      <FormLabel>Full Name *</FormLabel>
                      <FormControl>
                        <Input placeholder="Jane Smith" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={createForm.control}
                    name="phone_number"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Phone Number</FormLabel>
                        <FormControl>
                          <Input placeholder="+628123456789" {...field} />
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
                        <FormLabel>WhatsApp Number</FormLabel>
                        <FormControl>
                          <Input placeholder="+628123456789" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={createForm.control}
                  name="specialization"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Specialization</FormLabel>
                      <FormControl>
                        <Input placeholder="Guitar, Piano, Violin" {...field} />
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
                        <Input placeholder="Experienced music instructor..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={createMutation.isPending}>
                    {createMutation.isPending ? "Creating..." : "Create Instructor"}
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
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Specialization</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {transformedInstructors.length > 0 ? (
              transformedInstructors.map((instructor: any) => (
                <TableRow key={instructor.user_id || instructor.id}>
                  <TableCell className="font-medium">{instructor.full_name}</TableCell>
                  <TableCell>{instructor.email || '-'}</TableCell>
                  <TableCell>{instructor.phone_number || instructor.wa_number || '-'}</TableCell>
                  <TableCell>{instructor.specialization || '-'}</TableCell>
                  <TableCell className="text-right space-x-1">
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={() => handleOpenView(instructor)}
                      title="View Details"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={() => handleOpenEdit(instructor)}
                      title="Edit"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon"
                      className="text-destructive hover:text-destructive"
                      onClick={() => handleOpenDelete(instructor)}
                      title="Delete"
                    >
                      <Trash className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-4 text-gray-500">
                  No instructors found
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* View Instructor Dialog */}
      <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Instructor Details</DialogTitle>
          </DialogHeader>
          {selectedInstructor && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">Full Name</label>
                  <p className="text-sm">{selectedInstructor.full_name || '-'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Email</label>
                  <p className="text-sm">{selectedInstructor.email || '-'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Phone Number</label>
                  <p className="text-sm">{selectedInstructor.phone_number || '-'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">WhatsApp</label>
                  <p className="text-sm">{selectedInstructor.wa_number || '-'}</p>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Specialization</label>
                <p className="text-sm">{selectedInstructor.specialization || '-'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Bio</label>
                <p className="text-sm">{selectedInstructor.bio || '-'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Created At</label>
                <p className="text-sm">
                  {selectedInstructor.created_at 
                    ? new Date(selectedInstructor.created_at).toLocaleDateString() 
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

      {/* Edit Instructor Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit Instructor</DialogTitle>
            <DialogDescription>
              Update instructor information.
            </DialogDescription>
          </DialogHeader>
          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-4">
              <FormField
                control={editForm.control}
                name="full_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full Name *</FormLabel>
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
                  name="phone_number"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone Number</FormLabel>
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
                      <FormLabel>WhatsApp Number</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={editForm.control}
                name="specialization"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Specialization</FormLabel>
                    <FormControl>
                      <Input {...field} />
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
              This will permanently delete the instructor "{selectedInstructor?.full_name}". 
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (selectedInstructor) {
                  deleteMutation.mutate(selectedInstructor.user_id || selectedInstructor.id);
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
