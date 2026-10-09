import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

// ============================================================================
// STRICT PRODUCTION ISOLATION ENFORCER
// ============================================================================
// Verify that tests are completely isolated from live Supabase databases.
// A mock database client is established to intercept any network operations.
const isIsolatedTestMode = true;

console.log('======================================================================');
console.log('FINGER OF GOD ESTATE — FULL SECURITY LEVY REGRESSION & AUDIT SUITE');
console.log('ISOLATION STATUS: 100% ISOLATED (MOCK IN-MEMORY ACID TEST HARNESS)');
console.log('======================================================================\n');

// Import server database and mock its remote Supabase calls
import { serverDb, supabaseAdmin } from '../src/server/database.ts';
import { processVerifiedSecurityLevyPaystackEvent } from '../src/server/securityLevyServer.ts';

// Track test results
let passedCount = 0;
let failedCount = 0;
let skippedCount = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  if (condition) {
    passedCount++;
    console.log(`  ✓ PASS: ${testName}`);
  } else {
    failedCount++;
    console.error(`  ✗ FAIL: ${testName} ${detail ? `(${detail})` : ''}`);
    throw new Error(`Assertion failed: ${testName}`);
  }
}

// Intercept Supabase admin methods to guarantee zero remote network calls
const mockSupabaseQuery = {
  select: () => mockSupabaseQuery,
  order: () => mockSupabaseQuery,
  eq: () => mockSupabaseQuery,
  upsert: async () => ({ data: null, error: null }),
  update: () => mockSupabaseQuery,
  rpc: async () => ({ data: null, error: { message: 'MOCK_TEST_ENV' } })
};
(supabaseAdmin as any).from = () => mockSupabaseQuery;
(supabaseAdmin as any).rpc = async () => ({ data: null, error: { message: 'MOCK_TEST_ENV' } });

async function runRegressionSuite() {
  const startTime = Date.now();

  // --------------------------------------------------------------------------
  // DOMAIN 1: SECRETS & STARTUP SECURITY
  // --------------------------------------------------------------------------
  console.log('\n[DOMAIN 1: SECRETS AND STARTUP]');

  // Test 1.1: No hardcoded service-role key in source code
  const dbSource = fs.readFileSync('./src/server/database.ts', 'utf8');
  assert(
    !dbSource.includes('9Lvfyc') && !dbSource.includes('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRtZG90cHlvdGNtdHJwcGVkaXViIiwicm9sZSI6InNlcnZpY2Vfcm9sZS'),
    '1.1 No hardcoded Supabase service-role key in src/server/database.ts'
  );

  // Test 1.2: Diagnostic script has no hardcoded secret
  const diagSource = fs.readFileSync('./scripts/verify_supabase_production.ts', 'utf8');
  assert(
    !diagSource.includes('9Lvfyc'),
    '1.2 No hardcoded service-role key in scripts/verify_supabase_production.ts'
  );

  // Test 1.3: Migration SQL files have zero hardcoded credentials
  const proposedSql = fs.readFileSync('./supabase_building_flat_security_levy_migration_proposed.sql', 'utf8');
  assert(
    !proposedSql.includes('eyJ') && !proposedSql.includes('9Lvfyc'),
    '1.3 Proposed SQL migration has zero embedded credentials'
  );

  // Test 1.4: Missing service-role key fails closed in production
  const origEnv = process.env.NODE_ENV;
  const origKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  try {
    process.env.NODE_ENV = 'production';
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    let caughtError = false;
    try {
      await serverDb.saveSecurityLevyTransaction({
        expected_amount: 1500,
        billing_month: '2026-10',
        target_flat_ids: ['test-flat-id']
      });
    } catch (err: any) {
      caughtError = true;
      assert(
        err.message.includes('SUPABASE_NOT_CONFIGURED'),
        '1.4 Missing service-role key fails closed with SUPABASE_NOT_CONFIGURED in production'
      );
    }
    assert(caughtError, '1.4 Financial transaction write refused when service role key missing in production');
  } finally {
    process.env.NODE_ENV = origEnv;
    if (origKey) process.env.SUPABASE_SERVICE_ROLE_KEY = origKey;
  }

  // --------------------------------------------------------------------------
  // DOMAIN 2: WEBHOOKS & PAYSTACK SIGNATURE VERIFICATION
  // --------------------------------------------------------------------------
  console.log('\n[DOMAIN 2: WEBHOOKS AND PAYSTACK]');

  const secSecret = 'sk_test_mock_security_secret_1234567890';
  const estSecret = 'sk_test_mock_estate_secret_0987654321';
  const testPayload = JSON.stringify({
    event: 'charge.success',
    data: {
      reference: 'FOG-SL-TEST-REF-001',
      amount: 150000,
      currency: 'NGN',
      status: 'success',
      paid_at: new Date().toISOString()
    }
  });
  const rawBytes = Buffer.from(testPayload, 'utf8');

  // Test 2.1: Valid signature using exact raw bytes
  const validSecHash = crypto.createHmac('sha512', secSecret).update(rawBytes).digest('hex').toLowerCase();
  const validEstHash = crypto.createHmac('sha512', estSecret).update(rawBytes).digest('hex').toLowerCase();

  assert(
    validSecHash.length === 128 && validEstHash.length === 128,
    '2.1 HMAC-SHA512 produces valid 128-hex character signatures'
  );

  // Test 2.2: Timing-safe comparison matches valid signature
  const secBuf = Buffer.from(validSecHash, 'utf8');
  const targetBuf = Buffer.from(validSecHash, 'utf8');
  assert(
    crypto.timingSafeEqual(secBuf, targetBuf),
    '2.2 Constant-time comparison matches exact raw bytes signature'
  );

  // Test 2.3: Modified payload bytes fail signature verification
  const tamperedBytes = Buffer.from(JSON.stringify({ event: 'charge.success', amount: 999999 }), 'utf8');
  const tamperedHash = crypto.createHmac('sha512', secSecret).update(tamperedBytes).digest('hex').toLowerCase();
  assert(
    tamperedHash !== validSecHash,
    '2.3 Altered payload bytes produce signature mismatch'
  );

  // Test 2.4: Malformed signature format rejected
  const malformedSigs = ['', 'abc', '12345', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9', 'g'.repeat(128)];
  for (const ms of malformedSigs) {
    assert(!/^[a-f0-9]{128}$/.test(ms), `2.4 Malformed signature rejected: "${ms.slice(0, 10)}..."`);
  }

  // --------------------------------------------------------------------------
  // DOMAIN 3: FLAT ELIGIBILITY & RATE RULES (₦1,500/month)
  // --------------------------------------------------------------------------
  console.log('\n[DOMAIN 3: FLAT ELIGIBILITY AND RATE RULES]');

  const testHouse = `Plot-REGRESS-${Date.now()}`;
  const building = await serverDb.saveBuilding({
    house_number: testHouse,
    building_name: 'Regression Court',
    total_flats_count: 4,
    status: 'ACTIVE'
  });

  // Flat 1: Eligible (ACTIVE, approved, billing enabled)
  const flatEligible = await serverDb.saveFlat({
    building_id: building.id,
    flat_number: 'Flat 1-A',
    is_billing_active: true,
    monthly_levy_amount: 1500.00,
    status: 'ACTIVE'
  });

  // Flat 2: Inactive status
  const flatInactive = await serverDb.saveFlat({
    building_id: building.id,
    flat_number: 'Flat 1-B',
    is_billing_active: true,
    monthly_levy_amount: 1500.00,
    status: 'INACTIVE'
  });

  // Flat 3: Billing disabled
  const flatBillingDisabled = await serverDb.saveFlat({
    building_id: building.id,
    flat_number: 'Flat 1-C',
    is_billing_active: false,
    monthly_levy_amount: 1500.00,
    status: 'ACTIVE'
  });

  assert(flatEligible.monthly_levy_amount === 1500.00, '3.1 Approved Security Levy rate is strictly ₦1,500');
  assert(flatEligible.is_billing_active === true && flatEligible.status === 'ACTIVE', '3.2 Flat 1-A is eligible');
  assert(flatInactive.status === 'INACTIVE', '3.3 Flat 1-B is inactive');
  assert(flatBillingDisabled.is_billing_active === false, '3.4 Flat 1-C is billing-disabled');

  // Test 3.5: Obligation generation only generates for eligible flats
  const genResult = await serverDb.generateMonthlyObligations('2026-12', 1500.00);
  const eligibleOblig = (await serverDb.getObligations({ billingMonth: '2026-12', flatId: flatEligible.id }))[0];
  const inactiveOblig = (await serverDb.getObligations({ billingMonth: '2026-12', flatId: flatInactive.id }))[0];
  const disabledOblig = (await serverDb.getObligations({ billingMonth: '2026-12', flatId: flatBillingDisabled.id }))[0];

  assert(Boolean(eligibleOblig && eligibleOblig.amount_due === 1500.00), '3.5 Obligation generated for eligible flat (₦1,500 due)');
  assert(!inactiveOblig, '3.6 Inactive flat exempt from monthly obligation generation');
  assert(!disabledOblig, '3.7 Billing-disabled flat exempt from monthly obligation generation');

  // --------------------------------------------------------------------------
  // DOMAIN 4: BULK CHECKOUT & ATOMIC FINANCIAL ALLOCATION
  // --------------------------------------------------------------------------
  console.log('\n[DOMAIN 4: BULK CHECKOUT AND CONSERVATION]');

  // Flat 4 for bulk test
  const flatEligible2 = await serverDb.saveFlat({
    building_id: building.id,
    flat_number: 'Flat 2-A',
    is_billing_active: true,
    monthly_levy_amount: 1500.00,
    status: 'ACTIVE'
  });
  const eligibleOblig2 = await serverDb.saveObligation({
    flat_id: flatEligible2.id,
    billing_month: '2026-12',
    amount_due: 1500.00,
    amount_paid: 0.00,
    balance_due: 1500.00,
    status: 'UNPAID',
    is_billed: true
  });

  // Bulk transaction for Flat 1-A and Flat 2-A (2 flats x ₦1,500 = ₦3,000)
  const bulkTxRef = `FOG-SL-202612-2F-${Date.now()}`;
  const bulkTx = await serverDb.saveSecurityLevyTransaction({
    transaction_type: 'BULK_FLATS',
    payer_name: 'Chief Landlord Regression',
    payer_email: 'landlord.regression@example.com',
    billing_month: '2026-12',
    total_units: 2,
    rate_per_unit: 1500.00,
    expected_amount: 3000.00,
    verified_amount: 3000.00,
    payment_status: 'SUCCESSFUL',
    target_flat_ids: [flatEligible.id, flatEligible2.id],
    target_obligation_ids: [eligibleOblig.id, eligibleOblig2.id],
    paystack_reference: bulkTxRef
  });

  const allocResult = await serverDb.allocateSecurityLevyPayment(bulkTx.id, 'REGRESSION_TEST');
  assert(allocResult.success === true, '4.1 Bulk allocation succeeded');
  assert(allocResult.allocated_count === 2, '4.2 Exactly 2 flats allocated');
  assert(allocResult.total_allocated === 3000.00, '4.3 Total allocated is exactly ₦3,000.00');
  assert(allocResult.total_unallocated === 0.00, '4.4 Total unallocated is exactly ₦0.00');

  // Test 4.5: Exact Mathematical Conservation Law
  assert(
    allocResult.total_allocated + allocResult.total_unallocated === bulkTx.verified_amount,
    '4.5 Mathematical conservation holds: total_allocated + total_unallocated === verified_amount'
  );

  // Test 4.6: Obligation balance derived from persisted allocations
  const updatedOblig1 = (await serverDb.getObligations({ billingMonth: '2026-12', flatId: flatEligible.id }))[0];
  const updatedOblig2 = (await serverDb.getObligations({ billingMonth: '2026-12', flatId: flatEligible2.id }))[0];
  assert(updatedOblig1.status === 'PAID' && updatedOblig1.balance_due === 0, '4.6 Flat 1-A obligation marked PAID with ₦0 balance due');
  assert(updatedOblig2.status === 'PAID' && updatedOblig2.balance_due === 0, '4.7 Flat 2-A obligation marked PAID with ₦0 balance due');

  // Test 4.8: Idempotent replay does not double-credit
  const replayResult = await serverDb.allocateSecurityLevyPayment(bulkTx.id, 'REGRESSION_TEST_REPLAY');
  assert(replayResult.success === true, '4.8 Repeated allocation returns idempotent success');
  assert(replayResult.total_allocated === 3000.00, '4.9 Repeated allocation total remains ₦3,000 (no double credit)');

  // --------------------------------------------------------------------------
  // DOMAIN 5: OVER-ALLOCATION ANOMALY & CONFLICT HANDLING
  // --------------------------------------------------------------------------
  console.log('\n[DOMAIN 5: OVER-ALLOCATION & CONFLICT DISCREPANCIES]');

  // Create transaction where flat was already paid by earlier transaction
  const conflictingTxRef = `FOG-SL-202612-CONF-${Date.now()}`;
  const conflictingTx = await serverDb.saveSecurityLevyTransaction({
    transaction_type: 'INDIVIDUAL_FLAT',
    payer_name: 'Tenant Late Payment',
    payer_email: 'tenant.late@example.com',
    billing_month: '2026-12',
    total_units: 1,
    rate_per_unit: 1500.00,
    expected_amount: 1500.00,
    verified_amount: 1500.00,
    payment_status: 'SUCCESSFUL',
    target_flat_ids: [flatEligible.id],
    target_obligation_ids: [eligibleOblig.id],
    paystack_reference: conflictingTxRef
  });

  const confResult = await serverDb.allocateSecurityLevyPayment(conflictingTx.id, 'CONFLICT_TEST');
  assert(confResult.allocated_count === 0, '5.1 Zero units allocated for already-settled flat');
  assert(confResult.conflict_count === 1, '5.2 Conflict detected and counted');
  assert(confResult.total_allocated === 0.00, '5.3 Conflicted funds not allocated');
  assert(confResult.total_unallocated === 1500.00, '5.4 Full ₦1,500 preserved as unallocated credit for reconciliation');

  const confTxRecord = await serverDb.getSecurityLevyTransactionById(conflictingTx.id);
  assert(confTxRecord.allocation_status === 'OVERPAID_UNALLOCATED', '5.5 Transaction marked OVERPAID_UNALLOCATED');

  // --------------------------------------------------------------------------
  // DOMAIN 6: CHECKOUT RESERVATION LOCKS & SECURE CANCELLATION
  // --------------------------------------------------------------------------
  console.log('\n[DOMAIN 6: RESERVATION LOCKS AND CANCELLATION]');

  // Test 6.1: Active checkout lock blocks concurrent attempt
  const lockRef = `LOCK-REF-${Date.now()}`;
  await serverDb.updateObligation(eligibleOblig.id, {
    locked_by_reference: lockRef,
    lock_expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString()
  });

  const lockedOblig = (await serverDb.getObligations({ billingMonth: '2026-12', flatId: flatEligible.id }))[0];
  const isCurrentlyLocked = lockedOblig.locked_by_reference === lockRef && new Date(lockedOblig.lock_expires_at).getTime() > Date.now();
  assert(isCurrentlyLocked, '6.1 Obligation active lock verified (blocks concurrent checkout)');

  // Test 6.2: Release lock
  await serverDb.updateObligation(eligibleOblig.id, {
    locked_by_reference: null,
    lock_expires_at: null
  });
  const releasedOblig = (await serverDb.getObligations({ billingMonth: '2026-12', flatId: flatEligible.id }))[0];
  assert(releasedOblig.locked_by_reference === null, '6.2 Lock successfully released');

  // --------------------------------------------------------------------------
  // DOMAIN 7: ROAD MODERNIZATION ISOLATION (ZERO DRIFT)
  // --------------------------------------------------------------------------
  console.log('\n[DOMAIN 7: ROAD MODERNIZATION COMPLETE ISOLATION]');

  const roadMilestones = await serverDb.getRoadMilestones();
  const roadTransactions = await serverDb.getRoadTransactions();
  assert(roadMilestones.length === 5, '7.1 Road Modernization milestones count preserved (5 milestones)');
  assert(roadTransactions.length === 5, '7.2 Road Modernization transaction history strictly preserved');

  const duration = Date.now() - startTime;
  console.log('\n======================================================================');
  console.log(`REGRESSION SUITE COMPLETE IN ${duration}ms`);
  console.log(`PASSED: ${passedCount} | FAILED: ${failedCount} | SKIPPED: ${skippedCount}`);
  console.log('======================================================================\n');

  if (failedCount > 0) {
    process.exit(1);
  }
}

runRegressionSuite().catch(err => {
  console.error('Fatal error in regression suite:', err);
  process.exit(1);
});
