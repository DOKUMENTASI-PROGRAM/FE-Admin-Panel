export type PaymentStatus = 'pending' | 'success' | 'failed' | 'refunded';
export type PaymentMethod = 'transfer' | 'cash' | 'qris' | 'virtual_account';
export type PaymentType = 'monthly' | 'registration' | 'other';

export interface Payment {
  id: string;
  student_id: string;
  student_name: string; // Often joined from student/user table
  amount: number;
  payment_date: string;
  payment_method: PaymentMethod;
  payment_type: PaymentType;
  status: PaymentStatus;
  notes?: string;
  proof_url?: string;
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
  student_id: string;
  amount: number;
  payment_date: string;
  payment_method: PaymentMethod;
  payment_type: PaymentType;
  notes?: string;
  proof_file?: File; // For upload
}

export interface UpdatePaymentDTO {
  status?: PaymentStatus;
  notes?: string;
}
