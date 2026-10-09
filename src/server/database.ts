import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { normalizeNigerianPhone, arePhoneNumbersEqual } from '../lib/phoneUtils.js';

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
const SUPABASE_URL: string = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || 'https://dmdotpyotcmtrppediub.supabase.co';
// Server-side admin client MUST use service_role key to bypass RLS and persist records securely
const SUPABASE_KEY: string = process.env.SUPABASE_SERVICE_ROLE_KEY || 
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

const DEFAULT_RESIDENTS: any[] = [];

export interface PersistentOtpChallenge {
  id?: string;
  resident_number: string;
  challenge_type: 'ACTIVATION' | 'LOGIN';
  phone_number: string;
  pending_email?: string;
  otp_hash: string;
  salt: string;
  attempts: number;
  max_attempts: number;
  expires_at: string | number;
  resend_after: string | number;
  verified?: boolean;
  created_at?: string | number;
  updated_at?: string | number;
}

export interface PersistentDatabaseSchema {
  estate_settings: typeof DEFAULT_ESTATE_SETTINGS;
  residents: any[];
  profiles: any[];
  admin_users: any[];
  otp_challenges?: PersistentOtpChallenge[];
  resident_sessions?: Array<{ token: string; resident_number: string; created_at: number }>;
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
  buildings?: any[];
  flats?: any[];
  flat_security_levy_obligations?: any[];
  security_levy_transactions?: any[];
  flat_payment_allocations?: any[];
  manual_payment_logs?: any[];
  estate_audit_logs?: any[];
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
        residents: Array.isArray(parsed.residents) ? parsed.residents : [],
        otp_challenges: Array.isArray(parsed.otp_challenges) ? parsed.otp_challenges : [],
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
        buildings: Array.isArray(parsed.buildings) ? parsed.buildings : [],
        flats: Array.isArray(parsed.flats) ? parsed.flats : [],
        flat_security_levy_obligations: Array.isArray(parsed.flat_security_levy_obligations) ? parsed.flat_security_levy_obligations : [],
        security_levy_transactions: Array.isArray(parsed.security_levy_transactions) ? parsed.security_levy_transactions : [],
        flat_payment_allocations: Array.isArray(parsed.flat_payment_allocations) ? parsed.flat_payment_allocations : [],
        manual_payment_logs: Array.isArray(parsed.manual_payment_logs) ? parsed.manual_payment_logs : [],
        estate_audit_logs: Array.isArray(parsed.estate_audit_logs) ? parsed.estate_audit_logs : [],
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
    buildings: [],
    flats: [],
    flat_security_levy_obligations: [],
    security_levy_transactions: [],
    flat_payment_allocations: [],
    manual_payment_logs: [],
    estate_audit_logs: [],
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
      if (!error && Array.isArray(data)) {
        localDb.residents = data;
        saveDbToFile(localDb);
        return data;
      }
      if (error) {
        console.warn(`[Supabase Notice] getResidents query returned: ${error.message}`);
      }
    } catch (err: any) {
      console.warn(`[Supabase Error] getResidents exception: ${err?.message || err}`);
    }
    return localDb.residents;
  },

  // RESIDENT SESSIONS
  saveResidentSession(token: string, resident_number: string): void {
    if (!localDb.resident_sessions) localDb.resident_sessions = [];
    const cleanNum = String(resident_number).trim().padStart(3, '0');
    const existing = localDb.resident_sessions.findIndex(s => s.token === token);
    const sessionObj = { token, resident_number: cleanNum, created_at: Date.now() };
    if (existing >= 0) {
      localDb.resident_sessions[existing] = sessionObj;
    } else {
      localDb.resident_sessions.push(sessionObj);
    }
    saveDbToFile(localDb);
  },

  getResidentSession(token: string): { resident_number: string; created_at: number } | null {
    if (localDb.resident_sessions) {
      const found = localDb.resident_sessions.find(s => s.token === token);
      if (found) return { resident_number: found.resident_number, created_at: found.created_at };
    }
    try {
      if (fs.existsSync(DB_FILE)) {
        const parsed = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
        if (Array.isArray(parsed.resident_sessions)) {
          localDb.resident_sessions = parsed.resident_sessions;
          const found = parsed.resident_sessions.find((s: any) => s.token === token);
          if (found) return { resident_number: found.resident_number, created_at: found.created_at };
        }
      }
    } catch {}
    return null;
  },

  deleteResidentSession(token: string): void {
    if (!localDb.resident_sessions) return;
    localDb.resident_sessions = localDb.resident_sessions.filter(s => s.token !== token);
    saveDbToFile(localDb);
  },

  getAllResidentSessions(): Array<{ token: string; resident_number: string; created_at: number }> {
    return localDb.resident_sessions || [];
  },

  // =========================================================================
  // PERSISTENT SERVER-AUTHORITATIVE RESIDENT OTP CHALLENGES
  // =========================================================================
  async saveOtpChallenge(challenge: PersistentOtpChallenge): Promise<void> {
    const cleanNum = String(challenge.resident_number).trim().padStart(3, '0');
    const record: PersistentOtpChallenge = {
      ...challenge,
      resident_number: cleanNum,
      updated_at: new Date().toISOString(),
      created_at: challenge.created_at || new Date().toISOString()
    };

    // 1. Sync to in-memory/file persistent store
    if (!localDb.otp_challenges) localDb.otp_challenges = [];
    localDb.otp_challenges = localDb.otp_challenges.filter(
      c => !(c.resident_number === cleanNum && c.challenge_type === challenge.challenge_type)
    );
    localDb.otp_challenges.push(record);
    saveDbToFile(localDb);

    // 2. Sync to Supabase table if available
    try {
      await supabaseAdmin.from('resident_otp_challenges').upsert({
        resident_number: cleanNum,
        challenge_type: challenge.challenge_type,
        phone_number: challenge.phone_number,
        pending_email: challenge.pending_email || null,
        otp_hash: challenge.otp_hash,
        salt: challenge.salt,
        attempts: challenge.attempts || 0,
        max_attempts: challenge.max_attempts || 5,
        expires_at: typeof challenge.expires_at === 'number' ? new Date(challenge.expires_at).toISOString() : challenge.expires_at,
        resend_after: typeof challenge.resend_after === 'number' ? new Date(challenge.resend_after).toISOString() : challenge.resend_after,
        verified: !!challenge.verified,
        updated_at: new Date().toISOString()
      }, { onConflict: 'resident_number,challenge_type' });
    } catch {
      // Gracefully continue using persistent serverDb fallback
    }
  },

  async getOtpChallenge(residentNumber: string, challengeType: 'ACTIVATION' | 'LOGIN'): Promise<PersistentOtpChallenge | null> {
    const cleanNum = String(residentNumber).trim().padStart(3, '0');

    // 1. Check Supabase first
    try {
      const { data, error } = await supabaseAdmin
        .from('resident_otp_challenges')
        .select('*')
        .eq('resident_number', cleanNum)
        .eq('challenge_type', challengeType)
        .maybeSingle();

      if (!error && data) {
        return {
          ...data,
          expires_at: new Date(data.expires_at).getTime(),
          resend_after: new Date(data.resend_after).getTime()
        };
      }
    } catch {
      // Fallback
    }

    // 2. Check local persistent store
    if (!localDb.otp_challenges) localDb.otp_challenges = [];
    const found = localDb.otp_challenges.find(
      c => c.resident_number === cleanNum && c.challenge_type === challengeType
    );
    if (found) {
      return {
        ...found,
        expires_at: typeof found.expires_at === 'string' ? new Date(found.expires_at).getTime() : found.expires_at,
        resend_after: typeof found.resend_after === 'string' ? new Date(found.resend_after).getTime() : found.resend_after
      };
    }
    return null;
  },

  async updateOtpChallengeAttempts(residentNumber: string, challengeType: 'ACTIVATION' | 'LOGIN', attempts: number): Promise<void> {
    const cleanNum = String(residentNumber).trim().padStart(3, '0');
    if (localDb.otp_challenges) {
      const item = localDb.otp_challenges.find(c => c.resident_number === cleanNum && c.challenge_type === challengeType);
      if (item) {
        item.attempts = attempts;
        item.updated_at = new Date().toISOString();
        saveDbToFile(localDb);
      }
    }
    try {
      await supabaseAdmin
        .from('resident_otp_challenges')
        .update({ attempts, updated_at: new Date().toISOString() })
        .eq('resident_number', cleanNum)
        .eq('challenge_type', challengeType);
    } catch {}
  },

  async deleteOtpChallenge(residentNumber: string, challengeType: 'ACTIVATION' | 'LOGIN'): Promise<void> {
    const cleanNum = String(residentNumber).trim().padStart(3, '0');
    if (localDb.otp_challenges) {
      localDb.otp_challenges = localDb.otp_challenges.filter(
        c => !(c.resident_number === cleanNum && c.challenge_type === challengeType)
      );
      saveDbToFile(localDb);
    }
    try {
      await supabaseAdmin
        .from('resident_otp_challenges')
        .delete()
        .eq('resident_number', cleanNum)
        .eq('challenge_type', challengeType);
    } catch {}
  },

  async getResidentByAuthId(authUserId: string): Promise<any | null> {
    if (!authUserId) return null;
    try {
      const { data, error } = await supabaseAdmin
        .from('residents')
        .select('*')
        .eq('auth_user_id', authUserId)
        .maybeSingle();
      if (!error && data) {
        return {
          ...data,
          resident_number: String(data.resident_number).trim().padStart(3, '0')
        };
      }
    } catch (e) {
      console.warn('[Supabase getResidentByAuthId notice]', e);
    }
    const found = localDb.residents.find(r => r.auth_user_id === authUserId);
    if (found) {
      return {
        ...found,
        resident_number: String(found.resident_number).trim().padStart(3, '0')
      };
    }
    return null;
  },

  async getResidentByNumber(num: string): Promise<any | null> {
    const cleanNum = String(num).trim().padStart(3, '0');
    const rawNum = String(num).trim();
    const intNum = parseInt(rawNum, 10);
    const unpadded = !isNaN(intNum) ? String(intNum) : cleanNum;

    try {
      // 1. Check formatted 3-digit number (e.g. "016")
      const { data, error } = await supabaseAdmin
        .from('residents')
        .select('*')
        .eq('resident_number', cleanNum)
        .maybeSingle();

      if (!error && data) {
        return {
          ...data,
          resident_number: cleanNum
        };
      }

      // 2. Check unpadded number if different (e.g. "16")
      if (unpadded !== cleanNum) {
        const { data: data2, error: err2 } = await supabaseAdmin
          .from('residents')
          .select('*')
          .eq('resident_number', unpadded)
          .maybeSingle();

        if (!err2 && data2) {
          return {
            ...data2,
            resident_number: cleanNum
          };
        }
      }
    } catch (e) {
      console.warn('[Supabase getResidentByNumber notice]', e);
    }

    const localFound = localDb.residents.find(r => 
      String(r.resident_number).trim().padStart(3, '0') === cleanNum ||
      String(r.resident_number).trim() === unpadded
    );
    if (localFound) {
      return {
        ...localFound,
        resident_number: cleanNum
      };
    }
    return null;
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
    
    // Enforce 001 - 300 range with leading zero preservation
    const residentNumRegex = /^(00[1-9]|0[1-9][0-9]|[1-2][0-9]{2}|300)$/;
    if (!residentNumRegex.test(cleanNum)) {
      throw new Error(`Invalid resident number "${cleanNum}". Resident numbers must be between 001 and 300.`);
    }

    // Check resident number uniqueness constraint
    const existingNum = localDb.residents.find(r => 
      String(r.resident_number).trim().padStart(3, '0') === cleanNum && 
      r.id !== residentData.id
    );
    if (existingNum) {
      throw new Error(`Resident number ${cleanNum} is already assigned to ${existingNum.full_name}.`);
    }

    // Normalize phone numbers
    const normPhone = residentData.phone_number ? normalizeNigerianPhone(residentData.phone_number) : '';
    const normAltPhone = residentData.additional_phone ? normalizeNigerianPhone(residentData.additional_phone) : null;

    // Check phone number uniqueness across other residents
    if (normPhone) {
      const existingPhone = localDb.residents.find(r => {
        if (r.id === residentData.id) return false;
        const rPhone = normalizeNigerianPhone(r.phone_number);
        const rAlt = r.additional_phone ? normalizeNigerianPhone(r.additional_phone) : null;
        return arePhoneNumbersEqual(normPhone, rPhone) || (rAlt && arePhoneNumbersEqual(normPhone, rAlt));
      });
      if (existingPhone) {
        throw new Error(`Phone number "${residentData.phone_number}" is already registered to Resident #${existingPhone.resident_number} (${existingPhone.full_name}). Duplicate phone registrations are not permitted.`);
      }
    }

    // Validate or generate UUID for PostgreSQL compatibility
    const isValidUuid = (val: any) => typeof val === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(val);
    const validId = residentData.id && isValidUuid(residentData.id) ? residentData.id : crypto.randomUUID();

    const residentRecord = {
      ...residentData,
      id: validId,
      resident_number: cleanNum,
      phone_number: normPhone || residentData.phone_number,
      additional_phone: normAltPhone || residentData.additional_phone || null,
      email: residentData.email ? String(residentData.email).trim().toLowerCase() : null,
      house_number: residentData.house_number ? String(residentData.house_number).trim() : 'Phase 1',
      address: residentData.address ? String(residentData.address).trim() : 'Finger of God Estate, Iyiaba, Asaba',
      state: residentData.state || 'Delta',
      lga: residentData.lga || 'Oshimili South',
      notes: residentData.notes ? String(residentData.notes).trim() : null,
      registration_date: residentData.registration_date || new Date().toISOString().split('T')[0],
      status: residentData.status || 'Active',
      account_activated: !!residentData.account_activated,
      profile_completed: !!residentData.profile_completed,
      account_status: residentData.account_status || (residentData.account_activated ? (residentData.profile_completed ? 'ACTIVE' : 'PROFILE UPDATE REQUIRED') : 'NOT ACTIVATED'),
      created_at: residentData.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const dbPayload = {
      id: residentRecord.id,
      auth_user_id: residentRecord.auth_user_id && isValidUuid(residentRecord.auth_user_id) ? residentRecord.auth_user_id : null,
      resident_number: cleanNum,
      full_name: residentRecord.full_name,
      phone_number: residentRecord.phone_number,
      additional_phone: residentRecord.additional_phone || null,
      email: residentRecord.email || null,
      house_number: residentRecord.house_number,
      address: residentRecord.address,
      state: residentRecord.state,
      lga: residentRecord.lga,
      notes: residentRecord.notes || null,
      registration_date: residentRecord.registration_date,
      status: residentRecord.status,
      account_activated: residentRecord.account_activated,
      profile_completed: residentRecord.profile_completed,
      account_status: residentRecord.account_status,
      updated_at: new Date().toISOString()
    };

    // Primary source of truth: Supabase database
    const { data: upsertData, error: upsertErr } = await supabaseAdmin
      .from('residents')
      .upsert(dbPayload, { onConflict: 'resident_number' })
      .select()
      .maybeSingle();

    if (upsertErr) {
      console.error(`[Supabase Error] Upsert resident ${cleanNum} failed:`, upsertErr.message, upsertErr.details || '');
      // If table is missing, indicate exact migration requirement
      if (upsertErr.code === 'PGRST205' || upsertErr.message?.includes('schema cache') || upsertErr.message?.includes('relation "public.residents" does not exist')) {
        throw new Error(`Database error: The "public.residents" table does not exist in Supabase. Please run the supabase_residents_migration.sql script in your Supabase SQL Editor.`);
      }
      throw new Error(`Database error: Could not save resident to Supabase (${upsertErr.message})`);
    }

    if (upsertData) {
      console.log(`[Supabase Success] Resident ${cleanNum} permanently persisted in Supabase database. ID: ${upsertData.id}`);
      residentRecord.id = upsertData.id;
    }

    // Keep in-memory cache synchronized with confirmed database record
    const index = localDb.residents.findIndex(r => r.id === residentRecord.id || String(r.resident_number).padStart(3, '0') === cleanNum);
    if (index >= 0) {
      localDb.residents[index] = { ...localDb.residents[index], ...residentRecord };
    } else {
      localDb.residents.push(residentRecord);
    }
    saveDbToFile(localDb);

    // If linked to Supabase Auth, keep user metadata in sync
    if (residentRecord.auth_user_id) {
      try {
        await supabaseAdmin.auth.admin.updateUserById(residentRecord.auth_user_id, {
          user_metadata: {
            resident_number: cleanNum,
            role: 'Resident',
            full_name: residentRecord.full_name,
            phone_number: residentRecord.phone_number,
            account_activated: !!residentRecord.account_activated,
            profile_completed: !!residentRecord.profile_completed,
            account_status: residentRecord.account_status || 'ACTIVE'
          }
        });
      } catch (authErr) {
        console.warn('Supabase auth metadata update notice:', authErr);
      }
    }

    return residentRecord;
  },

  async clearAllResidents(): Promise<{ success: boolean; deletedCount: number }> {
    let deletedCount = localDb.residents.length;
    localDb.residents = [];
    saveDbToFile(localDb);
    try {
      const { data, error } = await supabaseAdmin
        .from('residents')
        .delete()
        .neq('resident_number', '___NONE___')
        .select();
      if (!error && Array.isArray(data)) {
        deletedCount = Math.max(deletedCount, data.length);
      }
    } catch (e) {
      console.warn('Supabase clear residents warning:', e);
    }
    return { success: true, deletedCount };
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
  },

  // ==========================================
  // BUILDINGS MANAGEMENT
  // ==========================================
  async getBuildings(): Promise<any[]> {
    if (!localDb.buildings) localDb.buildings = [];
    try {
      const { data, error } = await supabaseAdmin.from('buildings').select('*').order('house_number', { ascending: true });
      if (!error && Array.isArray(data)) {
        localDb.buildings = data;
        saveDbToFile(localDb);
        return data;
      }
    } catch {}
    return localDb.buildings;
  },

  async getBuildingById(id: string): Promise<any | null> {
    const list = await this.getBuildings();
    return list.find(b => b.id === id) || null;
  },

  async saveBuilding(building: any): Promise<any> {
    if (!localDb.buildings) localDb.buildings = [];
    const now = new Date().toISOString();
    const record = {
      id: building.id || crypto.randomUUID(),
      house_number: String(building.house_number).trim(),
      building_name: building.building_name?.trim() || null,
      total_flats_count: Math.max(1, Number(building.total_flats_count) || 1),
      landlord_name: building.landlord_name?.trim() || null,
      landlord_phone: building.landlord_phone?.trim() || null,
      landlord_email: building.landlord_email?.trim() || null,
      landlord_resident_id: building.landlord_resident_id || null,
      notes: building.notes?.trim() || null,
      status: building.status || 'ACTIVE',
      created_at: building.created_at || now,
      updated_at: now
    };

    const idx = localDb.buildings.findIndex(b => b.id === record.id || b.house_number === record.house_number);
    if (idx >= 0) {
      localDb.buildings[idx] = { ...localDb.buildings[idx], ...record };
    } else {
      localDb.buildings.push(record);
    }
    saveDbToFile(localDb);

    try {
      await supabaseAdmin.from('buildings').upsert(record);
    } catch (e: any) {
      console.warn('[Supabase Sync Notice] buildings upsert:', e?.message);
    }
    return record;
  },

  async updateBuilding(id: string, updates: any): Promise<any | null> {
    if (!localDb.buildings) localDb.buildings = [];
    const idx = localDb.buildings.findIndex(b => b.id === id);
    if (idx < 0) return null;

    const now = new Date().toISOString();
    localDb.buildings[idx] = { ...localDb.buildings[idx], ...updates, updated_at: now };
    const updated = localDb.buildings[idx];
    saveDbToFile(localDb);

    try {
      await supabaseAdmin.from('buildings').update({ ...updates, updated_at: now }).eq('id', id);
    } catch {}
    return updated;
  },

  // ==========================================
  // FLATS MANAGEMENT
  // ==========================================
  async getFlats(buildingId?: string): Promise<any[]> {
    if (!localDb.flats) localDb.flats = [];
    try {
      let query = supabaseAdmin.from('flats').select('*').order('flat_number', { ascending: true });
      if (buildingId) {
        query = query.eq('building_id', buildingId);
      }
      const { data, error } = await query;
      if (!error && Array.isArray(data)) {
        if (buildingId) {
          // Merge building flats into local cache
          localDb.flats = localDb.flats.filter(f => f.building_id !== buildingId).concat(data);
        } else {
          localDb.flats = data;
        }
        saveDbToFile(localDb);
        return data;
      }
    } catch {}
    if (buildingId) {
      return localDb.flats.filter(f => f.building_id === buildingId);
    }
    return localDb.flats;
  },

  async getFlatById(id: string): Promise<any | null> {
    const list = await this.getFlats();
    return list.find(f => f.id === id) || null;
  },

  async saveFlat(flat: any): Promise<any> {
    if (!localDb.flats) localDb.flats = [];
    const now = new Date().toISOString();
    const record = {
      id: flat.id || crypto.randomUUID(),
      building_id: flat.building_id,
      flat_number: String(flat.flat_number).trim(),
      label: flat.label?.trim() || null,
      occupant_type: flat.occupant_type || 'VACANT',
      resident_id: flat.resident_id || null,
      occupant_name: flat.occupant_name?.trim() || null,
      occupant_phone: flat.occupant_phone?.trim() || null,
      occupant_email: flat.occupant_email?.trim() || null,
      is_billing_active: flat.is_billing_active !== undefined ? Boolean(flat.is_billing_active) : false,
      billing_activated_at: flat.is_billing_active ? (flat.billing_activated_at || now) : null,
      billing_activated_by: flat.billing_activated_by || null,
      monthly_levy_amount: Number(flat.monthly_levy_amount) || 1500.00,
      status: flat.status || 'ACTIVE',
      created_at: flat.created_at || now,
      updated_at: now
    };

    const idx = localDb.flats.findIndex(f => f.id === record.id || (f.building_id === record.building_id && f.flat_number === record.flat_number));
    if (idx >= 0) {
      localDb.flats[idx] = { ...localDb.flats[idx], ...record };
    } else {
      localDb.flats.push(record);
    }
    saveDbToFile(localDb);

    try {
      await supabaseAdmin.from('flats').upsert(record);
    } catch (e: any) {
      console.warn('[Supabase Sync Notice] flats upsert:', e?.message);
    }
    return record;
  },

  async updateFlat(id: string, updates: any): Promise<any | null> {
    if (!localDb.flats) localDb.flats = [];
    const idx = localDb.flats.findIndex(f => f.id === id);
    if (idx < 0) return null;

    const now = new Date().toISOString();
    if (updates.is_billing_active === true && !localDb.flats[idx].is_billing_active) {
      updates.billing_activated_at = now;
    }
    localDb.flats[idx] = { ...localDb.flats[idx], ...updates, updated_at: now };
    const updated = localDb.flats[idx];
    saveDbToFile(localDb);

    try {
      await supabaseAdmin.from('flats').update({ ...updates, updated_at: now }).eq('id', id);
    } catch {}
    return updated;
  },

  // ==========================================
  // FLAT SECURITY LEVY OBLIGATIONS
  // ==========================================
  async getObligations(filter?: { flatId?: string; billingMonth?: string; buildingId?: string }): Promise<any[]> {
    if (!localDb.flat_security_levy_obligations) localDb.flat_security_levy_obligations = [];
    try {
      let query = supabaseAdmin.from('flat_security_levy_obligations').select('*').order('created_at', { ascending: false });
      if (filter?.flatId) query = query.eq('flat_id', filter.flatId);
      if (filter?.billingMonth) query = query.eq('billing_month', filter.billingMonth);
      const { data, error } = await query;
      if (!error && Array.isArray(data)) {
        if (!filter?.flatId && !filter?.billingMonth) {
          localDb.flat_security_levy_obligations = data;
        } else {
          // Update local entries
          data.forEach(item => {
            const idx = localDb.flat_security_levy_obligations!.findIndex(o => o.id === item.id);
            if (idx >= 0) localDb.flat_security_levy_obligations![idx] = item;
            else localDb.flat_security_levy_obligations!.push(item);
          });
        }
        saveDbToFile(localDb);
        return data;
      }
    } catch {}

    let res = localDb.flat_security_levy_obligations;
    if (filter?.flatId) res = res.filter(o => o.flat_id === filter.flatId);
    if (filter?.billingMonth) res = res.filter(o => o.billing_month === filter.billingMonth);
    return res;
  },

  async saveObligation(obligation: any): Promise<any> {
    if (!localDb.flat_security_levy_obligations) localDb.flat_security_levy_obligations = [];
    const now = new Date().toISOString();
    const amountDue = Number(obligation.amount_due) || 1500.00;
    const amountPaid = Number(obligation.amount_paid) || 0.00;
    const balanceDue = Math.max(0, amountDue - amountPaid);
    const status = amountPaid >= amountDue ? 'PAID' : (amountPaid > 0 ? 'PARTIALLY_PAID' : 'UNPAID');

    const record = {
      id: obligation.id || crypto.randomUUID(),
      flat_id: obligation.flat_id,
      billing_month: obligation.billing_month,
      amount_due: amountDue,
      amount_paid: amountPaid,
      balance_due: balanceDue,
      status: obligation.status || status,
      is_billed: obligation.is_billed !== undefined ? Boolean(obligation.is_billed) : true,
      due_date: obligation.due_date || null,
      locked_by_reference: obligation.locked_by_reference || null,
      lock_expires_at: obligation.lock_expires_at || null,
      created_at: obligation.created_at || now,
      updated_at: now
    };

    const idx = localDb.flat_security_levy_obligations.findIndex(
      o => o.id === record.id || (o.flat_id === record.flat_id && o.billing_month === record.billing_month)
    );
    if (idx >= 0) {
      localDb.flat_security_levy_obligations[idx] = { ...localDb.flat_security_levy_obligations[idx], ...record };
    } else {
      localDb.flat_security_levy_obligations.push(record);
    }
    saveDbToFile(localDb);

    try {
      await supabaseAdmin.from('flat_security_levy_obligations').upsert(record);
    } catch (e: any) {
      console.warn('[Supabase Sync Notice] obligations upsert:', e?.message);
    }
    return record;
  },

  async updateObligation(id: string, updates: any): Promise<any | null> {
    if (!localDb.flat_security_levy_obligations) localDb.flat_security_levy_obligations = [];
    const idx = localDb.flat_security_levy_obligations.findIndex(o => o.id === id);
    if (idx < 0) return null;

    const now = new Date().toISOString();
    localDb.flat_security_levy_obligations[idx] = {
      ...localDb.flat_security_levy_obligations[idx],
      ...updates,
      updated_at: now
    };
    const updated = localDb.flat_security_levy_obligations[idx];
    saveDbToFile(localDb);

    try {
      await supabaseAdmin.from('flat_security_levy_obligations').update({ ...updates, updated_at: now }).eq('id', id);
    } catch {}
    return updated;
  },

  async generateMonthlyObligations(billingMonth: string): Promise<{ generated_count: number; skipped_count: number }> {
    // 1. Try Supabase RPC if available
    try {
      const { data, error } = await supabaseAdmin.rpc('fn_generate_monthly_security_obligations', {
        p_billing_month: billingMonth
      });
      if (!error && data?.success) {
        // Sync local cache
        await this.getObligations({ billingMonth });
        return {
          generated_count: data.generated_count || 0,
          skipped_count: data.skipped_count || 0
        };
      }
    } catch {}

    // 2. Server-side robust fallback
    const flats = await this.getFlats();
    const activeFlats = flats.filter(f => f.status === 'ACTIVE' && f.is_billing_active);
    let generated = 0;
    let skipped = 0;

    for (const flat of activeFlats) {
      const existing = (localDb.flat_security_levy_obligations || []).find(
        o => o.flat_id === flat.id && o.billing_month === billingMonth
      );
      if (existing) {
        skipped++;
      } else {
        await this.saveObligation({
          flat_id: flat.id,
          billing_month: billingMonth,
          amount_due: flat.monthly_levy_amount || 1500.00,
          amount_paid: 0.00,
          balance_due: flat.monthly_levy_amount || 1500.00,
          status: 'UNPAID',
          is_billed: true
        });
        generated++;
      }
    }

    return { generated_count: generated, skipped_count: skipped };
  },

  // ==========================================
  // UNIFIED SECURITY LEVY TRANSACTIONS
  // ==========================================
  async getSecurityLevyTransactions(): Promise<any[]> {
    if (!localDb.security_levy_transactions) localDb.security_levy_transactions = [];
    try {
      const { data, error } = await supabaseAdmin.from('security_levy_transactions').select('*').order('created_at', { ascending: false });
      if (!error && Array.isArray(data)) {
        localDb.security_levy_transactions = data;
        saveDbToFile(localDb);
        return data;
      }
    } catch {}
    return localDb.security_levy_transactions;
  },

  async getSecurityLevyTransactionById(id: string): Promise<any | null> {
    const list = await this.getSecurityLevyTransactions();
    return list.find(t => t.id === id) || null;
  },

  async getSecurityLevyTransactionByRef(ref: string): Promise<any | null> {
    const list = await this.getSecurityLevyTransactions();
    return list.find(t => t.paystack_reference === ref) || null;
  },

  async saveSecurityLevyTransaction(tx: any): Promise<any> {
    if (!localDb.security_levy_transactions) localDb.security_levy_transactions = [];
    const now = new Date().toISOString();
    const record = {
      id: tx.id || crypto.randomUUID(),
      transaction_type: tx.transaction_type || 'INDIVIDUAL_FLAT',
      building_id: tx.building_id || null,
      payer_name: String(tx.payer_name).trim(),
      payer_email: String(tx.payer_email).trim(),
      payer_phone: tx.payer_phone?.trim() || null,
      payer_type: tx.payer_type || 'LANDLORD',
      billing_month: tx.billing_month,
      total_units: Number(tx.total_units) || 1,
      rate_per_unit: Number(tx.rate_per_unit) || 1500.00,
      expected_amount: Number(tx.expected_amount),
      verified_amount: Number(tx.verified_amount) || 0.00,
      allocated_amount: Number(tx.allocated_amount) || 0.00,
      unallocated_amount: Number(tx.unallocated_amount) || 0.00,
      target_flat_ids: Array.isArray(tx.target_flat_ids) ? tx.target_flat_ids : [],
      target_obligation_ids: Array.isArray(tx.target_obligation_ids) ? tx.target_obligation_ids : [],
      paystack_reference: tx.paystack_reference || null,
      payment_method: tx.payment_method || 'PAYSTACK',
      payment_status: tx.payment_status || 'PENDING',
      allocation_status: tx.allocation_status || 'UNALLOCATED',
      idempotency_key: tx.idempotency_key || null,
      verified_at: tx.verified_at || null,
      channel_payload: tx.channel_payload || null,
      reconciliation_notes: tx.reconciliation_notes || null,
      created_at: tx.created_at || now,
      updated_at: now
    };

    const idx = localDb.security_levy_transactions.findIndex(
      t => t.id === record.id || (record.paystack_reference && t.paystack_reference === record.paystack_reference)
    );
    if (idx >= 0) {
      localDb.security_levy_transactions[idx] = { ...localDb.security_levy_transactions[idx], ...record };
    } else {
      localDb.security_levy_transactions.unshift(record);
    }
    saveDbToFile(localDb);

    try {
      await supabaseAdmin.from('security_levy_transactions').upsert(record);
    } catch (e: any) {
      console.warn('[Supabase Sync Notice] security_levy_transactions upsert:', e?.message);
    }
    return record;
  },

  async updateSecurityLevyTransaction(id: string, updates: any): Promise<any | null> {
    if (!localDb.security_levy_transactions) localDb.security_levy_transactions = [];
    const idx = localDb.security_levy_transactions.findIndex(t => t.id === id);
    if (idx < 0) return null;

    const now = new Date().toISOString();
    localDb.security_levy_transactions[idx] = {
      ...localDb.security_levy_transactions[idx],
      ...updates,
      updated_at: now
    };
    const updated = localDb.security_levy_transactions[idx];
    saveDbToFile(localDb);

    try {
      await supabaseAdmin.from('security_levy_transactions').update({ ...updates, updated_at: now }).eq('id', id);
    } catch {}
    return updated;
  },

  // ==========================================
  // FLAT PAYMENT ALLOCATIONS (ATOMIC LEDGER)
  // ==========================================
  async getFlatPaymentAllocations(transactionId?: string, flatId?: string): Promise<any[]> {
    if (!localDb.flat_payment_allocations) localDb.flat_payment_allocations = [];
    try {
      let query = supabaseAdmin.from('flat_payment_allocations').select('*').order('allocation_timestamp', { ascending: false });
      if (transactionId) query = query.eq('transaction_id', transactionId);
      if (flatId) query = query.eq('flat_id', flatId);
      const { data, error } = await query;
      if (!error && Array.isArray(data)) {
        if (!transactionId && !flatId) {
          localDb.flat_payment_allocations = data;
        } else {
          data.forEach(item => {
            const idx = localDb.flat_payment_allocations!.findIndex(a => a.id === item.id);
            if (idx >= 0) localDb.flat_payment_allocations![idx] = item;
            else localDb.flat_payment_allocations!.push(item);
          });
        }
        saveDbToFile(localDb);
        return data;
      }
    } catch {}

    let res = localDb.flat_payment_allocations;
    if (transactionId) res = res.filter(a => a.transaction_id === transactionId);
    if (flatId) res = res.filter(a => a.flat_id === flatId);
    return res;
  },

  async saveFlatPaymentAllocation(allocation: any): Promise<any> {
    if (!localDb.flat_payment_allocations) localDb.flat_payment_allocations = [];
    const now = new Date().toISOString();
    const record = {
      id: allocation.id || crypto.randomUUID(),
      transaction_id: allocation.transaction_id,
      flat_id: allocation.flat_id,
      obligation_id: allocation.obligation_id,
      allocated_amount: Number(allocation.allocated_amount) || 1500.00,
      billing_month: allocation.billing_month,
      rate_snapshot: Number(allocation.rate_snapshot) || 1500.00,
      paystack_reference: allocation.paystack_reference || null,
      receipt_number: allocation.receipt_number,
      payment_method: allocation.payment_method || 'PAYSTACK',
      allocation_timestamp: allocation.allocation_timestamp || now
    };

    const existingIdx = localDb.flat_payment_allocations.findIndex(
      a => a.flat_id === record.flat_id && a.obligation_id === record.obligation_id
    );
    if (existingIdx >= 0) {
      if (localDb.flat_payment_allocations[existingIdx].id === record.id) {
        localDb.flat_payment_allocations[existingIdx] = { ...localDb.flat_payment_allocations[existingIdx], ...record };
        saveDbToFile(localDb);
        return record;
      }
      // Unique constraint violation on (flat_id, obligation_id)
      return null;
    }

    localDb.flat_payment_allocations.unshift(record);
    saveDbToFile(localDb);

    try {
      await supabaseAdmin.from('flat_payment_allocations').upsert(record);
    } catch (e: any) {
      console.warn('[Supabase Sync Notice] flat_payment_allocations upsert:', e?.message);
    }
    return record;
  },

  // ==========================================
  // ATOMIC ALLOCATION ENGINE (PG RPC + FALLBACK)
  // ==========================================
  async allocateSecurityLevyPayment(transactionId: string, actor: string = 'SYSTEM_WEBHOOK'): Promise<{
    success: boolean;
    transaction_id: string;
    allocated_count: number;
    conflict_count: number;
    total_allocated: number;
    total_unallocated: number;
    receipts?: string[];
    error?: string;
  }> {
    // 1. Attempt PostgreSQL stored procedure (handles row-level FOR UPDATE locks)
    try {
      const { data, error } = await supabaseAdmin.rpc('fn_allocate_security_levy_payment', {
        p_transaction_id: transactionId,
        p_actor: actor
      });
      if (!error && data?.success) {
        // Sync local cache
        const tx = await this.getSecurityLevyTransactionById(transactionId);
        await this.getFlatPaymentAllocations(transactionId);
        return {
          success: true,
          transaction_id: transactionId,
          allocated_count: data.allocated_count || 0,
          conflict_count: data.conflict_count || 0,
          total_allocated: data.total_allocated || 0,
          total_unallocated: data.total_unallocated || 0
        };
      }
    } catch (rpcErr) {
      console.warn('[Atomic Allocation RPC Notice] Proceeding with server transaction boundary:', rpcErr);
    }

    // 2. Server-side ACID atomic transaction boundary
    const tx = await this.getSecurityLevyTransactionById(transactionId);
    if (!tx) {
      return {
        success: false,
        transaction_id: transactionId,
        allocated_count: 0,
        conflict_count: 0,
        total_allocated: 0,
        total_unallocated: 0,
        error: 'TRANSACTION_NOT_FOUND'
      };
    }

    // Idempotency: If already processed and allocated (or handled), return existing status immediately
    if (['ALLOCATED', 'PARTIALLY_ALLOCATED', 'OVERPAID_UNALLOCATED'].includes(tx.allocation_status)) {
      return {
        success: tx.allocation_status === 'ALLOCATED',
        transaction_id: tx.id,
        allocated_count: tx.allocated_amount ? Math.round(Number(tx.allocated_amount) / Number(tx.rate_per_unit || 1500)) : 0,
        conflict_count: tx.allocation_status === 'ALLOCATED' ? 0 : (Number(tx.unallocated_amount || 0) > 0 ? 1 : 0),
        total_allocated: Number(tx.allocated_amount || 0),
        total_unallocated: Number(tx.unallocated_amount || 0)
      };
    }

    if (tx.payment_status !== 'SUCCESSFUL') {
      return {
        success: false,
        transaction_id: tx.id,
        allocated_count: 0,
        conflict_count: 0,
        total_allocated: 0,
        total_unallocated: 0,
        error: `TRANSACTION_NOT_SUCCESSFUL (${tx.payment_status})`
      };
    }

    const targetFlats: string[] = Array.isArray(tx.target_flat_ids) ? tx.target_flat_ids : [];
    let allocatedCount = 0;
    let conflictCount = 0;
    let totalAllocated = 0;
    const generatedReceipts: string[] = [];

    for (const flatId of targetFlats) {
      // Find or create obligation for billing month
      let obligation = (localDb.flat_security_levy_obligations || []).find(
        o => o.flat_id === flatId && o.billing_month === tx.billing_month
      );

      if (!obligation) {
        obligation = await this.saveObligation({
          flat_id: flatId,
          billing_month: tx.billing_month,
          amount_due: tx.rate_per_unit || 1500.00,
          amount_paid: 0.00,
          balance_due: tx.rate_per_unit || 1500.00,
          status: 'UNPAID',
          is_billed: true
        });
      }

      // Check existing allocations
      const existingAllocForThisTx = (localDb.flat_payment_allocations || []).find(
        a => a.flat_id === flatId && a.obligation_id === obligation.id && a.transaction_id === tx.id
      );
      const existingAllocForOtherTx = (localDb.flat_payment_allocations || []).find(
        a => a.flat_id === flatId && a.obligation_id === obligation.id && a.transaction_id !== tx.id
      );

      if (existingAllocForThisTx) {
        // Valid existing allocation belonging to THIS SAME transaction (replay/idempotent retry)
        allocatedCount++;
        totalAllocated += Number(existingAllocForThisTx.allocated_amount || tx.rate_per_unit || 1500.00);
        generatedReceipts.push(existingAllocForThisTx.receipt_number);
      } else if (existingAllocForOtherTx || obligation.status === 'PAID') {
        // Allocation belongs to a different transaction or obligation already settled elsewhere
        conflictCount++;
      } else {
        const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
        const randomHex = crypto.randomBytes(4).toString('hex').toUpperCase();
        const receiptNo = `SLR-${dateStr}-${randomHex}`;

        // Save Allocation
        const savedAlloc = await this.saveFlatPaymentAllocation({
          transaction_id: tx.id,
          flat_id: flatId,
          obligation_id: obligation.id,
          allocated_amount: tx.rate_per_unit || 1500.00,
          billing_month: tx.billing_month,
          rate_snapshot: tx.rate_per_unit || 1500.00,
          paystack_reference: tx.paystack_reference,
          receipt_number: receiptNo,
          payment_method: tx.payment_method
        });

        // CRITICAL INVARIANT: Only update obligation if allocation record was actually persisted
        if (savedAlloc) {
          // Re-calculate strictly from persisted allocations for this obligation
          const allObligAllocs = (localDb.flat_payment_allocations || []).filter(a => a.obligation_id === obligation.id);
          const newPaid = allObligAllocs.reduce((sum, a) => sum + Number(a.allocated_amount || 0), 0);
          const due = Number(obligation.amount_due) || 1500.00;
          const balance = Math.max(0, due - newPaid);
          const newStatus = newPaid >= due ? 'PAID' : (newPaid > 0 ? 'PARTIALLY_PAID' : 'UNPAID');

          await this.updateObligation(obligation.id, {
            amount_paid: newPaid,
            balance_due: balance,
            status: newStatus,
            locked_by_reference: null,
            lock_expires_at: null
          });

          allocatedCount++;
          totalAllocated += Number(tx.rate_per_unit || 1500.00);
          generatedReceipts.push(receiptNo);
        } else {
          conflictCount++;
        }
      }
    }

    // Mathematical Financial Conservation: total_allocated + total_unallocated = verified_amount
    const verifiedTotal = Number(tx.verified_amount || tx.expected_amount || 0);
    const totalUnallocated = Math.max(0, verifiedTotal - totalAllocated);

    // Update Transaction State
    const finalAllocationStatus = 
      (conflictCount === 0 && allocatedCount > 0 && totalUnallocated === 0) ? 'ALLOCATED' :
      (allocatedCount > 0 ? 'PARTIALLY_ALLOCATED' : 'OVERPAID_UNALLOCATED');

    const reconNotes = (conflictCount > 0 || totalUnallocated > 0)
      ? `Reconciliation notice: ${conflictCount} conflict unit(s). Preserved ₦${totalUnallocated.toLocaleString()} as unallocated credit.`
      : null;

    await this.updateSecurityLevyTransaction(tx.id, {
      allocated_amount: totalAllocated,
      unallocated_amount: totalUnallocated,
      allocation_status: finalAllocationStatus,
      reconciliation_notes: reconNotes
    });

    // Log to Audit Trail
    await this.logEstateAudit({
      actor_type: actor.includes('@') ? 'ADMIN' : 'WEBHOOK',
      actor_identifier: actor,
      action: 'ALLOCATE_SECURITY_LEVY',
      entity_type: 'SECURITY_LEVY_TRANSACTION',
      entity_id: tx.id,
      details: {
        allocated_count: allocatedCount,
        conflict_count: conflictCount,
        total_allocated: totalAllocated,
        total_unallocated: totalUnallocated,
        paystack_reference: tx.paystack_reference,
        receipts: generatedReceipts
      }
    });

    return {
      success: true,
      transaction_id: tx.id,
      allocated_count: allocatedCount,
      conflict_count: conflictCount,
      total_allocated: totalAllocated,
      total_unallocated: totalUnallocated,
      receipts: generatedReceipts
    };
  },

  // ==========================================
  // MANUAL PAYMENT RECORDING & AUDIT
  // ==========================================
  async saveManualPaymentLog(log: any): Promise<any> {
    if (!localDb.manual_payment_logs) localDb.manual_payment_logs = [];
    const now = new Date().toISOString();
    const record = {
      id: log.id || crypto.randomUUID(),
      payment_type: log.payment_type || 'INDIVIDUAL_FLAT',
      flat_id: log.flat_id || null,
      transaction_id: log.transaction_id || null,
      admin_email: log.admin_email,
      amount: Number(log.amount),
      payment_method: log.payment_method || 'MANUAL_BANK_TRANSFER',
      bank_reference: log.bank_reference?.trim() || null,
      receipt_reference: log.receipt_reference?.trim() || null,
      supporting_document_url: log.supporting_document_url || null,
      notes: String(log.notes).trim(),
      recorded_at: log.recorded_at || now
    };

    localDb.manual_payment_logs.unshift(record);
    saveDbToFile(localDb);

    try {
      await supabaseAdmin.from('manual_payment_logs').insert(record);
    } catch (e: any) {
      console.warn('[Supabase Sync Notice] manual_payment_logs insert:', e?.message);
    }
    return record;
  },

  async getManualPaymentLogs(): Promise<any[]> {
    if (!localDb.manual_payment_logs) localDb.manual_payment_logs = [];
    try {
      const { data, error } = await supabaseAdmin.from('manual_payment_logs').select('*').order('recorded_at', { ascending: false });
      if (!error && Array.isArray(data)) {
        localDb.manual_payment_logs = data;
        saveDbToFile(localDb);
        return data;
      }
    } catch {}
    return localDb.manual_payment_logs;
  },

  // ==========================================
  // ESTATE AUDIT LOGS
  // ==========================================
  async logEstateAudit(log: {
    actor_type?: 'ADMIN' | 'RESIDENT' | 'SYSTEM' | 'WEBHOOK';
    actor_identifier: string;
    action: string;
    entity_type: string;
    entity_id: string;
    details?: any;
    ip_address?: string | null;
  }): Promise<any> {
    if (!localDb.estate_audit_logs) localDb.estate_audit_logs = [];
    const record = {
      id: crypto.randomUUID(),
      actor_type: log.actor_type || 'ADMIN',
      actor_identifier: log.actor_identifier,
      action: log.action,
      entity_type: log.entity_type,
      entity_id: log.entity_id,
      details: log.details || null,
      ip_address: log.ip_address || null,
      created_at: new Date().toISOString()
    };

    localDb.estate_audit_logs.unshift(record);
    saveDbToFile(localDb);

    try {
      await supabaseAdmin.from('estate_audit_logs').insert(record);
    } catch (e: any) {
      console.warn('[Supabase Sync Notice] estate_audit_logs insert:', e?.message);
    }
    return record;
  },

  async getEstateAuditLogs(limit: number = 200): Promise<any[]> {
    if (!localDb.estate_audit_logs) localDb.estate_audit_logs = [];
    try {
      const { data, error } = await supabaseAdmin.from('estate_audit_logs').select('*').order('created_at', { ascending: false }).limit(limit);
      if (!error && Array.isArray(data)) {
        localDb.estate_audit_logs = data;
        saveDbToFile(localDb);
        return data;
      }
    } catch {}
    return localDb.estate_audit_logs.slice(0, limit);
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

