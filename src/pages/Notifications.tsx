import { Button } from "@/components/ui/button";
import { useAdminNotifications } from "@/hooks/useAdminNotifications";
import { cn } from "@/lib/utils";
import { CheckCheck } from "lucide-react";

export default function NotificationsPage() {
  const { notifications, markAsRead, markAllAsRead } = useAdminNotifications();

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-800">Notifications</h1>
          <p className="text-sm text-gray-500 mt-1">Manage your system notifications and alerts.</p>
        </div>
        <Button variant="outline" onClick={() => markAllAsRead()} className="gap-2">
          <CheckCheck className="h-4 w-4" />
          Mark all as read
        </Button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {notifications.length === 0 ? (
          <div className="p-12 text-center">
            <div className="mx-auto h-12 w-12 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <span className="text-2xl">🔔</span>
            </div>
            <h3 className="text-lg font-medium text-gray-900">No notifications</h3>
            <p className="text-gray-500 mt-1">You're all caught up!</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {notifications.map((notification) => (
              <div 
                key={notification.id} 
                className={cn(
                  "p-6 transition-colors hover:bg-gray-50 cursor-pointer",
                  !notification.is_read ? "bg-blue-50/40" : "bg-white"
                )}
                onClick={() => !notification.is_read && markAsRead(notification.id)}
              >
                <div className="flex gap-4">
                  <div className={cn(
                    "flex-shrink-0 w-2 h-2 mt-2 rounded-full",
                    !notification.is_read ? "bg-blue-500" : "bg-transparent"
                  )} />
                  
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                         <span className={cn(
                          "text-xs font-medium px-2 py-0.5 rounded-full capitalize",
                          notification.type === 'info' ? "bg-blue-100 text-blue-700" :
                          notification.type === 'urgent' ? "bg-red-100 text-red-700" :
                          notification.type === 'warning' ? "bg-amber-100 text-amber-700" :
                          notification.type === 'error' ? "bg-red-100 text-red-800" :
                          "bg-gray-100 text-gray-700"
                        )}>
                          {notification.type}
                        </span>
                        <h4 className={cn(
                          "text-sm font-medium",
                          !notification.is_read ? "text-gray-900" : "text-gray-600"
                        )}>
                          {notification.title}
                        </h4>
                      </div>
                      <span className="text-xs text-gray-400">
                        {new Date(notification.created_at).toLocaleString()}
                      </span>
                    </div>
                    <p className={cn(
                      "text-sm",
                      !notification.is_read ? "text-gray-700" : "text-gray-500"
                    )}>
                      {notification.message}
                    </p>
                    {notification.booking_id && (
                       <p className="text-xs text-gray-400 mt-2 font-mono">
                         ID: {notification.booking_id}
                       </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
