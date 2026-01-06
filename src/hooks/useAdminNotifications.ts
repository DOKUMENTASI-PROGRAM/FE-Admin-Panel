import { useEffect, useRef, useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from '@/components/ui/use-toast';
import { queryKeys } from './useQueries';
import { supabase } from '@/lib/supabase';
import { RealtimeChannel } from '@supabase/supabase-js';

// Notification types matching the previous interface
export interface BookingNotification {
  eventType: 'booking.created' | 'booking.cancelled' | 'booking.updated';
  bookingId: string;
  userId: string;
  courseId: string;
  status: string;
  timestamp: string;
}

export const useAdminNotifications = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [lastNotification, setLastNotification] = useState<BookingNotification | null>(null);
  const [notifications, setNotifications] = useState<BookingNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const queryClient = useQueryClient();

  // Handle incoming notifications from Supabase Realtime
  const handleRealtimeEvent = useCallback((payload: any) => {
    console.log('🔔 Realtime event received - FULL PAYLOAD:', JSON.stringify(payload, null, 2));
    
    // Map Supabase payload to Notification format
    // Assuming 'bookings' table changes
    const newData = payload.new;
    // Supabase Realtime uses 'eventType' in uppercase: 'INSERT', 'UPDATE', 'DELETE'
    const eventTypeStr = payload.eventType;

    console.log('📦 Event Type:', eventTypeStr);
    console.log('📦 New Data:', JSON.stringify(newData, null, 2));

    if (!newData || Object.keys(newData).length === 0) {
      console.warn('⚠️ No new data in payload, skipping notification');
      return;
    }

    // Debug payload structure to find correct ID field
    console.log('🔑 New Data Keys:', Object.keys(newData));
    console.log('🔑 Possible ID fields - id:', newData.id, ', booking_id:', newData.booking_id);
    console.log('🔑 Status field:', newData.status);

    let notificationType: BookingNotification['eventType'] = 'booking.updated';
    
    if (eventTypeStr === 'INSERT') {
      notificationType = 'booking.created';
    } else if (eventTypeStr === 'UPDATE') {
       if (newData.status === 'cancelled') {
         notificationType = 'booking.cancelled';
       } else {
         notificationType = 'booking.updated';
       }
    }

    // Robust ID extraction - try multiple possible field names
    const bookingIdRaw = newData.id || newData.booking_id || newData.uuid || newData._id;
    const bookingId = bookingIdRaw ? String(bookingIdRaw) : 'unknown';
    const statusValue = newData.status || newData.booking_status || 'N/A';

    console.log('✅ Extracted - bookingId:', bookingId, ', status:', statusValue);

    const notification: BookingNotification = {
      eventType: notificationType,
      bookingId: bookingId,
      userId: newData.user_id || newData.student_id || 'unknown',
      courseId: newData.course_id || '',
      status: statusValue,
      timestamp: new Date().toISOString(),
    };

    setLastNotification(notification);
    setNotifications(prev => [notification, ...prev]);
    setUnreadCount(prev => prev + 1);

    // Show toast notification
    switch (notificationType) {
      case 'booking.created':
        toast({
          title: '🎉 Booking Baru!',
          description: `Booking Status: ${notification.status}`,
        });
        break;

      case 'booking.cancelled':
        toast({
          title: '❌ Booking Dibatalkan',
          description: `Booking ID: ${notification.bookingId.slice(0, 8)}...`,
          variant: 'destructive',
        });
        break;

      case 'booking.updated':
        toast({
          title: '✏️ Booking Diupdate',
          description: `Status: ${notification.status}`,
        });
        break;
    }

    // Invalidate booking queries to refresh data
    queryClient.invalidateQueries({ queryKey: queryKeys.bookings() });
    queryClient.invalidateQueries({ queryKey: queryKeys.dashboard() });
  }, [queryClient]);

  const markAllAsRead = useCallback(() => {
    setUnreadCount(0);
  }, []);

  const clearNotifications = useCallback(() => {
    setNotifications([]);
    setUnreadCount(0);
  }, []);

  // Connect to Supabase Realtime
  const connect = useCallback(() => {
    if (channelRef.current) return;

    console.log('🔌 Connecting to Supabase Realtime...');
    
    // Subscribe to changes in public.bookings table
    const channel = supabase
      .channel('admin-dashboard-changes')
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to all events (INSERT, UPDATE, DELETE)
          schema: 'public',
          table: 'bookings',
        },
        (payload) => {
          handleRealtimeEvent(payload);
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('✅ Subscribed to Supabase Realtime');
          setIsConnected(true);
        } else if (status === 'CLOSED') {
            console.log('❌ Disconnected from Supabase Realtime');
            setIsConnected(false);
            channelRef.current = null;
        }
      });

    channelRef.current = channel;

  }, [handleRealtimeEvent]);

  // Disconnect
  const disconnect = useCallback(() => {
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
      setIsConnected(false);
    }
  }, []);

  // Connect on mount, disconnect on unmount
  useEffect(() => {
    connect();
    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

  return {
    isConnected,
    lastNotification,
    notifications,
    unreadCount,
    markAllAsRead,
    clearNotifications,
    reconnect: connect,
  };
};
