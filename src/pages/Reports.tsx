import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { RefreshCw, FileSpreadsheet } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { TableSkeleton } from '@/components/TableSkeleton';
import api from '@/services/api';

interface DashboardPayment {
  id: number;
  booking_id: string;
  amount: number;
  booking: {
    applicant_full_name: string;
    course: {
      title: string;
    };
  };
  applicant_full_name?: string; // Sometimes flattened or in booking
  notes: string;
  payment_date: string;
  payment_method: string;
  payment_period: string;
  payment_proof: string;
  status?: string; // Might be missing, infer from notes or assume success if in this list?
}

export default function ReportsPage() {
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [isExporting, setIsExporting] = useState(false);
  const { toast } = useToast();

  // Fetch payments from Dashboard API as requested
  // Note: The dashboard endpoint might not accept startDate/endDate filters naturally 
  // unless we append them. We will try to filter client-side if the API doesn't support params.
  const { 
    data: dashboardData, 
    isLoading, 
    refetch 
  } = useQuery({
    queryKey: ['dashboard-reports'],
    queryFn: async () => {
       const res = await api.get('/api/admin/dashboard');
       // The user snippet shows the structure: { success: true, data: { ..., recentPayments: [...] } }
       // But useDashboard hook returns res.data.data. 
       // Let's assume standard response structure. UseDashboard hook in useQueries.ts returns res.data.data.
       // So valid data is res.data.data
       return res.data.data;
    },
  });

  const payments = useMemo(() => {
    // Extract recentPayments from dashboard data
    const rawPayments = (dashboardData?.recentPayments || []) as DashboardPayment[];
    
    // Apply client-side filtering because dashboard API "usually" returns fixed set, 
    // but if we want to support the requested date filters on this specific dataset:
    let filtered = rawPayments;

    if (dateFrom) {
       filtered = filtered.filter(p => new Date(p.payment_date) >= new Date(dateFrom));
    }
    if (dateTo) {
       // End of day
       const toDate = new Date(dateTo);
       toDate.setHours(23, 59, 59);
       filtered = filtered.filter(p => new Date(p.payment_date) <= toDate);
    }
    
    return filtered;
  }, [dashboardData, dateFrom, dateTo]);

  const normalizeStatus = (status?: string, notes?: string) => {
    const val = status || notes || 'Success';
    if (['success', 'lunas'].includes(val.toLowerCase())) {
        return 'Lunas';
    }
    return val;
  };

  const handleRefresh = () => {
    refetch();
    toast({ title: "Refreshed", description: "Report data has been refreshed" });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const handleExport = async () => {
    setIsExporting(true);
    try {
      if (payments && payments.length > 0) {
        // Define headers
        const headers = [
          'Nama Siswa',
          'Tanggal Pembayaran',
          'Periode Pembayaran',
          'Amount Pembayaran',
          'Status'
        ];

        // Map data to CSV rows
        const checkValue = (val: any) => val || '-';
        
        const rows = payments.map((payment) => {
           const date = new Date(payment.payment_date).toLocaleDateString('id-ID');
           const amount = payment.amount || 0;
           let period = checkValue(payment.payment_period);
           
           // Helper to get student name
           const studentName = payment.applicant_full_name || payment.booking?.applicant_full_name;
           
           // Helper to get status - prioritize 'notes' if status missing, or default
           // User sample has "notes": "Lunas". 
           const status = normalizeStatus(payment.status, payment.notes);

           return [
             checkValue(studentName),
             date,
             period,
             amount,
             checkValue(status)
           ].map(field => `"${String(field).replace(/"/g, '""')}"`).join(','); 
        });

        const csvContent = [headers.join(','), ...rows].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `payment_report_${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        toast({ title: "Exported", description: "Payment report exported as CSV" });
      } else {
         toast({ variant: "destructive", title: "Export Failed", description: "No data available to export" });
      }
    } catch (error: any) {
      console.error('Export error:', error);
      toast({ 
        variant: "destructive", 
        title: "Export Failed", 
        description: error.message || "Failed to export data" 
      });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold tracking-tight">Financial Reports</h2>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleRefresh} disabled={isLoading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button variant="outline" onClick={handleExport} disabled={isExporting || isLoading || payments.length === 0}>
             {isExporting ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <FileSpreadsheet className="mr-2 h-4 w-4" />}
             Export CSV
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filter Report</CardTitle>
          <CardDescription>Filter payments by date range</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">From Date</label>
              <Input 
                type="date" 
                value={dateFrom} 
                onChange={(e) => setDateFrom(e.target.value)} 
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">To Date</label>
              <Input 
                type="date" 
                value={dateTo} 
                onChange={(e) => setDateTo(e.target.value)} 
              />
            </div>
            <div className="flex items-end">
              <Button onClick={() => refetch()} disabled={isLoading} className="w-full md:w-auto">
                Reload Data
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Payment Report Table */}
      <Card>
        <CardHeader>
          <CardTitle>Payment Report</CardTitle>
          <CardDescription>
            {payments ? `${payments.length} records found (Source: Dashboard)` : 'Loading...'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <TableSkeleton columnCount={5} rowCount={5} />
          ) : payments && payments.length > 0 ? (
            <div className="border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student Name</TableHead>
                    <TableHead>Payment Date</TableHead>
                    <TableHead>Period</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payments.map((payment) => (
                    <TableRow key={payment.id}>
                      <TableCell className="font-medium">
                        {payment.applicant_full_name || payment.booking?.applicant_full_name || '-'}
                      </TableCell>
                      <TableCell>
                        {new Date(payment.payment_date).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        {payment.payment_period || '-'}
                      </TableCell>
                      <TableCell>
                        {formatCurrency(payment.amount)}
                      </TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize
                          bg-green-100 text-green-800`}>
                          {normalizeStatus(payment.status, payment.notes)}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              No payment records found.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
