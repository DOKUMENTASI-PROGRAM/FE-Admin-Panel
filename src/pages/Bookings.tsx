import { useState, useMemo } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/services/api';
import { useBookings, useUsers, useCourses, useSchedules, useInstructors, queryKeys } from '@/hooks/useQueries';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from '@/components/ui/button';
import { CheckCircle, Eye, ZoomIn } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
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
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from '@/components/ui/label';
import { TableSkeleton } from '@/components/TableSkeleton';
import { PaginationControls } from '@/components/ui/pagination-controls';

export default function BookingsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedBooking, setSelectedBooking] = useState<any>(null);
  const [selectedSlot, setSelectedSlot] = useState<string>("");
  const [isAssignOpen, setIsAssignOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [detailBooking, setDetailBooking] = useState<any>(null);
  const [isImageZoomed, setIsImageZoomed] = useState(false);

  // Use custom hooks to fetch data with proper caching
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const { data, isLoading, error } = useBookings(page, limit);
  // Default to undefined or handle null checks downstream, do not default to [] as it breaks type for object response
  const { data: usersData } = useUsers();
  const { data: coursesData } = useCourses();
  const { data: schedulesData } = useSchedules();
  const { data: instructorsData } = useInstructors();

  // Build lookup maps from query data
  const studentMap = useMemo(() => {
    const lookup: { [key: string]: string } = {};
    if (usersData?.data && Array.isArray(usersData.data)) {
      usersData.data.forEach((user: any) => {
        if (user && user.id) {
          lookup[user.id] = user.full_name || user.name || user.email || user.id;
        }
      });
    }
    return lookup;
  }, [usersData]);

  const schoolMap = useMemo(() => {
    const lookup: { [key: string]: string } = {};
    if (usersData?.data && Array.isArray(usersData.data)) {
        usersData.data.forEach((user: any) => {
        if (user && user.id) {
            lookup[user.id] = user.school || '-';
        }
        });
    }
    return lookup;
  }, [usersData]);

  // Build lookup map for slots
  const slotsMap = useMemo(() => {
    const lookup: { [key: string]: string } = {};
    
    // Helper function to extract time and day from ISO datetime
    const extractTimeInfo = (dateString: string) => {
      try {
        const date = new Date(dateString);
        return date.toLocaleTimeString('en-US', { 
          hour: '2-digit', 
          minute: '2-digit', 
          hour12: false 
        });
      } catch {
        return dateString;
      }
    };

    const extractDayOfWeek = (dateString: string) => {
      try {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', { weekday: 'long' });
      } catch {
        return 'TBD';
      }
    };
    
    // Handle both array and paginated response for schedules
    const schedules = schedulesData?.data || schedulesData || [];
    
    if (Array.isArray(schedules)) {
      schedules.forEach((schedule: any) => {
        // Handle nested slots array structure
        const nestedSlots = schedule.slots || schedule.schedule || schedule.timings;
        if (Array.isArray(nestedSlots)) {
          nestedSlots.forEach((slot: any) => {
            if (slot.id) {
              let slotInfo: string;
              // Check if it's ISO datetime format
              if (slot.start_time && slot.start_time.includes('T')) {
                const dayOfWeek = extractDayOfWeek(slot.start_time);
                const startTime = extractTimeInfo(slot.start_time);
                const endTime = extractTimeInfo(slot.end_time);
                slotInfo = `${dayOfWeek} ${startTime} - ${endTime}`;
              } else {
                slotInfo = `${slot.day_of_week || slot.day || 'TBD'} ${slot.start_time || slot.start || ''} - ${slot.end_time || slot.end || ''}`;
              }
              lookup[slot.id] = slotInfo;
            }
          });
        }
        
        // Handle flat structure where schedule itself is the slot
        if (schedule.id && schedule.start_time && schedule.end_time) {
          let slotInfo: string;
          if (schedule.start_time.includes('T')) {
            const dayOfWeek = extractDayOfWeek(schedule.start_time);
            const startTime = extractTimeInfo(schedule.start_time);
            const endTime = extractTimeInfo(schedule.end_time);
            slotInfo = `${dayOfWeek} ${startTime} - ${endTime}`;
          } else {
            slotInfo = `${schedule.day_of_week || 'TBD'} ${schedule.start_time} - ${schedule.end_time}`;
          }
          lookup[schedule.id] = slotInfo;
        }
      });
    }
    console.log('Slots map:', lookup);
    return lookup;
  }, [schedulesData]);

  const courseMap = useMemo(() => {
    const lookup: { [key: string]: string } = {};
    const courses = coursesData?.data || coursesData || [];
    if (Array.isArray(courses)) {
      courses.forEach((course: any) => {
        if (course && course.id) {
          lookup[course.id] = course.title || course.name || course.id;
        }
      });
    }
    return lookup;
  }, [coursesData]);

  // Build instructor lookup map
  const instructorMap = useMemo(() => {
    const lookup: { [key: string]: string } = {};
    const instructors = instructorsData?.data || instructorsData || [];
    if (Array.isArray(instructors)) {
      instructors.forEach((instructor: any) => {
        if (instructor && instructor.id) {
          lookup[instructor.id] = instructor.full_name || instructor.name || instructor.email || instructor.id;
        }
      });
    }
    return lookup;
  }, [instructorsData]);

  // Get available slots from schedules based on selected booking
  const slots = useMemo(() => {
    if (!selectedBooking || !schedulesData || (schedulesData.data && schedulesData.data.length === 0)) {
      return [];
    }

    console.log('Selected Booking:', selectedBooking);
    console.log('All Schedules Data:', schedulesData);

    // Find schedules that match the booking's course
    const schedules = schedulesData?.data || schedulesData || [];
    const courseSchedules = Array.isArray(schedules) 
      ? schedules.filter((schedule: any) => schedule.course_id === selectedBooking.course_id)
      : [];

    console.log('Filtered Course Schedules:', courseSchedules);

    // Extract slots from matching schedules with schedule_id
    const availableSlots: any[] = [];
    
    courseSchedules.forEach((schedule: any) => {
      console.log('Processing Schedule:', schedule);
      
      // Handle two possible structures:
      // 1. Nested structure: schedule.slots / schedule.schedule / schedule.timings (array)
      // 2. Flat structure: schedule object directly has start_time and end_time (ISO datetime format)
      
      let slotsToProcess: any[] = [];
      
      // Check for nested structure first
      const nestedSlots = schedule.slots || schedule.schedule || schedule.timings;
      if (Array.isArray(nestedSlots)) {
        slotsToProcess = nestedSlots;
        console.log('Found nested slots:', nestedSlots);
      } 
      // Check for flat structure - if schedule has start_time and end_time (ISO format timestamps)
      else if (schedule.start_time && schedule.end_time) {
        slotsToProcess = [schedule];
        console.log('Found flat schedule structure with ISO datetime, treating as slot');
      }

      slotsToProcess.forEach((slot: any) => {
        try {
          // Helper function to extract time and day from ISO datetime
          const extractTimeInfo = (dateString: string) => {
            const date = new Date(dateString);
            const timeStr = date.toLocaleTimeString('en-US', { 
              hour: '2-digit', 
              minute: '2-digit', 
              hour12: false 
            });
            return timeStr;
          };

          const extractDayOfWeek = (dateString: string) => {
            const date = new Date(dateString);
            return date.toLocaleDateString('en-US', { weekday: 'long' });
          };

          // Handle different slot structure formats
          let slotId, dayOfWeek, startTime, endTime;

          if (slot.day_of_week) {
            // Legacy format with day_of_week field
            slotId = slot.id || `${schedule.id}-${slot.day_of_week}-${slot.start_time}`;
            dayOfWeek = slot.day_of_week || slot.day || 'TBD';
            startTime = slot.start_time || slot.start || '00:00';
            endTime = slot.end_time || slot.end || '00:00';
          } else if (slot.start_time && slot.end_time && (slot.start_time.includes('T') || slot.start_time.includes(':'))) {
            // ISO datetime format (e.g., "2024-01-15T14:00:00+00:00")
            slotId = slot.id || `${schedule.id}-${slot.start_time}-${slot.end_time}`;
            dayOfWeek = extractDayOfWeek(slot.start_time);
            startTime = extractTimeInfo(slot.start_time);
            endTime = extractTimeInfo(slot.end_time);
          } else {
            // Fallback
            slotId = slot.id || `${schedule.id}-slot`;
            dayOfWeek = 'TBD';
            startTime = slot.start_time || slot.start || '00:00';
            endTime = slot.end_time || slot.end || '00:00';
          }

          availableSlots.push({
            id: slotId,
            schedule_id: schedule.id,
            time: `${dayOfWeek} ${startTime} - ${endTime}`,
            day_of_week: dayOfWeek,
            start_time: startTime,
            end_time: endTime,
          });
        } catch (err) {
          console.error('Error processing slot:', slot, err);
        }
      });
    });

    console.log('Final Available Slots:', availableSlots);
    return availableSlots;
  }, [selectedBooking, schedulesData]);

  const confirmMutation = useMutation({
    mutationFn: (id: string) => {
      return api.post(`/api/booking/${id}/confirm`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.bookings() });
      toast({ title: "Success", description: "Booking confirmed successfully" });
    },
    onError: (error: any) => {
      toast({ 
        variant: "destructive", 
        title: "Error", 
        description: error.response?.data?.message || "Failed to confirm booking" 
      });
    },
  });

  // Cancel booking - POST /api/booking/{id}/cancel
  const cancelMutation = useMutation({
    mutationFn: (id: string) => {
      return api.post(`/api/booking/${id}/cancel`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.bookings() });
      toast({ title: "Success", description: "Booking cancelled successfully" });
    },
    onError: (error: any) => {
      toast({ 
        variant: "destructive", 
        title: "Error", 
        description: error.response?.data?.message || "Failed to cancel booking" 
      });
    },
  });

  const assignSlotMutation = useMutation({
    mutationFn: ({ bookingId, slotId, scheduleId }: { bookingId: string, slotId: string, scheduleId: string }) => {
      return api.post(`/api/booking/${bookingId}/assign-slot`, { 
        slot_id: slotId,
        schedule_id: scheduleId 
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.bookings() });
      setIsAssignOpen(false);
      setSelectedBooking(null);
      setSelectedSlot("");
      toast({ title: "Success", description: "Slot assigned successfully" });
    },
    onError: (error: any) => {
      toast({ 
        variant: "destructive", 
        title: "Error", 
        description: error.response?.data?.message || "Failed to assign slot" 
      });
    },
  });

  const handleAssignSlot = () => {
    if (selectedBooking && selectedSlot) {
      // Find the selected slot to get schedule_id
      const slot = slots.find(s => s.id === selectedSlot);
      if (slot && slot.schedule_id) {
        assignSlotMutation.mutate({ 
          bookingId: selectedBooking.id, 
          slotId: selectedSlot,
          scheduleId: slot.schedule_id
        });
      } else {
        toast({ 
          variant: "destructive", 
          title: "Error", 
          description: "Could not find schedule information for selected slot" 
        });
      }
    }
  };

  if (isLoading) return <TableSkeleton columnCount={8} rowCount={10} />;
  if (error) return <div>Error loading bookings</div>;

  const bookings = data?.data || [];
  
  console.log('Bookings data:', bookings);
  console.log('Student map:', studentMap);
  console.log('Course map:', courseMap);
  console.log('Schedules data:', schedulesData);



  // Helper function to get first choice slot from booking
  const getFirstChoiceSlot = (booking: any): string => {
    // Check if first_preference is an object with day/time info
    if (booking.first_preference && typeof booking.first_preference === 'object') {
      const pref = booking.first_preference;
      return `${pref.day || 'TBD'} ${pref.start_time || ''} - ${pref.end_time || ''}`;
    }
    
    // Try different possible field names for first choice slot
    const slotId = booking.first_choice_slot_id 
      || booking.first_preference_slot_id 
      || booking.slot_preferences?.[0]?.slot_id
      || booking.slot_preferences?.[0]?.id
      || booking.preferences?.first_slot_id
      || booking.first_slot_id
      || booking.schedule_id;
    
    if (slotId && slotsMap[slotId]) {
      return slotsMap[slotId];
    }
    
    return '-';
  };

  // Helper function to get second choice slot from booking
  const getSecondChoiceSlot = (booking: any): string => {
    // Check if second_preference is an object with day/time info
    if (booking.second_preference && typeof booking.second_preference === 'object') {
      const pref = booking.second_preference;
      return `${pref.day || 'TBD'} ${pref.start_time || ''} - ${pref.end_time || ''}`;
    }
    
    // Try different possible field names for second choice slot
    const slotId = booking.second_choice_slot_id 
      || booking.second_preference_slot_id 
      || booking.slot_preferences?.[1]?.slot_id
      || booking.slot_preferences?.[1]?.id
      || booking.preferences?.second_slot_id
      || booking.second_slot_id;
    
    if (slotId && slotsMap[slotId]) {
      return slotsMap[slotId];
    }
    
    return '-';
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold tracking-tight">Bookings</h2>
      </div>
      
      <div className="border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>School</TableHead>
              <TableHead>Course</TableHead>
              <TableHead>First Choice</TableHead>
              <TableHead>Second Choice</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {bookings.map((booking: any) => (
              <TableRow key={booking.id}>
                <TableCell className="font-medium">
                  {booking.applicant_full_name || studentMap[booking.user_id] || booking.user_id || '-'}
                </TableCell>
                <TableCell>
                  {booking.applicant_school || schoolMap[booking.user_id] || '-'}
                </TableCell>
                <TableCell>
                  {booking.courses?.title || courseMap[booking.course_id] || booking.course_id}
                </TableCell>
                <TableCell>
                  {getFirstChoiceSlot(booking)}
                </TableCell>
                <TableCell>
                  {getSecondChoiceSlot(booking)}
                </TableCell>
                <TableCell>{new Date(booking.created_at).toLocaleDateString()}</TableCell>
                <TableCell>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize
                    ${booking.status === 'confirmed' ? 'bg-green-100 text-green-800' : 
                      booking.status === 'pending' ? 'bg-yellow-100 text-yellow-800' : 
                      booking.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                      'bg-gray-100 text-gray-800'}`}>
                    {booking.status}
                  </span>
                </TableCell>
                <TableCell>
                  <div className="flex items-center justify-end gap-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => {
                        setDetailBooking(booking);
                        setIsDetailOpen(true);
                      }}
                    >
                      <Eye className="h-4 w-4 mr-1" /> Detail
                    </Button>
                    {booking.status === 'pending' && (
                      <>
                        <Button 
                          variant="outline" 
                          size="sm"
                          className="text-green-600 hover:text-green-700"
                          onClick={() => confirmMutation.mutate(booking.id)}
                          disabled={confirmMutation.isPending}
                        >
                          <CheckCircle className="h-4 w-4 mr-1" /> Confirm
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button 
                              variant="outline" 
                              size="sm"
                              className="text-red-600 hover:text-red-700"
                              disabled={cancelMutation.isPending}
                            >
                              Cancel
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This action cannot be undone. This will permanently cancel the booking.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => cancelMutation.mutate(booking.id)} className="bg-red-600 hover:bg-red-700">
                                Continue
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </>
                    )}
                    {booking.status === 'confirmed' && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button 
                            variant="outline" 
                            size="sm"
                            className="text-red-600 hover:text-red-700"
                            disabled={cancelMutation.isPending}
                          >
                            Cancel
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This action cannot be undone. This will permanently cancel this confirmed booking.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => cancelMutation.mutate(booking.id)} className="bg-red-600 hover:bg-red-700">
                              Continue
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                  </div>
                  {/* Hidden for now - different flow logic
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => {
                      setSelectedBooking(booking);
                      setIsAssignOpen(true);
                    }}
                  >
                    <Calendar className="h-4 w-4 mr-1" /> Assign Slot
                  </Button>
                  */}
                </TableCell>
              </TableRow>
            ))}
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

      <Dialog open={isAssignOpen} onOpenChange={setIsAssignOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Slot</DialogTitle>
            <DialogDescription>
              Assign a time slot for {selectedBooking?.applicant_full_name || studentMap[selectedBooking?.user_id] || selectedBooking?.user_id}'s booking.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            {slots.length === 0 && (
              <div className="bg-yellow-50 border border-yellow-200 p-3 rounded text-sm text-yellow-800">
                <p className="font-semibold mb-2">No slots available</p>
                <p className="text-xs">Available schedules: {Array.isArray(schedulesData) ? schedulesData.length : 0}</p>
                <p className="text-xs">Booking course_id: {selectedBooking?.course_id}</p>
                <p className="text-xs">Debug - Slots count: {slots.length}</p>
              </div>
            )}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="slot" className="text-right">
                Slot {slots.length > 0 && `(${slots.length})`}
              </Label>
              <Select onValueChange={setSelectedSlot} value={selectedSlot}>
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder={slots.length === 0 ? "No slots available" : "Select a slot"} />
                </SelectTrigger>
                <SelectContent>
                  {slots.length > 0 ? (
                    slots.map((slot) => (
                      <SelectItem key={slot.id} value={slot.id}>
                        {slot.time}
                      </SelectItem>
                    ))
                  ) : (
                    <div className="p-2 text-sm text-gray-500">No slots available for this course</div>
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleAssignSlot} disabled={assignSlotMutation.isPending || slots.length === 0}>
              {assignSlotMutation.isPending ? "Assigning..." : "Assign Slot"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Detail Dialog */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Booking Detail</DialogTitle>
            <DialogDescription>
              Detail informasi booking untuk {detailBooking?.applicant_full_name || studentMap[detailBooking?.user_id] || detailBooking?.user_id}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label className="text-sm text-muted-foreground">Nama</Label>
                <p className="font-medium">{detailBooking?.applicant_full_name || studentMap[detailBooking?.user_id] || '-'}</p>
              </div>
              <div className="space-y-1">
                <Label className="text-sm text-muted-foreground">Asal Sekolah</Label>
                <p className="font-medium">{detailBooking?.applicant_school || schoolMap[detailBooking?.user_id] || '-'}</p>
              </div>
              <div className="space-y-1">
                <Label className="text-sm text-muted-foreground">Kursus</Label>
                <p className="font-medium">{detailBooking?.courses?.title || courseMap[detailBooking?.course_id] || detailBooking?.course_id || '-'}</p>
              </div>
              <div className="space-y-1">
                <Label className="text-sm text-muted-foreground">Status</Label>
                <Badge variant={detailBooking?.status === 'confirmed' ? 'default' : 'secondary'}>
                  {detailBooking?.status || '-'}
                </Badge>
              </div>
              <div className="space-y-1">
                <Label className="text-sm text-muted-foreground">Pilihan Slot Pertama</Label>
                <p className="font-medium">{detailBooking ? getFirstChoiceSlot(detailBooking) : '-'}</p>
              </div>
              <div className="space-y-1">
                <Label className="text-sm text-muted-foreground">Pilihan Slot Kedua</Label>
                <p className="font-medium">{detailBooking ? getSecondChoiceSlot(detailBooking) : '-'}</p>
              </div>
              <div className="space-y-1">
                <Label className="text-sm text-muted-foreground">Instruktur Pilihan</Label>
                <p className="font-medium">
                  {(() => {
                    // Try to get instructor ID from various sources
                    const instructorId = detailBooking?.first_preference?.instructor_id 
                      || detailBooking?.second_preference?.instructor_id
                      || detailBooking?.preferred_instructor_id;
                    
                    // If we have an instructor ID, look up the name
                    if (instructorId && instructorMap[instructorId]) {
                      return instructorMap[instructorId];
                    }
                    
                    // Fallback to name fields if available
                    return detailBooking?.first_preference?.instructor_name 
                      || detailBooking?.second_preference?.instructor_name
                      || detailBooking?.preferred_instructor_name 
                      || (instructorId ? instructorId : '-');
                  })()}
                </p>
              </div>
              <div className="space-y-1">
                <Label className="text-sm text-muted-foreground">Tanggal Booking</Label>
                <p className="font-medium">{detailBooking?.created_at ? new Date(detailBooking.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : '-'}</p>
              </div>
              <div className="space-y-1">
                <Label className="text-sm text-muted-foreground">Email</Label>
                <p className="font-medium">{detailBooking?.applicant_email || '-'}</p>
              </div>
              <div className="space-y-1">
                <Label className="text-sm text-muted-foreground">No. WhatsApp</Label>
                <p className="font-medium">{detailBooking?.applicant_wa_number || '-'}</p>
              </div>
            </div>
            {/* Bukti Pembayaran */}
            {detailBooking?.payment_proof && (
              <div className="space-y-2 mt-4 pt-4 border-t">
                <Label className="text-sm text-muted-foreground">Bukti Pembayaran</Label>
                <div 
                  className="rounded-lg overflow-hidden border cursor-pointer relative group"
                  onClick={() => setIsImageZoomed(true)}
                >
                  <img 
                    src={detailBooking.payment_proof} 
                    alt="Bukti Pembayaran" 
                    className="w-full max-h-64 object-contain bg-gray-50"
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                    <ZoomIn className="h-8 w-8 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground text-center">Klik gambar untuk memperbesar</p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDetailOpen(false)}>
              Tutup
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Image Zoom Dialog */}
      <Dialog open={isImageZoomed} onOpenChange={setIsImageZoomed}>
        <DialogContent className="max-w-4xl max-h-[90vh] p-2 bg-black/90 border-none">
          <div className="relative flex items-center justify-center">
            <img 
              src={detailBooking?.payment_proof} 
              alt="Bukti Pembayaran - Zoom" 
              className="max-w-full max-h-[85vh] object-contain rounded-lg"
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
