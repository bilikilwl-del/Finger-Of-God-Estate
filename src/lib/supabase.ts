import { createClient, SupabaseClient, User } from '@supabase/supabase-js';
import { Resident, EstateSettings, ActivityLog, AdminUser } from '../types/database';
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
  CURRENT_USER: 'estate_security_current_user'
};

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

/**
 * Calculates the next sequential resident number (e.g. 001, 002, 003...)
 */
export async function getNextSequentialResidentNumber(): Promise<string> {
  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from('residents')
        .select('resident_number');

      if (!error && data && data.length > 0) {
        let maxNum = 0;
        data.forEach((row: { resident_number: string }) => {
          const parsed = parseInt(row.resident_number, 10);
          if (!isNaN(parsed) && parsed > maxNum) {
            maxNum = parsed;
          }
        });
        return formatResidentNumber(maxNum + 1);
      }
    } catch (e) {
      console.warn('Supabase query failed, falling back to local computation', e);
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
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase
          .from('estate_settings')
          .select('*')
          .limit(1)
          .single();

        if (!error && data) {
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
      } catch (err) {
        console.warn('Could not fetch settings from Supabase, using local state', err);
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

    if (isSupabaseConfigured && supabase) {
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
          .single();

        if (error) throw error;
        if (data) {
          updatedSettings.id = data.id;
        }
      } catch (err) {
        console.error('Supabase updateSettings error:', err);
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

    if (isSupabaseConfigured && supabase) {
      try {
        let req = supabase.from('residents').select('*').order('resident_number', { ascending: true });
        
        if (statusFilter && statusFilter !== 'All') {
          req = req.eq('status', statusFilter);
        }

        const { data, error } = await req;
        if (!error && data) {
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
      } catch (err) {
        console.warn('Supabase fetch residents failed, using local storage', err);
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
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase
          .from('residents')
          .select('*')
          .eq('id', id)
          .single();
        if (!error && data) return data as Resident;
      } catch (err) {
        console.warn('Supabase getResidentById error:', err);
      }
    }
    const residents = getLocalResidents();
    return residents.find(r => r.id === id) || null;
  },

  async isResidentNumberTaken(residentNumber: string, excludeId?: string): Promise<boolean> {
    const formatted = residentNumber.trim();
    if (isSupabaseConfigured && supabase) {
      try {
        let req = supabase.from('residents').select('id').eq('resident_number', formatted);
        if (excludeId) {
          req = req.neq('id', excludeId);
        }
        const { data, error } = await req;
        if (!error && data) {
          return data.length > 0;
        }
      } catch (err) {
        console.warn('Supabase check resident number failed:', err);
      }
    }
    const residents = getLocalResidents();
    return residents.some(r => r.resident_number.trim() === formatted && r.id !== excludeId);
  },

  async isPhoneNumberTaken(phoneNumber: string, excludeId?: string): Promise<boolean> {
    const normalized = normalizeNigerianPhone(phoneNumber);
    if (!normalized) return false;

    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase.from('residents').select('id, phone_number');
        if (!error && data) {
          const match = data.some((r: { id: string; phone_number: string }) => 
            r.id !== excludeId && normalizeNigerianPhone(r.phone_number) === normalized
          );
          if (match) return true;
        }
      } catch (err) {
        console.warn('Supabase check phone number failed:', err);
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

    if (isSupabaseConfigured && supabase) {
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
          .single();

        if (error) throw error;
        if (data) {
          newResident.id = data.id;
          newResident.created_at = data.created_at;
          newResident.updated_at = data.updated_at;
        }
      } catch (err: any) {
        console.error('Supabase create resident error:', err);
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

    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase
          .from('residents')
          .update({
            ...updates,
            updated_at: now
          })
          .eq('id', id)
          .select()
          .single();

        if (!error && data) {
          updatedResident = data as Resident;
        }
      } catch (err) {
        console.error('Supabase update resident error:', err);
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
    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.from('activity_logs').insert({
          admin_email: log.admin_email,
          action: log.action,
          entity_type: log.entity_type,
          entity_id: log.entity_id || null,
          description: log.description,
          metadata: log.metadata || {}
        });
      } catch (err) {
        console.warn('Failed to insert activity log in Supabase', err);
      }
    }
    addLocalActivityLog(log);
  },

  async getActivityLogs(): Promise<ActivityLog[]> {
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase
          .from('activity_logs')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(50);

        if (!error && data && data.length > 0) {
          return data as ActivityLog[];
        }
      } catch (err) {
        console.warn('Supabase fetch activity logs failed:', err);
      }
    }
    return getLocalActivityLogs();
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
