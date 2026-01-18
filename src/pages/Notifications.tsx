import { Button } from "@/components/ui/button";
import { useAdminNotifications } from "@/hooks/useAdminNotifications";
import { cn } from "@/lib/utils";
import { CheckCheck } from "lucide-react";

// Translation helpers for notification content from backend
const translateTitle = (title: string): string => {
  const titleMap: { [key: string]: string } = {
    'New Booking Received': 'Booking Baru Diterima',
    'Booking Confirmed': 'Booking Dikonfirmasi',
    'Booking Cancelled': 'Booking Dibatalkan',
    'Payment Received': 'Pembayaran Diterima',
    'Payment Pending': 'Pembayaran Menunggu',
    'Schedule Updated': 'Jadwal Diperbarui',
    'New Student Registered': 'Siswa Baru Terdaftar',
  };

  if (titleMap[title]) return titleMap[title];

  // Dynamic Titles
  const reminderMatch = title.match(/^Payment Reminder: (.+)$/);
  if (reminderMatch) return `Pengingat Pembayaran: ${reminderMatch[1]}`;

  const dueTodayMatch = title.match(/^Payment Due Today: (.+)$/);
  if (dueTodayMatch) return `Pembayaran Jatuh Tempo Hari Ini: ${dueTodayMatch[1]}`;

  const urgentMatch = title.match(/^URGENT: Overdue 3 Days \((.+)\)$/);
  if (urgentMatch) return `PENTING: Terlambat 3 Hari (${urgentMatch[1]})`;

  const terminatedMatch = title.match(/^TERMINATED: (.+)$/);
  if (terminatedMatch) return `DITERMINASI: ${terminatedMatch[1]}`;

  return title;
};

const translateMessage = (message: string): string => {
  // Pattern: "New booking from NAME (EMAIL)"
  const bookingPattern = /^New booking from (.+) \((.+)\)$/;
  const bookingMatch = message.match(bookingPattern);
  if (bookingMatch) {
    return `Booking baru dari ${bookingMatch[1]} (${bookingMatch[2]})`;
  }
  
  // Pattern: "Payment of AMOUNT received from NAME"
  const paymentPattern = /^Payment of (.+) received from (.+)$/;
  const paymentMatch = message.match(paymentPattern);
  if (paymentMatch) {
    return `Pembayaran sebesar ${paymentMatch[1]} diterima dari ${paymentMatch[2]}`;
  }

  // 1. Reminder Pembayaran H-3
  // "Payment for [Nama Siswa] is due on [Tanggal] (in 3 days)."
  const reminderPattern = /^Payment for (.+) is due on (.+) \(in 3 days\)\.$/;
  const reminderMatch = message.match(reminderPattern);
  if (reminderMatch) {
    return `Pembayaran untuk ${reminderMatch[1]} jatuh tempo pada ${reminderMatch[2]} (dalam 3 hari).`;
  }

  // 2. Peringatan Pembayaran Jatuh Tempo H-0
  // "Status changed to Grace Period. Payment due today [Tanggal]."
  const dueTodayPattern = /^Status changed to Grace Period\. Payment due today (.+)\.$/;
  const dueTodayMatch = message.match(dueTodayPattern);
  if (dueTodayMatch) {
    return `Status berubah menjadi Masa Tenggang. Pembayaran jatuh tempo hari ini ${dueTodayMatch[1]}.`;
  }

  // 3. Keterlambatan Pembayaran H+3
  // "Payment was due on [Tanggal]. Please follow up immediately."
  const overduePattern = /^Payment was due on (.+)\. Please follow up immediately\.$/;
  const overdueMatch = message.match(overduePattern);
  if (overdueMatch) {
    return `Pembayaran jatuh tempo pada ${overdueMatch[1]}. Harap segera tindak lanjuti.`;
  }

  // 4. Terminasi Siswa H+7
  // "Student terminated due to non-payment (7 days overdue)."
  const terminatedPattern = /^Student terminated due to non-payment \(7 days overdue\)\.$/;
  /* v8 ignore next 3 */
  if (message.match(terminatedPattern)) {
    return `Siswa diterminasi karena tidak membayar (terlambat 7 hari).`;
  }
  
  return message;
};

export default function NotificationsPage() {
  const { notifications, markAsRead, markAllAsRead } = useAdminNotifications();

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-800">Notifikasi</h1>
          <p className="text-sm text-gray-500 mt-1">Kelola notifikasi dan peringatan sistem Anda.</p>
        </div>
        <Button variant="outline" onClick={() => markAllAsRead()} className="gap-2">
          <CheckCheck className="h-4 w-4" />
          Tandai semua dibaca
        </Button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {notifications.length === 0 ? (
          <div className="p-12 text-center">
            <div className="mx-auto h-12 w-12 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <span className="text-2xl">🔔</span>
            </div>
            <h3 className="text-lg font-medium text-gray-900">Tidak ada notifikasi</h3>
            <p className="text-gray-500 mt-1">Anda sudah membaca semuanya!</p>
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
                          {notification.type === 'info' ? 'Info' :
                           notification.type === 'urgent' ? 'Penting' :
                           notification.type === 'warning' ? 'Peringatan' :
                           notification.type === 'error' ? 'Kesalahan' : notification.type}
                        </span>
                        <h4 className={cn(
                          "text-sm font-medium",
                          !notification.is_read ? "text-gray-900" : "text-gray-600"
                        )}>
                        {translateTitle(notification.title)}
                        </h4>
                      </div>
                      <span className="text-xs text-gray-400">
                        {new Date(notification.created_at).toLocaleString('id-ID')}
                      </span>
                    </div>
                    <p className={cn(
                      "text-sm",
                      !notification.is_read ? "text-gray-700" : "text-gray-500"
                    )}>
                      {translateMessage(notification.message)}
                    </p>
                    {notification.booking_id && (
                       <p className="text-xs text-gray-400 mt-2 font-mono">
                         ID Booking: {notification.booking_id}
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
