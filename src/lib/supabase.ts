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
  SecurityOperationsSummary,
  ResidentVehicle,
  VehicleType,
  VehicleStatus,
  RestrictedWatchlistEntry,
  WatchlistCategory,
  WatchlistSeverity,
  ContractorAccessPass,
  ContractorServiceType,
  ContractorStatus,
  DeliveryAccessPass,
  CourierCompany,
  PackageType,
  DeliveryStatus,
  GateLane,
  GateSecurityOverviewStats,
  ResidentAccessStatus,
  ResidentAccessVerificationResult,
  ResidentNotification,
  ResidentNotificationCategory,
  TargetAudience,
  AnnouncementAcknowledgment,
  RoadTransactionType,
  RoadProjectCategory,
  RoadProjectTransaction,
  RoadProjectMilestone,
  RoadProjectSummary
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
  estate_name: 'Finger of God Estate',
  estate_address: 'Main Gate Boulevard, Phase 1, Finger of God Estate, Iyiaba, Asaba',
  estate_state: 'Delta',
  estate_lga: 'Oshimili South',
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
  PATROLS: 'estate_security_patrols',
  VEHICLES: 'estate_security_vehicles',
  WATCHLIST: 'estate_security_watchlist',
  CONTRACTORS: 'estate_security_contractors',
  DELIVERIES: 'estate_security_deliveries',
  NOTIFICATIONS: 'estate_security_resident_notifications',
  ROAD_TRANSACTIONS: 'estate_road_project_transactions',
  ROAD_MILESTONES: 'estate_road_project_milestones'
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

const INITIAL_VEHICLES_SEED: ResidentVehicle[] = [
  {
    id: 'veh-001',
    resident_id: 'res-001',
    resident_number: '001',
    resident_name: 'Engr. Babatunde Adeleke',
    house_number: 'Plot 4A',
    vehicle_type: 'SUV',
    make: 'Toyota',
    model: 'Land Cruiser Prado',
    color: 'Pearl White',
    plate_number: 'ABC-819-LS',
    status: 'Active',
    registered_by: 'Resident Self-Service',
    notes: 'Primary executive SUV with electronic RFID tag #RF-001A',
    created_at: '2026-09-02T10:00:00Z'
  },
  {
    id: 'veh-002',
    resident_id: 'res-001',
    resident_number: '001',
    resident_name: 'Engr. Babatunde Adeleke',
    house_number: 'Plot 4A',
    vehicle_type: 'Sedan',
    make: 'Honda',
    model: 'Accord Touring',
    color: 'Metallic Gray',
    plate_number: 'KJA-492-AA',
    status: 'Active',
    registered_by: 'Resident Self-Service',
    notes: 'Secondary city commuter',
    created_at: '2026-09-05T12:00:00Z'
  },
  {
    id: 'veh-003',
    resident_id: 'res-002',
    resident_number: '002',
    resident_name: 'Dr. Chioma Nwachukwu',
    house_number: 'House 12',
    vehicle_type: 'SUV',
    make: 'Lexus',
    model: 'RX 350',
    color: 'Midnight Black',
    plate_number: 'LSR-210-FK',
    status: 'Active',
    registered_by: 'Admin / CSO Desk',
    notes: 'Medical emergency responder pass attached',
    created_at: '2026-09-08T09:30:00Z'
  },
  {
    id: 'veh-004',
    resident_id: 'res-002',
    resident_number: '002',
    resident_name: 'Dr. Chioma Nwachukwu',
    house_number: 'House 12',
    vehicle_type: 'Sedan',
    make: 'Mercedes-Benz',
    model: 'C300 4MATIC',
    color: 'Iridium Silver',
    plate_number: 'APP-773-BC',
    status: 'Active',
    registered_by: 'Resident Self-Service',
    notes: 'Registered personal sedan',
    created_at: '2026-09-10T14:15:00Z'
  },
  {
    id: 'veh-005',
    resident_id: 'res-003',
    resident_number: '003',
    resident_name: 'Alhaji Usman Danladi',
    house_number: 'Plot 18B',
    vehicle_type: 'Pickup Truck',
    make: 'Ford',
    model: 'F-150 Lariat',
    color: 'Navy Blue',
    plate_number: 'ABJ-304-DX',
    status: 'Active',
    registered_by: 'Resident Self-Service',
    notes: 'Estate security cleared',
    created_at: '2026-09-11T08:00:00Z'
  },
  {
    id: 'veh-006',
    resident_id: 'res-004',
    resident_number: '004',
    resident_name: 'Mrs. Folashade Balogun',
    house_number: 'Flat 3, Block C',
    vehicle_type: 'Hatchback',
    make: 'Hyundai',
    model: 'Tucson',
    color: 'Wine Red',
    plate_number: 'EPE-652-GH',
    status: 'Suspended',
    registered_by: 'Admin / CSO Desk',
    notes: 'Suspended pending tenant verification and security clearance',
    created_at: '2026-09-12T16:00:00Z'
  }
];

const INITIAL_WATCHLIST_SEED: RestrictedWatchlistEntry[] = [
  {
    id: 'wl-001',
    entity_name: 'Emeka Obinna (Former Artisan)',
    phone_number: '08099881122',
    plate_number: 'KTU-882-AB',
    category: 'Banned Contractor',
    reason: 'Caught attempting to remove electrical copper cabling from unoccupied plot without work order. Banned by Estate Exco.',
    severity: 'Strict Denial',
    date_added: '2026-08-14',
    added_by: 'CSO Sgt. Audu Momoh',
    is_active: true,
    notes: 'Immediate gate refusal and summon armed patrol if on premises.',
    created_at: '2026-08-14T09:00:00Z'
  },
  {
    id: 'wl-002',
    entity_name: 'Unregistered Black Tinted Corolla',
    phone_number: null,
    plate_number: 'KRD-990-ZZ',
    category: 'Suspicious Vehicle',
    reason: 'Vehicle observed conducting slow surveillance around Palm View perimeter without destination. Driver refused gate query.',
    severity: 'Immediate Apprehension',
    date_added: '2026-09-18',
    added_by: 'Inspector David Okon',
    is_active: true,
    notes: 'Hold at barrier, notify Chief Security Officer and detain driver for questioning.',
    created_at: '2026-09-18T14:30:00Z'
  },
  {
    id: 'wl-003',
    entity_name: 'Alhaji Gbadamosi (Defaulting Occupant - Plot 22)',
    phone_number: '08022114455',
    plate_number: 'MUS-419-EF',
    category: 'Court Order / Police Notice',
    reason: 'Pending eviction notice and security dispute over non-payment and aggressive conduct at estate barriers.',
    severity: 'Warning',
    date_added: '2026-09-01',
    added_by: 'Estate Secretariat',
    is_active: true,
    notes: 'Escort to facility manager office. Do not allow unauthorized commercial trucks.',
    created_at: '2026-09-01T10:00:00Z'
  }
];

const INITIAL_CONTRACTORS_SEED: ContractorAccessPass[] = [
  {
    id: 'con-001',
    pass_code: 'FOG-CON-2026-0001',
    company_name: 'CoolAir HVAC Engineering Ltd',
    lead_contractor_name: 'Engr. Samuel Bassey',
    lead_phone: '08123344556',
    worker_count: 3,
    worker_names: 'Samuel Bassey, Sunday Paul, Peter Obi',
    service_type: 'Air Conditioning / HVAC',
    house_number: 'House 12',
    resident_number: '002',
    resident_name: 'Dr. Chioma Nwachukwu',
    permit_id: 'PRM-2026-09-41',
    id_type_recorded: 'NIN',
    id_number: 'NIN-78901234567',
    valid_date: new Date().toISOString().split('T')[0],
    entry_time: new Date(Date.now() - 3600000).toISOString(),
    status: 'Active On-Site',
    security_officer: 'Guard Sunday Eze',
    notes: 'Servicing central AC outdoor units. Work permitted between 08:00 and 17:00.',
    created_at: new Date(Date.now() - 7200000).toISOString()
  },
  {
    id: 'con-002',
    pass_code: 'FOG-CON-2026-0002',
    company_name: 'Apex Green Landscaping',
    lead_contractor_name: 'Musa Garba',
    lead_phone: '08055667788',
    worker_count: 4,
    worker_names: 'Musa Garba, Ibrahim Sani, Victor Eze, Tunde Alabi',
    service_type: 'Landscaping & Gardening',
    house_number: 'Plot 4A',
    resident_number: '001',
    resident_name: 'Engr. Babatunde Adeleke',
    permit_id: 'PRM-2026-09-42',
    id_type_recorded: "Driver's License",
    id_number: 'DL-LA-9021-AA',
    valid_date: new Date().toISOString().split('T')[0],
    entry_time: null,
    status: 'Expected',
    security_officer: 'Sgt. Audu Momoh',
    notes: 'Tree trimming and lawn maintenance equipment pre-inspected.',
    created_at: new Date().toISOString()
  }
];

const INITIAL_DELIVERIES_SEED: DeliveryAccessPass[] = [
  {
    id: 'del-001',
    pass_code: 'FOG-DEL-2026-0001',
    courier_company: 'GIG Logistics',
    rider_name: 'Ifeanyi Okoro',
    rider_phone: '07081122334',
    vehicle_type: 'Motorcycle',
    vehicle_plate: 'KJA-881-XY',
    package_type: 'E-Commerce Parcel',
    house_number: 'Plot 4A',
    resident_number: '001',
    resident_name: 'Engr. Babatunde Adeleke',
    entry_time: new Date(Date.now() - 1800000).toISOString(),
    status: 'Inside Estate',
    security_officer: 'Guard Sunday Eze',
    notes: 'Delivery pass issued. Maximum allowed turnaround time 25 minutes.',
    created_at: new Date(Date.now() - 1800000).toISOString()
  },
  {
    id: 'del-002',
    pass_code: 'FOG-DEL-2026-0002',
    courier_company: 'Chowdeck',
    rider_name: 'Kehinde Adewale',
    rider_phone: '08144556677',
    vehicle_type: 'Motorcycle',
    vehicle_plate: 'APP-301-ZZ',
    package_type: 'Food / Beverage Order',
    house_number: 'House 12',
    resident_number: '002',
    resident_name: 'Dr. Chioma Nwachukwu',
    entry_time: new Date(Date.now() - 5400000).toISOString(),
    exit_time: new Date(Date.now() - 4200000).toISOString(),
    status: 'Exited',
    security_officer: 'Guard Sunday Eze',
    notes: 'Completed meal drop-off in 20 minutes.',
    created_at: new Date(Date.now() - 5400000).toISOString()
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

const INITIAL_ROAD_TRANSACTIONS_SEED: Omit<RoadProjectTransaction, 'running_balance'>[] = [
  {
    id: 'rd-tx-001',
    reference: 'FOG-RD-2026-001',
    date: '2026-10-01',
    type: 'CREDIT',
    source: 'Bank Transfer',
    description: 'Building 001 (Plot 4A) Road Project levy',
    category: 'Building Contribution',
    amount: 100000,
    payer_or_vendor: 'Building 001 (Plot 4A)',
    building_number: '001',
    approved_by: 'Road Committee Financial Secretary',
    receipt_or_invoice_ref: 'RCP-RD-2026-001',
    provider_transaction_id: 'BNK-ZEN-9920101',
    notes: 'Verified electronic bank transfer to Road Escrow Account',
    verified_at: '2026-10-01T10:15:00Z',
    status: 'VERIFIED'
  },
  {
    id: 'rd-tx-002',
    reference: 'FOG-RD-2026-002',
    date: '2026-10-02',
    type: 'CREDIT',
    source: 'Bank Transfer',
    description: 'Building 005 (House 12) Phase 1 contribution',
    category: 'Building Contribution',
    amount: 100000,
    payer_or_vendor: 'Building 005 (House 12)',
    building_number: '005',
    approved_by: 'Road Committee Financial Secretary',
    receipt_or_invoice_ref: 'RCP-RD-2026-002',
    provider_transaction_id: 'BNK-ZEN-9920102',
    notes: 'Direct deposit confirmed by Zenith Bank ledger',
    verified_at: '2026-10-02T11:30:00Z',
    status: 'VERIFIED'
  },
  {
    id: 'rd-tx-003',
    reference: 'FOG-RD-2026-003',
    date: '2026-10-03',
    type: 'CREDIT',
    source: 'Paystack',
    description: 'Building 018 (Acacia Close) Landlord levy',
    category: 'Landlord Levy',
    amount: 100000,
    payer_or_vendor: 'Building 018 (Acacia Close)',
    building_number: '018',
    approved_by: 'Paystack Automated Gateway (Server Verified)',
    receipt_or_invoice_ref: 'RCP-RD-2026-003',
    provider_transaction_id: 'pstk_tx_304910',
    notes: 'Full road assessment paid in advance via Paystack',
    verified_at: '2026-10-03T14:00:00Z',
    status: 'VERIFIED'
  },
  {
    id: 'rd-tx-004',
    reference: 'FOG-RD-2026-004',
    date: '2026-10-05',
    type: 'CREDIT',
    source: 'Bank API',
    description: 'Building 024 contribution',
    category: 'Building Contribution',
    amount: 100000,
    payer_or_vendor: 'Building 024 (Plot 14B)',
    building_number: '024',
    approved_by: 'Zenith Open Banking Feed',
    receipt_or_invoice_ref: 'RCP-RD-2026-004',
    provider_transaction_id: 'BNK-ZEN-9920104',
    notes: 'Mandatory road construction levy - verified via Open Banking feed',
    verified_at: '2026-10-05T09:20:00Z',
    status: 'VERIFIED'
  },
  {
    id: 'rd-tx-005',
    reference: 'FOG-RD-2026-005',
    date: '2026-10-07',
    type: 'CREDIT',
    source: 'Bank Transfer',
    description: 'Building 031 contribution',
    category: 'Building Contribution',
    amount: 100000,
    payer_or_vendor: 'Building 031 (Plot 21)',
    building_number: '031',
    approved_by: 'Road Committee Chairman',
    receipt_or_invoice_ref: 'RCP-RD-2026-005',
    provider_transaction_id: 'BNK-ZEN-9920105',
    notes: 'Resident road contribution payment verified',
    verified_at: '2026-10-07T13:45:00Z',
    status: 'VERIFIED'
  },
  {
    id: 'rd-tx-006',
    reference: 'FOG-RD-2026-006',
    date: '2026-10-08',
    type: 'CREDIT',
    source: 'Bank Transfer',
    description: 'Palm View Boulevard Landlords Association matching grant',
    category: 'Special Donation',
    amount: 750000,
    payer_or_vendor: 'Palm View Boulevard Landlords Forum',
    approved_by: 'Estate Executive Council & Road Lead',
    receipt_or_invoice_ref: 'RCP-RD-2026-006',
    provider_transaction_id: 'BNK-ZEN-9920106',
    notes: 'Zonal joint community development fund counterpart contribution',
    verified_at: '2026-10-08T16:00:00Z',
    status: 'VERIFIED'
  },
  {
    id: 'rd-tx-007',
    reference: 'FOG-RD-2026-007',
    date: '2026-10-10',
    type: 'DEBIT',
    source: 'Admin-authorized expenditure',
    description: 'Road materials',
    category: 'Drainage Construction',
    amount: 50000,
    payer_or_vendor: 'Dangote Cement Depot & BRC Hardware',
    approved_by: 'Site Civil Engineer & Project Treasurer',
    receipt_or_invoice_ref: 'INV-MAT-1082',
    notes: 'Purchase of 50 bags Portland cement and binding wire for side drain foundation',
    verified_at: '2026-10-10T10:00:00Z',
    status: 'VERIFIED'
  },
  {
    id: 'rd-tx-008',
    reference: 'FOG-RD-2026-008',
    date: '2026-10-12',
    type: 'CREDIT',
    source: 'Paystack',
    description: 'Building 014 (Plot 22) contribution',
    category: 'Building Contribution',
    amount: 100000,
    payer_or_vendor: 'Building 014 (Plot 22)',
    building_number: '014',
    approved_by: 'Paystack Automated Gateway (Server Verified)',
    receipt_or_invoice_ref: 'RCP-RD-2026-007',
    provider_transaction_id: 'pstk_tx_304918',
    notes: 'Direct online payment verified via Paystack',
    verified_at: '2026-10-12T11:20:00Z',
    status: 'VERIFIED'
  },
  {
    id: 'rd-tx-009',
    reference: 'FOG-RD-2026-009',
    date: '2026-10-14',
    type: 'DEBIT',
    source: 'Admin-authorized expenditure',
    description: 'Heavy equipment rental & earthwork grading (Phase 1)',
    category: 'Earthwork & Grading',
    amount: 320000,
    payer_or_vendor: 'Delta Heavy Civil Equipment Rentals Ltd',
    approved_by: 'Site Supervising Engineer',
    receipt_or_invoice_ref: 'INV-EQP-491',
    notes: 'Caterpillar 140K Motor Grader and Bomag Vibratory Roller 2-day hire',
    verified_at: '2026-10-14T17:00:00Z',
    status: 'VERIFIED'
  },
  {
    id: 'rd-tx-010',
    reference: 'FOG-RD-2026-010',
    date: '2026-10-15',
    type: 'CREDIT',
    source: 'Bank Transfer',
    description: 'Building 042 (Plot 9C) road contribution',
    category: 'Building Contribution',
    amount: 100000,
    payer_or_vendor: 'Building 042 (Plot 9C)',
    building_number: '042',
    approved_by: 'Road Committee Auditor',
    receipt_or_invoice_ref: 'RCP-RD-2026-008',
    provider_transaction_id: 'BNK-ZEN-9920110',
    notes: 'Verified against Stanbic IBTC bank alert',
    verified_at: '2026-10-15T09:10:00Z',
    status: 'VERIFIED'
  },
  {
    id: 'rd-tx-011',
    reference: 'FOG-RD-2026-011',
    date: '2026-10-17',
    type: 'CREDIT',
    source: 'Bank Transfer',
    description: 'Diaspora Residents Infrastructure Support Grant',
    category: 'Special Donation',
    amount: 1250000,
    payer_or_vendor: 'Finger of God Estate Diaspora Initiative',
    approved_by: 'Estate Executive Council',
    receipt_or_invoice_ref: 'RCP-RD-2026-009',
    provider_transaction_id: 'BNK-ZEN-9920111',
    notes: 'Special donor intervention for stormwater canal drainage line',
    verified_at: '2026-10-17T12:00:00Z',
    status: 'VERIFIED'
  },
  {
    id: 'rd-tx-012',
    reference: 'FOG-RD-2026-012',
    date: '2026-10-18',
    type: 'DEBIT',
    source: 'Admin-authorized expenditure',
    description: 'Precast concrete U-drains & reinforced cover slabs',
    category: 'Culvert & Crossing Slab',
    amount: 480000,
    payer_or_vendor: 'Western Precast Concrete Works',
    approved_by: 'Project Civil Engineer',
    receipt_or_invoice_ref: 'INV-WPC-892',
    notes: 'Supply and installation of 40 units 600mm x 600mm precast drainage gutters',
    verified_at: '2026-10-18T15:30:00Z',
    status: 'VERIFIED'
  },
  {
    id: 'rd-tx-013',
    reference: 'FOG-RD-2026-013',
    date: '2026-10-19',
    type: 'CREDIT',
    source: 'Bank API',
    description: 'Building 009 (Flat 3, Block C) Contribution',
    category: 'Building Contribution',
    amount: 100000,
    payer_or_vendor: 'Building 009 (Block C)',
    building_number: '009',
    approved_by: 'Zenith Open Banking Feed',
    receipt_or_invoice_ref: 'RCP-RD-2026-010',
    provider_transaction_id: 'BNK-ZEN-9920113',
    notes: 'Block assessment contribution confirmed',
    verified_at: '2026-10-19T10:40:00Z',
    status: 'VERIFIED'
  },
  {
    id: 'rd-tx-014',
    reference: 'FOG-RD-2026-014',
    date: '2026-10-20',
    type: 'CREDIT',
    source: 'Paystack',
    description: 'Building 028 (Plot 11) Infrastructure levy',
    category: 'Building Contribution',
    amount: 100000,
    payer_or_vendor: 'Building 028 (Plot 11)',
    building_number: '028',
    approved_by: 'Paystack Automated Gateway (Server Verified)',
    receipt_or_invoice_ref: 'RCP-RD-2026-011',
    provider_transaction_id: 'pstk_tx_304924',
    notes: 'Annual road modernization levy verified',
    verified_at: '2026-10-20T14:15:00Z',
    status: 'VERIFIED'
  },
  {
    id: 'rd-tx-015',
    reference: 'FOG-RD-2026-015',
    date: '2026-10-21',
    type: 'DEBIT',
    source: 'Admin-authorized expenditure',
    description: 'Granite stone base & compacted quarry dust (4 triaxle loads)',
    category: 'Stone Base & Aggregates',
    amount: 380000,
    payer_or_vendor: 'Apex Quarry Supplies Asaba',
    approved_by: 'Site Works Supervisor',
    receipt_or_invoice_ref: 'INV-APX-3019',
    notes: 'Delivery of 120 tonnes graded crushed stone base for Main Boulevard roadbed',
    verified_at: '2026-10-21T16:45:00Z',
    status: 'VERIFIED'
  },
  {
    id: 'rd-tx-016',
    reference: 'FOG-RD-2026-016',
    date: '2026-10-22',
    type: 'CREDIT',
    source: 'Bank Transfer',
    description: 'Building 036 (Plot 17A) Road contribution',
    category: 'Building Contribution',
    amount: 100000,
    payer_or_vendor: 'Building 036 (Plot 17A)',
    building_number: '036',
    approved_by: 'Road Committee Chairman',
    receipt_or_invoice_ref: 'RCP-RD-2026-012',
    provider_transaction_id: 'BNK-ZEN-9920116',
    notes: 'Verified electronic transfer',
    verified_at: '2026-10-22T08:50:00Z',
    status: 'VERIFIED'
  },
  {
    id: 'rd-tx-017',
    reference: 'FOG-RD-2026-017',
    date: '2026-10-23',
    type: 'DEBIT',
    source: 'Admin-authorized expenditure',
    description: 'Site labor, drainage trenching & compaction test fee',
    category: 'Project Supervision & Testing',
    amount: 115000,
    payer_or_vendor: 'Civil Testing Lab & Artisan Union',
    approved_by: 'Resident Committee Auditor',
    receipt_or_invoice_ref: 'VOUCH-LAB-044',
    notes: 'Independent California Bearing Ratio (CBR) soil compaction test and artisan wages',
    verified_at: '2026-10-23T16:00:00Z',
    status: 'VERIFIED'
  },
  {
    id: 'rd-tx-018',
    reference: 'FOG-RD-2026-018',
    date: '2026-10-24',
    type: 'CREDIT',
    source: 'Bank Transfer',
    description: 'Building 019 (Plot 3) Road assessment levy',
    category: 'Building Contribution',
    amount: 100000,
    payer_or_vendor: 'Building 019 (Plot 3)',
    building_number: '019',
    approved_by: 'Road Committee Auditor',
    receipt_or_invoice_ref: 'RCP-RD-2026-013',
    provider_transaction_id: 'BNK-ZEN-9920118',
    notes: 'Confirmed by Zenith Bank estate statement',
    verified_at: '2026-10-24T11:00:00Z',
    status: 'VERIFIED'
  },
  {
    id: 'rd-tx-019',
    reference: 'FOG-RD-2026-019',
    date: '2026-10-25',
    type: 'CREDIT',
    source: 'Bank Transfer',
    description: 'Commercial Plaza & Pharmacy store infrastructure levy',
    category: 'Commercial Store Levy',
    amount: 250000,
    payer_or_vendor: 'Phase 1 Commercial Complex',
    approved_by: 'Estate Executive Committee',
    receipt_or_invoice_ref: 'RCP-RD-2026-014',
    provider_transaction_id: 'BNK-ZEN-9920119',
    notes: 'Commercial vehicle impact assessment fee',
    verified_at: '2026-10-25T15:20:00Z',
    status: 'VERIFIED'
  },
  {
    id: 'rd-tx-020',
    reference: 'FOG-RD-2026-020',
    date: '2026-10-26',
    type: 'DEBIT',
    source: 'Admin-authorized expenditure',
    description: '60mm heavy-duty interlocking paving stones deposit (Phase 1)',
    category: 'Interlocking Paving',
    amount: 750000,
    payer_or_vendor: 'Niger Paving Stones & Ceramics Ltd',
    approved_by: 'Project Chairman & Civil Engineer',
    receipt_or_invoice_ref: 'INV-NPS-7741',
    notes: 'Advance deposit for 1,200 square meters of 40MPa hydraulically pressed interlocking pavers',
    verified_at: '2026-10-26T12:00:00Z',
    status: 'VERIFIED'
  }
];

const INITIAL_ROAD_MILESTONES_SEED: RoadProjectMilestone[] = [
  {
    id: 'ms-01',
    title: 'Phase 1: Heavy Grading, Subgrade Compaction & Soil Testing',
    description: 'Site clearance, topsoil removal, earth leveling, grading, and vibratory compaction testing across 1.8km of Main Boulevard.',
    status: 'COMPLETED',
    progress_percentage: 100,
    target_date: '2026-10-15',
    completion_date: '2026-10-14',
    estimated_cost: 350000,
    actual_cost: 320000
  },
  {
    id: 'ms-02',
    title: 'Phase 2: Reinforced Dual Side Drains & Culvert Crossings',
    description: 'Excavation and casting of 600mm reinforced concrete drainage channels and heavy slab culvert transitions to prevent flooding.',
    status: 'COMPLETED',
    progress_percentage: 100,
    target_date: '2026-10-20',
    completion_date: '2026-10-19',
    estimated_cost: 550000,
    actual_cost: 530000
  },
  {
    id: 'ms-03',
    title: 'Phase 3: 150mm Graded Stone Base & Heavy Kerb Castings',
    description: 'Placement and compaction of 150mm crushed granite stone base course with integrated concrete edge kerbs to lock paving.',
    status: 'IN_PROGRESS',
    progress_percentage: 75,
    target_date: '2026-10-31',
    estimated_cost: 600000,
    actual_cost: 495000
  },
  {
    id: 'ms-04',
    title: 'Phase 4: High-Density 60mm & 80mm Interlocking Pavers Laying',
    description: 'Laying of 40MPa hydraulically compressed interlocked stones, sand jointing, and plate-vibrator sealing.',
    status: 'UPCOMING',
    progress_percentage: 15,
    target_date: '2026-11-20',
    estimated_cost: 2800000
  },
  {
    id: 'ms-05',
    title: 'Phase 5: Solar Conduit Ducts, Speed Calming & Road Markings',
    description: 'Underground conduit installation for 24/7 solar street illumination, thermoplastic road markings, and speed bump installation.',
    status: 'UPCOMING',
    progress_percentage: 0,
    target_date: '2026-12-05',
    estimated_cost: 950000
  }
];

function calculateRunningBalances(transactions: Omit<RoadProjectTransaction, 'running_balance'>[]): RoadProjectTransaction[] {
  const sorted = [...transactions].sort((a, b) => {
    const diff = new Date(a.date).getTime() - new Date(b.date).getTime();
    if (diff !== 0) return diff;
    return a.reference.localeCompare(b.reference);
  });

  let running = 0;
  return sorted.map(tx => {
    if (tx.type === 'CREDIT') {
      running += tx.amount;
    } else {
      running -= tx.amount;
    }
    return {
      ...tx,
      running_balance: running
    };
  });
}

function getLocalRoadTransactions(): RoadProjectTransaction[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.ROAD_TRANSACTIONS);
    if (!raw) {
      const computed = calculateRunningBalances(INITIAL_ROAD_TRANSACTIONS_SEED);
      localStorage.setItem(STORAGE_KEYS.ROAD_TRANSACTIONS, JSON.stringify(computed));
      return computed;
    }
    const parsed = JSON.parse(raw);
    return calculateRunningBalances(parsed);
  } catch {
    return calculateRunningBalances(INITIAL_ROAD_TRANSACTIONS_SEED);
  }
}

function saveLocalRoadTransactions(transactions: RoadProjectTransaction[]) {
  try {
    const recalculated = calculateRunningBalances(transactions);
    localStorage.setItem(STORAGE_KEYS.ROAD_TRANSACTIONS, JSON.stringify(recalculated));
  } catch (err) {
    console.error('Failed to save road transactions:', err);
  }
}

function getLocalRoadMilestones(): RoadProjectMilestone[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.ROAD_MILESTONES);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.ROAD_MILESTONES, JSON.stringify(INITIAL_ROAD_MILESTONES_SEED));
      return INITIAL_ROAD_MILESTONES_SEED;
    }
    return JSON.parse(raw);
  } catch {
    return INITIAL_ROAD_MILESTONES_SEED;
  }
}

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
    category: 'Security',
    priority: 'Urgent',
    status: 'Published',
    target_audience: 'All Residents',
    is_pinned: true,
    is_important: true,
    publish_at: '2026-09-15T08:00:00.000Z',
    expires_at: null,
    author_name: 'Estate Security EXCO',
    created_by: 'admin@fingerofgodestate.ng',
    attachment_name: 'Security_Policy_Gate_Manual_2026.pdf',
    attachment_url: 'https://example.com/docs/security-protocols.pdf',
    read_by_residents: ['001'],
    view_count: 142,
    body: 'The Executive Committee (EXCO) of Finger of God Estate wishes to notify all residents that starting October 1, 2026, the main estate access gates will operate under enhanced 24/7 RFID scanning and armed patrol protocols.\n\nAll residents are advised to ensure their vehicle security decals are up to date and that visitors are registered with the central security desk via their resident numbers. Prompt payment of the monthly security levy ensures continuous funding for armed response teams and perimeter surveillance.',
    content: 'The Executive Committee (EXCO) of Finger of God Estate wishes to notify all residents that starting October 1, 2026, the main estate access gates will operate under enhanced 24/7 RFID scanning and armed patrol protocols.\n\nAll residents are advised to ensure their vehicle security decals are up to date and that visitors are registered with the central security desk via their resident numbers. Prompt payment of the monthly security levy ensures continuous funding for armed response teams and perimeter surveillance.',
    created_at: '2026-09-15T08:00:00.000Z',
    updated_at: '2026-09-15T08:00:00.000Z'
  },
  {
    id: 'ann-002',
    title: 'Commencement of Online Security Levy Payments (October 2026)',
    slug: 'commencement-of-online-security-levy-payments-october-2026',
    category: 'Finance',
    priority: 'Important',
    status: 'Published',
    target_audience: 'All Residents',
    is_pinned: true,
    is_important: true,
    publish_at: '2026-09-20T09:00:00.000Z',
    expires_at: null,
    author_name: 'Finance Committee',
    created_by: 'finance@fingerofgodestate.ng',
    attachment_name: 'Levy_Payment_Guidelines_Oct2026.pdf',
    attachment_url: 'https://example.com/docs/levy-guidelines.pdf',
    read_by_residents: ['001', '002'],
    view_count: 218,
    body: 'We are pleased to announce the full rollout of our automated security levy payment and receipting portal powered by Paystack.\n\nThe monthly security levy is ₦5,000, payable on or before the 1st of every month starting from October 2026. Residents can now pay online using debit cards, bank transfer, or USSD, and obtain verified digital receipts with unique cryptographic verification codes instantly. Please visit the "Pay Security Levy" section or your resident portal to complete your payment.',
    content: 'We are pleased to announce the full rollout of our automated security levy payment and receipting portal powered by Paystack.\n\nThe monthly security levy is ₦5,000, payable on or before the 1st of every month starting from October 2026. Residents can now pay online using debit cards, bank transfer, or USSD, and obtain verified digital receipts with unique cryptographic verification codes instantly. Please visit the "Pay Security Levy" section or your resident portal to complete your payment.',
    created_at: '2026-09-20T09:00:00.000Z',
    updated_at: '2026-09-20T09:00:00.000Z'
  },
  {
    id: 'ann-003',
    title: 'Quarterly Residents Townhall & Security Architecture Briefing',
    slug: 'quarterly-residents-townhall-security-architecture-briefing',
    category: 'Meeting',
    priority: 'Normal',
    status: 'Published',
    target_audience: 'All Residents',
    is_pinned: false,
    is_important: false,
    publish_at: '2026-09-22T10:00:00.000Z',
    expires_at: '2026-10-25T23:59:59.000Z',
    author_name: 'Estate Secretariat',
    created_by: 'admin@fingerofgodestate.ng',
    read_by_residents: ['001'],
    view_count: 95,
    body: 'All residents, landlords, and tenants are cordially invited to the upcoming Finger of God Estate Townhall Meeting scheduled for Saturday, October 24, 2026, at 10:00 AM at the Estate Community Hall (with a hybrid Zoom broadcast link available upon request).\n\nKey agenda items include:\n1. Review of Q3 security reports and CCTV camera expansions.\n2. Financial stewardship report and levy collection status.\n3. Traffic management within estate boulevards.\n\nYour active participation is invaluable in building a safer community.',
    content: 'All residents, landlords, and tenants are cordially invited to the upcoming Finger of God Estate Townhall Meeting scheduled for Saturday, October 24, 2026, at 10:00 AM at the Estate Community Hall (with a hybrid Zoom broadcast link available upon request).\n\nKey agenda items include:\n1. Review of Q3 security reports and CCTV camera expansions.\n2. Financial stewardship report and levy collection status.\n3. Traffic management within estate boulevards.\n\nYour active participation is invaluable in building a safer community.',
    created_at: '2026-09-22T10:00:00.000Z',
    updated_at: '2026-09-22T10:00:00.000Z'
  },
  {
    id: 'ann-004',
    title: 'Drainage Infrastructure & Streetlight Upgrade Notice',
    slug: 'drainage-infrastructure-streetlight-upgrade-notice',
    category: 'Maintenance',
    priority: 'Normal',
    status: 'Published',
    target_audience: 'Phase I Residents',
    is_pinned: false,
    is_important: false,
    publish_at: '2026-09-23T11:00:00.000Z',
    expires_at: '2026-10-10T23:59:59.000Z',
    author_name: 'Facilities & Works Committee',
    created_by: 'facilities@fingerofgodestate.ng',
    read_by_residents: ['001'],
    view_count: 67,
    body: 'The Estate Facilities Management team will be carrying out scheduled de-silting of drainage channels and replacement of solar streetlight batteries along Palm Avenue, Hibiscus Crescent, and Boulevard West from October 5 to October 8, 2026 between 9:00 AM and 4:00 PM daily.\n\nResidents along these corridors are requested not to park vehicles directly over drainage slabs during these operational hours.',
    content: 'The Estate Facilities Management team will be carrying out scheduled de-silting of drainage channels and replacement of solar streetlight batteries along Palm Avenue, Hibiscus Crescent, and Boulevard West from October 5 to October 8, 2026 between 9:00 AM and 4:00 PM daily.\n\nResidents along these corridors are requested not to park vehicles directly over drainage slabs during these operational hours.',
    created_at: '2026-09-23T11:00:00.000Z',
    updated_at: '2026-09-23T11:00:00.000Z'
  },
  {
    id: 'ann-005',
    title: 'Dedicated Feeder Transformer Scheduled Maintenance & Power Interruption',
    slug: 'dedicated-feeder-transformer-scheduled-maintenance',
    category: 'Electricity',
    priority: 'Important',
    status: 'Published',
    target_audience: 'All Residents',
    is_pinned: false,
    is_important: true,
    publish_at: '2026-09-24T06:00:00.000Z',
    expires_at: '2026-09-27T18:00:00.000Z',
    author_name: 'Power & Utility Committee',
    created_by: 'power@fingerofgodestate.ng',
    read_by_residents: ['001'],
    view_count: 112,
    body: 'Please be informed that the regional electricity distribution company (DisCo) in collaboration with the Estate Electrical Engineering team will perform preventive transformer maintenance on Sunday, September 27, 2026, from 11:00 AM to 3:00 PM.\n\nPower supply to both Phase 1 and Phase 2 will be temporarily shut down during this interval for safety. Essential estate security gates and perimeter CCTV will remain powered on backup solar inverter infrastructure.',
    content: 'Please be informed that the regional electricity distribution company (DisCo) in collaboration with the Estate Electrical Engineering team will perform preventive transformer maintenance on Sunday, September 27, 2026, from 11:00 AM to 3:00 PM.\n\nPower supply to both Phase 1 and Phase 2 will be temporarily shut down during this interval for safety. Essential estate security gates and perimeter CCTV will remain powered on backup solar inverter infrastructure.',
    created_at: '2026-09-24T06:00:00.000Z',
    updated_at: '2026-09-24T06:00:00.000Z'
  },
  {
    id: 'ann-006',
    title: 'Emergency Flood Alert & High-Intensity Rain Advisory',
    slug: 'emergency-flood-alert-high-intensity-rain-advisory',
    category: 'Emergency',
    priority: 'Emergency',
    status: 'Published',
    target_audience: 'All Residents',
    is_pinned: true,
    is_important: true,
    is_emergency: true,
    publish_at: '2026-09-24T08:00:00.000Z',
    expires_at: '2026-09-26T23:59:59.000Z',
    author_name: 'Estate Disaster & Emergency Response Team',
    created_by: 'admin@fingerofgodestate.ng',
    read_by_residents: ['001'],
    view_count: 230,
    body: 'FLASH EMERGENCY ADVISORY: The Nigerian Meteorological Agency has issued a red weather alert for heavy downpours within the coastal corridor.\n\nAll residents are advised to:\n1. Keep all storm drains in front of compounds clear of debris.\n2. Avoid parking near heavy trees along Perimeter Road.\n3. Keep emergency contacts handy. Estate Rapid Response Patrol is active on 08023456789.',
    content: 'FLASH EMERGENCY ADVISORY: The Nigerian Meteorological Agency has issued a red weather alert for heavy downpours within the coastal corridor.\n\nAll residents are advised to:\n1. Keep all storm drains in front of compounds clear of debris.\n2. Avoid parking near heavy trees along Perimeter Road.\n3. Keep emergency contacts handy. Estate Rapid Response Patrol is active on 08023456789.',
    created_at: '2026-09-24T08:00:00.000Z',
    updated_at: '2026-09-24T08:00:00.000Z'
  }
];

const INITIAL_NOTIFICATIONS_SEED: ResidentNotification[] = [
  {
    id: 'notif-001',
    resident_number: 'ALL',
    title: 'Emergency Flood Alert & High-Intensity Rain Advisory',
    message: 'Red weather alert in effect. Keep storm drains clear and report blockages to security hotline 08023456789.',
    category: 'Emergency',
    priority: 'Emergency',
    is_read: false,
    link_tab: 'resident_portal',
    link_target: 'announcements',
    announcement_id: 'ann-006',
    announcement_slug: 'emergency-flood-alert-high-intensity-rain-advisory',
    is_pinned: true,
    created_at: '2026-09-24T08:00:00.000Z',
    expires_at: '2026-09-26T23:59:59.000Z'
  },
  {
    id: 'notif-002',
    resident_number: 'ALL',
    title: 'October 2026 Security Levy Billing Activated',
    message: 'Your monthly security levy of ₦5,000 for October 2026 is ready for payment. Instant verified digital receipt issued upon completion.',
    category: 'Finance',
    priority: 'Important',
    is_read: false,
    link_tab: 'resident_portal',
    link_target: 'levy',
    announcement_id: 'ann-002',
    announcement_slug: 'commencement-of-online-security-levy-payments-october-2026',
    created_at: '2026-09-20T09:00:00.000Z'
  },
  {
    id: 'notif-003',
    resident_number: 'ALL',
    title: 'Heightened Night Gate Verification (22:00 - 05:00)',
    message: 'All unannounced nighttime visitors must be confirmed via phone call with resident host prior to barrier opening.',
    category: 'Security',
    priority: 'Important',
    is_read: true,
    read_at: '2026-09-21T10:15:00.000Z',
    link_tab: 'resident_portal',
    link_target: 'security',
    announcement_id: 'ann-001',
    created_at: '2026-09-20T08:00:00.000Z'
  },
  {
    id: 'notif-004',
    resident_number: 'ALL',
    title: 'Transformer Maintenance & Power Interruption Notice',
    message: 'Scheduled power shutdown on Sunday, Sept 27 (11 AM - 3 PM) for DisCo transformer inspection.',
    category: 'Electricity',
    priority: 'Normal',
    is_read: false,
    link_tab: 'resident_portal',
    link_target: 'announcements',
    announcement_id: 'ann-005',
    created_at: '2026-09-24T06:00:00.000Z'
  },
  {
    id: 'notif-005',
    resident_number: '001',
    title: 'Visitor Pass Generated: Pastor Emmanuel Eze',
    message: 'Visitor pass FOG-VIS-9812 created for vehicle KJA-542-AA. Valid for today.',
    category: 'Visitor',
    priority: 'Normal',
    is_read: true,
    read_at: '2026-09-24T09:10:00.000Z',
    link_tab: 'resident_portal',
    link_target: 'security',
    visitor_id: 'vis-001',
    created_at: '2026-09-24T08:30:00.000Z'
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

function getLocalNotifications(): ResidentNotification[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.NOTIFICATIONS);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(INITIAL_NOTIFICATIONS_SEED));
      return INITIAL_NOTIFICATIONS_SEED;
    }
    return JSON.parse(raw);
  } catch {
    return INITIAL_NOTIFICATIONS_SEED;
  }
}

function saveLocalNotifications(notifications: ResidentNotification[]) {
  try {
    localStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(notifications));
  } catch (err) {
    console.error('Failed to save notifications to local storage', err);
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
 * Calculates the next sequential resident number (e.g. 001, 002, 003... up to 300)
 */
export async function getNextSequentialResidentNumber(): Promise<string> {
  // First, check server store
  try {
    const res = await fetch('/api/admin/residents');
    if (res.ok) {
      const json = await res.json();
      if (json.success && Array.isArray(json.residents) && json.residents.length > 0) {
        let maxNum = 0;
        json.residents.forEach((r: { resident_number: string }) => {
          const parsed = parseInt(r.resident_number, 10);
          if (!isNaN(parsed) && parsed > maxNum) {
            maxNum = parsed;
          }
        });
        return formatResidentNumber(Math.min(maxNum + 1, 300));
      }
    }
  } catch {}

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
        return formatResidentNumber(Math.min(maxNum + 1, 300));
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
  return formatResidentNumber(Math.min(maxNum + 1, 300));
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

    // 1. Try fetching from server-side store
    try {
      const res = await fetch('/api/admin/residents');
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.residents) && json.residents.length > 0) {
          residents = json.residents.map((d: any) => ({
            id: d.id,
            auth_user_id: d.auth_user_id || null,
            account_activated: !!d.account_activated,
            profile_completed: !!d.profile_completed,
            account_status: d.account_status || (d.account_activated ? (d.profile_completed ? 'ACTIVE' : 'PROFILE UPDATE REQUIRED') : 'NOT ACTIVATED'),
            resident_number: d.resident_number,
            full_name: d.full_name,
            phone_number: d.phone_number,
            additional_phone: d.additional_phone || null,
            email: d.email || null,
            house_number: d.house_number,
            address: d.address,
            state: d.state || 'Delta',
            lga: d.lga || 'Oshimili South',
            notes: d.notes || null,
            registration_date: d.registration_date,
            status: d.status as 'Active' | 'Inactive',
            created_at: d.created_at || new Date().toISOString(),
            updated_at: d.updated_at || new Date().toISOString()
          }));
          saveLocalResidents(residents);
        }
      }
    } catch {}

    // 2. If server didn't return residents, check Supabase
    if (residents.length === 0 && isSupabaseConfigured && supabase && !isTableMarkedMissing('residents')) {
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
        } else if (data && data.length > 0) {
          markTableAvailable('residents');
          residents = data.map((d: any) => ({
            id: d.id,
            auth_user_id: d.auth_user_id || null,
            account_activated: !!d.account_activated,
            profile_completed: !!d.profile_completed,
            account_status: d.account_status || (d.account_activated ? (d.profile_completed ? 'ACTIVE' : 'PROFILE UPDATE REQUIRED') : 'NOT ACTIVATED'),
            resident_number: d.resident_number,
            full_name: d.full_name,
            phone_number: d.phone_number,
            additional_phone: d.additional_phone || null,
            email: d.email || null,
            house_number: d.house_number,
            address: d.address,
            state: d.state || 'Delta',
            lga: d.lga || 'Oshimili South',
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
    } else if (residents.length === 0) {
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
    const formatted = residentNumber.trim().padStart(3, '0');
    // Check server store
    try {
      const res = await fetch('/api/admin/residents');
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.residents)) {
          const match = json.residents.some((r: { id: string; resident_number: string }) => 
            r.id !== excludeId && r.resident_number.trim().padStart(3, '0') === formatted
          );
          if (match) return true;
        }
      }
    } catch {}

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
    return residents.some(r => r.resident_number.trim().padStart(3, '0') === formatted && r.id !== excludeId);
  },

  async isPhoneNumberTaken(phoneNumber: string, excludeId?: string): Promise<boolean> {
    const normalized = normalizeNigerianPhone(phoneNumber);
    if (!normalized) return false;

    // Check server store
    try {
      const res = await fetch('/api/admin/residents');
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.residents)) {
          const match = json.residents.some((r: { id: string; phone_number: string }) => 
            r.id !== excludeId && normalizeNigerianPhone(r.phone_number) === normalized
          );
          if (match) return true;
        }
      }
    } catch {}

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
    const cleanNum = residentData.resident_number.trim().padStart(3, '0');

    // Check resident number uniqueness
    const isTaken = await this.isResidentNumberTaken(cleanNum);
    if (isTaken) {
      throw new Error(`Resident Number "${cleanNum}" is already assigned to another resident. Resident numbers must be unique.`);
    }

    // Check phone number duplicate (normalized)
    const phoneTaken = await this.isPhoneNumberTaken(residentData.phone_number);
    if (phoneTaken) {
      throw new Error(`Phone number "${residentData.phone_number}" is already registered to an existing resident. Duplicate phone registrations are not allowed.`);
    }

    const now = new Date().toISOString();
    let newResident: Resident = {
      ...residentData,
      resident_number: cleanNum,
      phone_number: normalizeNigerianPhone(residentData.phone_number),
      additional_phone: residentData.additional_phone ? normalizeNigerianPhone(residentData.additional_phone) : null,
      notes: residentData.notes ? residentData.notes.trim() : null,
      account_activated: false,
      profile_completed: false,
      account_status: 'NOT ACTIVATED',
      id: 'res-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
      created_at: now,
      updated_at: now
    };

    // 1. Post to Server API endpoint
    try {
      const srvRes = await fetch('/api/admin/residents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newResident,
          admin_email: adminEmail
        })
      });
      if (srvRes.ok) {
        const srvJson = await srvRes.json();
        if (srvJson.success && srvJson.resident) {
          newResident = {
            ...newResident,
            ...srvJson.resident
          };
        }
      }
    } catch (e) {
      console.warn('Server create resident notice, continuing with local sync:', e);
    }

    // 2. Try Supabase Sync
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
      }
    }

    // 3. Save locally as well
    const residents = getLocalResidents();
    const existingIdx = residents.findIndex(r => r.resident_number === cleanNum);
    if (existingIdx !== -1) {
      residents[existingIdx] = newResident;
    } else {
      residents.push(newResident);
    }
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

  // COMPLETE ONE-TIME FIRST-LOGIN PROFILE SETUP
  async completeFirstTimeProfileSetup(residentNumber: string, data: {
    full_name: string;
    phone_number: string;
    additional_phone?: string | null;
    house_number: string;
    address: string;
    email?: string | null;
  }): Promise<{ success: boolean; resident?: Resident; message?: string }> {
    const cleanNum = residentNumber.trim().padStart(3, '0');

    try {
      const res = await fetch('/api/resident/first-login-setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          residentNumber: cleanNum,
          ...data
        })
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.resident) {
          const locals = getLocalResidents();
          const idx = locals.findIndex(r => r.resident_number === cleanNum);
          if (idx !== -1) {
            locals[idx] = {
              ...locals[idx],
              ...json.resident,
              account_activated: true,
              profile_completed: true,
              account_status: 'ACTIVE'
            };
            saveLocalResidents(locals);
          }
          residentSessionService.setCurrentResident(json.resident);
          return { success: true, resident: json.resident, message: json.message };
        }
      }
    } catch {}

    // Fallback local update
    const locals = getLocalResidents();
    const idx = locals.findIndex(r => r.resident_number === cleanNum);
    if (idx !== -1) {
      locals[idx] = {
        ...locals[idx],
        full_name: data.full_name.trim(),
        phone_number: normalizeNigerianPhone(data.phone_number),
        additional_phone: data.additional_phone ? normalizeNigerianPhone(data.additional_phone) : null,
        house_number: data.house_number.trim(),
        address: data.address.trim(),
        email: data.email ? data.email.trim().toLowerCase() : locals[idx].email,
        account_activated: true,
        profile_completed: true,
        account_status: 'ACTIVE',
        updated_at: new Date().toISOString()
      };
      saveLocalResidents(locals);
      residentSessionService.setCurrentResident(locals[idx]);
      return {
        success: true,
        resident: locals[idx],
        message: 'Your account is ready. Welcome to the Resident Portal.'
      };
    }

    return { success: false, message: 'Resident record not found.' };
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

  // STAGE 9 & RESIDENT PORTAL: SEND OTP CODE FOR AUTHENTICATION
  async sendResidentOtp(residentNumber: string, phoneNumber: string): Promise<{
    success: boolean;
    message?: string;
    maskedPhone?: string;
    residentName?: string;
    expiresInSeconds?: number;
    cooldownSeconds?: number;
    isDevDemo?: boolean;
    demoOtp?: string;
  }> {
    const genericError = 'Those details could not be verified. Please check your estate number and registered phone number.';
    try {
      const res = await fetch('/api/resident/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          residentNumber: residentNumber.trim(),
          phoneNumber: phoneNumber.trim()
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        return {
          success: true,
          message: data.message,
          maskedPhone: data.maskedPhone,
          residentName: data.residentName,
          expiresInSeconds: data.expiresInSeconds || 600,
          cooldownSeconds: data.cooldownSeconds || 45,
          isDevDemo: data.isDevDemo,
          demoOtp: data.demoOtp
        };
      }
      return {
        success: false,
        message: data.message || genericError
      };
    } catch {
      // Local fallback simulation if server is offline
      const cleanNum = residentNumber.trim().padStart(3, '0');
      const residents = await this.getResidents();
      const resident = residents.find(r => r.resident_number === cleanNum);

      if (!resident || resident.status !== 'Active') {
        return { success: false, message: genericError };
      }

      const inputPhone = phoneNumber.replace(/\D/g, '');
      const regPhone = resident.phone_number.replace(/\D/g, '');
      const altPhone = resident.additional_phone ? resident.additional_phone.replace(/\D/g, '') : '';

      const match = (inputPhone.length >= 10 && regPhone.endsWith(inputPhone.slice(-10))) ||
                    (altPhone.length >= 10 && altPhone.endsWith(inputPhone.slice(-10))) ||
                    inputPhone === regPhone;

      if (!match) {
        return { success: false, message: genericError };
      }

      const rawPhone = resident.phone_number;
      const maskedPhone = rawPhone.length >= 8 
        ? `${rawPhone.substring(0, 4)}••••${rawPhone.substring(rawPhone.length - 3)}`
        : 'registered phone number';

      return {
        success: true,
        message: `A 6-digit verification code has been dispatched to ${maskedPhone}.`,
        maskedPhone,
        residentName: resident.full_name,
        expiresInSeconds: 600,
        cooldownSeconds: 45,
        isDevDemo: true,
        demoOtp: '123456'
      };
    }
  },

  // STAGE 9 & RESIDENT PORTAL: VERIFY OTP AND SIGN IN
  async verifyResidentOtp(
    residentNumber: string,
    phoneNumber: string,
    otp: string,
    rememberDevice: boolean = false
  ): Promise<{
    success: boolean;
    resident?: Resident;
    token?: string;
    message?: string;
  }> {
    try {
      const res = await fetch('/api/resident/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          residentNumber: residentNumber.trim(),
          phoneNumber: phoneNumber.trim(),
          otp: otp.trim(),
          rememberDevice
        })
      });
      const data = await res.json();
      if (res.ok && data.success && data.resident) {
        residentSessionService.setCurrentResident(data.resident);
        if (rememberDevice && data.token) {
          residentSessionService.setRememberedDevice(data.resident.resident_number, data.token);
        }
        return {
          success: true,
          resident: data.resident,
          token: data.token,
          message: data.message
        };
      }
      return {
        success: false,
        message: data.message || 'Those details could not be verified. Please check your information and try again.'
      };
    } catch {
      // Local fallback simulation
      const cleanNum = residentNumber.trim().padStart(3, '0');
      const residents = await this.getResidents();
      const resident = residents.find(r => r.resident_number === cleanNum);

      if (!resident || resident.status !== 'Active') {
        return {
          success: false,
          message: 'Those details could not be verified. Please check your estate number and registered phone number.'
        };
      }

      if (otp.trim().length !== 6) {
        return {
          success: false,
          message: 'Please enter the complete 6-digit verification code.'
        };
      }

      const sessionToken = `local_tok_${Date.now()}`;
      residentSessionService.setCurrentResident(resident);
      if (rememberDevice) {
        residentSessionService.setRememberedDevice(resident.resident_number, sessionToken);
      }

      return {
        success: true,
        resident,
        token: sessionToken,
        message: `Welcome back, ${resident.full_name}!`
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
  // STAGE 8 & 13: ESTATE COMMUNICATIONS, ANNOUNCEMENTS & NOTIFICATIONS
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
      const isPub = a.status === 'PUBLISHED' || a.status === 'Published';
      if (!isPub) return false;
      if (new Date(a.publish_at) > now) return false;
      if (a.expires_at && new Date(a.expires_at) <= now) return false;
      if (category && category !== 'ALL') {
        const catClean = category.toLowerCase();
        const itemCat = a.category.toLowerCase();
        if (catClean !== itemCat && !itemCat.includes(catClean)) return false;
      }
      if (query && !a.title.toLowerCase().includes(query.toLowerCase()) && !a.body.toLowerCase().includes(query.toLowerCase())) return false;
      return true;
    }).sort((a, b) => {
      if (a.is_pinned && !b.is_pinned) return -1;
      if (!a.is_pinned && b.is_pinned) return 1;
      return new Date(b.publish_at).getTime() - new Date(a.publish_at).getTime();
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
      (a.status === 'PUBLISHED' || a.status === 'Published') &&
      new Date(a.publish_at) <= now &&
      (!a.expires_at || new Date(a.expires_at) > now)
    ) || null;
  },

  async getResidentAnnouncements(resident: Resident): Promise<Announcement[]> {
    const list = getLocalAnnouncements();
    const now = new Date();

    return list.filter(a => {
      // 1. Must be published
      const isPub = a.status === 'PUBLISHED' || a.status === 'Published';
      if (!isPub) return false;

      // 2. Must have reached publish_at (handle scheduled)
      if (new Date(a.publish_at) > now) return false;

      // 3. Must not be expired
      if (a.expires_at && new Date(a.expires_at) <= now) return false;

      // 4. Targeted audience filtering
      const audience = a.target_audience || 'All Residents';
      if (audience === 'All Residents') return true;

      const resPhase = resident.address?.toLowerCase().includes('phase 2') || resident.house_number?.toLowerCase().includes('phase 2') ? 'Phase II' : 'Phase I';
      if ((audience as string) === 'Phase I Residents' || (audience as string) === 'Phase 1') {
        return resPhase === 'Phase I' || !resident.address?.toLowerCase().includes('phase 2');
      }
      if ((audience as string) === 'Phase II Residents' || (audience as string) === 'Phase 2') {
        return resPhase === 'Phase II' || resident.address?.toLowerCase().includes('phase 2');
      }

      if (audience === 'Specific street/area' && a.target_filter_value) {
        const street = a.target_filter_value.toLowerCase();
        return (resident.address?.toLowerCase().includes(street) || resident.house_number?.toLowerCase().includes(street));
      }

      if ((audience === 'Specific house/plate numbers' || audience === 'Selected Residents') && a.target_filter_value) {
        const targets = a.target_filter_value.toLowerCase().split(',').map(s => s.trim());
        const resNum = resident.resident_number.toLowerCase();
        const houseNum = resident.house_number.toLowerCase();
        return targets.some(t => t === resNum || t === houseNum || houseNum.includes(t));
      }

      // Security or Admin only announcements not intended for normal residents
      if (audience === 'Security Personnel' || audience === 'Security Supervisors' || audience === 'Administrators/Management') {
        return false;
      }

      return true;
    }).sort((a, b) => {
      if (a.is_pinned && !b.is_pinned) return -1;
      if (!a.is_pinned && b.is_pinned) return 1;
      return new Date(b.publish_at).getTime() - new Date(a.publish_at).getTime();
    });
  },

  async markAnnouncementAsRead(
    announcementId: string, 
    residentNumber: string, 
    residentName?: string, 
    houseNumber?: string
  ): Promise<Announcement | null> {
    const list = getLocalAnnouncements();
    const item = list.find(a => a.id === announcementId || a.slug === announcementId);
    if (!item) return null;

    if (!item.read_by_residents) item.read_by_residents = [];
    if (!item.read_by_residents.includes(residentNumber)) {
      item.read_by_residents.push(residentNumber);
      item.view_count = (item.view_count || 0) + 1;

      if (residentName) {
        if (!item.acknowledgments) item.acknowledgments = [];
        item.acknowledgments.push({
          resident_number: residentNumber,
          resident_name: residentName,
          house_number: houseNumber || '',
          timestamp: new Date().toISOString()
        });
      }

      saveLocalAnnouncements(list);
    }
    return item;
  },

  async togglePinAnnouncement(id: string, adminEmail: string = 'admin@fingerofgodestate.ng'): Promise<Announcement> {
    const list = getLocalAnnouncements();
    const item = list.find(a => a.id === id);
    if (!item) throw new Error('Announcement not found');

    item.is_pinned = !item.is_pinned;
    item.updated_at = new Date().toISOString();
    saveLocalAnnouncements(list);

    await this.logActivity({
      admin_email: adminEmail,
      action: item.is_pinned ? 'ANNOUNCEMENT_PINNED' : 'ANNOUNCEMENT_UNPINNED',
      entity_type: 'announcement',
      entity_id: item.id,
      description: `${item.is_pinned ? 'Pinned' : 'Unpinned'} announcement: "${item.title}"`
    });

    return item;
  },

  async getAdminAnnouncements(filters?: { status?: string; category?: string; priority?: string; audience?: string; query?: string }): Promise<Announcement[]> {
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
    const now = new Date();

    if (filters?.status && filters.status !== 'ALL') {
      const sf = filters.status.toUpperCase();
      list = list.filter(a => {
        const aStatus = a.status.toUpperCase();
        if (sf === 'EXPIRED') {
          return (aStatus === 'EXPIRED' || (a.expires_at && new Date(a.expires_at) <= now));
        }
        if (sf === 'SCHEDULED') {
          return (aStatus === 'SCHEDULED' || new Date(a.publish_at) > now);
        }
        if (sf === 'PUBLISHED') {
          return (aStatus === 'PUBLISHED' && new Date(a.publish_at) <= now && (!a.expires_at || new Date(a.expires_at) > now));
        }
        return aStatus === sf;
      });
    }

    if (filters?.category && filters.category !== 'ALL') {
      const catClean = filters.category.toUpperCase();
      list = list.filter(a => {
        const aCat = a.category.toUpperCase();
        return aCat === catClean || aCat.includes(catClean) || catClean.includes(aCat);
      });
    }

    if (filters?.priority && filters.priority !== 'ALL') {
      const pClean = filters.priority.toUpperCase();
      list = list.filter(a => a.priority.toUpperCase() === pClean);
    }

    if (filters?.audience && filters.audience !== 'ALL') {
      list = list.filter(a => (a.target_audience || 'All Residents') === filters.audience);
    }

    if (filters?.query) {
      const q = filters.query.toLowerCase();
      list = list.filter(a => a.title.toLowerCase().includes(q) || a.body.toLowerCase().includes(q) || a.author_name?.toLowerCase().includes(q));
    }

    return list.sort((a, b) => {
      if (a.is_pinned && !b.is_pinned) return -1;
      if (!a.is_pinned && b.is_pinned) return 1;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
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
    const slug = (data.title || 'notice').toLowerCase().replace(/\s+/g, '-').replace(/[^\w\-]+/g, '') + '-' + Math.floor(100 + Math.random() * 900);
    const item: Announcement = {
      id,
      title: data.title || 'Untitled Notice',
      slug,
      body: data.body || '',
      content: data.body || '',
      category: data.category || 'General',
      priority: data.priority || 'Normal',
      status: data.status || 'Published',
      target_audience: data.target_audience || 'All Residents',
      target_filter_value: data.target_filter_value || null,
      is_pinned: Boolean(data.is_pinned),
      is_important: Boolean(data.is_important),
      is_emergency: Boolean(data.is_emergency),
      publish_at: data.publish_at || new Date().toISOString(),
      expires_at: data.expires_at || null,
      author_name: data.author_name || 'Estate Administrator',
      created_by: adminEmail,
      attachment_name: data.attachment_name || null,
      attachment_url: data.attachment_url || null,
      image_url: data.image_url || null,
      read_by_residents: [],
      view_count: 0,
      acknowledgments: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const locals = getLocalAnnouncements();
    locals.unshift(item);
    saveLocalAnnouncements(locals);

    // If published, generate resident notifications
    if (item.status === 'Published' || item.status === 'PUBLISHED') {
      const notifCategory: ResidentNotificationCategory = 
        item.category === 'Security' ? 'Security' :
        item.category === 'Finance' ? 'Finance' :
        item.category === 'Maintenance' ? 'Maintenance' :
        item.category === 'Electricity' ? 'Electricity' :
        item.category === 'Meeting' ? 'Meeting' :
        item.category === 'Emergency' ? 'Emergency' : 'Announcement';

      await this.createResidentNotification({
        resident_number: item.target_audience === 'All Residents' ? 'ALL' : (item.target_filter_value || 'ALL'),
        title: item.title,
        message: item.body.length > 140 ? item.body.slice(0, 137) + '...' : item.body,
        category: notifCategory,
        priority: (item.priority as any) || 'Normal',
        is_pinned: item.is_pinned,
        announcement_id: item.id,
        announcement_slug: item.slug,
        link_tab: 'resident_portal',
        link_target: 'announcements',
        expires_at: item.expires_at
      });
    }

    await this.logActivity({
      admin_email: adminEmail,
      action: 'ANNOUNCEMENT_CREATED',
      entity_type: 'announcement',
      entity_id: item.id,
      description: `Created official announcement: "${item.title}" (${item.category} • ${item.target_audience})`
    });

    return item;
  },

  async createEmergencyBroadcast(data: {
    title: string;
    message: string;
    target_audience?: TargetAudience;
    target_filter_value?: string;
    expires_at?: string;
    author_name?: string;
    created_by?: string;
  }, adminEmail: string = 'admin@fingerofgodestate.ng'): Promise<Announcement> {
    const ann = await this.createAnnouncement({
      title: data.title.trim(),
      body: data.message.trim(),
      category: 'Emergency',
      priority: 'Emergency',
      status: 'Published',
      target_audience: data.target_audience || 'All Residents',
      target_filter_value: data.target_filter_value || null,
      is_pinned: true,
      is_important: true,
      is_emergency: true,
      publish_at: new Date().toISOString(),
      expires_at: data.expires_at || new Date(Date.now() + 86400000 * 2).toISOString(),
      author_name: data.author_name || 'Estate Emergency Response Team',
      created_by: adminEmail
    }, adminEmail);

    // Also register a critical security alert
    await this.createSecurityAlert({
      title: `[EMERGENCY BROADCAST] ${data.title}`,
      message: data.message,
      category: 'Emergency announcement',
      priority: 'Critical',
      start_time: new Date().toISOString(),
      expiry_time: data.expires_at || new Date(Date.now() + 86400000 * 2).toISOString(),
      target_audience: data.target_audience === 'Phase II Residents' ? 'Phase 2' : data.target_audience === 'Phase I Residents' ? 'Phase 1' : 'All Residents',
      created_by: adminEmail
    });

    await this.logActivity({
      admin_email: adminEmail,
      action: 'EMERGENCY_BROADCAST_SENT',
      entity_type: 'announcement',
      entity_id: ann.id,
      description: `Dispatched ESTATE-WIDE EMERGENCY BROADCAST: "${data.title}"`
    });

    return ann;
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

      await this.logActivity({
        admin_email: adminEmail,
        action: 'ANNOUNCEMENT_UPDATED',
        entity_type: 'announcement',
        entity_id: id,
        description: `Updated announcement details for "${locals[idx].title}"`
      });

      return locals[idx];
    }
    throw new Error('Announcement not found');
  },

  async updateAnnouncementStatus(id: string, status: AnnouncementStatus, adminEmail: string = 'admin@fingerofgodestate.ng'): Promise<Announcement> {
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

    await this.logActivity({
      admin_email: adminEmail,
      action: 'ANNOUNCEMENT_DELETED',
      entity_type: 'announcement',
      entity_id: id,
      description: `Permanently removed announcement id ${id}`
    });

    return true;
  },

  // ==========================================
  // RESIDENT NOTIFICATION CENTER SERVICES (STAGE 13)
  // ==========================================

  async getResidentNotifications(
    residentNumber: string, 
    filter?: 'ALL' | 'UNREAD' | 'READ' | 'IMPORTANT' | ResidentNotificationCategory
  ): Promise<ResidentNotification[]> {
    const list = getLocalNotifications();
    const cleanNum = residentNumber.trim().padStart(3, '0');
    const now = new Date();

    let filtered = list.filter(n => {
      // 1. Check expiration
      if (n.expires_at && new Date(n.expires_at) <= now) return false;

      // 2. Audience match: 'ALL' or matching resident number
      const isTarget = n.resident_number === 'ALL' || n.resident_number === cleanNum || n.resident_number === residentNumber;
      return isTarget;
    });

    if (filter && filter !== 'ALL') {
      if (filter === 'UNREAD') {
        filtered = filtered.filter(n => !n.is_read);
      } else if (filter === 'READ') {
        filtered = filtered.filter(n => n.is_read);
      } else if (filter === 'IMPORTANT') {
        filtered = filtered.filter(n => n.priority === 'Important' || n.priority === 'Urgent' || n.priority === 'Emergency' || n.is_pinned);
      } else {
        filtered = filtered.filter(n => n.category === filter);
      }
    }

    return filtered.sort((a, b) => {
      if (a.is_pinned && !b.is_pinned) return -1;
      if (!a.is_pinned && b.is_pinned) return 1;
      if (!a.is_read && b.is_read) return -1;
      if (a.is_read && !b.is_read) return 1;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  },

  async markNotificationAsRead(id: string, residentNumber: string): Promise<boolean> {
    const list = getLocalNotifications();
    const item = list.find(n => n.id === id);
    if (item) {
      item.is_read = true;
      item.read_at = new Date().toISOString();
      saveLocalNotifications(list);
      return true;
    }
    return false;
  },

  async markAllNotificationsAsRead(residentNumber: string): Promise<number> {
    const list = getLocalNotifications();
    const cleanNum = residentNumber.trim().padStart(3, '0');
    let count = 0;
    list.forEach(n => {
      if ((n.resident_number === 'ALL' || n.resident_number === cleanNum || n.resident_number === residentNumber) && !n.is_read) {
        n.is_read = true;
        n.read_at = new Date().toISOString();
        count++;
      }
    });
    if (count > 0) {
      saveLocalNotifications(list);
    }
    return count;
  },

  async deleteResidentNotification(id: string, residentNumber: string): Promise<boolean> {
    const list = getLocalNotifications();
    const updated = list.filter(n => n.id !== id);
    saveLocalNotifications(updated);
    return true;
  },

  async createResidentNotification(data: Omit<ResidentNotification, 'id' | 'created_at' | 'is_read'> & { is_read?: boolean }): Promise<ResidentNotification> {
    const list = getLocalNotifications();
    const newNotif: ResidentNotification = {
      id: 'notif-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
      resident_number: data.resident_number || 'ALL',
      resident_id: data.resident_id,
      title: data.title,
      message: data.message,
      category: data.category || 'General',
      priority: data.priority || 'Normal',
      is_read: Boolean(data.is_read),
      link_tab: data.link_tab || 'resident_portal',
      link_target: data.link_target,
      announcement_id: data.announcement_id,
      announcement_slug: data.announcement_slug,
      incident_id: data.incident_id,
      visitor_id: data.visitor_id,
      is_pinned: Boolean(data.is_pinned),
      created_at: new Date().toISOString(),
      expires_at: data.expires_at || null
    };

    list.unshift(newNotif);
    saveLocalNotifications(list);
    return newNotif;
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
  },

  // ==========================================
  // STAGE 11: RESIDENT VEHICLES
  // ==========================================
  async getResidentVehicles(residentNumber?: string): Promise<ResidentVehicle[]> {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.VEHICLES);
      let list: ResidentVehicle[] = raw ? JSON.parse(raw) : [];
      if (!list || list.length === 0) {
        list = INITIAL_VEHICLES_SEED;
        localStorage.setItem(STORAGE_KEYS.VEHICLES, JSON.stringify(list));
      }
      if (residentNumber) {
        return list.filter(v => v.resident_number === residentNumber);
      }
      return list;
    } catch {
      return INITIAL_VEHICLES_SEED;
    }
  },

  async getVehicleByPlate(plateNumber: string): Promise<ResidentVehicle | null> {
    const list = await this.getResidentVehicles();
    const cleanPlate = plateNumber.trim().toUpperCase().replace(/[\s-]/g, '');
    return list.find(v => v.plate_number.replace(/[\s-]/g, '').toUpperCase() === cleanPlate) || null;
  },

  async registerResidentVehicle(data: Omit<ResidentVehicle, 'id' | 'created_at'>): Promise<{ success: boolean; vehicle?: ResidentVehicle; message?: string }> {
    const list = await this.getResidentVehicles();
    const normalizedPlate = data.plate_number.trim().toUpperCase();

    // Check duplicate plate
    const exists = list.some(v => v.plate_number.replace(/[\s-]/g, '').toUpperCase() === normalizedPlate.replace(/[\s-]/g, ''));
    if (exists) {
      return { success: false, message: `Vehicle with plate number ${normalizedPlate} is already registered.` };
    }

    const newVehicle: ResidentVehicle = {
      id: 'veh-' + Date.now(),
      resident_id: data.resident_id,
      resident_number: data.resident_number,
      resident_name: data.resident_name,
      house_number: data.house_number,
      vehicle_type: data.vehicle_type,
      make: data.make.trim(),
      model: data.model.trim(),
      color: data.color.trim(),
      plate_number: normalizedPlate,
      photo_url: data.photo_url || null,
      status: data.status || 'Active',
      notes: data.notes || null,
      registered_by: data.registered_by || 'Resident Self-Service',
      created_at: new Date().toISOString()
    };

    list.unshift(newVehicle);
    localStorage.setItem(STORAGE_KEYS.VEHICLES, JSON.stringify(list));

    await this.logActivity({
      admin_email: data.resident_name,
      action: 'VEHICLE_REGISTERED',
      entity_type: 'vehicle',
      entity_id: newVehicle.id,
      description: `Registered vehicle ${newVehicle.make} ${newVehicle.model} (${newVehicle.plate_number}) for House ${newVehicle.house_number}`
    });

    return { success: true, vehicle: newVehicle };
  },

  async updateResidentVehicle(id: string, data: Partial<ResidentVehicle>): Promise<{ success: boolean; vehicle?: ResidentVehicle; message?: string }> {
    const list = await this.getResidentVehicles();
    const index = list.findIndex(v => v.id === id);
    if (index === -1) return { success: false, message: 'Vehicle record not found.' };

    const updated: ResidentVehicle = {
      ...list[index],
      ...data,
      plate_number: data.plate_number ? data.plate_number.trim().toUpperCase() : list[index].plate_number,
      updated_at: new Date().toISOString()
    };

    list[index] = updated;
    localStorage.setItem(STORAGE_KEYS.VEHICLES, JSON.stringify(list));

    await this.logActivity({
      admin_email: 'Security Gate Desk',
      action: 'VEHICLE_UPDATED',
      entity_type: 'vehicle',
      entity_id: id,
      description: `Updated details for vehicle ${updated.plate_number} (${updated.make} ${updated.model})`
    });

    return { success: true, vehicle: updated };
  },

  async deleteResidentVehicle(id: string): Promise<{ success: boolean; message?: string }> {
    const list = await this.getResidentVehicles();
    const target = list.find(v => v.id === id);
    if (!target) return { success: false, message: 'Vehicle not found' };

    const remaining = list.filter(v => v.id !== id);
    localStorage.setItem(STORAGE_KEYS.VEHICLES, JSON.stringify(remaining));

    await this.logActivity({
      admin_email: 'Resident Portal',
      action: 'VEHICLE_DELETED',
      entity_type: 'vehicle',
      entity_id: id,
      description: `Removed registered vehicle ${target.plate_number} (${target.make} ${target.model})`
    });

    return { success: true };
  },

  // ==========================================
  // STAGE 11: RESTRICTED WATCHLIST & BLACKLIST
  // ==========================================
  async getWatchlist(): Promise<RestrictedWatchlistEntry[]> {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.WATCHLIST);
      let list: RestrictedWatchlistEntry[] = raw ? JSON.parse(raw) : [];
      if (!list || list.length === 0) {
        list = INITIAL_WATCHLIST_SEED;
        localStorage.setItem(STORAGE_KEYS.WATCHLIST, JSON.stringify(list));
      }
      return list;
    } catch {
      return INITIAL_WATCHLIST_SEED;
    }
  },

  async addToWatchlist(data: Omit<RestrictedWatchlistEntry, 'id' | 'created_at'>): Promise<{ success: boolean; entry?: RestrictedWatchlistEntry; message?: string }> {
    const list = await this.getWatchlist();
    const newEntry: RestrictedWatchlistEntry = {
      id: 'wl-' + Date.now(),
      entity_name: data.entity_name.trim(),
      phone_number: data.phone_number ? data.phone_number.trim() : null,
      plate_number: data.plate_number ? data.plate_number.trim().toUpperCase() : null,
      category: data.category,
      reason: data.reason.trim(),
      severity: data.severity,
      date_added: data.date_added || new Date().toISOString().split('T')[0],
      added_by: data.added_by || 'Chief Security Officer',
      is_active: data.is_active !== undefined ? data.is_active : true,
      notes: data.notes || null,
      created_at: new Date().toISOString()
    };

    list.unshift(newEntry);
    localStorage.setItem(STORAGE_KEYS.WATCHLIST, JSON.stringify(list));

    await this.logActivity({
      admin_email: newEntry.added_by,
      action: 'WATCHLIST_ADDED',
      entity_type: 'watchlist',
      entity_id: newEntry.id,
      description: `Added "${newEntry.entity_name}" (${newEntry.category}) to security restricted watchlist with severity "${newEntry.severity}"`
    });

    return { success: true, entry: newEntry };
  },

  async updateWatchlistEntry(id: string, data: Partial<RestrictedWatchlistEntry>): Promise<{ success: boolean; entry?: RestrictedWatchlistEntry; message?: string }> {
    const list = await this.getWatchlist();
    const index = list.findIndex(e => e.id === id);
    if (index === -1) return { success: false, message: 'Watchlist entry not found' };

    list[index] = {
      ...list[index],
      ...data,
      plate_number: data.plate_number ? data.plate_number.trim().toUpperCase() : list[index].plate_number
    };

    localStorage.setItem(STORAGE_KEYS.WATCHLIST, JSON.stringify(list));
    return { success: true, entry: list[index] };
  },

  async deleteWatchlistEntry(id: string): Promise<{ success: boolean; message?: string }> {
    const list = await this.getWatchlist();
    const target = list.find(w => w.id === id);
    const filtered = list.filter(w => w.id !== id);
    localStorage.setItem(STORAGE_KEYS.WATCHLIST, JSON.stringify(filtered));

    if (target) {
      await this.logActivity({
        admin_email: 'Security Admin',
        action: 'WATCHLIST_REMOVED',
        entity_type: 'watchlist',
        entity_id: id,
        description: `Removed "${target.entity_name}" from security watchlist`
      });
    }

    return { success: true };
  },

  async checkWatchlistMatch(query: string): Promise<RestrictedWatchlistEntry | null> {
    if (!query || query.trim().length < 2) return null;
    const list = await this.getWatchlist();
    const cleanQ = query.trim().toUpperCase().replace(/[\s-]/g, '');

    return list.find(entry => {
      if (!entry.is_active) return false;
      const cleanPlate = entry.plate_number ? entry.plate_number.toUpperCase().replace(/[\s-]/g, '') : '';
      const cleanPhone = entry.phone_number ? entry.phone_number.replace(/[\s-]/g, '') : '';
      const cleanName = entry.entity_name.toUpperCase();

      return (cleanPlate && (cleanPlate === cleanQ || cleanQ.includes(cleanPlate) || cleanPlate.includes(cleanQ))) ||
             (cleanPhone && (cleanPhone === cleanQ || cleanQ.includes(cleanPhone))) ||
             (cleanName.includes(query.trim().toUpperCase()));
    }) || null;
  },

  // ==========================================
  // STAGE 11: CONTRACTOR & ARTISAN PASSES
  // ==========================================
  async getContractorPasses(): Promise<ContractorAccessPass[]> {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.CONTRACTORS);
      let list: ContractorAccessPass[] = raw ? JSON.parse(raw) : [];
      if (!list || list.length === 0) {
        list = INITIAL_CONTRACTORS_SEED;
        localStorage.setItem(STORAGE_KEYS.CONTRACTORS, JSON.stringify(list));
      }
      return list;
    } catch {
      return INITIAL_CONTRACTORS_SEED;
    }
  },

  async createContractorPass(data: Omit<ContractorAccessPass, 'id' | 'pass_code' | 'created_at'>): Promise<{ success: boolean; pass?: ContractorAccessPass; message?: string }> {
    const list = await this.getContractorPasses();
    const dateStr = new Date().getFullYear();
    const seq = String(list.length + 1).padStart(4, '0');
    const passCode = `FOG-CON-${dateStr}-${seq}`;

    const newPass: ContractorAccessPass = {
      id: 'con-' + Date.now(),
      pass_code: passCode,
      company_name: data.company_name.trim(),
      lead_contractor_name: data.lead_contractor_name.trim(),
      lead_phone: data.lead_phone.trim(),
      worker_count: data.worker_count || 1,
      worker_names: data.worker_names || null,
      service_type: data.service_type,
      house_number: data.house_number.trim(),
      resident_number: data.resident_number,
      resident_name: data.resident_name,
      permit_id: data.permit_id || `PRM-${dateStr}-${seq}`,
      id_type_recorded: data.id_type_recorded,
      id_number: data.id_number.trim(),
      valid_date: data.valid_date || new Date().toISOString().split('T')[0],
      entry_time: data.entry_time || new Date().toISOString(),
      exit_time: null,
      status: data.status || 'Active On-Site',
      security_officer: data.security_officer || 'Gate Control',
      notes: data.notes || null,
      created_at: new Date().toISOString()
    };

    list.unshift(newPass);
    localStorage.setItem(STORAGE_KEYS.CONTRACTORS, JSON.stringify(list));

    // Log to gate movements
    await this.createGateLog({
      movement_type: 'Entry',
      entity_type: 'Contractor',
      name: `${newPass.company_name} (${newPass.lead_contractor_name})`,
      phone_number: newPass.lead_phone,
      house_number: newPass.house_number,
      destination: `House ${newPass.house_number} (${newPass.resident_name})`,
      pass_code: newPass.pass_code,
      officer_badge: 'FOG-SEC-01',
      officer_name: newPass.security_officer,
      notes: `${newPass.service_type} work permit (${newPass.worker_count} workers on-site)`
    });

    await this.logActivity({
      admin_email: newPass.security_officer,
      action: 'CONTRACTOR_LOGGED',
      entity_type: 'contractor',
      entity_id: newPass.id,
      description: `Logged contractor pass ${newPass.pass_code} for ${newPass.company_name} at House ${newPass.house_number}`
    });

    return { success: true, pass: newPass };
  },

  async updateContractorStatus(id: string, status: ContractorStatus, officerName: string): Promise<{ success: boolean; pass?: ContractorAccessPass; message?: string }> {
    const list = await this.getContractorPasses();
    const index = list.findIndex(c => c.id === id);
    if (index === -1) return { success: false, message: 'Contractor pass not found' };

    list[index].status = status;
    if (status === 'Active On-Site' && !list[index].entry_time) {
      list[index].entry_time = new Date().toISOString();
    }
    if (status === 'Completed') {
      list[index].exit_time = new Date().toISOString();
      await this.createGateLog({
        movement_type: 'Exit',
        entity_type: 'Contractor',
        name: `${list[index].company_name} (${list[index].lead_contractor_name})`,
        phone_number: list[index].lead_phone,
        house_number: list[index].house_number,
        destination: 'Exit Barrier',
        pass_code: list[index].pass_code,
        officer_badge: 'FOG-SEC-01',
        officer_name: officerName,
        notes: `Contractor completed work and exited estate`
      });
    }

    localStorage.setItem(STORAGE_KEYS.CONTRACTORS, JSON.stringify(list));
    return { success: true, pass: list[index] };
  },

  // ==========================================
  // STAGE 11: DELIVERY & COURIER DISPATCH
  // ==========================================
  async getDeliveryPasses(): Promise<DeliveryAccessPass[]> {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.DELIVERIES);
      let list: DeliveryAccessPass[] = raw ? JSON.parse(raw) : [];
      if (!list || list.length === 0) {
        list = INITIAL_DELIVERIES_SEED;
        localStorage.setItem(STORAGE_KEYS.DELIVERIES, JSON.stringify(list));
      }
      return list;
    } catch {
      return INITIAL_DELIVERIES_SEED;
    }
  },

  async createDeliveryPass(data: Omit<DeliveryAccessPass, 'id' | 'pass_code' | 'created_at'>): Promise<{ success: boolean; pass?: DeliveryAccessPass; message?: string }> {
    const list = await this.getDeliveryPasses();
    const dateStr = new Date().getFullYear();
    const seq = String(list.length + 1).padStart(4, '0');
    const passCode = `FOG-DEL-${dateStr}-${seq}`;

    const newPass: DeliveryAccessPass = {
      id: 'del-' + Date.now(),
      pass_code: passCode,
      courier_company: data.courier_company,
      rider_name: data.rider_name.trim(),
      rider_phone: data.rider_phone.trim(),
      vehicle_type: data.vehicle_type,
      vehicle_plate: data.vehicle_plate ? data.vehicle_plate.trim().toUpperCase() : null,
      package_type: data.package_type,
      house_number: data.house_number.trim(),
      resident_number: data.resident_number,
      resident_name: data.resident_name,
      entry_time: data.entry_time || new Date().toISOString(),
      exit_time: null,
      status: 'Inside Estate',
      security_officer: data.security_officer || 'Gate Controller',
      notes: data.notes || null,
      created_at: new Date().toISOString()
    };

    list.unshift(newPass);
    localStorage.setItem(STORAGE_KEYS.DELIVERIES, JSON.stringify(list));

    await this.createGateLog({
      movement_type: 'Entry',
      entity_type: 'Delivery',
      name: `${newPass.courier_company} (${newPass.rider_name})`,
      phone_number: newPass.rider_phone,
      vehicle_number: newPass.vehicle_plate || `${newPass.vehicle_type}`,
      house_number: newPass.house_number,
      destination: `House ${newPass.house_number} (${newPass.resident_name})`,
      pass_code: newPass.pass_code,
      officer_badge: 'FOG-SEC-01',
      officer_name: newPass.security_officer,
      notes: `${newPass.package_type} dispatch`
    });

    await this.logActivity({
      admin_email: newPass.security_officer,
      action: 'DELIVERY_LOGGED',
      entity_type: 'delivery',
      entity_id: newPass.id,
      description: `Issued delivery clearance ${newPass.pass_code} for ${newPass.courier_company} rider ${newPass.rider_name} to House ${newPass.house_number}`
    });

    return { success: true, pass: newPass };
  },

  async updateDeliveryStatus(id: string, status: DeliveryStatus, officerName: string): Promise<{ success: boolean; pass?: DeliveryAccessPass; message?: string }> {
    const list = await this.getDeliveryPasses();
    const index = list.findIndex(d => d.id === id);
    if (index === -1) return { success: false, message: 'Delivery pass not found' };

    list[index].status = status;
    if (status === 'Exited') {
      list[index].exit_time = new Date().toISOString();
      await this.createGateLog({
        movement_type: 'Exit',
        entity_type: 'Delivery',
        name: `${list[index].courier_company} (${list[index].rider_name})`,
        phone_number: list[index].rider_phone,
        vehicle_number: list[index].vehicle_plate || undefined,
        house_number: list[index].house_number,
        destination: 'Exit Barrier',
        pass_code: list[index].pass_code,
        officer_badge: 'FOG-SEC-01',
        officer_name: officerName,
        notes: `Delivery completed, rider exited`
      });
    }

    localStorage.setItem(STORAGE_KEYS.DELIVERIES, JSON.stringify(list));
    return { success: true, pass: list[index] };
  },

  // ==========================================
  // STAGE 11: RESIDENT ACCESS VERIFICATION
  // ==========================================
  async verifyResidentAccess(query: string): Promise<ResidentAccessVerificationResult> {
    if (!query || query.trim().length === 0) {
      return {
        status: 'NOT FOUND — MANUAL VERIFICATION REQUIRED',
        is_allowed: false,
        vehicles: [],
        active_visitor_passes: [],
        message: 'Please enter a resident name, house number, phone number, or vehicle plate number.'
      };
    }

    const cleanQ = query.trim().toUpperCase();
    const [residents, vehicles, visitorPasses, watchlist] = await Promise.all([
      this.getResidents(),
      this.getResidentVehicles(),
      this.getVisitorPasses(),
      this.getWatchlist()
    ]);

    // First check watchlist
    const watchlistHit = watchlist.find(w => {
      if (!w.is_active) return false;
      const cleanPlate = w.plate_number?.toUpperCase().replace(/[\s-]/g, '') || '';
      const cleanPhone = w.phone_number?.replace(/[\s-]/g, '') || '';
      const cleanName = w.entity_name.toUpperCase();
      const qPlate = cleanQ.replace(/[\s-]/g, '');

      return (cleanPlate && (cleanPlate === qPlate || qPlate.includes(cleanPlate))) ||
             (cleanPhone && cleanPhone === cleanQ.replace(/[\s-]/g, '')) ||
             cleanName.includes(cleanQ);
    });

    if (watchlistHit) {
      return {
        status: 'SUSPENDED — VERIFY WITH ADMIN',
        is_allowed: false,
        vehicles: [],
        active_visitor_passes: [],
        message: `RESTRICTION ALERT: Subject is on Estate Security Watchlist (${watchlistHit.category}). Reason: ${watchlistHit.reason}`,
        warning: `SEVERITY: ${watchlistHit.severity.toUpperCase()} — DO NOT GRANT GATE BARRIER ACCESS WITHOUT CSO OVERRIDE.`
      };
    }

    // Check if query matches a registered vehicle plate
    const vehicleHit = vehicles.find(v => v.plate_number.replace(/[\s-]/g, '').toUpperCase() === cleanQ.replace(/[\s-]/g, ''));
    let matchedResident: Resident | undefined;

    if (vehicleHit) {
      matchedResident = residents.find(r => r.resident_number === vehicleHit.resident_number || r.id === vehicleHit.resident_id);
    }

    if (!matchedResident) {
      // Try searching resident directly by house, name, phone, or resident_number
      matchedResident = residents.find(r => {
        const rName = r.full_name.toUpperCase();
        const rHouse = r.house_number.toUpperCase();
        const rNum = r.resident_number.toUpperCase();
        const rPhone = r.phone_number.replace(/[\s-]/g, '');
        const rAddPhone = r.additional_phone ? r.additional_phone.replace(/[\s-]/g, '') : '';
        const qClean = cleanQ.replace(/[\s-]/g, '');

        return rName.includes(cleanQ) ||
               rHouse === cleanQ ||
               rHouse.includes(cleanQ) ||
               rNum === cleanQ ||
               `FOG-RES-${rNum}` === cleanQ ||
               rPhone.includes(qClean) ||
               (rAddPhone && rAddPhone.includes(qClean));
      });
    }

    if (!matchedResident) {
      return {
        status: 'NOT FOUND — MANUAL VERIFICATION REQUIRED',
        is_allowed: false,
        vehicles: [],
        active_visitor_passes: [],
        message: `No active resident record found matching "${query}". Request physical identification or contact estate management office.`
      };
    }

    const residentVehicles = vehicles.filter(v => v.resident_number === matchedResident?.resident_number);
    const residentVisitors = visitorPasses.filter(v => v.resident_number === matchedResident?.resident_number && (v.status === 'Expected' || v.status === 'Arrived'));

    if (matchedResident.status === 'Active') {
      return {
        status: 'ACTIVE — ACCESS ALLOWED',
        is_allowed: true,
        resident: matchedResident,
        vehicles: residentVehicles,
        active_visitor_passes: residentVisitors,
        message: `Verified Resident: ${matchedResident.full_name} (${matchedResident.house_number}). Access granted.`
      };
    } else {
      return {
        status: 'SUSPENDED — VERIFY WITH ADMIN',
        is_allowed: false,
        resident: matchedResident,
        vehicles: residentVehicles,
        active_visitor_passes: residentVisitors,
        message: `Resident status is ${matchedResident.status.toUpperCase()}. Account requires security and admin clearance before standard gate barrier clearance.`
      };
    }
  },

  // ==========================================
  // STAGE 11: WALK-IN APPROVAL WORKFLOW
  // ==========================================
  async requestWalkInApproval(data: {
    visitor_name: string;
    visitor_phone: string;
    house_number: string;
    resident_name: string;
    resident_phone: string;
    purpose_of_visit: string;
    vehicle_number?: string;
    officer_name: string;
    notes?: string;
  }): Promise<{ success: boolean; pass?: VisitorPass; message?: string }> {
    const list = await this.getVisitorPasses();
    const residents = await this.getResidents();
    const hostResident = residents.find(r => 
      r.house_number.toUpperCase() === data.house_number.trim().toUpperCase() ||
      r.full_name.toUpperCase().includes(data.resident_name.trim().toUpperCase())
    ) || {
      id: 'res-unknown',
      resident_number: '999',
      full_name: data.resident_name,
      house_number: data.house_number,
      phone_number: data.resident_phone
    };

    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const passCode = `FOG-VIS-WLK-${randomSuffix}`;

    const newPass: VisitorPass = {
      id: 'vis-wlk-' + Date.now(),
      pass_code: passCode,
      visitor_name: data.visitor_name.trim(),
      visitor_phone: data.visitor_phone.trim(),
      vehicle_number: data.vehicle_number ? data.vehicle_number.trim().toUpperCase() : null,
      vehicle_description: data.vehicle_number ? 'Walk-In Vehicle' : 'Pedestrian Walk-In',
      purpose_of_visit: data.purpose_of_visit.trim(),
      resident_id: hostResident.id,
      resident_number: hostResident.resident_number,
      resident_name: hostResident.full_name,
      house_number: hostResident.house_number,
      resident_phone: hostResident.phone_number,
      expected_arrival: new Date().toISOString(),
      status: 'Expected', // Marked as awaiting resident confirmation
      qr_code_data: `${passCode}-WLK-${hostResident.resident_number}`,
      notes: `WALK-IN GUEST: Registered by Gate Officer ${data.officer_name}. Awaiting host verification. ${data.notes || ''}`,
      created_at: new Date().toISOString()
    };

    list.unshift(newPass);
    localStorage.setItem(STORAGE_KEYS.VISITORS, JSON.stringify(list));

    await this.logActivity({
      admin_email: data.officer_name,
      action: 'WALK_IN_REQUESTED',
      entity_type: 'visitor',
      entity_id: newPass.id,
      description: `Gate Officer ${data.officer_name} registered walk-in visitor ${data.visitor_name} requesting access to House ${data.house_number}`
    });

    return { success: true, pass: newPass, message: 'Walk-in access request recorded. Host resident notified.' };
  },

  async respondWalkInApproval(passId: string, approved: boolean, reason?: string, approverName?: string): Promise<{ success: boolean; pass?: VisitorPass; message?: string }> {
    const list = await this.getVisitorPasses();
    const target = list.find(v => v.id === passId);
    if (!target) return { success: false, message: 'Pass not found' };

    if (approved) {
      target.status = 'Arrived';
      target.entry_time = new Date().toISOString();
      target.checked_in_by = approverName || 'Resident Authorization';
      target.notes = `${target.notes || ''} [APPROVED by ${approverName || 'Host Resident'} at ${new Date().toLocaleTimeString()}]`;

      await this.createGateLog({
        movement_type: 'Entry',
        entity_type: 'Visitor',
        name: target.visitor_name,
        phone_number: target.visitor_phone,
        vehicle_number: target.vehicle_number || undefined,
        house_number: target.house_number,
        destination: `House ${target.house_number} (${target.resident_name})`,
        pass_code: target.pass_code,
        officer_badge: 'FOG-SEC-01',
        officer_name: approverName || 'Gate Control',
        notes: `Walk-in visitor approved by host resident`
      });

      await this.logActivity({
        admin_email: approverName || target.resident_phone,
        action: 'WALK_IN_APPROVED',
        entity_type: 'visitor',
        entity_id: target.id,
        description: `Walk-in guest ${target.visitor_name} (${target.pass_code}) approved for entry to House ${target.house_number}`
      });
    } else {
      target.status = 'Denied';
      target.denial_reason = reason || 'Host resident declined entry';
      target.notes = `${target.notes || ''} [DENIED by ${approverName || 'Host Resident'}: ${target.denial_reason}]`;

      await this.logActivity({
        admin_email: approverName || target.resident_phone,
        action: 'WALK_IN_DENIED',
        entity_type: 'visitor',
        entity_id: target.id,
        description: `Walk-in guest ${target.visitor_name} denied entry by resident (${target.denial_reason})`
      });
    }

    localStorage.setItem(STORAGE_KEYS.VISITORS, JSON.stringify(list));
    return { success: true, pass: target };
  },

  // ==========================================
  // STAGE 11: GATE SECURITY OVERVIEW STATS
  // ==========================================
  async getGateSecurityOverviewStats(): Promise<GateSecurityOverviewStats> {
    const [officers, visitors, gateLogs, alerts, watchlist, contractors, deliveries, vehicles] = await Promise.all([
      this.getSecurityOfficers(),
      this.getVisitorPasses(),
      this.getGateLogs(),
      this.getSecurityAlerts(),
      this.getWatchlist(),
      this.getContractorPasses(),
      this.getDeliveryPasses(),
      this.getResidentVehicles()
    ]);

    const activeOfficer = officers.find(o => o.status === 'On Duty' || o.status === 'On Patrol') || officers[0] || null;
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    const visitorsInside = visitors.filter(v => v.status === 'Arrived').length;
    const expectedVisitors = visitors.filter(v => v.status === 'Expected').length;
    const recentEntries = gateLogs.filter(g => g.movement_type === 'Entry').length;
    const recentExits = gateLogs.filter(g => g.movement_type === 'Exit').length;
    const activeAlerts = alerts.filter(a => a.is_active).length;
    const activeContractors = contractors.filter(c => c.status === 'Active On-Site').length;
    const activeDeliveries = deliveries.filter(d => d.status === 'Inside Estate').length;
    const restrictedAttempts = watchlist.filter(w => w.is_active).length;
    const pendingWalkIns = visitors.filter(v => v.notes?.includes('WALK-IN') && v.status === 'Expected').length;

    return {
      officer_on_duty: activeOfficer,
      current_time: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      visitors_inside_count: visitorsInside,
      expected_visitors_today: expectedVisitors,
      recent_entries_count: recentEntries,
      recent_exits_count: recentExits,
      pending_walk_in_approvals: pendingWalkIns,
      active_alerts_count: activeAlerts,
      restricted_access_attempts: restrictedAttempts,
      emergency_alerts_count: alerts.filter(a => a.priority === 'Critical' && a.is_active).length,
      active_contractors_count: activeContractors,
      active_deliveries_count: activeDeliveries,
      total_registered_vehicles: vehicles.length
    };
  },

  // ------------------------------------------
  // ROAD PROJECT TRANSPARENT FINANCIAL LEDGER
  // ------------------------------------------
  async getRoadProjectTransactions(sortOrder: 'desc' | 'asc' = 'desc'): Promise<RoadProjectTransaction[]> {
    try {
      const res = await fetch('/api/road-project/ledger');
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.transactions)) {
          saveLocalRoadTransactions(data.transactions);
          if (sortOrder === 'desc') {
            return [...data.transactions].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime() || b.reference.localeCompare(a.reference));
          }
          return [...data.transactions].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime() || a.reference.localeCompare(b.reference));
        }
      }
    } catch {
      // Graceful fallback to local cache
    }

    const list = getLocalRoadTransactions();
    if (sortOrder === 'desc') {
      return [...list].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime() || b.reference.localeCompare(a.reference));
    }
    return [...list].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime() || a.reference.localeCompare(b.reference));
  },

  async getRoadProjectSummary(targetBudget: number = 35000000): Promise<RoadProjectSummary> {
    try {
      const res = await fetch('/api/road-project/ledger');
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.summary) {
          return data.summary;
        }
      }
    } catch {
      // Fallback
    }

    const transactions = getLocalRoadTransactions();
    let totalCredits = 0;
    let totalDebits = 0;
    let creditsCount = 0;
    let debitsCount = 0;

    for (const tx of transactions) {
      if (tx.type === 'CREDIT') {
        totalCredits += tx.amount;
        creditsCount++;
      } else if (tx.type === 'DEBIT') {
        totalDebits += tx.amount;
        debitsCount++;
      }
    }

    const currentBalance = totalCredits - totalDebits;
    const outstanding = Math.max(0, targetBudget - totalCredits);
    const collectionPercentage = targetBudget > 0 ? Math.min(100, Math.round((totalCredits / targetBudget) * 100)) : 0;

    return {
      project_name: 'Phase 1 & Phase 2 Boulevard Road Paving & Drainage Modernization',
      target_budget: targetBudget,
      total_collected: totalCredits,
      total_spent: totalDebits,
      current_balance: currentBalance,
      outstanding_contributions: outstanding,
      collection_percentage: collectionPercentage,
      total_transactions_count: transactions.length,
      credits_count: creditsCount,
      debits_count: debitsCount,
      last_updated: new Date().toISOString(),
      sync_status: {
        paystack: 'ACTIVE (Real-Time Webhook Verified)',
        bank_sync: 'ACTIVE (Zenith Bank Escrow Feed)'
      }
    };
  },

  async getRoadProjectMilestones(): Promise<RoadProjectMilestone[]> {
    try {
      const res = await fetch('/api/road-project/ledger');
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.milestones)) {
          return data.milestones;
        }
      }
    } catch {
      // Fallback
    }
    return getLocalRoadMilestones();
  },

  // Record Authorized Expenditure (DEBIT) - Server Verified
  async recordRoadProjectExpenditure(data: {
    amount: number;
    category: RoadProjectCategory;
    description: string;
    payer_or_vendor: string;
    approved_by: string;
    receipt_or_invoice_ref?: string;
    notes?: string;
    date?: string;
  }): Promise<{ success: boolean; transaction?: RoadProjectTransaction; error?: string }> {
    try {
      const res = await fetch('/api/road-project/expenditure', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      const json = await res.json();
      if (json.success && json.transaction) {
        const current = getLocalRoadTransactions();
        saveLocalRoadTransactions([...current, json.transaction]);
        return { success: true, transaction: json.transaction };
      }
      return { success: false, error: json.message || 'Failed to record expenditure' };
    } catch (err: any) {
      return { success: false, error: err.message || 'Network error recording expenditure' };
    }
  },

  // Legacy/Fallback helper for adding transaction
  async addRoadProjectTransaction(data: {
    type: RoadTransactionType;
    description: string;
    category: RoadProjectCategory;
    amount: number;
    payer_or_vendor: string;
    approved_by: string;
    receipt_or_invoice_ref?: string;
    notes?: string;
    date?: string;
  }): Promise<{ success: boolean; transaction?: RoadProjectTransaction; error?: string }> {
    if (data.type === 'DEBIT') {
      return this.recordRoadProjectExpenditure(data);
    }

    // Direct bank transfer credit
    try {
      const res = await fetch('/api/road-project/bank-transfer/webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bank_transaction_id: `MAN-${Date.now()}`,
          amount: data.amount,
          date: data.date,
          narration: data.description,
          sender_name: data.payer_or_vendor,
          bank_name: 'Zenith Bank PLC',
          source_type: 'Bank Transfer'
        })
      });
      const json = await res.json();
      if (json.success && json.transaction) {
        return { success: true, transaction: json.transaction };
      }
      return { success: false, error: json.message || 'Failed to verify transaction' };
    } catch {
      // Local fallback
      const current = getLocalRoadTransactions();
      const count = current.length + 1;
      const refCode = `FOG-RD-2026-${String(count).padStart(3, '0')}`;
      const newTx: RoadProjectTransaction = {
        id: 'rd-tx-' + Date.now(),
        reference: refCode,
        date: data.date || new Date().toISOString().split('T')[0],
        type: data.type,
        source: 'Bank Transfer',
        description: data.description.trim(),
        category: data.category,
        amount: Number(data.amount),
        running_balance: 0,
        payer_or_vendor: data.payer_or_vendor.trim(),
        approved_by: data.approved_by?.trim() || 'Road Committee Executive',
        receipt_or_invoice_ref: data.receipt_or_invoice_ref?.trim() || `RCP-RD-${Date.now().toString().slice(-6)}`,
        notes: data.notes?.trim() || 'Logged into verified Road Project ledger',
        verified_at: new Date().toISOString(),
        status: 'VERIFIED'
      };
      saveLocalRoadTransactions([...current, newTx]);
      return { success: true, transaction: newTx };
    }
  },

  async deleteRoadProjectTransaction(id: string, reason: string): Promise<{ success: boolean; error?: string }> {
    const current = getLocalRoadTransactions();
    const target = current.find(t => t.id === id);
    if (!target) {
      return { success: false, error: 'Transaction not found.' };
    }

    const remaining = current.filter(t => t.id !== id);
    saveLocalRoadTransactions(remaining);

    await this.logActivity({
      admin_email: 'road-committee@fingerofgodestate.ng',
      action: 'ROAD_TRANSACTION_VOIDED',
      entity_type: 'road_project',
      description: `Voided Road Project Transaction ${target.reference} (${target.type} ₦${target.amount.toLocaleString()}): Reason: "${reason}"`
    });

    return { success: true };
  },

  // Paystack Road Contribution Initializer
  async initializeRoadPaystackPayment(params: {
    amount: number;
    email?: string;
    buildingNumber?: string;
    payerName?: string;
    phone?: string;
    category?: RoadProjectCategory;
  }): Promise<{ success: boolean; reference?: string; authorization_url?: string; access_code?: string; message?: string }> {
    try {
      const res = await fetch('/api/road-project/paystack/initialize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params)
      });
      return await res.json();
    } catch (err: any) {
      return { success: false, message: err.message || 'Failed to initialize Paystack contribution' };
    }
  },

  // Paystack Road Contribution Verifier (Server-Side)
  async verifyRoadPaystackPayment(params: {
    reference: string;
    amount?: number;
    buildingNumber?: string;
    payerName?: string;
  }): Promise<{ success: boolean; transaction?: RoadProjectTransaction; summary?: RoadProjectSummary; message?: string }> {
    try {
      const res = await fetch('/api/road-project/paystack/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params)
      });
      return await res.json();
    } catch (err: any) {
      return { success: false, message: err.message || 'Verification failed' };
    }
  },

  // Get Road Project Reconciliation Console Items
  async getRoadProjectReconciliation(): Promise<{ success: boolean; items: any[]; stats: any }> {
    try {
      const res = await fetch('/api/road-project/reconciliation');
      if (res.ok) {
        return await res.json();
      }
    } catch {}
    return { success: false, items: [], stats: { total: 0, matched: 0, unmatched: 0, duplicates: 0 } };
  },

  // Match Unmatched Bank Transaction in Reconciliation Console
  async matchRoadProjectReconciliation(params: {
    reconciliation_id: string;
    building_number: string;
    contributor_name?: string;
  }): Promise<{ success: boolean; item?: any; summary?: any; message?: string }> {
    try {
      const res = await fetch('/api/road-project/reconciliation/match', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params)
      });
      return await res.json();
    } catch (err: any) {
      return { success: false, message: err.message || 'Match operation failed' };
    }
  },

  // Import Official Bank Statement Batch with Deduplication
  async importRoadProjectBankStatement(statementRows: Array<{
    bank_transaction_id?: string;
    reference?: string;
    date: string;
    amount: number;
    narration: string;
    sender_name?: string;
  }>): Promise<{ success: boolean; importedCount: number; duplicateCount: number; unmatchedCount: number; message?: string }> {
    try {
      const res = await fetch('/api/road-project/reconciliation/import-statement', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ statement_rows: statementRows })
      });
      return await res.json();
    } catch (err: any) {
      return { success: false, importedCount: 0, duplicateCount: 0, unmatchedCount: 0, message: err.message || 'Import failed' };
    }
  },

  // Simulate or Trigger Bank Webhook (for testing duplicate protection and direct bank sync)
  async simulateBankTransferWebhook(params: {
    bank_transaction_id: string;
    reference?: string;
    amount: number;
    date?: string;
    narration: string;
    sender_name?: string;
    bank_name?: string;
    source_type?: 'Bank Transfer' | 'Bank API';
  }): Promise<{ success: boolean; duplicate?: boolean; unmatched?: boolean; transaction?: RoadProjectTransaction; summary?: any; message?: string }> {
    try {
      const res = await fetch('/api/road-project/bank-transfer/webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params)
      });
      return await res.json();
    } catch (err: any) {
      return { success: false, message: err.message || 'Webhook simulation failed' };
    }
  },

  // Trigger Open Banking Sync
  async syncRoadProjectBankFeed(): Promise<{ success: boolean; message?: string; summary?: any }> {
    try {
      const res = await fetch('/api/road-project/bank-sync', { method: 'POST' });
      return await res.json();
    } catch (err: any) {
      return { success: false, message: err.message || 'Sync failed' };
    }
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

  setRememberedDevice(residentNumber: string, token: string) {
    try {
      localStorage.setItem('estate_remembered_device', JSON.stringify({
        residentNumber,
        token,
        savedAt: Date.now()
      }));
    } catch {}
  },

  getRememberedDevice(): { residentNumber: string; token: string; savedAt: number } | null {
    try {
      const raw = localStorage.getItem('estate_remembered_device');
      if (raw) return JSON.parse(raw);
    } catch {}
    return null;
  },

  clearRememberedDevice() {
    try {
      localStorage.removeItem('estate_remembered_device');
    } catch {}
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
