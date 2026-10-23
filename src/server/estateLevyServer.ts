import express from 'express';
import type { Request, Response } from 'express';
import crypto from 'crypto';
import { serverDb } from './database.ts';

export const estateLevyRouter = express.Router();

// Helper to resolve estate paystack secret key
function getEstatePaystackSecret(): string | null {
  const custom = process.env.PAYSTACK_ESTATE_SECRET_KEY?.trim();
  if (custom) return custom;
  const legacy = process.env.PAYSTACK_SECRET_KEY?.trim();
  if (legacy) return legacy;
  return null;
}

function isPaystackLiveMode(): boolean {
  const sec = getEstatePaystackSecret();
  return Boolean(sec && sec.startsWith('sk_live_'));
}

// -------------------------------------------------------------
// 1. GET BUILDINGS WITH MONTHLY LEVY STATUS
// -------------------------------------------------------------
// GET /api/estate-levy/buildings?billingMonth=2026-10
estateLevyRouter.get('/buildings', async (req: Request, res: Response) => {
  try {
    const billingMonth = String(req.query.billingMonth || new Date().toISOString().slice(0, 7)).trim();
    const buildings = await serverDb.getBuildings();
    const obligations = await serverDb.getBuildingEstateLevyObligations({ billingMonth });

    const activeBuildings = buildings.filter(b => b.status === 'ACTIVE');

    const result = activeBuildings.map(b => {
      const ob = obligations.find(o => o.building_id === b.id);
      return {
        id: b.id,
        house_number: b.house_number,
        building_name: b.building_name,
        landlord_name: b.landlord_name,
        total_flats_count: b.total_flats_count,
        monthly_levy_amount: 1000.00,
        status: b.status,
        obligation: ob ? {
          id: ob.id,
          billing_month: ob.billing_month,
          amount_due: 1000.00,
          amount_paid: ob.amount_paid,
          balance_due: ob.balance_due,
          status: ob.status,
          paid_at: ob.paid_at
        } : {
          billing_month: billingMonth,
          amount_due: 1000.00,
          amount_paid: 0,
          balance_due: 1000.00,
          status: 'UNPAID',
          paid_at: null
        }
      };
    });

    return res.json({
      success: true,
      billing_month: billingMonth,
      monthly_rate_per_building: 1000.00,
      due_date_description: '1st of every month',
      data: result,
      count: result.length
    });
  } catch (error: any) {
    console.error('Error fetching estate levy buildings:', error);
    return res.status(500).json({ success: false, message: 'Failed to retrieve buildings for estate levy.' });
  }
});

// -------------------------------------------------------------
// 2. LOOKUP BUILDING PAYMENT STATUS (BY BUILDING / HOUSE NUMBER)
// -------------------------------------------------------------
// GET /api/estate-levy/lookup?houseNumber=016&billingMonth=2026-10
estateLevyRouter.get('/lookup', async (req: Request, res: Response) => {
  try {
    const rawTag = String(req.query.houseNumber || req.query.buildingTag || '').trim();
    const billingMonth = String(req.query.billingMonth || new Date().toISOString().slice(0, 7)).trim();

    if (!rawTag) {
      return res.status(400).json({ success: false, message: 'Building identifier or house number is required.' });
    }

    const buildings = await serverDb.getBuildings();
    // Match house_number case-insensitively or normalized
    const cleanTag = rawTag.toLowerCase();
    const matchedBuilding = buildings.find(b => 
      b.status === 'ACTIVE' && (
        String(b.house_number).toLowerCase() === cleanTag ||
        String(b.house_number).toLowerCase().replace(/^plot-?/i, '') === cleanTag.replace(/^plot-?/i, '') ||
        (b.building_name && String(b.building_name).toLowerCase().includes(cleanTag))
      )
    );

    if (!matchedBuilding) {
      return res.status(404).json({
        success: false,
        message: `Building "${rawTag}" was not found in the estate directory.`
      });
    }

    const obligations = await serverDb.getBuildingEstateLevyObligations({ 
      buildingId: matchedBuilding.id,
      billingMonth 
    });
    const currentOb = obligations[0] || null;

    // Retrieve verified receipts for this building
    const receipts = await serverDb.getBuildingEstateLevyReceipts();
    const buildingReceipts = receipts.filter(r => r.building_id === matchedBuilding.id);

    return res.json({
      success: true,
      building: {
        id: matchedBuilding.id,
        house_number: matchedBuilding.house_number,
        building_name: matchedBuilding.building_name,
        landlord_name: matchedBuilding.landlord_name,
        total_flats_count: matchedBuilding.total_flats_count
      },
      billing_month: billingMonth,
      rate_per_building: 1000.00,
      obligation: currentOb ? {
        id: currentOb.id,
        status: currentOb.status,
        amount_due: 1000.00,
        amount_paid: currentOb.amount_paid,
        balance_due: currentOb.balance_due,
        paid_at: currentOb.paid_at
      } : {
        status: 'UNPAID',
        amount_due: 1000.00,
        amount_paid: 0,
        balance_due: 1000.00,
        paid_at: null
      },
      receipts: buildingReceipts
    });
  } catch (error: any) {
    console.error('Error looking up estate levy building:', error);
    return res.status(500).json({ success: false, message: 'Server error looking up building levy.' });
  }
});

// -------------------------------------------------------------
// 3. INITIALIZE ESTATE LEVY PAYMENT (1 MONTH ₦1,000 OR 12 MONTHS ₦12,000 PER BUILDING)
// -------------------------------------------------------------
// POST /api/estate-levy/initialize-payment
estateLevyRouter.post('/initialize-payment', async (req: Request, res: Response) => {
  try {
    const {
      building_id,
      house_number,
      billing_month,
      duration_months,
      payer_name,
      payer_email,
      payer_phone
    } = req.body;

    if (!building_id && !house_number) {
      return res.status(400).json({ success: false, message: 'Building selection or house number is required for estate levy payment.' });
    }

    if (!payer_name || !payer_email) {
      return res.status(400).json({ success: false, message: 'Payer name and valid email address are required.' });
    }

    const rawDuration = duration_months !== undefined ? Number(duration_months) : 1;
    if (rawDuration !== 1 && rawDuration !== 12) {
      return res.status(400).json({
        success: false,
        message: 'Invalid payment duration. Only 1 Month and 12 Months payment options are supported.'
      });
    }
    const durationMonths: 1 | 12 = rawDuration === 12 ? 12 : 1;

    const cleanMonth = (billing_month || new Date().toISOString().slice(0, 7)).trim();
    if (!/^\d{4}-\d{2}$/.test(cleanMonth)) {
      return res.status(400).json({ success: false, message: 'Invalid billing month format. Expected YYYY-MM.' });
    }

    let building = building_id ? await serverDb.getBuildingById(building_id) : null;
    if (!building && house_number) {
      building = await serverDb.getBuildingByHouseNumber(String(house_number).trim());
    }
    // If resident is paying from Resident Portal and building record doesn't exist yet, create it automatically
    if (!building && (house_number || (building_id && String(building_id).startsWith('res_bldg_')))) {
      const targetHouse = house_number ? String(house_number).trim() : `Plot ${String(building_id).replace('res_bldg_', '')}`;
      building = await serverDb.getBuildingByHouseNumber(targetHouse);
      if (!building) {
        building = await serverDb.saveBuilding({
          house_number: targetHouse,
          building_name: `${targetHouse} Residence`,
          total_flats_count: 1,
          landlord_name: String(payer_name).trim(),
          landlord_phone: payer_phone ? String(payer_phone).trim() : null,
          landlord_email: String(payer_email).trim().toLowerCase(),
          status: 'ACTIVE'
        });
      }
    }

    if (!building || building.status !== 'ACTIVE') {
      return res.status(404).json({ success: false, message: 'Building not found or inactive in the estate registry.' });
    }

    // Server-enforced rate: ₦1,000 per building per month (₦1,000 for 1 month, ₦12,000 for 12 months)
    const RATE_PER_BUILDING = 1000.00;
    const totalAmountNaira = RATE_PER_BUILDING * durationMonths;
    const amountKobo = totalAmountNaira * 100; // 100,000 kobo (1M) or 1,200,000 kobo (12M)

    // Check duplicate payment prevention for this building and billing month
    const existingObligations = await serverDb.getBuildingEstateLevyObligations({
      buildingId: building.id,
      billingMonth: cleanMonth
    });

    const currentOb = existingObligations[0];
    if (currentOb && currentOb.status === 'PAID' && durationMonths === 1) {
      const allReceipts = await serverDb.getBuildingEstateLevyReceipts();
      const existingReceipt = allReceipts.find(
        r => r.building_id === building.id && r.billing_month === cleanMonth
      );

      return res.status(400).json({
        success: false,
        alreadyPaid: true,
        message: `Estate levy for building "${building.house_number}" for ${cleanMonth} has already been paid. Duplicate charge prevented.`,
        receipt: existingReceipt || null
      });
    }

    if (
      currentOb &&
      currentOb.status !== 'PAID' &&
      currentOb.locked_by_reference &&
      currentOb.lock_expires_at &&
      new Date(currentOb.lock_expires_at).getTime() > Date.now()
    ) {
      const lockedTx = await serverDb.getBuildingEstateLevyTransactionByRef(currentOb.locked_by_reference);
      if (!lockedTx || lockedTx.payment_status === 'PENDING') {
        return res.status(409).json({
          success: false,
          locked: true,
          active_reference: currentOb.locked_by_reference,
          message: `A payment session (${currentOb.locked_by_reference}) is currently active for building "${building.house_number}". Please complete or cancel the open checkout window before starting a new one.`
        });
      }
    }

    // Unique reference: EST-LEVY-YYYYMM-[1M|12M]-[BUILDING]-[RANDOM]
    const monthTag = cleanMonth.replace('-', '');
    const cleanHouse = String(building.house_number).replace(/[^a-zA-Z0-9]/g, '').slice(0, 10).toUpperCase();
    const randomHex = crypto.randomBytes(3).toString('hex').toUpperCase();
    const reference = `EST-LEVY-${monthTag}-${durationMonths}M-${cleanHouse}-${randomHex}`;

    // Lock obligation
    const lockExpiry = new Date(Date.now() + 15 * 60 * 1000).toISOString();
    if (!currentOb || currentOb.status !== 'PAID') {
      await serverDb.saveBuildingEstateLevyObligation({
        building_id: building.id,
        billing_month: cleanMonth,
        amount_due: RATE_PER_BUILDING,
        amount_paid: 0.00,
        balance_due: RATE_PER_BUILDING,
        status: 'UNPAID',
        locked_by_reference: reference,
        lock_expires_at: lockExpiry
      });
    }

    // Save pending transaction record
    await serverDb.saveBuildingEstateLevyTransaction({
      building_id: building.id,
      building_house_number: building.house_number,
      billing_month: cleanMonth,
      amount: totalAmountNaira,
      currency: 'NGN',
      payer_name: payer_name.trim(),
      payer_email: payer_email.trim(),
      payer_phone: payer_phone?.trim() || null,
      paystack_reference: reference,
      payment_status: 'PENDING'
    });

    // Paystack Gateway Initialization
    const secretKey = getEstatePaystackSecret();
    const isLive = isPaystackLiveMode();

    if (secretKey) {
      const origin = req.get('origin') || `http://${req.get('host')}`;
      const callbackUrl = `${origin}/estate-levy?verify_reference=${reference}`;

      const paystackRes = await fetch('https://api.paystack.co/transaction/initialize', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${secretKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: payer_email.trim(),
          amount: amountKobo,
          reference: reference,
          callback_url: callbackUrl,
          currency: 'NGN',
          metadata: {
            payment_type: 'monthly_estate_levy',
            billing_category: 'estate_levy',
            building_id: building.id,
            building_house_number: building.house_number,
            billing_month: cleanMonth,
            duration_months: durationMonths,
            rate: RATE_PER_BUILDING,
            total_amount: totalAmountNaira,
            payer_name: payer_name.trim(),
            estate: 'Finger of God Estate'
          }
        })
      });

      const pData = await paystackRes.json();
      if (paystackRes.ok && pData.status) {
        return res.json({
          success: true,
          authorization_url: pData.data.authorization_url,
          access_code: pData.data.access_code,
          reference: reference,
          amount: totalAmountNaira,
          duration_months: durationMonths,
          currency: 'NGN',
          building_house_number: building.house_number,
          billing_month: cleanMonth,
          mode: isLive ? 'live' : 'test',
          is_simulation: false
        });
      } else {
        console.warn('[Estate Levy Paystack Init Error]', pData);
        return res.status(400).json({
          success: false,
          message: pData.message || 'Payment gateway failed to initialize checkout.'
        });
      }
    }

    // Sandbox simulation fallback (for development and environments without live gateway keys)
    return res.json({
      success: true,
      authorization_url: `/estate-levy?paystack_simulation=true&reference=${reference}`,
      access_code: `sim_${randomHex.toLowerCase()}`,
      reference: reference,
      amount: totalAmountNaira,
      duration_months: durationMonths,
      currency: 'NGN',
      building_house_number: building.house_number,
      billing_month: cleanMonth,
      mode: 'test',
      is_simulation: true
    });
  } catch (error: any) {
    console.error('Error initializing estate levy payment:', error);
    return res.status(500).json({ success: false, message: 'Server error initializing estate levy checkout.' });
  }
});

// -------------------------------------------------------------
// 4. VERIFY ESTATE LEVY PAYMENT (GATEWAY AUTHORITATIVE CONFIRMATION)
// -------------------------------------------------------------
// POST /api/estate-levy/cancel-payment
estateLevyRouter.post('/cancel-payment', async (req: Request, res: Response) => {
  try {
    const { reference, status: requestedStatus, reason } = req.body;
    if (!reference || typeof reference !== 'string') {
      return res.status(400).json({ success: false, message: 'Transaction reference is required.' });
    }

    const cleanRef = reference.trim();
    const transaction = await serverDb.getBuildingEstateLevyTransactionByRef(cleanRef);
    if (!transaction) {
      return res.status(404).json({ success: false, message: 'Transaction record not found.' });
    }

    if (transaction.payment_status === 'SUCCESSFUL') {
      return res.status(400).json({ success: false, message: 'Cannot cancel an already verified payment.' });
    }

    const finalStatus = requestedStatus === 'FAILED' ? 'FAILED' : 'ABANDONED';
    const updatedTx = await serverDb.updateBuildingEstateLevyTransaction(transaction.id, {
      payment_status: finalStatus,
      gateway_response: reason || (finalStatus === 'FAILED' ? 'Payment declined or failed at checkout' : 'Checkout cancelled by user')
    });

    // Release obligation lock if held by this reference
    const obligations = await serverDb.getBuildingEstateLevyObligations({
      buildingId: transaction.building_id,
      billingMonth: transaction.billing_month
    });
    if (obligations.length > 0 && obligations[0].locked_by_reference === cleanRef && obligations[0].status !== 'PAID') {
      await serverDb.updateBuildingEstateLevyObligation(obligations[0].id, {
        locked_by_reference: null,
        lock_expires_at: null
      });
    }

    return res.json({
      success: true,
      message: `Transaction marked as ${finalStatus} and building lock released.`,
      transaction: updatedTx
    });
  } catch (error: any) {
    console.error('Error cancelling estate levy payment:', error);
    return res.status(500).json({ success: false, message: 'Server error cancelling payment.' });
  }
});

// POST /api/estate-levy/verify-payment
estateLevyRouter.post('/verify-payment', async (req: Request, res: Response) => {
  try {
    const { reference, simulatedOutcome, failureReason } = req.body;
    if (!reference || typeof reference !== 'string') {
      return res.status(400).json({ success: false, verified: false, message: 'Transaction reference is required.' });
    }

    const cleanRef = reference.trim();
    const transaction = await serverDb.getBuildingEstateLevyTransactionByRef(cleanRef);
    if (!transaction) {
      return res.status(404).json({ success: false, verified: false, message: 'Transaction record not found.' });
    }

    // Idempotency: If already successful, return the existing verified receipt
    if (transaction.payment_status === 'SUCCESSFUL') {
      const receipt = await serverDb.getBuildingEstateLevyReceiptByNumber(transaction.receipt_number || '');
      return res.json({
        success: true,
        verified: true,
        already_verified: true,
        message: 'Payment already verified.',
        transaction,
        receipt
      });
    }

    const releaseObligationLock = async () => {
      const obligations = await serverDb.getBuildingEstateLevyObligations({
        buildingId: transaction.building_id,
        billingMonth: transaction.billing_month
      });
      if (obligations.length > 0 && obligations[0].locked_by_reference === cleanRef && obligations[0].status !== 'PAID') {
        await serverDb.updateBuildingEstateLevyObligation(obligations[0].id, {
          locked_by_reference: null,
          lock_expires_at: null
        });
      }
    };

    if (simulatedOutcome === 'FAILED' || simulatedOutcome === 'CANCELLED' || simulatedOutcome === 'ABANDONED') {
      const failStatus = simulatedOutcome === 'FAILED' ? 'FAILED' : 'ABANDONED';
      await serverDb.updateBuildingEstateLevyTransaction(transaction.id, {
        payment_status: failStatus,
        gateway_response: failureReason || (failStatus === 'FAILED' ? 'Simulated payment failure' : 'Checkout cancelled by user')
      });
      await releaseObligationLock();
      return res.status(400).json({
        success: false,
        verified: false,
        status: failStatus,
        message: failureReason || `Payment ${failStatus.toLowerCase()}. No receipt generated.`
      });
    }

    const secretKey = getEstatePaystackSecret();
    const expectedAmountNaira = Number(transaction.amount) || (cleanRef.includes('-12M-') ? 12000 : 1000);
    const expectedKobo = Math.round(expectedAmountNaira * 100);
    const monthsCount = (cleanRef.includes('-12M-') || Math.round(expectedAmountNaira / 1000) === 12) ? 12 : 1;

    let verifiedStatus = false;
    let paystackTxId = `sim_${Date.now()}`;
    let paystackChannel = 'card';
    let gatewayResponse = 'Approved';
    let paidAmountKobo = expectedKobo;

    // In test mode with sk_test_ key and simulated test reference, allow test checkout verification if explicitly flagged
    const isTestKey = secretKey && secretKey.startsWith('sk_test_');
    const isSimulatedTestSuccess = isTestKey && req.body.simulatedOutcome === 'SUCCESS';

    if (secretKey && !isSimulatedTestSuccess) {
      const paystackRes = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(cleanRef)}`, {
        headers: {
          'Authorization': `Bearer ${secretKey}`,
          'Content-Type': 'application/json'
        }
      });

      const pData = await paystackRes.json();
      if (!paystackRes.ok || !pData.status) {
        await serverDb.updateBuildingEstateLevyTransaction(transaction.id, {
          payment_status: 'FAILED',
          gateway_response: pData.message || 'Verification rejected by Paystack'
        });
        await releaseObligationLock();
        return res.status(400).json({
          success: false,
          verified: false,
          message: pData.message || 'Payment could not be verified with payment gateway.'
        });
      }

      const txData = pData.data;

      // 1. Must be 'success'
      if (txData.status !== 'success') {
        const failureStatus = txData.status === 'abandoned' ? 'ABANDONED' : 'FAILED';
        await serverDb.updateBuildingEstateLevyTransaction(transaction.id, {
          payment_status: failureStatus,
          gateway_response: txData.gateway_response || txData.status
        });
        await releaseObligationLock();
        return res.status(400).json({
          success: false,
          verified: false,
          message: `Payment status is ${txData.status}. Transaction incomplete.`
        });
      }

      // 2. Reference match
      if (txData.reference !== cleanRef) {
        return res.status(400).json({ success: false, verified: false, message: 'Payment reference mismatch.' });
      }

      // 3. Currency check
      if (txData.currency !== 'NGN') {
        return res.status(400).json({ success: false, verified: false, message: 'Invalid currency. NGN expected.' });
      }

      // 4. Exact amount validation: ₦1,000 (1 month) or ₦12,000 (12 months)
      if (Number(txData.amount) !== expectedKobo) {
        console.warn(`[Estate Levy Warning] Amount mismatch on ${cleanRef}. Expected: ${expectedKobo}, Got: ${txData.amount}`);
        await serverDb.updateBuildingEstateLevyTransaction(transaction.id, {
          payment_status: 'FAILED',
          gateway_response: `Amount mismatch: expected ${expectedKobo} kobo, received ${txData.amount} kobo`
        });
        await releaseObligationLock();
        return res.status(400).json({
          success: false,
          verified: false,
          message: `Amount paid does not match the statutory estate levy (₦${expectedAmountNaira.toLocaleString()}).`
        });
      }

      verifiedStatus = true;
      paystackTxId = String(txData.id);
      paystackChannel = txData.channel || 'card';
      gatewayResponse = txData.gateway_response || 'Approved';
      paidAmountKobo = txData.amount;
    } else {
      // Sandbox simulation mode (development / test key simulation)
      verifiedStatus = true;
    }

    if (verifiedStatus) {
      const now = new Date().toISOString();
      const building = await serverDb.getBuildingById(transaction.building_id);
      const paidNaira = paidAmountKobo / 100;

      // Generate Official Stamped Receipt: ELR-YYYYMMDD-[HASH]
      const datePart = now.slice(0, 10).replace(/-/g, '');
      const receiptRandom = crypto.randomBytes(3).toString('hex').toUpperCase();
      const receiptNumber = `ELR-${datePart}-${receiptRandom}`;

      // Calculate Billing Month Label (1 month or 12 months range)
      const [yearStr, monthStr] = transaction.billing_month.split('-');
      const startYear = parseInt(yearStr, 10);
      const startMonthIdx = parseInt(monthStr, 10) - 1;
      const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
      let monthLabel = `${monthNames[startMonthIdx] || 'Month'} ${yearStr}`;
      if (monthsCount === 12) {
        const endDate = new Date(startYear, startMonthIdx + 11, 1);
        const endMonthLabel = `${monthNames[endDate.getMonth()]} ${endDate.getFullYear()}`;
        monthLabel = `${monthLabel} – ${endMonthLabel} (12 Months)`;
      }

      const receipt = await serverDb.saveBuildingEstateLevyReceipt({
        receipt_number: receiptNumber,
        transaction_id: transaction.id,
        building_id: transaction.building_id,
        building_house_number: transaction.building_house_number,
        building_name: building?.building_name || null,
        landlord_name: building?.landlord_name || null,
        payer_name: transaction.payer_name,
        billing_month: transaction.billing_month,
        billing_month_label: monthLabel,
        amount_paid: paidNaira,
        currency: 'NGN',
        paystack_reference: cleanRef,
        payment_date: now,
        status: 'PAID',
        issued_at: now
      });

      // Update building obligation(s) to PAID (1 month or 12 consecutive months)
      for (let i = 0; i < monthsCount; i++) {
        const dt = new Date(startYear, startMonthIdx + i, 1);
        const mStr = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`;
        const obligations = await serverDb.getBuildingEstateLevyObligations({
          buildingId: transaction.building_id,
          billingMonth: mStr
        });

        if (obligations.length > 0) {
          await serverDb.updateBuildingEstateLevyObligation(obligations[0].id, {
            amount_paid: 1000.00,
            balance_due: 0.00,
            status: 'PAID',
            paid_at: now,
            locked_by_reference: null,
            lock_expires_at: null
          });
        } else {
          await serverDb.saveBuildingEstateLevyObligation({
            building_id: transaction.building_id,
            billing_month: mStr,
            amount_due: 1000.00,
            amount_paid: 1000.00,
            balance_due: 0.00,
            status: 'PAID',
            paid_at: now
          });
        }
      }

      // Update transaction status
      const updatedTx = await serverDb.updateBuildingEstateLevyTransaction(transaction.id, {
        payment_status: 'SUCCESSFUL',
        paystack_transaction_id: paystackTxId,
        payment_channel: paystackChannel,
        gateway_response: gatewayResponse,
        receipt_number: receiptNumber,
        verified_at: now
      });

      return res.json({
        success: true,
        verified: true,
        message: 'Estate levy payment verified and official receipt generated.',
        transaction: updatedTx,
        receipt
      });
    }

    return res.status(400).json({ success: false, verified: false, message: 'Verification failed.' });
  } catch (error: any) {
    console.error('Error verifying estate levy payment:', error);
    return res.status(500).json({ success: false, verified: false, message: 'Server error during payment verification.' });
  }
});

// -------------------------------------------------------------
// 5. GET RECEIPT BY NUMBER
// -------------------------------------------------------------
// GET /api/estate-levy/receipt/:receiptNumber
estateLevyRouter.get('/receipt/:receiptNumber', async (req: Request, res: Response) => {
  try {
    const { receiptNumber } = req.params;
    if (!receiptNumber) {
      return res.status(400).json({ success: false, message: 'Receipt number is required.' });
    }

    const receipt = await serverDb.getBuildingEstateLevyReceiptByNumber(receiptNumber);
    if (!receipt) {
      return res.status(404).json({ success: false, message: 'Official estate levy receipt not found.' });
    }

    return res.json({
      success: true,
      receipt
    });
  } catch (error: any) {
    console.error('Error retrieving estate levy receipt:', error);
    return res.status(500).json({ success: false, message: 'Server error retrieving receipt.' });
  }
});

// -------------------------------------------------------------
// 6. PROCESS VERIFIED ESTATE LEVY WEBHOOK EVENT (IDEMPOTENT)
// -------------------------------------------------------------
export async function processVerifiedEstateLevyPaystackEvent(data: any): Promise<void> {
  const reference = data?.reference;
  if (!reference) return;

  const transaction = await serverDb.getBuildingEstateLevyTransactionByRef(reference);
  if (!transaction) {
    console.log(`[Estate Levy Webhook] No matching pending transaction for ref ${reference}. Safely skipping.`);
    return;
  }

  // Idempotency check: Already processed
  if (transaction.payment_status === 'SUCCESSFUL') {
    console.log(`[Estate Levy Webhook] Transaction ${reference} is already marked SUCCESSFUL.`);
    return;
  }

  const expectedAmountNaira = Number(transaction.amount) || (String(reference).includes('-12M-') ? 12000 : 1000);
  const expectedKobo = Math.round(expectedAmountNaira * 100);
  const monthsCount = (String(reference).includes('-12M-') || Math.round(expectedAmountNaira / 1000) === 12) ? 12 : 1;

  if (Number(data.amount) !== expectedKobo || data.currency !== 'NGN') {
    console.warn(`[Estate Levy Webhook Warning] Amount mismatch on ${reference}. Expected ${expectedKobo}, got ${data.amount}`);
    await serverDb.updateBuildingEstateLevyTransaction(transaction.id, {
      payment_status: 'FAILED',
      gateway_response: `Amount mismatch: expected ${expectedKobo} kobo, received ${data.amount} kobo`
    });
    return;
  }

  const now = new Date().toISOString();
  const building = await serverDb.getBuildingById(transaction.building_id);

  // Generate Receipt
  const datePart = now.slice(0, 10).replace(/-/g, '');
  const receiptRandom = crypto.randomBytes(3).toString('hex').toUpperCase();
  const receiptNumber = `ELR-${datePart}-${receiptRandom}`;

  const [yearStr, monthStr] = transaction.billing_month.split('-');
  const startYear = parseInt(yearStr, 10);
  const startMonthIdx = parseInt(monthStr, 10) - 1;
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  let monthLabel = `${monthNames[startMonthIdx] || 'Month'} ${yearStr}`;
  if (monthsCount === 12) {
    const endDate = new Date(startYear, startMonthIdx + 11, 1);
    const endMonthLabel = `${monthNames[endDate.getMonth()]} ${endDate.getFullYear()}`;
    monthLabel = `${monthLabel} – ${endMonthLabel} (12 Months)`;
  }

  await serverDb.saveBuildingEstateLevyReceipt({
    receipt_number: receiptNumber,
    transaction_id: transaction.id,
    building_id: transaction.building_id,
    building_house_number: transaction.building_house_number,
    building_name: building?.building_name || null,
    landlord_name: building?.landlord_name || null,
    payer_name: transaction.payer_name,
    billing_month: transaction.billing_month,
    billing_month_label: monthLabel,
    amount_paid: expectedAmountNaira,
    currency: 'NGN',
    paystack_reference: reference,
    payment_date: data.paid_at || now,
    status: 'PAID',
    issued_at: now
  });

  // Update Obligation(s)
  for (let i = 0; i < monthsCount; i++) {
    const dt = new Date(startYear, startMonthIdx + i, 1);
    const mStr = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`;
    const obligations = await serverDb.getBuildingEstateLevyObligations({
      buildingId: transaction.building_id,
      billingMonth: mStr
    });

    if (obligations.length > 0) {
      await serverDb.updateBuildingEstateLevyObligation(obligations[0].id, {
        amount_paid: 1000.00,
        balance_due: 0.00,
        status: 'PAID',
        paid_at: data.paid_at || now,
        locked_by_reference: null,
        lock_expires_at: null
      });
    } else {
      await serverDb.saveBuildingEstateLevyObligation({
        building_id: transaction.building_id,
        billing_month: mStr,
        amount_due: 1000.00,
        amount_paid: 1000.00,
        balance_due: 0.00,
        status: 'PAID',
        paid_at: data.paid_at || now
      });
    }
  }

  // Update Transaction Record
  await serverDb.updateBuildingEstateLevyTransaction(transaction.id, {
    payment_status: 'SUCCESSFUL',
    paystack_transaction_id: String(data.id),
    payment_channel: data.channel || 'card',
    gateway_response: data.gateway_response || 'Approved',
    receipt_number: receiptNumber,
    verified_at: data.paid_at || now
  });

  console.log(`[Estate Levy Webhook] Successfully processed and marked transaction ${reference} as SUCCESSFUL with receipt ${receiptNumber}`);
}
