import express from 'express';
import type { Request, Response } from 'express';
import crypto from 'crypto';
import { serverDb, supabaseAdmin, verifyAdminToken, VerifiedAdminUser } from './database.ts';
import { arePhoneNumbersEqual } from '../lib/phoneUtils.js';

export const securityLevyRouter = express.Router();

// Helper to get Security Paystack Secret Key
function getSecurityPaystackSecret(): string | null {
  const custom = process.env.PAYSTACK_SECURITY_SECRET_KEY?.trim();
  if (custom) return custom;
  const legacy = process.env.PAYSTACK_SECRET_KEY?.trim();
  if (legacy) return legacy;
  return null;
}

function isPaystackLiveMode(): boolean {
  const sec = getSecurityPaystackSecret();
  return Boolean(sec && sec.startsWith('sk_live_'));
}

// Admin Auth Guard Middleware for Security Levy
async function requireSecurityAdmin(req: Request, res: Response, next: express.NextFunction) {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null;

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Unauthorized: Administrator authentication token required.'
    });
  }

  const result = await verifyAdminToken(token);
  if (!result.valid || !result.user) {
    return res.status(403).json({
      success: false,
      message: result.error || 'Access denied: Valid administrator credentials required.'
    });
  }

  (req as any).adminUser = result.user;
  next();
}

// -------------------------------------------------------------
// 1. BUILDINGS ENDPOINTS
// -------------------------------------------------------------

// GET /api/security-levy/buildings
securityLevyRouter.get('/buildings', async (req: Request, res: Response) => {
  try {
    const buildings = await serverDb.getBuildings();
    const flats = await serverDb.getFlats();

    // Enrich buildings with computed flat counts
    const enriched = buildings.map(b => {
      const bFlats = flats.filter(f => f.building_id === b.id && f.status !== 'ARCHIVED');
      const activeBillingFlats = bFlats.filter(f => f.is_billing_active);
      return {
        ...b,
        flats_count: bFlats.length,
        active_billing_flats_count: activeBillingFlats.length
      };
    });

    return res.json({
      success: true,
      data: enriched,
      count: enriched.length
    });
  } catch (error: any) {
    console.error('Error fetching buildings:', error);
    return res.status(500).json({ success: false, message: 'Failed to retrieve buildings.' });
  }
});

// POST /api/security-levy/buildings (Admin Only)
securityLevyRouter.post('/buildings', requireSecurityAdmin, async (req: Request, res: Response) => {
  try {
    const adminUser = (req as any).adminUser as VerifiedAdminUser;
    const { house_number, building_name, total_flats_count, landlord_name, landlord_phone, landlord_email, landlord_resident_id, notes } = req.body;

    if (!house_number || typeof house_number !== 'string' || !house_number.trim()) {
      return res.status(400).json({ success: false, message: 'Valid house number / plot identifier is required.' });
    }

    const cleanHouseNumber = house_number.trim();
    const existing = await serverDb.getBuildings();
    if (existing.some(b => b.house_number.toLowerCase() === cleanHouseNumber.toLowerCase() && b.status !== 'ARCHIVED')) {
      return res.status(409).json({ success: false, message: `Building with house number "${cleanHouseNumber}" already exists.` });
    }

    const building = await serverDb.saveBuilding({
      house_number: cleanHouseNumber,
      building_name: building_name || null,
      total_flats_count: Math.max(1, Number(total_flats_count) || 1),
      landlord_name: landlord_name || null,
      landlord_phone: landlord_phone || null,
      landlord_email: landlord_email || null,
      landlord_resident_id: landlord_resident_id || null,
      notes: notes || null,
      status: 'ACTIVE'
    });

    await serverDb.logEstateAudit({
      actor_type: 'ADMIN',
      actor_identifier: adminUser.email,
      action: 'CREATE_BUILDING',
      entity_type: 'BUILDING',
      entity_id: building.id,
      details: { house_number: cleanHouseNumber, total_flats_count: building.total_flats_count }
    });

    return res.status(201).json({
      success: true,
      message: `Building ${cleanHouseNumber} registered successfully.`,
      data: building
    });
  } catch (error: any) {
    console.error('Error registering building:', error);
    return res.status(500).json({ success: false, message: 'Failed to create building.' });
  }
});

// PUT /api/security-levy/buildings/:id (Admin Only)
securityLevyRouter.put('/buildings/:id', requireSecurityAdmin, async (req: Request, res: Response) => {
  try {
    const adminUser = (req as any).adminUser as VerifiedAdminUser;
    const { id } = req.params;
    const existing = await serverDb.getBuildingById(id);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Building record not found.' });
    }

    const updates = { ...req.body };
    delete updates.id;
    delete updates.created_at;

    const updated = await serverDb.updateBuilding(id, updates);

    await serverDb.logEstateAudit({
      actor_type: 'ADMIN',
      actor_identifier: adminUser.email,
      action: 'UPDATE_BUILDING',
      entity_type: 'BUILDING',
      entity_id: id,
      details: updates
    });

    return res.json({
      success: true,
      message: 'Building updated successfully.',
      data: updated
    });
  } catch (error: any) {
    console.error('Error updating building:', error);
    return res.status(500).json({ success: false, message: 'Failed to update building.' });
  }
});

// DELETE /api/security-levy/buildings/:id (Admin Only - Soft Archival / Deactivation, Never CASCADE Delete)
securityLevyRouter.delete('/buildings/:id', requireSecurityAdmin, async (req: Request, res: Response) => {
  try {
    const adminUser = (req as any).adminUser as VerifiedAdminUser;
    const { id } = req.params;
    const existing = await serverDb.getBuildingById(id);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Building not found.' });
    }

    // Preservation rule: Soft archive instead of destructive delete
    const archived = await serverDb.updateBuilding(id, { status: 'ARCHIVED' });

    await serverDb.logEstateAudit({
      actor_type: 'ADMIN',
      actor_identifier: adminUser.email,
      action: 'ARCHIVE_BUILDING',
      entity_type: 'BUILDING',
      entity_id: id,
      details: { house_number: existing.house_number }
    });

    return res.json({
      success: true,
      message: `Building ${existing.house_number} has been safely archived (financial records preserved).`,
      data: archived
    });
  } catch (error: any) {
    console.error('Error archiving building:', error);
    return res.status(500).json({ success: false, message: 'Failed to archive building.' });
  }
});

// -------------------------------------------------------------
// 2. FLATS ENDPOINTS
// -------------------------------------------------------------

// GET /api/security-levy/buildings/:buildingId/flats
securityLevyRouter.get('/buildings/:buildingId/flats', async (req: Request, res: Response) => {
  try {
    const { buildingId } = req.params;
    const currentMonth = new Date().toISOString().slice(0, 7);
    const flats = await serverDb.getFlats(buildingId);
    const obligations = await serverDb.getObligations({ billingMonth: currentMonth });

    // Enrich flats with current month's payment status
    const enriched = flats.map(f => {
      const ob = obligations.find(o => o.flat_id === f.id);
      return {
        ...f,
        current_month_status: ob ? ob.status : (f.is_billing_active ? 'UNPAID' : 'EXEMPT')
      };
    });

    return res.json({
      success: true,
      data: enriched,
      count: enriched.length
    });
  } catch (error: any) {
    console.error('Error fetching flats for building:', error);
    return res.status(500).json({ success: false, message: 'Failed to retrieve flats.' });
  }
});

// POST /api/security-levy/buildings/:buildingId/flats (Admin Only)
securityLevyRouter.post('/buildings/:buildingId/flats', requireSecurityAdmin, async (req: Request, res: Response) => {
  try {
    const adminUser = (req as any).adminUser as VerifiedAdminUser;
    const { buildingId } = req.params;
    const building = await serverDb.getBuildingById(buildingId);
    if (!building) {
      return res.status(404).json({ success: false, message: 'Building does not exist.' });
    }

    const {
      flat_number,
      label,
      occupant_type,
      resident_id,
      occupant_name,
      occupant_phone,
      occupant_email,
      is_billing_active,
      monthly_levy_amount
    } = req.body;

    if (!flat_number || typeof flat_number !== 'string' || !flat_number.trim()) {
      return res.status(400).json({ success: false, message: 'Flat number (e.g. Flat 1, Suite A, Main Unit) is required.' });
    }

    const cleanFlatNum = flat_number.trim();
    const existingFlats = await serverDb.getFlats(buildingId);
    if (existingFlats.some(f => f.flat_number.toLowerCase() === cleanFlatNum.toLowerCase() && f.status !== 'ARCHIVED')) {
      return res.status(409).json({ success: false, message: `Flat "${cleanFlatNum}" already exists in building ${building.house_number}.` });
    }

    const flat = await serverDb.saveFlat({
      building_id: buildingId,
      flat_number: cleanFlatNum,
      label: label || null,
      occupant_type: occupant_type || 'VACANT',
      resident_id: resident_id || null,
      occupant_name: occupant_name || null,
      occupant_phone: occupant_phone || null,
      occupant_email: occupant_email || null,
      is_billing_active: Boolean(is_billing_active),
      billing_activated_by: is_billing_active ? adminUser.email : null,
      monthly_levy_amount: 1500.00, // Approved rate
      status: 'ACTIVE'
    });

    await serverDb.logEstateAudit({
      actor_type: 'ADMIN',
      actor_identifier: adminUser.email,
      action: 'CREATE_FLAT',
      entity_type: 'FLAT',
      entity_id: flat.id,
      details: { building_id: buildingId, flat_number: cleanFlatNum, is_billing_active: flat.is_billing_active }
    });

    return res.status(201).json({
      success: true,
      message: `Flat ${cleanFlatNum} registered in ${building.house_number}.`,
      data: flat
    });
  } catch (error: any) {
    console.error('Error creating flat:', error);
    return res.status(500).json({ success: false, message: 'Failed to create flat.' });
  }
});

// PUT /api/security-levy/flats/:id (Admin Only)
securityLevyRouter.put('/flats/:id', requireSecurityAdmin, async (req: Request, res: Response) => {
  try {
    const adminUser = (req as any).adminUser as VerifiedAdminUser;
    const { id } = req.params;
    const existing = await serverDb.getFlatById(id);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Flat record not found.' });
    }

    const updates = { ...req.body };
    delete updates.id;
    delete updates.building_id;
    delete updates.created_at;

    if (updates.is_billing_active === true && !existing.is_billing_active) {
      updates.billing_activated_by = adminUser.email;
    }

    const updated = await serverDb.updateFlat(id, updates);

    await serverDb.logEstateAudit({
      actor_type: 'ADMIN',
      actor_identifier: adminUser.email,
      action: 'UPDATE_FLAT',
      entity_type: 'FLAT',
      entity_id: id,
      details: updates
    });

    return res.json({
      success: true,
      message: 'Flat updated successfully.',
      data: updated
    });
  } catch (error: any) {
    console.error('Error updating flat:', error);
    return res.status(500).json({ success: false, message: 'Failed to update flat.' });
  }
});

// DELETE /api/security-levy/flats/:id (Admin Only - Soft Archival, Never CASCADE Delete)
securityLevyRouter.delete('/flats/:id', requireSecurityAdmin, async (req: Request, res: Response) => {
  try {
    const adminUser = (req as any).adminUser as VerifiedAdminUser;
    const { id } = req.params;
    const existing = await serverDb.getFlatById(id);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Flat not found.' });
    }

    const archived = await serverDb.updateFlat(id, { status: 'ARCHIVED', is_billing_active: false });

    await serverDb.logEstateAudit({
      actor_type: 'ADMIN',
      actor_identifier: adminUser.email,
      action: 'ARCHIVE_FLAT',
      entity_type: 'FLAT',
      entity_id: id,
      details: { flat_number: existing.flat_number, building_id: existing.building_id }
    });

    return res.json({
      success: true,
      message: `Flat ${existing.flat_number} archived and deactivated from billing.`,
      data: archived
    });
  } catch (error: any) {
    console.error('Error archiving flat:', error);
    return res.status(500).json({ success: false, message: 'Failed to archive flat.' });
  }
});

// -------------------------------------------------------------
// 3. MONTHLY OBLIGATIONS ENDPOINTS
// -------------------------------------------------------------

// GET /api/security-levy/obligations
securityLevyRouter.get('/obligations', async (req: Request, res: Response) => {
  try {
    const { billingMonth, flatId, buildingId } = req.query;
    const filter: any = {};
    if (billingMonth) filter.billingMonth = String(billingMonth);
    if (flatId) filter.flatId = String(flatId);

    const obligations = await serverDb.getObligations(filter);
    const flats = await serverDb.getFlats();
    const buildings = await serverDb.getBuildings();

    // Enrich with flat and building metadata
    let enriched = obligations.map(o => {
      const fl = flats.find(f => f.id === o.flat_id);
      const b = fl ? buildings.find(bg => bg.id === fl.building_id) : null;
      return {
        ...o,
        flat_number: fl?.flat_number || 'Unknown Flat',
        building_id: fl?.building_id || null,
        building_house_number: b?.house_number || 'Unknown House',
        occupant_name: fl?.occupant_name || null
      };
    });

    if (buildingId) {
      enriched = enriched.filter(e => e.building_id === String(buildingId));
    }

    return res.json({
      success: true,
      data: enriched,
      count: enriched.length
    });
  } catch (error: any) {
    console.error('Error fetching obligations:', error);
    return res.status(500).json({ success: false, message: 'Failed to retrieve obligations.' });
  }
});

// POST /api/security-levy/obligations/generate (Admin Only)
securityLevyRouter.post('/obligations/generate', requireSecurityAdmin, async (req: Request, res: Response) => {
  try {
    const adminUser = (req as any).adminUser as VerifiedAdminUser;
    const billingMonth = (req.body.billing_month || new Date().toISOString().slice(0, 7)).trim();

    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(billingMonth)) {
      return res.status(400).json({ success: false, message: 'Invalid billing month format. Expected YYYY-MM.' });
    }

    const result = await serverDb.generateMonthlyObligations(billingMonth);

    await serverDb.logEstateAudit({
      actor_type: 'ADMIN',
      actor_identifier: adminUser.email,
      action: 'GENERATE_MONTHLY_OBLIGATIONS',
      entity_type: 'OBLIGATION_BATCH',
      entity_id: billingMonth,
      details: result
    });

    return res.json({
      success: true,
      message: `Generated ${result.generated_count} security levy obligations for ${billingMonth} (${result.skipped_count} existing).`,
      data: result
    });
  } catch (error: any) {
    console.error('Error generating obligations:', error);
    return res.status(500).json({ success: false, message: 'Failed to generate monthly obligations.' });
  }
});

// -------------------------------------------------------------
// 4. PAYSTACK CHECKOUT INITIALIZATION (INDIVIDUAL & BULK)
// -------------------------------------------------------------

// POST /api/security-levy/initialize-payment
securityLevyRouter.post('/initialize-payment', async (req: Request, res: Response) => {
  try {
    const {
      transaction_type, // 'INDIVIDUAL_FLAT' | 'BULK_FLATS'
      building_id,
      flat_ids,
      billing_month,
      payer_name,
      payer_email,
      payer_phone,
      payer_type
    } = req.body;

    if (!flat_ids || !Array.isArray(flat_ids) || flat_ids.length === 0) {
      return res.status(400).json({ success: false, message: 'At least one flat must be selected for payment.' });
    }

    if (!payer_name || !payer_email) {
      return res.status(400).json({ success: false, message: 'Payer name and valid email address are required.' });
    }

    const cleanMonth = (billing_month || new Date().toISOString().slice(0, 7)).trim();
    const flats = await serverDb.getFlats();
    const buildings = await serverDb.getBuildings();

    // Verify all flats
    const targetFlats = flats.filter(f => flat_ids.includes(f.id));
    if (targetFlats.length !== flat_ids.length) {
      return res.status(400).json({ success: false, message: 'One or more selected flats could not be found.' });
    }

    // Check flat eligibility: must be ACTIVE, approved, and enabled for billing
    const ineligibleFlats = targetFlats.filter(f => 
      !f.is_billing_active || 
      f.status !== 'ACTIVE' || 
      (f.is_approved !== undefined && f.is_approved === false)
    );
    if (ineligibleFlats.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Flat ${ineligibleFlats.map(f => f.flat_number).join(', ')} is not currently active, approved, or enabled for billing. Please contact estate administration.`
      });
    }

    // Check if any flat is already marked PAID for this month
    const obligations = await serverDb.getObligations({ billingMonth: cleanMonth });
    const paidFlats = targetFlats.filter(f => {
      const ob = obligations.find(o => o.flat_id === f.id);
      return ob && ob.status === 'PAID';
    });

    if (paidFlats.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Flat ${paidFlats.map(f => f.flat_number).join(', ')} has already paid the security levy for ${cleanMonth}. Double payment prevented.`
      });
    }

    // Reservation Check: ensure no active, unexpired checkout session on these flats
    const nowMs = Date.now();
    const activeLockedFlats = targetFlats.filter(f => {
      const ob = obligations.find(o => o.flat_id === f.id);
      if (!ob || !ob.locked_by_reference || !ob.lock_expires_at) return false;
      const expiry = new Date(ob.lock_expires_at).getTime();
      return expiry > nowMs;
    });

    if (activeLockedFlats.length > 0) {
      return res.status(409).json({
        success: false,
        message: `Checkout is currently in progress for flat(s): ${activeLockedFlats.map(f => f.flat_number).join(', ')}. Please wait a few moments for the transaction to complete or expire before trying again.`
      });
    }

    // Calculate official amounts: strictly ₦1,500 per flat
    const ratePerUnit = 1500.00;
    const totalUnits = targetFlats.length;
    const expectedAmount = ratePerUnit * totalUnits;
    const amountKobo = expectedAmount * 100;

    // Generate unique reference
    const monthTag = cleanMonth.replace('-', '');
    const randomHex = crypto.randomBytes(3).toString('hex').toUpperCase();
    const reference = `FOG-SL-${monthTag}-${totalUnits}F-${randomHex}`;

    // Target obligations
    const targetObligationIds: string[] = [];
    for (const f of targetFlats) {
      let ob = obligations.find(o => o.flat_id === f.id);
      if (!ob) {
        ob = await serverDb.saveObligation({
          flat_id: f.id,
          billing_month: cleanMonth,
          amount_due: ratePerUnit,
          amount_paid: 0,
          balance_due: ratePerUnit,
          status: 'UNPAID',
          is_billed: true
        });
      }
      targetObligationIds.push(ob.id);
      // Checkout reservation lock (30 minutes)
      const lockExpiry = new Date(Date.now() + 30 * 60 * 1000).toISOString();
      await serverDb.updateObligation(ob.id, {
        locked_by_reference: reference,
        lock_expires_at: lockExpiry
      });
    }

    const building = buildings.find(b => b.id === (building_id || targetFlats[0].building_id));

    // Save initial pending transaction record
    const transaction = await serverDb.saveSecurityLevyTransaction({
      transaction_type: totalUnits > 1 ? 'BULK_FLATS' : 'INDIVIDUAL_FLAT',
      building_id: building?.id || null,
      payer_name: payer_name.trim(),
      payer_email: payer_email.trim(),
      payer_phone: payer_phone?.trim() || null,
      payer_type: payer_type || (totalUnits > 1 ? 'LANDLORD' : 'RESIDENT'),
      billing_month: cleanMonth,
      total_units: totalUnits,
      rate_per_unit: ratePerUnit,
      expected_amount: expectedAmount,
      verified_amount: 0.00,
      allocated_amount: 0.00,
      unallocated_amount: 0.00,
      target_flat_ids: targetFlats.map(f => f.id),
      target_obligation_ids: targetObligationIds,
      paystack_reference: reference,
      payment_method: 'PAYSTACK',
      payment_status: 'PENDING',
      allocation_status: 'UNALLOCATED',
      idempotency_key: `init_${reference}`
    });

    const secretKey = getSecurityPaystackSecret();
    const isLive = isPaystackLiveMode();

    if (secretKey) {
      const origin = req.get('origin') || `http://${req.get('host')}`;
      const callbackUrl = `${origin}/security?verify_reference=${reference}`;

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
            payment_type: 'flat_security_levy',
            transaction_type: transaction.transaction_type,
            building_house_number: building?.house_number || 'N/A',
            billing_month: cleanMonth,
            total_units: totalUnits,
            rate_per_unit: ratePerUnit,
            flat_numbers: targetFlats.map(f => f.flat_number),
            flat_ids: targetFlats.map(f => f.id),
            payer_name: payer_name.trim(),
            estate: 'Finger of God Estate Security Levy'
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
          amount: expectedAmount,
          currency: 'NGN',
          total_units: totalUnits,
          billing_month: cleanMonth,
          mode: isLive ? 'live' : 'test',
          is_simulation: false
        });
      } else {
        console.warn('[Paystack Init Error]', pData);
        return res.status(400).json({
          success: false,
          message: pData.message || 'Payment gateway failed to initialize checkout.'
        });
      }
    }

    // SANDBOX SIMULATION (When key is not configured)
    return res.json({
      success: true,
      authorization_url: `/security?paystack_simulation=true&reference=${reference}`,
      access_code: `sim_${randomHex.toLowerCase()}`,
      reference: reference,
      amount: expectedAmount,
      currency: 'NGN',
      total_units: totalUnits,
      billing_month: cleanMonth,
      mode: 'test',
      is_simulation: true
    });
  } catch (error: any) {
    console.error('Error initializing security levy payment:', error);
    return res.status(500).json({ success: false, message: 'Server error initializing checkout.' });
  }
});

// -------------------------------------------------------------
// 5. SERVER-SIDE PAYMENT VERIFICATION & ATOMIC ALLOCATION
// -------------------------------------------------------------

// POST /api/security-levy/verify-payment
securityLevyRouter.post('/verify-payment', async (req: Request, res: Response) => {
  try {
    const { reference } = req.body;
    if (!reference || typeof reference !== 'string') {
      return res.status(400).json({ success: false, verified: false, message: 'Payment reference is required.' });
    }

    const cleanRef = reference.trim();
    const transaction = await serverDb.getSecurityLevyTransactionByRef(cleanRef);
    if (!transaction) {
      return res.status(404).json({ success: false, verified: false, message: 'Payment attempt record not found.' });
    }

    // If already verified and processed, return existing status immediately (idempotent)
    if (transaction.payment_status === 'SUCCESSFUL' && ['ALLOCATED', 'PARTIALLY_ALLOCATED', 'OVERPAID_UNALLOCATED'].includes(transaction.allocation_status)) {
      const allocations = await serverDb.getFlatPaymentAllocations(transaction.id);
      const isFullyAllocated = transaction.allocation_status === 'ALLOCATED';
      return res.json({
        success: isFullyAllocated,
        verified: true,
        allocation_status: transaction.allocation_status,
        message: isFullyAllocated
          ? 'Payment verified and allocated successfully.'
          : (transaction.allocation_status === 'PARTIALLY_ALLOCATED'
              ? 'Payment verified with partial allocation. Some flats had conflicts.'
              : 'Payment verified but unallocated due to conflicts. Funds held as credit.'),
        transaction,
        allocations
      });
    }

    const secretKey = getSecurityPaystackSecret();
    let verified = false;
    let paystackChannel = 'card';
    let paidAmountKobo = transaction.expected_amount * 100;

    if (secretKey) {
      const pRes = await fetch(`https://api.paystack.co/transaction/verify/${cleanRef}`, {
        headers: {
          'Authorization': `Bearer ${secretKey}`,
          'Content-Type': 'application/json'
        }
      });
      const pData = await pRes.json();

      if (!pRes.ok || !pData.status) {
        return res.status(400).json({
          success: false,
          verified: false,
          message: 'Unable to confirm payment status with Paystack yet.'
        });
      }

      const txData = pData.data;
      if (txData.status !== 'success') {
        return res.status(400).json({
          success: false,
          verified: false,
          message: `Payment status is ${txData.status}. Transaction not completed.`
        });
      }

      if (txData.currency !== 'NGN') {
        return res.status(400).json({
          success: false,
          verified: false,
          message: `Unexpected currency: ${txData.currency}. Expected NGN.`
        });
      }

      const expectedKobo = transaction.expected_amount * 100;
      if (Number(txData.amount) !== expectedKobo) {
        console.warn(`[SECURITY WARNING] Amount discrepancy for ${cleanRef}. Expected: ${expectedKobo}, Got: ${txData.amount}`);
        const receivedNaira = Number(txData.amount) / 100;
        
        // Underpayment or Overpayment must not be marked fully settled
        // Preserve mismatched genuine payments for reconciliation
        await serverDb.updateSecurityLevyTransaction(transaction.id, {
          payment_status: receivedNaira < transaction.expected_amount ? 'PARTIALLY_PAID' : 'OVERPAID',
          verified_amount: receivedNaira,
          verified_at: new Date().toISOString(),
          channel_payload: {
            channel: txData.channel || 'card',
            paystack_data: txData,
            mismatch_reason: receivedNaira < transaction.expected_amount ? 'UNDERPAYMENT' : 'OVERPAYMENT'
          },
          reconciliation_notes: `Amount discrepancy detected: expected ₦${transaction.expected_amount}, received ₦${receivedNaira}. Held for administrative reconciliation.`
        });

        return res.status(400).json({
          success: false,
          verified: false,
          mismatch: true,
          message: `Amount paid (₦${receivedNaira.toLocaleString()}) does not match expected amount (₦${transaction.expected_amount.toLocaleString()}). Payment recorded and preserved for administrative reconciliation.`
        });
      }

      verified = true;
      paystackChannel = txData.channel || 'card';
      paidAmountKobo = txData.amount;
    } else {
      // In production, sandbox fallback is strictly disabled
      if (process.env.NODE_ENV === 'production') {
        return res.status(503).json({
          success: false,
          verified: false,
          message: 'Paystack secret key is not configured on the production server. Sandbox fallback disabled.'
        });
      }
      // Sandbox fallback mode (development / test only)
      verified = true;
    }

    if (verified) {
      const now = new Date().toISOString();
      const verifiedAmount = paidAmountKobo / 100;

      // Update Transaction to SUCCESSFUL
      await serverDb.updateSecurityLevyTransaction(transaction.id, {
        payment_status: 'SUCCESSFUL',
        verified_amount: verifiedAmount,
        verified_at: now,
        channel_payload: { channel: paystackChannel, verified_at: now }
      });

      // Execute Atomic Allocation
      const allocResult = await serverDb.allocateSecurityLevyPayment(transaction.id, 'PAYSTACK_VERIFY');
      const updatedTx = await serverDb.getSecurityLevyTransactionById(transaction.id);
      const allocations = await serverDb.getFlatPaymentAllocations(transaction.id);

      // CRITICAL: Payment success requires complete, conflict-free allocation
      const isFullyAllocated = 
        updatedTx.allocation_status === 'ALLOCATED' &&
        allocResult.success &&
        allocResult.conflict_count === 0 &&
        Number(updatedTx.unallocated_amount || 0) === 0;

      const message = isFullyAllocated
        ? 'Payment verified and allocated to flat ledger successfully.'
        : (updatedTx.allocation_status === 'PARTIALLY_ALLOCATED'
            ? 'Payment verified with partial allocation. Some flats were already paid.'
            : 'Payment verified but could not be allocated due to conflicts. Funds held as unallocated credit.');

      return res.json({
        success: isFullyAllocated,
        verified: true,
        allocation_status: updatedTx.allocation_status,
        message,
        transaction: updatedTx,
        allocation_result: allocResult,
        allocations
      });
    }

    return res.status(400).json({ success: false, verified: false, message: 'Verification could not be confirmed.' });
  } catch (error: any) {
    console.error('Error verifying security levy payment:', error);
    return res.status(500).json({ success: false, verified: false, message: 'Server verification error.' });
  }
});

// -------------------------------------------------------------
// 6. ADMIN MANUAL PAYMENT RECORDING
// -------------------------------------------------------------

// POST /api/security-levy/manual-payment (Admin Only)
securityLevyRouter.post('/manual-payment', requireSecurityAdmin, async (req: Request, res: Response) => {
  try {
    const adminUser = (req as any).adminUser as VerifiedAdminUser;
    const {
      transaction_type,
      building_id,
      flat_ids,
      billing_month,
      payer_name,
      payer_email,
      payer_phone,
      payer_type,
      payment_method, // 'MANUAL_BANK_TRANSFER' | 'MANUAL_CASH' | 'MANUAL_POS'
      bank_reference,
      notes
    } = req.body;

    if (!flat_ids || !Array.isArray(flat_ids) || flat_ids.length === 0) {
      return res.status(400).json({ success: false, message: 'At least one flat must be selected.' });
    }

    if (!payer_name || !notes) {
      return res.status(400).json({ success: false, message: 'Payer name and supporting administrative notes are required.' });
    }

    const cleanMonth = (billing_month || new Date().toISOString().slice(0, 7)).trim();
    const flats = await serverDb.getFlats();
    const targetFlats = flats.filter(f => flat_ids.includes(f.id));

    if (targetFlats.length !== flat_ids.length) {
      return res.status(400).json({ success: false, message: 'One or more selected flats could not be found.' });
    }

    const ratePerUnit = 1500.00;
    const totalUnits = targetFlats.length;
    const expectedAmount = ratePerUnit * totalUnits;

    // Check if flats are already marked PAID
    const obligations = await serverDb.getObligations({ billingMonth: cleanMonth });
    const paidFlats = targetFlats.filter(f => {
      const ob = obligations.find(o => o.flat_id === f.id);
      return ob && ob.status === 'PAID';
    });

    if (paidFlats.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Flat ${paidFlats.map(f => f.flat_number).join(', ')} is already marked PAID for ${cleanMonth}. Double recording prevented.`
      });
    }

    // Target obligations
    const targetObligationIds: string[] = [];
    for (const f of targetFlats) {
      let ob = obligations.find(o => o.flat_id === f.id);
      if (!ob) {
        ob = await serverDb.saveObligation({
          flat_id: f.id,
          billing_month: cleanMonth,
          amount_due: ratePerUnit,
          amount_paid: 0,
          balance_due: ratePerUnit,
          status: 'UNPAID',
          is_billed: true
        });
      }
      targetObligationIds.push(ob.id);
    }

    const monthTag = cleanMonth.replace('-', '');
    const randomHex = crypto.randomBytes(3).toString('hex').toUpperCase();
    const manualRef = `MAN-${monthTag}-${totalUnits}F-${randomHex}`;

    // Create Transaction Record
    const transaction = await serverDb.saveSecurityLevyTransaction({
      transaction_type: totalUnits > 1 ? 'BULK_FLATS' : 'INDIVIDUAL_FLAT',
      building_id: building_id || targetFlats[0].building_id,
      payer_name: payer_name.trim(),
      payer_email: (payer_email || `${adminUser.email}`).trim(),
      payer_phone: payer_phone?.trim() || null,
      payer_type: payer_type || 'LANDLORD',
      billing_month: cleanMonth,
      total_units: totalUnits,
      rate_per_unit: ratePerUnit,
      expected_amount: expectedAmount,
      verified_amount: expectedAmount,
      allocated_amount: 0.00,
      unallocated_amount: 0.00,
      target_flat_ids: targetFlats.map(f => f.id),
      target_obligation_ids: targetObligationIds,
      paystack_reference: manualRef,
      payment_method: payment_method || 'MANUAL_BANK_TRANSFER',
      payment_status: 'SUCCESSFUL',
      allocation_status: 'UNALLOCATED',
      idempotency_key: `manual_${manualRef}`,
      verified_at: new Date().toISOString()
    });

    // Execute Atomic Allocation
    const allocResult = await serverDb.allocateSecurityLevyPayment(transaction.id, adminUser.email);

    // Record in manual payment logs
    await serverDb.saveManualPaymentLog({
      payment_type: transaction.transaction_type,
      flat_id: targetFlats.length === 1 ? targetFlats[0].id : null,
      transaction_id: transaction.id,
      admin_email: adminUser.email,
      amount: expectedAmount,
      payment_method: transaction.payment_method,
      bank_reference: bank_reference || null,
      receipt_reference: allocResult.receipts?.[0] || manualRef,
      notes: notes.trim()
    });

    const updatedTx = await serverDb.getSecurityLevyTransactionById(transaction.id);
    const allocations = await serverDb.getFlatPaymentAllocations(transaction.id);

    return res.status(201).json({
      success: true,
      message: `Manual payment of ₦${expectedAmount.toLocaleString()} recorded for ${totalUnits} flat(s).`,
      transaction: updatedTx,
      allocations
    });
  } catch (error: any) {
    console.error('Error recording manual payment:', error);
    return res.status(500).json({ success: false, message: 'Failed to record manual payment.' });
  }
});

// -------------------------------------------------------------
// 7. TRANSACTIONS, ALLOCATIONS, RECEIPTS & AUDIT LOGS
// -------------------------------------------------------------

// GET /api/security-levy/transactions (Admin Only)
securityLevyRouter.get('/transactions', requireSecurityAdmin, async (req: Request, res: Response) => {
  try {
    const transactions = await serverDb.getSecurityLevyTransactions();
    const buildings = await serverDb.getBuildings();

    const enriched = transactions.map(t => {
      const b = buildings.find(bg => bg.id === t.building_id);
      return {
        ...t,
        building_house_number: b?.house_number || 'N/A'
      };
    });

    return res.json({
      success: true,
      data: enriched,
      count: enriched.length
    });
  } catch (error: any) {
    console.error('Error fetching transactions:', error);
    return res.status(500).json({ success: false, message: 'Failed to retrieve transactions.' });
  }
});

// GET /api/security-levy/allocations
securityLevyRouter.get('/allocations', async (req: Request, res: Response) => {
  try {
    const { transactionId, flatId } = req.query;
    const allocations = await serverDb.getFlatPaymentAllocations(
      transactionId ? String(transactionId) : undefined,
      flatId ? String(flatId) : undefined
    );
    const flats = await serverDb.getFlats();
    const buildings = await serverDb.getBuildings();

    const enriched = allocations.map(a => {
      const fl = flats.find(f => f.id === a.flat_id);
      const b = fl ? buildings.find(bg => bg.id === fl.building_id) : null;
      return {
        ...a,
        flat_number: fl?.flat_number || 'Unknown Flat',
        building_house_number: b?.house_number || 'Unknown House'
      };
    });

    return res.json({
      success: true,
      data: enriched,
      count: enriched.length
    });
  } catch (error: any) {
    console.error('Error fetching allocations:', error);
    return res.status(500).json({ success: false, message: 'Failed to retrieve allocations.' });
  }
});

// GET /api/security-levy/receipt/:receiptNumber
securityLevyRouter.get('/receipt/:receiptNumber', async (req: Request, res: Response) => {
  try {
    const { receiptNumber } = req.params;
    const cleanNo = receiptNumber.trim().toUpperCase();

    const allocations = await serverDb.getFlatPaymentAllocations();
    const allocation = allocations.find(a => a.receipt_number.toUpperCase() === cleanNo);

    if (!allocation) {
      return res.status(404).json({ success: false, message: 'Receipt not found.' });
    }

    const flat = await serverDb.getFlatById(allocation.flat_id);
    const building = flat ? await serverDb.getBuildingById(flat.building_id) : null;
    const transaction = await serverDb.getSecurityLevyTransactionById(allocation.transaction_id);

    return res.json({
      success: true,
      receipt: {
        receipt_number: allocation.receipt_number,
        billing_month: allocation.billing_month,
        amount_paid: allocation.allocated_amount,
        rate_snapshot: allocation.rate_snapshot,
        payment_method: allocation.payment_method,
        issued_at: allocation.allocation_timestamp,
        paystack_reference: allocation.paystack_reference,
        flat_number: flat?.flat_number || 'N/A',
        building_house_number: building?.house_number || 'N/A',
        occupant_name: flat?.occupant_name || null,
        payer_name: transaction?.payer_name || 'Resident / Landlord',
        payer_type: transaction?.payer_type || 'N/A'
      }
    });
  } catch (error: any) {
    console.error('Error looking up receipt:', error);
    return res.status(500).json({ success: false, message: 'Failed to retrieve receipt.' });
  }
});

// GET /api/security-levy/audit-logs (Admin Only)
securityLevyRouter.get('/audit-logs', requireSecurityAdmin, async (req: Request, res: Response) => {
  try {
    const logs = await serverDb.getEstateAuditLogs(100);
    return res.json({
      success: true,
      data: logs,
      count: logs.length
    });
  } catch (error: any) {
    console.error('Error fetching audit logs:', error);
    return res.status(500).json({ success: false, message: 'Failed to retrieve audit logs.' });
  }
});

// POST /api/security-levy/cancel-checkout
securityLevyRouter.post('/cancel-checkout', async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7).trim() : null;

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized: Authentication required to cancel checkout session.'
      });
    }

    const { reference } = req.body;
    if (!reference || typeof reference !== 'string') {
      return res.status(400).json({ success: false, message: 'Payment reference is required.' });
    }

    const cleanRef = reference.trim();
    const tx = await serverDb.getSecurityLevyTransactionByRef(cleanRef);
    if (!tx) {
      return res.status(404).json({ success: false, message: 'Transaction not found.' });
    }

    // 1. Authenticate caller (Admin OR Resident)
    let isAuthorized = false;
    let actorDescription = 'UNKNOWN';

    // Check if Administrator
    const adminCheck = await verifyAdminToken(token);
    if (adminCheck.valid && adminCheck.user) {
      isAuthorized = true;
      actorDescription = `ADMIN:${adminCheck.user.email}`;
    } else {
      // Check if Resident session
      const session = serverDb.getResidentSession(token);
      let resident: any = null;

      if (session) {
        resident = await serverDb.getResidentByNumber(session.resident_number);
      } else if (token.startsWith('eyJ')) {
        // Try Supabase Auth user token
        try {
          const { data: { user }, error: userErr } = await supabaseAdmin.auth.getUser(token);
          if (!userErr && user) {
            resident = await serverDb.getResidentByAuthId(user.id);
            if (!resident && user.email) {
              const residents = await serverDb.getResidents();
              resident = residents.find((r: any) => r.email?.toLowerCase() === user.email?.toLowerCase());
            }
          }
        } catch {}
      }

      if (!resident) {
        return res.status(401).json({
          success: false,
          message: 'Unauthorized: Invalid or expired resident session token.'
        });
      }

      // 2. Strict Ownership Verification: Verify transaction belongs to this resident
      const flats = await serverDb.getFlats();
      const residentFlats = flats.filter(f => f.resident_id === resident.id || (resident.house_number && f.flat_number && resident.house_number.includes(f.flat_number)));
      const residentFlatIds = new Set(residentFlats.map(f => f.id));

      const isOwnerByEmail = Boolean(resident.email && tx.payer_email && resident.email.toLowerCase() === tx.payer_email.toLowerCase());
      const isOwnerByPhone = Boolean(resident.phone_number && tx.payer_phone && arePhoneNumbersEqual(resident.phone_number, tx.payer_phone));
      const isOwnerByNumber = Boolean(resident.resident_number && tx.payer_name && (tx.payer_name.includes(resident.resident_number) || resident.full_name?.toLowerCase() === tx.payer_name.toLowerCase()));
      const isOwnerByFlat = Array.isArray(tx.target_flat_ids) && tx.target_flat_ids.some((fid: string) => residentFlatIds.has(fid));

      if (isOwnerByEmail || isOwnerByPhone || isOwnerByNumber || isOwnerByFlat) {
        isAuthorized = true;
        actorDescription = `RESIDENT:${resident.resident_number}`;
      } else {
        return res.status(403).json({
          success: false,
          message: 'Forbidden: You are not authorized to cancel this checkout session. Transaction does not belong to your resident profile.'
        });
      }
    }

    if (!isAuthorized) {
      return res.status(403).json({ success: false, message: 'Forbidden: Unauthorized access.' });
    }

    // 3. Status checks: never cancel settled payments
    if (tx.payment_status === 'CANCELLED') {
      return res.json({ success: true, message: 'Checkout session is already cancelled.' });
    }

    if (tx.payment_status !== 'PENDING') {
      return res.status(400).json({
        success: false,
        message: `Cannot cancel transaction with status ${tx.payment_status}. Only pending checkout sessions can be cancelled.`
      });
    }

    // 4. Concurrency & atomic lock release: release ONLY locks for this reference and target obligations
    const targetObligations = Array.isArray(tx.target_obligation_ids) && tx.target_obligation_ids.length > 0
      ? tx.target_obligation_ids
      : (await serverDb.getObligations({ billingMonth: tx.billing_month })).filter((o: any) => tx.target_flat_ids?.includes(o.flat_id)).map((o: any) => o.id);

    for (const obId of targetObligations) {
      const ob = (await serverDb.getObligations()).find((o: any) => o.id === obId);
      if (ob && ob.locked_by_reference === tx.paystack_reference) {
        await serverDb.updateObligation(ob.id, {
          locked_by_reference: null,
          lock_expires_at: null
        });
      }
    }

    const updated = await serverDb.updateSecurityLevyTransaction(tx.id, {
      payment_status: 'CANCELLED',
      reconciliation_notes: `Checkout cancelled by ${actorDescription} at ${new Date().toISOString()}.`
    });

    if (!updated) {
      return res.status(500).json({ success: false, message: 'Failed to update transaction status in database.' });
    }

    return res.json({
      success: true,
      message: 'Checkout session cancelled and flat reservations released successfully.',
      transaction_id: tx.id
    });
  } catch (error: any) {
    console.error('Error cancelling checkout:', error);
    return res.status(500).json({ success: false, message: 'Server error cancelling checkout.' });
  }
});

// -------------------------------------------------------------
// 8. WEBHOOK DELEGATE FOR SERVER.TS
// -------------------------------------------------------------
export async function processVerifiedSecurityLevyPaystackEvent(data: any): Promise<void> {
  const reference = data?.reference;
  if (!reference) return;

  const transaction = await serverDb.getSecurityLevyTransactionByRef(reference);
  if (!transaction) {
    console.log(`[Security Levy Webhook] No matching transaction found for ref ${reference}`);
    return;
  }

  // Idempotency: If already allocated or processed, return immediately
  if (transaction.payment_status === 'SUCCESSFUL' && ['ALLOCATED', 'PARTIALLY_ALLOCATED', 'OVERPAID_UNALLOCATED'].includes(transaction.allocation_status)) {
    console.log(`[Security Levy Webhook] Transaction ${reference} already processed (status: ${transaction.allocation_status}).`);
    return;
  }

  // Status validation: Gateway status must be strictly 'success'
  if (!data.status || data.status !== 'success') {
    console.warn(`[Security Levy Webhook Warning] Non-success gateway status (${data.status}) received for ref ${reference}`);
    return;
  }

  // Currency validation: Currency must be explicitly present and NGN
  if (!data.currency || data.currency !== 'NGN') {
    console.warn(`[Security Levy Webhook Warning] Missing or non-NGN currency (${data.currency}) received for ref ${reference}`);
    return;
  }

  // Validate amount
  const paidKobo = Number(data.amount);
  const expectedKobo = transaction.expected_amount * 100;
  if (paidKobo !== expectedKobo) {
    console.warn(`[Security Levy Webhook Warning] Amount mismatch on ${reference}. Expected ${expectedKobo}, got ${paidKobo}`);
    const receivedNaira = paidKobo / 100;
    
    // Both underpayments and overpayments must not be marked fully settled
    // Preserve mismatched genuine payments for administrative reconciliation
    await serverDb.updateSecurityLevyTransaction(transaction.id, {
      payment_status: receivedNaira < transaction.expected_amount ? 'PARTIALLY_PAID' : 'OVERPAID',
      verified_amount: receivedNaira,
      verified_at: data.paid_at || new Date().toISOString(),
      channel_payload: {
        paystack_data: data,
        mismatch_reason: receivedNaira < transaction.expected_amount ? 'UNDERPAYMENT' : 'OVERPAYMENT'
      },
      reconciliation_notes: `Webhook amount discrepancy: expected ₦${transaction.expected_amount}, received ₦${receivedNaira}. Held for administrative reconciliation.`
    });
    return;
  }

  const now = new Date().toISOString();
  await serverDb.updateSecurityLevyTransaction(transaction.id, {
    payment_status: 'SUCCESSFUL',
    verified_amount: paidKobo / 100,
    verified_at: data.paid_at || now,
    channel_payload: data
  });

  const allocResult = await serverDb.allocateSecurityLevyPayment(transaction.id, 'PAYSTACK_WEBHOOK');
  console.log(`[Security Levy Webhook] Processed and allocated transaction ${reference}:`, allocResult);
  if (!allocResult.success && allocResult.error?.includes('SUPABASE_')) {
    throw new Error(`Authoritative allocation failed: ${allocResult.error}`);
  }
}
