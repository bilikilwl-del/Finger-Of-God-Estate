/**
 * Estate Security Levy Management System - Database Types
 * Covers Stage 1 Core Tables and Future Stage Relational Types
 */

export type ResidentStatus = 'Active' | 'Inactive';

export interface Resident {
  id: string;
  resident_number: string; // e.g. "001", "002", "010", "100"
  full_name: string;
  phone_number: string;
  email: string | null;
  house_number: string; // Plot or House No
  address: string; // Street address inside or around estate
  state: string;
  lga: string;
  registration_date: string; // YYYY-MM-DD
  status: ResidentStatus;
  created_at: string;
  updated_at: string;
}

export interface EstateSettings {
  id: string;
  estate_name: string;
  estate_address: string;
  estate_state: string;
  estate_lga: string;
  monthly_security_levy: number; // Default 5000.00
  payment_due_day: number; // Default 1
  currency: string; // Default 'NGN' (₦)
  contact_phone: string;
  contact_email: string;
  sms_sender_name: string;
  first_payment_month: string; // Default 'October 2026'
  created_at?: string;
  updated_at?: string;
}

export interface AdminUser {
  id: string;
  auth_user_id?: string;
  full_name: string;
  email: string;
  role: 'Super Admin' | 'Administrator' | 'Security Officer' | 'Accountant';
  status: 'Active' | 'Inactive';
  created_at: string;
  updated_at?: string;
}

export type PaymentStatus = 'Paid' | 'Unpaid' | 'Partially Paid' | 'Overdue';

export interface MonthlyPayment {
  id: string;
  resident_id: string;
  period_month: number; // 1 - 12
  period_year: number; // >= 2026
  period_label: string; // e.g. "October 2026"
  amount_due: number;
  amount_paid: number;
  status: PaymentStatus;
  due_date: string;
  paid_at?: string | null;
  created_at: string;
  updated_at: string;
  resident?: Resident;
}

export interface PaymentTransaction {
  id: string;
  payment_id?: string;
  resident_id: string;
  transaction_reference: string;
  paystack_reference?: string | null;
  amount: number;
  currency: string;
  payment_method: 'Paystack' | 'Bank Transfer' | 'Cash' | 'POS' | 'Cheque';
  status: 'Success' | 'Pending' | 'Failed' | 'Abandoned';
  channel_details?: Record<string, unknown>;
  created_by_admin?: string;
  created_at: string;
  resident?: Resident;
}

export interface SMSLog {
  id: string;
  resident_id?: string | null;
  recipient_phone: string;
  message_type: 'Payment Reminder' | 'Receipt Alert' | 'Overdue Notice' | 'Broadcast Announcement';
  message_content: string;
  sms_provider: string;
  message_id?: string;
  status: 'Sent' | 'Delivered' | 'Failed' | 'Pending';
  error_message?: string;
  sent_at?: string;
  created_at: string;
  resident?: Resident;
}

export interface Receipt {
  id: string;
  receipt_number: string;
  transaction_id: string;
  payment_id: string;
  resident_id: string;
  amount_paid: number;
  period_covered: string;
  pdf_url?: string;
  issued_at: string;
  resident?: Resident;
}

export interface Announcement {
  id: string;
  title: string;
  content: string;
  priority: 'Low' | 'Normal' | 'High' | 'Emergency';
  published_by: string;
  is_published: boolean;
  published_at: string;
  created_at: string;
}

export interface ActivityLog {
  id: string;
  admin_email: string;
  action: 'CREATED_RESIDENT' | 'UPDATED_RESIDENT' | 'STATUS_CHANGED' | 'DELETED_RESIDENT' | 'UPDATED_SETTINGS' | 'ADMIN_LOGIN' | 'ADMIN_LOGOUT' | 'PASSWORD_RESET';
  entity_type: 'resident' | 'estate_settings' | 'auth' | 'admin_user';
  entity_id?: string | null;
  description: string;
  metadata?: Record<string, unknown>;
  created_at: string;
}

export type NavigationTab = 
  | 'dashboard'
  | 'residents'
  | 'payments'
  | 'outstanding'
  | 'sms'
  | 'reports'
  | 'announcements'
  | 'admins'
  | 'settings'
  | 'logs';
