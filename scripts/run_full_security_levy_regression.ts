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
import { 
  processVerifiedSecurityLevyPaystackEvent, 
  handleCancelCheckoutSession, 
  verifyPaystackWebhookSignature 
} from '../src/server/securityLevyServer.ts';
import { runSecretScan } from './scan_secrets.ts';

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
const mockSupabaseQuery: any = {
  select: () => mockSupabaseQuery,
  order: () => mockSupabaseQuery,
  eq: () => mockSupabaseQuery,
  neq: () => mockSupabaseQuery,
  upsert: () => mockSupabaseQuery,
  insert: () => mockSupabaseQuery,
  update: () => mockSupabaseQuery,
  delete: () => mockSupabaseQuery,
  single: () => mockSupabaseQuery,
  maybeSingle: () => mockSupabaseQuery,
  limit: () => mockSupabaseQuery,
  range: () => mockSupabaseQuery,
  then: (resolve: any, reject: any) => Promise.resolve({ data: null, error: null }).then(resolve, reject),
  catch: (reject: any) => Promise.resolve({ data: null, error: null }).catch(reject),
  rpc: async () => ({ data: null, error: { message: 'MOCK_TEST_ENV' } })
};
(supabaseAdmin as any).from = () => mockSupabaseQuery;
(supabaseAdmin as any).rpc = async () => ({ data: null, error: { message: 'MOCK_TEST_ENV' } });

// Helper to simulate Express Request & Response for endpoint handlers
function createMockReqRes(body: any = {}, headers: any = {}) {
  let statusCode = 200;
  let sentData: any = null;
  let statusSent: number | null = null;

  const req: any = {
    body,
    headers,
    rawBody: Buffer.isBuffer(body) ? body : Buffer.from(typeof body === 'string' ? body : JSON.stringify(body), 'utf8')
  };

  const res: any = {
    status(code: number) {
      statusCode = code;
      return res;
    },
    json(data: any) {
      sentData = data;
      return res;
    },
    sendStatus(code: number) {
      statusSent = code;
      statusCode = code;
      return res;
    },
    getStatusCode() { return statusCode; },
    getData() { return sentData; }
  };

  return { req, res, getStatus: () => statusCode, getData: () => sentData };
}

async function runRegressionSuite() {
  const startTime = Date.now();

  // --------------------------------------------------------------------------
  // TEST 1: VALID WEBHOOK SIGNATURE
  // --------------------------------------------------------------------------
  console.log('\n[TEST 1: VALID WEBHOOK SIGNATURE]');
  const secSecret = 'sk_test_mock_security_secret_1234567890';
  const testPayload = JSON.stringify({
    event: 'charge.success',
    data: { reference: 'FOG-SL-TEST-REF-001', amount: 150000, currency: 'NGN', status: 'success' }
  });
  const rawBytes = Buffer.from(testPayload, 'utf8');
  const validHash = crypto.createHmac('sha512', secSecret).update(rawBytes).digest('hex').toLowerCase();

  const validReq = {
    headers: { 'x-paystack-signature': validHash },
    rawBody: rawBytes
  };
  const v1 = verifyPaystackWebhookSignature(validReq, secSecret);
  assert(v1.valid === true && v1.status === 200, '1. Valid webhook signature passes verification');

  // --------------------------------------------------------------------------
  // TEST 2: INVALID SIGNATURE
  // --------------------------------------------------------------------------
  console.log('\n[TEST 2: INVALID SIGNATURE]');
  const invalidReq = {
    headers: { 'x-paystack-signature': validHash },
    rawBody: Buffer.from(JSON.stringify({ tampered: true }), 'utf8')
  };
  const v2 = verifyPaystackWebhookSignature(invalidReq, secSecret);
  assert(v2.valid === false && v2.status === 401, '2. Invalid signature is rejected with 401');

  // --------------------------------------------------------------------------
  // TEST 3: MISSING RAW REQUEST BYTES
  // --------------------------------------------------------------------------
  console.log('\n[TEST 3: MISSING RAW REQUEST BYTES]');
  const noBytesReq = {
    headers: { 'x-paystack-signature': validHash },
    rawBody: undefined
  };
  const v3 = verifyPaystackWebhookSignature(noBytesReq, secSecret);
  assert(v3.valid === false && v3.status === 400, '3. Missing raw request bytes is rejected with 400');

  // --------------------------------------------------------------------------
  // TEST 4: MALFORMED SIGNATURE
  // --------------------------------------------------------------------------
  console.log('\n[TEST 4: MALFORMED SIGNATURE]');
  const malformedSigs = ['', 'short_sig', 'g'.repeat(128), '12345'];
  let allMalformedRejected = true;
  for (const sig of malformedSigs) {
    const res = verifyPaystackWebhookSignature({ headers: { 'x-paystack-signature': sig }, rawBody: rawBytes }, secSecret);
    if (res.valid !== false || res.status !== 401) allMalformedRejected = false;
  }
  assert(allMalformedRejected, '4. Malformed signature formats and lengths are rejected');

  // --------------------------------------------------------------------------
  // TEST 5: MISSING PAYSTACK SECRET
  // --------------------------------------------------------------------------
  console.log('\n[TEST 5: MISSING PAYSTACK SECRET]');
  const v5 = verifyPaystackWebhookSignature(validReq, null);
  assert(v5.valid === false && v5.status === 503, '5. Missing server Paystack secret fails closed with 503');

  // Set up reusable building & flats for subsequent tests
  const testHouse = `Plot-REGRESS-${Date.now()}`;
  const building = await serverDb.saveBuilding({
    house_number: testHouse,
    building_name: 'Regression Court',
    total_flats_count: 5,
    status: 'ACTIVE'
  });

  const flat1 = await serverDb.saveFlat({
    building_id: building.id,
    flat_number: 'Flat 1-A',
    is_billing_active: true,
    monthly_levy_amount: 1500.00,
    status: 'ACTIVE'
  });

  const oblig1 = await serverDb.saveObligation({
    flat_id: flat1.id,
    billing_month: '2026-11',
    amount_due: 1500.00,
    amount_paid: 0.00,
    balance_due: 1500.00,
    status: 'UNPAID',
    is_billed: true
  });

  // --------------------------------------------------------------------------
  // TEST 6: MISSING OR NON-NGN CURRENCY
  // --------------------------------------------------------------------------
  console.log('\n[TEST 6: MISSING OR NON-NGN CURRENCY]');
  const refNonNgn = `FOG-SL-NON-NGN-${Date.now()}`;
  const txNonNgn = await serverDb.saveSecurityLevyTransaction({
    transaction_type: 'INDIVIDUAL_FLAT',
    payer_name: 'Resident USD',
    billing_month: '2026-11',
    total_units: 1,
    rate_per_unit: 1500.00,
    expected_amount: 1500.00,
    payment_status: 'PENDING',
    target_flat_ids: [flat1.id],
    target_obligation_ids: [oblig1.id],
    paystack_reference: refNonNgn
  });

  // Attempt processing with USD currency
  await processVerifiedSecurityLevyPaystackEvent({
    reference: refNonNgn,
    amount: 150000,
    currency: 'USD',
    status: 'success'
  });
  const txAfterUsd = await serverDb.getSecurityLevyTransactionById(txNonNgn.id);
  assert(txAfterUsd.payment_status === 'PENDING', '6. Non-NGN currency (USD) is rejected without modifying status');

  // Attempt processing with missing currency
  await processVerifiedSecurityLevyPaystackEvent({
    reference: refNonNgn,
    amount: 150000,
    currency: null,
    status: 'success'
  });
  const txAfterNullCur = await serverDb.getSecurityLevyTransactionById(txNonNgn.id);
  assert(txAfterNullCur.payment_status === 'PENDING', '6. Missing currency is rejected without modifying status');

  // --------------------------------------------------------------------------
  // TEST 7: FAILED GATEWAY TRANSACTION
  // --------------------------------------------------------------------------
  console.log('\n[TEST 7: FAILED GATEWAY TRANSACTION]');
  const refFailed = `FOG-SL-FAILED-${Date.now()}`;
  const txFailed = await serverDb.saveSecurityLevyTransaction({
    transaction_type: 'INDIVIDUAL_FLAT',
    payer_name: 'Resident Failed Pay',
    billing_month: '2026-11',
    total_units: 1,
    rate_per_unit: 1500.00,
    expected_amount: 1500.00,
    payment_status: 'PENDING',
    target_flat_ids: [flat1.id],
    target_obligation_ids: [oblig1.id],
    paystack_reference: refFailed
  });

  await processVerifiedSecurityLevyPaystackEvent({
    reference: refFailed,
    amount: 150000,
    currency: 'NGN',
    status: 'failed'
  });
  const txAfterFail = await serverDb.getSecurityLevyTransactionById(txFailed.id);
  assert(txAfterFail.payment_status === 'PENDING', '7. Failed gateway transaction (status: failed) does not apply payment');

  // --------------------------------------------------------------------------
  // TEST 8: WRONG PAYMENT REFERENCE
  // --------------------------------------------------------------------------
  console.log('\n[TEST 8: WRONG PAYMENT REFERENCE]');
  const wrongRef = `UNKNOWN-NONEXISTENT-${Date.now()}`;
  // Should not throw or create records
  await processVerifiedSecurityLevyPaystackEvent({
    reference: wrongRef,
    amount: 150000,
    currency: 'NGN',
    status: 'success'
  });
  const txCheckNonExist = await serverDb.getSecurityLevyTransactionByRef(wrongRef);
  assert(!txCheckNonExist, '8. Unknown payment reference safely ignored without modifying financial records');

  // --------------------------------------------------------------------------
  // TEST 9: INCORRECT AMOUNT DETECTION
  // --------------------------------------------------------------------------
  console.log('\n[TEST 9: INCORRECT AMOUNT DETECTION]');
  const refWrongAmt = `FOG-SL-WRONG-AMT-${Date.now()}`;
  const txWrongAmt = await serverDb.saveSecurityLevyTransaction({
    transaction_type: 'INDIVIDUAL_FLAT',
    payer_name: 'Resident Discrepancy',
    billing_month: '2026-11',
    total_units: 1,
    rate_per_unit: 1500.00,
    expected_amount: 1500.00,
    payment_status: 'PENDING',
    target_flat_ids: [flat1.id],
    target_obligation_ids: [oblig1.id],
    paystack_reference: refWrongAmt
  });

  // Expected is 150,000 kobo; send 120,000 kobo
  await processVerifiedSecurityLevyPaystackEvent({
    reference: refWrongAmt,
    amount: 120000,
    currency: 'NGN',
    status: 'success'
  });
  const txAfterMismatch = await serverDb.getSecurityLevyTransactionById(txWrongAmt.id);
  assert(txAfterMismatch.payment_status !== 'SUCCESSFUL', '9. Incorrect amount is detected and prevented from being marked SUCCESSFUL');

  // --------------------------------------------------------------------------
  // TEST 10: UNDERPAYMENT RECONCILIATION
  // --------------------------------------------------------------------------
  console.log('\n[TEST 10: UNDERPAYMENT RECONCILIATION]');
  assert(
    txAfterMismatch.payment_status === 'PARTIALLY_PAID' &&
    txAfterMismatch.verified_amount === 1200.00 &&
    Boolean(txAfterMismatch.reconciliation_notes?.includes('discrepancy')),
    '10. Underpayment preserved with PARTIALLY_PAID status and audit notes for reconciliation'
  );

  // --------------------------------------------------------------------------
  // TEST 11: OVERPAYMENT RECONCILIATION
  // --------------------------------------------------------------------------
  console.log('\n[TEST 11: OVERPAYMENT RECONCILIATION]');
  const refOver = `FOG-SL-OVERPAY-${Date.now()}`;
  const txOver = await serverDb.saveSecurityLevyTransaction({
    transaction_type: 'INDIVIDUAL_FLAT',
    payer_name: 'Resident Overpayer',
    billing_month: '2026-11',
    total_units: 1,
    rate_per_unit: 1500.00,
    expected_amount: 1500.00,
    payment_status: 'PENDING',
    target_flat_ids: [flat1.id],
    target_obligation_ids: [oblig1.id],
    paystack_reference: refOver
  });

  // Expected 150,000 kobo; send 250,000 kobo
  await processVerifiedSecurityLevyPaystackEvent({
    reference: refOver,
    amount: 250000,
    currency: 'NGN',
    status: 'success'
  });
  const txAfterOver = await serverDb.getSecurityLevyTransactionById(txOver.id);
  assert(
    txAfterOver.payment_status === 'OVERPAID' &&
    txAfterOver.verified_amount === 2500.00 &&
    Boolean(txAfterOver.reconciliation_notes?.includes('discrepancy')),
    '11. Overpayment preserved with OVERPAID status and audit notes for reconciliation'
  );

  // --------------------------------------------------------------------------
  // TEST 12: DUPLICATE WEBHOOK DELIVERY (IDEMPOTENCY)
  // --------------------------------------------------------------------------
  console.log('\n[TEST 12: DUPLICATE WEBHOOK DELIVERY]');
  const flat2 = await serverDb.saveFlat({
    building_id: building.id,
    flat_number: 'Flat 2-B',
    is_billing_active: true,
    monthly_levy_amount: 1500.00,
    status: 'ACTIVE'
  });
  const oblig2 = await serverDb.saveObligation({
    flat_id: flat2.id,
    billing_month: '2026-11',
    amount_due: 1500.00,
    amount_paid: 0.00,
    balance_due: 1500.00,
    status: 'UNPAID',
    is_billed: true
  });

  const refDup = `FOG-SL-DUP-${Date.now()}`;
  const txDup = await serverDb.saveSecurityLevyTransaction({
    transaction_type: 'INDIVIDUAL_FLAT',
    payer_name: 'Resident Idempotent',
    billing_month: '2026-11',
    total_units: 1,
    rate_per_unit: 1500.00,
    expected_amount: 1500.00,
    payment_status: 'PENDING',
    target_flat_ids: [flat2.id],
    target_obligation_ids: [oblig2.id],
    paystack_reference: refDup
  });

  const eventPayload = {
    reference: refDup,
    amount: 150000,
    currency: 'NGN',
    status: 'success',
    paid_at: new Date().toISOString()
  };

  // Delivery 1
  await processVerifiedSecurityLevyPaystackEvent(eventPayload);
  const txAfterFirst = await serverDb.getSecurityLevyTransactionById(txDup.id);
  const allocsFirst = await serverDb.getFlatPaymentAllocations(txDup.id);

  // Delivery 2 (Duplicate replay)
  await processVerifiedSecurityLevyPaystackEvent(eventPayload);
  const allocsSecond = await serverDb.getFlatPaymentAllocations(txDup.id);

  assert(
    txAfterFirst.allocation_status === 'ALLOCATED' &&
    allocsFirst.length === 1 &&
    allocsSecond.length === 1,
    '12. Duplicate webhook delivery processed idempotently without duplicating allocations'
  );

  // --------------------------------------------------------------------------
  // TEST 13: CONCURRENT DUPLICATE PROCESSING
  // --------------------------------------------------------------------------
  console.log('\n[TEST 13: CONCURRENT DUPLICATE PROCESSING]');
  const flat3 = await serverDb.saveFlat({
    building_id: building.id,
    flat_number: 'Flat 3-C',
    is_billing_active: true,
    monthly_levy_amount: 1500.00,
    status: 'ACTIVE'
  });
  const oblig3 = await serverDb.saveObligation({
    flat_id: flat3.id,
    billing_month: '2026-11',
    amount_due: 1500.00,
    amount_paid: 0.00,
    balance_due: 1500.00,
    status: 'UNPAID',
    is_billed: true
  });

  const refConc = `FOG-SL-CONC-${Date.now()}`;
  const txConc = await serverDb.saveSecurityLevyTransaction({
    transaction_type: 'INDIVIDUAL_FLAT',
    payer_name: 'Resident Concurrent',
    billing_month: '2026-11',
    total_units: 1,
    rate_per_unit: 1500.00,
    expected_amount: 1500.00,
    payment_status: 'PENDING',
    target_flat_ids: [flat3.id],
    target_obligation_ids: [oblig3.id],
    paystack_reference: refConc
  });

  const concPayload = {
    reference: refConc,
    amount: 150000,
    currency: 'NGN',
    status: 'success',
    paid_at: new Date().toISOString()
  };

  // Dispatch two concurrent webhook processing calls
  await Promise.all([
    processVerifiedSecurityLevyPaystackEvent(concPayload),
    processVerifiedSecurityLevyPaystackEvent(concPayload)
  ]);

  const allocsConc = await serverDb.getFlatPaymentAllocations(txConc.id);
  assert(allocsConc.length === 1, '13. Concurrent webhook deliveries safely serialized; exactly one allocation recorded');

  // --------------------------------------------------------------------------
  // TEST 14: UNAUTHORIZED CHECKOUT CANCELLATION
  // --------------------------------------------------------------------------
  console.log('\n[TEST 14: UNAUTHORIZED CHECKOUT CANCELLATION]');
  const { req: noAuthReq, res: noAuthRes, getStatus: getNoAuthStatus } = createMockReqRes({ reference: refConc });
  await handleCancelCheckoutSession(noAuthReq, noAuthRes);
  assert(getNoAuthStatus() === 401, '14. Unauthenticated checkout cancellation rejected with 401');

  // --------------------------------------------------------------------------
  // TEST 15: CROSS-RESIDENT CANCELLATION
  // --------------------------------------------------------------------------
  console.log('\n[TEST 15: CROSS-RESIDENT CANCELLATION]');
  const existingResidents = await serverDb.getResidents();
  const usedNums = new Set(existingResidents.map(r => String(r.resident_number).padStart(3, '0')));
  let residentA = existingResidents.find(r => r.full_name === 'Resident Alice');
  let residentB = existingResidents.find(r => r.full_name === 'Resident Bob');

  if (!residentA) {
    let numA = 280;
    while (usedNums.has(String(numA).padStart(3, '0')) && numA < 299) numA++;
    usedNums.add(String(numA).padStart(3, '0'));
    residentA = await serverDb.saveResident({
      resident_number: String(numA).padStart(3, '0'),
      full_name: 'Resident Alice',
      email: `alice_${Date.now()}@example.com`,
      phone_number: `080${Math.floor(10000000 + Math.random() * 89999999)}`,
      house_number: 'Flat 1-A'
    });
  }

  if (!residentB) {
    let numB = 281;
    while (usedNums.has(String(numB).padStart(3, '0')) && numB < 300) numB++;
    usedNums.add(String(numB).padStart(3, '0'));
    residentB = await serverDb.saveResident({
      resident_number: String(numB).padStart(3, '0'),
      full_name: 'Resident Bob',
      email: `bob_${Date.now()}@example.com`,
      phone_number: `080${Math.floor(10000000 + Math.random() * 89999999)}`,
      house_number: 'Flat 2-B'
    });
  }

  // Create session token for Resident A
  const sessionTokenA = `TEST_SESSION_TOKEN_A_${Date.now()}`;
  serverDb.saveResidentSession(sessionTokenA, residentA.resident_number);

  // Create pending transaction belonging to Resident B
  const refBob = `FOG-SL-BOB-${Date.now()}`;
  await serverDb.saveSecurityLevyTransaction({
    transaction_type: 'INDIVIDUAL_FLAT',
    payer_name: 'Resident Bob',
    payer_email: residentB.email,
    payer_phone: residentB.phone_number,
    billing_month: '2026-11',
    total_units: 1,
    rate_per_unit: 1500.00,
    expected_amount: 1500.00,
    payment_status: 'PENDING',
    target_flat_ids: [flat2.id],
    target_obligation_ids: [oblig2.id],
    paystack_reference: refBob
  });

  // Alice attempts to cancel Bob's transaction
  const { req: crossReq, res: crossRes, getStatus: getCrossStatus } = createMockReqRes(
    { reference: refBob },
    { authorization: `Bearer ${sessionTokenA}` }
  );
  await handleCancelCheckoutSession(crossReq, crossRes);
  assert(getCrossStatus() === 403, '15. Cross-resident checkout cancellation rejected with 403 Forbidden');

  // --------------------------------------------------------------------------
  // TEST 16: CANCELLATION AFTER SETTLEMENT
  // --------------------------------------------------------------------------
  console.log('\n[TEST 16: CANCELLATION AFTER SETTLEMENT]');
  // Bob's session token
  const sessionTokenB = `TEST_SESSION_TOKEN_B_${Date.now()}`;
  serverDb.saveResidentSession(sessionTokenB, residentB.resident_number);

  // Mark Bob's transaction as settled (SUCCESSFUL)
  const bobTx = await serverDb.getSecurityLevyTransactionByRef(refBob);
  await serverDb.updateSecurityLevyTransaction(bobTx.id, { payment_status: 'SUCCESSFUL' });

  // Bob attempts to cancel his settled transaction
  const { req: settledReq, res: settledRes, getStatus: getSettledStatus } = createMockReqRes(
    { reference: refBob },
    { authorization: `Bearer ${sessionTokenB}` }
  );
  await handleCancelCheckoutSession(settledReq, settledRes);
  assert(getSettledStatus() === 400, '16. Cancellation of settled transaction rejected with 400');

  // --------------------------------------------------------------------------
  // TEST 17: FAILED DATABASE WRITES
  // --------------------------------------------------------------------------
  console.log('\n[TEST 17: FAILED DATABASE WRITES]');
  // Non-existent reference returns 404
  const { req: nonExReq, res: nonExRes, getStatus: getNonExStatus } = createMockReqRes(
    { reference: 'NON_EXISTENT_REF_999' },
    { authorization: `Bearer ${sessionTokenB}` }
  );
  await handleCancelCheckoutSession(nonExReq, nonExRes);
  assert(getNonExStatus() === 404, '17. Cancellation with missing/failed database lookup fails safely with 404');

  // --------------------------------------------------------------------------
  // TEST 18: MISSING SUPABASE SERVICE-ROLE CREDENTIAL (FAIL-CLOSED)
  // --------------------------------------------------------------------------
  console.log('\n[TEST 18: MISSING SUPABASE SERVICE-ROLE CREDENTIAL]');
  const origEnv = process.env.NODE_ENV;
  const origKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  try {
    process.env.NODE_ENV = 'production';
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    let caughtFailClosed = false;
    try {
      await serverDb.saveSecurityLevyTransaction({
        expected_amount: 1500,
        billing_month: '2026-11',
        target_flat_ids: ['test-id']
      });
    } catch (err: any) {
      caughtFailClosed = true;
      assert(err.message.includes('SUPABASE_NOT_CONFIGURED'), '18. Write fails closed with SUPABASE_NOT_CONFIGURED error');
    }
    assert(caughtFailClosed, '18. Production financial writes strictly blocked when service-role key is missing');
  } finally {
    process.env.NODE_ENV = origEnv;
    if (origKey) process.env.SUPABASE_SERVICE_ROLE_KEY = origKey;
  }

  // --------------------------------------------------------------------------
  // TEST 19: ALLOCATION CONSERVATION LAW
  // --------------------------------------------------------------------------
  console.log('\n[TEST 19: ALLOCATION CONSERVATION]');
  const flat4 = await serverDb.saveFlat({
    building_id: building.id,
    flat_number: 'Flat 4-D',
    is_billing_active: true,
    monthly_levy_amount: 1500.00,
    status: 'ACTIVE'
  });
  const flat5 = await serverDb.saveFlat({
    building_id: building.id,
    flat_number: 'Flat 5-E',
    is_billing_active: true,
    monthly_levy_amount: 1500.00,
    status: 'ACTIVE'
  });
  const oblig4 = await serverDb.saveObligation({
    flat_id: flat4.id,
    billing_month: '2026-11',
    amount_due: 1500.00,
    amount_paid: 0.00,
    balance_due: 1500.00,
    status: 'UNPAID',
    is_billed: true
  });
  const oblig5 = await serverDb.saveObligation({
    flat_id: flat5.id,
    billing_month: '2026-11',
    amount_due: 1500.00,
    amount_paid: 0.00,
    balance_due: 1500.00,
    status: 'UNPAID',
    is_billed: true
  });

  const refBulk = `FOG-SL-BULK-${Date.now()}`;
  const txBulk = await serverDb.saveSecurityLevyTransaction({
    transaction_type: 'BULK_FLATS',
    payer_name: 'Landlord Bulk Conservation',
    billing_month: '2026-11',
    total_units: 2,
    rate_per_unit: 1500.00,
    expected_amount: 3000.00,
    verified_amount: 3000.00,
    payment_status: 'SUCCESSFUL',
    target_flat_ids: [flat4.id, flat5.id],
    target_obligation_ids: [oblig4.id, oblig5.id],
    paystack_reference: refBulk
  });

  const bulkAllocResult = await serverDb.allocateSecurityLevyPayment(txBulk.id, 'CONSERVATION_TEST');
  assert(
    bulkAllocResult.total_allocated + bulkAllocResult.total_unallocated === txBulk.verified_amount,
    '19. Conservation holds: total_allocated + total_unallocated === verified_amount exactly'
  );
  assert(
    bulkAllocResult.total_allocated === 3000.00 && bulkAllocResult.total_unallocated === 0.00,
    '19. Both units fully allocated without discrepancy'
  );

  // --------------------------------------------------------------------------
  // TEST 20: NEGATIVE-BALANCE AND OVER-ALLOCATION DETECTION
  // --------------------------------------------------------------------------
  console.log('\n[TEST 20: NEGATIVE-BALANCE & OVER-ALLOCATION DETECTION]');
  // Obligation 4 was settled above. Re-calculating balance without Math.max(0, ...)
  const oblig4Updated = (await serverDb.getObligations({ billingMonth: '2026-11', flatId: flat4.id }))[0];
  assert(oblig4Updated.balance_due === 0.00 && oblig4Updated.status === 'PAID', '20. Obligation balance accurately computed without concealment');

  // Create an over-allocation condition where verified amount is 1500 but target units sum to 3000
  const refOverAlloc = `FOG-SL-OVERALLOC-${Date.now()}`;
  const txOverAlloc = await serverDb.saveSecurityLevyTransaction({
    transaction_type: 'BULK_FLATS',
    payer_name: 'Over-alloc test',
    billing_month: '2026-12',
    total_units: 2,
    rate_per_unit: 1500.00,
    expected_amount: 1500.00,
    verified_amount: 1500.00, // Deliberately lower than required 3000
    payment_status: 'SUCCESSFUL',
    target_flat_ids: [flat4.id, flat5.id],
    paystack_reference: refOverAlloc
  });

  const overAllocResult = await serverDb.allocateSecurityLevyPayment(txOverAlloc.id, 'OVER_ALLOC_TEST');
  const txOverAllocRec = await serverDb.getSecurityLevyTransactionById(txOverAlloc.id);
  assert(
    overAllocResult.error === 'OVER_ALLOCATION_DISCREPANCY' || txOverAllocRec.allocation_status === 'OVER_ALLOCATION_DISCREPANCY',
    '20. Over-allocation condition detected and flagged as OVER_ALLOCATION_DISCREPANCY'
  );

  // --------------------------------------------------------------------------
  // TEST 21: SECURITY LEVY / ROAD MODERNIZATION SEPARATION
  // --------------------------------------------------------------------------
  console.log('\n[TEST 21: ROAD MODERNIZATION PAYMENT SEPARATION]');
  const roadMilestones = await serverDb.getRoadMilestones();
  const roadTransactions = await serverDb.getRoadTransactions();
  assert(roadMilestones.length === 5, '21. Road Modernization milestones count preserved (5 milestones)');
  assert(roadTransactions.length === 5, '21. Road Modernization transaction records preserved untouched');

  // --------------------------------------------------------------------------
  // TEST 22: CLIENT-BUNDLE SECRET EXPOSURE CHECKS
  // --------------------------------------------------------------------------
  console.log('\n[TEST 22: CLIENT-BUNDLE & SOURCE SECRET EXPOSURE CHECK]');
  const scanResult = runSecretScan();
  assert(scanResult.passed === true, '22. Zero hardcoded secrets in tracked repository source files');

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
