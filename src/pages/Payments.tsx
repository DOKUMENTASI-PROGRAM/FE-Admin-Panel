import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { paymentService } from '@/services/paymentService';
import { Payment, PaymentStatus, PaymentMethod } from '@/types/payment';
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
import { Plus, Pencil, Trash2, Search, Check, ChevronsUpDown, Loader2, Eye, ZoomIn, Filter, X } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { useBookings } from '@/hooks/useQueries';
import { cn } from '@/lib/utils';
import { uploadToStorage } from '@/lib/supabase';
import { PaginationControls } from '@/components/ui/pagination-controls';

export default function PaymentsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [openCombobox, setOpenCombobox] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [paymentToDelete, setPaymentToDelete] = useState<string | null>(null);
  const [isImageZoomed, setIsImageZoomed] = useState(false);

  // Filter states
  const [filterStatus, setFilterStatus] = useState<string | null>(null);
  const [filterMethod, setFilterMethod] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<string | null>(null);
  const [openFilterPopover, setOpenFilterPopover] = useState<string | null>(null);

  // Form states
  const [formData, setFormData] = useState({
    booking_id: '',
    amount: '',
    payment_date: new Date().toISOString().split('T')[0],
    payment_period: new Date().toISOString().slice(0, 7), // YYYY-MM
    payment_method: 'transfer' as PaymentMethod,
    // status is not in the requested payload, but we might keep it for local UI state if needed, 
    // or remove it from payload construction.
    status: 'pending' as PaymentStatus, 
    notes: '',
    payment_proof: '',
  });

  // Fetch Bookings for auto-suggestion - fetch more to ensure lookup works
  const { data: bookingsData } = useBookings(1, 100);

    // Create unique list of confirmed students from bookings
    const students = useMemo(() => {
      // Handle both array and object response formats
      const bookings = bookingsData?.data || [];
      
      if (!bookings || !Array.isArray(bookings)) return [];
      
      // Filter for confirmed bookings
      const confirmedBookings = bookings.filter((b: any) => b.status === 'confirmed');
      
      // Map to items needed for the dropdown
      // We use booking.id as the identifier because the payload requires booking_id
      return confirmedBookings.map((b: any) => ({
        id: b.id, // This is the booking_id
        user_id: b.user_id,
        name: b.applicant_full_name || b.user_id,
        school: b.applicant_school
      }));
    }, [bookingsData]);

  // Create a map of ALL booking_id to student name for display purposes
  const bookingNameMap = useMemo(() => {
    const lookup: { [key: string]: string } = {};
    const bookings = bookingsData?.data || [];
    
    if (bookings && Array.isArray(bookings)) {
      bookings.forEach((b: any) => {
        if (b.id) {
          lookup[b.id] = b.applicant_full_name || b.user_id || '-';
        }
      });
    }
    return lookup;
  }, [bookingsData]);

  // Fetch Payments
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const { data: paymentsResponse, isLoading } = useQuery({
    queryKey: ['payments', search, page, limit],
    queryFn: () => paymentService.getPayments({ search, page, limit }),
  });

  const rawPayments = paymentsResponse?.data?.payments || [];

  // Apply client-side filters
  const payments = useMemo(() => {
    let filtered = rawPayments;
    
    if (filterStatus) {
      filtered = filtered.filter((p: Payment) => (p.status || 'pending') === filterStatus);
    }
    
    if (filterMethod) {
      filtered = filtered.filter((p: Payment) => p.payment_method === filterMethod);
    }
    
    if (filterType) {
      filtered = filtered.filter((p: Payment) => {
        const type = p.payment_type || (p.payment_method === 'Initial Booking' ? 'Registration' : 'Monthly');
        return type === filterType;
      });
    }
    
    return filtered;
  }, [rawPayments, filterStatus, filterMethod, filterType]);

  // Mutations
  const createMutation = useMutation({
    mutationFn: paymentService.createPayment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      setIsAddOpen(false);
      resetForm();
      toast({ title: 'Berhasil', description: 'Pembayaran berhasil dibuat' });
    },
    onError: (error: any) => {
      toast({ variant: 'destructive', title: 'Error', description: error.response?.data?.message || 'Gagal membuat pembayaran' });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => paymentService.updatePayment(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      setIsEditOpen(false);
      resetForm();
      toast({ title: 'Berhasil', description: 'Pembayaran berhasil diperbarui' });
    },
    onError: (error: any) => {
      toast({ variant: 'destructive', title: 'Error', description: error.response?.data?.message || 'Gagal memperbarui pembayaran' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: paymentService.deletePayment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      toast({ title: 'Berhasil', description: 'Pembayaran berhasil dihapus' });
    },
    onError: (error: any) => {
      toast({ variant: 'destructive', title: 'Error', description: error.response?.data?.message || 'Gagal menghapus pembayaran' });
    },
    onSettled: () => {
      setDeleteConfirmOpen(false);
      setPaymentToDelete(null);
    }
  });

  const resetForm = () => {
    setFormData({
      booking_id: '',
      amount: '',
      payment_date: new Date().toISOString().split('T')[0],
      payment_period: new Date().toISOString().slice(0, 7),
      payment_method: 'transfer',
      status: 'pending',
      notes: '',
      payment_proof: '',
    });
    setSelectedPayment(null);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Format file tidak valid. Harap gunakan JPEG, PNG, WebP, atau GIF."
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

    try {
      setIsUploading(true);
      const url = await uploadToStorage(file, 'payment-proofs', '');
      setFormData(prev => ({ ...prev, payment_proof: url }));
      toast({ title: 'Berhasil', description: 'Gambar berhasil diupload' });
    } catch (error: any) {
       console.error(error);
       toast({ variant: 'destructive', title: 'Error', description: 'Upload gagal' });
    } finally {
      setIsUploading(false);
    }
  };

  const handleViewClick = (payment: Payment) => {
    setSelectedPayment(payment);
    setIsDetailOpen(true);
  };

  const handleEditClick = (payment: Payment) => {
    setSelectedPayment(payment);
    setFormData({
      booking_id: payment.booking_id || '',
      amount: String(payment.amount),
      payment_date: payment.payment_date ? new Date(payment.payment_date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      payment_period: payment.payment_period ? payment.payment_period.split(' ').reverse().join('-').replace(/(\w+)-(\d+)/, (_, m, y) => `${y}-${('January,February,March,April,May,June,July,August,September,October,November,December'.split(',').indexOf(m) + 1).toString().padStart(2, '0')}`) : new Date().toISOString().slice(0, 7),
      payment_method: payment.payment_method || 'cash',
      status: payment.status || 'pending',
      notes: payment.notes || '',
      payment_proof: payment.payment_proof || '',
    });
    setIsEditOpen(true);
  };

  const handleDeleteClick = (id: string) => {
    setPaymentToDelete(id);
    setDeleteConfirmOpen(true);
  };

  const handleConfirmDelete = () => {
    if (paymentToDelete) {
      deleteMutation.mutate(paymentToDelete);
    }
  };

  const handleSubmit = (e: React.FormEvent, isEdit: boolean) => {
    e.preventDefault();
    const payload = {
      booking_id: formData.booking_id,
      amount: Number(formData.amount),
      payment_date: new Date(formData.payment_date).toISOString(), // "2025-12-23T00:00:00.000Z"
      payment_method: formData.payment_method,
      payment_period: new Date(formData.payment_period).toLocaleString('en-US', { month: 'long', year: 'numeric' }), // "December 2025"
      payment_proof: formData.payment_proof,
      notes: formData.notes,
      status: formData.status
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
          <h2 className="text-3xl font-bold tracking-tight">Pembayaran</h2>
          <p className="text-muted-foreground">Kelola pembayaran siswa dan riwayat transaksi.</p>
        </div>
        <Button onClick={() => { resetForm(); setIsAddOpen(true); }}>
          <Plus className="mr-2 h-4 w-4" /> Tambah Pembayaran
        </Button>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Cari pembayaran..."
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
              <TableHead>Tanggal</TableHead>
              <TableHead>Siswa</TableHead>
              <TableHead>
                <Popover open={openFilterPopover === 'type'} onOpenChange={(open) => setOpenFilterPopover(open ? 'type' : null)}>
                  <PopoverTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-8 -ml-3 font-medium hover:bg-muted">
                      Tipe
                      {filterType ? <X className="ml-1 h-3 w-3 text-primary" onClick={(e) => { e.stopPropagation(); setFilterType(null); }} /> : <Filter className="ml-1 h-3 w-3 opacity-50" />}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-40 p-1" align="start">
                    <div className="flex flex-col gap-1">
                      <Button variant={filterType === null ? 'secondary' : 'ghost'} size="sm" className="justify-start" onClick={() => { setFilterType(null); setOpenFilterPopover(null); }}>Semua</Button>
                      <Button variant={filterType === 'Registration' ? 'secondary' : 'ghost'} size="sm" className="justify-start" onClick={() => { setFilterType('Registration'); setOpenFilterPopover(null); }}>Registration</Button>
                      <Button variant={filterType === 'Monthly' ? 'secondary' : 'ghost'} size="sm" className="justify-start" onClick={() => { setFilterType('Monthly'); setOpenFilterPopover(null); }}>Monthly</Button>
                    </div>
                  </PopoverContent>
                </Popover>
              </TableHead>
              <TableHead>
                <Popover open={openFilterPopover === 'method'} onOpenChange={(open) => setOpenFilterPopover(open ? 'method' : null)}>
                  <PopoverTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-8 -ml-3 font-medium hover:bg-muted">
                      Metode
                      {filterMethod ? <X className="ml-1 h-3 w-3 text-primary" onClick={(e) => { e.stopPropagation(); setFilterMethod(null); }} /> : <Filter className="ml-1 h-3 w-3 opacity-50" />}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-40 p-1" align="start">
                    <div className="flex flex-col gap-1">
                      <Button variant={filterMethod === null ? 'secondary' : 'ghost'} size="sm" className="justify-start" onClick={() => { setFilterMethod(null); setOpenFilterPopover(null); }}>Semua</Button>
                      <Button variant={filterMethod === 'cash' ? 'secondary' : 'ghost'} size="sm" className="justify-start" onClick={() => { setFilterMethod('cash'); setOpenFilterPopover(null); }}>Cash</Button>
                      <Button variant={filterMethod === 'virtual_account' ? 'secondary' : 'ghost'} size="sm" className="justify-start" onClick={() => { setFilterMethod('virtual_account'); setOpenFilterPopover(null); }}>BCA</Button>
                      <Button variant={filterMethod === 'Initial Booking' ? 'secondary' : 'ghost'} size="sm" className="justify-start" onClick={() => { setFilterMethod('Initial Booking'); setOpenFilterPopover(null); }}>Initial Booking</Button>
                    </div>
                  </PopoverContent>
                </Popover>
              </TableHead>
              <TableHead>Jumlah</TableHead>
              <TableHead>
                <Popover open={openFilterPopover === 'status'} onOpenChange={(open) => setOpenFilterPopover(open ? 'status' : null)}>
                  <PopoverTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-8 -ml-3 font-medium hover:bg-muted">
                      Status
                      {filterStatus ? <X className="ml-1 h-3 w-3 text-primary" onClick={(e) => { e.stopPropagation(); setFilterStatus(null); }} /> : <Filter className="ml-1 h-3 w-3 opacity-50" />}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-40 p-1" align="start">
                    <div className="flex flex-col gap-1">
                      <Button variant={filterStatus === null ? 'secondary' : 'ghost'} size="sm" className="justify-start" onClick={() => { setFilterStatus(null); setOpenFilterPopover(null); }}>Semua</Button>
                      <Button variant={filterStatus === 'paid' ? 'secondary' : 'ghost'} size="sm" className="justify-start" onClick={() => { setFilterStatus('paid'); setOpenFilterPopover(null); }}>Lunas</Button>
                      <Button variant={filterStatus === 'pending' ? 'secondary' : 'ghost'} size="sm" className="justify-start" onClick={() => { setFilterStatus('pending'); setOpenFilterPopover(null); }}>Pending</Button>
                      <Button variant={filterStatus === 'overdue' ? 'secondary' : 'ghost'} size="sm" className="justify-start" onClick={() => { setFilterStatus('overdue'); setOpenFilterPopover(null); }}>Overdue</Button>
                      <Button variant={filterStatus === 'cancelled' ? 'secondary' : 'ghost'} size="sm" className="justify-start" onClick={() => { setFilterStatus('cancelled'); setOpenFilterPopover(null); }}>Cancelled</Button>
                    </div>
                  </PopoverContent>
                </Popover>
              </TableHead>
              <TableHead className="text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8">Memuat...</TableCell>
              </TableRow>
            ) : payments.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8">Tidak ada pembayaran ditemukan</TableCell>
              </TableRow>
            ) : (
              payments.map((payment: Payment) => (
                <TableRow key={payment.id}>
                  <TableCell>{payment.payment_date ? new Date(payment.payment_date).toLocaleDateString() : '-'}</TableCell>
                  <TableCell className="font-medium">
                    {payment.student_name || (payment.booking_id ? bookingNameMap[payment.booking_id] : null) || payment.student_id || '-'}
                  </TableCell>
                  <TableCell className="capitalize">{payment.payment_type || (payment.payment_method === 'Initial Booking' ? 'Registration' : 'Monthly')}</TableCell>
                  <TableCell className="capitalize">{payment.payment_method?.replace('_', ' ') || '-'}</TableCell>
                  <TableCell>Rp {payment.amount.toLocaleString()}</TableCell>
                  <TableCell>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize
                      ${(payment.status || 'pending') === 'paid' ? 'bg-green-100 text-green-800' : 
                        (payment.status || 'pending') === 'pending' ? 'bg-yellow-100 text-yellow-800' : 
                        (payment.status || 'pending') === 'overdue' ? 'bg-orange-100 text-orange-800' :
                        'bg-red-100 text-red-800'}`}>
                      {(payment.status || 'pending') === 'paid' ? 'Lunas' : payment.status}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button 
                        variant="ghost" 
                        size="icon"
                        className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                        onClick={() => handleViewClick(payment)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon"
                        className="text-amber-600 hover:text-amber-700 hover:bg-amber-50"
                        onClick={() => handleEditClick(payment)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon"
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => handleDeleteClick(payment.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        <PaginationControls
          currentPage={page}
          totalCount={paymentsResponse?.data?.pagination?.total || paymentsResponse?.data?.total || paymentsResponse?.total || payments.length}
          limit={limit}
          onPageChange={setPage}
          onLimitChange={setLimit}
          isLoading={isLoading}
        />
      </div>

      {/* Add Dialog */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="overflow-y-visible">
          <DialogHeader>
            <DialogTitle>Tambah Pembayaran Baru</DialogTitle>
            <DialogDescription>Catat transaksi pembayaran baru.</DialogDescription>
          </DialogHeader>
          <form onSubmit={(e) => handleSubmit(e, false)}>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2 flex flex-col">
                <Label htmlFor="student_id">Nama Siswa (Auto-suggestion)</Label>
                <Popover open={openCombobox} onOpenChange={setOpenCombobox}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={openCombobox}
                      className="justify-between"
                    >
                      {formData.booking_id
                        ? students.find((student) => student.id === formData.booking_id)?.name || formData.booking_id
                        : "Pilih siswa..."}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[400px] p-0">
                    <Command>
                      <CommandInput placeholder="Cari siswa..." />
                      <CommandList>
                        <CommandEmpty>Siswa tidak ditemukan.</CommandEmpty>
                        <CommandGroup>
                          {students.map((student) => (
                            <CommandItem
                              key={student.id}
                              value={`${student.name} ${student.id}`}
                              onSelect={() => {
                                setFormData({...formData, booking_id: student.id});
                                setOpenCombobox(false);
                              }}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  formData.booking_id === student.id ? "opacity-100" : "opacity-0"
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
                <Label htmlFor="amount">Jumlah</Label>
                <Input id="amount" type="number" required value={formData.amount} onChange={(e) => setFormData({...formData, amount: e.target.value})} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="payment_date">Tanggal</Label>
                <Input id="payment_date" type="date" required value={formData.payment_date} onChange={(e) => setFormData({...formData, payment_date: e.target.value})} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="payment_period">Periode</Label>
                  <Input 
                    id="payment_period" 
                    type="month" 
                    value={formData.payment_period} 
                    onChange={(e) => setFormData({...formData, payment_period: e.target.value})} 
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Metode</Label>
                  <Select value={formData.payment_method} onValueChange={(val: PaymentMethod) => setFormData({...formData, payment_method: val})}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">Cash</SelectItem>
                      <SelectItem value="virtual_account">BCA</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="status">Status</Label>
                <Select value={formData.status} onValueChange={(val: PaymentStatus) => setFormData({...formData, status: val})}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="paid">Lunas</SelectItem>
                      <SelectItem value="overdue">Overdue</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="notes">Catatan</Label>
                <Input id="notes" value={formData.notes} onChange={(e) => setFormData({...formData, notes: e.target.value})} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="payment_proof">Bukti Pembayaran</Label>
                <div className="flex flex-col gap-2">
                  {formData.payment_proof && (
                    <div className="relative w-full h-40 bg-muted rounded-md overflow-hidden">
                      <img 
                        src={formData.payment_proof} 
                        alt="Preview" 
                        className="w-full h-full object-contain"
                      />
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        className="absolute top-2 right-2 h-6 w-6"
                        onClick={() => setFormData(prev => ({ ...prev, payment_proof: '' }))}
                      >
                         <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <Input 
                      id="payment_proof" 
                      type="file" 
                      accept="image/*"
                      onChange={handleFileChange}
                      disabled={isUploading}
                    />
                    {isUploading && <Loader2 className="animate-spin h-4 w-4" />}
                  </div>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsAddOpen(false)}>Batal</Button>
              <Button type="submit" disabled={createMutation.isPending}>Simpan Pembayaran</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Pembayaran</DialogTitle>
            <DialogDescription>
              Perbarui detail pembayaran termasuk siswa, jumlah, dan status.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={(e) => handleSubmit(e, true)}>
            <div className="grid gap-4 py-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="edit_student_id">Nama Siswa</Label>
                <Popover open={openCombobox} onOpenChange={setOpenCombobox}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={openCombobox}
                      className="justify-between"
                    >
                      {formData.booking_id
                        ? students.find((student) => student.id === formData.booking_id)?.name || formData.booking_id
                        : "Pilih siswa..."}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[400px] p-0">
                    <Command>
                      <CommandInput placeholder="Cari siswa..." />
                      <CommandList>
                        <CommandEmpty>Siswa tidak ditemukan.</CommandEmpty>
                        <CommandGroup>
                          {students.map((student) => (
                            <CommandItem
                              key={student.id}
                              value={`${student.name} ${student.id}`}
                              onSelect={() => {
                                setFormData({...formData, booking_id: student.id});
                                setOpenCombobox(false);
                              }}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  formData.booking_id === student.id ? "opacity-100" : "opacity-0"
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
                <Label htmlFor="edit_amount">Jumlah</Label>
                <Input id="edit_amount" type="number" required value={formData.amount} onChange={(e) => setFormData({...formData, amount: e.target.value})} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit_payment_date">Tanggal</Label>
                <Input id="edit_payment_date" type="date" required value={formData.payment_date} onChange={(e) => setFormData({...formData, payment_date: e.target.value})} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="edit_payment_period">Periode</Label>
                  <Input 
                    id="edit_payment_period" 
                    type="month" 
                    value={formData.payment_period} 
                    onChange={(e) => setFormData({...formData, payment_period: e.target.value})} 
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Metode</Label>
                  <Select value={formData.payment_method} onValueChange={(val: PaymentMethod) => setFormData({...formData, payment_method: val})}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">Cash</SelectItem>
                      <SelectItem value="virtual_account">BCA</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit_status">Status</Label>
                <Select value={formData.status} onValueChange={(val: PaymentStatus) => setFormData({...formData, status: val})}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="paid">Lunas</SelectItem>
                      <SelectItem value="overdue">Overdue</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
              </div>
               <div className="grid gap-2">
                <Label htmlFor="edit_notes">Catatan</Label>
                <Input id="edit_notes" value={formData.notes} onChange={(e) => setFormData({...formData, notes: e.target.value})} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit_payment_proof">Bukti Pembayaran</Label>
                 <div className="flex flex-col gap-2">
                  {formData.payment_proof && (
                    <div className="relative w-full h-40 bg-muted rounded-md overflow-hidden">
                      <img 
                        src={formData.payment_proof} 
                        alt="Preview" 
                        className="w-full h-full object-contain"
                      />
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        className="absolute top-2 right-2 h-6 w-6"
                        onClick={() => setFormData(prev => ({ ...prev, payment_proof: '' }))}
                      >
                         <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <Input 
                      id="edit_payment_proof" 
                      type="file" 
                      accept="image/*"
                      onChange={handleFileChange}
                      disabled={isUploading}
                    />
                     {isUploading && <Loader2 className="animate-spin h-4 w-4" />}
                  </div>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsEditOpen(false)}>Batal</Button>
              <Button type="submit" disabled={updateMutation.isPending}>Perbarui Pembayaran</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Detail Dialog */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Detail Pembayaran</DialogTitle>
          </DialogHeader>
          {selectedPayment && (
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Nama Siswa</Label>
                  <div className="font-medium">
                    {selectedPayment.student_name || (selectedPayment.booking_id ? bookingNameMap[selectedPayment.booking_id] : null) || selectedPayment.student_id || '-'}
                  </div>
                </div>
                <div>
                  <Label className="text-muted-foreground">Jumlah</Label>
                  <div className="font-medium">Rp {selectedPayment.amount.toLocaleString()}</div>
                </div>
                <div>
                  <Label className="text-muted-foreground">Tanggal</Label>
                  <div className="font-medium">{new Date(selectedPayment.payment_date).toLocaleDateString()}</div>
                </div>
                 <div>
                  <Label className="text-muted-foreground">Periode</Label>
                  <div className="font-medium capitalize">{selectedPayment.payment_period || '-'}</div>
                </div>
                <div>
                  <Label className="text-muted-foreground">Metode</Label>
                  <div className="font-medium capitalize">{selectedPayment.payment_method?.replace('_', ' ') || '-'}</div>
                </div>
                <div>
                  <Label className="text-muted-foreground">Status</Label>
                  <div>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize
                      ${(selectedPayment.status || 'pending') === 'paid' ? 'bg-green-100 text-green-800' : 
                        (selectedPayment.status || 'pending') === 'pending' ? 'bg-yellow-100 text-yellow-800' : 
                        (selectedPayment.status || 'pending') === 'overdue' ? 'bg-orange-100 text-orange-800' :
                        'bg-red-100 text-red-800'}`}>
                      {(selectedPayment.status || 'pending') === 'paid' ? 'Lunas' : selectedPayment.status}
                    </span>
                  </div>
                </div>
              </div>
              
              <div>
                <Label className="text-muted-foreground">Catatan</Label>
                <div className="text-sm border rounded-md p-2 mt-1 min-h-[60px]">
                  {selectedPayment.notes || 'Tidak ada catatan'}
                </div>
              </div>

              <div>
                <Label className="text-muted-foreground">Bukti Pembayaran</Label>
                <div className="mt-2 text-sm">
                   {selectedPayment.payment_proof ? (
                    <div 
                      className="relative w-full h-64 bg-muted rounded-md overflow-hidden border cursor-pointer group"
                      onClick={() => setIsImageZoomed(true)}
                    >
                      <img 
                        src={selectedPayment.payment_proof} 
                        alt="Payment Proof" 
                        className="w-full h-full object-contain"
                      />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                        <ZoomIn className="h-8 w-8 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </div>
                   ) : (
                     <div className="text-muted-foreground italic">Tidak ada bukti pembayaran</div>
                   )}
                   {selectedPayment.payment_proof && (
                     <p className="text-xs text-muted-foreground text-center mt-1">Klik gambar untuk memperbesar</p>
                   )}
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
             <Button type="button" variant="outline" onClick={() => setIsDetailOpen(false)}>Tutup</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Apakah Anda yakin?</AlertDialogTitle>
            <AlertDialogDescription>
              Tindakan ini tidak dapat dibatalkan. Ini akan menghapus data pembayaran secara permanen.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete} className="bg-red-600 hover:bg-red-700">
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Image Zoom Dialog */}
      <Dialog open={isImageZoomed} onOpenChange={setIsImageZoomed}>
        <DialogContent className="max-w-4xl max-h-[90vh] p-2 bg-black/90 border-none">
          <div className="relative flex items-center justify-center">
            <img 
              src={selectedPayment?.payment_proof} 
              alt="Payment Proof - Zoom" 
              className="max-w-full max-h-[85vh] object-contain rounded-lg"
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
