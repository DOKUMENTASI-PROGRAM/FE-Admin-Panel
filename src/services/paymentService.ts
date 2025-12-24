import api from './api';
import { Payment, PaymentFilterParams, CreatePaymentDTO, UpdatePaymentDTO } from '../types/payment';

// Helper to convert object params to query string
const buildQueryParams = (params: PaymentFilterParams) => {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      query.append(key, String(value));
    }
  });
  return query.toString();
};

const getPayments = async (params: PaymentFilterParams & { page?: number, limit?: number } = {}) => {
  const queryString = buildQueryParams(params);
  const endpoint = queryString 
    ? `/api/admin/payments?${queryString}` 
    : '/api/admin/payments';
  const response = await api.get(endpoint);
  return response.data;
};

const getPaymentById = async (id: string): Promise<Payment> => {
  const response = await api.get(`/api/admin/payments/${id}`);
  return response.data.data.payment;
};

const createPayment = async (data: CreatePaymentDTO) => {
  // If there's a file, we might need FormData, assuming backend handles multipart/form-data
  // But standard JSON usually preferred if file upload is separate. 
  // For this implementation, I'll assume JSON for data and separate or base64 for file if needed.
  // Or FormData if it's a standard upload. Let's use standard JSON for now as indicated in general simple CRUDs.
  // If file upload is needed, we'd typically use FormData.
  
  // ADJUSTMENT: Using FormData to be safe if file is present, otherwise simple JSON
  /* 
  const formData = new FormData();
  formData.append('student_id', data.student_id);
  formData.append('amount', String(data.amount));
  // ... append others
  if (data.proof_file) formData.append('proof_file', data.proof_file);
  */
 
  // Falling back to JSON as per standard Admin service patterns observed unless specified otherwise.
  const response = await api.post('/api/admin/payments', data);
  return response.data;
};

const updatePayment = async (id: string, data: UpdatePaymentDTO) => {
  const response = await api.put(`/api/admin/payments/${id}`, data);
  return response.data;
};

const deletePayment = async (id: string) => {
  const response = await api.delete(`/api/admin/payments/${id}`);
  return response.data;
};

export const paymentService = {
  getPayments,
  getPaymentById,
  createPayment,
  updatePayment,
  deletePayment,
};
