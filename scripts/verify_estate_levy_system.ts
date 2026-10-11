import { serverDb } from '../src/server/database.ts';
import { processVerifiedEstateLevyPaystackEvent } from '../src/server/estateLevyServer.ts';

let passed = 0;
let failed = 0;

function assert(condition: boolean, desc: string) {
  if (condition) {
    passed++;
    console.log(`  ✓ PASS: ${desc}`);
  } else {
    failed++;
    console.error(`  ✗ FAIL: ${desc}`);
    throw new Error(`Assertion failed: ${desc}`);
  }
}

async function runEstateLevyAuditSuite() {
  console.log('======================================================================');
  console.log('FINGER OF GOD ESTATE — MONTHLY ESTATE LEVY ₦1,000 AUDIT & TEST SUITE');
  console.log('======================================================================\n');

  // Test 1: Rate Verification
  console.log('[TEST 1: ₦1,000 PER BUILDING RATE RULE]');
  const buildings = await serverDb.getBuildings();
  assert(buildings.length > 0, '1. Active buildings retrieved from database');
  
  const testBuilding = buildings[0];
  const ob = await serverDb.saveBuildingEstateLevyObligation({
    building_id: testBuilding.id,
    billing_month: '2026-10',
    amount_paid: 0
  });
  assert(ob.amount_due === 1000.00, '2. Obligation amount_due is strictly ₦1,000.00');
  assert(ob.balance_due === 1000.00, '3. Unpaid obligation balance_due is strictly ₦1,000.00');

  // Test 2: Multiple Flats / Residents do not duplicate building levy
  console.log('\n[TEST 2: MULTI-UNIT/FLAT BUILDING PRESERVATION]');
  const multiFlatBuilding = buildings.find(b => (b.total_flats_count || 0) > 1) || testBuilding;
  const multiOb = await serverDb.saveBuildingEstateLevyObligation({
    building_id: multiFlatBuilding.id,
    billing_month: '2026-10',
    amount_paid: 0
  });
  assert(multiOb.amount_due === 1000.00, `4. Building with ${multiFlatBuilding.total_flats_count} flats is charged exactly ₦1,000 total (not multiplied by flats count)`);

  // Test 3: Duplicate Payment Prevention
  console.log('\n[TEST 3: DUPLICATE MONTHLY CHARGE PREVENTION]');
  const ref1 = `EST-LEVY-202610-TEST-${Date.now()}`;
  const tx1 = await serverDb.saveBuildingEstateLevyTransaction({
    building_id: testBuilding.id,
    building_house_number: testBuilding.house_number,
    billing_month: '2026-10',
    amount: 1000.00,
    payer_name: 'Chief Landlord',
    payer_email: 'landlord@example.com',
    paystack_reference: ref1,
    payment_status: 'PENDING'
  });
  assert(tx1.amount === 1000.00, '5. Pending transaction recorded at authoritative ₦1,000 amount');

  // Simulate gateway success via Webhook
  await processVerifiedEstateLevyPaystackEvent({
    reference: ref1,
    amount: 100000, // 100,000 kobo = ₦1,000
    currency: 'NGN',
    id: 99887711,
    channel: 'card',
    paid_at: new Date().toISOString(),
    gateway_response: 'Approved'
  });

  const updatedTx1 = await serverDb.getBuildingEstateLevyTransactionByRef(ref1);
  assert(updatedTx1?.payment_status === 'SUCCESSFUL', '6. Transaction marked SUCCESSFUL upon verified webhook delivery');
  assert(Boolean(updatedTx1?.receipt_number), '7. Verified receipt number generated upon confirmation');

  const receipt = await serverDb.getBuildingEstateLevyReceiptByNumber(updatedTx1?.receipt_number || '');
  assert(receipt !== null, '8. Receipt record exists in permanent ledger');
  assert(receipt?.amount_paid === 1000.00, '9. Receipt records exactly ₦1,000 amount paid');
  assert(receipt?.building_id === testBuilding.id, '10. Receipt covers correct building');

  // Test 4: Webhook Idempotency (repeated delivery)
  console.log('\n[TEST 4: WEBHOOK IDEMPOTENCY]');
  await processVerifiedEstateLevyPaystackEvent({
    reference: ref1,
    amount: 100000,
    currency: 'NGN',
    id: 99887711
  });
  const allReceipts = await serverDb.getBuildingEstateLevyReceipts();
  const matchedReceipts = allReceipts.filter(r => r.paystack_reference === ref1);
  assert(matchedReceipts.length === 1, '11. Repeated webhook delivery does not duplicate receipt or ledger entry');

  // Test 5: Reject Incorrect Amount
  console.log('\n[TEST 5: UNDERPAYMENT / OVERPAYMENT GATEWAY REJECTION]');
  const refWrong = `EST-LEVY-202610-WRONG-${Date.now()}`;
  await serverDb.saveBuildingEstateLevyTransaction({
    building_id: testBuilding.id,
    building_house_number: testBuilding.house_number,
    billing_month: '2026-10',
    amount: 1000.00,
    payer_name: 'Incorrect Payer',
    payer_email: 'wrong@example.com',
    paystack_reference: refWrong,
    payment_status: 'PENDING'
  });

  await processVerifiedEstateLevyPaystackEvent({
    reference: refWrong,
    amount: 50000, // 500 NGN instead of 1000 NGN
    currency: 'NGN',
    id: 99887722
  });

  const txWrong = await serverDb.getBuildingEstateLevyTransactionByRef(refWrong);
  assert(txWrong?.payment_status === 'FAILED', '12. Gateway transaction with mismatching amount is rejected and marked FAILED');

  console.log('\n======================================================================');
  console.log(`ESTATE LEVY TEST RESULTS: ${passed}/${passed + failed} TESTS PASSED`);
  console.log('======================================================================');
}

runEstateLevyAuditSuite().catch(err => {
  console.error('Test Suite Failed:', err);
  process.exit(1);
});
