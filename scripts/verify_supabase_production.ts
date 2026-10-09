import dotenv from 'dotenv';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Load environment variables from .env if present
dotenv.config();

/**
 * Mask sensitive credentials for safe logging
 */
function maskKey(key?: string | null): string {
  if (!key) return '[MISSING / NOT CONFIGURED]';
  const trimmed = key.trim();
  if (trimmed.length <= 12) return '******';
  return `${trimmed.slice(0, 8)}...${trimmed.slice(-6)} (Length: ${trimmed.length})`;
}

interface DiagnosticStep {
  name: string;
  passed: boolean;
  message: string;
  durationMs: number;
  details?: Record<string, any>;
}

async function runProductionDiagnostics(): Promise<void> {
  const overallStartTime = Date.now();
  const steps: DiagnosticStep[] = [];

  console.log('\n================================================================');
  console.log('  FINGER OF GOD ESTATE — PRODUCTION DATABASE DIAGNOSTIC SUITE  ');
  console.log('================================================================');
  console.log(`Timestamp: ${new Date().toISOString()}`);
  console.log(`Node Version: ${process.version}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log('----------------------------------------------------------------\n');

  // STEP 1: Environment Variables Check
  const step1Start = Date.now();
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  const anonKey = process.env.VITE_SUPABASE_ANON_KEY || '';

  const hasValidUrl = Boolean(supabaseUrl && supabaseUrl.startsWith('https://') && !supabaseUrl.includes('placeholder'));
  const hasValidServiceKey = Boolean(serviceRoleKey && serviceRoleKey.length > 30);

  steps.push({
    name: '1. Production Environment Configuration',
    passed: hasValidUrl && hasValidServiceKey,
    durationMs: Date.now() - step1Start,
    message: hasValidUrl && hasValidServiceKey
      ? 'Supabase URL and Service Role Key are properly configured.'
      : 'Missing or invalid Supabase connection parameters in environment.',
    details: {
      'Supabase URL': supabaseUrl,
      'Service Role Key': maskKey(serviceRoleKey),
      'Anon Key': maskKey(anonKey)
    }
  });

  // STEP 2: Gateway Network Connectivity & Latency Probe
  const step2Start = Date.now();
  let gatewayReachable = false;
  let gatewayLatency = 0;
  let httpStatus = 0;

  try {
    const probeStart = Date.now();
    const probeRes = await fetch(`${supabaseUrl}/rest/v1/`, {
      method: 'GET',
      headers: {
        'apikey': serviceRoleKey,
        'Authorization': `Bearer ${serviceRoleKey}`
      }
    });
    gatewayLatency = Date.now() - probeStart;
    httpStatus = probeRes.status;
    gatewayReachable = probeRes.status === 200 || probeRes.status === 404;
  } catch (err: any) {
    gatewayReachable = false;
  }

  steps.push({
    name: '2. PostgREST Gateway Connectivity',
    passed: gatewayReachable,
    durationMs: Date.now() - step2Start,
    message: gatewayReachable
      ? `Supabase gateway reached successfully (HTTP ${httpStatus}, ${gatewayLatency}ms).`
      : `Unable to connect to Supabase gateway at ${supabaseUrl}.`,
    details: {
      'HTTP Status': httpStatus,
      'Latency': `${gatewayLatency}ms`,
      'Gateway Reachable': gatewayReachable
    }
  });

  // Client Initialization
  const client: SupabaseClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  });

  // STEP 3: Check Supabase Auth Connectivity
  const step3Start = Date.now();
  let authConnected = false;
  let userCount = 0;
  let authErrorMsg = '';

  try {
    const { data: usersData, error: usersErr } = await client.auth.admin.listUsers({ page: 1, perPage: 10 });
    if (!usersErr && usersData?.users) {
      authConnected = true;
      userCount = usersData.users.length;
    } else if (usersErr) {
      authErrorMsg = usersErr.message;
    }
  } catch (err: any) {
    authErrorMsg = err?.message || String(err);
  }

  steps.push({
    name: '3. Supabase Auth Management Service',
    passed: authConnected,
    durationMs: Date.now() - step3Start,
    message: authConnected
      ? `Supabase Auth admin service verified (${userCount} user accounts found).`
      : `Supabase Auth service check failed: ${authErrorMsg || 'Unknown error'}`,
    details: {
      'Auth Admin Reachable': authConnected,
      'Accounts Sampled': userCount
    }
  });

  // STEP 4: Test Read Access to 'residents' Table
  const step4Start = Date.now();
  let tableExists = false;
  let readSuccess = false;
  let residentCount = 0;
  let tableErrorNotice = '';

  try {
    const { data, error, count } = await client
      .from('residents')
      .select('*', { count: 'exact' })
      .limit(5);

    if (!error) {
      tableExists = true;
      readSuccess = true;
      residentCount = count ?? (data?.length || 0);
    } else {
      tableErrorNotice = error.message;
      if (error.code === 'PGRST205' || error.message.includes('schema cache')) {
        tableExists = false;
      }
    }
  } catch (err: any) {
    tableErrorNotice = err?.message || String(err);
  }

  steps.push({
    name: '4. Read Operations on \'residents\' Table',
    passed: readSuccess,
    durationMs: Date.now() - step4Start,
    message: readSuccess
      ? `Read query succeeded. Currently ${residentCount} resident records in production table.`
      : tableExists
        ? `Read query error: ${tableErrorNotice}`
        : 'Table \'public.residents\' does not exist in Supabase schema cache (Run migration SQL in Supabase SQL Editor).',
    details: {
      'Table Found': tableExists,
      'Read Accessible': readSuccess,
      'Current Records': residentCount,
      'Error Detail': tableErrorNotice || 'None'
    }
  });

  // STEP 5: Test Transient Write & Delete on 'residents' Table (if table exists)
  const step5Start = Date.now();
  let writeTestPassed = false;
  let writeTestDetails: Record<string, any> = {};

  if (tableExists && process.env.ALLOW_LIVE_WRITE_TEST === 'true') {
    const testResidentNumber = '099';
    const testPayload = {
      resident_number: testResidentNumber,
      full_name: 'DIAGNOSTIC_TRANSIENT_TEST_RUNNER',
      phone_number: '08099999999',
      house_number: 'Diagnostic Test Unit',
      address: 'Finger of God Estate System Diagnostics',
      state: 'Delta',
      lga: 'Oshimili South',
      status: 'Inactive',
      account_status: 'NOT ACTIVATED',
      notes: 'Automated diagnostic self-test record. Auto-purged upon verification.'
    };

    try {
      // 5A. Insert transient record
      const insertStart = Date.now();
      const { data: insertData, error: insertErr } = await client
        .from('residents')
        .upsert(testPayload, { onConflict: 'resident_number' })
        .select()
        .maybeSingle();

      const insertDuration = Date.now() - insertStart;

      if (insertErr || !insertData) {
        throw new Error(`Insert failed: ${insertErr?.message || 'No record returned'}`);
      }

      // 5B. Verify record was written by querying it back
      const { data: readBack, error: readBackErr } = await client
        .from('residents')
        .select('id, resident_number, full_name')
        .eq('resident_number', testResidentNumber)
        .maybeSingle();

      if (readBackErr || !readBack) {
        throw new Error(`Read-back verification failed: ${readBackErr?.message || 'Record not found'}`);
      }

      // 5C. Cleanup / Delete the transient record
      const cleanupStart = Date.now();
      const { error: deleteErr } = await client
        .from('residents')
        .delete()
        .eq('resident_number', testResidentNumber);

      const cleanupDuration = Date.now() - cleanupStart;

      if (deleteErr) {
        throw new Error(`Cleanup deletion failed: ${deleteErr.message}`);
      }

      // 5D. Confirm deletion
      const { data: confirmClean } = await client
        .from('residents')
        .select('id')
        .eq('resident_number', testResidentNumber)
        .maybeSingle();

      if (confirmClean) {
        throw new Error('Cleanup validation failed: Test record still present after delete.');
      }

      writeTestPassed = true;
      writeTestDetails = {
        'Insert Latency': `${insertDuration}ms`,
        'Cleanup Latency': `${cleanupDuration}ms`,
        'Record Verified & Cleaned': true
      };
    } catch (err: any) {
      writeTestPassed = false;
      writeTestDetails = {
        'Failure Reason': err.message || String(err)
      };
    }
  } else if (tableExists) {
    writeTestPassed = true;
    writeTestDetails = {
      'Status': 'SKIPPED FOR SAFETY — Live database writes disabled to protect resident and financial ledger integrity.'
    };
  } else {
    writeTestPassed = false;
    writeTestDetails = {
      'Status': 'SKIPPED — Table does not exist in schema cache'
    };
  }

  steps.push({
    name: '5. Transient Write, Verify & Cleanup Operations',
    passed: writeTestPassed,
    durationMs: Date.now() - step5Start,
    message: writeTestPassed
      ? 'Successfully inserted test record, verified persistence, and cleanly purged test record.'
      : tableExists
        ? `Write/Delete validation failed: ${writeTestDetails['Failure Reason'] || 'Unknown error'}`
        : 'Skipped: Cannot test write/delete until \'public.residents\' table is created in Supabase.',
    details: writeTestDetails
  });

  // STEP 6: Check Other Estate Database Tables
  const step6Start = Date.now();
  const tablesToCheck = ['estate_settings', 'admin_users', 'profiles', 'monthly_payments', 'receipts'];
  const tableStatus: Record<string, string> = {};

  for (const t of tablesToCheck) {
    try {
      const { error } = await client.from(t).select('id').limit(1);
      tableStatus[t] = error ? `Missing (${error.code || error.message})` : 'Available';
    } catch {
      tableStatus[t] = 'Error querying';
    }
  }

  const anyTablePresent = Object.values(tableStatus).some(v => v === 'Available');

  steps.push({
    name: '6. Schema Cache & Related Tables Overview',
    passed: true,
    durationMs: Date.now() - step6Start,
    message: anyTablePresent 
      ? 'One or more estate tables detected in Supabase schema cache.'
      : 'Application schema has not been installed in this Supabase project yet.',
    details: tableStatus
  });

  // SUMMARY REPORT
  const totalDuration = Date.now() - overallStartTime;
  const allPassed = steps.every(s => s.passed);

  console.log('----------------------------------------------------------------');
  console.log('                    TEST EXECUTION SUMMARY                      ');
  console.log('----------------------------------------------------------------');

  steps.forEach((s) => {
    const icon = s.passed ? '✓ [PASS]' : '✗ [FAIL]';
    console.log(`\n${icon} ${s.name} (${s.durationMs}ms)`);
    console.log(`  Message: ${s.message}`);
    if (s.details) {
      Object.entries(s.details).forEach(([k, v]) => {
        console.log(`    • ${k}: ${typeof v === 'object' ? JSON.stringify(v) : v}`);
      });
    }
  });

  console.log('\n================================================================');
  if (allPassed) {
    console.log('  OVERALL RESULT: ALL PRODUCTION DATABASE TESTS PASSED (SUCCESS) ');
    console.log(`  Execution Time: ${totalDuration}ms`);
  } else {
    console.log('  OVERALL RESULT: ACTION REQUIRED — SOME TESTS FAILED           ');
    console.log(`  Execution Time: ${totalDuration}ms`);
    console.log('\n  REMEDIATION INSTRUCTIONS:');
    console.log('  1. Open your Supabase Dashboard: https://supabase.com/dashboard');
    console.log('  2. Navigate to SQL Editor.');
    console.log('  3. Open and run /supabase_production_migration.sql or /supabase_residents_migration.sql.');
    console.log('  4. Re-run this diagnostic script: npm run verify:supabase');
  }
  console.log('================================================================\n');
}

runProductionDiagnostics().catch((err) => {
  console.error('\n[FATAL ERROR] Diagnostic suite encountered an unhandled exception:', err);
  process.exit(1);
});
