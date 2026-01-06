export type PaymentStatus = 'pending' | 'success' | 'failed' | 'refunded';
export type PaymentMethod = 'cash' | 'BCA' | 'Initial Booking';
export type PaymentType = 'monthly' | 'registration' | 'other';

export interface Payment {
  id: string;
  booking_id?: string; // From API
  student_id?: string;
  student_name?: string; // Often joined from student/user table
  amount: number;
  payment_date: string;
  payment_method: PaymentMethod;
  payment_type?: PaymentType;
  status?: PaymentStatus;
  notes?: string;
  payment_period?: string;
  payment_proof?: string;
  created_at: string;
  updated_at: string;
}

export interface PaymentFilterParams {
  page?: number;
  limit?: number;
  status?: PaymentStatus;
  search?: string; // Search by student name
  startDate?: string;
  endDate?: string;
}

export interface CreatePaymentDTO {
  booking_id: string;
  amount: number;
  payment_date: string;
  payment_method: PaymentMethod;
  payment_period: string;
  notes?: string;
  payment_proof?: string;
}

export interface UpdatePaymentDTO {
  booking_id?: string;
  amount?: number;
  payment_date?: string;
  payment_method?: PaymentMethod;
  payment_period?: string;
  status?: PaymentStatus;
  notes?: string;
  payment_proof?: string;
}
