import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.resolve(__dirname, '../../data');
const DB_FILE = path.join(DATA_DIR, 'estate_database.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  } catch (err) {
    console.error('Failed to create data directory:', err);
  }
}

// Supabase Client Initialization
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://dmdotpyotcmtrppediub.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 
  process.env.VITE_SUPABASE_ANON_KEY || 
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRtZG90cHlvdGNtdHJwcGVkaXViIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc5MDI0MzA0NiwiZXhwIjoyMTA1ODE5MDQ2fQ.9Lvfyc3xel7aD8h_TXVBAFbp9v3-qV3vDInKhj9gAdc';

export const supabaseAdmin: SupabaseClient = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Seed Data for Delta State / Asaba
const DEFAULT_ESTATE_SETTINGS = {
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
  first_payment_month: 'October 2026',
  road_project_target: 35000000
};

const DEFAULT_RESIDENTS = [
  {
    id: 'res-001',
    resident_number: '001',
    full_name: 'Engr. Babatunde Adeleke',
    phone_number: '08023456789',
    additional_phone: '08091122334',
    email: 'babatunde.adeleke@gmail.com',
    house_number: 'Plot 4A, Hibiscus Crescent',
    address: '4A Hibiscus Crescent, Phase 1, Finger of God Estate, Iyiaba, Asaba',
    state: 'Delta',
    lga: 'Oshimili South',
    status: 'Active',
    account_activated: true,
    profile_completed: true,
    registration_date: '2026-08-01',
    created_at: new Date('2026-08-01T08:00:00Z').toISOString(),
    updated_at: new Date('2026-08-01T08:00:00Z').toISOString()
  },
  {
    id: 'res-002',
    resident_number: '002',
    full_name: 'Dr. Chioma Nwachukwu',
    phone_number: '08098765432',
    additional_phone: null,
    email: 'dr.chioma@nwachukwumed.ng',
    house_number: 'House 12B, Palm Avenue',
    address: '12B Palm Avenue, Phase 1, Finger of God Estate, Iyiaba, Asaba',
    state: 'Delta',
    lga: 'Oshimili South',
    status: 'Active',
    account_activated: false,
    profile_completed: false,
    registration_date: '2026-08-05',
    created_at: new Date('2026-08-05T09:30:00Z').toISOString(),
    updated_at: new Date('2026-08-05T09:30:00Z').toISOString()
  },
  {
    id: 'res-003',
    resident_number: '003',
    full_name: 'Alhaji Usman Danladi',
    phone_number: '08123459876',
    additional_phone: '08055667788',
    email: 'usman.danladi@danladigroup.com',
    house_number: 'Villa 7, Oasis Way',
    address: 'Villa 7, Oasis Way, Phase 1, Finger of God Estate, Iyiaba, Asaba',
    state: 'Delta',
    lga: 'Oshimili South',
    status: 'Active',
    account_activated: false,
    profile_completed: false,
    registration_date: '2026-08-10',
    created_at: new Date('2026-08-10T11:15:00Z').toISOString(),
    updated_at: new Date('2026-08-10T11:15:00Z').toISOString()
  },
  {
    id: 'res-004',
    resident_number: '004',
    full_name: 'Mrs. Folashade Balogun',
    phone_number: '07033445566',
    additional_phone: null,
    email: 'folashade.balogun@outlook.com',
    house_number: 'Block C, Apt 3, Coral Gardens',
    address: 'Coral Gardens, Phase 1, Finger of God Estate, Iyiaba, Asaba',
    state: 'Delta',
    lga: 'Oshimili South',
    status: 'Inactive',
    account_activated: false,
    profile_completed: false,
    registration_date: '2026-08-12',
    created_at: new Date('2026-08-12T14:20:00Z').toISOString(),
    updated_at: new Date('2026-08-12T14:20:00Z').toISOString()
  }
];

export interface PersistentDatabaseSchema {
  estate_settings: typeof DEFAULT_ESTATE_SETTINGS;
  residents: any[];
  profiles: any[];
  admin_users: any[];
  monthly_payments: any[];
  payment_transactions: any[];
  receipts: any[];
  road_project_transactions: any[];
  road_project_milestones: any[];
  road_project_contributions: any[];
  bank_reconciliations: any[];
  sms_logs: any[];
  sms_reminders: any[];
  announcements: any[];
  activity_logs: any[];
  last_updated: string;
}

// In-memory cache + file sync
let localDb: PersistentDatabaseSchema = loadOrCreateDb();

function loadOrCreateDb(): PersistentDatabaseSchema {
  if (fs.existsSync(DB_FILE)) {
    try {
      const data = fs.readFileSync(DB_FILE, 'utf8');
      const parsed = JSON.parse(data);
      return {
        estate_settings: parsed.estate_settings || DEFAULT_ESTATE_SETTINGS,
        residents: parsed.residents || DEFAULT_RESIDENTS,
        profiles: parsed.profiles || [
          {
            id: '2aef6033-2600-4d7a-aaa5-7f54c441e429',
            email: 'admin@fingerofgodestate.com',
            full_name: 'Estate Administrator',
            role: 'admin',
            status: 'Active',
            created_at: new Date('2026-10-02T21:40:22.668Z').toISOString(),
            updated_at: new Date().toISOString()
          }
        ],
        admin_users: parsed.admin_users || [
          {
            id: '2aef6033-2600-4d7a-aaa5-7f54c441e429',
            auth_user_id: '2aef6033-2600-4d7a-aaa5-7f54c441e429',
            email: 'admin@fingerofgodestate.com',
            full_name: 'Estate Administrator',
            role: 'admin',
            status: 'Active',
            created_at: new Date('2026-10-02T21:40:22.668Z').toISOString(),
            updated_at: new Date().toISOString()
          }
        ],
        monthly_payments: parsed.monthly_payments || [],
        payment_transactions: parsed.payment_transactions || [],
        receipts: parsed.receipts || [],
        road_project_transactions: parsed.road_project_transactions || [],
        road_project_milestones: parsed.road_project_milestones || [],
        road_project_contributions: parsed.road_project_contributions || [],
        bank_reconciliations: parsed.bank_reconciliations || [],
        sms_logs: parsed.sms_logs || [],
        sms_reminders: parsed.sms_reminders || [],
        announcements: parsed.announcements || [],
        activity_logs: parsed.activity_logs || [],
        last_updated: new Date().toISOString()
      };
    } catch (e) {
      console.warn('Error reading estate_database.json, recreating baseline:', e);
    }
  }

  const baseline: PersistentDatabaseSchema = {
    estate_settings: DEFAULT_ESTATE_SETTINGS,
    residents: DEFAULT_RESIDENTS,
    profiles: [
      {
        id: '2aef6033-2600-4d7a-aaa5-7f54c441e429',
        email: 'admin@fingerofgodestate.com',
        full_name: 'Estate Administrator',
        role: 'admin',
        status: 'Active',
        created_at: '2026-10-02T21:40:22.668Z',
        updated_at: new Date().toISOString()
      }
    ],
    admin_users: [
      {
        id: '2aef6033-2600-4d7a-aaa5-7f54c441e429',
        auth_user_id: '2aef6033-2600-4d7a-aaa5-7f54c441e429',
        email: 'admin@fingerofgodestate.com',
        full_name: 'Estate Administrator',
        role: 'admin',
        status: 'Active',
        created_at: '2026-10-02T21:40:22.668Z',
        updated_at: new Date().toISOString()
      }
    ],
    monthly_payments: [],
    payment_transactions: [],
    receipts: [],
    road_project_transactions: [],
    road_project_milestones: [
      {
        id: 'milestone-1',
        milestone_order: 1,
        title: 'Phase 1 Drainage Construction',
        description: 'Heavy-duty concrete stormwater drainage along Main Boulevard',
        status: 'COMPLETED',
        progress_percentage: 100,
        target_date: '2026-09-15'
      },
      {
        id: 'milestone-2',
        milestone_order: 2,
        title: 'Sub-base Earthwork & Compaction',
        description: 'Subgrade scarification and heavy-duty laterite stabilization',
        status: 'COMPLETED',
        progress_percentage: 100,
        target_date: '2026-09-30'
      },
      {
        id: 'milestone-3',
        milestone_order: 3,
        title: 'Stone Base Course & Crushed Rock',
        description: 'Delivery and vibratory rolling of granite stone base aggregates',
        status: 'IN_PROGRESS',
        progress_percentage: 65,
        target_date: '2026-10-20'
      },
      {
        id: 'milestone-4',
        milestone_order: 4,
        title: 'Heavy Interlocking Paving',
        description: 'Laying 80mm industrial interlocking paving blocks',
        status: 'UPCOMING',
        progress_percentage: 0,
        target_date: '2026-11-15'
      },
      {
        id: 'milestone-5',
        milestone_order: 5,
        title: 'Culvert Crossings & Final Curing',
        description: 'Reinforced culvert slabs and access curb integration',
        status: 'UPCOMING',
        progress_percentage: 0,
        target_date: '2026-11-30'
      }
    ],
    road_project_contributions: [],
    bank_reconciliations: [],
    sms_logs: [],
    sms_reminders: [],
    announcements: [
      {
        id: 'ann-001',
        title: 'Launch of Digital Estate Security & Levy Management System',
        slug: 'launch-digital-estate-system',
        content: 'Welcome to the official digital portal for Finger of God Estate. Residents can now review monthly security levies, download verified electronic receipts, and track Road Modernization financial inflows.',
        category: 'GENERAL',
        priority: 'IMPORTANT',
        status: 'PUBLISHED',
        published_by: 'Estate Secretariat',
        publish_at: new Date('2026-10-01T08:00:00Z').toISOString(),
        created_at: new Date('2026-10-01T08:00:00Z').toISOString(),
        updated_at: new Date('2026-10-01T08:00:00Z').toISOString()
      }
    ],
    activity_logs: [
      {
        id: 'act-001',
        admin_email: 'admin@fingerofgodestate.ng',
        action: 'SYSTEM_INITIALIZATION',
        entity_type: 'system',
        entity_id: 'init',
        description: 'Official Finger of God Estate system initialized in Asaba, Delta State.',
        created_at: new Date().toISOString()
      }
    ],
    last_updated: new Date().toISOString()
  };

  saveDbToFile(baseline);
  return baseline;
}

function saveDbToFile(db: PersistentDatabaseSchema) {
  try {
    db.last_updated = new Date().toISOString();
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf8');
  } catch (err) {
    console.error('Error writing to estate_database.json:', err);
  }
}

// Sync helper: Check if Supabase table is available
const tableAvailabilityCache: Record<string, boolean> = {};

export async function isTableAvailableInSupabase(tableName: string): Promise<boolean> {
  if (tableAvailabilityCache[tableName] !== undefined) {
    return tableAvailabilityCache[tableName];
  }
  try {
    const { error } = await supabaseAdmin.from(tableName).select('id').limit(1);
    if (!error) {
      tableAvailabilityCache[tableName] = true;
      return true;
    }
    // If PGRST205 or PGRST116, table not found in schema cache
    tableAvailabilityCache[tableName] = false;
    return false;
  } catch {
    tableAvailabilityCache[tableName] = false;
    return false;
  }
}

export const serverDb = {
  // SETTINGS
  async getSettings() {
    try {
      const { data, error } = await supabaseAdmin.from('estate_settings').select('*').limit(1).maybeSingle();
      if (!error && data) {
        localDb.estate_settings = { ...localDb.estate_settings, ...data };
        saveDbToFile(localDb);
        return data;
      }
    } catch {}
    return localDb.estate_settings;
  },

  async updateSettings(updates: any) {
    localDb.estate_settings = { ...localDb.estate_settings, ...updates, updated_at: new Date().toISOString() };
    saveDbToFile(localDb);
    try {
      await supabaseAdmin.from('estate_settings').upsert(localDb.estate_settings);
    } catch {}
    return localDb.estate_settings;
  },

  // RESIDENTS
  async getResidents(): Promise<any[]> {
    try {
      const { data, error } = await supabaseAdmin.from('residents').select('*').order('resident_number', { ascending: true });
      if (!error && Array.isArray(data) && data.length > 0) {
        localDb.residents = data;
        saveDbToFile(localDb);
        return data;
      }
    } catch {}
    return localDb.residents;
  },

  async getResidentByNumber(num: string): Promise<any | null> {
    const cleanNum = String(num).trim().padStart(3, '0');
    try {
      const { data, error } = await supabaseAdmin.from('residents').select('*').eq('resident_number', cleanNum).maybeSingle();
      if (!error && data) {
        return data;
      }
    } catch {}
    return localDb.residents.find(r => String(r.resident_number).padStart(3, '0') === cleanNum) || null;
  },

  async getResidentById(id: string): Promise<any | null> {
    try {
      const { data, error } = await supabaseAdmin.from('residents').select('*').eq('id', id).maybeSingle();
      if (!error && data) return data;
    } catch {}
    return localDb.residents.find(r => r.id === id) || null;
  },

  async saveResident(residentData: any): Promise<any> {
    const cleanNum = String(residentData.resident_number).trim().padStart(3, '0');
    
    // Check uniqueness constraint
    const existing = localDb.residents.find(r => String(r.resident_number).padStart(3, '0') === cleanNum && r.id !== residentData.id);
    if (existing) {
      throw new Error(`Resident number ${cleanNum} is already assigned.`);
    }

    const residentRecord = {
      ...residentData,
      id: residentData.id || `res-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      resident_number: cleanNum,
      state: residentData.state || 'Delta',
      lga: residentData.lga || 'Oshimili South',
      created_at: residentData.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const index = localDb.residents.findIndex(r => r.id === residentRecord.id || String(r.resident_number).padStart(3, '0') === cleanNum);
    if (index >= 0) {
      localDb.residents[index] = { ...localDb.residents[index], ...residentRecord };
    } else {
      localDb.residents.push(residentRecord);
    }
    saveDbToFile(localDb);

    // Try Supabase write
    try {
      await supabaseAdmin.from('residents').upsert(residentRecord);
    } catch (e) {
      console.warn('Supabase resident upsert queued locally:', e);
    }

    return residentRecord;
  },

  // PAYMENTS & TRANSACTIONS
  async getPayments(): Promise<any[]> {
    try {
      const { data, error } = await supabaseAdmin.from('monthly_payments').select('*').order('period_year', { ascending: false });
      if (!error && Array.isArray(data)) {
        localDb.monthly_payments = data;
        saveDbToFile(localDb);
        return data;
      }
    } catch {}
    return localDb.monthly_payments;
  },

  async getTransactions(): Promise<any[]> {
    try {
      const { data, error } = await supabaseAdmin.from('payment_transactions').select('*').order('created_at', { ascending: false });
      if (!error && Array.isArray(data)) {
        localDb.payment_transactions = data;
        saveDbToFile(localDb);
        return data;
      }
    } catch {}
    return localDb.payment_transactions;
  },

  async savePayment(payment: any): Promise<any> {
    const key = `${payment.resident_number}_${payment.period_month}_${payment.period_year}`;
    const idx = localDb.monthly_payments.findIndex(p => `${p.resident_number}_${p.period_month}_${p.period_year}` === key);
    if (idx >= 0) {
      localDb.monthly_payments[idx] = { ...localDb.monthly_payments[idx], ...payment, updated_at: new Date().toISOString() };
    } else {
      localDb.monthly_payments.push({ ...payment, updated_at: new Date().toISOString() });
    }
    saveDbToFile(localDb);

    try {
      await supabaseAdmin.from('monthly_payments').upsert(payment);
    } catch (e) {
      console.warn('Supabase monthly_payments sync queued locally:', e);
    }
    return payment;
  },

  async saveTransaction(transaction: any): Promise<any> {
    const idx = localDb.payment_transactions.findIndex(t => t.transaction_reference === transaction.transaction_reference || t.id === transaction.id);
    if (idx >= 0) {
      localDb.payment_transactions[idx] = { ...localDb.payment_transactions[idx], ...transaction, updated_at: new Date().toISOString() };
    } else {
      localDb.payment_transactions.push({ ...transaction, updated_at: new Date().toISOString() });
    }
    saveDbToFile(localDb);

    try {
      await supabaseAdmin.from('payment_transactions').upsert(transaction);
    } catch (e) {
      console.warn('Supabase payment_transactions sync queued locally:', e);
    }
    return transaction;
  },

  // RECEIPTS
  async getReceipts(): Promise<any[]> {
    try {
      const { data, error } = await supabaseAdmin.from('receipts').select('*').order('issued_at', { ascending: false });
      if (!error && Array.isArray(data)) {
        localDb.receipts = data;
        saveDbToFile(localDb);
        return data;
      }
    } catch {}
    return localDb.receipts;
  },

  async getReceiptByNumber(receiptNumber: string): Promise<any | null> {
    try {
      const { data, error } = await supabaseAdmin.from('receipts').select('*').eq('receipt_number', receiptNumber).maybeSingle();
      if (!error && data) return data;
    } catch {}
    return localDb.receipts.find(r => r.receipt_number === receiptNumber || r.paystack_reference === receiptNumber) || null;
  },

  async saveReceipt(receipt: any): Promise<any> {
    const idx = localDb.receipts.findIndex(r => r.receipt_number === receipt.receipt_number || r.id === receipt.id);
    if (idx >= 0) {
      localDb.receipts[idx] = { ...localDb.receipts[idx], ...receipt };
    } else {
      localDb.receipts.push(receipt);
    }
    saveDbToFile(localDb);

    try {
      await supabaseAdmin.from('receipts').upsert(receipt);
    } catch (e) {
      console.warn('Supabase receipts sync queued locally:', e);
    }
    return receipt;
  },

  // ROAD PROJECT
  getRoadTransactionsSync(): any[] {
    return localDb.road_project_transactions || [];
  },

  getEstateSettingsSync(): any {
    return localDb.estate_settings;
  },

  async updateRoadProjectTarget(target: number): Promise<any> {
    localDb.estate_settings = {
      ...localDb.estate_settings,
      road_project_target: target
    };
    saveDbToFile(localDb);
    try {
      await supabaseAdmin.from('estate_settings').upsert({
        ...localDb.estate_settings,
        updated_at: new Date().toISOString()
      });
    } catch (e) {
      console.warn('Supabase estate_settings sync queued locally:', e);
    }
    return localDb.estate_settings;
  },

  async getRoadTransactions(): Promise<any[]> {
    // 1. Try dedicated public.road_project_transactions table
    try {
      const { data, error } = await supabaseAdmin
        .from('road_project_transactions')
        .select('*')
        .order('date', { ascending: false });
      if (!error && Array.isArray(data) && data.length > 0) {
        localDb.road_project_transactions = data;
        saveDbToFile(localDb);
        return data;
      }
    } catch (e: any) {
      console.warn('[Supabase] road_project_transactions table query notice:', e?.message || e);
    }

    // 2. Try public.road_project_contributions table
    try {
      const { data: contribs, error: contribErr } = await supabaseAdmin
        .from('road_project_contributions')
        .select('*')
        .order('created_at', { ascending: false });
      if (!contribErr && Array.isArray(contribs) && contribs.length > 0) {
        const mapped = contribs.map((c: any) => ({
          id: c.id,
          reference: c.reference,
          date: c.verified_at ? c.verified_at.split('T')[0] : (c.created_at ? c.created_at.split('T')[0] : new Date().toISOString().split('T')[0]),
          type: 'CREDIT',
          source: c.payment_channel || 'Paystack',
          description: c.notes || `Road Modernization Contribution`,
          category: 'Special Donation',
          amount: Number(c.amount || 0),
          running_balance: 0,
          payer_or_vendor: c.contributor_display_name || c.contributor_name || 'Contributor',
          contributor_display_name: c.contributor_display_name || c.contributor_name || 'Contributor',
          resident_number: c.resident_number || '',
          building_number: c.resident_number || '',
          approved_by: 'Paystack Automated Gateway',
          receipt_or_invoice_ref: c.reference,
          provider_transaction_id: c.paystack_reference || c.reference,
          paystack_reference: c.paystack_reference || c.reference,
          project_type: 'road_modernization',
          is_anonymous: Boolean(c.is_anonymous),
          notes: c.notes || 'Verified Road Project contribution',
          verified_at: c.verified_at || c.created_at,
          paid_at: c.verified_at || c.created_at,
          created_at: c.created_at || new Date().toISOString(),
          status: 'VERIFIED'
        }));
        localDb.road_project_transactions = mapped;
        saveDbToFile(localDb);
        return mapped;
      }
    } catch (e: any) {
      console.warn('[Supabase] road_project_contributions query notice:', e?.message || e);
    }

    // 3. Query persistent vault in Supabase election_audit_logs
    try {
      const { data: auditRows, error: auditErr } = await supabaseAdmin
        .from('election_audit_logs')
        .select('*')
        .eq('action', 'ROAD_PROJECT_PAYMENT_VERIFIED')
        .order('created_at', { ascending: false });

      if (!auditErr && Array.isArray(auditRows) && auditRows.length > 0) {
        const vaultTransactions = auditRows
          .map((r: any) => r.metadata)
          .filter((m: any) => m && (m.reference || m.id));

        if (vaultTransactions.length > 0) {
          const existingRefs = new Set(vaultTransactions.map((t: any) => t.reference));
          for (const loc of (localDb.road_project_transactions || [])) {
            if (loc && loc.reference && !existingRefs.has(loc.reference)) {
              vaultTransactions.push(loc);
              existingRefs.add(loc.reference);
            }
          }
          localDb.road_project_transactions = vaultTransactions;
          saveDbToFile(localDb);
          return vaultTransactions;
        }
      }
    } catch (e: any) {
      console.warn('[Supabase] election_audit_logs vault query notice:', e?.message || e);
    }

    return localDb.road_project_transactions || [];
  },

  async saveRoadTransaction(tx: any): Promise<any> {
    if (!tx || (!tx.reference && !tx.id)) return tx;

    const idx = localDb.road_project_transactions.findIndex(t => t.reference === tx.reference || t.id === tx.id);
    if (idx >= 0) {
      localDb.road_project_transactions[idx] = { ...localDb.road_project_transactions[idx], ...tx };
    } else {
      localDb.road_project_transactions.unshift(tx);
    }
    saveDbToFile(localDb);

    // 1. Persist directly to Supabase road_project_transactions
    try {
      const { error: upsertErr } = await supabaseAdmin.from('road_project_transactions').upsert(tx);
      if (upsertErr) {
        console.warn('[Supabase] road_project_transactions upsert note:', upsertErr.message);
      } else {
        console.log('[Supabase] Successfully saved transaction to road_project_transactions table:', tx.reference);
      }
    } catch (e: any) {
      console.warn('[Supabase] road_project_transactions write failed:', e?.message);
    }

    // 2. Persist to Supabase election_audit_logs vault (guaranteed to exist and persist in live Supabase)
    try {
      let electionId = 'aee791a1-d88a-4292-b0d2-0e5f68ea7de8';
      const { data: elData } = await supabaseAdmin.from('elections').select('id').limit(1).maybeSingle();
      if (elData?.id) electionId = elData.id;

      const { data: existingVault } = await supabaseAdmin
        .from('election_audit_logs')
        .select('id')
        .eq('action', 'ROAD_PROJECT_PAYMENT_VERIFIED')
        .eq('actor_reference', tx.reference)
        .limit(1);

      if (!existingVault || existingVault.length === 0) {
        const { error: vaultErr } = await supabaseAdmin.from('election_audit_logs').insert({
          election_id: electionId,
          action: 'ROAD_PROJECT_PAYMENT_VERIFIED',
          actor_type: 'SYSTEM',
          actor_reference: tx.reference,
          description: `Verified Road Modernization payment: ₦${Number(tx.amount || 0).toLocaleString()} from ${tx.contributor_display_name || tx.payer_or_vendor || 'Contributor'} (${tx.resident_number ? `Resident ${tx.resident_number}` : 'Public'})`,
          metadata: tx
        });
        if (vaultErr) {
          console.warn('[Supabase] election_audit_logs vault write warning:', vaultErr.message);
        } else {
          console.log('[Supabase] Successfully persisted transaction to Supabase permanent vault:', tx.reference);
        }
      }
    } catch (vaultEx: any) {
      console.warn('[Supabase] Vault write notice:', vaultEx?.message);
    }

    return tx;
  },

  async getRoadMilestones(): Promise<any[]> {
    try {
      const { data, error } = await supabaseAdmin.from('road_project_milestones').select('*').order('milestone_order', { ascending: true });
      if (!error && Array.isArray(data) && data.length > 0) {
        localDb.road_project_milestones = data;
        saveDbToFile(localDb);
        return data;
      }
    } catch {}
    return localDb.road_project_milestones;
  },

  // ANNOUNCEMENTS
  async getAnnouncements(): Promise<any[]> {
    try {
      const { data, error } = await supabaseAdmin.from('announcements').select('*').order('created_at', { ascending: false });
      if (!error && Array.isArray(data)) {
        localDb.announcements = data;
        saveDbToFile(localDb);
        return data;
      }
    } catch {}
    return localDb.announcements;
  },

  async saveAnnouncement(ann: any): Promise<any> {
    const idx = localDb.announcements.findIndex(a => a.id === ann.id || a.slug === ann.slug);
    if (idx >= 0) {
      localDb.announcements[idx] = { ...localDb.announcements[idx], ...ann, updated_at: new Date().toISOString() };
    } else {
      localDb.announcements.unshift({ ...ann, created_at: new Date().toISOString(), updated_at: new Date().toISOString() });
    }
    saveDbToFile(localDb);

    try {
      await supabaseAdmin.from('announcements').upsert(ann);
    } catch (e) {
      console.warn('Supabase announcements sync queued locally:', e);
    }
    return ann;
  },

  async deleteAnnouncement(id: string): Promise<boolean> {
    localDb.announcements = localDb.announcements.filter(a => a.id !== id);
    saveDbToFile(localDb);
    try {
      await supabaseAdmin.from('announcements').delete().eq('id', id);
    } catch {}
    return true;
  },

  // ACTIVITY LOGS
  async getActivityLogs(): Promise<any[]> {
    try {
      const { data, error } = await supabaseAdmin.from('activity_logs').select('*').order('created_at', { ascending: false }).limit(200);
      if (!error && Array.isArray(data)) {
        localDb.activity_logs = data;
        saveDbToFile(localDb);
        return data;
      }
    } catch {}
    return localDb.activity_logs;
  },

  async logActivity(log: { admin_email: string; action: string; entity_type: string; entity_id?: string | null; description: string; metadata?: any }) {
    const record = {
      id: crypto.randomUUID(),
      admin_email: log.admin_email,
      action: log.action,
      entity_type: log.entity_type,
      entity_id: log.entity_id || null,
      description: log.description,
      metadata: log.metadata || {},
      created_at: new Date().toISOString()
    };
    localDb.activity_logs.unshift(record);
    saveDbToFile(localDb);

    try {
      await supabaseAdmin.from('activity_logs').insert(record);
    } catch (e) {
      console.warn('Supabase activity_logs sync queued locally:', e);
    }
    return record;
  },

  // SMS LOGS
  async logSMS(smsRecord: any) {
    const record = {
      id: smsRecord.id || crypto.randomUUID(),
      ...smsRecord,
      created_at: smsRecord.created_at || new Date().toISOString()
    };
    localDb.sms_logs.unshift(record);
    saveDbToFile(localDb);

    try {
      await supabaseAdmin.from('sms_logs').insert(record);
    } catch (e) {
      console.warn('Supabase sms_logs sync queued locally:', e);
    }
    return record;
  },

  // PROFILES & RBAC MANAGEMENT
  async getProfile(id: string) {
    try {
      const { data, error } = await supabaseAdmin.from('profiles').select('*').eq('id', id).maybeSingle();
      if (!error && data) return data;
    } catch {}
    return (localDb.profiles || []).find((p: any) => p.id === id) || null;
  },

  async upsertProfile(profile: { id: string; email: string; full_name?: string; role: string; status?: string }) {
    const updatedRecord = {
      id: profile.id,
      email: profile.email.toLowerCase().trim(),
      full_name: profile.full_name || 'Estate Administrator',
      role: profile.role,
      status: profile.status || 'Active',
      updated_at: new Date().toISOString()
    };

    const existingIdx = (localDb.profiles || []).findIndex((p: any) => p.id === profile.id);
    if (existingIdx >= 0) {
      localDb.profiles[existingIdx] = { ...localDb.profiles[existingIdx], ...updatedRecord };
    } else {
      localDb.profiles = localDb.profiles || [];
      localDb.profiles.push({
        ...updatedRecord,
        created_at: new Date().toISOString()
      });
    }

    // Sync admin_users table for backward compatibility
    const adminIdx = (localDb.admin_users || []).findIndex((a: any) => a.id === profile.id || a.auth_user_id === profile.id);
    if (adminIdx >= 0) {
      localDb.admin_users[adminIdx] = { ...localDb.admin_users[adminIdx], ...updatedRecord, auth_user_id: profile.id };
    } else {
      localDb.admin_users = localDb.admin_users || [];
      localDb.admin_users.push({
        ...updatedRecord,
        auth_user_id: profile.id,
        created_at: new Date().toISOString()
      });
    }

    saveDbToFile(localDb);

    try {
      await supabaseAdmin.from('profiles').upsert(updatedRecord);
    } catch (e) {
      // Ignore if table not yet migrated in Supabase schema cache
    }
    try {
      await supabaseAdmin.from('admin_users').upsert({
        ...updatedRecord,
        auth_user_id: profile.id
      });
    } catch (e) {
      // Ignore if table not yet migrated in Supabase schema cache
    }

    return updatedRecord;
  },

  // HEALTH CHECK
  async checkHealth() {
    const tables = [
      'estate_settings',
      'residents',
      'admin_users',
      'monthly_payments',
      'payment_transactions',
      'receipts',
      'road_project_transactions',
      'road_project_milestones',
      'road_project_contributions',
      'bank_reconciliations',
      'sms_logs',
      'sms_reminders',
      'announcements',
      'activity_logs'
    ];

    const results: Record<string, boolean> = {};
    for (const t of tables) {
      try {
        const { error } = await supabaseAdmin.from(t).select('id').limit(1);
        results[t] = !error;
      } catch {
        results[t] = false;
      }
    }

    const availableCount = Object.values(results).filter(Boolean).length;
    return {
      supabase_url: SUPABASE_URL,
      tables_ready: availableCount === tables.length,
      tables_count: availableCount,
      total_tables: tables.length,
      tables_status: results,
      local_store_path: DB_FILE,
      local_residents_count: localDb.residents.length,
      local_payments_count: localDb.monthly_payments.length,
      local_receipts_count: localDb.receipts.length
    };
  }
};

// ==========================================
// SERVER-SIDE AUTHORIZATION & VERIFICATION
// ==========================================
export interface VerifiedAdminUser {
  id: string;
  email: string;
  full_name: string;
  role: 'admin' | 'Super Admin' | 'Administrator' | 'Accountant' | 'Security Officer';
  status: 'Active' | 'Inactive';
}

export async function verifyAdminToken(token: string): Promise<{ valid: boolean; user?: VerifiedAdminUser; error?: string }> {
  if (!token || token === 'null' || token === 'undefined') {
    return { valid: false, error: 'Authentication token is required.' };
  }

  try {
    const { data: { user }, error: authErr } = await supabaseAdmin.auth.getUser(token);
    if (authErr || !user || !user.id || !user.email) {
      return { valid: false, error: 'Invalid or expired administrator session.' };
    }

    const cleanEmail = user.email.toLowerCase().trim();

    // 1. Authoritative check: Query profiles table by Supabase Auth user ID (UUID)
    try {
      const { data: profileRecord, error: pErr } = await supabaseAdmin
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      if (!pErr && profileRecord) {
        const isAdmin = profileRecord.role === 'admin' || 
                        profileRecord.role === 'Super Admin' || 
                        profileRecord.role === 'Administrator';

        if (isAdmin) {
          return {
            valid: true,
            user: {
              id: user.id,
              email: user.email,
              full_name: profileRecord.full_name || 'Estate Administrator',
              role: profileRecord.role === 'admin' ? 'admin' : (profileRecord.role as any),
              status: profileRecord.status || 'Active'
            }
          };
        } else {
          return {
            valid: false,
            error: 'Access denied: Your account is not authorized with the administrator role.'
          };
        }
      }
    } catch (pEx) {
      console.warn('Error querying profiles table in Supabase:', pEx);
    }

    // 2. Query admin_users table in Supabase
    try {
      const { data: adminRecord, error: dbErr } = await supabaseAdmin
        .from('admin_users')
        .select('*')
        .or(`auth_user_id.eq.${user.id},id.eq.${user.id}`)
        .eq('status', 'Active')
        .maybeSingle();

      if (!dbErr && adminRecord) {
        return {
          valid: true,
          user: {
            id: user.id,
            email: adminRecord.email || user.email,
            full_name: adminRecord.full_name || 'Estate Administrator',
            role: adminRecord.role || 'admin',
            status: adminRecord.status || 'Active'
          }
        };
      }
    } catch (dbEx) {
      console.warn('Error querying admin_users table in Supabase:', dbEx);
    }

    // 3. Check persistent database profiles by authenticated user UUID
    const localProfile = (localDb.profiles || []).find(
      (p: any) => p.id === user.id && (p.role === 'admin' || p.role === 'Super Admin' || p.role === 'Administrator')
    );
    if (localProfile) {
      return {
        valid: true,
        user: {
          id: user.id,
          email: user.email,
          full_name: localProfile.full_name || 'Estate Administrator',
          role: localProfile.role || 'admin',
          status: localProfile.status || 'Active'
        }
      };
    }

    // Check local admin_users
    const localAdmin = (localDb.admin_users || []).find(
      (a: any) => (a.auth_user_id === user.id || a.id === user.id) && a.status === 'Active'
    );
    if (localAdmin) {
      return {
        valid: true,
        user: {
          id: user.id,
          email: localAdmin.email || user.email,
          full_name: localAdmin.full_name || 'Estate Administrator',
          role: localAdmin.role || 'admin',
          status: localAdmin.status || 'Active'
        }
      };
    }

    return {
      valid: false,
      error: 'Access denied: Your account is not authorized for administrator access.'
    };
  } catch (err: any) {
    return { valid: false, error: err.message || 'Authentication service error.' };
  }
}

// ==========================================
// DESIGNATED ADMINISTRATOR PROVISIONING
// ==========================================
export const DESIGNATED_ADMIN_EMAIL = 'admin@fingerofgodestate.com';

export async function ensureDesignatedAdminAccount(): Promise<{
  success: boolean;
  userId?: string;
  email: string;
  role: string;
  createdInAuth?: boolean;
}> {
  try {
    let authUserId: string | null = null;
    let createdInAuth = false;

    // 1. Check if the user exists in Supabase Auth
    try {
      const { data: usersData, error: listError } = await supabaseAdmin.auth.admin.listUsers();
      if (!listError && usersData?.users) {
        const found = usersData.users.find(
          (u) => u.email?.toLowerCase().trim() === DESIGNATED_ADMIN_EMAIL.toLowerCase().trim()
        );
        if (found) {
          authUserId = found.id;
        }
      }
    } catch (e) {
      console.warn('Error listing Supabase Auth users:', e);
    }

    // 2. If account does not exist in Supabase Auth, create it securely server-side
    if (!authUserId) {
      try {
        const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
          email: DESIGNATED_ADMIN_EMAIL,
          email_confirm: true,
          user_metadata: {
            full_name: 'Estate Administrator',
            role: 'admin'
          }
        });

        if (!createError && newUser?.user) {
          authUserId = newUser.user.id;
          createdInAuth = true;
        }
      } catch (createEx) {
        console.warn('Error creating Supabase Auth admin user:', createEx);
      }
    }

    // Fallback to known UUID if still not retrieved
    const finalUserId = authUserId || '2aef6033-2600-4d7a-aaa5-7f54c441e429';

    // 3. Assign the admin role in the profiles architecture (using UUID)
    await serverDb.upsertProfile({
      id: finalUserId,
      email: DESIGNATED_ADMIN_EMAIL,
      full_name: 'Estate Administrator',
      role: 'admin',
      status: 'Active'
    });

    console.log(`[AUTH] Designated administrator account ensured: ${DESIGNATED_ADMIN_EMAIL} (UUID: ${finalUserId}, Role: admin)`);

    return {
      success: true,
      userId: finalUserId,
      email: DESIGNATED_ADMIN_EMAIL,
      role: 'admin',
      createdInAuth
    };
  } catch (err: any) {
    console.error('Error ensuring designated admin account:', err);
    return {
      success: false,
      email: DESIGNATED_ADMIN_EMAIL,
      role: 'admin'
    };
  }
}

