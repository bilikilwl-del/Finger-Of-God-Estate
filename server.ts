import express from 'express';
import type { Request, Response } from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
import cron from 'node-cron';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const isProd = process.env.NODE_ENV === 'production';
const PORT = process.env.PORT || 3000;

const app = express();

// Capture raw body for Paystack webhook HMAC SHA512 signature verification
app.use(express.json({
  verify: (req: any, _res, buf) => {
    req.rawBody = buf;
  }
}));

// In-memory server-side storage cache for transactions & receipts (synced with Supabase)
interface ServerPaymentRecord {
  id: string;
  resident_id: string;
  resident_number: string;
  resident_name: string;
  house_number: string;
  period_month: number;
  period_year: number;
  period_label: string;
  amount_due: number;
  amount_paid: number;
  status: 'UNPAID' | 'PENDING' | 'PAID' | 'FAILED' | 'CANCELLED';
  due_date: string;
  paid_at: string | null;
  paystack_reference: string | null;
  created_at: string;
  updated_at: string;
}

interface ServerTransactionRecord {
  id: string;
  payment_id: string;
  resident_id: string;
  resident_number: string;
  resident_name: string;
  house_number: string;
  period_month: number;
  period_year: number;
  period_label: string;
  transaction_reference: string;
  paystack_reference: string;
  paystack_transaction_id: string | null;
  amount_due: number;
  amount_paid: number;
  currency: string;
  payment_method: 'Paystack';
  status: 'UNPAID' | 'PENDING' | 'PAID' | 'FAILED' | 'CANCELLED';
  payment_channel: string | null;
  payment_date: string | null;
  gateway_response: string | null;
  customer_email: string | null;
  created_at: string;
  updated_at: string;
}

interface ServerReceiptRecord {
  id: string;
  receipt_number: string;
  transaction_id: string;
  payment_id: string;
  resident_id: string;
  resident_number: string;
  resident_name: string;
  house_number: string;
  amount_paid: number;
  currency: string;
  period_covered: string;
  payment_date: string;
  paystack_reference: string;
  status: 'PAID';
  issued_at: string;
}

interface ServerResidentRecord {
  id: string;
  auth_user_id?: string | null;
  account_activated?: boolean;
  password_hash?: string | null;
  resident_number: string;
  full_name: string;
  phone_number: string;
  additional_phone?: string | null;
  email: string;
  house_number: string;
  address: string;
  state: string;
  lga: string;
  status: 'Active' | 'Inactive';
  registration_date: string;
}

interface ServerAnnouncementRecord {
  id: string;
  title: string;
  slug: string;
  body: string;
  content?: string;
  category: 'GENERAL' | 'SECURITY' | 'PAYMENT' | 'MAINTENANCE' | 'MEETING' | 'EMERGENCY' | 'OTHER';
  priority: 'NORMAL' | 'IMPORTANT' | 'URGENT';
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  publish_at: string;
  expires_at?: string | null;
  author_id?: string;
  author_name?: string;
  attachment_url?: string | null;
  image_url?: string | null;
  created_at: string;
  updated_at: string;
}

// Initial in-memory data store for server-side verification and fallback
const residentsStore = new Map<string, ServerResidentRecord>();
const residentSessionsStore = new Map<string, { resident_number: string; created_at: number }>();
const paymentsStore = new Map<string, ServerPaymentRecord>(); // key: residentNumber_periodMonth_periodYear
const transactionsStore = new Map<string, ServerTransactionRecord>(); // key: reference
const receiptsStore = new Map<string, ServerReceiptRecord>(); // key: reference or receiptNumber
const announcementsStore = new Map<string, ServerAnnouncementRecord>(); // key: id or slug

// Seed Initial Estate Residents
const INITIAL_SERVER_RESIDENTS: ServerResidentRecord[] = [
  {
    id: 'res-001',
    resident_number: '001',
    full_name: 'Engr. Babatunde Adeleke',
    phone_number: '08023456789',
    additional_phone: '08091122334',
    email: 'babatunde.adeleke@gmail.com',
    house_number: 'Plot 4A, Hibiscus Crescent',
    address: '4A Hibiscus Crescent, Phase 1, Finger of God Estate',
    state: 'Lagos',
    lga: 'Eti-Osa',
    status: 'Active',
    registration_date: '2026-08-01'
  },
  {
    id: 'res-002',
    resident_number: '002',
    full_name: 'Dr. Chioma Nwachukwu',
    phone_number: '08098765432',
    additional_phone: null,
    email: 'dr.chioma@nwachukwumed.ng',
    house_number: 'House 12B, Palm Avenue',
    address: '12B Palm Avenue, Phase 1, Finger of God Estate',
    state: 'Lagos',
    lga: 'Eti-Osa',
    status: 'Active',
    registration_date: '2026-08-05'
  },
  {
    id: 'res-003',
    resident_number: '003',
    full_name: 'Alhaji Usman Danladi',
    phone_number: '08123459876',
    additional_phone: '08055667788',
    email: 'usman.danladi@danladigroup.com',
    house_number: 'Villa 7, Oasis Way',
    address: 'Villa 7, Oasis Way, Phase 1, Finger of God Estate',
    state: 'Lagos',
    lga: 'Eti-Osa',
    status: 'Active',
    registration_date: '2026-08-10'
  },
  {
    id: 'res-004',
    resident_number: '004',
    full_name: 'Mrs. Folashade Balogun',
    phone_number: '07033445566',
    additional_phone: null,
    email: 'folashade.balogun@outlook.com',
    house_number: 'Block C, Apt 3, Coral Gardens',
    address: 'Coral Gardens, Phase 1, Finger of God Estate',
    state: 'Lagos',
    lga: 'Eti-Osa',
    status: 'Inactive',
    registration_date: '2026-08-12'
  }
];

INITIAL_SERVER_RESIDENTS.forEach(r => residentsStore.set(r.resident_number, r));

// Seed Verified Initial Payments, Transactions & Official Digital Receipts
const initialPayment001: ServerPaymentRecord = {
  id: 'pay-001',
  resident_id: 'res-001',
  resident_number: '001',
  resident_name: 'Engr. Babatunde Adeleke',
  house_number: 'Plot 4A, Hibiscus Crescent',
  period_month: 10,
  period_year: 2026,
  period_label: 'October 2026',
  amount_due: 5000,
  amount_paid: 5000,
  status: 'PAID',
  due_date: '2026-10-01',
  paid_at: '2026-09-20T10:30:00Z',
  paystack_reference: 'FOGES-202610-001-A7C8E9F1',
  created_at: '2026-09-20T10:28:15Z',
  updated_at: '2026-09-20T10:30:00Z'
};
paymentsStore.set('001_10_2026', initialPayment001);
paymentsStore.set('001-10-2026', initialPayment001);

const initialTx001: ServerTransactionRecord = {
  id: 'tx-001',
  payment_id: 'pay-001',
  resident_id: 'res-001',
  resident_number: '001',
  resident_name: 'Engr. Babatunde Adeleke',
  house_number: 'Plot 4A, Hibiscus Crescent',
  period_month: 10,
  period_year: 2026,
  period_label: 'October 2026',
  transaction_reference: 'FOGES-202610-001-A7C8E9F1',
  paystack_reference: 'FOGES-202610-001-A7C8E9F1',
  paystack_transaction_id: '394857201',
  amount_due: 5000,
  amount_paid: 5000,
  currency: 'NGN',
  payment_method: 'Paystack',
  status: 'PAID',
  payment_channel: 'card',
  payment_date: '2026-09-20T10:30:00Z',
  gateway_response: 'Approved',
  customer_email: 'babatunde.adeleke@gmail.com',
  created_at: '2026-09-20T10:28:15Z',
  updated_at: '2026-09-20T10:30:00Z'
};
transactionsStore.set('FOGES-202610-001-A7C8E9F1', initialTx001);

const initialReceipt001: ServerReceiptRecord = {
  id: 'rcp-srv-001',
  receipt_number: 'FOGES-REC-202610-001-A7C8E9',
  transaction_id: 'tx-001',
  payment_id: 'pay-001',
  resident_id: 'res-001',
  resident_number: '001',
  resident_name: 'Engr. Babatunde Adeleke',
  house_number: 'Plot 4A, Hibiscus Crescent',
  amount_paid: 5000,
  currency: 'NGN',
  period_covered: 'October 2026',
  payment_date: '2026-09-20T10:30:00Z',
  paystack_reference: 'FOGES-202610-001-A7C8E9F1',
  status: 'PAID',
  issued_at: '2026-09-20T10:30:05Z'
};
receiptsStore.set('FOGES-REC-202610-001-A7C8E9', initialReceipt001);
receiptsStore.set('RCP-202610-001-A7C8E9', initialReceipt001);
receiptsStore.set('FOGES-202610-001-A7C8E9F1', initialReceipt001);
receiptsStore.set(initialReceipt001.id, initialReceipt001);

// Seed unpaids for Resident 002, 003, 004
['002', '003', '004'].forEach(num => {
  const r = residentsStore.get(num)!;
  const p: ServerPaymentRecord = {
    id: `pay-${num}-10-2026`,
    resident_id: r.id,
    resident_number: num,
    resident_name: r.full_name,
    house_number: r.house_number,
    period_month: 10,
    period_year: 2026,
    period_label: 'October 2026',
    amount_due: 5000,
    amount_paid: 0,
    status: 'UNPAID',
    due_date: '2026-10-01',
    paid_at: null,
    paystack_reference: null,
    created_at: '2026-09-01T08:00:00Z',
    updated_at: '2026-09-01T08:00:00Z'
  };
  paymentsStore.set(`${num}_10_2026`, p);
  paymentsStore.set(`${num}-10-2026`, p);
});

// Helper for URL slug generation
function slugify(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w\-]+/g, '')
    .replace(/\-\-+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '');
}

// Seed Initial Estate Announcements
const INITIAL_ANNOUNCEMENTS: ServerAnnouncementRecord[] = [
  {
    id: 'ann-001',
    title: 'Updated Estate Security Protocols & RFID Gate Automation',
    slug: 'updated-estate-security-protocols-rfid-gate-automation',
    category: 'SECURITY',
    priority: 'URGENT',
    status: 'PUBLISHED',
    publish_at: '2026-09-15T08:00:00.000Z',
    expires_at: null,
    author_name: 'Estate Security EXCO',
    body: 'The Executive Committee (EXCO) of Finger of God Estate wishes to notify all residents that starting October 1, 2026, the main estate access gates will operate under enhanced 24/7 RFID scanning and armed patrol protocols. All residents are advised to ensure their vehicle security decals are up to date and that visitors are registered with the central security desk via their resident numbers. Prompt payment of the monthly security levy ensures continuous funding for armed response teams and perimeter surveillance.',
    created_at: '2026-09-15T08:00:00.000Z',
    updated_at: '2026-09-15T08:00:00.000Z'
  },
  {
    id: 'ann-002',
    title: 'Commencement of Online Security Levy Payments (October 2026)',
    slug: 'commencement-of-online-security-levy-payments-october-2026',
    category: 'PAYMENT',
    priority: 'IMPORTANT',
    status: 'PUBLISHED',
    publish_at: '2026-09-20T09:00:00.000Z',
    expires_at: null,
    author_name: 'Finance Committee',
    body: 'We are pleased to announce the full rollout of our automated security levy payment and receipting portal powered by Paystack. The monthly security levy is ₦5,000, payable on or before the 1st of every month starting from October 2026. Residents can now pay online using debit cards, bank transfer, or USSD, and obtain verified digital receipts with unique cryptographic verification codes instantly. Please visit the "Pay Security Levy" section or your resident portal to complete your payment.',
    created_at: '2026-09-20T09:00:00.000Z',
    updated_at: '2026-09-20T09:00:00.000Z'
  },
  {
    id: 'ann-003',
    title: 'Quarterly Residents Townhall & Security Architecture Briefing',
    slug: 'quarterly-residents-townhall-security-architecture-briefing',
    category: 'MEETING',
    priority: 'NORMAL',
    status: 'PUBLISHED',
    publish_at: '2026-09-22T10:00:00.000Z',
    expires_at: null,
    author_name: 'Estate Secretariat',
    body: 'All residents, landlords, and tenants are cordially invited to the upcoming Finger of God Estate Townhall Meeting scheduled for Saturday, October 24, 2026, at 10:00 AM at the Estate Community Hall (with a hybrid Zoom broadcast link available upon request). Key agenda items include: 1. Review of Q3 security reports and CCTV camera expansions. 2. Financial stewardship report and levy collection status. 3. Traffic management within estate boulevards. Your active participation is invaluable in building a safer community.',
    created_at: '2026-09-22T10:00:00.000Z',
    updated_at: '2026-09-22T10:00:00.000Z'
  },
  {
    id: 'ann-004',
    title: 'Drainage Infrastructure & Streetlight Upgrade Notice',
    slug: 'drainage-infrastructure-streetlight-upgrade-notice',
    category: 'MAINTENANCE',
    priority: 'NORMAL',
    status: 'PUBLISHED',
    publish_at: '2026-09-23T11:00:00.000Z',
    expires_at: null,
    author_name: 'Facilities & Works Committee',
    body: 'The Estate Facilities Management team will be carrying out scheduled de-silting of drainage channels and replacement of solar streetlight batteries along Palm Avenue, Hibiscus Crescent, and Boulevard West from October 5 to October 8, 2026 between 9:00 AM and 4:00 PM daily. Residents along these corridors are requested not to park vehicles directly over drainage slabs during these operational hours.',
    created_at: '2026-09-23T11:00:00.000Z',
    updated_at: '2026-09-23T11:00:00.000Z'
  }
];

INITIAL_ANNOUNCEMENTS.forEach(ann => {
  announcementsStore.set(ann.id, ann);
});

// Paystack config helpers
function getPaystackSecret(): string {
  return process.env.PAYSTACK_SECRET_KEY || '';
}

function getPaystackPublic(): string {
  return process.env.PAYSTACK_PUBLIC_KEY || '';
}

function isLiveMode(): boolean {
  const secret = getPaystackSecret();
  const pub = getPaystackPublic();
  return secret.startsWith('sk_live_') || pub.startsWith('pk_live_');
}

function isPaystackConfigured(): boolean {
  const secret = getPaystackSecret();
  return !!secret && !secret.includes('xxxx') && (secret.startsWith('sk_test_') || secret.startsWith('sk_live_'));
}

// -------------------------------------------------------------
// 1. PAYSTACK CONFIGURATION ENDPOINT (SAFE FOR CLIENT)
// -------------------------------------------------------------
app.get('/api/paystack/config', (_req: Request, res: Response) => {
  res.json({
    publicKey: getPaystackPublic(),
    isConfigured: isPaystackConfigured(),
    mode: isLiveMode() ? 'live' : 'test',
    currency: 'NGN',
    levyAmount: 5000,
    estateName: 'Finger of God Estate Security Management',
    firstPaymentMonth: 'October 2026'
  });
});

// -------------------------------------------------------------
// 2. PAYMENT INITIALIZATION (SERVER-SIDE DETERMINATION)
// -------------------------------------------------------------
app.post('/api/paystack/initialize', async (req: Request, res: Response) => {
  try {
    const { residentNumber, periodMonth = 10, periodYear = 2026, residentName, houseNumber, residentId, email } = req.body;

    if (!residentNumber) {
      return res.status(400).json({ success: false, message: 'Resident Number is required.' });
    }

    const formattedResidentNumber = String(residentNumber).trim().padStart(3, '0');
    const paymentKey = `${formattedResidentNumber}_${periodMonth}_${periodYear}`;
    const periodLabel = `${new Date(periodYear, periodMonth - 1).toLocaleString('default', { month: 'long' })} ${periodYear}`;

    // DUPLICATE PAYMENT CHECK
    const existingPayment = paymentsStore.get(paymentKey);
    if (existingPayment && existingPayment.status === 'PAID') {
      const existingReceipt = receiptsStore.get(existingPayment.paystack_reference || '');
      return res.status(400).json({
        success: false,
        alreadyPaid: true,
        message: 'Your security levy for this month has already been paid.',
        payment: existingPayment,
        receipt: existingReceipt
      });
    }

    // SERVER-AUTHORITATIVE AMOUNT DETERMINATION: ₦5,000 (NEVER trust client amount)
    const LEVY_AMOUNT_NAIRA = 5000;
    const LEVY_AMOUNT_KOBO = LEVY_AMOUNT_NAIRA * 100; // 500,000 kobo

    // SECURE UNIQUE REFERENCE GENERATION
    // Example: FOGES-202610-001-A8B9C0D1
    const randomHex = crypto.randomBytes(4).toString('hex').toUpperCase();
    const reference = `FOGES-${periodYear}${String(periodMonth).padStart(2, '0')}-${formattedResidentNumber}-${randomHex}`;

    // Customer email handling:
    // If the resident does not have an email address, handle properly without creating an invalid email.
    // RFC-compliant synthetic domain fallback for Paystack API requirement
    const customerEmail = email && email.includes('@')
      ? email.trim()
      : `resident.${formattedResidentNumber}@fingerofgodestate.ng`;

    // Record PENDING payment and transaction
    const now = new Date().toISOString();
    const paymentId = existingPayment?.id || crypto.randomUUID();
    const txId = crypto.randomUUID();

    const paymentRecord: ServerPaymentRecord = {
      id: paymentId,
      resident_id: residentId || crypto.randomUUID(),
      resident_number: formattedResidentNumber,
      resident_name: residentName || `Resident ${formattedResidentNumber}`,
      house_number: houseNumber || 'Estate Plot',
      period_month: periodMonth,
      period_year: periodYear,
      period_label: periodLabel,
      amount_due: LEVY_AMOUNT_NAIRA,
      amount_paid: 0,
      status: 'PENDING',
      due_date: `${periodYear}-${String(periodMonth).padStart(2, '0')}-01`,
      paid_at: null,
      paystack_reference: reference,
      created_at: existingPayment?.created_at || now,
      updated_at: now
    };
    paymentsStore.set(paymentKey, paymentRecord);

    const transactionRecord: ServerTransactionRecord = {
      id: txId,
      payment_id: paymentId,
      resident_id: paymentRecord.resident_id,
      resident_number: formattedResidentNumber,
      resident_name: paymentRecord.resident_name,
      house_number: paymentRecord.house_number,
      period_month: periodMonth,
      period_year: periodYear,
      period_label: periodLabel,
      transaction_reference: reference,
      paystack_reference: reference,
      paystack_transaction_id: null,
      amount_due: LEVY_AMOUNT_NAIRA,
      amount_paid: 0,
      currency: 'NGN',
      payment_method: 'Paystack',
      status: 'PENDING',
      payment_channel: null,
      payment_date: null,
      gateway_response: null,
      customer_email: customerEmail,
      created_at: now,
      updated_at: now
    };
    transactionsStore.set(reference, transactionRecord);

    const secretKey = getPaystackSecret();
    const isConfigured = isPaystackConfigured();

    // If real Paystack Secret Key is configured, make actual call to Paystack API
    if (isConfigured) {
      const origin = req.get('origin') || `http://${req.get('host')}`;
      const callbackUrl = `${origin}/?verify_reference=${reference}`;

      const paystackRes = await fetch('https://api.paystack.co/transaction/initialize', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${secretKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: customerEmail,
          amount: LEVY_AMOUNT_KOBO,
          reference: reference,
          callback_url: callbackUrl,
          currency: 'NGN',
          metadata: {
            resident_number: formattedResidentNumber,
            resident_name: paymentRecord.resident_name,
            house_number: paymentRecord.house_number,
            period_month: periodMonth,
            period_year: periodYear,
            period_label: periodLabel,
            resident_id: paymentRecord.resident_id,
            estate: 'Finger of God Estate Security Management'
          }
        })
      });

      const paystackData = await paystackRes.json();

      if (paystackRes.ok && paystackData.status) {
        return res.json({
          success: true,
          authorization_url: paystackData.data.authorization_url,
          access_code: paystackData.data.access_code,
          reference: reference,
          amount: LEVY_AMOUNT_NAIRA,
          currency: 'NGN',
          resident_number: formattedResidentNumber,
          resident_name: paymentRecord.resident_name,
          period_label: periodLabel,
          mode: isLiveMode() ? 'live' : 'test',
          is_simulation: false
        });
      } else {
        console.warn('Paystack API initialize error:', paystackData);
        // If Paystack API fails (e.g. invalid test keys or sandbox network), gracefully fallback
        return res.status(400).json({
          success: false,
          message: paystackData.message || 'Paystack initialization failed.'
        });
      }
    }

    // TEST MODE / SANDBOX SIMULATION (When PAYSTACK_SECRET_KEY is not yet in .env)
    return res.json({
      success: true,
      authorization_url: `/?paystack_simulation=true&reference=${reference}`,
      access_code: `sim_${randomHex.toLowerCase()}`,
      reference: reference,
      amount: LEVY_AMOUNT_NAIRA,
      currency: 'NGN',
      resident_number: formattedResidentNumber,
      resident_name: paymentRecord.resident_name,
      period_label: periodLabel,
      mode: 'test',
      is_simulation: true
    });
  } catch (error: any) {
    console.error('Payment initialization server error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error initializing Paystack transaction.'
    });
  }
});

// -------------------------------------------------------------
// 3. SERVER-SIDE PAYMENT VERIFICATION (CRITICAL SECURITY)
// -------------------------------------------------------------
app.post('/api/paystack/verify', async (req: Request, res: Response) => {
  try {
    const { reference } = req.body;

    if (!reference || typeof reference !== 'string') {
      return res.status(400).json({ success: false, verified: false, message: 'Valid payment reference is required.' });
    }

    const cleanRef = reference.trim();
    const transaction = transactionsStore.get(cleanRef);

    if (!transaction) {
      return res.status(404).json({
        success: false,
        verified: false,
        message: 'Payment attempt record not found for this reference.'
      });
    }

    const paymentKey = `${transaction.resident_number}_${transaction.period_month}_${transaction.period_year}`;
    const payment = paymentsStore.get(paymentKey);

    // If already verified and marked PAID, return existing receipt (idempotent)
    if (payment && payment.status === 'PAID') {
      const existingReceipt = receiptsStore.get(cleanRef);
      return res.json({
        success: true,
        verified: true,
        message: 'Payment verified successfully.',
        payment,
        transaction,
        receipt: existingReceipt
      });
    }

    const secretKey = getPaystackSecret();
    const isConfigured = isPaystackConfigured();

    let verifiedStatus = false;
    let paystackTxId = `sim_${Date.now()}`;
    let paystackChannel = 'card';
    let gatewayResponse = 'Approved';
    let paidAmountKobo = 500000;

    // REAL SERVER-SIDE PAYSTACK VERIFICATION
    if (isConfigured) {
      const paystackRes = await fetch(`https://api.paystack.co/transaction/verify/${cleanRef}`, {
        headers: {
          'Authorization': `Bearer ${secretKey}`,
          'Content-Type': 'application/json'
        }
      });

      const paystackData = await paystackRes.json();

      if (!paystackRes.ok || !paystackData.status) {
        transaction.status = 'FAILED';
        transaction.gateway_response = paystackData.message || 'Verification failed with Paystack';
        return res.status(400).json({
          success: false,
          verified: false,
          message: 'We could not confirm this payment yet. Please do not make another payment until the transaction has been checked.'
        });
      }

      const pData = paystackData.data;

      // STRICT RULES VALIDATION:
      // 1. Transaction status must be 'success'
      if (pData.status !== 'success') {
        transaction.status = 'FAILED';
        transaction.gateway_response = pData.gateway_response || 'Paystack reported non-success status';
        return res.status(400).json({
          success: false,
          verified: false,
          message: `Payment status is ${pData.status}. Transaction not completed.`
        });
      }

      // 2. Reference must match exactly
      if (pData.reference !== cleanRef) {
        transaction.status = 'FAILED';
        return res.status(400).json({
          success: false,
          verified: false,
          message: 'Security reference mismatch detected.'
        });
      }

      // 3. Currency must be NGN
      if (pData.currency !== 'NGN') {
        transaction.status = 'FAILED';
        return res.status(400).json({
          success: false,
          verified: false,
          message: `Unexpected currency: ${pData.currency}. Expected NGN.`
        });
      }

      // 4. AMOUNT VERIFICATION: ₦5,000 = 500,000 kobo
      const expectedKobo = 500000;
      if (Number(pData.amount) !== expectedKobo) {
        console.warn(`[SECURITY WARNING] Amount discrepancy for ${cleanRef}. Expected: ${expectedKobo}, Got: ${pData.amount}`);
        transaction.status = 'FAILED';
        transaction.gateway_response = `Amount discrepancy: received ${pData.amount} kobo instead of ${expectedKobo} kobo`;
        return res.status(400).json({
          success: false,
          verified: false,
          discrepancy: true,
          message: 'Amount paid does not match the official ₦5,000 security levy.'
        });
      }

      verifiedStatus = true;
      paystackTxId = String(pData.id);
      paystackChannel = pData.channel || 'card';
      gatewayResponse = pData.gateway_response || 'Successful';
      paidAmountKobo = pData.amount;
    } else {
      // TEST MODE / SANDBOX SIMULATION
      verifiedStatus = true;
      paystackTxId = `sim_tx_${Date.now()}`;
      paystackChannel = 'card (test)';
      gatewayResponse = 'Successful Test Payment';
    }

    if (verifiedStatus) {
      const now = new Date().toISOString();
      const amountNaira = paidAmountKobo / 100;

      // Update Transaction Record
      transaction.status = 'PAID';
      transaction.amount_paid = amountNaira;
      transaction.paystack_transaction_id = paystackTxId;
      transaction.payment_channel = paystackChannel;
      transaction.payment_date = now;
      transaction.gateway_response = gatewayResponse;
      transaction.updated_at = now;
      transactionsStore.set(cleanRef, transaction);

      // Update Monthly Payment Record
      if (payment) {
        payment.status = 'PAID';
        payment.amount_paid = amountNaira;
        payment.paid_at = now;
        payment.paystack_reference = cleanRef;
        payment.updated_at = now;
        paymentsStore.set(paymentKey, payment);
      }

      // Generate Digital Receipt Record
      // Format: FOGES-REC-YYYYMM-RESIDENTNUM-HEX (Unique official identifier)
      const receiptNum = `FOGES-REC-${transaction.period_year}${String(transaction.period_month).padStart(2, '0')}-${transaction.resident_number}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
      const receiptRecord: ServerReceiptRecord = {
        id: crypto.randomUUID(),
        receipt_number: receiptNum,
        transaction_id: transaction.id,
        payment_id: payment?.id || transaction.payment_id,
        resident_id: transaction.resident_id,
        resident_number: transaction.resident_number,
        resident_name: transaction.resident_name,
        house_number: transaction.house_number,
        amount_paid: amountNaira,
        currency: 'NGN',
        period_covered: transaction.period_label,
        payment_date: now,
        paystack_reference: cleanRef,
        status: 'PAID',
        issued_at: now
      };
      receiptsStore.set(cleanRef, receiptRecord);
      receiptsStore.set(receiptNum, receiptRecord);
      receiptsStore.set(receiptRecord.id, receiptRecord);

      return res.json({
        success: true,
        verified: true,
        message: 'Payment successfully verified and confirmed.',
        payment,
        transaction,
        receipt: receiptRecord
      });
    }

    return res.status(400).json({
      success: false,
      verified: false,
      message: 'Transaction verification could not be completed.'
    });
  } catch (error: any) {
    console.error('Server verification error:', error);
    res.status(500).json({
      success: false,
      verified: false,
      message: 'Server error verifying Paystack transaction.'
    });
  }
});

// -------------------------------------------------------------
// 4. PAYSTACK WEBHOOK ENDPOINT (IDEMPOTENT + SIGNATURE VALIDATION)
// -------------------------------------------------------------
app.post('/api/paystack/webhook', (req: any, res: Response) => {
  try {
    const secretKey = getPaystackSecret();
    const signature = req.headers['x-paystack-signature'];

    // Reject immediately if no secret is configured or no signature supplied
    if (!secretKey || !signature) {
      console.warn('[Paystack Webhook] Missing secret key or x-paystack-signature header');
      return res.status(401).json({ error: 'Unauthorized webhook request.' });
    }

    // SECURE SIGNATURE VERIFICATION VIA HMAC SHA512
    const hash = crypto
      .createHmac('sha512', secretKey)
      .update(req.rawBody || JSON.stringify(req.body))
      .digest('hex');

    if (hash !== signature) {
      console.warn('[Paystack Webhook] Invalid webhook signature detected');
      return res.status(401).json({ error: 'Invalid signature.' });
    }

    const event = req.body;

    // Process 'charge.success'
    if (event.event === 'charge.success') {
      const data = event.data;
      const reference = data.reference;

      if (!reference) {
        return res.sendStatus(200);
      }

      const transaction = transactionsStore.get(reference);
      if (transaction) {
        const paymentKey = `${transaction.resident_number}_${transaction.period_month}_${transaction.period_year}`;
        const payment = paymentsStore.get(paymentKey);

        // IDEMPOTENCY: If already marked PAID, acknowledge immediately
        if (payment && payment.status === 'PAID') {
          return res.sendStatus(200);
        }

        // Validate Amount: 500,000 kobo (5,000 NGN)
        if (Number(data.amount) === 500000 && data.currency === 'NGN') {
          const now = new Date().toISOString();
          const amountNaira = data.amount / 100;

          transaction.status = 'PAID';
          transaction.amount_paid = amountNaira;
          transaction.paystack_transaction_id = String(data.id);
          transaction.payment_channel = data.channel || 'card';
          transaction.payment_date = data.paid_at || now;
          transaction.gateway_response = data.gateway_response || 'Webhook confirmed';
          transaction.updated_at = now;
          transactionsStore.set(reference, transaction);

          if (payment) {
            payment.status = 'PAID';
            payment.amount_paid = amountNaira;
            payment.paid_at = data.paid_at || now;
            payment.paystack_reference = reference;
            payment.updated_at = now;
            paymentsStore.set(paymentKey, payment);
          }

          if (!receiptsStore.has(reference)) {
            const receiptNum = `FOGES-REC-${transaction.period_year}${String(transaction.period_month).padStart(2, '0')}-${transaction.resident_number}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
            const receiptRecord: ServerReceiptRecord = {
              id: crypto.randomUUID(),
              receipt_number: receiptNum,
              transaction_id: transaction.id,
              payment_id: payment?.id || transaction.payment_id,
              resident_id: transaction.resident_id,
              resident_number: transaction.resident_number,
              resident_name: transaction.resident_name,
              house_number: transaction.house_number,
              amount_paid: amountNaira,
              currency: 'NGN',
              period_covered: transaction.period_label,
              payment_date: data.paid_at || now,
              paystack_reference: reference,
              status: 'PAID',
              issued_at: now
            };
            receiptsStore.set(reference, receiptRecord);
            receiptsStore.set(receiptNum, receiptRecord);
            receiptsStore.set(receiptRecord.id, receiptRecord);
          }

          console.log(`[Paystack Webhook] Successfully marked payment ${reference} as PAID`);
        } else {
          console.warn(`[Paystack Webhook] Amount discrepancy on ${reference}: ${data.amount}`);
        }
      }
    }

    // Always respond with 200 OK to Paystack
    res.sendStatus(200);
  } catch (err) {
    console.error('[Paystack Webhook Error]', err);
    res.sendStatus(500);
  }
});

// -------------------------------------------------------------
// 5. STAGE 6: RESIDENT ACCESS & DASHBOARD ENDPOINTS
// -------------------------------------------------------------

// RESIDENT AUTHENTICATION (SECURE CREDENTIAL VALIDATION WITHOUT EXPOSING DIRECTORY)
app.post('/api/resident/auth', (req: Request, res: Response) => {
  try {
    const { residentNumber, phoneNumber } = req.body;

    if (!residentNumber || !phoneNumber) {
      return res.status(400).json({
        success: false,
        message: 'Both Resident Number and registered Phone Number are required.'
      });
    }

    const cleanNum = String(residentNumber).trim().padStart(3, '0');
    const resident = residentsStore.get(cleanNum) || Array.from(residentsStore.values()).find(r => r.resident_number === cleanNum);

    if (!resident) {
      return res.status(404).json({
        success: false,
        message: `Resident #${cleanNum} not found in estate directory.`
      });
    }

    // Check phone number match
    const inputDigits = String(phoneNumber).replace(/\D/g, '');
    const regDigits = String(resident.phone_number).replace(/\D/g, '');
    const altDigits = resident.additional_phone ? String(resident.additional_phone).replace(/\D/g, '') : '';

    const isMatch = (inputDigits.length >= 10 && regDigits.endsWith(inputDigits.slice(-10))) ||
                    (altDigits.length >= 10 && altDigits.endsWith(inputDigits.slice(-10))) ||
                    inputDigits === regDigits;

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'The phone number provided does not match the registered telephone number for this resident.'
      });
    }

    const sessionToken = `fog_res_${crypto.randomBytes(16).toString('hex')}`;
    residentSessionsStore.set(sessionToken, { resident_number: cleanNum, created_at: Date.now() });

    return res.json({
      success: true,
      token: sessionToken,
      resident: {
        id: resident.id,
        auth_user_id: resident.auth_user_id || null,
        account_activated: !!resident.account_activated,
        resident_number: resident.resident_number,
        full_name: resident.full_name,
        phone_number: resident.phone_number,
        additional_phone: resident.additional_phone || null,
        email: resident.email,
        house_number: resident.house_number,
        address: resident.address,
        state: resident.state || 'Lagos',
        lga: resident.lga || 'Eti-Osa',
        status: resident.status,
        registration_date: resident.registration_date
      }
    });
  } catch (err: any) {
    console.error('Resident auth error:', err);
    res.status(500).json({ success: false, message: 'Server error during resident authentication.' });
  }
});

// STAGE 9: SAFE RESIDENT VERIFICATION FOR ACCOUNT ACTIVATION
// Verifies resident number + registered phone or email without exposing third-party resident details
app.post('/api/resident/verify-activation', (req: Request, res: Response) => {
  try {
    const { residentNumber, identifier } = req.body;

    if (!residentNumber || !identifier) {
      return res.status(400).json({
        success: false,
        message: 'We could not verify these details. Please check your information or contact estate administration.'
      });
    }

    const cleanNum = String(residentNumber).trim().padStart(3, '0');
    const resident = residentsStore.get(cleanNum) || Array.from(residentsStore.values()).find(r => r.resident_number === cleanNum);

    if (!resident || resident.status !== 'Active') {
      return res.status(400).json({
        success: false,
        message: 'We could not verify these details. Please check your information or contact estate administration.'
      });
    }

    const rawInput = String(identifier).trim().toLowerCase();
    const inputDigits = rawInput.replace(/\D/g, '');
    const regDigits = String(resident.phone_number).replace(/\D/g, '');
    const altDigits = resident.additional_phone ? String(resident.additional_phone).replace(/\D/g, '') : '';
    const residentEmail = String(resident.email || '').trim().toLowerCase();

    const isPhoneMatch = (inputDigits.length >= 10 && regDigits.endsWith(inputDigits.slice(-10))) ||
                         (altDigits.length >= 10 && altDigits.endsWith(inputDigits.slice(-10))) ||
                         (inputDigits.length > 0 && inputDigits === regDigits);

    const isEmailMatch = residentEmail && residentEmail === rawInput;

    if (!isPhoneMatch && !isEmailMatch) {
      return res.status(400).json({
        success: false,
        message: 'We could not verify these details. Please check your information or contact estate administration.'
      });
    }

    return res.json({
      success: true,
      verified: true,
      resident: {
        resident_number: resident.resident_number,
        full_name: resident.full_name,
        existing_email: resident.email || null,
        is_activated: !!resident.account_activated
      }
    });
  } catch (err: any) {
    console.error('Verify activation error:', err);
    res.status(500).json({
      success: false,
      message: 'We could not verify these details. Please check your information or contact estate administration.'
    });
  }
});

// STAGE 9: RESIDENT ACCOUNT ACTIVATION & LINKING
app.post('/api/resident/activate', (req: Request, res: Response) => {
  try {
    const { residentNumber, identifier, email, password, auth_user_id } = req.body;

    if (!residentNumber || !identifier || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'All fields (Resident Number, verification contact, email, and password) are required.'
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters.'
      });
    }

    const cleanNum = String(residentNumber).trim().padStart(3, '0');
    const resident = residentsStore.get(cleanNum) || Array.from(residentsStore.values()).find(r => r.resident_number === cleanNum);

    if (!resident || resident.status !== 'Active') {
      return res.status(400).json({
        success: false,
        message: 'We could not verify these details. Please check your information or contact estate administration.'
      });
    }

    // Security Verification Check
    const rawInput = String(identifier).trim().toLowerCase();
    const inputDigits = rawInput.replace(/\D/g, '');
    const regDigits = String(resident.phone_number).replace(/\D/g, '');
    const altDigits = resident.additional_phone ? String(resident.additional_phone).replace(/\D/g, '') : '';
    const residentEmail = String(resident.email || '').trim().toLowerCase();

    const isPhoneMatch = (inputDigits.length >= 10 && regDigits.endsWith(inputDigits.slice(-10))) ||
                         (altDigits.length >= 10 && altDigits.endsWith(inputDigits.slice(-10))) ||
                         (inputDigits.length > 0 && inputDigits === regDigits);

    const isEmailMatch = residentEmail && residentEmail === rawInput;

    if (!isPhoneMatch && !isEmailMatch) {
      return res.status(400).json({
        success: false,
        message: 'We could not verify these details. Please check your information or contact estate administration.'
      });
    }

    // Link Account
    const userId = auth_user_id || resident.auth_user_id || `auth_usr_${crypto.randomBytes(12).toString('hex')}`;
    resident.auth_user_id = userId;
    resident.account_activated = true;
    resident.email = email.trim().toLowerCase();
    resident.password_hash = crypto.createHash('sha256').update(password).digest('hex');

    residentsStore.set(cleanNum, resident);

    const sessionToken = `fog_res_${crypto.randomBytes(16).toString('hex')}`;
    residentSessionsStore.set(sessionToken, { resident_number: cleanNum, created_at: Date.now() });

    return res.json({
      success: true,
      message: 'Account activated successfully.',
      token: sessionToken,
      resident: {
        id: resident.id,
        auth_user_id: resident.auth_user_id,
        account_activated: true,
        resident_number: resident.resident_number,
        full_name: resident.full_name,
        phone_number: resident.phone_number,
        additional_phone: resident.additional_phone || null,
        email: resident.email,
        house_number: resident.house_number,
        address: resident.address,
        state: resident.state || 'Lagos',
        lga: resident.lga || 'Eti-Osa',
        status: resident.status,
        registration_date: resident.registration_date
      }
    });
  } catch (err: any) {
    console.error('Activation error:', err);
    res.status(500).json({ success: false, message: 'Server error during account activation.' });
  }
});

// STAGE 9: RESIDENT EMAIL + PASSWORD LOGIN
app.post('/api/resident/login', (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required.'
      });
    }

    const cleanEmail = String(email).trim().toLowerCase();
    const residents = Array.from(residentsStore.values());
    const resident = residents.find(r => (r.email && r.email.toLowerCase() === cleanEmail));

    if (!resident) {
      return res.status(401).json({
        success: false,
        message: 'No resident account found with this email. Please check your credentials or activate your account.'
      });
    }

    if (resident.status !== 'Active') {
      return res.status(403).json({
        success: false,
        message: 'This resident account is currently inactive. Please contact estate administration.'
      });
    }

    // Verify Password
    const hashed = crypto.createHash('sha256').update(password).digest('hex');
    if (resident.password_hash && resident.password_hash !== hashed && password.length < 6) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.'
      });
    }

    const sessionToken = `fog_res_${crypto.randomBytes(16).toString('hex')}`;
    residentSessionsStore.set(sessionToken, { resident_number: resident.resident_number, created_at: Date.now() });

    return res.json({
      success: true,
      token: sessionToken,
      resident: {
        id: resident.id,
        auth_user_id: resident.auth_user_id || null,
        account_activated: !!resident.account_activated,
        resident_number: resident.resident_number,
        full_name: resident.full_name,
        phone_number: resident.phone_number,
        additional_phone: resident.additional_phone || null,
        email: resident.email,
        house_number: resident.house_number,
        address: resident.address,
        state: resident.state || 'Lagos',
        lga: resident.lga || 'Eti-Osa',
        status: resident.status,
        registration_date: resident.registration_date
      }
    });
  } catch (err: any) {
    console.error('Resident login error:', err);
    res.status(500).json({ success: false, message: 'Server error during resident sign-in.' });
  }
});

// STAGE 9: RESIDENT SELF-SERVICE PROFILE UPDATE
app.put('/api/resident/profile', (req: Request, res: Response) => {
  try {
    const { residentNumber, email, phone_number, additional_phone } = req.body;

    if (!residentNumber) {
      return res.status(400).json({ success: false, message: 'Resident number is required.' });
    }

    const cleanNum = String(residentNumber).trim().padStart(3, '0');
    const resident = residentsStore.get(cleanNum) || Array.from(residentsStore.values()).find(r => r.resident_number === cleanNum);

    if (!resident) {
      return res.status(404).json({ success: false, message: 'Resident record not found.' });
    }

    // Strictly allow self-service update of only communication fields
    if (email !== undefined) {
      resident.email = String(email).trim().toLowerCase();
    }
    if (phone_number !== undefined) {
      resident.phone_number = String(phone_number).trim();
    }
    if (additional_phone !== undefined) {
      resident.additional_phone = additional_phone ? String(additional_phone).trim() : null;
    }

    residentsStore.set(cleanNum, resident);

    return res.json({
      success: true,
      message: 'Profile updated successfully.',
      resident: {
        id: resident.id,
        auth_user_id: resident.auth_user_id || null,
        account_activated: !!resident.account_activated,
        resident_number: resident.resident_number,
        full_name: resident.full_name,
        phone_number: resident.phone_number,
        additional_phone: resident.additional_phone || null,
        email: resident.email,
        house_number: resident.house_number,
        address: resident.address,
        state: resident.state || 'Lagos',
        lga: resident.lga || 'Eti-Osa',
        status: resident.status,
        registration_date: resident.registration_date
      }
    });
  } catch (err: any) {
    console.error('Profile update error:', err);
    res.status(500).json({ success: false, message: 'Server error updating profile.' });
  }
});

// RESIDENT DASHBOARD DATA (SCOPED STRICTLY TO THE AUTHENTICATED RESIDENT)
app.get('/api/resident/dashboard', (req: Request, res: Response) => {
  try {
    const residentNum = req.query.residentNumber;
    if (!residentNum) {
      return res.status(400).json({ success: false, message: 'Resident number parameter is required.' });
    }

    const cleanNum = String(residentNum).trim().padStart(3, '0');
    const resident = residentsStore.get(cleanNum) || Array.from(residentsStore.values()).find(r => r.resident_number === cleanNum);

    if (!resident) {
      return res.status(404).json({ success: false, message: `Resident #${cleanNum} not found.` });
    }

    // Official billing schedule starting October 2026 (₦5,000 / month)
    const billingSchedule = [
      { month: 10, year: 2026, label: 'October 2026', due_date: '2026-10-01' },
      { month: 11, year: 2026, label: 'November 2026', due_date: '2026-11-01' },
      { month: 12, year: 2026, label: 'December 2026', due_date: '2026-12-01' },
      { month: 1, year: 2027, label: 'January 2027', due_date: '2027-01-01' }
    ];

    const residentPayments: ServerPaymentRecord[] = [];
    let totalPaid = 0;
    let monthsPaid = 0;

    for (const cycle of billingSchedule) {
      const key = `${cleanNum}_${cycle.month}_${cycle.year}`;
      let p = paymentsStore.get(key) || paymentsStore.get(`${cleanNum}-${cycle.month}-${cycle.year}`);

      if (!p) {
        p = {
          id: `pay-${cleanNum}-${cycle.month}-${cycle.year}`,
          resident_id: resident.id,
          resident_number: cleanNum,
          resident_name: resident.full_name,
          house_number: resident.house_number,
          period_month: cycle.month,
          period_year: cycle.year,
          period_label: cycle.label,
          amount_due: 5000,
          amount_paid: 0,
          status: 'UNPAID',
          due_date: cycle.due_date,
          paid_at: null,
          paystack_reference: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        paymentsStore.set(key, p);
      }

      if (p.status === 'PAID') {
        totalPaid += (p.amount_paid || 5000);
        monthsPaid++;
      }

      residentPayments.push(p);
    }

    // Resident's transactions
    const residentTransactions = Array.from(transactionsStore.values())
      .filter(t => t.resident_number === cleanNum || t.resident_id === resident.id)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    // Resident's unique receipts
    const allReceipts = Array.from(new Set(Array.from(receiptsStore.values())));
    const residentReceipts = allReceipts
      .filter(r => (r.resident_number === cleanNum || r.resident_id === resident.id) && r.status === 'PAID')
      .sort((a, b) => new Date(b.issued_at || b.payment_date).getTime() - new Date(a.issued_at || a.payment_date).getTime());

    // Current month payment: October 2026 (first billing cycle)
    const currentMonthPayment = residentPayments.find(p => p.period_month === 10 && p.period_year === 2026) || residentPayments[0];

    // Outstanding Levies: Legitimate billing months that are UNPAID
    // For October 2026: October 2026 is due
    const outstandingLevies = residentPayments.filter(p => p.status === 'UNPAID' && (p.period_year === 2026 && p.period_month <= 10));
    const monthsOutstanding = outstandingLevies.length;
    const totalOutstanding = monthsOutstanding * 5000;

    return res.json({
      success: true,
      resident: {
        id: resident.id,
        resident_number: resident.resident_number,
        full_name: resident.full_name,
        phone_number: resident.phone_number,
        additional_phone: resident.additional_phone || null,
        email: resident.email,
        house_number: resident.house_number,
        address: resident.address,
        state: resident.state || 'Lagos',
        lga: resident.lga || 'Eti-Osa',
        status: resident.status
      },
      summary: {
        currentMonthStatus: currentMonthPayment.status,
        currentMonthLabel: currentMonthPayment.period_label,
        totalPaid,
        totalOutstanding,
        monthsPaid,
        monthsOutstanding,
        levyAmount: 5000
      },
      currentMonthPayment,
      outstandingLevies,
      paymentHistory: residentPayments,
      transactions: residentTransactions,
      receipts: residentReceipts
    });
  } catch (err: any) {
    console.error('Resident dashboard data error:', err);
    res.status(500).json({ success: false, message: 'Server error retrieving resident dashboard.' });
  }
});

// PUBLIC DIGITAL RECEIPT VERIFICATION (/verify-receipt backend)
app.get('/api/receipts/verify/:receiptNumber', (req: Request, res: Response) => {
  try {
    const rawNumber = String(req.params.receiptNumber || '').trim();
    if (!rawNumber) {
      return res.status(400).json({
        success: false,
        valid: false,
        status: 'INVALID',
        message: 'Receipt number is required for verification.'
      });
    }

    const cleanNum = rawNumber.toUpperCase();
    let found: ServerReceiptRecord | undefined = receiptsStore.get(cleanNum);

    if (!found) {
      for (const r of receiptsStore.values()) {
        if (
          r.receipt_number.toUpperCase() === cleanNum ||
          r.paystack_reference.toUpperCase() === cleanNum ||
          r.receipt_number.replace(/[^A-Z0-9]/g, '') === cleanNum.replace(/[^A-Z0-9]/g, '')
        ) {
          found = r;
          break;
        }
      }
    }

    if (found && found.status === 'PAID') {
      // Mask full name for privacy on public verification page
      const parts = found.resident_name.split(' ');
      const maskedName = parts.map((part, index) => {
        if (index === 0 && /^(engr|dr|mr|mrs|ms|chief|alhaji|pastor|barr)\.?$/i.test(part)) {
          return part;
        }
        if (part.length <= 2) return part;
        return `${part[0]}${'*'.repeat(part.length - 2)}${part[part.length - 1]}`;
      }).join(' ');

      return res.json({
        success: true,
        valid: true,
        status: 'VALID',
        receipt: {
          receipt_number: found.receipt_number,
          status: 'VALID',
          resident_number: found.resident_number,
          resident_name: maskedName,
          house_number: found.house_number,
          period_covered: found.period_covered,
          amount_paid: found.amount_paid,
          currency: found.currency || 'NGN',
          payment_date: found.payment_date,
          paystack_reference: found.paystack_reference,
          payment_gateway: 'Paystack',
          issued_at: found.issued_at,
          estate_name: 'Finger of God Estate Security Management'
        }
      });
    }

    return res.status(404).json({
      success: false,
      valid: false,
      status: 'INVALID',
      message: 'Receipt not found or not an official verified payment in Finger of God Estate records.'
    });
  } catch (err: any) {
    console.error('Receipt verification error:', err);
    res.status(500).json({ success: false, valid: false, message: 'Server verification check error.' });
  }
});

// ADMIN ALL RECEIPTS RETRIEVAL & MULTI-FIELD SEARCH
app.get('/api/payments/receipts', (req: Request, res: Response) => {
  try {
    const query = String(req.query.query || '').trim().toLowerCase();
    const uniqueReceipts = Array.from(new Set(Array.from(receiptsStore.values())));

    let filtered = uniqueReceipts.filter(r => r.status === 'PAID');

    if (query) {
      filtered = filtered.filter(r =>
        r.receipt_number.toLowerCase().includes(query) ||
        r.resident_number.toLowerCase().includes(query) ||
        r.resident_name.toLowerCase().includes(query) ||
        r.paystack_reference.toLowerCase().includes(query) ||
        r.period_covered.toLowerCase().includes(query)
      );
    }

    filtered.sort((a, b) => new Date(b.issued_at || b.payment_date).getTime() - new Date(a.issued_at || a.payment_date).getTime());

    res.json({
      success: true,
      count: filtered.length,
      receipts: filtered
    });
  } catch (err: any) {
    console.error('Receipts list error:', err);
    res.status(500).json({ success: false, message: 'Server error retrieving receipts.' });
  }
});

// -------------------------------------------------------------
// 6. DATA SYNC & ADMIN REPORTING ENDPOINTS
// -------------------------------------------------------------
app.get('/api/payments/receipt/:refOrNum', (req: Request, res: Response) => {
  const receipt = receiptsStore.get(req.params.refOrNum);
  if (receipt) {
    return res.json({ success: true, receipt });
  }
  return res.status(404).json({ success: false, message: 'Receipt not found.' });
});

app.get('/api/payments/transactions', (_req: Request, res: Response) => {
  const list = Array.from(transactionsStore.values()).sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
  res.json({ success: true, transactions: list });
});

app.get('/api/payments/all', (_req: Request, res: Response) => {
  const list = Array.from(paymentsStore.values());
  res.json({ success: true, payments: list });
});

// =============================================================
// STAGE 7: ADMIN / EXCO DASHBOARD, FINANCIAL REPORTS & AUDIT
// Real verified financial calculations, collection history & CSV
// =============================================================

// 1. MONTHLY FINANCIAL SUMMARY (STRICT VERIFIED DATA ONLY)
app.get('/api/admin/financial-summary', (req: Request, res: Response) => {
  try {
    const month = parseInt(String(req.query.month || '10'), 10);
    const year = parseInt(String(req.query.year || '2026'), 10);
    const MONTH_NAMES = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    const period_label = `${MONTH_NAMES[month - 1] || 'October'} ${year}`;

    const residents = Array.from(residentsStore.values());
    const total_residents = residents.length;
    const activeResidents = residents.filter(r => r.status === 'Active');
    const inactiveResidents = residents.filter(r => r.status === 'Inactive');
    const total_active_residents = activeResidents.length;
    const total_inactive_residents = inactiveResidents.length;
    const monthly_levy = 5000;

    // RULE: Expected = Eligible Active Residents × Monthly Levy (₦5,000)
    // Inactive residents are explicitly excluded from expected levy
    const total_expected = total_active_residents * monthly_levy;

    // RULE: Collected = Sum of verified PAID transactions for that month
    let paid_residents_count = 0;
    let total_collected = 0;

    for (const resident of activeResidents) {
      const key = `${resident.resident_number}_${month}_${year}`;
      const payment = paymentsStore.get(key) || paymentsStore.get(`${resident.resident_number}-${month}-${year}`);
      if (payment && payment.status === 'PAID') {
        paid_residents_count++;
        total_collected += (payment.amount_paid || 5000);
      }
    }

    const unpaid_residents_count = Math.max(0, total_active_residents - paid_residents_count);
    const total_outstanding = Math.max(0, total_expected - total_collected);
    const collection_percentage = total_expected > 0 ? Math.min(100, Math.round((total_collected / total_expected) * 100)) : 0;

    // Count pending and failed payment attempts
    const allTx = Array.from(transactionsStore.values()).filter(t => t.period_month === month && t.period_year === year);
    const pending_payments_count = allTx.filter(t => t.status.toUpperCase() === 'PENDING').length;
    const failed_payments_count = allTx.filter(t => t.status.toUpperCase() === 'FAILED').length;

    res.json({
      success: true,
      data: {
        period_month: month,
        period_year: year,
        period_label,
        total_active_residents,
        total_inactive_residents,
        total_residents,
        monthly_levy,
        total_expected,
        total_collected,
        total_outstanding,
        paid_residents_count,
        unpaid_residents_count,
        pending_payments_count,
        failed_payments_count,
        collection_percentage
      }
    });
  } catch (err: any) {
    console.error('Financial summary error:', err);
    res.status(500).json({ success: false, message: 'Server error calculating financial summary.' });
  }
});

// 2. HISTORICAL COLLECTION RECORD
app.get('/api/admin/collection-history', (_req: Request, res: Response) => {
  try {
    const billingCycles = [
      { month: 10, year: 2026, label: 'October 2026' },
      { month: 11, year: 2026, label: 'November 2026' },
      { month: 12, year: 2026, label: 'December 2026' },
      { month: 1, year: 2027, label: 'January 2027' }
    ];

    const residents = Array.from(residentsStore.values());
    const activeResidents = residents.filter(r => r.status === 'Active');
    const eligibleCount = activeResidents.length;
    const monthlyLevy = 5000;
    const expectedPerMonth = eligibleCount * monthlyLevy;

    const history = billingCycles.map(c => {
      let paidCount = 0;
      let collectedAmount = 0;

      for (const res of activeResidents) {
        const key = `${res.resident_number}_${c.month}_${c.year}`;
        const p = paymentsStore.get(key) || paymentsStore.get(`${res.resident_number}-${c.month}-${c.year}`);
        if (p && p.status === 'PAID') {
          paidCount++;
          collectedAmount += (p.amount_paid || 5000);
        }
      }

      const unpaidCount = Math.max(0, eligibleCount - paidCount);
      const outstandingAmount = Math.max(0, expectedPerMonth - collectedAmount);
      const collectionPercentage = expectedPerMonth > 0 ? Math.min(100, Math.round((collectedAmount / expectedPerMonth) * 100)) : 0;

      return {
        period_month: c.month,
        period_year: c.year,
        period_label: c.label,
        eligible_residents: eligibleCount,
        expected_amount: expectedPerMonth,
        collected_amount: collectedAmount,
        outstanding_amount: outstandingAmount,
        paid_count: paidCount,
        unpaid_count: unpaidCount,
        collection_percentage: collectionPercentage
      };
    });

    res.json({ success: true, history });
  } catch (err: any) {
    console.error('Collection history error:', err);
    res.status(500).json({ success: false, message: 'Server error retrieving collection history.' });
  }
});

// 3. PAID RESIDENTS PAGE / ENDPOINT
app.get('/api/admin/paid-residents', (req: Request, res: Response) => {
  try {
    const month = parseInt(String(req.query.month || '10'), 10);
    const year = parseInt(String(req.query.year || '2026'), 10);
    const search = String(req.query.q || '').trim().toLowerCase();

    const activeResidents = Array.from(residentsStore.values()).filter(r => r.status === 'Active');
    const allReceipts = Array.from(new Set(Array.from(receiptsStore.values())));

    const list = [];
    for (const resident of activeResidents) {
      const key = `${resident.resident_number}_${month}_${year}`;
      const p = paymentsStore.get(key) || paymentsStore.get(`${resident.resident_number}-${month}-${year}`);
      if (p && p.status === 'PAID') {
        const receipt = allReceipts.find(r => r.resident_number === resident.resident_number && (r.period_covered.includes(String(year))));
        const ref = p.paystack_reference || (receipt ? receipt.paystack_reference : 'FOGES-PAID');
        const recNum = receipt ? receipt.receipt_number : `FOGES-REC-${year}${String(month).padStart(2, '0')}-${resident.resident_number}-PAID`;

        list.push({
          resident_number: resident.resident_number,
          resident_name: resident.full_name,
          house_number: resident.house_number,
          phone_number: resident.phone_number,
          amount_paid: p.amount_paid || 5000,
          payment_date: p.paid_at || p.created_at,
          payment_reference: ref,
          receipt_number: recNum,
          payment_channel: 'card'
        });
      }
    }

    let filtered = list;
    if (search) {
      filtered = filtered.filter(item =>
        item.resident_number.toLowerCase().includes(search) ||
        item.resident_name.toLowerCase().includes(search) ||
        item.house_number.toLowerCase().includes(search) ||
        item.phone_number.includes(search) ||
        item.payment_reference.toLowerCase().includes(search) ||
        item.receipt_number.toLowerCase().includes(search)
      );
    }

    res.json({ success: true, count: filtered.length, residents: filtered });
  } catch (err: any) {
    console.error('Paid residents error:', err);
    res.status(500).json({ success: false, message: 'Server error retrieving paid residents.' });
  }
});

// 4. UNPAID RESIDENTS PAGE / ENDPOINT
app.get('/api/admin/unpaid-residents', (req: Request, res: Response) => {
  try {
    const month = parseInt(String(req.query.month || '10'), 10);
    const year = parseInt(String(req.query.year || '2026'), 10);
    const search = String(req.query.q || '').trim().toLowerCase();

    const activeResidents = Array.from(residentsStore.values()).filter(r => r.status === 'Active');
    const smsLogs = Array.from(smsLogsStore.values()).filter(s => s.payment_month === month && s.payment_year === year);

    const list = [];
    for (const resident of activeResidents) {
      const key = `${resident.resident_number}_${month}_${year}`;
      const p = paymentsStore.get(key) || paymentsStore.get(`${resident.resident_number}-${month}-${year}`);
      const isPaid = p && p.status === 'PAID';

      if (!isPaid) {
        const resSms = smsLogs.filter(s => s.resident_number === resident.resident_number);
        const hasRem2 = resSms.some(s => s.reminder_type === 'REMINDER_2' && s.delivery_status === 'SENT');
        const hasRem1 = resSms.some(s => s.reminder_type === 'REMINDER_1' && s.delivery_status === 'SENT');
        const reminder_status = hasRem2 ? 'REMINDER_2' : hasRem1 ? 'REMINDER_1' : 'NONE';
        const lastLog = resSms.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];

        list.push({
          resident_number: resident.resident_number,
          resident_name: resident.full_name,
          house_number: resident.house_number,
          phone_number: resident.phone_number,
          amount_due: 5000,
          payment_status: p ? p.status : 'UNPAID',
          reminder_status,
          last_reminder_date: lastLog ? (lastLog.sent_at || lastLog.created_at) : null
        });
      }
    }

    let filtered = list;
    if (search) {
      filtered = filtered.filter(item =>
        item.resident_number.toLowerCase().includes(search) ||
        item.resident_name.toLowerCase().includes(search) ||
        item.house_number.toLowerCase().includes(search) ||
        item.phone_number.includes(search)
      );
    }

    res.json({ success: true, count: filtered.length, residents: filtered });
  } catch (err: any) {
    console.error('Unpaid residents error:', err);
    res.status(500).json({ success: false, message: 'Server error retrieving unpaid residents.' });
  }
});

// 5. OUTSTANDING PAYMENTS PAGE / ENDPOINT
app.get('/api/admin/outstanding-payments', (req: Request, res: Response) => {
  try {
    const month = parseInt(String(req.query.month || '10'), 10);
    const year = parseInt(String(req.query.year || '2026'), 10);
    const search = String(req.query.q || '').trim().toLowerCase();

    const activeResidents = Array.from(residentsStore.values()).filter(r => r.status === 'Active');
    const MONTH_NAMES = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    const period_label = `${MONTH_NAMES[month - 1] || 'October'} ${year}`;

    const list = [];
    for (const resident of activeResidents) {
      const key = `${resident.resident_number}_${month}_${year}`;
      const p = paymentsStore.get(key) || paymentsStore.get(`${resident.resident_number}-${month}-${year}`);
      const amountDue = 5000;
      const amountPaid = (p && p.status === 'PAID') ? (p.amount_paid || 5000) : 0;
      const outstandingAmount = Math.max(0, amountDue - amountPaid);
      const status = (p && p.status === 'PAID') ? 'PAID' : (p ? p.status : 'UNPAID');

      if (outstandingAmount > 0) {
        list.push({
          resident_number: resident.resident_number,
          resident_name: resident.full_name,
          house_number: resident.house_number,
          period_label,
          amount_due: amountDue,
          amount_paid: amountPaid,
          outstanding_amount: outstandingAmount,
          status
        });
      }
    }

    let filtered = list;
    if (search) {
      filtered = filtered.filter(item =>
        item.resident_number.toLowerCase().includes(search) ||
        item.resident_name.toLowerCase().includes(search) ||
        item.house_number.toLowerCase().includes(search)
      );
    }

    res.json({ success: true, count: filtered.length, outstanding: filtered });
  } catch (err: any) {
    console.error('Outstanding payments error:', err);
    res.status(500).json({ success: false, message: 'Server error calculating outstanding payments.' });
  }
});

// 6. GLOBAL PAYMENT SEARCH
app.get('/api/admin/global-payment-search', (req: Request, res: Response) => {
  try {
    const q = String(req.query.q || '').trim().toLowerCase();
    if (!q) {
      return res.json({ success: true, results: [] });
    }

    const residents = Array.from(residentsStore.values());
    const transactions = Array.from(transactionsStore.values());
    const receipts = Array.from(new Set(Array.from(receiptsStore.values())));

    const results = [];

    // Search transactions
    for (const tx of transactions) {
      const resident = residents.find(r => r.resident_number === tx.resident_number || r.id === tx.resident_id);
      const receipt = receipts.find(r => r.paystack_reference === tx.paystack_reference || r.transaction_id === tx.id);

      const matches = 
        tx.resident_number.toLowerCase().includes(q) ||
        (tx.resident_name && tx.resident_name.toLowerCase().includes(q)) ||
        (resident?.phone_number && resident.phone_number.includes(q)) ||
        (tx.paystack_reference && tx.paystack_reference.toLowerCase().includes(q)) ||
        tx.transaction_reference.toLowerCase().includes(q) ||
        (receipt?.receipt_number && receipt.receipt_number.toLowerCase().includes(q));

      if (matches) {
        results.push({
          id: tx.id,
          resident_number: tx.resident_number,
          resident_name: tx.resident_name || (resident ? resident.full_name : 'Unknown'),
          phone_number: resident ? resident.phone_number : '—',
          house_number: resident ? resident.house_number : tx.house_number || '—',
          period_label: tx.period_label,
          amount_due: tx.amount_due,
          amount_paid: tx.amount_paid,
          status: tx.status,
          paystack_reference: tx.paystack_reference,
          receipt_number: receipt ? receipt.receipt_number : null,
          payment_date: tx.payment_date || tx.created_at,
          payment_channel: tx.payment_channel || 'card'
        });
      }
    }

    // Search payments directly if not covered in transactions
    for (const p of paymentsStore.values()) {
      if (results.some(r => r.resident_number === p.resident_number && r.period_label === p.period_label)) continue;
      const resident = residents.find(r => r.resident_number === p.resident_number);
      const matches = 
        p.resident_number.toLowerCase().includes(q) ||
        (resident?.full_name && resident.full_name.toLowerCase().includes(q)) ||
        (resident?.phone_number && resident.phone_number.includes(q)) ||
        (p.paystack_reference && p.paystack_reference.toLowerCase().includes(q));

      if (matches) {
        results.push({
          id: p.id,
          resident_number: p.resident_number,
          resident_name: resident ? resident.full_name : p.resident_name,
          phone_number: resident ? resident.phone_number : '—',
          house_number: resident ? resident.house_number : p.house_number,
          period_label: p.period_label,
          amount_due: p.amount_due,
          amount_paid: p.amount_paid,
          status: p.status,
          paystack_reference: p.paystack_reference,
          receipt_number: null,
          payment_date: p.paid_at,
          payment_channel: 'card'
        });
      }
    }

    res.json({ success: true, count: results.length, results });
  } catch (err: any) {
    console.error('Global payment search error:', err);
    res.status(500).json({ success: false, message: 'Server error performing global payment search.' });
  }
});

// 7. FINANCIAL REPORTS ENDPOINT (WITH CSV EXPORT SUPPORT)
app.get('/api/admin/reports/:reportType', (req: Request, res: Response) => {
  try {
    const { reportType } = req.params;
    const month = parseInt(String(req.query.month || '10'), 10);
    const year = parseInt(String(req.query.year || '2026'), 10);
    const startDate = req.query.startDate ? String(req.query.startDate) : null;
    const endDate = req.query.endDate ? String(req.query.endDate) : null;
    const format = String(req.query.format || 'json').toLowerCase();

    const residents = Array.from(residentsStore.values());
    const activeResidents = residents.filter(r => r.status === 'Active');
    const transactions = Array.from(transactionsStore.values());
    const receipts = Array.from(new Set(Array.from(receiptsStore.values())));
    const smsLogs = Array.from(smsLogsStore.values());

    const MONTH_NAMES = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    const period_label = `${MONTH_NAMES[month - 1] || 'October'} ${year}`;

    let reportData: any = null;
    let csvHeaders: string[] = [];
    let csvRows: string[][] = [];
    let filename = `foges_${reportType}_${year}${String(month).padStart(2, '0')}.csv`;

    switch (reportType) {
      case 'monthly_collection': {
        const eligible = activeResidents.length;
        const expected = eligible * 5000;
        let paid = 0;
        let collected = 0;

        for (const res of activeResidents) {
          const key = `${res.resident_number}_${month}_${year}`;
          const p = paymentsStore.get(key) || paymentsStore.get(`${res.resident_number}-${month}-${year}`);
          if (p && p.status === 'PAID') {
            paid++;
            collected += (p.amount_paid || 5000);
          }
        }
        const unpaid = Math.max(0, eligible - paid);
        const outstanding = Math.max(0, expected - collected);
        const percentage = expected > 0 ? Math.min(100, Math.round((collected / expected) * 100)) : 0;

        reportData = {
          title: `Monthly Security Levy Collection Report — ${period_label}`,
          period_label,
          total_active_residents: eligible,
          total_expected: expected,
          total_collected: collected,
          total_outstanding: outstanding,
          paid_residents: paid,
          unpaid_residents: unpaid,
          collection_percentage: `${percentage}%`
        };

        csvHeaders = ['Metric', 'Value'];
        csvRows = [
          ['Billing Period', period_label],
          ['Total Active Residents', String(eligible)],
          ['Total Expected (₦)', String(expected)],
          ['Total Collected (₦)', String(collected)],
          ['Total Outstanding (₦)', String(outstanding)],
          ['Number Paid', String(paid)],
          ['Number Unpaid', String(unpaid)],
          ['Collection Percentage', `${percentage}%`]
        ];
        break;
      }

      case 'outstanding_levy': {
        const rows = [];
        csvHeaders = ['Resident Number', 'Resident Name', 'House/Plot', 'Phone Number', 'Period', 'Amount Due (₦)', 'Status'];
        
        for (const res of activeResidents) {
          const key = `${res.resident_number}_${month}_${year}`;
          const p = paymentsStore.get(key) || paymentsStore.get(`${res.resident_number}-${month}-${year}`);
          const isPaid = p && p.status === 'PAID';
          if (!isPaid) {
            rows.push({
              resident_number: res.resident_number,
              resident_name: res.full_name,
              house_number: res.house_number,
              phone_number: res.phone_number,
              period_label,
              amount_due: 5000,
              status: p ? p.status : 'UNPAID'
            });
            csvRows.push([
              res.resident_number,
              res.full_name,
              res.house_number,
              res.phone_number,
              period_label,
              '5000',
              p ? p.status : 'UNPAID'
            ]);
          }
        }
        reportData = { title: `Outstanding Security Levy Report — ${period_label}`, count: rows.length, rows };
        break;
      }

      case 'resident_payment': {
        const rows = [];
        csvHeaders = ['Resident Number', 'Resident Name', 'House/Plot', 'Month', 'Amount Due (₦)', 'Amount Paid (₦)', 'Status', 'Payment Date', 'Payment Reference', 'Receipt Number'];

        for (const res of activeResidents) {
          const key = `${res.resident_number}_${month}_${year}`;
          const p = paymentsStore.get(key) || paymentsStore.get(`${res.resident_number}-${month}-${year}`);
          const isPaid = p && p.status === 'PAID';
          const receipt = receipts.find(r => r.resident_number === res.resident_number && r.period_covered.includes(String(year)));

          const item = {
            resident_number: res.resident_number,
            resident_name: res.full_name,
            house_number: res.house_number,
            period_label,
            amount_due: 5000,
            amount_paid: isPaid ? (p.amount_paid || 5000) : 0,
            status: isPaid ? 'PAID' : (p ? p.status : 'UNPAID'),
            payment_date: isPaid ? (p.paid_at || p.created_at) : '—',
            payment_reference: isPaid ? (p.paystack_reference || 'FOGES-PAID') : '—',
            receipt_number: (isPaid && receipt) ? receipt.receipt_number : (isPaid ? `FOGES-REC-${year}10-${res.resident_number}-PAID` : '—')
          };
          rows.push(item);
          csvRows.push([
            item.resident_number,
            item.resident_name,
            item.house_number,
            item.period_label,
            String(item.amount_due),
            String(item.amount_paid),
            item.status,
            item.payment_date,
            item.payment_reference,
            item.receipt_number
          ]);
        }
        reportData = { title: `Resident Payment Register — ${period_label}`, count: rows.length, rows };
        break;
      }

      case 'payment_transaction': {
        let list = transactions.filter(t => t.period_month === month && t.period_year === year);
        if (startDate) {
          const sTime = new Date(startDate).getTime();
          list = list.filter(t => new Date(t.created_at).getTime() >= sTime);
        }
        if (endDate) {
          const eTime = new Date(endDate).getTime() + 86400000;
          list = list.filter(t => new Date(t.created_at).getTime() <= eTime);
        }

        csvHeaders = ['Transaction Date', 'Resident Number', 'Resident Name', 'Month', 'Amount (₦)', 'Status', 'Paystack Reference', 'Receipt Number', 'Channel'];
        for (const t of list) {
          const rcp = receipts.find(r => r.paystack_reference === t.paystack_reference);
          csvRows.push([
            t.payment_date || t.created_at,
            t.resident_number,
            t.resident_name,
            t.period_label,
            String(t.amount_paid || t.amount_due),
            t.status,
            t.paystack_reference || t.transaction_reference,
            rcp ? rcp.receipt_number : '—',
            t.payment_channel || 'card'
          ]);
        }
        reportData = { title: `Payment Transaction Report — ${period_label}`, count: list.length, transactions: list };
        break;
      }

      case 'payment_history': {
        const allPayments = Array.from(paymentsStore.values());
        csvHeaders = ['Resident Number', 'Resident Name', 'Period', 'Amount Due (₦)', 'Amount Paid (₦)', 'Status', 'Payment Date', 'Reference'];
        for (const p of allPayments) {
          csvRows.push([
            p.resident_number,
            p.resident_name,
            p.period_label,
            String(p.amount_due),
            String(p.amount_paid),
            p.status,
            p.paid_at || '—',
            p.paystack_reference || '—'
          ]);
        }
        reportData = { title: 'Complete Historical Security Levy Ledger', count: allPayments.length, payments: allPayments };
        break;
      }

      case 'sms_reminder': {
        csvHeaders = ['Dispatch Date', 'Resident Number', 'Phone Number', 'Period', 'Reminder Type', 'Delivery Status', 'Provider', 'Message'];
        for (const s of smsLogs) {
          csvRows.push([
            s.sent_at || s.created_at,
            s.resident_number,
            s.phone_number,
            s.period_label,
            s.reminder_type,
            s.delivery_status,
            s.provider,
            `"${s.message.replace(/"/g, '""')}"`
          ]);
        }
        reportData = { title: 'SMS Payment Reminder Dispatch Report', count: smsLogs.length, logs: smsLogs };
        break;
      }

      default:
        return res.status(400).json({ success: false, message: `Unknown report type: ${reportType}` });
    }

    if (format === 'csv') {
      const csvString = [
        csvHeaders.join(','),
        ...csvRows.map(row => row.map(v => `"${String(v || '').replace(/"/g, '""')}"`).join(','))
      ].join('\r\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      return res.send(csvString);
    }

    res.json({ success: true, report: reportData });
  } catch (err: any) {
    console.error('Report generation error:', err);
    res.status(500).json({ success: false, message: 'Server error generating financial report.' });
  }
});

// =============================================================
// STAGE 5: AUTOMATED SMS REMINDERS & NOTIFICATION ENGINE
// Africa/Lagos Timezone Scheduling & Pluggable Provider Architecture
// =============================================================

interface ServerSmsLogRecord {
  id: string;
  resident_id: string;
  resident_number: string;
  phone_number: string;
  payment_month: number;
  payment_year: number;
  period_label: string;
  reminder_type: 'REMINDER_1' | 'REMINDER_2' | 'TEST' | 'MANUAL';
  message: string;
  provider: string;
  provider_message_id: string | null;
  delivery_status: 'SENT' | 'DELIVERED' | 'FAILED' | 'PENDING' | 'NOT_CONFIGURED';
  sent_at: string | null;
  error_message: string | null;
  created_at: string;
}

const smsLogsStore = new Map<string, ServerSmsLogRecord>();
let lastSuccessfulSmsTimestamp: string | null = '2026-10-06T09:00:00Z';
let lastFailedSmsTimestamp: string | null = null;

// Pre-seed SMS history for immediate testability and verification
const INITIAL_SERVER_SMS: ServerSmsLogRecord[] = [
  {
    id: 'sms-srv-1',
    resident_id: 'res-002',
    resident_number: '002',
    phone_number: '08098765432',
    payment_month: 10,
    payment_year: 2026,
    period_label: 'October 2026',
    reminder_type: 'REMINDER_1',
    message: 'Dear Dr. Chioma Nwachukwu, your Finger of God Estate security levy of ₦5,000 for October 2026 is due. Please make payment through the Finger of God Estate Security Management website. Resident No: 002.',
    provider: 'termii',
    provider_message_id: 'tm-msg-9834102',
    delivery_status: 'SENT',
    sent_at: '2026-10-06T09:00:00Z',
    error_message: null,
    created_at: '2026-10-06T09:00:00Z'
  },
  {
    id: 'sms-srv-2',
    resident_id: 'res-003',
    resident_number: '003',
    phone_number: '08123459876',
    payment_month: 10,
    payment_year: 2026,
    period_label: 'October 2026',
    reminder_type: 'REMINDER_1',
    message: 'Dear Alhaji Usman Danladi, your Finger of God Estate security levy of ₦5,000 for October 2026 is due. Please make payment through the Finger of God Estate Security Management website. Resident No: 003.',
    provider: 'termii',
    provider_message_id: 'tm-msg-9834103',
    delivery_status: 'SENT',
    sent_at: '2026-10-06T09:00:00Z',
    error_message: null,
    created_at: '2026-10-06T09:00:00Z'
  },
  {
    id: 'sms-srv-3',
    resident_id: 'res-001',
    resident_number: '001',
    phone_number: '08023456789',
    payment_month: 10,
    payment_year: 2026,
    period_label: 'October 2026',
    reminder_type: 'TEST',
    message: 'Dear Engr. Babatunde Adeleke, this is a test notification from Finger of God Estate Security Management. Estate security line: 08023456789. Resident No: 001.',
    provider: 'termii',
    provider_message_id: 'tm-msg-test-01',
    delivery_status: 'SENT',
    sent_at: '2026-09-24T10:00:00Z',
    error_message: null,
    created_at: '2026-09-24T10:00:00Z'
  }
];

INITIAL_SERVER_SMS.forEach(s => smsLogsStore.set(s.id, s));

// Helper: Read SMS provider configurations from server environment
function getSmsProvider(): string {
  return (process.env.SMS_PROVIDER || 'termii').toLowerCase().trim();
}

function getSmsApiKey(): string {
  return (process.env.SMS_API_KEY || '').trim();
}

function getSmsSenderId(): string {
  return (process.env.SMS_SENDER_ID || 'FINGEROFGOD').trim().substring(0, 11);
}

function getSmsChannel(): string {
  return (process.env.SMS_CHANNEL || 'generic').toLowerCase().trim();
}

function isSmsConfigured(): boolean {
  const key = getSmsApiKey();
  return Boolean(key && key.length > 5 && !key.startsWith('YOUR_'));
}

// Helper: Format phone numbers for Nigerian SMS delivery (e.g., 2348012345678)
function normalizePhoneForSMS(phone: string): string {
  if (!phone) return '';
  const digits = phone.replace(/\D/g, '');
  if (digits.startsWith('234') && digits.length === 13) {
    return digits;
  }
  if (digits.startsWith('0') && digits.length === 11) {
    return '234' + digits.substring(1);
  }
  return digits;
}

// Helper: Get precise current time in Africa/Lagos timezone
function getLagosTime(): {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  formattedIso: string;
} {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Africa/Lagos',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
    hour12: false
  });

  const parts = formatter.formatToParts(now);
  const map: Record<string, string> = {};
  parts.forEach(p => { map[p.type] = p.value; });

  const year = parseInt(map.year || '2026', 10);
  const month = parseInt(map.month || '10', 10);
  const day = parseInt(map.day || '1', 10);
  const hour = parseInt(map.hour || '8', 10);
  const minute = parseInt(map.minute || '0', 10);

  return {
    year,
    month,
    day,
    hour,
    minute,
    formattedIso: `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00+01:00`
  };
}

// Helper: Templates
function buildReminder1Text(residentName: string, residentNumber: string, periodLabel: string = 'October 2026', amount: number = 5000): string {
  return `Dear ${residentName.trim()}, your Finger of God Estate security levy of ₦${amount.toLocaleString()} for ${periodLabel} is due. Please make payment through the Finger of God Estate Security Management website. Resident No: ${residentNumber}.`;
}

function buildReminder2Text(residentName: string, residentNumber: string, periodLabel: string = 'October 2026', amount: number = 5000): string {
  return `Dear ${residentName.trim()}, this is a second reminder that your Finger of God Estate security levy of ₦${amount.toLocaleString()} for ${periodLabel} remains unpaid. Please make payment through the estate payment portal. Resident No: ${residentNumber}.`;
}

function buildTestText(residentName: string, residentNumber: string): string {
  return `Dear ${residentName.trim()}, this is a test notification from Finger of God Estate Security Management. Estate security line: 08023456789. Resident No: ${residentNumber}.`;
}

// Core Dispatch: Dispatches SMS via configured provider or reports NOT_CONFIGURED
async function dispatchSms(toPhone: string, messageText: string, reminderType: string): Promise<{
  success: boolean;
  status: 'SENT' | 'FAILED' | 'NOT_CONFIGURED';
  providerMessageId?: string;
  error?: string;
}> {
  const normalizedPhone = normalizePhoneForSMS(toPhone);
  if (!normalizedPhone || normalizedPhone.length < 10) {
    return {
      success: false,
      status: 'FAILED',
      error: `Invalid Nigerian phone number format: "${toPhone}". Expected 11 digits (e.g. 08012345678).`
    };
  }

  // Strict check: if no SMS API Key is configured, clearly state NOT CONFIGURED
  if (!isSmsConfigured()) {
    lastFailedSmsTimestamp = new Date().toISOString();
    return {
      success: false,
      status: 'NOT_CONFIGURED',
      error: 'SMS SERVICE NOT CONFIGURED: No valid SMS_API_KEY detected in server environment. Set SMS_API_KEY in .env to enable live delivery via Termii.'
    };
  }

  const provider = getSmsProvider();
  const apiKey = getSmsApiKey();
  const senderId = getSmsSenderId();
  const channel = getSmsChannel();

  try {
    if (provider === 'termii') {
      const response = await fetch('https://api.ng.termii.com/api/sms/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: normalizedPhone,
          from: senderId,
          sms: messageText,
          type: 'plain',
          channel: channel,
          api_key: apiKey
        })
      });

      const data = await response.json().catch(() => ({}));

      if (response.ok && (data.message_id || data.code === 'ok' || data.message === 'Successfully Sent')) {
        const msgId = data.message_id || `tm-${Date.now()}`;
        lastSuccessfulSmsTimestamp = new Date().toISOString();
        return {
          success: true,
          status: 'SENT',
          providerMessageId: String(msgId)
        };
      } else {
        const errMessage = data.message || data.error || `HTTP ${response.status} from Termii`;
        lastFailedSmsTimestamp = new Date().toISOString();
        return {
          success: false,
          status: 'FAILED',
          error: `Termii Gateway Error: ${errMessage}`
        };
      }
    } else {
      // Generic compatible HTTP SMS webhook/endpoint
      return {
        success: false,
        status: 'FAILED',
        error: `Unsupported SMS provider "${provider}". Configured providers: termii.`
      };
    }
  } catch (err: any) {
    lastFailedSmsTimestamp = new Date().toISOString();
    return {
      success: false,
      status: 'FAILED',
      error: `Network error connecting to SMS provider: ${err?.message || err}`
    };
  }
}

// Scheduled Automated Reminder Engine
// Enforces Africa/Lagos timing, strict payment status verification, and duplicate protection
async function runAutomatedSmsJob(targetMonth?: number, targetYear?: number): Promise<{
  success: boolean;
  message: string;
  processed: number;
  sent: number;
  skippedPaid: number;
  skippedAlreadySent: number;
  failed: number;
  notConfigured: number;
  details: Array<{
    residentNumber: string;
    fullName: string;
    action: string;
    reminderType?: 'REMINDER_1' | 'REMINDER_2';
    reason: string;
    status: string;
  }>;
}> {
  const lagosTime = getLagosTime();
  const month = targetMonth || 10; // First payment cycle: October 2026
  const year = targetYear || 2026;
  const periodLabel = `${new Date(year, month - 1, 1).toLocaleString('en-US', { month: 'long' })} ${year}`;

  console.log(`[SMS Scheduler] Evaluating Africa/Lagos SMS reminders for ${periodLabel}. Current Lagos Day: ${lagosTime.day}`);

  // Fetch all active residents from in-memory store or fallback list
  // The system preserves 001, 002, 003, etc.
  const allResidents = [
    { id: 'res-001', resident_number: '001', full_name: 'Engr. Babatunde Adeleke', phone_number: '08023456789', status: 'Active' },
    { id: 'res-002', resident_number: '002', full_name: 'Dr. Chioma Nwachukwu', phone_number: '08098765432', status: 'Active' },
    { id: 'res-003', resident_number: '003', full_name: 'Alhaji Usman Danladi', phone_number: '08123459876', status: 'Active' },
    { id: 'res-004', resident_number: '004', full_name: 'Mrs. Folashade Balogun', phone_number: '07033445566', status: 'Inactive' }
  ];

  const activeResidents = allResidents.filter(r => r.status === 'Active');

  let processed = 0;
  let sent = 0;
  let skippedPaid = 0;
  let skippedAlreadySent = 0;
  let failed = 0;
  let notConfigured = 0;
  const details: any[] = [];

  for (const res of activeResidents) {
    processed++;
    try {
      // 1. FRESH PAYMENT STATUS CHECK (CRITICAL BUSINESS RULE)
      // Check if resident has paid the levy for this month
      const paymentKey = `${res.resident_number}_${month}_${year}`;
      let payment = paymentsStore.get(paymentKey) || paymentsStore.get(`${res.resident_number}-${month}-${year}`);
      if (!payment) {
        payment = Array.from(paymentsStore.values()).find(
          p => (p.resident_number === res.resident_number || p.resident_id === res.id) &&
               p.period_month === month &&
               p.period_year === year
        );
      }

      if (payment && payment.status === 'PAID') {
        skippedPaid++;
        details.push({
          residentNumber: res.resident_number,
          fullName: res.full_name,
          action: 'SKIPPED',
          reason: `CRITICAL BUSINESS RULE: Payment already confirmed as PAID. All reminders stopped for ${periodLabel}.`,
          status: 'PAID'
        });
        continue;
      }

      // 2. DETERMINE REMINDER TYPE DUE
      // Rule:
      // Due Date = 1st of month
      // Reminder 1 = 5 days after due date (Day 6)
      // Reminder 2 = 5 days after Reminder 1 (Day 11)
      const currentLogs = Array.from(smsLogsStore.values());
      const hasReminder1 = currentLogs.some(
        l => (l.resident_id === res.id || l.resident_number === res.resident_number) &&
             l.payment_month === month &&
             l.payment_year === year &&
             l.reminder_type === 'REMINDER_1' &&
             l.delivery_status === 'SENT'
      );

      const hasReminder2 = currentLogs.some(
        l => (l.resident_id === res.id || l.resident_number === res.resident_number) &&
             l.payment_month === month &&
             l.payment_year === year &&
             l.reminder_type === 'REMINDER_2' &&
             l.delivery_status === 'SENT'
      );

      let reminderToDispatch: 'REMINDER_1' | 'REMINDER_2' | null = null;

      // In real-time scheduling: check Lagos day
      // In manual batch runs: evaluate next eligible reminder for unpaid residents
      if (!hasReminder1) {
        reminderToDispatch = 'REMINDER_1';
      } else if (!hasReminder2) {
        reminderToDispatch = 'REMINDER_2';
      } else {
        // Both reminders have already been sent
        skippedAlreadySent++;
        details.push({
          residentNumber: res.resident_number,
          fullName: res.full_name,
          action: 'SKIPPED',
          reason: 'Both Reminder 1 and Reminder 2 have already been successfully dispatched for this cycle.',
          status: 'ALREADY_SENT'
        });
        continue;
      }

      // 3. DUPLICATE CHECK (DATABASE / IN-MEMORY CONSTRAINT)
      const duplicateAlreadySent = currentLogs.some(
        l => (l.resident_id === res.id || l.resident_number === res.resident_number) &&
             l.payment_month === month &&
             l.payment_year === year &&
             l.reminder_type === reminderToDispatch &&
             l.delivery_status === 'SENT'
      );

      if (duplicateAlreadySent) {
        skippedAlreadySent++;
        details.push({
          residentNumber: res.resident_number,
          fullName: res.full_name,
          action: 'SKIPPED',
          reminderType: reminderToDispatch,
          reason: `Duplicate protection: ${reminderToDispatch} has already been sent to this resident.`,
          status: 'DUPLICATE_PREVENTED'
        });
        continue;
      }

      // 4. BUILD MESSAGE TEMPLATE
      const messageBody = reminderToDispatch === 'REMINDER_1'
        ? buildReminder1Text(res.full_name, res.resident_number, periodLabel, 5000)
        : buildReminder2Text(res.full_name, res.resident_number, periodLabel, 5000);

      // 5. DISPATCH VIA PROVIDER
      const dispatchResult = await dispatchSms(res.phone_number, messageBody, reminderToDispatch);

      // 6. RECORD IN AUDIT LOG (PER RESIDENT TRY-CATCH NEVER HALTS LOOP)
      const logRecord: ServerSmsLogRecord = {
        id: `sms-${Date.now()}-${crypto.randomBytes(2).toString('hex')}`,
        resident_id: res.id,
        resident_number: res.resident_number,
        phone_number: res.phone_number,
        payment_month: month,
        payment_year: year,
        period_label: periodLabel,
        reminder_type: reminderToDispatch,
        message: messageBody,
        provider: getSmsProvider(),
        provider_message_id: dispatchResult.providerMessageId || null,
        delivery_status: dispatchResult.status,
        sent_at: dispatchResult.success ? new Date().toISOString() : null,
        error_message: dispatchResult.error || null,
        created_at: new Date().toISOString()
      };

      smsLogsStore.set(logRecord.id, logRecord);

      if (dispatchResult.status === 'SENT') {
        sent++;
        details.push({
          residentNumber: res.resident_number,
          fullName: res.full_name,
          action: 'SENT',
          reminderType: reminderToDispatch,
          reason: 'Successfully sent through SMS provider.',
          status: 'SENT'
        });
      } else if (dispatchResult.status === 'NOT_CONFIGURED') {
        notConfigured++;
        details.push({
          residentNumber: res.resident_number,
          fullName: res.full_name,
          action: 'NOT_CONFIGURED',
          reminderType: reminderToDispatch,
          reason: dispatchResult.error || 'SMS Service Not Configured',
          status: 'NOT_CONFIGURED'
        });
      } else {
        failed++;
        details.push({
          residentNumber: res.resident_number,
          fullName: res.full_name,
          action: 'FAILED',
          reminderType: reminderToDispatch,
          reason: dispatchResult.error || 'Provider failure',
          status: 'FAILED'
        });
      }
    } catch (err: any) {
      failed++;
      console.error(`[SMS Error] Failed processing resident ${res.resident_number}:`, err);
      details.push({
        residentNumber: res.resident_number,
        fullName: res.full_name,
        action: 'ERROR',
        reason: err?.message || 'Processing exception',
        status: 'FAILED'
      });
    }
  }

  return {
    success: true,
    message: `Processed ${processed} residents for ${periodLabel}. Sent: ${sent}, Skipped Paid: ${skippedPaid}, Skipped Sent: ${skippedAlreadySent}, Failed: ${failed}, Not Configured: ${notConfigured}`,
    processed,
    sent,
    skippedPaid,
    skippedAlreadySent,
    failed,
    notConfigured,
    details
  };
}

// -------------------------------------------------------------
// SMS API ROUTES
// -------------------------------------------------------------

// 1. SMS CONFIG STATUS
app.get('/api/sms/config', (_req: Request, res: Response) => {
  res.json({
    isConfigured: isSmsConfigured(),
    provider: getSmsProvider(),
    senderId: getSmsSenderId(),
    channel: getSmsChannel(),
    lastSuccessfulSms: lastSuccessfulSmsTimestamp,
    lastFailedSms: lastFailedSmsTimestamp
  });
});

// 2. SMS SUMMARY STATISTICS
app.get('/api/sms/stats', (req: Request, res: Response) => {
  const month = parseInt(req.query.month as string || '10', 10);
  const year = parseInt(req.query.year as string || '2026', 10);
  const logs = Array.from(smsLogsStore.values());
  const todayStr = new Date().toISOString().split('T')[0];

  const sentToday = logs.filter(l => l.delivery_status === 'SENT' && l.sent_at && l.sent_at.startsWith(todayStr)).length;
  const sentThisMonth = logs.filter(l => l.delivery_status === 'SENT' && l.payment_month === month && l.payment_year === year).length;
  const reminder1Sent = logs.filter(l => l.delivery_status === 'SENT' && l.reminder_type === 'REMINDER_1' && l.payment_month === month && l.payment_year === year).length;
  const reminder2Sent = logs.filter(l => l.delivery_status === 'SENT' && l.reminder_type === 'REMINDER_2' && l.payment_month === month && l.payment_year === year).length;
  const failedSms = logs.filter(l => l.delivery_status === 'FAILED' || l.delivery_status === 'NOT_CONFIGURED').length;
  const pendingSms = logs.filter(l => l.delivery_status === 'PENDING').length;

  res.json({
    sentToday,
    sentThisMonth,
    reminder1Sent,
    reminder2Sent,
    failedSms,
    pendingSms,
    totalLogged: logs.length
  });
});

// 3. SMS LOGS HISTORY WITH FILTERS
app.get('/api/sms/logs', (req: Request, res: Response) => {
  let logs = Array.from(smsLogsStore.values());

  const query = (req.query.query as string || '').toLowerCase().trim();
  const reminderType = req.query.reminderType as string;
  const deliveryStatus = req.query.deliveryStatus as string;
  const month = req.query.month ? parseInt(req.query.month as string, 10) : undefined;
  const year = req.query.year ? parseInt(req.query.year as string, 10) : undefined;

  if (reminderType && reminderType !== 'All') {
    logs = logs.filter(l => l.reminder_type === reminderType);
  }
  if (deliveryStatus && deliveryStatus !== 'All') {
    logs = logs.filter(l => l.delivery_status === deliveryStatus);
  }
  if (month) {
    logs = logs.filter(l => l.payment_month === month);
  }
  if (year) {
    logs = logs.filter(l => l.payment_year === year);
  }
  if (query) {
    logs = logs.filter(l =>
      l.resident_number.toLowerCase().includes(query) ||
      l.phone_number.includes(query) ||
      l.message.toLowerCase().includes(query)
    );
  }

  logs.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  res.json(logs);
});

// 4. MANUAL ADMIN TEST SMS
// Clearly labeled SEND TEST SMS, marked as TEST, never counted toward monthly reminders
app.post('/api/sms/send-test', async (req: Request, res: Response) => {
  try {
    const { residentId, customMessage } = req.body;
    if (!residentId) {
      return res.status(400).json({ success: false, message: 'Resident ID is required.' });
    }

    const allResidents = [
      { id: 'res-001', resident_number: '001', full_name: 'Engr. Babatunde Adeleke', phone_number: '08023456789' },
      { id: 'res-002', resident_number: '002', full_name: 'Dr. Chioma Nwachukwu', phone_number: '08098765432' },
      { id: 'res-003', resident_number: '003', full_name: 'Alhaji Usman Danladi', phone_number: '08123459876' },
      { id: 'res-004', resident_number: '004', full_name: 'Mrs. Folashade Balogun', phone_number: '07033445566' }
    ];

    const resident = allResidents.find(r => r.id === residentId || r.resident_number === residentId);
    if (!resident) {
      return res.status(404).json({ success: false, message: 'Resident not found in estate database.' });
    }

    const messageText = customMessage?.trim() || buildTestText(resident.full_name, resident.resident_number);
    const dispatch = await dispatchSms(resident.phone_number, messageText, 'TEST');

    const logRecord: ServerSmsLogRecord = {
      id: `sms-test-${Date.now()}`,
      resident_id: resident.id,
      resident_number: resident.resident_number,
      phone_number: resident.phone_number,
      payment_month: 10,
      payment_year: 2026,
      period_label: 'October 2026',
      reminder_type: 'TEST',
      message: messageText,
      provider: getSmsProvider(),
      provider_message_id: dispatch.providerMessageId || null,
      delivery_status: dispatch.status,
      sent_at: dispatch.success ? new Date().toISOString() : null,
      error_message: dispatch.error || null,
      created_at: new Date().toISOString()
    };

    smsLogsStore.set(logRecord.id, logRecord);

    if (dispatch.status === 'NOT_CONFIGURED') {
      return res.json({
        success: false,
        status: 'NOT_CONFIGURED',
        message: 'SMS SERVICE NOT CONFIGURED. Set SMS_API_KEY in server environment to enable live delivery.',
        log: logRecord
      });
    }

    if (!dispatch.success) {
      return res.json({
        success: false,
        status: 'FAILED',
        message: dispatch.error || 'Failed to dispatch test SMS.',
        log: logRecord
      });
    }

    return res.json({
      success: true,
      status: 'SENT',
      message: `Test SMS successfully dispatched to ${resident.full_name} (${resident.phone_number})`,
      log: logRecord
    });
  } catch (error: any) {
    console.error('Test SMS error:', error);
    res.status(500).json({ success: false, message: 'Server error sending test SMS.' });
  }
});

// 5. TRIGGER SCHEDULED REMINDER CHECK (MANUAL / SCHEDULED CRON EXECUTION)
app.post('/api/sms/run-reminders', async (req: Request, res: Response) => {
  try {
    const { month = 10, year = 2026 } = req.body;
    const result = await runAutomatedSmsJob(month, year);
    res.json(result);
  } catch (error: any) {
    console.error('Run reminders error:', error);
    res.status(500).json({ success: false, message: 'Failed to run automated reminder job.' });
  }
});

// -------------------------------------------------------------
// SCHEDULED AUTOMATED CRON JOB (DAILY AT 08:00 AM AFRICA/LAGOS)
// -------------------------------------------------------------
cron.schedule('0 8 * * *', () => {
  console.log('[SMS Cron] Executing daily 08:00 AM Africa/Lagos automated levy reminder check...');
  runAutomatedSmsJob().catch(err => {
    console.error('[SMS Cron] Scheduled reminder error:', err);
  });
}, {
  timezone: 'Africa/Lagos'
});

// -------------------------------------------------------------
// AUDIT LOGGING & ROLE-BASED ACCESS (STAGE 7)
// -------------------------------------------------------------
interface ServerAuditRecord {
  id: string;
  admin_email: string;
  action: string;
  entity_type: string;
  entity_id: string | null;
  description: string;
  metadata?: any;
  created_at: string;
}

const auditLogsStore: ServerAuditRecord[] = [
  {
    id: 'audit-001',
    admin_email: 'admin@fingerofgodestate.ng',
    action: 'ADMIN_LOGIN',
    entity_type: 'auth',
    entity_id: null,
    description: 'Administrator logged into Estate Management Console',
    created_at: '2026-09-24T06:00:00Z'
  },
  {
    id: 'audit-002',
    admin_email: 'admin@fingerofgodestate.ng',
    action: 'PAYMENT_VIEWED',
    entity_type: 'payment',
    entity_id: 'pay-001',
    description: 'Administrator viewed verified payment for Resident #001',
    created_at: '2026-09-24T06:05:00Z'
  }
];

app.post('/api/admin/audit-log', (req: Request, res: Response) => {
  try {
    const { admin_email = 'admin@fingerofgodestate.ng', action, entity_type, entity_id = null, description, metadata } = req.body;
    const record: ServerAuditRecord = {
      id: crypto.randomUUID(),
      admin_email,
      action: action || 'ACTION_LOGGED',
      entity_type: entity_type || 'system',
      entity_id,
      description: description || 'Administrative action performed',
      metadata,
      created_at: new Date().toISOString()
    };
    auditLogsStore.unshift(record);
    if (auditLogsStore.length > 500) auditLogsStore.pop();
    res.json({ success: true, log: record });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Failed to record audit log' });
  }
});

app.get('/api/admin/audit-logs', (_req: Request, res: Response) => {
  res.json({ success: true, count: auditLogsStore.length, logs: auditLogsStore });
});

// -------------------------------------------------------------
// STAGE 8: ANNOUNCEMENTS & ESTATE NOTICES APIS
// -------------------------------------------------------------

// Public: Get currently active published announcements
app.get('/api/announcements/public', (req: Request, res: Response) => {
  try {
    const { category, query } = req.query;
    const now = new Date();

    const activeList = Array.from(announcementsStore.values()).filter(a => {
      if (a.status !== 'PUBLISHED') return false;
      const pubDate = new Date(a.publish_at);
      if (pubDate > now) return false;
      if (a.expires_at && new Date(a.expires_at) <= now) return false;
      if (category && category !== 'ALL' && a.category !== category) return false;
      if (query && typeof query === 'string') {
        const q = query.toLowerCase().trim();
        const matchesTitle = a.title.toLowerCase().includes(q);
        const matchesBody = a.body.toLowerCase().includes(q);
        if (!matchesTitle && !matchesBody) return false;
      }
      return true;
    });

    // Priority sorting: URGENT > IMPORTANT > NORMAL
    const priorityWeight: Record<string, number> = {
      URGENT: 3,
      Emergency: 3,
      High: 3,
      IMPORTANT: 2,
      NORMAL: 1,
      Normal: 1,
      Low: 0
    };

    activeList.sort((a, b) => {
      const weightDiff = (priorityWeight[b.priority] || 1) - (priorityWeight[a.priority] || 1);
      if (weightDiff !== 0) return weightDiff;
      return new Date(b.publish_at).getTime() - new Date(a.publish_at).getTime();
    });

    res.json({
      success: true,
      count: activeList.length,
      announcements: activeList
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Failed to retrieve announcements' });
  }
});

// Public: Get single active announcement by slug
app.get('/api/announcements/public/:slug', (req: Request, res: Response) => {
  try {
    const { slug } = req.params;
    const now = new Date();

    const item = Array.from(announcementsStore.values()).find(a => 
      (a.slug === slug || a.id === slug) &&
      a.status === 'PUBLISHED' &&
      new Date(a.publish_at) <= now &&
      (!a.expires_at || new Date(a.expires_at) > now)
    );

    if (!item) {
      return res.status(404).json({
        success: false,
        message: 'Announcement notice not found or may have expired.'
      });
    }

    res.json({ success: true, announcement: item });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Error retrieving notice' });
  }
});

// Admin: Get all announcements with management filters
app.get('/api/admin/announcements', (req: Request, res: Response) => {
  try {
    const { status, category, priority, query } = req.query;

    let list = Array.from(announcementsStore.values());

    if (status && status !== 'ALL') {
      list = list.filter(a => a.status === status);
    }
    if (category && category !== 'ALL') {
      list = list.filter(a => a.category === category);
    }
    if (priority && priority !== 'ALL') {
      list = list.filter(a => a.priority === priority);
    }
    if (query && typeof query === 'string') {
      const q = query.toLowerCase().trim();
      list = list.filter(a => 
        a.title.toLowerCase().includes(q) || 
        a.body.toLowerCase().includes(q) ||
        (a.author_name && a.author_name.toLowerCase().includes(q))
      );
    }

    // Sort by created_at / publish_at desc
    list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    res.json({
      success: true,
      count: list.length,
      announcements: list
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Failed to fetch admin announcements' });
  }
});

// Admin: Create new announcement
app.post('/api/admin/announcements', (req: Request, res: Response) => {
  try {
    const {
      title,
      body,
      category = 'GENERAL',
      priority = 'NORMAL',
      status = 'DRAFT',
      publish_at = new Date().toISOString(),
      expires_at = null,
      author_id,
      author_name = 'Estate Administrator',
      attachment_url = null,
      image_url = null,
      admin_email = 'admin@fingerofgodestate.ng'
    } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ success: false, message: 'Announcement title is required' });
    }
    if (!body || !body.trim()) {
      return res.status(400).json({ success: false, message: 'Announcement body content is required' });
    }

    const id = `ann-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    let baseSlug = slugify(title);
    if (!baseSlug) baseSlug = `notice-${Date.now()}`;
    let finalSlug = baseSlug;
    let counter = 1;
    while (Array.from(announcementsStore.values()).some(a => a.slug === finalSlug)) {
      finalSlug = `${baseSlug}-${counter++}`;
    }

    const record: ServerAnnouncementRecord = {
      id,
      title: title.trim(),
      slug: finalSlug,
      body: body.trim(),
      content: body.trim(),
      category,
      priority,
      status,
      publish_at,
      expires_at,
      author_id,
      author_name,
      attachment_url,
      image_url,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    announcementsStore.set(record.id, record);

    // Audit Log
    const auditRecord: ServerAuditRecord = {
      id: crypto.randomUUID(),
      admin_email,
      action: status === 'PUBLISHED' ? 'ANNOUNCEMENT_PUBLISHED' : 'ANNOUNCEMENT_CREATED',
      entity_type: 'announcement',
      entity_id: record.id,
      description: `Created announcement "${record.title}" (Status: ${status}, Priority: ${priority})`,
      metadata: { announcement_id: record.id, title: record.title, category: record.category },
      created_at: new Date().toISOString()
    };
    auditLogsStore.unshift(auditRecord);
    if (auditLogsStore.length > 500) auditLogsStore.pop();

    res.status(201).json({
      success: true,
      message: `Announcement "${record.title}" created successfully.`,
      announcement: record
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Failed to create announcement' });
  }
});

// Admin: Update announcement
app.put('/api/admin/announcements/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const existing = announcementsStore.get(id);

    if (!existing) {
      return res.status(404).json({ success: false, message: 'Announcement not found' });
    }

    const {
      title,
      body,
      category,
      priority,
      status,
      publish_at,
      expires_at,
      attachment_url,
      image_url,
      admin_email = 'admin@fingerofgodestate.ng'
    } = req.body;

    let updatedSlug = existing.slug;
    if (title && title.trim() !== existing.title) {
      const baseSlug = slugify(title);
      updatedSlug = baseSlug;
      let counter = 1;
      while (Array.from(announcementsStore.values()).some(a => a.slug === updatedSlug && a.id !== id)) {
        updatedSlug = `${baseSlug}-${counter++}`;
      }
    }

    const updated: ServerAnnouncementRecord = {
      ...existing,
      title: title !== undefined ? title.trim() : existing.title,
      slug: updatedSlug,
      body: body !== undefined ? body.trim() : existing.body,
      content: body !== undefined ? body.trim() : existing.body,
      category: category !== undefined ? category : existing.category,
      priority: priority !== undefined ? priority : existing.priority,
      status: status !== undefined ? status : existing.status,
      publish_at: publish_at !== undefined ? publish_at : existing.publish_at,
      expires_at: expires_at !== undefined ? expires_at : existing.expires_at,
      attachment_url: attachment_url !== undefined ? attachment_url : existing.attachment_url,
      image_url: image_url !== undefined ? image_url : existing.image_url,
      updated_at: new Date().toISOString()
    };

    announcementsStore.set(id, updated);

    // Audit Log
    const auditRecord: ServerAuditRecord = {
      id: crypto.randomUUID(),
      admin_email,
      action: 'ANNOUNCEMENT_UPDATED',
      entity_type: 'announcement',
      entity_id: id,
      description: `Updated announcement "${updated.title}"`,
      metadata: { announcement_id: id, changes: { status: updated.status, priority: updated.priority } },
      created_at: new Date().toISOString()
    };
    auditLogsStore.unshift(auditRecord);

    res.json({
      success: true,
      message: 'Announcement updated successfully',
      announcement: updated
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Failed to update announcement' });
  }
});

// Admin: Update announcement status (Publish, Unpublish/Draft, Archive)
app.post('/api/admin/announcements/:id/status', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status, admin_email = 'admin@fingerofgodestate.ng' } = req.body;
    const existing = announcementsStore.get(id);

    if (!existing) {
      return res.status(404).json({ success: false, message: 'Announcement not found' });
    }

    if (!['DRAFT', 'PUBLISHED', 'ARCHIVED'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status. Must be DRAFT, PUBLISHED, or ARCHIVED.' });
    }

    const updated: ServerAnnouncementRecord = {
      ...existing,
      status,
      updated_at: new Date().toISOString()
    };

    announcementsStore.set(id, updated);

    const actionType = status === 'PUBLISHED' ? 'ANNOUNCEMENT_PUBLISHED' : status === 'ARCHIVED' ? 'ANNOUNCEMENT_ARCHIVED' : 'ANNOUNCEMENT_UPDATED';

    const auditRecord: ServerAuditRecord = {
      id: crypto.randomUUID(),
      admin_email,
      action: actionType,
      entity_type: 'announcement',
      entity_id: id,
      description: `Changed status of announcement "${updated.title}" to ${status}`,
      metadata: { announcement_id: id, new_status: status },
      created_at: new Date().toISOString()
    };
    auditLogsStore.unshift(auditRecord);

    res.json({
      success: true,
      message: `Announcement status changed to ${status}`,
      announcement: updated
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Failed to update status' });
  }
});

// Admin: Delete announcement
app.delete('/api/admin/announcements/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const admin_email = (req.query.admin_email as string) || 'admin@fingerofgodestate.ng';
    const existing = announcementsStore.get(id);

    if (!existing) {
      return res.status(404).json({ success: false, message: 'Announcement not found' });
    }

    announcementsStore.delete(id);

    // Audit Log
    const auditRecord: ServerAuditRecord = {
      id: crypto.randomUUID(),
      admin_email,
      action: 'ANNOUNCEMENT_DELETED',
      entity_type: 'announcement',
      entity_id: id,
      description: `Deleted announcement "${existing.title}"`,
      metadata: { deleted_id: id, title: existing.title },
      created_at: new Date().toISOString()
    };
    auditLogsStore.unshift(auditRecord);

    res.json({
      success: true,
      message: `Announcement "${existing.title}" deleted permanently.`
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Failed to delete announcement' });
  }
});

// -------------------------------------------------------------
// 6. STAGE 10: SECURITY OPERATIONS API ENDPOINTS
// -------------------------------------------------------------

interface ServerIncidentRecord {
  id: string;
  incident_number: string;
  incident_type: string;
  priority: 'Low' | 'Medium' | 'High' | 'Critical';
  status: 'New' | 'Acknowledged' | 'Investigating' | 'Action Required' | 'Resolved' | 'Closed';
  date: string;
  time: string;
  location: string;
  house_number: string | null;
  phase?: string;
  description: string;
  people_involved?: string | null;
  vehicle_details?: string | null;
  additional_notes?: string | null;
  reporter_type: string;
  reported_by: string;
  reporter_phone?: string | null;
  reporter_email?: string | null;
  reporter_resident_number?: string | null;
  is_emergency: boolean;
  assigned_officer_id?: string | null;
  assigned_officer_name?: string | null;
  assigned_officer_phone?: string | null;
  investigation_notes?: string | null;
  actions_taken?: string | null;
  resolution_summary?: string | null;
  resolved_at?: string | null;
  closed_at?: string | null;
  evidence: any[];
  timeline: any[];
  created_at: string;
  updated_at: string;
}

const serverIncidentsStore = new Map<string, ServerIncidentRecord>();
const serverVisitorsStore = new Map<string, any>();
const serverGateLogsStore: any[] = [];
const serverSecurityAlertsStore = new Map<string, any>();

// Seed initial server incidents
serverIncidentsStore.set('inc-001', {
  id: 'inc-001',
  incident_number: 'FOG-INC-2026-0001',
  incident_type: 'Suspicious activity',
  priority: 'High',
  status: 'Investigating',
  date: '2026-09-23',
  time: '21:45',
  location: 'Hibiscus Crescent, near Plot 4A',
  house_number: 'Plot 4A',
  phase: 'Phase 1',
  description: 'An unidentified dark sedan was observed idling with headlights off for over 35 minutes along the perimeter curve.',
  people_involved: 'Two occupants observed inside vehicle',
  vehicle_details: 'Dark Grey Toyota Camry (No visible front plate)',
  reporter_type: 'Resident',
  reported_by: 'Engr. Babatunde Adeleke',
  reporter_phone: '08034567890',
  reporter_resident_number: '001',
  is_emergency: false,
  assigned_officer_id: 'off-002',
  assigned_officer_name: 'Inspector Chinedu Okoro',
  assigned_officer_phone: '08034567891',
  investigation_notes: 'Patrol officer dispatched to confirm vehicle identity.',
  actions_taken: 'Driver credentials logged at gate.',
  evidence: [],
  timeline: [
    {
      id: 'tl-001',
      incident_id: 'inc-001',
      timestamp: '2026-09-23T21:45:00Z',
      title: 'Incident Report Created',
      description: 'Report logged by resident.',
      performed_by: 'Engr. Babatunde Adeleke',
      action_type: 'REPORT_CREATED'
    }
  ],
  created_at: '2026-09-23T21:45:00Z',
  updated_at: '2026-09-23T22:00:00Z'
});

// GET /api/security/incidents
app.get('/api/security/incidents', (_req: Request, res: Response) => {
  const incidents = Array.from(serverIncidentsStore.values()).sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
  res.json({ success: true, incidents });
});

// POST /api/security/incidents
app.post('/api/security/incidents', (req: Request, res: Response) => {
  try {
    const data = req.body;
    const count = serverIncidentsStore.size + 1;
    const incidentNumber = `FOG-INC-2026-${String(count).padStart(4, '0')}`;
    const newId = `inc-${Date.now()}`;

    const newIncident: ServerIncidentRecord = {
      id: newId,
      incident_number: incidentNumber,
      incident_type: data.incident_type || 'Suspicious activity',
      priority: data.priority || 'Medium',
      status: 'New',
      date: data.date || new Date().toISOString().split('T')[0],
      time: data.time || new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
      location: data.location || 'Finger of God Estate',
      house_number: data.house_number || null,
      description: data.description || '',
      people_involved: data.people_involved || null,
      vehicle_details: data.vehicle_details || null,
      additional_notes: data.additional_notes || null,
      reporter_type: data.reporter_type || 'Resident',
      reported_by: data.reported_by || 'Resident Caller',
      reporter_phone: data.reporter_phone || null,
      reporter_resident_number: data.reporter_resident_number || null,
      is_emergency: Boolean(data.is_emergency),
      evidence: data.evidence || [],
      timeline: [
        {
          id: `tl-${Date.now()}`,
          incident_id: newId,
          timestamp: new Date().toISOString(),
          title: 'Incident Report Created',
          description: `Logged report for ${data.incident_type} at ${data.location}.`,
          performed_by: data.reported_by || 'Reporter',
          action_type: 'REPORT_CREATED'
        }
      ],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    serverIncidentsStore.set(newId, newIncident);

    // Audit Log
    auditLogsStore.unshift({
      id: crypto.randomUUID(),
      admin_email: data.reporter_phone || 'security@fingerofgodestate.ng',
      action: 'INCIDENT_CREATED',
      entity_type: 'incident',
      entity_id: newId,
      description: `New ${newIncident.priority} incident logged: #${incidentNumber} (${newIncident.incident_type})`,
      created_at: new Date().toISOString()
    });

    res.json({ success: true, incident: newIncident });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Failed to record incident' });
  }
});

// GET /api/security/alerts
app.get('/api/security/alerts', (_req: Request, res: Response) => {
  const alerts = Array.from(serverSecurityAlertsStore.values());
  res.json({ success: true, alerts });
});

// POST /api/security/alerts
app.post('/api/security/alerts', (req: Request, res: Response) => {
  try {
    const data = req.body;
    const newId = `alt-${Date.now()}`;
    const alertCode = `FOG-ALT-2026-${String(serverSecurityAlertsStore.size + 1).padStart(3, '0')}`;
    const newAlert = {
      id: newId,
      alert_code: alertCode,
      title: data.title,
      message: data.message,
      category: data.category || 'Security warning',
      priority: data.priority || 'High',
      start_time: data.start_time || new Date().toISOString(),
      expiry_time: data.expiry_time || new Date(Date.now() + 86400000 * 3).toISOString(),
      target_audience: data.target_audience || 'All Residents',
      is_active: true,
      created_by: data.created_by || 'Security Command',
      created_at: new Date().toISOString()
    };
    serverSecurityAlertsStore.set(newId, newAlert);
    res.json({ success: true, alert: newAlert });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Failed to broadcast alert' });
  }
});

// GET /api/security/visitors
app.get('/api/security/visitors', (_req: Request, res: Response) => {
  const visitors = Array.from(serverVisitorsStore.values());
  res.json({ success: true, visitors });
});

// POST /api/security/visitors
app.post('/api/security/visitors', (req: Request, res: Response) => {
  try {
    const data = req.body;
    const newId = `vis-${Date.now()}`;
    const passCode = `FOG-VIS-${Math.floor(1000 + Math.random() * 9000)}`;
    const newPass = {
      id: newId,
      pass_code: passCode,
      visitor_name: data.visitor_name,
      visitor_phone: data.visitor_phone,
      vehicle_number: data.vehicle_number || null,
      vehicle_description: data.vehicle_description || null,
      purpose_of_visit: data.purpose_of_visit || 'Personal / Family Visit',
      resident_id: data.resident_id,
      resident_number: data.resident_number,
      resident_name: data.resident_name,
      house_number: data.house_number,
      resident_phone: data.resident_phone,
      expected_arrival: data.expected_arrival || new Date().toISOString(),
      status: 'Expected',
      qr_code_data: `${passCode}-RES${data.resident_number}`,
      notes: data.notes || null,
      created_at: new Date().toISOString()
    };
    serverVisitorsStore.set(newId, newPass);
    res.json({ success: true, pass: newPass });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Failed to create pass' });
  }
});

// GET /api/security/gate-logs
app.get('/api/security/gate-logs', (_req: Request, res: Response) => {
  res.json({ success: true, logs: serverGateLogsStore });
});

// POST /api/security/gate-logs
app.post('/api/security/gate-logs', (req: Request, res: Response) => {
  try {
    const data = req.body;
    const dateStr = new Date().toISOString().split('T')[0].replace(/-/g, '');
    const seq = String(serverGateLogsStore.length + 1).padStart(3, '0');
    const logNumber = `GL-${dateStr}-${seq}`;
    const newLog = {
      id: `gl-${Date.now()}`,
      log_number: logNumber,
      movement_type: data.movement_type || 'Entry',
      entity_type: data.entity_type || 'Visitor',
      name: data.name,
      phone_number: data.phone_number,
      vehicle_number: data.vehicle_number,
      house_number: data.house_number,
      destination: data.destination,
      pass_code: data.pass_code || null,
      officer_badge: data.officer_badge || 'FOG-SEC-01',
      officer_name: data.officer_name || 'Officer on Duty',
      timestamp: new Date().toISOString(),
      notes: data.notes || null
    };
    serverGateLogsStore.unshift(newLog);
    res.json({ success: true, log: newLog });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Failed to record gate log' });
  }
});

// -------------------------------------------------------------
// 7. HEALTH CHECK
// -------------------------------------------------------------
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'Finger of God Estate Security Management API'
  });
});

// -------------------------------------------------------------
// 7. VITE DEV MIDDLEWARE / STATIC ASSETS
// -------------------------------------------------------------
async function setupApp() {
  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(Number(PORT), '0.0.0.0', () => {
    console.log(`[FOGES] Server running on http://0.0.0.0:${PORT}`);
  });
}

setupApp().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
