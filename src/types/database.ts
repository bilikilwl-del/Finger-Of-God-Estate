/**
 * Estate Security Levy Management System - Database Types
 * Covers Stage 1 Core Tables and Future Stage Relational Types
 */

export type ResidentStatus = 'Active' | 'Inactive';

export interface Resident {
  id: string;
  resident_number: string; // e.g. "001", "002", "010", "100", "300", "500", etc.
  full_name: string;
  phone_number: string;
  additional_phone?: string | null; // Optional secondary emergency contact
  email: string | null;
  house_number: string; // Plot or House No
  address: string; // Street address inside or around estate
  state: string;
  lga: string;
  notes?: string | null; // Optional resident notes/remarks
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

export type PaymentStatus = 
  | 'UNPAID' 
  | 'PENDING' 
  | 'PAID' 
  | 'FAILED' 
  | 'CANCELLED'
  | 'Paid' 
  | 'Unpaid' 
  | 'Pending' 
  | 'Failed';

export interface MonthlyPayment {
  id: string;
  resident_id: string;
  resident_number: string;
  period_month: number; // 1 - 12
  period_year: number; // >= 2026
  period_label: string; // e.g. "October 2026"
  amount_due: number; // 5000.00
  amount_paid: number; // 5000.00 when PAID, 0 when UNPAID
  status: PaymentStatus;
  due_date: string;
  paid_at?: string | null;
  paystack_reference?: string | null;
  created_at: string;
  updated_at: string;
  resident?: Resident;
}

export interface PaymentTransaction {
  id: string;
  payment_id?: string;
  resident_id: string;
  resident_number: string;
  period_month: number;
  period_year: number;
  period_label: string;
  transaction_reference: string; // e.g. FOGES-202610-001-XXXXXXXX
  paystack_reference?: string | null;
  paystack_transaction_id?: string | null;
  amount_due: number;
  amount_paid: number;
  currency: string;
  payment_method: 'Paystack' | 'Bank Transfer' | 'Cash' | 'POS' | 'Cheque';
  status: 'UNPAID' | 'PENDING' | 'PAID' | 'FAILED' | 'CANCELLED' | 'Success' | 'Pending' | 'Failed' | 'Abandoned';
  payment_channel?: string | null;
  payment_date?: string | null;
  gateway_response?: string | null;
  customer_email?: string | null;
  channel_details?: Record<string, unknown>;
  created_by_admin?: string;
  created_at: string;
  updated_at?: string;
  resident?: Resident;
}

export type SMSReminderType = 'REMINDER_1' | 'REMINDER_2' | 'TEST' | 'MANUAL';
export type SMSDeliveryStatus = 'SENT' | 'DELIVERED' | 'FAILED' | 'PENDING' | 'NOT_CONFIGURED';

export interface SMSLog {
  id: string;
  resident_id: string;
  resident_number: string;
  phone_number: string;
  payment_month: number;
  payment_year: number;
  period_label: string;
  reminder_type: SMSReminderType;
  message: string;
  provider: string;
  provider_message_id?: string | null;
  delivery_status: SMSDeliveryStatus;
  sent_at?: string | null;
  error_message?: string | null;
  created_at: string;
  resident?: Resident;
}

export interface SMSConfigStatus {
  isConfigured: boolean;
  provider: string;
  senderId: string;
  channel: string;
  lastSuccessfulSms?: string | null;
  lastFailedSms?: string | null;
}

export interface SMSSummaryStats {
  sentToday: number;
  sentThisMonth: number;
  reminder1Sent: number;
  reminder2Sent: number;
  failedSms: number;
  pendingSms: number;
  totalLogged: number;
}

export interface Receipt {
  id: string;
  receipt_number: string; // e.g. "RCP-202610-001-A7B2C3"
  transaction_id: string;
  payment_id: string;
  resident_id: string;
  resident_number: string;
  resident_name: string;
  house_number: string;
  amount_paid: number;
  currency: string;
  period_covered: string; // "October 2026"
  payment_date: string;
  paystack_reference: string;
  status: 'PAID' | 'Paid';
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
  action: 'CREATED_RESIDENT' | 'UPDATED_RESIDENT' | 'STATUS_CHANGED' | 'ACTIVATED_RESIDENT' | 'DEACTIVATED_RESIDENT' | 'DELETED_RESIDENT' | 'UPDATED_SETTINGS' | 'ADMIN_LOGIN' | 'ADMIN_LOGOUT' | 'PASSWORD_RESET';
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
