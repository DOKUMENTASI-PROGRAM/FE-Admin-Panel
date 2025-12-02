import { useState, useMemo } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/services/api';
import { useBookings, useUsers, useCourses, useSchedules, queryKeys } from '@/hooks/useQueries';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from '@/components/ui/button';
import { CheckCircle, Calendar } from 'lucide-react';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from '@/components/ui/label';
import { TableSkeleton } from '@/components/TableSkeleton';

export default function BookingsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedBooking, setSelectedBooking] = useState<any>(null);
  const [selectedSlot, setSelectedSlot] = useState<string>("");
  const [isAssignOpen, setIsAssignOpen] = useState(false);

  // Use custom hooks to fetch data with proper caching
  const { data, isLoading, error } = useBookings();
  const { data: usersData = [] } = useUsers();
  const { data: coursesData = [] } = useCourses();
  const { data: schedulesData = [] } = useSchedules();

  // Build lookup maps from query data
  const studentMap = useMemo(() => {
    const lookup: { [key: string]: string } = {};
    usersData.forEach((user: any) => {
      if (user && user.id) {
        lookup[user.id] = user.full_name || user.name || user.email || user.id;
      }
    });
    return lookup;
  }, [usersData]);

  const schoolMap = useMemo(() => {
    const lookup: { [key: string]: string } = {};
    usersData.forEach((user: any) => {
      if (user && user.id) {
        lookup[user.id] = user.school || '-';
      }
    });
    return lookup;
  }, [usersData]);

  // Build lookup map for slots
  const slotsMap = useMemo(() => {
    const lookup: { [key: string]: string } = {};
    if (Array.isArray(schedulesData)) {
      schedulesData.forEach((schedule: any) => {
        if (schedule.slots && Array.isArray(schedule.slots)) {
          schedule.slots.forEach((slot: any) => {
            const slotInfo = `${slot.day_of_week || slot.day} ${slot.start_time || slot.start} - ${slot.end_time || slot.end}`;
            lookup[slot.id] = slotInfo;
          });
        }
      });
    }
    return lookup;
  }, [schedulesData]);

  const courseMap = useMemo(() => {
    const lookup: { [key: string]: string } = {};
    coursesData.forEach((course: any) => {
      if (course && course.id) {
        lookup[course.id] = course.title || course.name || course.id;
      }
    });
    return lookup;
  }, [coursesData]);

  // Get available slots from schedules based on selected booking
  const slots = useMemo(() => {
    if (!selectedBooking || !schedulesData || schedulesData.length === 0) {
      return [];
    }

    console.log('Selected Booking:', selectedBooking);
    console.log('All Schedules Data:', schedulesData);

    // Find schedules that match the booking's course
    const courseSchedules = Array.isArray(schedulesData) 
      ? schedulesData.filter((schedule: any) => schedule.course_id === selectedBooking.course_id)
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
      return api.post(`/booking/${id}/confirm`);
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
      return api.post(`/booking/${id}/cancel`);
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
      return api.post(`/booking/admin/bookings/${bookingId}/assign-slot`, { 
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

  const bookings = Array.isArray(data) ? data : (data?.bookings || []);
  
  console.log('Bookings data:', bookings);
  console.log('Student map:', studentMap);
  console.log('Course map:', courseMap);

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
                  {courseMap[booking.course_id] || booking.course_id}
                </TableCell>
                <TableCell>
                  {slotsMap[booking.first_choice_slot_id] || booking.first_preference || '-'}
                </TableCell>
                <TableCell>
                  {slotsMap[booking.second_choice_slot_id] || booking.second_preference || '-'}
                </TableCell>
                <TableCell>{new Date(booking.created_at).toLocaleDateString()}</TableCell>
                <TableCell>
                  <Badge variant={booking.status === 'confirmed' ? 'default' : 'secondary'}>
                    {booking.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-right space-x-1">
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
                      <Button 
                        variant="outline" 
                        size="sm"
                        className="text-red-600 hover:text-red-700"
                        onClick={() => {
                          if (confirm('Are you sure you want to cancel this booking?')) {
                            cancelMutation.mutate(booking.id);
                          }
                        }}
                        disabled={cancelMutation.isPending}
                      >
                        Cancel
                      </Button>
                    </>
                  )}
                  {booking.status === 'confirmed' && (
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="text-red-600 hover:text-red-700"
                      onClick={() => {
                        if (confirm('Are you sure you want to cancel this confirmed booking?')) {
                          cancelMutation.mutate(booking.id);
                        }
                      }}
                      disabled={cancelMutation.isPending}
                    >
                      Cancel
                    </Button>
                  )}
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
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
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
    </div>
  );
}
