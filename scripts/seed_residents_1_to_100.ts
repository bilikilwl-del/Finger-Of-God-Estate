import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

async function seedResidents() {
  console.log('--- SEEDING RESIDENTS 1-100 ---');

  // Load local database
  const dbPath = path.resolve(process.cwd(), 'data/estate_database.json');
  let localDb: any = {};
  if (fs.existsSync(dbPath)) {
    localDb = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
  }
  if (!Array.isArray(localDb.residents)) {
    localDb.residents = [];
  }

  let sb: any = null;
  if (supabaseUrl && supabaseKey) {
    sb = createClient(supabaseUrl, supabaseKey);
  }

  // Get existing residents from Supabase if available
  let existingSupabaseResidents: any[] = [];
  if (sb) {
    const { data, error } = await sb.from('residents').select('*');
    if (!error && Array.isArray(data)) {
      existingSupabaseResidents = data;
    }
  }

  const now = new Date().toISOString();
  let addedCount = 0;
  let preservedCount = 0;

  const toInsertSupabase: any[] = [];

  for (let i = 1; i <= 100; i++) {
    const residentNum = String(i).padStart(3, '0');

    // Check if resident already exists in localDb or Supabase
    const existingLocal = localDb.residents.find((r: any) => String(r.resident_number).padStart(3, '0') === residentNum);
    const existingSb = existingSupabaseResidents.find((r: any) => String(r.resident_number).padStart(3, '0') === residentNum);

    if (existingLocal || existingSb) {
      preservedCount++;
      const existing = existingLocal || existingSb;
      // If in Supabase but not in local, keep it in local
      if (!existingLocal && existingSb) {
        localDb.residents.push(existingSb);
      }
      // If in local but not in Supabase, queue for Supabase
      if (!existingSb && existingLocal && sb) {
        toInsertSupabase.push(existingLocal);
      }
      continue;
    }

    // New unpopulated resident record
    const newResident = {
      id: crypto.randomUUID(),
      resident_number: residentNum,
      full_name: `Resident ${residentNum}`,
      phone_number: `08000000${residentNum}`, // Initial placeholder format satisfying DB NOT NULL constraint
      additional_phone: null,
      email: null,
      house_number: `Plot ${residentNum}`,
      address: 'Phase 1, Finger of God Estate, Iyiaba, Asaba',
      state: 'Delta',
      lga: 'Oshimili South',
      notes: 'Initial estate resident allocation (1-100)',
      registration_date: '2026-10-17',
      status: 'Active',
      account_activated: false,
      profile_completed: false,
      account_status: 'PROFILE UPDATE REQUIRED',
      created_at: now,
      updated_at: now
    };

    localDb.residents.push(newResident);
    if (sb) {
      toInsertSupabase.push(newResident);
    }
    addedCount++;
  }

  // Sort local residents
  localDb.residents.sort((a: any, b: any) => Number(a.resident_number) - Number(b.resident_number));
  fs.writeFileSync(dbPath, JSON.stringify(localDb, null, 2), 'utf8');
  console.log(`Local DB updated: ${localDb.residents.length} total residents (Preserved: ${preservedCount}, Added: ${addedCount})`);

  // Insert to Supabase in batches if available
  if (sb && toInsertSupabase.length > 0) {
    console.log(`Syncing ${toInsertSupabase.length} new residents to Supabase...`);
    const batchSize = 25;
    for (let k = 0; k < toInsertSupabase.length; k += batchSize) {
      const batch = toInsertSupabase.slice(k, k + batchSize);
      const { error } = await sb.from('residents').upsert(batch, { onConflict: 'resident_number' });
      if (error) {
        console.error(`Error syncing batch ${k / batchSize + 1}:`, error.message);
      } else {
        console.log(`Synced batch ${k / batchSize + 1} (${batch.length} residents)`);
      }
    }
  }

  console.log('--- SEEDING COMPLETED SUCCESSFULLY ---');
}

seedResidents().catch(err => {
  console.error('Seeding failed:', err);
  process.exit(1);
});
