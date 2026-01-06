import { useState, useMemo } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/services/api';
import { useBookings, useUsers, useCourses, useAllSchedules, useInstructors, useAvailabilitySlots, queryKeys } from '@/hooks/useQueries';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from '@/components/ui/button';
import { MoreVertical, Calendar, Eye, CheckCircle, XCircle, ZoomIn } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
  const [isDeclineOpen, setIsDeclineOpen] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [confirmationChoices, setConfirmationChoices] = useState<any[]>([]);
  const [detailBooking, setDetailBooking] = useState<any>(null);
  const [isImageZoomed, setIsImageZoomed] = useState(false);

  // Use custom hooks to fetch data with proper caching
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const { data, isLoading, error } = useBookings(page, limit);
  // Default to undefined or handle null checks downstream, do not default to [] as it breaks type for object response
  const { data: usersData } = useUsers();
  const { data: coursesData } = useCourses();
  const { data: schedulesData } = useAllSchedules();
  const { data: instructorsData } = useInstructors(1, 1000);

  // Determine query parameters for availability
  // User instruction: Primary search should be by INSTRUCTOR, not Course ID.
  const prefInstructorId = selectedBooking?.first_preference?.instructor_id || selectedBooking?.second_preference?.instructor_id;
  
  // If we have an instructor preference, use it to query. 
  // We explicitly skip course_id to avoid data mismatch issues (as per user feedback).
  const qInstructorId = prefInstructorId;
  const qCourseId = prefInstructorId ? undefined : selectedBooking?.course_id;

  const { data: availabilityData, isLoading: isLoadingSlots } = useAvailabilitySlots(qCourseId, qInstructorId);

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
    
    // Helper to normalize time (remove seconds if present)
    const normalizeTime = (time: string | null | undefined): string => {
      if (!time) return '';
      const parts = time.split(':');
      if (parts.length >= 2) {
        return `${parts[0]}:${parts[1]}`;
      }
      return time;
    };
    
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
                // Use start_time_of_day if start_time is null
                const startTime = normalizeTime(slot.start_time_of_day || slot.start_time || slot.start);
                const endTime = normalizeTime(slot.end_time_of_day || slot.end_time || slot.end);
                slotInfo = `${slot.day_of_week || slot.day || 'TBD'} ${startTime} - ${endTime}`;
              }
              lookup[slot.id] = slotInfo;
            }
          });
        }
        
        // Handle flat structure where schedule itself is the slot
        // Check for start_time_of_day (new format) OR start_time (old format)
        const hasNewFormat = schedule.start_time_of_day && schedule.end_time_of_day;
        const hasOldFormat = schedule.start_time && schedule.end_time;
        
        if (schedule.id && (hasNewFormat || hasOldFormat)) {
          let slotInfo: string;
          
          if (hasNewFormat) {
            // New subscription format with start_time_of_day
            const startTime = normalizeTime(schedule.start_time_of_day);
            const endTime = normalizeTime(schedule.end_time_of_day);
            slotInfo = `${schedule.day_of_week || 'TBD'} ${startTime} - ${endTime}`;
          } else if (schedule.start_time.includes('T')) {
            // Old ISO datetime format
            const dayOfWeek = extractDayOfWeek(schedule.start_time);
            const startTime = extractTimeInfo(schedule.start_time);
            const endTime = extractTimeInfo(schedule.end_time);
            slotInfo = `${dayOfWeek} ${startTime} - ${endTime}`;
          } else {
            // Old simple time format
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

  // Get available slots using the dedicated availability API
  const slots = useMemo(() => {
    if (!selectedBooking || !availabilityData?.slots) {
      return [];
    }

    console.log('Selected Booking:', selectedBooking);
    console.log('Availability Data:', availabilityData);

    const apiSlots = availabilityData.slots;

    // Get instructor_ids from booking preferences
    const firstPrefInstructorId = selectedBooking.first_preference?.instructor_id;
    const secondPrefInstructorId = selectedBooking.second_preference?.instructor_id;
    
    // Collect all instructor IDs from preferences (unique)
    const preferredInstructorIds = new Set<string>();
    if (firstPrefInstructorId) preferredInstructorIds.add(firstPrefInstructorId);
    if (secondPrefInstructorId) preferredInstructorIds.add(secondPrefInstructorId);

    console.log('Preferred Instructor IDs:', Array.from(preferredInstructorIds));

    // Filter slots based on instructor preferences
    // If user has preferences, only show matching slots (as per user request)
    // If no preferences, show all slots for the course
    const matchingSlots = preferredInstructorIds.size > 0 
      ? apiSlots.filter((slot: any) => preferredInstructorIds.has(slot.instructor_id))
      : apiSlots;

    console.log('Matching Slots:', matchingSlots);

    const capitalize = (s: string) => s ? s.charAt(0).toUpperCase() + s.slice(1) : '';

    // Map to display format
    return matchingSlots.map((slot: any) => {
      const courseTitle = courseMap[slot.course_id] || '';
      return {
        id: slot.schedule_id, // Use schedule_id as the unique identifier for assignment
        schedule_id: slot.schedule_id,
        time: `${capitalize(slot.day_of_week)} ${slot.start_time.substring(0, 5)} - ${slot.end_time.substring(0, 5)}${courseTitle ? ` (${courseTitle})` : ''}`,
        instructor_name: slot.instructor_name, 
        max_students: slot.max_students,
        current_enrollments: slot.current_enrollments,
        instructor_id: slot.instructor_id,
        status: slot.status
      };
    });
  }, [selectedBooking, availabilityData, courseMap]);

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
    mutationFn: ({ bookingId, scheduleId }: { bookingId: string, scheduleId: string }) => {
      return api.post(`/api/booking/admin/bookings/${bookingId}/assign-slot`, { 
        schedule_id: scheduleId,
        status: 'confirmed'
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

  const findScheduleIdFromPreference = (booking: any, preference: any) => {
    if (!preference || !availabilityData?.slots) return null;
    
    const normalizeTime = (time: string | undefined | null) => {
      if (!time) return '';
      return time.split(':').slice(0, 2).join(':');
    };
    
    const pDay = (preference.day || preference.day_of_week || '').toLowerCase();
    const pStart = normalizeTime(preference.start_time);
    const pInstructor = preference.instructor_id;
    
    const match = availabilityData.slots.find((s: any) => {
        const sDay = (s.day_of_week || '').toLowerCase();
        const sStart = normalizeTime(s.start_time);
        
        const matchDay = sDay === pDay;
        const matchTime = sStart === pStart;
        const matchInstructor = !pInstructor || s.instructor_id === pInstructor;
        
        return matchDay && matchTime && matchInstructor;
    });
    
    return match ? match.schedule_id : null;
  };

  const getPreferenceSlotId = (booking: any, index: number): string | null => {
    // index 0 = first, 1 = second
    const legacyFields = index === 0 
      ? ['first_choice_slot_id', 'first_preference_slot_id', 'first_slot_id', 'schedule_id'] 
      : ['second_choice_slot_id', 'second_preference_slot_id', 'second_slot_id'];

    // Check slot_preferences array
    if (booking.slot_preferences && Array.isArray(booking.slot_preferences) && booking.slot_preferences[index]) {
       const pref = booking.slot_preferences[index];
       if (pref.slot_id || pref.id) return pref.slot_id || pref.id;
       // Try matching value
       const foundId = findScheduleIdFromPreference(booking, pref);
       if (foundId) return foundId;
    }

    // Check object fields first_preference / second_preference
    const prefField = index === 0 ? 'first_preference' : 'second_preference';
    if (booking[prefField] && typeof booking[prefField] === 'object') {
       const pref = booking[prefField];
       if (pref.id || pref.slot_id || pref.schedule_id) {
           return pref.id || pref.slot_id || pref.schedule_id;
       }
       // Fallback: match by values (day, start_time)
       const foundId = findScheduleIdFromPreference(booking, pref);
       if (foundId) return foundId;
    }

    // Check flat fields
    for (const field of legacyFields) {
      if (booking[field]) return booking[field];
    }
    
    return null;
  };

  const handleConfirmClick = (booking: any) => {
    const firstSlotId = getPreferenceSlotId(booking, 0);
    const secondSlotId = getPreferenceSlotId(booking, 1);
    
    console.log('debug confirmation:', { 
        bookingId: booking.id, 
        firstSlotId, 
        secondSlotId, 
        firstPref: booking.first_preference,
        secondPref: booking.second_preference,
        slotPrefs: booking.slot_preferences,
        schedulesData: schedulesData
    });

    const choices = [];
    
    // Helper to format preference object for display
    const formatPreference = (pref: any): string => {
      if (!pref) return 'Unknown';
      const day = pref.day || pref.day_of_week || 'TBD';
      const start = pref.start_time || pref.start || '';
      const end = pref.end_time || pref.end || '';
      // Capitalize first letter of day
      const dayCapitalized = day.charAt(0).toUpperCase() + day.slice(1);
      return `${dayCapitalized} ${start} - ${end}`;
    };
    
    if (firstSlotId) {
      // Get readable label from slotsMap or format from preference directly
      const displayLabel = slotsMap[firstSlotId] || formatPreference(booking.first_preference);
      choices.push({
        id: firstSlotId,
        label: `Choice 1: ${displayLabel}`,
        value: firstSlotId
      });
    }
    
    if (secondSlotId && secondSlotId !== firstSlotId) {
      const displayLabel = slotsMap[secondSlotId] || formatPreference(booking.second_preference);
      choices.push({
        id: secondSlotId,
        label: `Choice 2: ${displayLabel}`,
        value: secondSlotId
      });
    }

    console.log('debug choices:', choices);

    // If no schedule ID was found but we have preference objects, 
    // show them anyway but inform user to assign manually
    if (choices.length === 0) {
      const hasFirstPref = booking.first_preference && typeof booking.first_preference === 'object';
      const hasSecondPref = booking.second_preference && typeof booking.second_preference === 'object';
      
      if (hasFirstPref || hasSecondPref) {
        // We have preference info but couldn't match to a schedule
        // Show preference info in toast and open assign dialog
        const prefInfo: string[] = [];
        if (hasFirstPref) {
          prefInfo.push(`Choice 1: ${formatPreference(booking.first_preference)}`);
        }
        if (hasSecondPref) {
          prefInfo.push(`Choice 2: ${formatPreference(booking.second_preference)}`);
        }
        
        toast({ 
          variant: "default", 
          title: "Schedule Not Found", 
          description: `Applicant's preferences: ${prefInfo.join(', ')}. No matching schedule exists. Please create a schedule or assign manually.`
        });
        setSelectedBooking(booking);
        setIsAssignOpen(true);
      } else {
        // No preferences found at all
        toast({ 
          variant: "default", 
          title: "No Preferences Found", 
          description: "This booking has no schedule preferences. Please use 'Assign Schedule' to select a slot manually." 
        });
        setSelectedBooking(booking);
        setIsAssignOpen(true);
      }
    } else {
      // Show modal for 1 or more choices
      console.log('Choices found, opening modal');
      setSelectedBooking(booking);
      setConfirmationChoices(choices);
      setIsConfirmOpen(true);
    }
  };

  const handleConfirmChoice = (slotId: string) => {
      assignSlotMutation.mutate({
        bookingId: selectedBooking.id,
        scheduleId: slotId
      });
      setIsConfirmOpen(false);
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

  // Helper function to get confirmed slot from booking
  const getConfirmedSlot = (booking: any): string => {
    const slotId = booking.confirmed_slot_id;
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
              <TableHead>Confirmed Schedule</TableHead>
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
                <TableCell>
                  {getConfirmedSlot(booking)}
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
                  <div className="flex items-center justify-end">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                          <span className="sr-only">Open menu</span>
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => {
                            setSelectedBooking(booking);
                            setIsAssignOpen(true);
                          }}
                        >
                          <Calendar className="mr-2 h-4 w-4" />
                          Assign Schedule
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => {
                            setDetailBooking(booking);
                            setIsDetailOpen(true);
                          }}
                        >
                          <Eye className="mr-2 h-4 w-4" />
                          Detail
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleConfirmClick(booking)}
                          disabled={confirmMutation.isPending || assignSlotMutation.isPending}
                          className="text-green-600 focus:text-green-600"
                        >
                          <CheckCircle className="mr-2 h-4 w-4" />
                          Confirm
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => {
                            setSelectedBooking(booking);
                            setIsDeclineOpen(true);
                          }}
                          className="text-red-600 focus:text-red-600"
                        >
                          <XCircle className="mr-2 h-4 w-4" />
                          Decline
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
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

      <Dialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Booking Schedule</DialogTitle>
            <DialogDescription>
              Please confirm the schedule to assign for this booking.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
             {confirmationChoices.map((choice) => (
               <Button 
                key={choice.id} 
                variant="outline" 
                className="justify-start h-auto py-3 px-4"
                onClick={() => handleConfirmChoice(choice.value)}
              >
                <CheckCircle className="mr-2 h-4 w-4 text-green-600" />
                {choice.label}
               </Button>
             ))}
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsConfirmOpen(false)}>
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
                <p className="font-semibold mb-2">No matching schedules found</p>
                <p className="text-xs mb-1">
                  Course: <strong>{selectedBooking?.courses?.title || courseMap[selectedBooking?.course_id] || 'Unknown'}</strong>
                </p>
                {(selectedBooking?.first_preference?.instructor_id || selectedBooking?.second_preference?.instructor_id) && (
                  <p className="text-xs mb-1">
                    Preferred Instructor(s): <strong>
                      {[
                        selectedBooking?.first_preference?.instructor_id && instructorMap[selectedBooking.first_preference.instructor_id],
                        selectedBooking?.second_preference?.instructor_id && instructorMap[selectedBooking.second_preference.instructor_id]
                      ].filter(Boolean).join(', ') || 'Unknown'}
                    </strong>
                  </p>
                )}
                <p className="text-xs text-gray-600 mb-2">
                  Please create a schedule matching this course and instructor first.
                </p>
                <details className="text-xs text-gray-500">
                  <summary className="cursor-pointer">Debug Info</summary>
                  <p>Total slots from API: {availabilityData?.slots?.length ?? 0}</p>
                  <p>Booking course_id: {selectedBooking?.course_id}</p>
                  <p>First pref instructor_id: {selectedBooking?.first_preference?.instructor_id || 'N/A'}</p>
                  <p>Second pref instructor_id: {selectedBooking?.second_preference?.instructor_id || 'N/A'}</p>
                  <p>Matching slots: {slots.length}</p>
                </details>
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
                    slots.map((slot) => {
                      const current = slot.current_enrollments || 0;
                      const max = slot.max_students || 0;
                      const isFull = max > 0 && current >= max;
                      return (
                        <SelectItem key={slot.id} value={slot.id} disabled={isFull}>
                          {slot.time} {max > 0 ? `(${current}/${max})` : ''}
                        </SelectItem>
                      );
                    })
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

      {/* Decline Confirmation Dialog */}
      <AlertDialog open={isDeclineOpen} onOpenChange={setIsDeclineOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Decline Booking?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently decline the booking for {selectedBooking?.applicant_full_name || studentMap[selectedBooking?.user_id] || 'this user'}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => {
                cancelMutation.mutate(selectedBooking?.id);
                setIsDeclineOpen(false);
              }} 
              className="bg-red-600 hover:bg-red-700"
            >
              Decline
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
