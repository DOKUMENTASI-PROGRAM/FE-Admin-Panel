import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { paymentService } from '@/services/paymentService';
import { Payment, PaymentStatus, PaymentMethod, PaymentType } from '@/types/payment';
import { Button } from '@/components/ui/button'; // Assuming these exist
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useToast } from '@/components/ui/use-toast';
import { Plus, Pencil, Trash2, Search, Check, ChevronsUpDown } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { useBookings } from '@/hooks/useQueries';
import { cn } from '@/lib/utils';

export default function PaymentsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [openCombobox, setOpenCombobox] = useState(false);

  // Form states
  const [formData, setFormData] = useState({
    student_id: '',
    amount: '',
    payment_date: new Date().toISOString().split('T')[0],
    payment_method: 'transfer' as PaymentMethod,
    payment_type: 'monthly' as PaymentType,
    status: 'success' as PaymentStatus,
    notes: '',
  });

  // Fetch Bookings for auto-suggestion
  const { data: bookingsData } = useBookings();

  // Create unique list of confirmed students from bookings
  const students = useMemo(() => {
    // Handle both array and object response formats (consistent with Bookings.tsx)
    const bookings = Array.isArray(bookingsData) ? bookingsData : (bookingsData?.bookings || []);
    
    if (!bookings || !Array.isArray(bookings)) return [];
    
    // Filter for confirmed bookings and map to student info
    const confirmedBookings = bookings.filter((b: any) => b.status === 'confirmed');
    
    // Create a map to ensure uniqueness by user_id
    const studentMap = new Map();
    
    confirmedBookings.forEach((b: any) => {
      if (b.user_id && !studentMap.has(b.user_id)) {
        studentMap.set(b.user_id, {
          id: b.user_id,
          name: b.applicant_full_name || b.user_id, // Fallback to ID if name missing
          school: b.applicant_school
        });
      }
    });

    return Array.from(studentMap.values());
  }, [bookingsData]);

  // Fetch Payments
  const { data: paymentsResponse, isLoading } = useQuery({
    queryKey: ['payments', search],
    queryFn: () => paymentService.getPayments({ search }),
  });

  const payments = paymentsResponse?.data?.payments || [];

  // Mutations
  const createMutation = useMutation({
    mutationFn: paymentService.createPayment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      setIsAddOpen(false);
      resetForm();
      toast({ title: 'Success', description: 'Payment created successfully' });
    },
    onError: (error: any) => {
      toast({ variant: 'destructive', title: 'Error', description: error.response?.data?.message || 'Failed to create payment' });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => paymentService.updatePayment(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      setIsEditOpen(false);
      resetForm();
      toast({ title: 'Success', description: 'Payment updated successfully' });
    },
    onError: (error: any) => {
      toast({ variant: 'destructive', title: 'Error', description: error.response?.data?.message || 'Failed to update payment' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: paymentService.deletePayment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      toast({ title: 'Success', description: 'Payment deleted successfully' });
    },
    onError: (error: any) => {
      toast({ variant: 'destructive', title: 'Error', description: error.response?.data?.message || 'Failed to delete payment' });
    },
  });

  const resetForm = () => {
    setFormData({
      student_id: '',
      amount: '',
      payment_date: new Date().toISOString().split('T')[0],
      payment_method: 'transfer',
      payment_type: 'monthly',
      status: 'success',
      notes: '',
    });
    setSelectedPayment(null);
  };

  const handleEditClick = (payment: Payment) => {
    setSelectedPayment(payment);
    setFormData({
      student_id: payment.student_id, // Note: In real app, might need to handle display/value diff if student_id not directly available or needs lookup
      amount: String(payment.amount),
      payment_date: payment.payment_date.split('T')[0],
      payment_method: payment.payment_method,
      payment_type: payment.payment_type,
      status: payment.status,
      notes: payment.notes || '',
    });
    setIsEditOpen(true);
  };

  const handleDeleteClick = (id: string) => {
    if (confirm('Are you sure you want to delete this payment?')) {
      deleteMutation.mutate(id);
    }
  };

  const handleSubmit = (e: React.FormEvent, isEdit: boolean) => {
    e.preventDefault();
    const payload = {
      ...formData,
      amount: Number(formData.amount),
    };

    if (isEdit && selectedPayment) {
      updateMutation.mutate({ id: selectedPayment.id, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Payments</h2>
          <p className="text-muted-foreground">Manage student payments and transaction history.</p>
        </div>
        <Button onClick={() => { resetForm(); setIsAddOpen(true); }}>
          <Plus className="mr-2 h-4 w-4" /> Add Payment
        </Button>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search payments..."
            className="pl-8"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        {/* Add filters here if needed */}
      </div>

      <div className="border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Student</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Method</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8">Loading...</TableCell>
              </TableRow>
            ) : payments.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8">No payments found</TableCell>
              </TableRow>
            ) : (
              payments.map((payment: Payment) => (
                <TableRow key={payment.id}>
                  <TableCell>{new Date(payment.payment_date).toLocaleDateString()}</TableCell>
                  <TableCell className="font-medium">{payment.student_name || payment.student_id}</TableCell>
                  <TableCell className="capitalize">{payment.payment_type}</TableCell>
                  <TableCell className="capitalize">{payment.payment_method.replace('_', ' ')}</TableCell>
                  <TableCell>Rp {payment.amount.toLocaleString()}</TableCell>
                  <TableCell>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize
                      ${payment.status === 'success' ? 'bg-green-100 text-green-800' : 
                        payment.status === 'pending' ? 'bg-yellow-100 text-yellow-800' : 
                        'bg-red-100 text-red-800'}`}>
                      {payment.status}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="icon" onClick={() => handleEditClick(payment)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-600" onClick={() => handleDeleteClick(payment.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Add Dialog */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="overflow-y-visible">
          <DialogHeader>
            <DialogTitle>Add New Payment</DialogTitle>
            <DialogDescription>Record a new payment transaction.</DialogDescription>
          </DialogHeader>
          <form onSubmit={(e) => handleSubmit(e, false)}>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2 flex flex-col">
                <Label htmlFor="student_id">Student Name (Auto-suggestion)</Label>
                <Popover open={openCombobox} onOpenChange={setOpenCombobox}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={openCombobox}
                      className="justify-between"
                    >
                      {formData.student_id
                        ? students.find((student) => student.id === formData.student_id)?.name || formData.student_id
                        : "Select student..."}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[400px] p-0">
                    <Command>
                      <CommandInput placeholder="Search student..." />
                      <CommandList>
                        <CommandEmpty>No student found.</CommandEmpty>
                        <CommandGroup>
                          {students.map((student) => (
                            <CommandItem
                              key={student.id}
                              value={`${student.name} ${student.id}`}
                              onSelect={() => {
                                setFormData({...formData, student_id: student.id});
                                setOpenCombobox(false);
                              }}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  formData.student_id === student.id ? "opacity-100" : "opacity-0"
                                )}
                              />
                              <div className="flex flex-col">
                                <span>{student.name}</span>
                                {student.school && <span className="text-xs text-muted-foreground">{student.school}</span>}
                                <span className="text-[10px] text-muted-foreground hidden">{student.id}</span>
                              </div>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="amount">Amount</Label>
                <Input id="amount" type="number" required value={formData.amount} onChange={(e) => setFormData({...formData, amount: e.target.value})} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="payment_date">Date</Label>
                <Input id="payment_date" type="date" required value={formData.payment_date} onChange={(e) => setFormData({...formData, payment_date: e.target.value})} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Type</Label>
                  <Select value={formData.payment_type} onValueChange={(val: PaymentType) => setFormData({...formData, payment_type: val})}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="monthly">Monthly</SelectItem>
                      <SelectItem value="registration">Registration</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label>Method</Label>
                  <Select value={formData.payment_method} onValueChange={(val: PaymentMethod) => setFormData({...formData, payment_method: val})}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="transfer">Transfer</SelectItem>
                      <SelectItem value="cash">Cash</SelectItem>
                      <SelectItem value="qris">QRIS</SelectItem>
                      <SelectItem value="virtual_account">Virtual Account</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="notes">Notes</Label>
                <Input id="notes" value={formData.notes} onChange={(e) => setFormData({...formData, notes: e.target.value})} />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsAddOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={createMutation.isPending}>Save Payment</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Payment</DialogTitle>
          </DialogHeader>
          <form onSubmit={(e) => handleSubmit(e, true)}>
            <div className="grid gap-4 py-4">
               {/* Simplified edit form - usually maybe only status or amounts can be edited */}
              <div className="grid gap-2">
                <Label htmlFor="edit_status">Status</Label>
                <Select value={formData.status} onValueChange={(val: PaymentStatus) => setFormData({...formData, status: val})}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="success">Success</SelectItem>
                      <SelectItem value="failed">Failed</SelectItem>
                    </SelectContent>
                  </Select>
              </div>
               <div className="grid gap-2">
                <Label htmlFor="edit_notes">Notes</Label>
                <Input id="edit_notes" value={formData.notes} onChange={(e) => setFormData({...formData, notes: e.target.value})} />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsEditOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={updateMutation.isPending}>Update Payment</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
