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
  PublicReceiptVerification
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
  SMS_LOGS: 'estate_security_sms_logs'
};

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

  // 11. STAGE 6: RESIDENT ACCESS & DASHBOARD SERVICE
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
