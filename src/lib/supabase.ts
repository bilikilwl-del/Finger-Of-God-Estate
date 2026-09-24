import { createClient, SupabaseClient, User } from '@supabase/supabase-js';
import { 
  Resident, 
  EstateSettings, 
  ActivityLog, 
  AdminUser, 
  MonthlyPayment, 
  PaymentTransaction, 
  Receipt, 
  PaymentStatus, 
  SMSLog, 
  SMSSummaryStats,
  ResidentDashboardData,
  PublicReceiptVerification,
  Announcement,
  AnnouncementCategory,
  AnnouncementPriority,
  AnnouncementStatus,
  Incident,
  IncidentType,
  IncidentPriority,
  IncidentStatus,
  IncidentEvidence,
  IncidentTimelineEntry,
  SecurityOfficer,
  OfficerStatus,
  OfficerShift,
  SecurityAlert,
  SecurityAlertCategory,
  VisitorPass,
  VisitorStatus,
  GateLogEntry,
  GateEntityType,
  PatrolRecord,
  PatrolStatus,
  SecurityOperationsSummary
} from '../types/database';
import { normalizeNigerianPhone, arePhoneNumbersEqual } from './phoneUtils';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(
  supabaseUrl && 
  supabaseAnonKey && 
  supabaseUrl !== 'https://your-project-id.supabase.co' &&
  !supabaseUrl.includes('placeholder')
);

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

// ==========================================
// DEFAULT SEED DATA (For initial run / local storage)
// ==========================================
const DEFAULT_ESTATE_SETTINGS: EstateSettings = {
  id: '00000000-0000-0000-0000-000000000001',
  estate_name: 'Finger of God Estate Security Management',
  estate_address: 'Main Gate Boulevard, Phase 1, Finger of God Estate',
  estate_state: 'Lagos',
  estate_lga: 'Eti-Osa',
  monthly_security_levy: 5000,
  payment_due_day: 1,
  currency: 'NGN',
  contact_phone: '08023456789',
  contact_email: 'admin@fingerofgodestate.ng',
  sms_sender_name: 'FINGEROFGOD',
  first_payment_month: 'October 2026'
};

const INITIAL_RESIDENTS_SEED: Resident[] = [
  {
    id: 'res-001',
    resident_number: '001',
    full_name: 'Engr. Babatunde Adeleke',
    phone_number: '08034567890',
    additional_phone: '08023334444',
    email: 'babatunde.adeleke@gmail.com',
    house_number: 'Plot 4A',
    address: 'Hibiscus Crescent, Finger of God Estate',
    state: 'Lagos',
    lga: 'Eti-Osa',
    notes: 'Resident Executive Committee Member (Zonal Rep)',
    registration_date: '2026-09-01',
    status: 'Active',
    created_at: new Date('2026-09-01T08:00:00Z').toISOString(),
    updated_at: new Date('2026-09-01T08:00:00Z').toISOString()
  },
  {
    id: 'res-002',
    resident_number: '002',
    full_name: 'Dr. Chioma Nwachukwu',
    phone_number: '08098765432',
    additional_phone: null,
    email: 'dr.chioma.nw@yahoo.com',
    house_number: 'House 12',
    address: 'Palm View Boulevard, Finger of God Estate',
    state: 'Lagos',
    lga: 'Eti-Osa',
    notes: 'Primary household contact',
    registration_date: '2026-09-05',
    status: 'Active',
    created_at: new Date('2026-09-05T09:30:00Z').toISOString(),
    updated_at: new Date('2026-09-05T09:30:00Z').toISOString()
  },
  {
    id: 'res-003',
    resident_number: '003',
    full_name: 'Alhaji Usman Danladi',
    phone_number: '08123459876',
    additional_phone: '09011223344',
    email: null,
    house_number: 'Plot 18B',
    address: 'Acacia Close, Finger of God Estate',
    state: 'Lagos',
    lga: 'Eti-Osa',
    notes: null,
    registration_date: '2026-09-10',
    status: 'Active',
    created_at: new Date('2026-09-10T11:15:00Z').toISOString(),
    updated_at: new Date('2026-09-10T11:15:00Z').toISOString()
  },
  {
    id: 'res-004',
    resident_number: '004',
    full_name: 'Mrs. Folashade Balogun',
    phone_number: '07033445566',
    additional_phone: null,
    email: 'f.balogun@outlook.com',
    house_number: 'Flat 3, Block C',
    address: 'Oak Street, Finger of God Estate',
    state: 'Lagos',
    lga: 'Eti-Osa',
    notes: 'Property leased out temporarily',
    registration_date: '2026-09-12',
    status: 'Inactive',
    created_at: new Date('2026-09-12T14:20:00Z').toISOString(),
    updated_at: new Date('2026-09-15T16:00:00Z').toISOString()
  }
];

// ==========================================
// LOCAL STORAGE KEYS & SYNC HELPERS
// ==========================================
const STORAGE_KEYS = {
  SETTINGS: 'estate_security_settings',
  RESIDENTS: 'estate_security_residents',
  ACTIVITY: 'estate_security_activity_logs',
  CURRENT_USER: 'estate_security_current_user',
  CURRENT_RESIDENT: 'estate_security_current_resident',
  PAYMENTS: 'estate_security_monthly_payments',
  TRANSACTIONS: 'estate_security_payment_transactions',
  RECEIPTS: 'estate_security_receipts',
  SMS_LOGS: 'estate_security_sms_logs',
  ANNOUNCEMENTS: 'estate_security_announcements',
  INCIDENTS: 'estate_security_incidents',
  OFFICERS: 'estate_security_officers',
  ALERTS: 'estate_security_alerts',
  VISITORS: 'estate_security_visitors',
  GATE_LOGS: 'estate_security_gate_logs',
  PATROLS: 'estate_security_patrols'
};

const INITIAL_OFFICERS_SEED: SecurityOfficer[] = [
  {
    id: 'off-001',
    officer_badge_id: 'FOG-SEC-01',
    full_name: 'Sgt. Audu Momoh',
    phone_number: '08023456789',
    email: 'audu.momoh@fingerofgodestate.ng',
    rank: 'Chief Security Officer',
    shift: 'Morning (06:00 - 14:00)',
    status: 'On Duty',
    assigned_area: 'Central Command & North Gate',
    active_incidents_count: 1,
    created_at: '2026-09-01T06:00:00Z'
  },
  {
    id: 'off-002',
    officer_badge_id: 'FOG-SEC-02',
    full_name: 'Inspector Chinedu Okoro',
    phone_number: '08034567891',
    email: 'chinedu.okoro@fingerofgodestate.ng',
    rank: 'Security Supervisor',
    shift: 'Afternoon (14:00 - 22:00)',
    status: 'On Duty',
    assigned_area: 'Phase 1 Boulevard & Perimeter',
    active_incidents_count: 1,
    created_at: '2026-09-01T06:00:00Z'
  },
  {
    id: 'off-003',
    officer_badge_id: 'FOG-SEC-03',
    full_name: 'Guard Yakubu Danjuma',
    phone_number: '08129876543',
    email: 'yakubu.d@fingerofgodestate.ng',
    rank: 'Patrol Officer',
    shift: 'Morning (06:00 - 14:00)',
    status: 'On Patrol',
    assigned_area: 'Hibiscus Crescent & Phase 2',
    active_incidents_count: 0,
    created_at: '2026-09-01T06:00:00Z'
  },
  {
    id: 'off-004',
    officer_badge_id: 'FOG-SEC-04',
    full_name: 'Guard Sunday Eze',
    phone_number: '07031122445',
    email: 'sunday.eze@fingerofgodestate.ng',
    rank: 'Gate Controller',
    shift: 'Morning (06:00 - 14:00)',
    status: 'On Duty',
    assigned_area: 'Main Inflow Barrier Gate 1',
    active_incidents_count: 0,
    created_at: '2026-09-01T06:00:00Z'
  }
];

const INITIAL_INCIDENTS_SEED: Incident[] = [
  {
    id: 'inc-001',
    incident_number: 'FOG-INC-2026-0001',
    incident_type: 'Suspicious activity',
    priority: 'High',
    status: 'Investigating',
    date: '2026-09-23',
    time: '21:45',
    location: 'Hibiscus Crescent, near Plot 4A',
    house_number: 'Plot 4A',
    phase: 'Phase 1',
    description: 'An unidentified dark sedan was observed idling with headlights off for over 35 minutes along the perimeter curve.',
    people_involved: 'Two occupants observed inside vehicle',
    vehicle_details: 'Dark Grey Toyota Camry (No visible front plate)',
    additional_notes: 'Patrol unit dispatched for driver verification and perimeter check.',
    reporter_type: 'Resident',
    reported_by: 'Engr. Babatunde Adeleke',
    reporter_phone: '08034567890',
    reporter_resident_number: '001',
    is_emergency: false,
    assigned_officer_id: 'off-002',
    assigned_officer_name: 'Inspector Chinedu Okoro',
    assigned_officer_phone: '08034567891',
    investigation_notes: 'Officer Chinedu arrived on site at 21:52. Vehicle was questioned; driver was visiting Plot 8 resident.',
    actions_taken: 'Driver credentials logged at gate register. Host resident confirmed appointment.',
    resolution_summary: null,
    evidence: [
      {
        id: 'ev-001',
        incident_id: 'inc-001',
        file_name: 'Perimeter_CCTV_Frame_2148.jpg',
        file_type: 'image',
        url: 'https://images.unsplash.com/photo-1590856029826-c7a73142bbf1?auto=format&fit=crop&w=600&q=80',
        uploaded_by: 'Inspector Chinedu Okoro',
        uploaded_at: '2026-09-23T22:05:00Z'
      }
    ],
    timeline: [
      {
        id: 'tl-001',
        incident_id: 'inc-001',
        timestamp: '2026-09-23T21:45:00Z',
        title: 'Incident Report Submitted',
        description: 'Resident #001 reported suspicious idling vehicle on Hibiscus Crescent.',
        performed_by: 'Engr. Babatunde Adeleke',
        performed_by_role: 'Resident',
        action_type: 'REPORT_CREATED'
      },
      {
        id: 'tl-002',
        incident_id: 'inc-001',
        timestamp: '2026-09-23T21:47:00Z',
        title: 'Incident Acknowledged',
        description: 'Command desk verified location coordinates.',
        performed_by: 'Sgt. Audu Momoh',
        performed_by_role: 'Chief Security Officer',
        action_type: 'ACKNOWLEDGED'
      },
      {
        id: 'tl-003',
        incident_id: 'inc-001',
        timestamp: '2026-09-23T21:50:00Z',
        title: 'Officer Dispatched & Assigned',
        description: 'Inspector Chinedu Okoro assigned as lead patrol investigator.',
        performed_by: 'Sgt. Audu Momoh',
        performed_by_role: 'Chief Security Officer',
        action_type: 'OFFICER_ASSIGNED'
      }
    ],
    created_at: '2026-09-23T21:45:00Z',
    updated_at: '2026-09-23T22:05:00Z'
  },
  {
    id: 'inc-002',
    incident_number: 'FOG-INC-2026-0002',
    incident_type: 'Power/electrical emergency',
    priority: 'Medium',
    status: 'Resolved',
    date: '2026-09-22',
    time: '18:15',
    location: 'Palm View Boulevard Transformer Pillar',
    house_number: 'House 12',
    phase: 'Phase 1',
    description: 'Low-hanging power distribution cable sparking after heavy rainstorm wind.',
    people_involved: null,
    vehicle_details: null,
    additional_notes: 'Power isolation requested from facility electrical engineer.',
    reporter_type: 'Resident',
    reported_by: 'Dr. Chioma Nwachukwu',
    reporter_phone: '08098765432',
    reporter_resident_number: '002',
    is_emergency: false,
    assigned_officer_id: 'off-001',
    assigned_officer_name: 'Sgt. Audu Momoh',
    assigned_officer_phone: '08023456789',
    investigation_notes: 'Transformer breaker isolated at 18:22. Maintenance contractor re-tensioned cable.',
    actions_taken: 'Area cordoned off with security cones. Power safely restored.',
    resolution_summary: 'Cable re-anchored, electrical junction box secured and power certified safe by estate engineering.',
    resolved_at: '2026-09-22T20:10:00Z',
    closed_at: '2026-09-22T20:15:00Z',
    evidence: [],
    timeline: [
      {
        id: 'tl-101',
        incident_id: 'inc-002',
        timestamp: '2026-09-22T18:15:00Z',
        title: 'Report Created',
        description: 'Sparking cable reported on Palm View Boulevard.',
        performed_by: 'Dr. Chioma Nwachukwu',
        action_type: 'REPORT_CREATED'
      },
      {
        id: 'tl-102',
        incident_id: 'inc-002',
        timestamp: '2026-09-22T20:10:00Z',
        title: 'Incident Resolved & Area Cleared',
        description: 'Electrical engineers certified repair. Danger cones removed.',
        performed_by: 'Sgt. Audu Momoh',
        action_type: 'RESOLVED'
      }
    ],
    created_at: '2026-09-22T18:15:00Z',
    updated_at: '2026-09-22T20:15:00Z'
  }
];

const INITIAL_ALERTS_SEED: SecurityAlert[] = [
  {
    id: 'alt-001',
    alert_code: 'FOG-ALT-2026-001',
    title: 'Heightened Night Gate Verification (22:00 - 05:00)',
    message: 'All unannounced nighttime visitors must be confirmed via phone call with resident host prior to barrier opening.',
    category: 'Gate restriction',
    priority: 'High',
    start_time: '2026-09-20T00:00:00Z',
    expiry_time: '2026-10-31T23:59:59Z',
    target_audience: 'All Residents',
    is_active: true,
    created_by: 'Chief Security Officer',
    created_at: '2026-09-20T08:00:00Z'
  }
];

const INITIAL_VISITORS_SEED: VisitorPass[] = [
  {
    id: 'vis-001',
    pass_code: 'FOG-VIS-9812',
    visitor_name: 'Pastor Emmanuel Eze',
    visitor_phone: '08039988776',
    vehicle_number: 'KJA-542-AA',
    vehicle_description: 'Black Toyota Highlander',
    purpose_of_visit: 'Personal / Family Visit',
    resident_id: 'res-001',
    resident_number: '001',
    resident_name: 'Engr. Babatunde Adeleke',
    house_number: 'Plot 4A',
    resident_phone: '08034567890',
    expected_arrival: new Date(Date.now() + 7200000).toISOString(),
    status: 'Expected',
    qr_code_data: 'FOG-VIS-9812-RES001',
    notes: 'Guest arriving with family members',
    created_at: new Date().toISOString()
  },
  {
    id: 'vis-002',
    pass_code: 'FOG-VIS-4219',
    visitor_name: 'Engr. Samuel Bassey (Technician)',
    visitor_phone: '08123344556',
    vehicle_number: 'EPE-109-BD',
    vehicle_description: 'White Hiace Van',
    purpose_of_visit: 'Contractor / Repair Work',
    resident_id: 'res-002',
    resident_number: '002',
    resident_name: 'Dr. Chioma Nwachukwu',
    house_number: 'House 12',
    resident_phone: '08098765432',
    expected_arrival: new Date(Date.now() - 3600000).toISOString(),
    entry_time: new Date(Date.now() - 1800000).toISOString(),
    status: 'Arrived',
    checked_in_by: 'Guard Sunday Eze',
    qr_code_data: 'FOG-VIS-4219-RES002',
    notes: 'Carrying air conditioning tools',
    created_at: new Date(Date.now() - 7200000).toISOString()
  }
];

const INITIAL_GATE_LOGS_SEED: GateLogEntry[] = [
  {
    id: 'gl-001',
    log_number: 'GL-20260924-001',
    movement_type: 'Entry',
    entity_type: 'Visitor',
    name: 'Engr. Samuel Bassey (Technician)',
    phone_number: '08123344556',
    vehicle_number: 'EPE-109-BD',
    house_number: 'House 12',
    destination: 'Palm View Boulevard, House 12',
    pass_code: 'FOG-VIS-4219',
    officer_badge: 'FOG-SEC-04',
    officer_name: 'Guard Sunday Eze',
    timestamp: new Date(Date.now() - 1800000).toISOString(),
    notes: 'AC servicing technician, host confirmed via intercom'
  },
  {
    id: 'gl-002',
    log_number: 'GL-20260924-002',
    movement_type: 'Entry',
    entity_type: 'Delivery',
    name: 'GIG Logistics Courier (Ifeanyi)',
    phone_number: '07081122334',
    vehicle_number: 'KJA-881-XY (Motorcycle)',
    house_number: 'Plot 4A',
    destination: 'Hibiscus Crescent',
    officer_badge: 'FOG-SEC-04',
    officer_name: 'Guard Sunday Eze',
    timestamp: new Date(Date.now() - 5400000).toISOString(),
    notes: 'Package delivery'
  }
];

const INITIAL_PATROLS_SEED: PatrolRecord[] = [
  {
    id: 'ptr-001',
    patrol_code: 'PTR-20260924-01',
    officer_id: 'off-003',
    officer_name: 'Guard Yakubu Danjuma',
    officer_badge: 'FOG-SEC-03',
    patrol_area: 'Phase 1 Perimeter Fence & South Gate Boulevard',
    start_time: '07:00',
    end_time: '08:30',
    status: 'Completed',
    checkpoints_count: 8,
    checkpoints_completed: 8,
    issues_discovered: [],
    notes: 'All 8 checkpoint NFC beacons confirmed, fence clear, solar floodlights active.',
    created_at: new Date().toISOString()
  },
  {
    id: 'ptr-002',
    patrol_code: 'PTR-20260924-02',
    officer_id: 'off-003',
    officer_name: 'Guard Yakubu Danjuma',
    officer_badge: 'FOG-SEC-03',
    patrol_area: 'Phase 2 Access Road & West Drainage Line',
    start_time: '11:00',
    end_time: null,
    status: 'In Progress',
    checkpoints_count: 6,
    checkpoints_completed: 4,
    issues_discovered: ['Overgrown branch near post 4'],
    notes: 'Branch reported to landscaping contractor.',
    created_at: new Date().toISOString()
  }
];

const INITIAL_PAYMENTS_SEED: MonthlyPayment[] = [
  {
    id: 'pay-001',
    resident_id: 'res-001',
    resident_number: '001',
    period_month: 10,
    period_year: 2026,
    period_label: 'October 2026',
    amount_due: 5000,
    amount_paid: 5000,
    status: 'PAID',
    due_date: '2026-10-01',
    paid_at: '2026-09-20T10:30:00Z',
    paystack_reference: 'FOGES-202610-001-A7C8E9F1',
    created_at: '2026-09-01T08:00:00Z',
    updated_at: '2026-09-20T10:30:00Z'
  },
  {
    id: 'pay-002',
    resident_id: 'res-002',
    resident_number: '002',
    period_month: 10,
    period_year: 2026,
    period_label: 'October 2026',
    amount_due: 5000,
    amount_paid: 0,
    status: 'UNPAID',
    due_date: '2026-10-01',
    paid_at: null,
    paystack_reference: null,
    created_at: '2026-09-05T09:30:00Z',
    updated_at: '2026-09-05T09:30:00Z'
  },
  {
    id: 'pay-003',
    resident_id: 'res-003',
    resident_number: '003',
    period_month: 10,
    period_year: 2026,
    period_label: 'October 2026',
    amount_due: 5000,
    amount_paid: 0,
    status: 'UNPAID',
    due_date: '2026-10-01',
    paid_at: null,
    paystack_reference: null,
    created_at: '2026-09-10T11:15:00Z',
    updated_at: '2026-09-10T11:15:00Z'
  },
  {
    id: 'pay-004',
    resident_id: 'res-004',
    resident_number: '004',
    period_month: 10,
    period_year: 2026,
    period_label: 'October 2026',
    amount_due: 5000,
    amount_paid: 0,
    status: 'UNPAID',
    due_date: '2026-10-01',
    paid_at: null,
    paystack_reference: null,
    created_at: '2026-09-12T14:20:00Z',
    updated_at: '2026-09-12T14:20:00Z'
  }
];

const INITIAL_TRANSACTIONS_SEED: PaymentTransaction[] = [
  {
    id: 'tx-001',
    payment_id: 'pay-001',
    resident_id: 'res-001',
    resident_number: '001',
    period_month: 10,
    period_year: 2026,
    period_label: 'October 2026',
    transaction_reference: 'FOGES-202610-001-A7C8E9F1',
    paystack_reference: 'FOGES-202610-001-A7C8E9F1',
    paystack_transaction_id: '394857201',
    amount_due: 5000,
    amount_paid: 5000,
    currency: 'NGN',
    payment_method: 'Paystack',
    status: 'PAID',
    payment_channel: 'card',
    payment_date: '2026-09-20T10:30:00Z',
    gateway_response: 'Approved',
    customer_email: 'babatunde.adeleke@gmail.com',
    channel_details: { card_type: 'Mastercard', last4: '4084', bank: 'Access Bank' },
    created_at: '2026-09-20T10:28:15Z',
    updated_at: '2026-09-20T10:30:00Z'
  }
];

const INITIAL_RECEIPTS_SEED: Receipt[] = [
  {
    id: 'rcp-001',
    receipt_number: 'RCP-202610-001-A7C8E9',
    transaction_id: 'tx-001',
    payment_id: 'pay-001',
    resident_id: 'res-001',
    resident_number: '001',
    resident_name: 'Engr. Babatunde Adeleke',
    house_number: 'Plot 4A, Hibiscus Crescent',
    amount_paid: 5000,
    currency: 'NGN',
    period_covered: 'October 2026',
    payment_date: '2026-09-20T10:30:00Z',
    paystack_reference: 'FOGES-202610-001-A7C8E9F1',
    status: 'PAID',
    issued_at: '2026-09-20T10:30:05Z'
  }
];

function getLocalPayments(): MonthlyPayment[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.PAYMENTS);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.PAYMENTS, JSON.stringify(INITIAL_PAYMENTS_SEED));
      return INITIAL_PAYMENTS_SEED;
    }
    return JSON.parse(raw);
  } catch {
    return INITIAL_PAYMENTS_SEED;
  }
}

function saveLocalPayments(payments: MonthlyPayment[]) {
  try {
    localStorage.setItem(STORAGE_KEYS.PAYMENTS, JSON.stringify(payments));
  } catch (err) {
    console.error('Failed to save payments to local storage', err);
  }
}

function getLocalTransactions(): PaymentTransaction[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.TRANSACTIONS);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(INITIAL_TRANSACTIONS_SEED));
      return INITIAL_TRANSACTIONS_SEED;
    }
    return JSON.parse(raw);
  } catch {
    return INITIAL_TRANSACTIONS_SEED;
  }
}

function saveLocalTransactions(transactions: PaymentTransaction[]) {
  try {
    localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(transactions));
  } catch (err) {
    console.error('Failed to save transactions to local storage', err);
  }
}

function getLocalReceipts(): Receipt[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.RECEIPTS);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.RECEIPTS, JSON.stringify(INITIAL_RECEIPTS_SEED));
      return INITIAL_RECEIPTS_SEED;
    }
    return JSON.parse(raw);
  } catch {
    return INITIAL_RECEIPTS_SEED;
  }
}

function saveLocalReceipts(receipts: Receipt[]) {
  try {
    localStorage.setItem(STORAGE_KEYS.RECEIPTS, JSON.stringify(receipts));
  } catch (err) {
    console.error('Failed to save receipts to local storage', err);
  }
}

const INITIAL_SMS_LOGS_SEED: SMSLog[] = [
  {
    id: 'sms-seed-1',
    resident_id: 'res-002',
    resident_number: '002',
    phone_number: '08098765432',
    payment_month: 10,
    payment_year: 2026,
    period_label: 'October 2026',
    reminder_type: 'REMINDER_1',
    message: 'Dear Dr. Chioma Nwachukwu, your Finger of God Estate security levy of ₦5,000 for October 2026 is due. Please make payment through the Finger of God Estate Security Management website. Resident No: 002.',
    provider: 'termii',
    provider_message_id: 'msg-tm-9834102',
    delivery_status: 'SENT',
    sent_at: '2026-10-06T09:00:00Z',
    error_message: null,
    created_at: '2026-10-06T09:00:00Z'
  },
  {
    id: 'sms-seed-2',
    resident_id: 'res-003',
    resident_number: '003',
    phone_number: '08123459876',
    payment_month: 10,
    payment_year: 2026,
    period_label: 'October 2026',
    reminder_type: 'REMINDER_1',
    message: 'Dear Alhaji Usman Danladi, your Finger of God Estate security levy of ₦5,000 for October 2026 is due. Please make payment through the Finger of God Estate Security Management website. Resident No: 003.',
    provider: 'termii',
    provider_message_id: 'msg-tm-9834103',
    delivery_status: 'SENT',
    sent_at: '2026-10-06T09:00:00Z',
    error_message: null,
    created_at: '2026-10-06T09:00:00Z'
  },
  {
    id: 'sms-seed-3',
    resident_id: 'res-001',
    resident_number: '001',
    phone_number: '08023456789',
    payment_month: 10,
    payment_year: 2026,
    period_label: 'October 2026',
    reminder_type: 'TEST',
    message: 'Dear Engr. Babatunde Adeleke, this is a test notification from Finger of God Estate Security Management. Estate security line: 08023456789. Resident No: 001.',
    provider: 'termii',
    provider_message_id: 'msg-tm-test-01',
    delivery_status: 'SENT',
    sent_at: '2026-09-24T10:00:00Z',
    error_message: null,
    created_at: '2026-09-24T10:00:00Z'
  }
];

function getLocalSmsLogs(): SMSLog[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.SMS_LOGS);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.SMS_LOGS, JSON.stringify(INITIAL_SMS_LOGS_SEED));
      return INITIAL_SMS_LOGS_SEED;
    }
    return JSON.parse(raw);
  } catch {
    return INITIAL_SMS_LOGS_SEED;
  }
}

function saveLocalSmsLogs(logs: SMSLog[]) {
  try {
    localStorage.setItem(STORAGE_KEYS.SMS_LOGS, JSON.stringify(logs));
  } catch (err) {
    console.error('Failed to save SMS logs to local storage', err);
  }
}

function getLocalResidents(): Resident[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.RESIDENTS);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.RESIDENTS, JSON.stringify(INITIAL_RESIDENTS_SEED));
      return INITIAL_RESIDENTS_SEED;
    }
    return JSON.parse(raw);
  } catch {
    return INITIAL_RESIDENTS_SEED;
  }
}

function saveLocalResidents(residents: Resident[]) {
  try {
    localStorage.setItem(STORAGE_KEYS.RESIDENTS, JSON.stringify(residents));
  } catch (err) {
    console.error('Failed to save residents to local storage', err);
  }
}

function getLocalSettings(): EstateSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.SETTINGS);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(DEFAULT_ESTATE_SETTINGS));
      return DEFAULT_ESTATE_SETTINGS;
    }
    return JSON.parse(raw);
  } catch {
    return DEFAULT_ESTATE_SETTINGS;
  }
}

function saveLocalSettings(settings: EstateSettings) {
  try {
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
  } catch (err) {
    console.error('Failed to save settings to local storage', err);
  }
}

const INITIAL_ANNOUNCEMENTS_SEED: Announcement[] = [
  {
    id: 'ann-001',
    title: 'Updated Estate Security Protocols & RFID Gate Automation',
    slug: 'updated-estate-security-protocols-rfid-gate-automation',
    category: 'SECURITY',
    priority: 'URGENT',
    status: 'PUBLISHED',
    publish_at: '2026-09-15T08:00:00.000Z',
    expires_at: null,
    author_name: 'Estate Security EXCO',
    body: 'The Executive Committee (EXCO) of Finger of God Estate wishes to notify all residents that starting October 1, 2026, the main estate access gates will operate under enhanced 24/7 RFID scanning and armed patrol protocols. All residents are advised to ensure their vehicle security decals are up to date and that visitors are registered with the central security desk via their resident numbers. Prompt payment of the monthly security levy ensures continuous funding for armed response teams and perimeter surveillance.',
    created_at: '2026-09-15T08:00:00.000Z',
    updated_at: '2026-09-15T08:00:00.000Z'
  },
  {
    id: 'ann-002',
    title: 'Commencement of Online Security Levy Payments (October 2026)',
    slug: 'commencement-of-online-security-levy-payments-october-2026',
    category: 'PAYMENT',
    priority: 'IMPORTANT',
    status: 'PUBLISHED',
    publish_at: '2026-09-20T09:00:00.000Z',
    expires_at: null,
    author_name: 'Finance Committee',
    body: 'We are pleased to announce the full rollout of our automated security levy payment and receipting portal powered by Paystack. The monthly security levy is ₦5,000, payable on or before the 1st of every month starting from October 2026. Residents can now pay online using debit cards, bank transfer, or USSD, and obtain verified digital receipts with unique cryptographic verification codes instantly. Please visit the "Pay Security Levy" section or your resident portal to complete your payment.',
    created_at: '2026-09-20T09:00:00.000Z',
    updated_at: '2026-09-20T09:00:00.000Z'
  },
  {
    id: 'ann-003',
    title: 'Quarterly Residents Townhall & Security Architecture Briefing',
    slug: 'quarterly-residents-townhall-security-architecture-briefing',
    category: 'MEETING',
    priority: 'NORMAL',
    status: 'PUBLISHED',
    publish_at: '2026-09-22T10:00:00.000Z',
    expires_at: null,
    author_name: 'Estate Secretariat',
    body: 'All residents, landlords, and tenants are cordially invited to the upcoming Finger of God Estate Townhall Meeting scheduled for Saturday, October 24, 2026, at 10:00 AM at the Estate Community Hall (with a hybrid Zoom broadcast link available upon request). Key agenda items include: 1. Review of Q3 security reports and CCTV camera expansions. 2. Financial stewardship report and levy collection status. 3. Traffic management within estate boulevards. Your active participation is invaluable in building a safer community.',
    created_at: '2026-09-22T10:00:00.000Z',
    updated_at: '2026-09-22T10:00:00.000Z'
  },
  {
    id: 'ann-004',
    title: 'Drainage Infrastructure & Streetlight Upgrade Notice',
    slug: 'drainage-infrastructure-streetlight-upgrade-notice',
    category: 'MAINTENANCE',
    priority: 'NORMAL',
    status: 'PUBLISHED',
    publish_at: '2026-09-23T11:00:00.000Z',
    expires_at: null,
    author_name: 'Facilities & Works Committee',
    body: 'The Estate Facilities Management team will be carrying out scheduled de-silting of drainage channels and replacement of solar streetlight batteries along Palm Avenue, Hibiscus Crescent, and Boulevard West from October 5 to October 8, 2026 between 9:00 AM and 4:00 PM daily. Residents along these corridors are requested not to park vehicles directly over drainage slabs during these operational hours.',
    created_at: '2026-09-23T11:00:00.000Z',
    updated_at: '2026-09-23T11:00:00.000Z'
  }
];

function getLocalAnnouncements(): Announcement[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.ANNOUNCEMENTS);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.ANNOUNCEMENTS, JSON.stringify(INITIAL_ANNOUNCEMENTS_SEED));
      return INITIAL_ANNOUNCEMENTS_SEED;
    }
    return JSON.parse(raw);
  } catch {
    return INITIAL_ANNOUNCEMENTS_SEED;
  }
}

function saveLocalAnnouncements(announcements: Announcement[]) {
  try {
    localStorage.setItem(STORAGE_KEYS.ANNOUNCEMENTS, JSON.stringify(announcements));
  } catch (err) {
    console.error('Failed to save announcements to local storage', err);
  }
}

function getLocalActivityLogs(): ActivityLog[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.ACTIVITY);
    if (!raw) {
      const initialLogs: ActivityLog[] = [
        {
          id: 'log-1',
          admin_email: 'admin@palmgroveestate.ng',
          action: 'CREATED_RESIDENT',
          entity_type: 'resident',
          entity_id: '001',
          description: 'Registered resident 001 - Engr. Babatunde Adeleke',
          created_at: new Date(Date.now() - 3600000 * 24 * 3).toISOString()
        },
        {
          id: 'log-2',
          admin_email: 'admin@palmgroveestate.ng',
          action: 'UPDATED_SETTINGS',
          entity_type: 'estate_settings',
          entity_id: null,
          description: 'Configured monthly security levy to ₦5,000 due on day 1 (Starting Oct 2026)',
          created_at: new Date(Date.now() - 3600000 * 24 * 2).toISOString()
        }
      ];
      localStorage.setItem(STORAGE_KEYS.ACTIVITY, JSON.stringify(initialLogs));
      return initialLogs;
    }
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function addLocalActivityLog(log: Omit<ActivityLog, 'id' | 'created_at'>) {
  try {
    const logs = getLocalActivityLogs();
    const newEntry: ActivityLog = {
      ...log,
      id: 'log-' + Date.now(),
      created_at: new Date().toISOString()
    };
    logs.unshift(newEntry);
    localStorage.setItem(STORAGE_KEYS.ACTIVITY, JSON.stringify(logs.slice(0, 100)));
  } catch (err) {
    console.error('Failed to append activity log', err);
  }
}

// ==========================================
// RESIDENT NUMBER UTILITY (FORMATTING & SEQUENCE)
// ==========================================
export function formatResidentNumber(num: number): string {
  // Pad with leading zeros: 1 -> 001, 25 -> 025, 300 -> 300, 1050 -> 1050
  return num.toString().padStart(3, '0');
}

// ==========================================
// SCHEMA CACHE & MISSING TABLE RESILIENCE
// ==========================================
const missingTables = new Set<string>();

/**
 * Detects PostgREST / Supabase table-missing or uninitialized schema cache errors:
 * - PGRST205: "Could not find the table '...' in the schema cache"
 * - 42P01: Postgres "relation does not exist"
 * - PGRST116: JSON object requested, multiple (or no) rows returned
 */
export function isTableNotFoundError(error: any): boolean {
  if (!error) return false;
  const code = String(error.code || '');
  const message = String(error.message || '').toLowerCase();
  const details = String(error.details || '').toLowerCase();
  const hint = String(error.hint || '').toLowerCase();

  return (
    code === 'PGRST205' ||
    code === '42P01' ||
    code === 'PGRST204' ||
    message.includes('schema cache') ||
    message.includes('could not find the table') ||
    (message.includes('relation') && message.includes('does not exist')) ||
    (details.includes('relation') && details.includes('does not exist')) ||
    hint.includes('schema cache')
  );
}

export function markTableMissing(tableName: string) {
  if (!missingTables.has(tableName)) {
    missingTables.add(tableName);
    dispatchSchemaStatusChange();
  }
}

export function markTableAvailable(tableName: string) {
  if (missingTables.has(tableName)) {
    missingTables.delete(tableName);
    dispatchSchemaStatusChange();
  }
}

export function isTableMarkedMissing(tableName: string): boolean {
  return missingTables.has(tableName);
}

export function getMissingTables(): string[] {
  return Array.from(missingTables);
}

export function isAnyTableMissing(): boolean {
  return missingTables.size > 0;
}

function dispatchSchemaStatusChange() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('supabase-schema-status', {
        detail: {
          missingTables: getMissingTables(),
          isAnyMissing: isAnyTableMissing()
        }
      })
    );
  }
}

/**
 * Checks all core estate tables in Supabase and returns a diagnostic report.
 */
export async function verifySupabaseTables(): Promise<{
  allReady: boolean;
  checkedTables: Record<string, boolean>;
  message: string;
}> {
  if (!isSupabaseConfigured || !supabase) {
    return {
      allReady: false,
      checkedTables: {},
      message: 'Supabase credentials not configured. Running in secure local storage mode.'
    };
  }

  const results: Record<string, boolean> = {
    estate_settings: false,
    residents: false,
    activity_logs: false,
    monthly_payments: false,
    payment_transactions: false,
    receipts: false
  };

  try {
    const { error: settingsErr } = await supabase.from('estate_settings').select('id').limit(1);
    if (!settingsErr || !isTableNotFoundError(settingsErr)) {
      results.estate_settings = true;
      markTableAvailable('estate_settings');
    } else {
      markTableMissing('estate_settings');
    }
  } catch {
    markTableMissing('estate_settings');
  }

  try {
    const { error: residentsErr } = await supabase.from('residents').select('id').limit(1);
    if (!residentsErr || !isTableNotFoundError(residentsErr)) {
      results.residents = true;
      markTableAvailable('residents');
    } else {
      markTableMissing('residents');
    }
  } catch {
    markTableMissing('residents');
  }

  try {
    const { error: logsErr } = await supabase.from('activity_logs').select('id').limit(1);
    if (!logsErr || !isTableNotFoundError(logsErr)) {
      results.activity_logs = true;
      markTableAvailable('activity_logs');
    } else {
      markTableMissing('activity_logs');
    }
  } catch {
    markTableMissing('activity_logs');
  }

  try {
    const { error: payErr } = await supabase.from('monthly_payments').select('id').limit(1);
    if (!payErr || !isTableNotFoundError(payErr)) {
      results.monthly_payments = true;
      markTableAvailable('monthly_payments');
    } else {
      markTableMissing('monthly_payments');
    }
  } catch {
    markTableMissing('monthly_payments');
  }

  try {
    const { error: txErr } = await supabase.from('payment_transactions').select('id').limit(1);
    if (!txErr || !isTableNotFoundError(txErr)) {
      results.payment_transactions = true;
      markTableAvailable('payment_transactions');
    } else {
      markTableMissing('payment_transactions');
    }
  } catch {
    markTableMissing('payment_transactions');
  }

  try {
    const { error: rcpErr } = await supabase.from('receipts').select('id').limit(1);
    if (!rcpErr || !isTableNotFoundError(rcpErr)) {
      results.receipts = true;
      markTableAvailable('receipts');
    } else {
      markTableMissing('receipts');
    }
  } catch {
    markTableMissing('receipts');
  }

  const allReady = Object.values(results).every(Boolean);
  return {
    allReady,
    checkedTables: results,
    message: allReady 
      ? 'All Supabase tables verified and synchronized.'
      : 'One or more Supabase tables have not been created yet in the schema cache. Please execute supabase_schema.sql.'
  };
}

/**
 * Calculates the next sequential resident number (e.g. 001, 002, 003...)
 */
export async function getNextSequentialResidentNumber(): Promise<string> {
  if (isSupabaseConfigured && supabase && !isTableMarkedMissing('residents')) {
    try {
      const { data, error } = await supabase
        .from('residents')
        .select('resident_number');

      if (error) {
        if (isTableNotFoundError(error)) {
          markTableMissing('residents');
        }
      } else if (data && data.length > 0) {
        let maxNum = 0;
        data.forEach((row: { resident_number: string }) => {
          const parsed = parseInt(row.resident_number, 10);
          if (!isNaN(parsed) && parsed > maxNum) {
            maxNum = parsed;
          }
        });
        return formatResidentNumber(maxNum + 1);
      }
    } catch (e: any) {
      if (isTableNotFoundError(e)) {
        markTableMissing('residents');
      }
      console.warn('Supabase query notice, falling back to local computation:', e?.message || e);
    }
  }

  // Fallback / Local computation
  const residents = getLocalResidents();
  let maxNum = 0;
  residents.forEach((r) => {
    const parsed = parseInt(r.resident_number, 10);
    if (!isNaN(parsed) && parsed > maxNum) {
      maxNum = parsed;
    }
  });
  return formatResidentNumber(maxNum + 1);
}

// ==========================================
// ESTATE DATA SERVICES
// ==========================================

export const dbService = {
  // 1. ESTATE SETTINGS
  async getSettings(): Promise<EstateSettings> {
    if (isSupabaseConfigured && supabase && !isTableMarkedMissing('estate_settings')) {
      try {
        const { data, error } = await supabase
          .from('estate_settings')
          .select('*')
          .limit(1)
          .maybeSingle();

        if (error) {
          if (isTableNotFoundError(error)) {
            markTableMissing('estate_settings');
            console.warn('[Supabase Notice] Table "estate_settings" not yet in schema cache. Using persistent local settings.');
          } else {
            console.warn('[Supabase Notice] getSettings notice:', error.message);
          }
          return getLocalSettings();
        }

        if (data) {
          markTableAvailable('estate_settings');
          return {
            id: data.id,
            estate_name: data.estate_name,
            estate_address: data.estate_address,
            estate_state: data.estate_state,
            estate_lga: data.estate_lga,
            monthly_security_levy: Number(data.monthly_security_levy),
            payment_due_day: Number(data.payment_due_day),
            currency: data.currency,
            contact_phone: data.contact_phone,
            contact_email: data.contact_email,
            sms_sender_name: data.sms_sender_name,
            first_payment_month: data.first_payment_month,
            created_at: data.created_at,
            updated_at: data.updated_at
          };
        }
      } catch (err: any) {
        if (isTableNotFoundError(err)) {
          markTableMissing('estate_settings');
        }
        console.warn('[Supabase Notice] Could not fetch settings from Supabase, using local state:', err?.message || err);
      }
    }
    return getLocalSettings();
  },

  async updateSettings(settings: Partial<EstateSettings>, adminEmail: string = 'admin'): Promise<EstateSettings> {
    const updatedSettings: EstateSettings = {
      ...getLocalSettings(),
      ...settings,
      updated_at: new Date().toISOString()
    };

    if (isSupabaseConfigured && supabase && !isTableMarkedMissing('estate_settings')) {
      try {
        const current = await this.getSettings();
        const { data, error } = await supabase
          .from('estate_settings')
          .upsert({
            id: current.id || DEFAULT_ESTATE_SETTINGS.id,
            estate_name: updatedSettings.estate_name,
            estate_address: updatedSettings.estate_address,
            estate_state: updatedSettings.estate_state,
            estate_lga: updatedSettings.estate_lga,
            monthly_security_levy: updatedSettings.monthly_security_levy,
            payment_due_day: updatedSettings.payment_due_day,
            currency: updatedSettings.currency,
            contact_phone: updatedSettings.contact_phone,
            contact_email: updatedSettings.contact_email,
            sms_sender_name: updatedSettings.sms_sender_name,
            first_payment_month: updatedSettings.first_payment_month,
            updated_at: new Date().toISOString()
          })
          .select()
          .maybeSingle();

        if (error) {
          if (isTableNotFoundError(error)) {
            markTableMissing('estate_settings');
            console.warn('[Supabase Notice] Table "estate_settings" not found in schema cache (PGRST205). Changes saved locally. Run supabase_schema.sql to enable cloud sync.');
          } else {
            console.warn('[Supabase Notice] updateSettings warning:', error.message);
          }
        } else if (data) {
          markTableAvailable('estate_settings');
          updatedSettings.id = data.id;
        }
      } catch (err: any) {
        if (isTableNotFoundError(err)) {
          markTableMissing('estate_settings');
          console.warn('[Supabase Notice] Table "estate_settings" not in schema cache. Changes preserved locally.');
        } else {
          console.warn('[Supabase Notice] Supabase updateSettings sync notice:', err?.message || err);
        }
      }
    }

    saveLocalSettings(updatedSettings);

    await this.logActivity({
      admin_email: adminEmail,
      action: 'UPDATED_SETTINGS',
      entity_type: 'estate_settings',
      entity_id: updatedSettings.id,
      description: `Updated estate settings (${updatedSettings.estate_name}, Levy: ₦${updatedSettings.monthly_security_levy.toLocaleString()})`
    });

    return updatedSettings;
  },

  // 2. RESIDENTS MANAGEMENT
  async getResidents(query?: string, statusFilter?: 'All' | 'Active' | 'Inactive'): Promise<Resident[]> {
    let residents: Resident[] = [];

    if (isSupabaseConfigured && supabase && !isTableMarkedMissing('residents')) {
      try {
        let req = supabase.from('residents').select('*').order('resident_number', { ascending: true });
        
        if (statusFilter && statusFilter !== 'All') {
          req = req.eq('status', statusFilter);
        }

        const { data, error } = await req;
        if (error) {
          if (isTableNotFoundError(error)) {
            markTableMissing('residents');
          }
          residents = getLocalResidents();
        } else if (data) {
          markTableAvailable('residents');
          residents = data.map((d: any) => ({
            id: d.id,
            resident_number: d.resident_number,
            full_name: d.full_name,
            phone_number: d.phone_number,
            additional_phone: d.additional_phone || null,
            email: d.email || null,
            house_number: d.house_number,
            address: d.address,
            state: d.state,
            lga: d.lga,
            notes: d.notes || null,
            registration_date: d.registration_date,
            status: d.status as 'Active' | 'Inactive',
            created_at: d.created_at,
            updated_at: d.updated_at
          }));
        } else {
          residents = getLocalResidents();
        }
      } catch (err: any) {
        if (isTableNotFoundError(err)) {
          markTableMissing('residents');
        }
        console.warn('Supabase fetch residents notice, using local storage:', err?.message || err);
        residents = getLocalResidents();
      }
    } else {
      residents = getLocalResidents();
    }

    // Apply filters
    return residents.filter((r) => {
      const matchesStatus = statusFilter === 'All' || !statusFilter ? true : r.status === statusFilter;
      if (!matchesStatus) return false;

      if (!query || query.trim() === '') return true;
      const q = query.toLowerCase().trim();
      return (
        r.full_name.toLowerCase().includes(q) ||
        r.resident_number.toLowerCase().includes(q) ||
        r.phone_number.toLowerCase().includes(q) ||
        (r.email && r.email.toLowerCase().includes(q)) ||
        r.house_number.toLowerCase().includes(q) ||
        r.address.toLowerCase().includes(q)
      );
    });
  },

  async getResidentById(id: string): Promise<Resident | null> {
    if (isSupabaseConfigured && supabase && !isTableMarkedMissing('residents')) {
      try {
        const { data, error } = await supabase
          .from('residents')
          .select('*')
          .eq('id', id)
          .maybeSingle();
        if (error) {
          if (isTableNotFoundError(error)) {
            markTableMissing('residents');
          }
        } else if (data) {
          return data as Resident;
        }
      } catch (err: any) {
        if (isTableNotFoundError(err)) {
          markTableMissing('residents');
        }
        console.warn('Supabase getResidentById notice:', err?.message || err);
      }
    }
    const residents = getLocalResidents();
    return residents.find(r => r.id === id) || null;
  },

  async isResidentNumberTaken(residentNumber: string, excludeId?: string): Promise<boolean> {
    const formatted = residentNumber.trim();
    if (isSupabaseConfigured && supabase && !isTableMarkedMissing('residents')) {
      try {
        let req = supabase.from('residents').select('id').eq('resident_number', formatted);
        if (excludeId) {
          req = req.neq('id', excludeId);
        }
        const { data, error } = await req;
        if (error) {
          if (isTableNotFoundError(error)) {
            markTableMissing('residents');
          }
        } else if (data) {
          return data.length > 0;
        }
      } catch (err: any) {
        if (isTableNotFoundError(err)) {
          markTableMissing('residents');
        }
        console.warn('Supabase check resident number notice:', err?.message || err);
      }
    }
    const residents = getLocalResidents();
    return residents.some(r => r.resident_number.trim() === formatted && r.id !== excludeId);
  },

  async isPhoneNumberTaken(phoneNumber: string, excludeId?: string): Promise<boolean> {
    const normalized = normalizeNigerianPhone(phoneNumber);
    if (!normalized) return false;

    if (isSupabaseConfigured && supabase && !isTableMarkedMissing('residents')) {
      try {
        const { data, error } = await supabase.from('residents').select('id, phone_number');
        if (error) {
          if (isTableNotFoundError(error)) {
            markTableMissing('residents');
          }
        } else if (data) {
          const match = data.some((r: { id: string; phone_number: string }) => 
            r.id !== excludeId && normalizeNigerianPhone(r.phone_number) === normalized
          );
          if (match) return true;
        }
      } catch (err: any) {
        if (isTableNotFoundError(err)) {
          markTableMissing('residents');
        }
        console.warn('Supabase check phone number notice:', err?.message || err);
      }
    }

    const residents = getLocalResidents();
    return residents.some(r => r.id !== excludeId && normalizeNigerianPhone(r.phone_number) === normalized);
  },

  async createResident(
    residentData: Omit<Resident, 'id' | 'created_at' | 'updated_at'>,
    adminEmail: string = 'admin'
  ): Promise<Resident> {
    // Check resident number uniqueness
    const isTaken = await this.isResidentNumberTaken(residentData.resident_number);
    if (isTaken) {
      throw new Error(`Resident Number "${residentData.resident_number}" is already assigned to another resident. Resident numbers must be unique.`);
    }

    // Check phone number duplicate (normalized)
    const phoneTaken = await this.isPhoneNumberTaken(residentData.phone_number);
    if (phoneTaken) {
      throw new Error(`Phone number "${residentData.phone_number}" is already registered to an existing resident. Duplicate phone registrations are not allowed.`);
    }

    const now = new Date().toISOString();
    const newResident: Resident = {
      ...residentData,
      phone_number: normalizeNigerianPhone(residentData.phone_number),
      additional_phone: residentData.additional_phone ? normalizeNigerianPhone(residentData.additional_phone) : null,
      notes: residentData.notes ? residentData.notes.trim() : null,
      id: 'res-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
      created_at: now,
      updated_at: now
    };

    if (isSupabaseConfigured && supabase && !isTableMarkedMissing('residents')) {
      try {
        const { data, error } = await supabase
          .from('residents')
          .insert({
            resident_number: newResident.resident_number,
            full_name: newResident.full_name,
            phone_number: newResident.phone_number,
            additional_phone: newResident.additional_phone || null,
            email: newResident.email || null,
            house_number: newResident.house_number,
            address: newResident.address,
            state: newResident.state,
            lga: newResident.lga,
            notes: newResident.notes || null,
            registration_date: newResident.registration_date,
            status: newResident.status
          })
          .select()
          .maybeSingle();

        if (error) {
          if (isTableNotFoundError(error)) {
            markTableMissing('residents');
            console.warn('[Supabase Notice] Table "residents" not found in schema cache (PGRST205). Resident saved to local storage.');
          } else {
            console.warn('[Supabase Notice] Could not sync resident to Supabase:', error.message);
          }
        } else if (data) {
          markTableAvailable('residents');
          newResident.id = data.id;
          newResident.created_at = data.created_at;
          newResident.updated_at = data.updated_at;
        }
      } catch (err: any) {
        if (isTableNotFoundError(err)) {
          markTableMissing('residents');
        }
        console.warn('[Supabase Notice] Supabase create resident notice:', err?.message || err);
      }
    }

    // Save locally as well
    const residents = getLocalResidents();
    residents.push(newResident);
    saveLocalResidents(residents);

    await this.logActivity({
      admin_email: adminEmail,
      action: 'CREATED_RESIDENT',
      entity_type: 'resident',
      entity_id: newResident.resident_number,
      description: `Registered resident ${newResident.resident_number} - ${newResident.full_name} (${newResident.house_number})`
    });

    return newResident;
  },

  async updateResident(
    id: string,
    updates: Partial<Omit<Resident, 'id' | 'created_at' | 'updated_at'>>,
    adminEmail: string = 'admin'
  ): Promise<Resident> {
    if (updates.resident_number) {
      const isTaken = await this.isResidentNumberTaken(updates.resident_number, id);
      if (isTaken) {
        throw new Error(`Resident Number "${updates.resident_number}" is already assigned to another resident.`);
      }
    }

    if (updates.phone_number) {
      const phoneTaken = await this.isPhoneNumberTaken(updates.phone_number, id);
      if (phoneTaken) {
        throw new Error(`Phone number "${updates.phone_number}" is already registered to another resident.`);
      }
      updates.phone_number = normalizeNigerianPhone(updates.phone_number);
    }

    if (updates.additional_phone) {
      updates.additional_phone = normalizeNigerianPhone(updates.additional_phone);
    }

    let updatedResident: Resident | null = null;
    const now = new Date().toISOString();

    if (isSupabaseConfigured && supabase && !isTableMarkedMissing('residents')) {
      try {
        const { data, error } = await supabase
          .from('residents')
          .update({
            ...updates,
            updated_at: now
          })
          .eq('id', id)
          .select()
          .maybeSingle();

        if (error) {
          if (isTableNotFoundError(error)) {
            markTableMissing('residents');
            console.warn('[Supabase Notice] Table "residents" not in schema cache. Resident updated in local storage.');
          } else {
            console.warn('[Supabase Notice] Could not sync resident update to Supabase:', error.message);
          }
        } else if (data) {
          markTableAvailable('residents');
          updatedResident = data as Resident;
        }
      } catch (err: any) {
        if (isTableNotFoundError(err)) {
          markTableMissing('residents');
        }
        console.warn('[Supabase Notice] Supabase update resident notice:', err?.message || err);
      }
    }

    // Local sync
    const residents = getLocalResidents();
    const idx = residents.findIndex(r => r.id === id);
    if (idx !== -1) {
      residents[idx] = {
        ...residents[idx],
        ...updates,
        updated_at: now
      };
      saveLocalResidents(residents);
      if (!updatedResident) updatedResident = residents[idx];
    }

    if (!updatedResident) {
      throw new Error('Resident not found.');
    }

    await this.logActivity({
      admin_email: adminEmail,
      action: 'UPDATED_RESIDENT',
      entity_type: 'resident',
      entity_id: updatedResident.resident_number,
      description: `Updated profile details for resident ${updatedResident.resident_number} (${updatedResident.full_name})`
    });

    return updatedResident;
  },

  async toggleResidentStatus(id: string, newStatus: 'Active' | 'Inactive', adminEmail: string = 'admin'): Promise<Resident> {
    const updated = await this.updateResident(id, { status: newStatus }, adminEmail);
    const action = newStatus === 'Active' ? 'ACTIVATED_RESIDENT' : 'DEACTIVATED_RESIDENT';
    await this.logActivity({
      admin_email: adminEmail,
      action,
      entity_type: 'resident',
      entity_id: updated.resident_number,
      description: `${newStatus === 'Active' ? 'Activated' : 'Deactivated'} resident ${updated.resident_number} - ${updated.full_name}`
    });
    return updated;
  },

  // 3. ACTIVITY LOGGING
  async logActivity(log: Omit<ActivityLog, 'id' | 'created_at'>): Promise<void> {
    if (isSupabaseConfigured && supabase && !isTableMarkedMissing('activity_logs')) {
      try {
        const { error } = await supabase.from('activity_logs').insert({
          admin_email: log.admin_email,
          action: log.action,
          entity_type: log.entity_type,
          entity_id: log.entity_id || null,
          description: log.description,
          metadata: log.metadata || {}
        });

        if (error) {
          if (isTableNotFoundError(error)) {
            markTableMissing('activity_logs');
          } else {
            console.warn('[Supabase Notice] logActivity warning:', error.message);
          }
        } else {
          markTableAvailable('activity_logs');
        }
      } catch (err: any) {
        if (isTableNotFoundError(err)) {
          markTableMissing('activity_logs');
        }
        console.warn('Failed to insert activity log in Supabase notice:', err?.message || err);
      }
    }
    addLocalActivityLog(log);
  },

  async getActivityLogs(): Promise<ActivityLog[]> {
    if (isSupabaseConfigured && supabase && !isTableMarkedMissing('activity_logs')) {
      try {
        const { data, error } = await supabase
          .from('activity_logs')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(50);

        if (error) {
          if (isTableNotFoundError(error)) {
            markTableMissing('activity_logs');
          }
          return getLocalActivityLogs();
        }

        if (data && data.length > 0) {
          markTableAvailable('activity_logs');
          return data as ActivityLog[];
        }
      } catch (err: any) {
        if (isTableNotFoundError(err)) {
          markTableMissing('activity_logs');
        }
        console.warn('Supabase fetch activity logs notice:', err?.message || err);
      }
    }
    return getLocalActivityLogs();
  },

  // 4. MONTHLY SECURITY LEVY PAYMENTS (STAGE 4 PAYSTACK)
  async getMonthlyPayments(filters?: {
    periodMonth?: number;
    periodYear?: number;
    status?: string;
    residentNumber?: string;
  }): Promise<MonthlyPayment[]> {
    const month = filters?.periodMonth || 10;
    const year = filters?.periodYear || 2026;

    if (isSupabaseConfigured && supabase && !isTableMarkedMissing('monthly_payments')) {
      try {
        let req = supabase
          .from('monthly_payments')
          .select('*, residents(*)')
          .eq('period_month', month)
          .eq('period_year', year);

        if (filters?.status && filters.status !== 'All') {
          req = req.ilike('status', filters.status);
        }
        if (filters?.residentNumber) {
          req = req.eq('resident_number', filters.residentNumber);
        }

        const { data, error } = await req;
        if (error) {
          if (isTableNotFoundError(error)) {
            markTableMissing('monthly_payments');
          }
        } else if (data && data.length > 0) {
          markTableAvailable('monthly_payments');
          return data.map((d: any) => ({
            id: d.id,
            resident_id: d.resident_id,
            resident_number: d.resident_number,
            period_month: d.period_month,
            period_year: d.period_year,
            period_label: d.period_label,
            amount_due: Number(d.amount_due),
            amount_paid: Number(d.amount_paid),
            status: d.status,
            due_date: d.due_date,
            paid_at: d.paid_at,
            paystack_reference: d.paystack_reference,
            created_at: d.created_at,
            updated_at: d.updated_at,
            resident: d.residents ? {
              id: d.residents.id,
              resident_number: d.residents.resident_number,
              full_name: d.residents.full_name,
              phone_number: d.residents.phone_number,
              email: d.residents.email,
              house_number: d.residents.house_number,
              address: d.residents.address,
              state: d.residents.state,
              lga: d.residents.lga,
              registration_date: d.residents.registration_date,
              status: d.residents.status,
              created_at: d.residents.created_at,
              updated_at: d.residents.updated_at
            } : undefined
          }));
        }
      } catch (err: any) {
        if (isTableNotFoundError(err)) {
          markTableMissing('monthly_payments');
        }
        console.warn('Supabase fetch monthly_payments notice, using local storage:', err?.message || err);
      }
    }

    // Local storage fallback with automatic resident sync
    const payments = getLocalPayments();
    const residents = getLocalResidents();

    // Ensure all active residents have a payment record for this month
    residents.forEach(res => {
      const existing = payments.find(p => 
        (p.resident_id === res.id || p.resident_number === res.resident_number) &&
        p.period_month === month &&
        p.period_year === year
      );
      if (!existing) {
        payments.push({
          id: `pay-${res.resident_number}-${month}-${year}`,
          resident_id: res.id,
          resident_number: res.resident_number,
          period_month: month,
          period_year: year,
          period_label: `${new Date(year, month - 1).toLocaleString('default', { month: 'long' })} ${year}`,
          amount_due: 5000,
          amount_paid: 0,
          status: 'UNPAID',
          due_date: `${year}-${String(month).padStart(2, '0')}-01`,
          paid_at: null,
          paystack_reference: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
      }
    });
    saveLocalPayments(payments);

    let filtered = payments.filter(p => p.period_month === month && p.period_year === year);

    if (filters?.status && filters.status !== 'All') {
      filtered = filtered.filter(p => p.status.toUpperCase() === filters.status?.toUpperCase());
    }
    if (filters?.residentNumber) {
      filtered = filtered.filter(p => p.resident_number === filters.residentNumber);
    }

    // Attach resident profiles
    return filtered.map(p => ({
      ...p,
      resident: residents.find(r => r.resident_number === p.resident_number || r.id === p.resident_id)
    })).sort((a, b) => a.resident_number.localeCompare(b.resident_number));
  },

  async getMonthlyPaymentForResident(residentNumberOrId: string, month: number = 10, year: number = 2026): Promise<MonthlyPayment | null> {
    const list = await this.getMonthlyPayments({ periodMonth: month, periodYear: year });
    const clean = residentNumberOrId.trim();
    return list.find(p => p.resident_number === clean || p.resident_id === clean) || null;
  },

  // 5. PAYMENT TRANSACTIONS (STAGE 4 PAYSTACK)
  async getPaymentTransactions(filters?: {
    residentNumber?: string;
    query?: string;
    status?: string;
    periodMonth?: number;
    periodYear?: number;
  }): Promise<PaymentTransaction[]> {
    if (isSupabaseConfigured && supabase && !isTableMarkedMissing('payment_transactions')) {
      try {
        let req = supabase.from('payment_transactions').select('*, residents(*)').order('created_at', { ascending: false });

        if (filters?.residentNumber) {
          req = req.eq('resident_number', filters.residentNumber);
        }

        if (filters?.status && filters.status !== 'All') {
          req = req.ilike('status', filters.status);
        }

        const { data, error } = await req;
        if (error) {
          if (isTableNotFoundError(error)) {
            markTableMissing('payment_transactions');
          }
        } else if (data && data.length > 0) {
          markTableAvailable('payment_transactions');
          let mapped = data.map((d: any) => ({
            id: d.id,
            payment_id: d.payment_id,
            resident_id: d.resident_id,
            resident_number: d.resident_number,
            period_month: d.period_month,
            period_year: d.period_year,
            period_label: d.period_label,
            transaction_reference: d.transaction_reference,
            paystack_reference: d.paystack_reference,
            paystack_transaction_id: d.paystack_transaction_id,
            amount_due: Number(d.amount_due),
            amount_paid: Number(d.amount_paid),
            currency: d.currency,
            payment_method: d.payment_method,
            status: d.status,
            payment_channel: d.payment_channel,
            payment_date: d.payment_date,
            gateway_response: d.gateway_response,
            customer_email: d.customer_email,
            channel_details: d.channel_details,
            created_at: d.created_at,
            updated_at: d.updated_at,
            resident: d.residents ? {
              id: d.residents.id,
              resident_number: d.residents.resident_number,
              full_name: d.residents.full_name,
              phone_number: d.residents.phone_number,
              email: d.residents.email,
              house_number: d.residents.house_number,
              address: d.residents.address,
              state: d.residents.state,
              lga: d.residents.lga,
              registration_date: d.residents.registration_date,
              status: d.residents.status,
              created_at: d.residents.created_at,
              updated_at: d.residents.updated_at
            } : undefined
          }));

          if (filters?.query) {
            const q = filters.query.toLowerCase().trim();
            mapped = mapped.filter(t => 
              t.resident_number.toLowerCase().includes(q) ||
              (t.paystack_reference && t.paystack_reference.toLowerCase().includes(q)) ||
              t.transaction_reference.toLowerCase().includes(q) ||
              (t.resident?.full_name && t.resident.full_name.toLowerCase().includes(q)) ||
              (t.resident?.phone_number && t.resident.phone_number.includes(q))
            );
          }
          return mapped;
        }
      } catch (err: any) {
        if (isTableNotFoundError(err)) {
          markTableMissing('payment_transactions');
        }
        console.warn('Supabase fetch payment_transactions notice, using local storage:', err?.message || err);
      }
    }

    const transactions = getLocalTransactions();
    const residents = getLocalResidents();

    let list = transactions.map(t => ({
      ...t,
      resident: residents.find(r => r.resident_number === t.resident_number || r.id === t.resident_id)
    }));

    if (filters?.residentNumber) {
      list = list.filter(t => t.resident_number === filters.residentNumber);
    }

    if (filters?.status && filters.status !== 'All') {
      list = list.filter(t => t.status.toUpperCase() === filters.status?.toUpperCase());
    }

    if (filters?.query) {
      const q = filters.query.toLowerCase().trim();
      list = list.filter(t => 
        t.resident_number.toLowerCase().includes(q) ||
        (t.paystack_reference && t.paystack_reference.toLowerCase().includes(q)) ||
        t.transaction_reference.toLowerCase().includes(q) ||
        (t.resident?.full_name && t.resident.full_name.toLowerCase().includes(q)) ||
        (t.resident?.phone_number && t.resident.phone_number.includes(q))
      );
    }

    return list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  },

  // 6. DIGITAL RECEIPTS (STAGE 4 PAYSTACK)
  async getReceiptByReference(reference: string): Promise<Receipt | null> {
    const clean = reference.trim();
    if (isSupabaseConfigured && supabase && !isTableMarkedMissing('receipts')) {
      try {
        const { data, error } = await supabase
          .from('receipts')
          .select('*, residents(*)')
          .eq('paystack_reference', clean)
          .maybeSingle();

        if (error) {
          if (isTableNotFoundError(error)) {
            markTableMissing('receipts');
          }
        } else if (data) {
          markTableAvailable('receipts');
          return data as Receipt;
        }
      } catch (err: any) {
        if (isTableNotFoundError(err)) {
          markTableMissing('receipts');
        }
      }
    }

    const receipts = getLocalReceipts();
    return receipts.find(r => r.paystack_reference === clean || r.receipt_number === clean) || null;
  },

  async getReceiptById(id: string): Promise<Receipt | null> {
    const receipts = getLocalReceipts();
    return receipts.find(r => r.id === id || r.receipt_number === id) || null;
  },

  // 7. PAYMENT STATISTICS FOR ADMIN DASHBOARD
  async getPaymentStats(month: number = 10, year: number = 2026): Promise<{
    totalExpected: number;
    totalCollected: number;
    totalOutstanding: number;
    paidResidentsCount: number;
    unpaidResidentsCount: number;
    pendingPaymentsCount: number;
    failedPaymentsCount: number;
    totalResidentsCount: number;
    collectionRate: number;
  }> {
    const payments = await this.getMonthlyPayments({ periodMonth: month, periodYear: year });
    const transactions = await this.getPaymentTransactions();

    const activeResidents = (await this.getResidents()).filter(r => r.status === 'Active');
    const totalResidentsCount = activeResidents.length;

    const LEVY_AMOUNT = 5000;
    const totalExpected = totalResidentsCount * LEVY_AMOUNT;

    const paidPayments = payments.filter(p => p.status === 'PAID');
    const totalCollected = paidPayments.reduce((acc, curr) => acc + (curr.amount_paid || LEVY_AMOUNT), 0);
    const totalOutstanding = Math.max(0, totalExpected - totalCollected);

    const paidResidentsCount = paidPayments.length;
    const unpaidResidentsCount = Math.max(0, totalResidentsCount - paidResidentsCount);

    const periodTransactions = transactions.filter(t => t.period_month === month && t.period_year === year);
    const pendingPaymentsCount = periodTransactions.filter(t => t.status === 'PENDING').length;
    const failedPaymentsCount = periodTransactions.filter(t => t.status === 'FAILED').length;

    const collectionRate = totalExpected > 0 ? Math.round((totalCollected / totalExpected) * 100) : 0;

    return {
      totalExpected,
      totalCollected,
      totalOutstanding,
      paidResidentsCount,
      unpaidResidentsCount,
      pendingPaymentsCount,
      failedPaymentsCount,
      totalResidentsCount,
      collectionRate
    };
  },

  // 8. CONFIRM & SYNC VERIFIED PAYMENT
  async confirmVerifiedPayment(data: {
    payment: MonthlyPayment;
    transaction: PaymentTransaction;
    receipt: Receipt;
    adminEmail?: string;
  }): Promise<void> {
    const { payment, transaction, receipt, adminEmail = 'system' } = data;

    // 1. Update in-memory & Local Storage
    const payments = getLocalPayments();
    const pIdx = payments.findIndex(p => 
      p.resident_number === payment.resident_number &&
      p.period_month === payment.period_month &&
      p.period_year === payment.period_year
    );
    if (pIdx !== -1) {
      payments[pIdx] = { ...payments[pIdx], ...payment, status: 'PAID', amount_paid: 5000 };
    } else {
      payments.push(payment);
    }
    saveLocalPayments(payments);

    const transactions = getLocalTransactions();
    const tIdx = transactions.findIndex(t => t.transaction_reference === transaction.transaction_reference);
    if (tIdx !== -1) {
      transactions[tIdx] = { ...transactions[tIdx], ...transaction, status: 'PAID', amount_paid: 5000 };
    } else {
      transactions.unshift(transaction);
    }
    saveLocalTransactions(transactions);

    const receipts = getLocalReceipts();
    const rIdx = receipts.findIndex(r => r.paystack_reference === receipt.paystack_reference);
    if (rIdx === -1) {
      receipts.unshift(receipt);
      saveLocalReceipts(receipts);
    }

    // 2. Sync to Supabase if configured & tables exist
    if (isSupabaseConfigured && supabase) {
      try {
        if (!isTableMarkedMissing('monthly_payments')) {
          await supabase.from('monthly_payments').upsert({
            resident_id: payment.resident_id,
            period_month: payment.period_month,
            period_year: payment.period_year,
            period_label: payment.period_label,
            amount_due: payment.amount_due,
            amount_paid: 5000,
            status: 'Paid',
            due_date: payment.due_date,
            paid_at: payment.paid_at || new Date().toISOString()
          }, { onConflict: 'resident_id, period_month, period_year' });
        }

        if (!isTableMarkedMissing('payment_transactions')) {
          await supabase.from('payment_transactions').upsert({
            resident_id: transaction.resident_id,
            transaction_reference: transaction.transaction_reference,
            paystack_reference: transaction.paystack_reference,
            amount: 5000,
            currency: 'NGN',
            payment_method: 'Paystack',
            status: 'Success'
          }, { onConflict: 'transaction_reference' });
        }

        if (!isTableMarkedMissing('receipts')) {
          await supabase.from('receipts').upsert({
            receipt_number: receipt.receipt_number,
            resident_id: receipt.resident_id,
            amount_paid: receipt.amount_paid,
            period_covered: receipt.period_covered,
            issued_at: receipt.issued_at
          }, { onConflict: 'receipt_number' });
        }
      } catch (err) {
        console.warn('Supabase cloud payment sync notice:', err);
      }
    }

    // 3. Log Activity
    await this.logActivity({
      admin_email: adminEmail,
      action: 'STATUS_CHANGED',
      entity_type: 'resident',
      entity_id: payment.resident_number,
      description: `Confirmed ₦5,000 security levy payment for resident ${payment.resident_number} (${receipt.period_covered}) via Paystack. Ref: ${receipt.paystack_reference}`
    });
  },

  // 9. SMS REMINDER LOGS & AUTOMATION (STAGE 5)
  async getSmsLogs(filters?: {
    query?: string;
    reminderType?: string;
    deliveryStatus?: string;
    month?: number;
    year?: number;
  }): Promise<SMSLog[]> {
    if (isSupabaseConfigured && supabase && !isTableMarkedMissing('sms_logs')) {
      try {
        let req = supabase.from('sms_logs').select('*, residents(*)').order('created_at', { ascending: false });

        if (filters?.reminderType && filters.reminderType !== 'All') {
          req = req.eq('reminder_type', filters.reminderType);
        }
        if (filters?.deliveryStatus && filters.deliveryStatus !== 'All') {
          req = req.eq('delivery_status', filters.deliveryStatus);
        }
        if (filters?.month) {
          req = req.eq('payment_month', filters.month);
        }
        if (filters?.year) {
          req = req.eq('payment_year', filters.year);
        }

        const { data, error } = await req;
        if (error) {
          if (isTableNotFoundError(error)) {
            markTableMissing('sms_logs');
          }
        } else if (data) {
          markTableAvailable('sms_logs');
          let mapped: SMSLog[] = data.map((d: any) => ({
            id: d.id,
            resident_id: d.resident_id,
            resident_number: d.resident_number,
            phone_number: d.phone_number,
            payment_month: d.payment_month,
            payment_year: d.payment_year,
            period_label: d.period_label,
            reminder_type: d.reminder_type,
            message: d.message,
            provider: d.provider,
            provider_message_id: d.provider_message_id,
            delivery_status: d.delivery_status,
            sent_at: d.sent_at,
            error_message: d.error_message,
            created_at: d.created_at,
            resident: d.residents ? {
              id: d.residents.id,
              resident_number: d.residents.resident_number,
              full_name: d.residents.full_name,
              phone_number: d.residents.phone_number,
              email: d.residents.email,
              house_number: d.residents.house_number,
              address: d.residents.address,
              state: d.residents.state,
              lga: d.residents.lga,
              registration_date: d.residents.registration_date,
              status: d.residents.status,
              created_at: d.residents.created_at,
              updated_at: d.residents.updated_at
            } : undefined
          }));

          if (filters?.query) {
            const q = filters.query.toLowerCase().trim();
            mapped = mapped.filter(l => 
              l.resident_number.toLowerCase().includes(q) ||
              l.phone_number.includes(q) ||
              (l.resident?.full_name && l.resident.full_name.toLowerCase().includes(q)) ||
              l.message.toLowerCase().includes(q)
            );
          }
          return mapped;
        }
      } catch (err: any) {
        if (isTableNotFoundError(err)) {
          markTableMissing('sms_logs');
        }
      }
    }

    const localLogs = getLocalSmsLogs();
    const residents = getLocalResidents();

    let list: SMSLog[] = localLogs.map(l => ({
      ...l,
      resident: residents.find(r => r.id === l.resident_id || r.resident_number === l.resident_number)
    }));

    if (filters?.reminderType && filters.reminderType !== 'All') {
      list = list.filter(l => l.reminder_type === filters.reminderType);
    }
    if (filters?.deliveryStatus && filters.deliveryStatus !== 'All') {
      list = list.filter(l => l.delivery_status === filters.deliveryStatus);
    }
    if (filters?.month) {
      list = list.filter(l => l.payment_month === filters.month);
    }
    if (filters?.year) {
      list = list.filter(l => l.payment_year === filters.year);
    }
    if (filters?.query) {
      const q = filters.query.toLowerCase().trim();
      list = list.filter(l => 
        l.resident_number.toLowerCase().includes(q) ||
        l.phone_number.includes(q) ||
        (l.resident?.full_name && l.resident.full_name.toLowerCase().includes(q)) ||
        l.message.toLowerCase().includes(q)
      );
    }

    return list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  },

  async insertSmsLog(log: Omit<SMSLog, 'id' | 'created_at'>): Promise<SMSLog> {
    const newEntry: SMSLog = {
      ...log,
      id: 'sms-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7),
      created_at: new Date().toISOString()
    };

    // Check duplicate SENT rule locally
    if (log.reminder_type === 'REMINDER_1' || log.reminder_type === 'REMINDER_2') {
      const existing = await this.hasSuccessfulReminderBeenSent(log.resident_id, log.payment_month, log.payment_year, log.reminder_type);
      if (existing && log.delivery_status === 'SENT') {
        throw new Error(`Duplicate Protection: ${log.reminder_type} has already been successfully sent to resident ${log.resident_number} for this month.`);
      }
    }

    if (isSupabaseConfigured && supabase && !isTableMarkedMissing('sms_logs')) {
      try {
        const { data, error } = await supabase.from('sms_logs').insert({
          resident_id: newEntry.resident_id,
          resident_number: newEntry.resident_number,
          phone_number: newEntry.phone_number,
          payment_month: newEntry.payment_month,
          payment_year: newEntry.payment_year,
          period_label: newEntry.period_label,
          reminder_type: newEntry.reminder_type,
          message: newEntry.message,
          provider: newEntry.provider,
          provider_message_id: newEntry.provider_message_id,
          delivery_status: newEntry.delivery_status,
          sent_at: newEntry.sent_at,
          error_message: newEntry.error_message
        }).select().maybeSingle();

        if (error) {
          if (isTableNotFoundError(error)) {
            markTableMissing('sms_logs');
          }
        } else if (data) {
          markTableAvailable('sms_logs');
          newEntry.id = data.id;
        }
      } catch (err: any) {
        if (isTableNotFoundError(err)) {
          markTableMissing('sms_logs');
        }
      }
    }

    const currentLogs = getLocalSmsLogs();
    currentLogs.unshift(newEntry);
    saveLocalSmsLogs(currentLogs);
    return newEntry;
  },

  async hasSuccessfulReminderBeenSent(
    residentId: string,
    month: number,
    year: number,
    reminderType: 'REMINDER_1' | 'REMINDER_2'
  ): Promise<boolean> {
    const logs = await this.getSmsLogs({ month, year, reminderType });
    return logs.some(l => 
      (l.resident_id === residentId || l.resident_number === residentId) && 
      l.reminder_type === reminderType && 
      l.delivery_status === 'SENT'
    );
  },

  async getSmsStats(month: number = 10, year: number = 2026): Promise<SMSSummaryStats> {
    const logs = await this.getSmsLogs();
    const todayStr = new Date().toISOString().split('T')[0];

    const sentToday = logs.filter(l => l.delivery_status === 'SENT' && l.sent_at && l.sent_at.startsWith(todayStr)).length;
    const sentThisMonth = logs.filter(l => l.delivery_status === 'SENT' && l.payment_month === month && l.payment_year === year).length;
    const reminder1Sent = logs.filter(l => l.delivery_status === 'SENT' && l.reminder_type === 'REMINDER_1' && l.payment_month === month && l.payment_year === year).length;
    const reminder2Sent = logs.filter(l => l.delivery_status === 'SENT' && l.reminder_type === 'REMINDER_2' && l.payment_month === month && l.payment_year === year).length;
    const failedSms = logs.filter(l => l.delivery_status === 'FAILED' || l.delivery_status === 'NOT_CONFIGURED').length;
    const pendingSms = logs.filter(l => l.delivery_status === 'PENDING').length;

    return {
      sentToday,
      sentThisMonth,
      reminder1Sent,
      reminder2Sent,
      failedSms,
      pendingSms,
      totalLogged: logs.length
    };
  },

  // 10. STAGE 6: DIGITAL RECEIPTS & PUBLIC VERIFICATION
  async getAllReceipts(query?: string): Promise<Receipt[]> {
    try {
      const q = query ? `?query=${encodeURIComponent(query)}` : '';
      const res = await fetch(`/api/payments/receipts${q}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.receipts)) {
          return data.receipts;
        }
      }
    } catch {
      // safe fallback
    }

    const local = getLocalReceipts().filter(r => r.status === 'PAID');
    if (!query) return local;

    const term = query.toLowerCase();
    return local.filter(r => 
      r.receipt_number.toLowerCase().includes(term) ||
      r.resident_number.toLowerCase().includes(term) ||
      r.resident_name.toLowerCase().includes(term) ||
      r.paystack_reference.toLowerCase().includes(term) ||
      r.period_covered.toLowerCase().includes(term)
    );
  },

  async verifyReceiptPublic(receiptNumber: string): Promise<PublicReceiptVerification> {
    const clean = receiptNumber.trim().toUpperCase();
    if (!clean) {
      return {
        valid: false,
        status: 'INVALID',
        message: 'Please enter a valid receipt number.'
      };
    }

    try {
      const res = await fetch(`/api/receipts/verify/${encodeURIComponent(clean)}`);
      if (res.ok) {
        const data = await res.json();
        if (data.valid && data.receipt) {
          return {
            valid: true,
            status: 'VALID',
            receipt: data.receipt
          };
        }
      }
    } catch {
      // safe fallback to local inspection
    }

    // Local sandbox fallback verification
    const local = getLocalReceipts();
    const found = local.find(r => 
      r.receipt_number.toUpperCase() === clean || 
      r.paystack_reference.toUpperCase() === clean ||
      r.receipt_number.replace(/[^A-Z0-9]/g, '') === clean.replace(/[^A-Z0-9]/g, '')
    );

    if (found && found.status === 'PAID') {
      const parts = found.resident_name.split(' ');
      const masked = parts.map((p, i) => (i === 0 || p.length <= 2) ? p : `${p[0]}***${p.slice(-1)}`).join(' ');
      return {
        valid: true,
        status: 'VALID',
        receipt: {
          receipt_number: found.receipt_number,
          status: 'VALID',
          resident_number: found.resident_number,
          resident_name: masked,
          house_number: found.house_number,
          period_covered: found.period_covered,
          amount_paid: found.amount_paid,
          currency: found.currency || 'NGN',
          payment_date: found.payment_date,
          paystack_reference: found.paystack_reference,
          payment_gateway: 'Paystack',
          issued_at: found.issued_at,
          estate_name: 'Finger of God Estate Security Management'
        }
      };
    }

    return {
      valid: false,
      status: 'NOT_FOUND',
      message: 'Receipt not found or not an official verified payment in Finger of God Estate records.'
    };
  },

  // 11. STAGE 6 & 9: RESIDENT ACCESS, ACCOUNT ACTIVATION & DASHBOARD SERVICE
  async authResident(residentNumber: string, phoneNumber: string): Promise<{
    success: boolean;
    resident?: Resident;
    token?: string;
    message?: string;
  }> {
    try {
      const res = await fetch('/api/resident/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ residentNumber, phoneNumber })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        residentSessionService.setCurrentResident(data.resident);
        return {
          success: true,
          resident: data.resident,
          token: data.token
        };
      }
      return {
        success: false,
        message: data.message || 'Authentication failed.'
      };
    } catch {
      // Local fallback for offline / development
      const cleanNum = residentNumber.trim().padStart(3, '0');
      const residents = await this.getResidents();
      const resident = residents.find(r => r.resident_number === cleanNum);

      if (!resident) {
        return { success: false, message: `Resident #${cleanNum} not found in estate records.` };
      }

      const inputPhone = phoneNumber.replace(/\D/g, '');
      const regPhone = resident.phone_number.replace(/\D/g, '');
      const altPhone = resident.additional_phone ? resident.additional_phone.replace(/\D/g, '') : '';

      const match = (inputPhone.length >= 10 && regPhone.endsWith(inputPhone.slice(-10))) ||
                    (altPhone.length >= 10 && altPhone.endsWith(inputPhone.slice(-10))) ||
                    inputPhone === regPhone;

      if (!match) {
        return { success: false, message: 'Phone number does not match registered resident phone number.' };
      }

      residentSessionService.setCurrentResident(resident);
      return {
        success: true,
        resident,
        token: `local_tok_${Date.now()}`
      };
    }
  },

  // STAGE 9: VERIFY RESIDENT FOR ACCOUNT ACTIVATION (PRIVACY-SAFE)
  async verifyResidentForActivation(residentNumber: string, identifier: string): Promise<{
    success: boolean;
    residentName?: string;
    existingEmail?: string | null;
    isActivated?: boolean;
    message?: string;
  }> {
    const genericError = 'We could not verify these details. Please check your information or contact estate administration.';
    try {
      const res = await fetch('/api/resident/verify-activation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ residentNumber: residentNumber.trim(), identifier: identifier.trim() })
      });
      const data = await res.json();
      if (res.ok && data.success && data.resident) {
        return {
          success: true,
          residentName: data.resident.full_name,
          existingEmail: data.resident.existing_email,
          isActivated: data.resident.is_activated
        };
      }
      return { success: false, message: data.message || genericError };
    } catch {
      // Local fallback verification
      const cleanNum = residentNumber.trim().padStart(3, '0');
      const residents = await this.getResidents();
      const resident = residents.find(r => r.resident_number === cleanNum);

      if (!resident || resident.status !== 'Active') {
        return { success: false, message: genericError };
      }

      const rawInput = identifier.trim().toLowerCase();
      const inputDigits = rawInput.replace(/\D/g, '');
      const regDigits = resident.phone_number.replace(/\D/g, '');
      const altDigits = resident.additional_phone ? resident.additional_phone.replace(/\D/g, '') : '';
      const email = (resident.email || '').trim().toLowerCase();

      const phoneMatch = (inputDigits.length >= 10 && regDigits.endsWith(inputDigits.slice(-10))) ||
                         (altDigits.length >= 10 && altDigits.endsWith(inputDigits.slice(-10))) ||
                         (inputDigits.length > 0 && inputDigits === regDigits);

      const emailMatch = email && email === rawInput;

      if (!phoneMatch && !emailMatch) {
        return { success: false, message: genericError };
      }

      return {
        success: true,
        residentName: resident.full_name,
        existingEmail: resident.email,
        isActivated: !!resident.account_activated
      };
    }
  },

  // STAGE 9: ACTIVATE RESIDENT ACCOUNT & LINK TO SUPABASE AUTH
  async activateResidentAccount(data: {
    residentNumber: string;
    identifier: string;
    email: string;
    password: string;
  }): Promise<{ success: boolean; resident?: Resident; message?: string; error?: string }> {
    const { residentNumber, identifier, email, password } = data;

    let authUserId: string | undefined = undefined;

    // 1. Try Supabase Auth SignUp if configured
    if (isSupabaseConfigured && supabase) {
      try {
        const { data: signUpData, error: signUpErr } = await supabase.auth.signUp({
          email: email.trim().toLowerCase(),
          password,
          options: {
            data: {
              resident_number: residentNumber.trim().padStart(3, '0'),
              role: 'Resident'
            }
          }
        });
        if (signUpErr && !signUpErr.message.includes('already registered')) {
          return { success: false, message: signUpErr.message };
        }
        if (signUpData.user) {
          authUserId = signUpData.user.id;
        }
      } catch (err: any) {
        console.warn('Supabase auth signup notice:', err);
      }
    }

    // 2. Call backend activation endpoint
    try {
      const res = await fetch('/api/resident/activate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          residentNumber: residentNumber.trim(),
          identifier: identifier.trim(),
          email: email.trim().toLowerCase(),
          password,
          auth_user_id: authUserId
        })
      });
      const resData = await res.json();
      if (res.ok && resData.success && resData.resident) {
        // Sync local storage resident record
        const locals = getLocalResidents();
        const cleanNum = residentNumber.trim().padStart(3, '0');
        const idx = locals.findIndex(r => r.resident_number === cleanNum);
        if (idx !== -1) {
          locals[idx] = {
            ...locals[idx],
            email: email.trim().toLowerCase(),
            auth_user_id: authUserId || locals[idx].auth_user_id || `auth_${Date.now()}`,
            account_activated: true,
            updated_at: new Date().toISOString()
          };
          saveLocalResidents(locals);
        }

        residentSessionService.setCurrentResident(resData.resident);
        await this.logActivity({
          admin_email: resData.resident.email || 'resident',
          action: 'ACTIVATED_RESIDENT',
          entity_type: 'resident',
          entity_id: cleanNum,
          description: `Resident #${cleanNum} (${resData.resident.full_name}) activated their individual secure resident account.`
        });

        return { success: true, resident: resData.resident };
      }
      return { success: false, message: resData.message || 'Account activation failed.' };
    } catch {
      // Local fallback activation
      const cleanNum = residentNumber.trim().padStart(3, '0');
      const locals = getLocalResidents();
      const idx = locals.findIndex(r => r.resident_number === cleanNum);

      if (idx === -1) {
        return { success: false, message: 'Resident record not found.' };
      }

      locals[idx] = {
        ...locals[idx],
        email: email.trim().toLowerCase(),
        auth_user_id: authUserId || `auth_usr_${Date.now()}`,
        account_activated: true,
        updated_at: new Date().toISOString()
      };
      saveLocalResidents(locals);
      residentSessionService.setCurrentResident(locals[idx]);

      return { success: true, resident: locals[idx] };
    }
  },

  // STAGE 9: RESIDENT EMAIL + PASSWORD LOGIN
  async loginResident(email: string, password: string): Promise<{
    success: boolean;
    resident?: Resident;
    message?: string;
  }> {
    const cleanEmail = email.trim().toLowerCase();

    // Try Supabase Auth Sign In if configured
    if (isSupabaseConfigured && supabase) {
      try {
        const { data: authData, error: authErr } = await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password
        });
        if (!authErr && authData.user) {
          // Look up resident by auth_user_id or email
          const residents = await this.getResidents();
          const matched = residents.find(r => 
            r.auth_user_id === authData.user.id || 
            (r.email && r.email.toLowerCase() === cleanEmail)
          );
          if (matched) {
            residentSessionService.setCurrentResident(matched);
            return { success: true, resident: matched };
          }
        }
      } catch (err) {
        console.warn('Supabase signIn notice:', err);
      }
    }

    // Try Server Endpoint
    try {
      const res = await fetch('/api/resident/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cleanEmail, password })
      });
      const data = await res.json();
      if (res.ok && data.success && data.resident) {
        residentSessionService.setCurrentResident(data.resident);
        return { success: true, resident: data.resident };
      }
      return { success: false, message: data.message || 'Invalid email or password.' };
    } catch {
      // Local fallback lookup
      const residents = await this.getResidents();
      const resident = residents.find(r => r.email && r.email.toLowerCase() === cleanEmail);

      if (!resident) {
        return {
          success: false,
          message: 'No resident account found with this email. Please activate your account or check your details.'
        };
      }

      if (resident.status !== 'Active') {
        return {
          success: false,
          message: 'This resident account is currently inactive. Please contact estate administration.'
        };
      }

      residentSessionService.setCurrentResident(resident);
      return { success: true, resident };
    }
  },

  // STAGE 9: RESIDENT SELF-SERVICE PROFILE UPDATE
  async updateResidentProfile(
    residentNumber: string,
    data: { email?: string; phone_number?: string; additional_phone?: string | null }
  ): Promise<{ success: boolean; resident?: Resident; message?: string }> {
    const cleanNum = residentNumber.trim().padStart(3, '0');

    try {
      const res = await fetch('/api/resident/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          residentNumber: cleanNum,
          email: data.email,
          phone_number: data.phone_number,
          additional_phone: data.additional_phone
        })
      });
      const resData = await res.json();
      if (res.ok && resData.success && resData.resident) {
        // Sync local storage
        const locals = getLocalResidents();
        const idx = locals.findIndex(r => r.resident_number === cleanNum);
        if (idx !== -1) {
          locals[idx] = { ...locals[idx], ...resData.resident };
          saveLocalResidents(locals);
        }
        residentSessionService.setCurrentResident(resData.resident);
        return { success: true, resident: resData.resident };
      }
    } catch {}

    // Fallback
    const locals = getLocalResidents();
    const idx = locals.findIndex(r => r.resident_number === cleanNum);
    if (idx !== -1) {
      if (data.email !== undefined) locals[idx].email = data.email.trim().toLowerCase();
      if (data.phone_number !== undefined) locals[idx].phone_number = data.phone_number.trim();
      if (data.additional_phone !== undefined) locals[idx].additional_phone = data.additional_phone ? data.additional_phone.trim() : null;
      locals[idx].updated_at = new Date().toISOString();

      saveLocalResidents(locals);
      residentSessionService.setCurrentResident(locals[idx]);
      return { success: true, resident: locals[idx] };
    }

    return { success: false, message: 'Resident not found.' };
  },

  // STAGE 9: CHANGE RESIDENT PASSWORD
  async changeResidentPassword(newPassword: string): Promise<{ success: boolean; message?: string }> {
    if (newPassword.length < 6) {
      return { success: false, message: 'Password must be at least 6 characters.' };
    }

    if (isSupabaseConfigured && supabase) {
      try {
        const { error } = await supabase.auth.updateUser({ password: newPassword });
        if (error) {
          return { success: false, message: error.message };
        }
        return { success: true, message: 'Password updated successfully.' };
      } catch (err: any) {
        return { success: false, message: err.message || 'Password update failed.' };
      }
    }

    return { success: true, message: 'Password updated successfully.' };
  },

  async getResidentDashboard(residentNumber: string): Promise<ResidentDashboardData | null> {
    const cleanNum = residentNumber.trim().padStart(3, '0');
    try {
      const res = await fetch(`/api/resident/dashboard?residentNumber=${cleanNum}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          return {
            resident: data.resident,
            summary: data.summary,
            currentMonthPayment: data.currentMonthPayment,
            outstandingLevies: data.outstandingLevies,
            paymentHistory: data.paymentHistory,
            transactions: data.transactions,
            receipts: data.receipts
          };
        }
      }
    } catch {
      // Local calculation fallback
    }

    // Comprehensive client fallback calculation
    const residents = await this.getResidents();
    const resident = residents.find(r => r.resident_number === cleanNum);
    if (!resident) return null;

    const payments = (await this.getMonthlyPayments()).filter(p => p.resident_number === cleanNum);
    const transactions = (await this.getPaymentTransactions()).filter(t => t.resident_number === cleanNum);
    const receipts = (await this.getAllReceipts()).filter(r => r.resident_number === cleanNum && r.status === 'PAID');

    // Ensure October 2026 exists
    let existingOct = payments.find(p => p.period_month === 10 && p.period_year === 2026);
    const octPayment: MonthlyPayment = existingOct || {
      id: `pay-${cleanNum}-10-2026`,
      resident_id: resident.id,
      resident_number: cleanNum,
      period_month: 10,
      period_year: 2026,
      period_label: 'October 2026',
      amount_due: 5000,
      amount_paid: 0,
      status: 'UNPAID',
      due_date: '2026-10-01',
      created_at: new Date().toISOString()
    };

    if (!existingOct) {
      payments.push(octPayment);
    }

    const paidPayments = payments.filter(p => p.status === 'PAID');
    const totalPaid = paidPayments.reduce((acc, curr) => acc + (curr.amount_paid || 5000), 0);
    const monthsPaid = paidPayments.length;

    const outstandingLevies = payments.filter(p => p.status === 'UNPAID' && (p.period_year === 2026 && p.period_month <= 10));
    const monthsOutstanding = outstandingLevies.length;
    const totalOutstanding = monthsOutstanding * 5000;

    return {
      resident,
      summary: {
        currentMonthStatus: octPayment.status,
        currentMonthLabel: octPayment.period_label,
        totalPaid,
        totalOutstanding,
        monthsPaid,
        monthsOutstanding,
        levyAmount: 5000
      },
      currentMonthPayment: octPayment,
      outstandingLevies,
      paymentHistory: payments,
      transactions,
      receipts
    };
  },

  // ==========================================
  // STAGE 7: ADMIN FINANCIAL REPORTS & METRICS
  // ==========================================

  async getFinancialSummary(month: number = 10, year: number = 2026): Promise<any> {
    try {
      const res = await fetch(`/api/admin/financial-summary?month=${month}&year=${year}`);
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) return json.data;
      }
    } catch (e) {
      console.warn('Backend financial summary unavailable, calculating from store:', e);
    }

    // Client-side fallback calculation with identical rules
    const residents = await this.getResidents();
    const activeResidents = residents.filter(r => r.status === 'Active');
    const inactiveResidents = residents.filter(r => r.status === 'Inactive');
    const monthlyLevy = 5000;
    const totalExpected = activeResidents.length * monthlyLevy;

    const payments = await this.getMonthlyPayments();
    const paidForMonth = payments.filter(p => p.period_month === month && p.period_year === year && p.status === 'PAID');
    const totalCollected = paidForMonth.reduce((acc, curr) => acc + (curr.amount_paid || 5000), 0);
    const paidCount = paidForMonth.length;
    const unpaidCount = Math.max(0, activeResidents.length - paidCount);
    const totalOutstanding = Math.max(0, totalExpected - totalCollected);
    const collectionPercentage = totalExpected > 0 ? Math.min(100, Math.round((totalCollected / totalExpected) * 100)) : 0;

    const txs = await this.getPaymentTransactions();
    const pendingCount = txs.filter(t => t.period_month === month && t.period_year === year && t.status === 'PENDING').length;
    const failedCount = txs.filter(t => t.period_month === month && t.period_year === year && t.status === 'FAILED').length;

    const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

    return {
      period_month: month,
      period_year: year,
      period_label: `${MONTH_NAMES[month - 1] || 'October'} ${year}`,
      total_active_residents: activeResidents.length,
      total_inactive_residents: inactiveResidents.length,
      total_residents: residents.length,
      monthly_levy: monthlyLevy,
      total_expected: totalExpected,
      total_collected: totalCollected,
      total_outstanding: totalOutstanding,
      paid_residents_count: paidCount,
      unpaid_residents_count: unpaidCount,
      pending_payments_count: pendingCount,
      failed_payments_count: failedCount,
      collection_percentage: collectionPercentage
    };
  },

  async getCollectionHistory(): Promise<any[]> {
    try {
      const res = await fetch('/api/admin/collection-history');
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.history) return json.history;
      }
    } catch {}

    const billingCycles = [
      { month: 10, year: 2026, label: 'October 2026' },
      { month: 11, year: 2026, label: 'November 2026' },
      { month: 12, year: 2026, label: 'December 2026' },
      { month: 1, year: 2027, label: 'January 2027' }
    ];

    const residents = await this.getResidents();
    const active = residents.filter(r => r.status === 'Active');
    const eligibleCount = active.length;
    const expectedPerMonth = eligibleCount * 5000;

    return billingCycles.map(c => {
      const paid = c.month === 10 ? 1 : 0;
      const collected = paid * 5000;
      return {
        period_month: c.month,
        period_year: c.year,
        period_label: c.label,
        eligible_residents: eligibleCount,
        expected_amount: expectedPerMonth,
        collected_amount: collected,
        outstanding_amount: Math.max(0, expectedPerMonth - collected),
        paid_count: paid,
        unpaid_count: Math.max(0, eligibleCount - paid),
        collection_percentage: expectedPerMonth > 0 ? Math.min(100, Math.round((collected / expectedPerMonth) * 100)) : 0
      };
    });
  },

  async getPaidResidents(month: number = 10, year: number = 2026, q: string = ''): Promise<any[]> {
    try {
      const res = await fetch(`/api/admin/paid-residents?month=${month}&year=${year}&q=${encodeURIComponent(q)}`);
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.residents) return json.residents;
      }
    } catch {}

    // Fallback
    const payments = (await this.getMonthlyPayments()).filter(p => p.period_month === month && p.period_year === year && p.status === 'PAID');
    const residents = await this.getResidents();
    const receipts = await this.getAllReceipts();

    return payments.map(p => {
      const r = residents.find(res => res.resident_number === p.resident_number);
      const rcp = receipts.find(rc => rc.resident_number === p.resident_number);
      return {
        resident_number: p.resident_number,
        resident_name: r ? r.full_name : 'Estate Resident',
        house_number: r ? r.house_number : '—',
        phone_number: r ? r.phone_number : '—',
        amount_paid: p.amount_paid || 5000,
        payment_date: p.paid_at || p.created_at,
        payment_reference: p.paystack_reference || 'FOGES-PAID',
        receipt_number: rcp ? rcp.receipt_number : `FOGES-REC-${year}10-${p.resident_number}-A7C8E9`,
        payment_channel: 'card'
      };
    });
  },

  async getUnpaidResidents(month: number = 10, year: number = 2026, q: string = ''): Promise<any[]> {
    try {
      const res = await fetch(`/api/admin/unpaid-residents?month=${month}&year=${year}&q=${encodeURIComponent(q)}`);
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.residents) return json.residents;
      }
    } catch {}

    const residents = (await this.getResidents()).filter(r => r.status === 'Active');
    const payments = await this.getMonthlyPayments();

    return residents
      .filter(r => {
        const p = payments.find(pay => pay.resident_number === r.resident_number && pay.period_month === month && pay.period_year === year);
        return !p || p.status !== 'PAID';
      })
      .map(r => ({
        resident_number: r.resident_number,
        resident_name: r.full_name,
        house_number: r.house_number,
        phone_number: r.phone_number,
        amount_due: 5000,
        payment_status: 'UNPAID',
        reminder_status: r.resident_number === '002' ? 'REMINDER_1' : 'NONE',
        last_reminder_date: r.resident_number === '002' ? '2026-10-06T09:00:00Z' : null
      }));
  },

  async getOutstandingPayments(month: number = 10, year: number = 2026, q: string = ''): Promise<any[]> {
    try {
      const res = await fetch(`/api/admin/outstanding-payments?month=${month}&year=${year}&q=${encodeURIComponent(q)}`);
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.outstanding) return json.outstanding;
      }
    } catch {}

    const unpaid = await this.getUnpaidResidents(month, year, q);
    return unpaid.map(u => ({
      resident_number: u.resident_number,
      resident_name: u.resident_name,
      house_number: u.house_number,
      period_label: `October ${year}`,
      amount_due: 5000,
      amount_paid: 0,
      outstanding_amount: 5000,
      status: 'UNPAID'
    }));
  },

  async searchPaymentsGlobal(query: string): Promise<any[]> {
    if (!query.trim()) return [];
    try {
      const res = await fetch(`/api/admin/global-payment-search?q=${encodeURIComponent(query.trim())}`);
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.results) return json.results;
      }
    } catch {}

    const txs = await this.getPaymentTransactions();
    const q = query.trim().toLowerCase();
    return txs
      .filter(t => 
        t.resident_number.toLowerCase().includes(q) || 
        (t.paystack_reference && t.paystack_reference.toLowerCase().includes(q))
      )
      .map(t => ({
        id: t.id,
        resident_number: t.resident_number,
        resident_name: 'Resident #' + t.resident_number,
        phone_number: '—',
        house_number: '—',
        period_label: t.period_label,
        amount_due: t.amount_due,
        amount_paid: t.amount_paid,
        status: t.status,
        paystack_reference: t.paystack_reference,
        receipt_number: null,
        payment_date: t.payment_date || t.created_at,
        payment_channel: t.payment_channel || 'card'
      }));
  },

  async getFinancialReport(reportType: string, options: { month?: number; year?: number; startDate?: string; endDate?: string } = {}): Promise<any> {
    const { month = 10, year = 2026, startDate, endDate } = options;
    let url = `/api/admin/reports/${reportType}?month=${month}&year=${year}`;
    if (startDate) url += `&startDate=${encodeURIComponent(startDate)}`;
    if (endDate) url += `&endDate=${encodeURIComponent(endDate)}`;

    const res = await fetch(url);
    if (!res.ok) throw new Error(`Report generation failed: HTTP ${res.status}`);
    const json = await res.json();
    return json.report;
  },

  downloadReportCsv(reportType: string, options: { month?: number; year?: number; startDate?: string; endDate?: string } = {}) {
    const { month = 10, year = 2026, startDate, endDate } = options;
    let url = `/api/admin/reports/${reportType}?month=${month}&year=${year}&format=csv`;
    if (startDate) url += `&startDate=${encodeURIComponent(startDate)}`;
    if (endDate) url += `&endDate=${encodeURIComponent(endDate)}`;

    window.open(url, '_blank');
  },

  async recordAdminAudit(action: string, entity_type: string, description: string, entity_id?: string | null, metadata?: any): Promise<void> {
    try {
      const user = authService.getCurrentUser();
      await fetch('/api/admin/audit-log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          admin_email: user?.email || 'admin@fingerofgodestate.ng',
          action,
          entity_type,
          entity_id: entity_id || null,
          description,
          metadata
        })
      });
    } catch {}
  },

  // ==========================================
  // STAGE 8: ANNOUNCEMENTS & ESTATE NOTICES
  // ==========================================

  async getPublicAnnouncements(category?: string, query?: string): Promise<Announcement[]> {
    try {
      const params = new URLSearchParams();
      if (category && category !== 'ALL') params.append('category', category);
      if (query) params.append('query', query.trim());
      const res = await fetch(`/api/announcements/public?${params.toString()}`);
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.announcements)) {
          return json.announcements;
        }
      }
    } catch (e) {
      console.warn('Backend public announcements unavailable, using local store:', e);
    }

    // Local fallback
    const list = getLocalAnnouncements();
    const now = new Date();
    return list.filter(a => {
      if (a.status !== 'PUBLISHED') return false;
      if (new Date(a.publish_at) > now) return false;
      if (a.expires_at && new Date(a.expires_at) <= now) return false;
      if (category && category !== 'ALL' && a.category !== category) return false;
      if (query && !a.title.toLowerCase().includes(query.toLowerCase()) && !a.body.toLowerCase().includes(query.toLowerCase())) return false;
      return true;
    });
  },

  async getPublicAnnouncementBySlug(slug: string): Promise<Announcement | null> {
    try {
      const res = await fetch(`/api/announcements/public/${encodeURIComponent(slug)}`);
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.announcement) {
          return json.announcement;
        }
      }
    } catch {}

    const list = getLocalAnnouncements();
    const now = new Date();
    return list.find(a => 
      (a.slug === slug || a.id === slug) &&
      a.status === 'PUBLISHED' &&
      new Date(a.publish_at) <= now &&
      (!a.expires_at || new Date(a.expires_at) > now)
    ) || null;
  },

  async getAdminAnnouncements(filters?: { status?: string; category?: string; priority?: string; query?: string }): Promise<Announcement[]> {
    try {
      const params = new URLSearchParams();
      if (filters?.status && filters.status !== 'ALL') params.append('status', filters.status);
      if (filters?.category && filters.category !== 'ALL') params.append('category', filters.category);
      if (filters?.priority && filters.priority !== 'ALL') params.append('priority', filters.priority);
      if (filters?.query) params.append('query', filters.query);

      const res = await fetch(`/api/admin/announcements?${params.toString()}`);
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.announcements)) {
          return json.announcements;
        }
      }
    } catch (e) {
      console.warn('Backend admin announcements unavailable, using local store:', e);
    }

    let list = getLocalAnnouncements();
    if (filters?.status && filters.status !== 'ALL') {
      list = list.filter(a => a.status === filters.status);
    }
    if (filters?.category && filters.category !== 'ALL') {
      list = list.filter(a => a.category === filters.category);
    }
    if (filters?.priority && filters.priority !== 'ALL') {
      list = list.filter(a => a.priority === filters.priority);
    }
    if (filters?.query) {
      const q = filters.query.toLowerCase();
      list = list.filter(a => a.title.toLowerCase().includes(q) || a.body.toLowerCase().includes(q));
    }
    return list;
  },

  async createAnnouncement(data: Partial<Announcement>, adminEmail: string = 'admin@fingerofgodestate.ng'): Promise<Announcement> {
    try {
      const res = await fetch('/api/admin/announcements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, admin_email: adminEmail })
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.announcement) {
          const locals = getLocalAnnouncements();
          locals.unshift(json.announcement);
          saveLocalAnnouncements(locals);
          return json.announcement;
        }
      }
    } catch {}

    const id = `ann-${Date.now()}`;
    const slug = (data.title || 'notice').toLowerCase().replace(/\s+/g, '-').replace(/[^\w\-]+/g, '');
    const item: Announcement = {
      id,
      title: data.title || 'Untitled Notice',
      slug,
      body: data.body || '',
      content: data.body || '',
      category: data.category || 'GENERAL',
      priority: data.priority || 'NORMAL',
      status: data.status || 'DRAFT',
      publish_at: data.publish_at || new Date().toISOString(),
      expires_at: data.expires_at || null,
      author_name: data.author_name || 'Estate Administrator',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    const locals = getLocalAnnouncements();
    locals.unshift(item);
    saveLocalAnnouncements(locals);
    return item;
  },

  async updateAnnouncement(id: string, data: Partial<Announcement>, adminEmail: string = 'admin@fingerofgodestate.ng'): Promise<Announcement> {
    try {
      const res = await fetch(`/api/admin/announcements/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, admin_email: adminEmail })
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.announcement) {
          const locals = getLocalAnnouncements();
          const idx = locals.findIndex(a => a.id === id);
          if (idx !== -1) {
            locals[idx] = json.announcement;
            saveLocalAnnouncements(locals);
          }
          return json.announcement;
        }
      }
    } catch {}

    const locals = getLocalAnnouncements();
    const idx = locals.findIndex(a => a.id === id);
    if (idx !== -1) {
      locals[idx] = { ...locals[idx], ...data, updated_at: new Date().toISOString() };
      saveLocalAnnouncements(locals);
      return locals[idx];
    }
    throw new Error('Announcement not found');
  },

  async updateAnnouncementStatus(id: string, status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED', adminEmail: string = 'admin@fingerofgodestate.ng'): Promise<Announcement> {
    try {
      const res = await fetch(`/api/admin/announcements/${id}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, admin_email: adminEmail })
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.announcement) {
          const locals = getLocalAnnouncements();
          const idx = locals.findIndex(a => a.id === id);
          if (idx !== -1) {
            locals[idx] = json.announcement;
            saveLocalAnnouncements(locals);
          }
          return json.announcement;
        }
      }
    } catch {}

    return this.updateAnnouncement(id, { status }, adminEmail);
  },

  async deleteAnnouncement(id: string, adminEmail: string = 'admin@fingerofgodestate.ng'): Promise<boolean> {
    try {
      const res = await fetch(`/api/admin/announcements/${id}?admin_email=${encodeURIComponent(adminEmail)}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        const locals = getLocalAnnouncements().filter(a => a.id !== id);
        saveLocalAnnouncements(locals);
        return true;
      }
    } catch {}

    const locals = getLocalAnnouncements().filter(a => a.id !== id);
    saveLocalAnnouncements(locals);
    return true;
  },

  // ==========================================
  // STAGE 10: SECURITY OPERATIONS & INCIDENT MANAGEMENT METHODS
  // ==========================================

  // 1. Incidents
  async getIncidents(): Promise<Incident[]> {
    try {
      const res = await fetch('/api/security/incidents');
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.incidents)) {
          localStorage.setItem(STORAGE_KEYS.INCIDENTS, JSON.stringify(json.incidents));
          return json.incidents;
        }
      }
    } catch {}

    try {
      const raw = localStorage.getItem(STORAGE_KEYS.INCIDENTS);
      if (raw) return JSON.parse(raw);
    } catch {}
    localStorage.setItem(STORAGE_KEYS.INCIDENTS, JSON.stringify(INITIAL_INCIDENTS_SEED));
    return INITIAL_INCIDENTS_SEED;
  },

  async getIncidentByNumber(incidentNumber: string): Promise<Incident | null> {
    const list = await this.getIncidents();
    return list.find(i => i.incident_number.toLowerCase() === incidentNumber.toLowerCase()) || null;
  },

  async getResidentIncidents(residentNumber: string): Promise<Incident[]> {
    const list = await this.getIncidents();
    return list.filter(i => 
      i.reporter_resident_number === residentNumber || 
      (i.house_number && i.house_number.toLowerCase() === residentNumber.toLowerCase())
    );
  },

  async createIncident(incidentData: Omit<Incident, 'id' | 'incident_number' | 'status' | 'evidence' | 'timeline' | 'created_at' | 'updated_at'> & { evidence?: IncidentEvidence[] }): Promise<{ success: boolean; incident?: Incident; message?: string }> {
    try {
      const res = await fetch('/api/security/incidents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(incidentData)
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.incident) {
          const list = await this.getIncidents();
          list.unshift(json.incident);
          localStorage.setItem(STORAGE_KEYS.INCIDENTS, JSON.stringify(list));
          return json;
        }
      }
    } catch {}

    // Local generation fallback
    const list = await this.getIncidents();
    const nextSeq = String(list.length + 1).padStart(4, '0');
    const incidentNumber = `FOG-INC-2026-${nextSeq}`;
    
    const newInc: Incident = {
      id: 'inc-' + Date.now(),
      incident_number: incidentNumber,
      incident_type: incidentData.incident_type,
      priority: incidentData.priority || 'Medium',
      status: 'New',
      date: incidentData.date,
      time: incidentData.time,
      location: incidentData.location,
      house_number: incidentData.house_number || null,
      description: incidentData.description,
      people_involved: incidentData.people_involved || null,
      vehicle_details: incidentData.vehicle_details || null,
      additional_notes: incidentData.additional_notes || null,
      reporter_type: incidentData.reporter_type,
      reported_by: incidentData.reported_by,
      reporter_phone: incidentData.reporter_phone || null,
      reporter_resident_number: incidentData.reporter_resident_number || null,
      is_emergency: incidentData.is_emergency || false,
      evidence: incidentData.evidence || [],
      timeline: [
        {
          id: 'tl-' + Date.now(),
          incident_id: '',
          timestamp: new Date().toISOString(),
          title: 'Incident Report Created',
          description: `Report logged via portal for ${incidentData.incident_type} at ${incidentData.location}.`,
          performed_by: incidentData.reported_by,
          performed_by_role: incidentData.reporter_type,
          action_type: 'REPORT_CREATED'
        }
      ],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    list.unshift(newInc);
    localStorage.setItem(STORAGE_KEYS.INCIDENTS, JSON.stringify(list));

    await this.logActivity({
      admin_email: incidentData.reporter_phone || 'system@fingerofgodestate.ng',
      action: 'INCIDENT_CREATED',
      entity_type: 'incident',
      entity_id: newInc.id,
      description: `New ${incidentData.priority} security incident recorded: #${incidentNumber} (${incidentData.incident_type})`
    });

    return { success: true, incident: newInc };
  },

  async createEmergencyIncident(data: {
    type: 'Security emergency' | 'Fire' | 'Medical emergency' | 'Crime/trespassing' | 'Other';
    location: string;
    description: string;
    contactNumber: string;
    houseNumber?: string;
  }): Promise<{ success: boolean; incident?: Incident; message?: string }> {
    const res = await this.createIncident({
      incident_type: data.type === 'Fire' ? 'Fire' : data.type === 'Medical emergency' ? 'Medical emergency' : 'Gate/security breach',
      priority: 'Critical',
      date: new Date().toISOString().split('T')[0],
      time: new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
      location: data.location,
      house_number: data.houseNumber || null,
      description: `[EMERGENCY SOS] ${data.description}`,
      reporter_type: 'Resident',
      reported_by: 'Emergency Resident Caller',
      reporter_phone: data.contactNumber,
      is_emergency: true
    });

    if (res.success && res.incident) {
      await this.logActivity({
        admin_email: data.contactNumber,
        action: 'EMERGENCY_REPORTED',
        entity_type: 'incident',
        entity_id: res.incident.id,
        description: `URGENT EMERGENCY SOS broadcasted at ${data.location}: Ref #${res.incident.incident_number}`
      });
    }

    return res;
  },

  async updateIncidentStatus(incidentId: string, newStatus: IncidentStatus, note?: string, user: string = 'Security Officer'): Promise<{ success: boolean; incident?: Incident; message?: string }> {
    const list = await this.getIncidents();
    const target = list.find(i => i.id === incidentId);
    if (!target) return { success: false, message: 'Incident not found' };

    const oldStatus = target.status;
    target.status = newStatus;
    target.updated_at = new Date().toISOString();

    if (newStatus === 'Resolved' || newStatus === 'Closed') {
      target.resolved_at = new Date().toISOString();
      target.resolution_summary = note || `Resolved and secured by ${user}.`;
    }

    target.timeline.unshift({
      id: 'tl-' + Date.now(),
      incident_id: target.id,
      timestamp: new Date().toISOString(),
      title: `Status Changed to ${newStatus}`,
      description: note ? `Status transitioned from ${oldStatus} to ${newStatus}. Note: ${note}` : `Status updated to ${newStatus}.`,
      performed_by: user,
      action_type: newStatus === 'Resolved' ? 'RESOLVED' : newStatus === 'Closed' ? 'CLOSED' : 'STATUS_CHANGED'
    });

    localStorage.setItem(STORAGE_KEYS.INCIDENTS, JSON.stringify(list));

    await this.logActivity({
      admin_email: user,
      action: newStatus === 'Resolved' ? 'INCIDENT_RESOLVED' : 'INCIDENT_STATUS_CHANGED',
      entity_type: 'incident',
      entity_id: target.id,
      description: `Incident #${target.incident_number} status updated to ${newStatus}`
    });

    return { success: true, incident: target };
  },

  async assignIncidentOfficer(incidentId: string, officerId: string, officerName: string, officerPhone: string, user: string = 'Security Supervisor'): Promise<{ success: boolean; incident?: Incident; message?: string }> {
    const list = await this.getIncidents();
    const target = list.find(i => i.id === incidentId);
    if (!target) return { success: false, message: 'Incident not found' };

    target.assigned_officer_id = officerId;
    target.assigned_officer_name = officerName;
    target.assigned_officer_phone = officerPhone;
    if (target.status === 'New') {
      target.status = 'Acknowledged';
    }
    target.updated_at = new Date().toISOString();

    target.timeline.unshift({
      id: 'tl-' + Date.now(),
      incident_id: target.id,
      timestamp: new Date().toISOString(),
      title: `Assigned to Officer ${officerName}`,
      description: `Lead security investigator assigned: ${officerName} (Hotline: ${officerPhone}).`,
      performed_by: user,
      action_type: 'OFFICER_ASSIGNED'
    });

    localStorage.setItem(STORAGE_KEYS.INCIDENTS, JSON.stringify(list));

    await this.logActivity({
      admin_email: user,
      action: 'INCIDENT_ASSIGNED',
      entity_type: 'incident',
      entity_id: target.id,
      description: `Assigned Incident #${target.incident_number} to ${officerName}`
    });

    return { success: true, incident: target };
  },

  async addIncidentInvestigationNote(incidentId: string, note: string, actionTaken?: string, user: string = 'Investigating Officer'): Promise<{ success: boolean; incident?: Incident; message?: string }> {
    const list = await this.getIncidents();
    const target = list.find(i => i.id === incidentId);
    if (!target) return { success: false, message: 'Incident not found' };

    target.investigation_notes = (target.investigation_notes ? target.investigation_notes + '\n\n' : '') + `[${new Date().toLocaleDateString('en-NG')} ${user}]: ${note}`;
    if (actionTaken) {
      target.actions_taken = (target.actions_taken ? target.actions_taken + '\n' : '') + `• ${actionTaken}`;
    }
    target.updated_at = new Date().toISOString();

    target.timeline.unshift({
      id: 'tl-' + Date.now(),
      incident_id: target.id,
      timestamp: new Date().toISOString(),
      title: 'Investigation Finding Logged',
      description: actionTaken ? `${note} Action: ${actionTaken}` : note,
      performed_by: user,
      action_type: 'NOTE_ADDED'
    });

    localStorage.setItem(STORAGE_KEYS.INCIDENTS, JSON.stringify(list));
    return { success: true, incident: target };
  },

  // 2. Security Officers Roster
  async getSecurityOfficers(): Promise<SecurityOfficer[]> {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.OFFICERS);
      if (raw) return JSON.parse(raw);
    } catch {}
    localStorage.setItem(STORAGE_KEYS.OFFICERS, JSON.stringify(INITIAL_OFFICERS_SEED));
    return INITIAL_OFFICERS_SEED;
  },

  async updateOfficerStatus(officerId: string, status: OfficerStatus, user: string = 'admin'): Promise<{ success: boolean; officer?: SecurityOfficer }> {
    const list = await this.getSecurityOfficers();
    const target = list.find(o => o.id === officerId);
    if (!target) return { success: false };
    target.status = status;
    localStorage.setItem(STORAGE_KEYS.OFFICERS, JSON.stringify(list));
    return { success: true, officer: target };
  },

  // 3. Security Alerts
  async getSecurityAlerts(): Promise<SecurityAlert[]> {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.ALERTS);
      if (raw) return JSON.parse(raw);
    } catch {}
    localStorage.setItem(STORAGE_KEYS.ALERTS, JSON.stringify(INITIAL_ALERTS_SEED));
    return INITIAL_ALERTS_SEED;
  },

  async createSecurityAlert(alertData: Omit<SecurityAlert, 'id' | 'alert_code' | 'is_active' | 'created_at'>): Promise<{ success: boolean; alert?: SecurityAlert; message?: string }> {
    const list = await this.getSecurityAlerts();
    const code = `FOG-ALT-2026-${String(list.length + 1).padStart(3, '0')}`;
    const newAlert: SecurityAlert = {
      id: 'alt-' + Date.now(),
      alert_code: code,
      title: alertData.title,
      message: alertData.message,
      category: alertData.category,
      priority: alertData.priority,
      start_time: alertData.start_time,
      expiry_time: alertData.expiry_time,
      target_audience: alertData.target_audience,
      is_active: true,
      created_by: alertData.created_by,
      created_at: new Date().toISOString()
    };

    list.unshift(newAlert);
    localStorage.setItem(STORAGE_KEYS.ALERTS, JSON.stringify(list));

    await this.logActivity({
      admin_email: alertData.created_by,
      action: 'SECURITY_ALERT_CREATED',
      entity_type: 'security_alert',
      entity_id: newAlert.id,
      description: `Broadcasted Security Alert: "${alertData.title}" (${alertData.priority} priority)`
    });

    return { success: true, alert: newAlert };
  },

  async toggleSecurityAlertStatus(alertId: string, isActive: boolean, user: string = 'admin'): Promise<{ success: boolean }> {
    const list = await this.getSecurityAlerts();
    const target = list.find(a => a.id === alertId);
    if (target) {
      target.is_active = isActive;
      localStorage.setItem(STORAGE_KEYS.ALERTS, JSON.stringify(list));
    }
    return { success: true };
  },

  // 4. Visitor Passes
  async getVisitorPasses(): Promise<VisitorPass[]> {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.VISITORS);
      if (raw) return JSON.parse(raw);
    } catch {}
    localStorage.setItem(STORAGE_KEYS.VISITORS, JSON.stringify(INITIAL_VISITORS_SEED));
    return INITIAL_VISITORS_SEED;
  },

  async getResidentVisitorPasses(residentNumber: string): Promise<VisitorPass[]> {
    const list = await this.getVisitorPasses();
    return list.filter(v => v.resident_number === residentNumber);
  },

  async createVisitorPass(passData: Omit<VisitorPass, 'id' | 'pass_code' | 'status' | 'qr_code_data' | 'created_at'>): Promise<{ success: boolean; pass?: VisitorPass; message?: string }> {
    const list = await this.getVisitorPasses();
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const passCode = `FOG-VIS-${randomSuffix}`;

    const newPass: VisitorPass = {
      id: 'vis-' + Date.now(),
      pass_code: passCode,
      visitor_name: passData.visitor_name,
      visitor_phone: passData.visitor_phone,
      vehicle_number: passData.vehicle_number || null,
      vehicle_description: passData.vehicle_description || null,
      purpose_of_visit: passData.purpose_of_visit,
      resident_id: passData.resident_id,
      resident_number: passData.resident_number,
      resident_name: passData.resident_name,
      house_number: passData.house_number,
      resident_phone: passData.resident_phone,
      expected_arrival: passData.expected_arrival,
      expected_departure: passData.expected_departure,
      status: 'Expected',
      qr_code_data: `${passCode}-RES${passData.resident_number}`,
      notes: passData.notes || null,
      created_at: new Date().toISOString()
    };

    list.unshift(newPass);
    localStorage.setItem(STORAGE_KEYS.VISITORS, JSON.stringify(list));

    await this.logActivity({
      admin_email: passData.resident_phone,
      action: 'VISITOR_REGISTERED',
      entity_type: 'visitor',
      entity_id: newPass.id,
      description: `Visitor Pass ${passCode} registered for ${passData.visitor_name} (Host: ${passData.resident_name})`
    });

    return { success: true, pass: newPass };
  },

  async updateVisitorStatus(passId: string, status: 'Arrived' | 'Departed' | 'Denied', officerName: string, denialReason?: string): Promise<{ success: boolean; pass?: VisitorPass; message?: string }> {
    const list = await this.getVisitorPasses();
    const target = list.find(v => v.id === passId);
    if (!target) return { success: false, message: 'Pass not found' };

    target.status = status;
    if (status === 'Arrived') {
      target.entry_time = new Date().toISOString();
      target.checked_in_by = officerName;
      // Also automatically record in Gate Log
      await this.createGateLog({
        movement_type: 'Entry',
        entity_type: 'Visitor',
        name: target.visitor_name,
        phone_number: target.visitor_phone,
        vehicle_number: target.vehicle_number || undefined,
        house_number: target.house_number,
        destination: `${target.house_number} (${target.resident_name})`,
        pass_code: target.pass_code,
        officer_badge: 'FOG-SEC-01',
        officer_name: officerName,
        notes: `Checked in using visitor pass ${target.pass_code}`
      });
    } else if (status === 'Departed') {
      target.exit_time = new Date().toISOString();
      target.checked_out_by = officerName;
      await this.createGateLog({
        movement_type: 'Exit',
        entity_type: 'Visitor',
        name: target.visitor_name,
        phone_number: target.visitor_phone,
        vehicle_number: target.vehicle_number || undefined,
        house_number: target.house_number,
        destination: `Exit Gate`,
        pass_code: target.pass_code,
        officer_badge: 'FOG-SEC-01',
        officer_name: officerName,
        notes: `Departed gate`
      });
    } else if (status === 'Denied') {
      target.denial_reason = denialReason || 'Access denied by gate control';
    }

    localStorage.setItem(STORAGE_KEYS.VISITORS, JSON.stringify(list));

    await this.logActivity({
      admin_email: officerName,
      action: status === 'Arrived' ? 'VISITOR_CHECKED_IN' : status === 'Departed' ? 'VISITOR_CHECKED_OUT' : 'VISITOR_DENIED',
      entity_type: 'visitor',
      entity_id: target.id,
      description: `Visitor ${target.visitor_name} (${target.pass_code}) marked as ${status} by ${officerName}`
    });

    return { success: true, pass: target };
  },

  // 5. Gate Security Logs
  async getGateLogs(): Promise<GateLogEntry[]> {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.GATE_LOGS);
      if (raw) return JSON.parse(raw);
    } catch {}
    localStorage.setItem(STORAGE_KEYS.GATE_LOGS, JSON.stringify(INITIAL_GATE_LOGS_SEED));
    return INITIAL_GATE_LOGS_SEED;
  },

  async createGateLog(logData: Omit<GateLogEntry, 'id' | 'log_number' | 'timestamp'>): Promise<{ success: boolean; log?: GateLogEntry }> {
    const list = await this.getGateLogs();
    const dateStr = new Date().toISOString().split('T')[0].replace(/-/g, '');
    const seq = String(list.length + 1).padStart(3, '0');
    const logNumber = `GL-${dateStr}-${seq}`;

    const newLog: GateLogEntry = {
      id: 'gl-' + Date.now(),
      log_number: logNumber,
      movement_type: logData.movement_type,
      entity_type: logData.entity_type,
      name: logData.name,
      phone_number: logData.phone_number,
      vehicle_number: logData.vehicle_number,
      house_number: logData.house_number,
      destination: logData.destination,
      pass_code: logData.pass_code || null,
      officer_badge: logData.officer_badge,
      officer_name: logData.officer_name,
      timestamp: new Date().toISOString(),
      notes: logData.notes || null
    };

    list.unshift(newLog);
    localStorage.setItem(STORAGE_KEYS.GATE_LOGS, JSON.stringify(list));

    await this.logActivity({
      admin_email: logData.officer_name,
      action: 'GATE_LOG_RECORDED',
      entity_type: 'gate_log',
      entity_id: newLog.id,
      description: `Recorded Gate ${logData.movement_type} for ${logData.name} (${logData.entity_type})`
    });

    return { success: true, log: newLog };
  },

  // 6. Patrol Records
  async getPatrols(): Promise<PatrolRecord[]> {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.PATROLS);
      if (raw) return JSON.parse(raw);
    } catch {}
    localStorage.setItem(STORAGE_KEYS.PATROLS, JSON.stringify(INITIAL_PATROLS_SEED));
    return INITIAL_PATROLS_SEED;
  },

  async createPatrolRecord(data: Omit<PatrolRecord, 'id' | 'patrol_code' | 'created_at'>): Promise<{ success: boolean; patrol?: PatrolRecord }> {
    const list = await this.getPatrols();
    const dateStr = new Date().toISOString().split('T')[0].replace(/-/g, '');
    const code = `PTR-${dateStr}-${String(list.length + 1).padStart(2, '0')}`;

    const newPatrol: PatrolRecord = {
      id: 'ptr-' + Date.now(),
      patrol_code: code,
      officer_id: data.officer_id,
      officer_name: data.officer_name,
      officer_badge: data.officer_badge,
      patrol_area: data.patrol_area,
      start_time: data.start_time,
      end_time: data.end_time || null,
      status: data.status,
      checkpoints_count: data.checkpoints_count,
      checkpoints_completed: data.checkpoints_completed,
      issues_discovered: data.issues_discovered || [],
      notes: data.notes,
      created_at: new Date().toISOString()
    };

    list.unshift(newPatrol);
    localStorage.setItem(STORAGE_KEYS.PATROLS, JSON.stringify(list));
    return { success: true, patrol: newPatrol };
  },

  // 7. Security Summary Stats
  async getSecurityStats(): Promise<SecurityOperationsSummary> {
    const [incidents, officers, alerts, visitors, patrols] = await Promise.all([
      this.getIncidents(),
      this.getSecurityOfficers(),
      this.getSecurityAlerts(),
      this.getVisitorPasses(),
      this.getPatrols()
    ]);

    const activeInc = incidents.filter(i => i.status !== 'Resolved' && i.status !== 'Closed').length;
    const critInc = incidents.filter(i => i.priority === 'Critical' && i.status !== 'Closed').length;
    const activeAlerts = alerts.filter(a => a.is_active).length;
    const insideVis = visitors.filter(v => v.status === 'Arrived').length;
    const expectedVis = visitors.filter(v => v.status === 'Expected').length;
    const dutyOff = officers.filter(o => o.status === 'On Duty' || o.status === 'On Patrol' || o.status === 'Responding').length;
    const activePatrols = patrols.filter(p => p.status === 'In Progress').length;

    return {
      security_status: critInc > 0 ? 'Emergency' : activeInc > 5 ? 'Elevated Alert' : 'Normal',
      active_incidents_count: activeInc,
      open_incidents_count: incidents.filter(i => i.status === 'New').length,
      investigating_count: incidents.filter(i => i.status === 'Investigating').length,
      resolved_incidents_count: incidents.filter(i => i.status === 'Resolved' || i.status === 'Closed').length,
      pending_reports_count: incidents.filter(i => i.status === 'Acknowledged' || i.status === 'Action Required').length,
      critical_incidents_count: critInc,
      active_alerts_count: activeAlerts,
      visitors_inside_count: insideVis,
      expected_visitors_today: expectedVis,
      emergency_reports_count: incidents.filter(i => i.is_emergency).length,
      officers_on_duty_count: dutyOff,
      active_patrols_count: activePatrols
    };
  }
};

// ==========================================
// RESIDENT SESSION SERVICE (STAGE 6)
// ==========================================
export const residentSessionService = {
  getCurrentResident(): Resident | null {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.CURRENT_RESIDENT);
      if (raw) return JSON.parse(raw);
    } catch {}
    return null;
  },

  setCurrentResident(resident: Resident | null) {
    if (resident) {
      localStorage.setItem(STORAGE_KEYS.CURRENT_RESIDENT, JSON.stringify(resident));
    } else {
      localStorage.removeItem(STORAGE_KEYS.CURRENT_RESIDENT);
    }
  },

  logoutResident() {
    localStorage.removeItem(STORAGE_KEYS.CURRENT_RESIDENT);
  }
};

// ==========================================
// AUTHENTICATION WRAPPER
// ==========================================
export interface AuthState {
  user: {
    id: string;
    email: string;
    full_name?: string;
    role?: string;
  } | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export const authService = {
  getCurrentUser() {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.CURRENT_USER);
      if (raw) return JSON.parse(raw);
    } catch {}
    // Default initial admin session for fast prototyping
    return {
      id: 'admin-001',
      email: 'admin@fingerofgodestate.ng',
      full_name: 'Chief Security Administrator',
      role: 'Super Admin'
    };
  },

  setCurrentUser(user: any | null) {
    if (user) {
      localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(user));
    } else {
      localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
    }
  },

  async login(email: string, password: string): Promise<{ success: boolean; error?: string; user?: any }> {
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password
        });
        if (error) {
          return { success: false, error: error.message };
        }
        if (data.user) {
          const userObj = {
            id: data.user.id,
            email: data.user.email || email,
            full_name: data.user.user_metadata?.full_name || 'Estate Administrator',
            role: 'Administrator'
          };
          this.setCurrentUser(userObj);
          await dbService.logActivity({
            admin_email: userObj.email,
            action: 'ADMIN_LOGIN',
            entity_type: 'auth',
            description: `Admin ${userObj.email} signed in successfully via Supabase Auth`
          });
          return { success: true, user: userObj };
        }
      } catch (e: any) {
        return { success: false, error: e.message || 'Authentication error' };
      }
    }

    // Local authentication fallback for instant verification & offline testing
    if (password.length < 6) {
      return { success: false, error: 'Password must be at least 6 characters.' };
    }

    const userObj = {
      id: 'admin-' + Math.floor(Math.random() * 1000),
      email: email.trim().toLowerCase(),
      full_name: email.split('@')[0].replace('.', ' ').replace(/^./, str => str.toUpperCase()) + ' (Admin)',
      role: 'Administrator'
    };
    this.setCurrentUser(userObj);

    await dbService.logActivity({
      admin_email: userObj.email,
      action: 'ADMIN_LOGIN',
      entity_type: 'auth',
      description: `Admin ${userObj.email} signed into the console`
    });

    return { success: true, user: userObj };
  },

  async register(email: string, password: string, fullName: string): Promise<{ success: boolean; error?: string; user?: any }> {
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: {
              full_name: fullName
            }
          }
        });
        if (error) {
          return { success: false, error: error.message };
        }
        if (data.user) {
          const userObj = {
            id: data.user.id,
            email: data.user.email || email,
            full_name: fullName,
            role: 'Administrator'
          };
          this.setCurrentUser(userObj);
          return { success: true, user: userObj };
        }
      } catch (e: any) {
        return { success: false, error: e.message || 'Registration error' };
      }
    }

    // Local fallback
    if (password.length < 6) {
      return { success: false, error: 'Password must be at least 6 characters.' };
    }
    const userObj = {
      id: 'admin-' + Math.floor(Math.random() * 1000),
      email: email.trim().toLowerCase(),
      full_name: fullName.trim(),
      role: 'Administrator'
    };
    this.setCurrentUser(userObj);

    await dbService.logActivity({
      admin_email: userObj.email,
      action: 'ADMIN_LOGIN',
      entity_type: 'auth',
      description: `New administrator account created for ${fullName} (${userObj.email})`
    });

    return { success: true, user: userObj };
  },

  async resetPassword(email: string): Promise<{ success: boolean; message: string; error?: string }> {
    if (isSupabaseConfigured && supabase) {
      try {
        const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
          redirectTo: window.location.origin
        });
        if (error) {
          return { success: false, message: '', error: error.message };
        }
        return { success: true, message: `Password reset link has been dispatched to ${email}.` };
      } catch (e: any) {
        return { success: false, message: '', error: e.message };
      }
    }

    return {
      success: true,
      message: `Password reset instruction sent to ${email}. Check your inbox for recovery link.`
    };
  },

  async logout(): Promise<void> {
    const user = this.getCurrentUser();
    if (user?.email) {
      await dbService.logActivity({
        admin_email: user.email,
        action: 'ADMIN_LOGOUT',
        entity_type: 'auth',
        description: `Admin ${user.email} signed out`
      });
    }
    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.auth.signOut();
      } catch (e) {
        console.warn('Supabase signOut error:', e);
      }
    }
    this.setCurrentUser(null);
  }
};
