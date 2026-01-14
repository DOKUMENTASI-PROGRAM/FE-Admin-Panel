  import { useEffect } from 'react';
  import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
  import { supabase } from '@/lib/supabase';
  import { queryKeys } from './useQueries';
  import { toast } from '@/components/ui/use-toast';

  export interface NotificationItem {
    id: string;
    type: 'info' | 'warning' | 'urgent' | 'error';
    title: string;
    message: string;
    booking_id?: string;
    created_at: string;
    is_read: boolean;
  }

  export const useAdminNotifications = () => {
    const queryClient = useQueryClient();

    // 1. FETCH Query
    const { data: notifications = [] } = useQuery({
      queryKey: queryKeys.notifications(),
      queryFn: async () => {
        const { data, error } = await supabase
          .from('notifications')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(50);
        
        if (error) throw error;
        return data as NotificationItem[];
      },
      // Remove polling, use Realtime instead
    });

    // Subscribe to Realtime changes
    useEffect(() => {
      // Use a unique channel name to prevent "mismatch between server and client bindings" errors
      // which happen when the same channel name is reused before the previous one is fully cleaned up.
      const channelId = `admin-notifications-${Date.now()}`;
      console.log(`🔌 Subscribing to Supabase Realtime (Channel: ${channelId})...`);
      
      const channel = supabase
        .channel(channelId)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'notifications',
          },
          (payload) => {
            console.log('🔔 Realtime INSERT received:', payload);
            queryClient.invalidateQueries({ queryKey: queryKeys.notifications() });
            
            const newNotif = payload.new as NotificationItem;
            toast({
                title: newNotif.title,
                description: newNotif.message,
                variant: newNotif.type === 'error' ? 'destructive' : 'default',
            });
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'notifications',
          },
          (payload) => {
            console.log('🔔 Realtime UPDATE received:', payload);
            queryClient.invalidateQueries({ queryKey: queryKeys.notifications() });
          }
        )
        .subscribe((status, err) => {
          if (status === 'SUBSCRIBED') console.log('✅ Realtime Subscribed');
          if (status === 'CHANNEL_ERROR') {
             console.error('❌ Realtime Connection Error:', err);
             // Verify RLS policies and if table 'notifications' is in 'supabase_realtime' publication
          }
        });

      return () => {
        supabase.removeChannel(channel);
      };
    }, [queryClient]);

    // Derived state from the query cache
    const unreadCount = notifications.filter(n => !n.is_read).length;

    // 2. MUTATION: Mark single as read
    const { mutateAsync: markAsRead } = useMutation({
      mutationFn: async (id: string) => {
        const { error } = await supabase
          .from('notifications')
          .update({ is_read: true })
          .eq('id', id);
        if (error) throw error;
      },
      onMutate: async (id) => {
        // Optimistic update
        await queryClient.cancelQueries({ queryKey: queryKeys.notifications() });
        const previousNotifications = queryClient.getQueryData<NotificationItem[]>(queryKeys.notifications());

        if (previousNotifications) {
          queryClient.setQueryData<NotificationItem[]>(
            queryKeys.notifications(),
            previousNotifications.map(n => n.id === id ? { ...n, is_read: true } : n)
          );
        }

        return { previousNotifications };
      },
      onError: (err, newTodo, context) => {
        if (context?.previousNotifications) {
          queryClient.setQueryData(queryKeys.notifications(), context.previousNotifications);
        }
        console.error('Error marking as read:', err);
      },
      onSettled: () => {
        queryClient.invalidateQueries({ queryKey: queryKeys.notifications() });
      },
    });

    // 3. MUTATION: Mark ALL as read
    const { mutateAsync: markAllAsRead } = useMutation({
      mutationFn: async () => {
        const { error } = await supabase
          .from('notifications')
          .update({ is_read: true })
          .is('is_read', false);
        if (error) throw error;
      },
      onMutate: async () => {
         await queryClient.cancelQueries({ queryKey: queryKeys.notifications() });
         const previousNotifications = queryClient.getQueryData<NotificationItem[]>(queryKeys.notifications());

         if (previousNotifications) {
            queryClient.setQueryData<NotificationItem[]>(
              queryKeys.notifications(),
              previousNotifications.map(n => ({ ...n, is_read: true }))
            );
         }
         return { previousNotifications };
      },
      onSettled: () => {
         queryClient.invalidateQueries({ queryKey: queryKeys.notifications() });
      },
    });

    // 4. Clear/Archive (mapped to mark all read for now)
    const clearNotifications = async () => {
      await markAllAsRead();
    };

    return {
      isConnected: true, // Assuming connected handled by Supabase client
      notifications,
      unreadCount,
      markAllAsRead,
      markAsRead,
      clearNotifications,
      reconnect: () => queryClient.invalidateQueries({ queryKey: queryKeys.notifications() }),
    };
  };
