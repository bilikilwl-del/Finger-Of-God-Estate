/**
 * Estate Security Levy Management System - Database Types
 * Covers Stage 1 Core Tables and Future Stage Relational Types
 */

export type ResidentStatus = 'Active' | 'Inactive';

export interface Resident {
  id: string;
  auth_user_id?: string | null; // Linked Supabase Auth User ID
  account_activated?: boolean; // Indicates if online account has been activated
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

export type AdminRole = 
  | 'SUPER_ADMIN' 
  | 'ADMIN' 
  | 'FINANCE' 
  | 'VIEWER' 
  | 'Super Admin' 
  | 'Administrator' 
  | 'Security Officer' 
  | 'Accountant';

export interface AdminUser {
  id: string;
  auth_user_id?: string;
  full_name: string;
  email: string;
  role: AdminRole;
  status?: 'Active' | 'Inactive';
  created_at: string;
  updated_at?: string;
  last_login?: string;
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
  updated_at?: string;
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

export type AnnouncementCategory = 
  | 'GENERAL' 
  | 'SECURITY' 
  | 'PAYMENT' 
  | 'MAINTENANCE' 
  | 'MEETING' 
  | 'EMERGENCY' 
  | 'OTHER';

export type AnnouncementPriority = 
  | 'NORMAL' 
  | 'IMPORTANT' 
  | 'URGENT'
  | 'Low' 
  | 'Normal' 
  | 'High' 
  | 'Emergency';

export type AnnouncementStatus = 
  | 'DRAFT' 
  | 'PUBLISHED' 
  | 'ARCHIVED';

export interface Announcement {
  id: string;
  title: string;
  slug: string;
  body: string;
  content?: string;
  category: AnnouncementCategory;
  priority: AnnouncementPriority;
  status: AnnouncementStatus;
  publish_at: string;
  expires_at?: string | null;
  author_id?: string;
  author_name?: string;
  published_by?: string;
  is_published?: boolean;
  attachment_url?: string | null;
  image_url?: string | null;
  created_at: string;
  updated_at?: string;
}

export interface ActivityLog {
  id: string;
  admin_email: string;
  action: 
    | 'CREATED_RESIDENT' 
    | 'UPDATED_RESIDENT' 
    | 'STATUS_CHANGED' 
    | 'ACTIVATED_RESIDENT' 
    | 'DEACTIVATED_RESIDENT' 
    | 'DELETED_RESIDENT' 
    | 'UPDATED_SETTINGS' 
    | 'ADMIN_LOGIN' 
    | 'ADMIN_LOGOUT' 
    | 'PASSWORD_RESET'
    | 'REPORT_GENERATED'
    | 'PAYMENT_VIEWED'
    | 'RECEIPT_VIEWED'
    | 'SMS_TEST_SENT'
    | 'ROLE_SWITCHED'
    | 'ANNOUNCEMENT_CREATED'
    | 'ANNOUNCEMENT_UPDATED'
    | 'ANNOUNCEMENT_PUBLISHED'
    | 'ANNOUNCEMENT_ARCHIVED'
    | 'ANNOUNCEMENT_DELETED'
    | 'INCIDENT_CREATED'
    | 'INCIDENT_UPDATED'
    | 'INCIDENT_ASSIGNED'
    | 'INCIDENT_STATUS_CHANGED'
    | 'INCIDENT_RESOLVED'
    | 'INCIDENT_CLOSED'
    | 'EMERGENCY_REPORTED'
    | 'SECURITY_ALERT_CREATED'
    | 'SECURITY_ALERT_UPDATED'
    | 'SECURITY_ALERT_DEACTIVATED'
    | 'VISITOR_REGISTERED'
    | 'VISITOR_CHECKED_IN'
    | 'VISITOR_CHECKED_OUT'
    | 'VISITOR_DENIED'
    | 'GATE_LOG_RECORDED'
    | 'PATROL_LOGGED';
  entity_type: 
    | 'resident' 
    | 'estate_settings' 
    | 'auth' 
    | 'admin_user' 
    | 'payment' 
    | 'report' 
    | 'receipt' 
    | 'sms' 
    | 'announcement'
    | 'incident'
    | 'security_alert'
    | 'visitor'
    | 'gate_log'
    | 'officer'
    | 'patrol';
  entity_id?: string | null;
  description: string;
  metadata?: Record<string, unknown>;
  created_at: string;
}

export type NavigationTab = 
  | 'home'
  | 'public_announcements'
  | 'announcement_detail'
  | 'login'
  | 'dashboard'
  | 'residents'
  | 'security_ops'
  | 'payments'
  | 'paid_residents'
  | 'unpaid_residents'
  | 'outstanding'
  | 'sms'
  | 'reports'
  | 'announcements'
  | 'admins'
  | 'settings'
  | 'logs'
  | 'resident_portal'
  | 'verify_receipt';

export interface MonthlyFinancialSummary {
  period_month: number;
  period_year: number;
  period_label: string;
  total_active_residents: number;
  total_inactive_residents: number;
  total_residents: number;
  monthly_levy: number;
  total_expected: number;
  total_collected: number;
  total_outstanding: number;
  paid_residents_count: number;
  unpaid_residents_count: number;
  pending_payments_count: number;
  failed_payments_count: number;
  collection_percentage: number;
}

export interface CollectionHistoryRecord {
  period_month: number;
  period_year: number;
  period_label: string;
  eligible_residents: number;
  expected_amount: number;
  collected_amount: number;
  outstanding_amount: number;
  paid_count: number;
  unpaid_count: number;
  collection_percentage: number;
}

export interface PaidResidentRecord {
  resident_number: string;
  resident_name: string;
  house_number: string;
  phone_number: string;
  amount_paid: number;
  payment_date: string;
  payment_reference: string;
  receipt_number: string;
  payment_channel?: string;
}

export interface UnpaidResidentRecord {
  resident_number: string;
  resident_name: string;
  house_number: string;
  phone_number: string;
  amount_due: number;
  payment_status: string;
  reminder_status: 'NONE' | 'REMINDER_1' | 'REMINDER_2';
  last_reminder_date?: string | null;
}

export interface OutstandingLevyRecord {
  resident_number: string;
  resident_name: string;
  house_number: string;
  period_label: string;
  amount_due: number;
  amount_paid: number;
  outstanding_amount: number;
  status: string;
}

export interface GlobalPaymentSearchResult {
  id: string;
  resident_number: string;
  resident_name: string;
  phone_number: string;
  house_number: string;
  period_label: string;
  amount_due: number;
  amount_paid: number;
  status: string;
  paystack_reference?: string | null;
  receipt_number?: string | null;
  payment_date?: string | null;
  payment_channel?: string | null;
}

export interface ResidentDashboardData {
  resident: Resident;
  summary: {
    currentMonthStatus: PaymentStatus | 'PAID' | 'UNPAID' | 'PENDING' | 'FAILED' | 'CANCELLED';
    currentMonthLabel: string;
    totalPaid: number;
    totalOutstanding: number;
    monthsPaid: number;
    monthsOutstanding: number;
    levyAmount: number;
  };
  currentMonthPayment: MonthlyPayment;
  outstandingLevies: MonthlyPayment[];
  paymentHistory: MonthlyPayment[];
  transactions: PaymentTransaction[];
  receipts: Receipt[];
}

export interface PublicReceiptVerification {
  valid: boolean;
  status: 'VALID' | 'INVALID' | 'NOT_FOUND';
  receipt?: {
    receipt_number: string;
    status: string;
    resident_number: string;
    resident_name: string;
    house_number?: string;
    period_covered: string;
    amount_paid: number;
    currency: string;
    payment_date: string;
    paystack_reference: string;
    payment_gateway: string;
    issued_at: string;
    estate_name: string;
  };
  message?: string;
}

// ==========================================
// STAGE 10: SECURITY OPERATIONS & INCIDENT MANAGEMENT TYPES
// ==========================================

export type IncidentType =
  | 'Theft'
  | 'Burglary'
  | 'Suspicious activity'
  | 'Trespassing'
  | 'Property damage'
  | 'Fight/disturbance'
  | 'Fire'
  | 'Medical emergency'
  | 'Missing person'
  | 'Vehicle-related incident'
  | 'Power/electrical emergency'
  | 'Gate/security breach'
  | 'Other';

export type IncidentStatus =
  | 'New'
  | 'Acknowledged'
  | 'Investigating'
  | 'Action Required'
  | 'Resolved'
  | 'Closed';

export type IncidentPriority = 'Low' | 'Medium' | 'High' | 'Critical';

export interface IncidentEvidence {
  id: string;
  incident_id: string;
  file_name: string;
  file_type: 'image' | 'video' | 'document';
  url: string;
  size_bytes?: number;
  uploaded_by: string;
  uploaded_at: string;
  notes?: string;
}

export interface IncidentTimelineEntry {
  id: string;
  incident_id: string;
  timestamp: string;
  title: string;
  description: string;
  performed_by: string;
  performed_by_role?: string;
  action_type: 
    | 'REPORT_CREATED'
    | 'ACKNOWLEDGED'
    | 'OFFICER_ASSIGNED'
    | 'INVESTIGATION_STARTED'
    | 'EVIDENCE_ADDED'
    | 'STATUS_CHANGED'
    | 'PRIORITY_CHANGED'
    | 'NOTE_ADDED'
    | 'RESOLVED'
    | 'CLOSED';
}

export interface Incident {
  id: string;
  incident_number: string; // e.g. "FOG-INC-2026-0001"
  incident_type: IncidentType;
  priority: IncidentPriority;
  status: IncidentStatus;
  
  // Temporal & Spatial
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  location: string;
  house_number?: string | null;
  phase?: string;
  
  // Content
  title?: string;
  description: string;
  people_involved?: string | null;
  vehicle_details?: string | null;
  additional_notes?: string | null;
  
  // Reporter
  reporter_type: 'Resident' | 'Security Officer' | 'Visitor' | 'Staff' | 'Anonymous';
  reported_by: string; // Full Name
  reporter_phone?: string | null;
  reporter_email?: string | null;
  reporter_resident_number?: string | null;
  is_emergency: boolean;
  
  // Assignment & Resolution
  assigned_officer_id?: string | null;
  assigned_officer_name?: string | null;
  assigned_officer_phone?: string | null;
  investigation_notes?: string | null;
  actions_taken?: string | null;
  resolution_summary?: string | null;
  resolved_at?: string | null;
  closed_at?: string | null;
  
  // Relational items
  evidence: IncidentEvidence[];
  timeline: IncidentTimelineEntry[];
  
  created_at: string;
  updated_at: string;
}

export type OfficerStatus = 'On Duty' | 'Off Duty' | 'On Patrol' | 'Responding' | 'Unavailable';
export type OfficerShift = 'Morning (06:00 - 14:00)' | 'Afternoon (14:00 - 22:00)' | 'Night (22:00 - 06:00)' | '24-Hour Special';

export interface SecurityOfficer {
  id: string;
  officer_badge_id: string; // e.g. "FOG-SEC-01"
  full_name: string;
  phone_number: string;
  email?: string | null;
  rank: 'Chief Security Officer' | 'Security Supervisor' | 'Patrol Officer' | 'Gate Controller' | 'Response Guard';
  shift: OfficerShift;
  status: OfficerStatus;
  assigned_area?: string;
  avatar_url?: string;
  current_location?: string;
  active_incidents_count: number;
  created_at: string;
}

export type SecurityAlertCategory =
  | 'Security warning'
  | 'Gate restriction'
  | 'Suspicious activity warning'
  | 'Emergency announcement'
  | 'Missing person alert'
  | 'Weather/environmental warning'
  | 'Estate-wide security notice';

export interface SecurityAlert {
  id: string;
  alert_code: string; // e.g. "FOG-ALT-2026-001"
  title: string;
  message: string;
  category: SecurityAlertCategory;
  priority: 'Low' | 'Medium' | 'High' | 'Critical';
  start_time: string;
  expiry_time: string;
  target_audience: 'All Residents' | 'Phase 1' | 'Phase 2' | 'Commercial Area' | 'Security Personnel';
  is_active: boolean;
  created_by: string;
  created_at: string;
  updated_at?: string;
}

export type VisitorStatus = 'Expected' | 'Arrived' | 'Departed' | 'Denied' | 'Expired' | 'Cancelled';

export interface VisitorPass {
  id: string;
  pass_code: string; // e.g. "FOG-VIS-9812"
  visitor_name: string;
  visitor_phone: string;
  vehicle_number?: string | null;
  vehicle_description?: string | null;
  purpose_of_visit: string;
  
  // Host Resident
  resident_id: string;
  resident_number: string;
  resident_name: string;
  house_number: string;
  resident_phone: string;
  
  // Timing
  expected_arrival: string; // ISO / YYYY-MM-DDTHH:mm
  expected_departure?: string;
  entry_time?: string | null;
  exit_time?: string | null;
  
  status: VisitorStatus;
  denial_reason?: string | null;
  checked_in_by?: string | null; // Officer name/badge
  checked_out_by?: string | null;
  qr_code_data: string;
  notes?: string | null;
  created_at: string;
}

export type GateEntityType = 'Visitor' | 'Resident' | 'Contractor' | 'Delivery' | 'Staff' | 'Service Vehicle' | 'Security Patrol';

export interface GateLogEntry {
  id: string;
  log_number: string; // e.g. "GL-20260924-001"
  movement_type: 'Entry' | 'Exit';
  entity_type: GateEntityType;
  name: string;
  phone_number?: string;
  vehicle_number?: string;
  house_number?: string;
  destination: string;
  pass_code?: string | null;
  officer_badge: string;
  officer_name: string;
  timestamp: string;
  notes?: string | null;
}

export type PatrolStatus = 'Scheduled' | 'In Progress' | 'Completed' | 'Aborted';

export interface PatrolRecord {
  id: string;
  patrol_code: string; // e.g. "PTR-20260924-01"
  officer_id: string;
  officer_name: string;
  officer_badge: string;
  patrol_area: string; // e.g. "Phase 1 Perimeter & North Gate"
  start_time: string;
  end_time?: string | null;
  status: PatrolStatus;
  checkpoints_count: number;
  checkpoints_completed: number;
  issues_discovered: string[];
  notes?: string;
  created_at: string;
}

export interface SecurityOperationsSummary {
  security_status: 'Normal' | 'Elevated Alert' | 'Emergency' | 'Restricted Access';
  active_incidents_count: number;
  open_incidents_count: number;
  investigating_count: number;
  resolved_incidents_count: number;
  pending_reports_count: number;
  critical_incidents_count: number;
  active_alerts_count: number;
  visitors_inside_count: number;
  expected_visitors_today: number;
  emergency_reports_count: number;
  officers_on_duty_count: number;
  active_patrols_count: number;
}


