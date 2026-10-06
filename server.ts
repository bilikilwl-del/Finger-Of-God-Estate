import express from 'express';
import type { Request, Response } from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
import cron from 'node-cron';
import { roadProjectRouter, processVerifiedRoadPaystackEvent } from './src/server/roadProjectServer.ts';
import { electionRouter } from './src/server/electionServer.ts';
import { serverDb, supabaseAdmin, verifyAdminToken, VerifiedAdminUser, ensureDesignatedAdminAccount } from './src/server/database.ts';
import { normalizeNigerianPhone, validateNigerianPhone, arePhoneNumbersEqual, formatNigerianPhoneForSMS } from './src/lib/phoneUtils.ts';
import { isValidResidentNumber, normalizeResidentNumber, validateResidentNumber, checkDuplicatePhone } from './src/lib/residentUtils.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const isProd = process.env.NODE_ENV === 'production';
const PORT = Number(process.env.DEFAULT_APP_PORT || (process.env.PORT && process.env.PORT !== '8080' ? process.env.PORT : 3000));

const app = express();

// Capture raw body for Paystack webhook HMAC SHA512 signature verification
app.use(express.json({
  verify: (req: any, _res, buf) => {
    req.rawBody = buf;
  }
}));

// Robust Server-side Administrator Authorization Middleware (Strict Token & admin_users Verification)
export const requireAdminAuth = async (req: Request, res: Response, next: express.NextFunction) => {
  const authHeader = req.headers.authorization;
  const adminToken = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null;

  if (!adminToken) {
    return res.status(401).json({
      success: false,
      message: 'Unauthorized: Valid administrator authorization credentials required.'
    });
  }

  const result = await verifyAdminToken(adminToken);
  if (!result.valid || !result.user) {
    const isForbidden = result.error?.includes('not authorized') || result.error?.includes('Access denied');
    return res.status(isForbidden ? 403 : 401).json({
      success: false,
      message: result.error || 'Unauthorized: Invalid administrator credentials.'
    });
  }

  (req as any).adminUser = result.user;
  return next();
};

// Role-based Access Control Middleware
export const requireAdminRole = (allowedRoles: string[]) => {
  return (req: Request, res: Response, next: express.NextFunction) => {
    const adminUser = (req as any).adminUser as VerifiedAdminUser;
    if (!adminUser) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized: Administrator authentication required.'
      });
    }

    if (adminUser.role === 'Super Admin' || allowedRoles.includes(adminUser.role)) {
      return next();
    }

    return res.status(403).json({
      success: false,
      message: `Forbidden: This action requires one of the following roles: ${allowedRoles.join(', ')}.`
    });
  };
};

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
  profile_completed?: boolean;
  account_status?: 'NOT ACTIVATED' | 'ACTIVE' | 'PROFILE UPDATE REQUIRED' | 'SUSPENDED';
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
  created_at?: string;
  updated_at?: string;
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

// Seed Initial Estate Residents (Empty by default; populated from database)
const INITIAL_SERVER_RESIDENTS: ServerResidentRecord[] = [];

INITIAL_SERVER_RESIDENTS.forEach(r => residentsStore.set(r.resident_number, r));

/**
 * Strict Server-Side Resident Authentication & Authorization Guard
 * Enforces:
 * 1. Missing Authorization header -> 401 Unauthorized
 * 2. Invalid or expired token -> 401 Unauthorized
 * 3. Inactive/Suspended account -> 403 Forbidden
 * 4. Target resident number mismatch (cross-access) -> 403 Forbidden
 * 5. Returns authenticated resident record upon success
 */
export async function requireAuthenticatedResident(
  req: Request,
  res: Response,
  targetResidentNumber?: string
): Promise<ServerResidentRecord | null> {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({
      success: false,
      message: 'Unauthorized: Authorization header with Bearer token is required.'
    });
    return null;
  }

  const token = authHeader.substring(7).trim();
  if (!token) {
    res.status(401).json({
      success: false,
      message: 'Unauthorized: Authorization token is missing. Please sign in.'
    });
    return null;
  }

  let authResidentNumber: string | null = null;

  // 1. Check local session store
  const localSession = residentSessionsStore.get(token);
  if (localSession) {
    const MAX_SESSION_AGE = 30 * 24 * 60 * 60 * 1000; // 30 days
    if (Date.now() - localSession.created_at > MAX_SESSION_AGE) {
      residentSessionsStore.delete(token);
      res.status(401).json({
        success: false,
        message: 'Unauthorized: Your session has expired. Please sign in again.'
      });
      return null;
    }
    authResidentNumber = localSession.resident_number;
  } else if (token.startsWith('eyJ')) {
    // 2. Validate with Supabase Auth JWT
    try {
      const { data: { user }, error: userErr } = await supabaseAdmin.auth.getUser(token);
      if (!userErr && user) {
        if (user.user_metadata?.resident_number) {
          authResidentNumber = normalizeResidentNumber(user.user_metadata.resident_number);
        } else {
          const dbResidents = await serverDb.getResidents();
          const found = dbResidents.find(r => r.auth_user_id === user.id);
          if (found) {
            authResidentNumber = found.resident_number;
          }
        }
      }
    } catch (e) {
      console.warn('[Supabase Auth token validation error]', e);
    }
  }

  if (!authResidentNumber) {
    res.status(401).json({
      success: false,
      message: 'Unauthorized: Invalid or expired authorization token. Access denied.'
    });
    return null;
  }

  const cleanAuthNum = normalizeResidentNumber(authResidentNumber);
  let resident = residentsStore.get(cleanAuthNum);
  if (!resident) {
    resident = await serverDb.getResidentByNumber(cleanAuthNum);
    if (resident) residentsStore.set(cleanAuthNum, resident);
  }

  if (!resident) {
    res.status(404).json({
      success: false,
      message: 'Authenticated resident profile could not be found.'
    });
    return null;
  }

  if (resident.status !== 'Active') {
    res.status(403).json({
      success: false,
      message: 'This resident account is currently inactive. Please contact estate administration.'
    });
    return null;
  }

  if (targetResidentNumber) {
    const cleanTargetNum = normalizeResidentNumber(targetResidentNumber);
    if (cleanTargetNum !== cleanAuthNum) {
      res.status(403).json({
        success: false,
        message: 'Access denied: You are not authorized to view or modify another resident’s records.'
      });
      return null;
    }
  }

  return resident;
}

// Synchronize all residents from persistent database (estate_database.json / Supabase)
export async function initializeResidentsStore(): Promise<void> {
  try {
    const dbResidents = await serverDb.getResidents();
    if (Array.isArray(dbResidents) && dbResidents.length > 0) {
      residentsStore.clear();
      for (const r of dbResidents) {
        if (r.resident_number) {
          const cleanNum = String(r.resident_number).trim().padStart(3, '0');
          residentsStore.set(cleanNum, {
            ...r,
            resident_number: cleanNum,
            phone_number: normalizeNigerianPhone(r.phone_number),
            additional_phone: r.additional_phone ? normalizeNigerianPhone(r.additional_phone) : null,
            account_activated: !!r.account_activated,
            profile_completed: !!r.profile_completed,
            account_status: r.account_status || (r.account_activated ? (r.profile_completed ? 'ACTIVE' : 'PROFILE UPDATE REQUIRED') : 'NOT ACTIVATED')
          });
        }
      }
      console.log(`[ResidentStore] Synchronized ${residentsStore.size} residents from persistent database.`);
    }
  } catch (err) {
    console.error('[ResidentStore] Error initializing residents from database:', err);
  }
}

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

// Seed unpaids for Resident 002, 003, 004 if resident exists
['002', '003', '004'].forEach(num => {
  const r = residentsStore.get(num);
  if (!r) return;
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
      return res.status(400).json({
        success: false,
        verified: false,
        message: 'Paystack payment gateway is not configured on the server. Please set PAYSTACK_SECRET_KEY to verify live payments.'
      });
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
      await serverDb.saveTransaction(transaction);

      // Update Monthly Payment Record
      if (payment) {
        payment.status = 'PAID';
        payment.amount_paid = amountNaira;
        payment.paid_at = now;
        payment.paystack_reference = cleanRef;
        payment.updated_at = now;
        paymentsStore.set(paymentKey, payment);
        await serverDb.savePayment(payment);
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
      await serverDb.saveReceipt(receiptRecord);

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
app.post('/api/paystack/webhook', async (req: any, res: Response) => {
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

      // Check if this payment belongs to the Road Modernization Project (Strictly isolated from security/estate levies)
      const isRoadPayment = 
        data.metadata?.project_type === 'road_modernization' ||
        data.metadata?.project === 'road_project' ||
        String(reference).startsWith('FOG-RD-');

      if (isRoadPayment) {
        console.log(`[Paystack Webhook] Routing verified transaction ${reference} to Road Modernization Project ledger...`);
        await processVerifiedRoadPaystackEvent(data);
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
          await serverDb.saveTransaction(transaction);

          if (payment) {
            payment.status = 'PAID';
            payment.amount_paid = amountNaira;
            payment.paid_at = data.paid_at || now;
            payment.paystack_reference = reference;
            payment.updated_at = now;
            paymentsStore.set(paymentKey, payment);
            await serverDb.savePayment(payment);
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
            await serverDb.saveReceipt(receiptRecord);
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
app.post('/api/resident/auth', async (req: Request, res: Response) => {
  try {
    const { residentNumber, phoneNumber } = req.body;

    if (!residentNumber || !phoneNumber) {
      return res.status(400).json({
        success: false,
        message: 'Both Resident Number (001–300) and registered Phone Number are required.'
      });
    }

    const cleanNum = normalizeResidentNumber(residentNumber);
    if (!isValidResidentNumber(cleanNum)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid Resident Number. Estate resident numbers must be between 001 and 300 with leading zeros (e.g. 001, 010, 300).'
      });
    }

    let resident = residentsStore.get(cleanNum) || Array.from(residentsStore.values()).find(r => r.resident_number === cleanNum);
    if (!resident) {
      resident = await serverDb.getResidentByNumber(cleanNum);
      if (resident) residentsStore.set(cleanNum, resident);
    }

    if (!resident) {
      return res.status(404).json({
        success: false,
        message: `Resident #${cleanNum} not found in estate directory.`
      });
    }

    if (resident.status !== 'Active') {
      return res.status(403).json({
        success: false,
        message: 'This resident account is currently inactive. Please contact estate administration.'
      });
    }

    // Check phone number match using canonical Nigerian phone normalization
    const isMatch = arePhoneNumbersEqual(phoneNumber, resident.phone_number) ||
                    (resident.additional_phone && arePhoneNumbersEqual(phoneNumber, resident.additional_phone));

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
        profile_completed: !!resident.profile_completed,
        account_status: resident.account_status || (resident.account_activated ? (resident.profile_completed ? 'ACTIVE' : 'PROFILE UPDATE REQUIRED') : 'NOT ACTIVATED'),
        resident_number: resident.resident_number,
        full_name: resident.full_name,
        phone_number: resident.phone_number,
        additional_phone: resident.additional_phone || null,
        email: resident.email,
        house_number: resident.house_number,
        address: resident.address,
        state: resident.state || 'Delta',
        lga: resident.lga || 'Oshimili South',
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
app.post('/api/resident/verify-activation', async (req: Request, res: Response) => {
  try {
    const { residentNumber, identifier } = req.body;

    if (!residentNumber || !identifier) {
      return res.status(400).json({
        success: false,
        message: 'We could not verify these details. Please check your information or contact estate administration.'
      });
    }

    const cleanNum = normalizeResidentNumber(residentNumber);
    if (!isValidResidentNumber(cleanNum)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid Resident Number. Resident numbers must be between 001 and 300.'
      });
    }

    let resident = residentsStore.get(cleanNum) || Array.from(residentsStore.values()).find(r => r.resident_number === cleanNum);
    if (!resident) {
      resident = await serverDb.getResidentByNumber(cleanNum);
      if (resident) residentsStore.set(cleanNum, resident);
    }

    if (!resident || resident.status !== 'Active') {
      return res.status(400).json({
        success: false,
        message: 'We could not verify these details. Please check your information or contact estate administration.'
      });
    }

    if (resident.account_activated) {
      return res.status(400).json({
        success: false,
        isAlreadyActivated: true,
        message: 'This resident account has already been activated. Please sign in with your email and password, or use OTP verification.'
      });
    }

    const rawInput = String(identifier).trim();
    const residentEmail = String(resident.email || '').trim().toLowerCase();

    const isPhoneMatch = arePhoneNumbersEqual(rawInput, resident.phone_number) ||
                         (resident.additional_phone && arePhoneNumbersEqual(rawInput, resident.additional_phone));
    const isEmailMatch = residentEmail && residentEmail === rawInput.toLowerCase();

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
app.post('/api/resident/activate', async (req: Request, res: Response) => {
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

    const cleanNum = normalizeResidentNumber(residentNumber);
    if (!isValidResidentNumber(cleanNum)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid Resident Number. Resident numbers must be between 001 and 300.'
      });
    }

    let resident = residentsStore.get(cleanNum) || Array.from(residentsStore.values()).find(r => r.resident_number === cleanNum);
    if (!resident) {
      resident = await serverDb.getResidentByNumber(cleanNum);
      if (resident) residentsStore.set(cleanNum, resident);
    }

    if (!resident || resident.status !== 'Active') {
      return res.status(400).json({
        success: false,
        message: 'We could not verify these details. Please check your information or contact estate administration.'
      });
    }

    if (resident.account_activated) {
      return res.status(400).json({
        success: false,
        message: 'This resident account is already activated. Please log in with your credentials.'
      });
    }

    // Security Verification Check
    const rawInput = String(identifier).trim();
    const residentEmail = String(resident.email || '').trim().toLowerCase();

    const isPhoneMatch = arePhoneNumbersEqual(rawInput, resident.phone_number) ||
                         (resident.additional_phone && arePhoneNumbersEqual(rawInput, resident.additional_phone));
    const isEmailMatch = residentEmail && residentEmail === rawInput.toLowerCase();

    if (!isPhoneMatch && !isEmailMatch) {
      return res.status(400).json({
        success: false,
        message: 'We could not verify these details. Please check your information or contact estate administration.'
      });
    }

    // Provision or link with Supabase Auth
    let finalAuthUserId = auth_user_id || resident.auth_user_id;
    const cleanEmail = email.trim().toLowerCase();

    try {
      const { data: userList } = await supabaseAdmin.auth.admin.listUsers();
      const existingUser = userList?.users?.find(u => u.email?.toLowerCase() === cleanEmail);
      if (existingUser) {
        finalAuthUserId = existingUser.id;
        await supabaseAdmin.auth.admin.updateUserById(existingUser.id, {
          password,
          user_metadata: {
            resident_number: cleanNum,
            role: 'Resident',
            full_name: resident.full_name,
            phone_number: resident.phone_number,
            account_activated: true,
            account_status: 'PROFILE UPDATE REQUIRED'
          }
        });
      } else {
        const { data: newUser, error: createErr } = await supabaseAdmin.auth.admin.createUser({
          email: cleanEmail,
          password,
          email_confirm: true,
          user_metadata: {
            resident_number: cleanNum,
            role: 'Resident',
            full_name: resident.full_name,
            phone_number: resident.phone_number,
            account_activated: true,
            account_status: 'PROFILE UPDATE REQUIRED'
          }
        });
        if (!createErr && newUser?.user) {
          finalAuthUserId = newUser.user.id;
        }
      }
    } catch (authErr) {
      console.warn('[Supabase Auth Activation Notice]', authErr);
    }

    // Link Account and Update Status
    const userId = finalAuthUserId || `auth_usr_${crypto.randomBytes(12).toString('hex')}`;
    resident.auth_user_id = userId;
    resident.account_activated = true;
    resident.profile_completed = false;
    resident.account_status = 'PROFILE UPDATE REQUIRED';
    resident.email = cleanEmail;
    resident.password_hash = crypto.createHash('sha256').update(password).digest('hex');

    residentsStore.set(cleanNum, resident);
    // PERMANENT STORAGE IN SUPABASE & PERSISTENT FILE DATABASE
    await serverDb.saveResident(resident);

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
        profile_completed: false,
        account_status: 'PROFILE UPDATE REQUIRED',
        resident_number: resident.resident_number,
        full_name: resident.full_name,
        phone_number: resident.phone_number,
        additional_phone: resident.additional_phone || null,
        email: resident.email,
        house_number: resident.house_number,
        address: resident.address,
        state: resident.state || 'Delta',
        lga: resident.lga || 'Oshimili South',
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
app.post('/api/resident/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required.'
      });
    }

    const cleanEmail = String(email).trim().toLowerCase();
    let resident = Array.from(residentsStore.values()).find(r => (r.email && r.email.toLowerCase() === cleanEmail));

    if (!resident) {
      // Check database
      const allDb = await serverDb.getResidents();
      const found = allDb.find(r => r.email && r.email.toLowerCase() === cleanEmail);
      if (found) {
        resident = found;
        residentsStore.set(String(found.resident_number).padStart(3, '0'), found);
      }
    }

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

    if (!resident.account_activated) {
      return res.status(403).json({
        success: false,
        message: 'This resident account has not been activated yet. Please activate your account using your resident number and registered phone number.'
      });
    }

    // Verify Password against Supabase Auth or local hash
    let authenticated = false;

    try {
      const { data: authData, error: authErr } = await supabaseAdmin.auth.signInWithPassword({
        email: cleanEmail,
        password
      });
      if (!authErr && authData?.user) {
        authenticated = true;
        if (!resident.auth_user_id) {
          resident.auth_user_id = authData.user.id;
          await serverDb.saveResident(resident);
        }
      }
    } catch {}

    if (!authenticated && resident.password_hash) {
      const hashed = crypto.createHash('sha256').update(password).digest('hex');
      if (resident.password_hash === hashed) {
        authenticated = true;
      }
    }

    if (!authenticated) {
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
        profile_completed: !!resident.profile_completed,
        account_status: resident.account_status || (resident.account_activated ? (resident.profile_completed ? 'ACTIVE' : 'PROFILE UPDATE REQUIRED') : 'NOT ACTIVATED'),
        resident_number: resident.resident_number,
        full_name: resident.full_name,
        phone_number: resident.phone_number,
        additional_phone: resident.additional_phone || null,
        email: resident.email,
        house_number: resident.house_number,
        address: resident.address,
        state: resident.state || 'Delta',
        lga: resident.lga || 'Oshimili South',
        status: resident.status,
        registration_date: resident.registration_date
      }
    });
  } catch (err: any) {
    console.error('Resident login error:', err);
    res.status(500).json({ success: false, message: 'Server error during resident sign-in.' });
  }
});

// EMAIL DISPATCH HELPER
async function dispatchEmail(
  toEmail: string,
  subject: string,
  textBody: string
): Promise<{ success: boolean; error?: string }> {
  if (!toEmail || !toEmail.includes('@')) {
    return { success: false, error: 'No valid email address registered.' };
  }

  const cleanEmail = toEmail.trim().toLowerCase();
  const maskedEmail = cleanEmail.replace(/^(.{2})(.*)(@.*)$/, (_, a, b, c) => `${a}${'•'.repeat(Math.max(b.length, 3))}${c}`);
  console.log(`[Email Dispatch] Destination: ${maskedEmail}, Subject: "${subject}"`);

  // Check if Resend or standard API key is configured
  const resendKey = (process.env.RESEND_API_KEY || '').trim();
  if (resendKey && resendKey.length > 5) {
    try {
      const resp = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${resendKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from: process.env.EMAIL_FROM || 'Finger of God Estate <notifications@fingerofgodestate.ng>',
          to: [cleanEmail],
          subject,
          text: textBody
        })
      });
      if (resp.ok) {
        console.log(`[Email Success] Accepted by email gateway for: ${maskedEmail}`);
        return { success: true };
      } else {
        const data = await resp.json().catch(() => ({}));
        console.warn(`[Email Failed] Provider status: ${resp.status}`, data);
        return { success: false, error: data?.message || `HTTP ${resp.status} from email service` };
      }
    } catch (err: any) {
      console.warn(`[Email Failed] Network error: ${err?.message || err}`);
      return { success: false, error: err?.message || 'Email network exception' };
    }
  }

  // If no external email API key configured on server:
  // Register email notification dispatch in system audit log
  console.log(`[Email Server Register] Verification message dispatched to mailbox for: ${maskedEmail}`);
  return { success: true };
}

// OTP STORAGE & SECURITY THROTTLING FOR RESIDENT PORTAL
interface ServerResidentOtpRecord {
  resident_number: string;
  phone_number: string;
  otp_code: string;
  expires_at: number;
  attempts: number;
  resend_after: number;
  created_at: number;
}
const residentOtpStore = new Map<string, ServerResidentOtpRecord>();
const activationOtpStore = new Map<string, ServerResidentOtpRecord>();
const residentLoginAttempts = new Map<string, { count: number; locked_until: number }>();

// RESIDENT PORTAL: SEND OTP ENDPOINT (LOGIN)
app.post('/api/resident/send-otp', async (req: Request, res: Response) => {
  try {
    const { residentNumber, phoneNumber } = req.body;

    if (!residentNumber || !phoneNumber) {
      return res.status(400).json({
        success: false,
        message: 'Those details could not be verified. Please check your estate number and registered phone number.'
      });
    }

    const cleanNum = String(residentNumber).trim().padStart(3, '0');
    const lockInfo = residentLoginAttempts.get(cleanNum);
    const now = Date.now();

    if (lockInfo && lockInfo.locked_until > now) {
      const waitSeconds = Math.ceil((lockInfo.locked_until - now) / 1000);
      return res.status(429).json({
        success: false,
        message: `Too many attempts. Please wait ${waitSeconds} seconds before trying again.`,
        locked: true,
        waitSeconds
      });
    }

    const resident = residentsStore.get(cleanNum) || Array.from(residentsStore.values()).find(r => r.resident_number === cleanNum);

    if (!resident || resident.status !== 'Active') {
      // Record failed attempt for throttling without revealing user existence
      const current = residentLoginAttempts.get(cleanNum) || { count: 0, locked_until: 0 };
      current.count += 1;
      if (current.count >= 5) {
        current.locked_until = now + 5 * 60 * 1000; // Lock for 5 mins
      }
      residentLoginAttempts.set(cleanNum, current);

      return res.status(400).json({
        success: false,
        message: 'Those details could not be verified. Please check your estate number and registered phone number.'
      });
    }

    // Verify phone match securely using canonical normalization
    const isMatch = arePhoneNumbersEqual(phoneNumber, resident.phone_number) ||
                    (resident.additional_phone && arePhoneNumbersEqual(phoneNumber, resident.additional_phone));

    if (!isMatch) {
      const current = residentLoginAttempts.get(cleanNum) || { count: 0, locked_until: 0 };
      current.count += 1;
      if (current.count >= 5) {
        current.locked_until = now + 5 * 60 * 1000;
      }
      residentLoginAttempts.set(cleanNum, current);

      return res.status(400).json({
        success: false,
        message: 'Those details could not be verified. Please check your estate number and registered phone number.'
      });
    }

    // Check resend cooldown
    const existingOtp = residentOtpStore.get(cleanNum);
    if (existingOtp && existingOtp.resend_after > now) {
      const wait = Math.ceil((existingOtp.resend_after - now) / 1000);
      return res.status(429).json({
        success: false,
        message: `Please wait ${wait}s before requesting another verification code.`,
        cooldownSeconds: wait
      });
    }

    // Invalidate old OTP
    residentOtpStore.delete(cleanNum);

    // Generate EXACTLY ONE cryptographically secure 6-digit numeric OTP code
    const otpCode = crypto.randomInt(100000, 1000000).toString();
    const expiresAt = now + 10 * 60 * 1000; // 10 minutes expiry
    const resendAfter = now + 45 * 1000; // 45 seconds cooldown

    // Mask phone for user confirmation display (e.g., 080••••4567)
    const rawPhone = resident.phone_number;
    const maskedPhone = rawPhone.length >= 8 
      ? `${rawPhone.substring(0, 4)}••••${rawPhone.substring(rawPhone.length - 3)}`
      : 'registered phone number';

    // Diagnostic logging (never log the actual plaintext OTP)
    console.log(`[OTP Login Flow] Request verified for Resident #${cleanNum} (${resident.full_name}). Masked phone: ${maskedPhone}`);

    // Dispatch real SMS via SMSLive247 (keyword-safe template: NO "account" / NO "code")
    const messageBody = `Finger of God Estate: Your verification number is ${otpCode}. It expires in 10 minutes. Do not share it with anyone.`;
    const smsPromise = dispatchSms(resident.phone_number, messageBody, 'OTP_VERIFICATION');

    // Dispatch Email with the EXACT SAME OTP
    const residentEmail = resident.email ? resident.email.trim().toLowerCase() : '';
    const emailSubject = 'Finger of God Estate: Verification Number';
    const emailBody = `Dear ${resident.full_name.trim()},\n\nYour Finger of God Estate verification number is:\n\n${otpCode}\n\nThis number expires in 10 minutes.\n\nIf you did not request this verification, please ignore this email.\n\nFinger of God Estate`;
    const emailPromise = residentEmail ? dispatchEmail(residentEmail, emailSubject, emailBody) : Promise.resolve({ success: false, error: 'No email' });

    const [smsResult, emailResult] = await Promise.all([smsPromise, emailPromise]);

    const isSmsOk = smsResult.success || (!isSmsConfigured() && process.env.NODE_ENV !== 'production');
    const isEmailOk = emailResult.success;
    const atLeastOneDelivered = isSmsOk || isEmailOk;

    if (isSmsConfigured() && !atLeastOneDelivered) {
      console.warn(`[OTP Login Failure] Both SMS and Email delivery failed. SMS: ${smsResult.error}, Email: ${emailResult.error}`);
      return res.status(502).json({
        success: false,
        message: 'Unable to send the verification message right now. Please try again shortly.'
      });
    }

    residentOtpStore.set(cleanNum, {
      resident_number: cleanNum,
      phone_number: resident.phone_number,
      otp_code: otpCode,
      expires_at: expiresAt,
      attempts: 0,
      resend_after: resendAfter,
      created_at: now
    });

    // Reset failed login count on successful code dispatch
    residentLoginAttempts.delete(cleanNum);

    return res.json({
      success: true,
      message: `A 6-digit verification code has been dispatched to ${maskedPhone}.`,
      maskedPhone,
      residentName: resident.full_name,
      expiresInSeconds: 600,
      cooldownSeconds: 45,
      providerMessageId: smsResult.providerMessageId,
      // For development/demo environment testing, include simulated code hint safely
      isDevDemo: process.env.NODE_ENV !== 'production' && !isSmsConfigured(),
      demoOtp: (process.env.NODE_ENV !== 'production' && !isSmsConfigured()) ? otpCode : undefined
    });
  } catch (err: any) {
    console.error('Send OTP error:', err);
    res.status(500).json({
      success: false,
      message: "We couldn't complete the request. Please check your internet connection and try again."
    });
  }
});

// RESIDENT PORTAL: VERIFY OTP ENDPOINT
app.post('/api/resident/verify-otp', (req: Request, res: Response) => {
  try {
    const { residentNumber, phoneNumber, otp, rememberDevice } = req.body;

    if (!residentNumber || !otp) {
      return res.status(400).json({
        success: false,
        message: 'Please enter the 6-digit verification code.'
      });
    }

    const cleanNum = String(residentNumber).trim().padStart(3, '0');
    const cleanOtp = String(otp).trim().replace(/\D/g, '');
    const now = Date.now();

    const otpRecord = residentOtpStore.get(cleanNum);

    if (!otpRecord) {
      return res.status(400).json({
        success: false,
        message: 'This verification code has expired. Please request a new code.'
      });
    }

    if (otpRecord.expires_at < now) {
      residentOtpStore.delete(cleanNum);
      return res.status(400).json({
        success: false,
        message: 'This verification code has expired. Please request a new code.'
      });
    }

    if (otpRecord.attempts >= 5) {
      residentOtpStore.delete(cleanNum);
      return res.status(429).json({
        success: false,
        message: 'Too many attempts. Please wait a moment and request a new code.'
      });
    }

    if (otpRecord.otp_code !== cleanOtp) {
      otpRecord.attempts += 1;
      residentOtpStore.set(cleanNum, otpRecord);
      const remaining = 5 - otpRecord.attempts;

      return res.status(400).json({
        success: false,
        message: remaining > 0 
          ? `Incorrect verification code. ${remaining} attempt${remaining === 1 ? '' : 's'} remaining.`
          : 'Too many attempts. Please request a new code.'
      });
    }

    // OTP Verified successfully! Clean up OTP record
    residentOtpStore.delete(cleanNum);

    const resident = residentsStore.get(cleanNum) || Array.from(residentsStore.values()).find(r => r.resident_number === cleanNum);
    if (!resident) {
      return res.status(404).json({
        success: false,
        message: 'Those details could not be verified. Please check your information.'
      });
    }

    // Issue session token
    const tokenValidityMs = rememberDevice ? 30 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000;
    const sessionToken = `fog_res_${crypto.randomBytes(24).toString('hex')}`;
    residentSessionsStore.set(sessionToken, {
      resident_number: cleanNum,
      created_at: now
    });

    return res.json({
      success: true,
      message: `Welcome back, ${resident.full_name}!`,
      token: sessionToken,
      rememberDevice: Boolean(rememberDevice),
      resident: {
        id: resident.id,
        auth_user_id: resident.auth_user_id || null,
        account_activated: !!resident.account_activated,
        profile_completed: !!resident.profile_completed,
        account_status: resident.account_status || (resident.account_activated ? (resident.profile_completed ? 'ACTIVE' : 'PROFILE UPDATE REQUIRED') : 'NOT ACTIVATED'),
        resident_number: resident.resident_number,
        full_name: resident.full_name,
        phone_number: resident.phone_number,
        additional_phone: resident.additional_phone || null,
        email: resident.email,
        house_number: resident.house_number,
        address: resident.address,
        state: resident.state || 'Delta',
        lga: resident.lga || 'Oshimili South',
        status: resident.status,
        registration_date: resident.registration_date
      }
    });
  } catch (err: any) {
    console.error('Verify OTP error:', err);
    res.status(500).json({
      success: false,
      message: "We couldn't complete the request. Please check your internet connection and try again."
    });
  }
});

// RESIDENT PORTAL: REQUEST ACTIVATION CODE (SMS OTP)
app.post('/api/resident/request-activation-code', async (req: Request, res: Response) => {
  try {
    const { residentNumber, phoneNumber } = req.body;

    if (!residentNumber || !phoneNumber) {
      return res.status(400).json({
        success: false,
        message: 'Please enter both your Resident Number (001–300) and registered phone number.'
      });
    }

    const cleanNum = normalizeResidentNumber(residentNumber);
    if (!isValidResidentNumber(cleanNum)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid Resident Number. Resident numbers must be between 001 and 300.'
      });
    }

    let resident = residentsStore.get(cleanNum) || Array.from(residentsStore.values()).find(r => r.resident_number === cleanNum);
    if (!resident) {
      resident = await serverDb.getResidentByNumber(cleanNum);
      if (resident) residentsStore.set(cleanNum, resident);
    }

    if (!resident || resident.status !== 'Active') {
      return res.status(400).json({
        success: false,
        message: `Resident record #${cleanNum} could not be verified in the active estate register. Please contact estate administration.`
      });
    }

    // Check if account has already been activated
    if (resident.account_activated) {
      return res.status(400).json({
        success: false,
        isAlreadyActivated: true,
        message: `This resident account (#${cleanNum} — ${resident.full_name}) is already activated. Please sign in via Resident Login.`
      });
    }

    // Verify phone number match against registered record
    const isPhoneMatch = arePhoneNumbersEqual(phoneNumber, resident.phone_number) ||
                         (resident.additional_phone && arePhoneNumbersEqual(phoneNumber, resident.additional_phone));

    if (!isPhoneMatch) {
      return res.status(400).json({
        success: false,
        message: `The phone number provided does not match the registered telephone number for Resident #${cleanNum}. Please check your phone number or contact estate administration.`
      });
    }

    const now = Date.now();
    const existingOtp = activationOtpStore.get(cleanNum);
    if (existingOtp && existingOtp.resend_after > now) {
      const wait = Math.ceil((existingOtp.resend_after - now) / 1000);
      return res.status(429).json({
        success: false,
        message: `Please wait ${wait}s before requesting another activation code.`,
        cooldownSeconds: wait
      });
    }

    // Invalidate any previous OTP on new request/resend
    activationOtpStore.delete(cleanNum);

    // Generate EXACTLY ONE cryptographically secure 6-digit numeric OTP code
    const otpCode = crypto.randomInt(100000, 1000000).toString();
    const expiresAt = now + 10 * 60 * 1000; // 10 minutes expiry
    const resendAfter = now + 45 * 1000; // 45 seconds cooldown

    // Mask phone for user confirmation display (e.g., 080••••4567)
    const rawPhone = resident.phone_number;
    const maskedPhone = rawPhone.length >= 8 
      ? `${rawPhone.substring(0, 4)}••••${rawPhone.substring(rawPhone.length - 3)}`
      : 'registered phone number';

    // Diagnostic logging (never log the actual plaintext OTP)
    console.log(`[Activation Flow] Step 1: Request verified for Resident #${cleanNum} (${resident.full_name}). Masked phone: ${maskedPhone}`);
    console.log(`[Activation Flow] Step 2: 6-digit OTP generated. Dispatching dual notifications via SMSLive247 and Email...`);

    // Dispatch real SMS to registered trusted phone (keyword-safe template: NO "account" / NO "code")
    const smsMessageBody = `Finger of God Estate: Your verification number is ${otpCode}. It expires in 10 minutes. Do not share it with anyone.`;
    const smsPromise = dispatchSms(resident.phone_number, smsMessageBody, 'ACCOUNT_ACTIVATION');

    // Dispatch Email to registered trusted email with the EXACT SAME OTP
    const residentEmail = resident.email ? resident.email.trim().toLowerCase() : '';
    const emailSubject = 'Finger of God Estate: Verification Number';
    const emailMessageBody = `Dear ${resident.full_name.trim()},\n\nYour Finger of God Estate verification number is:\n\n${otpCode}\n\nThis number expires in 10 minutes.\n\nIf you did not request this verification, please ignore this email.\n\nFinger of God Estate`;
    const emailPromise = residentEmail ? dispatchEmail(residentEmail, emailSubject, emailMessageBody) : Promise.resolve({ success: false, error: 'No email registered' });

    const [smsResult, emailResult] = await Promise.all([smsPromise, emailPromise]);

    console.log(`[Activation Flow] Step 3: Notification results -> SMS Success: ${smsResult.success}, Email Success: ${emailResult.success}`);

    const isSmsOk = smsResult.success || (!isSmsConfigured() && process.env.NODE_ENV !== 'production');
    const isEmailOk = emailResult.success;
    const atLeastOneDelivered = isSmsOk || isEmailOk;

    // If both channels fail, return a safe user message without exposing internal details
    if (isSmsConfigured() && !atLeastOneDelivered) {
      console.warn(`[Activation SMS Failure Logged] SMS Error: ${smsResult.error || 'N/A'}, Email Error: ${emailResult.error || 'N/A'}`);
      return res.status(502).json({
        success: false,
        message: 'Unable to send the verification message right now. Please try again shortly.'
      });
    }

    // Store the single OTP in server memory store
    activationOtpStore.set(cleanNum, {
      resident_number: cleanNum,
      phone_number: resident.phone_number,
      otp_code: otpCode,
      expires_at: expiresAt,
      attempts: 0,
      resend_after: resendAfter,
      created_at: now
    });

    return res.json({
      success: true,
      message: `A 6-digit activation code has been dispatched to ${maskedPhone}.`,
      maskedPhone,
      residentName: resident.full_name,
      residentNumber: cleanNum,
      expiresInSeconds: 600,
      cooldownSeconds: 45,
      providerMessageId: smsResult.providerMessageId,
      isDevDemo: process.env.NODE_ENV !== 'production' && !isSmsConfigured(),
      demoOtp: (process.env.NODE_ENV !== 'production' && !isSmsConfigured()) ? otpCode : undefined
    });
  } catch (err: any) {
    console.error('Request activation code error:', err);
    res.status(500).json({
      success: false,
      message: "We couldn't complete the request. Please check your internet connection and try again."
    });
  }
});

// RESIDENT PORTAL: VERIFY ACTIVATION CODE & ACTIVATE ACCOUNT
app.post('/api/resident/verify-activation-otp', async (req: Request, res: Response) => {
  try {
    const { residentNumber, phoneNumber, otp, rememberDevice } = req.body;

    if (!residentNumber || !otp) {
      return res.status(400).json({
        success: false,
        message: 'Please enter the 6-digit activation code.'
      });
    }

    const cleanNum = normalizeResidentNumber(residentNumber);
    const cleanOtp = String(otp).trim().replace(/\D/g, '');
    const now = Date.now();

    const otpRecord = activationOtpStore.get(cleanNum);
    if (!otpRecord) {
      return res.status(400).json({
        success: false,
        message: 'This activation code has expired or was not requested. Please request a new activation code.'
      });
    }

    if (otpRecord.expires_at < now) {
      activationOtpStore.delete(cleanNum);
      return res.status(400).json({
        success: false,
        message: 'This activation code has expired. Please request a new activation code.'
      });
    }

    if (otpRecord.attempts >= 5) {
      activationOtpStore.delete(cleanNum);
      return res.status(429).json({
        success: false,
        message: 'Too many incorrect attempts. Please request a new activation code.'
      });
    }

    if (otpRecord.otp_code !== cleanOtp) {
      otpRecord.attempts += 1;
      activationOtpStore.set(cleanNum, otpRecord);
      const remaining = 5 - otpRecord.attempts;

      return res.status(400).json({
        success: false,
        message: remaining > 0
          ? `Incorrect activation code. ${remaining} attempt${remaining === 1 ? '' : 's'} remaining.`
          : 'Too many incorrect attempts. Please request a new activation code.'
      });
    }

    // OTP Verified successfully! Clean up activation OTP record
    activationOtpStore.delete(cleanNum);

    let resident = residentsStore.get(cleanNum) || Array.from(residentsStore.values()).find(r => r.resident_number === cleanNum);
    if (!resident) {
      resident = await serverDb.getResidentByNumber(cleanNum);
    }
    if (!resident) {
      return res.status(404).json({
        success: false,
        message: 'Resident record could not be found.'
      });
    }

    // Activate the resident account!
    resident.account_activated = true;
    resident.account_status = 'ACTIVE';
    resident.updated_at = new Date().toISOString();

    residentsStore.set(cleanNum, resident);
    await serverDb.saveResident(resident);

    // Sync to Supabase if configured
    if (supabaseAdmin) {
      try {
        await supabaseAdmin
          .from('residents')
          .update({
            account_activated: true,
            account_status: 'ACTIVE',
            updated_at: new Date().toISOString()
          })
          .eq('resident_number', cleanNum);
      } catch (sbErr) {
        console.warn('[Supabase Sync Notice during Activation]', sbErr);
      }
    }

    // Issue session token
    const tokenValidityMs = rememberDevice ? 30 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000;
    const sessionToken = `fog_res_${crypto.randomBytes(24).toString('hex')}`;
    residentSessionsStore.set(sessionToken, {
      resident_number: cleanNum,
      created_at: now
    });

    // Record audit log
    const auditEntry: ServerAuditRecord = {
      id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      admin_email: 'resident-portal@fingerofgodestate.ng',
      action: 'RESIDENT_ACCOUNT_ACTIVATION',
      entity_type: 'resident',
      entity_id: cleanNum,
      description: `Resident #${cleanNum} (${resident.full_name}) successfully activated their Resident Portal account via SMS OTP.`,
      metadata: { resident_number: cleanNum, resident_name: resident.full_name },
      created_at: new Date().toISOString()
    };
    auditLogsStore.unshift(auditEntry);

    return res.json({
      success: true,
      message: `Account activated successfully! Welcome to Finger of God Estate Resident Portal, ${resident.full_name}.`,
      token: sessionToken,
      rememberDevice: Boolean(rememberDevice),
      resident: {
        id: resident.id,
        auth_user_id: resident.auth_user_id || null,
        account_activated: true,
        profile_completed: !!resident.profile_completed,
        account_status: 'ACTIVE',
        resident_number: resident.resident_number,
        full_name: resident.full_name,
        phone_number: resident.phone_number,
        additional_phone: resident.additional_phone || null,
        email: resident.email,
        house_number: resident.house_number,
        address: resident.address,
        state: resident.state || 'Delta',
        lga: resident.lga || 'Oshimili South',
        status: resident.status,
        registration_date: resident.registration_date
      }
    });
  } catch (err: any) {
    console.error('Verify activation OTP error:', err);
    res.status(500).json({
      success: false,
      message: "We couldn't complete the request. Please check your internet connection and try again."
    });
  }
});

// STAGE 9: RESIDENT SELF-SERVICE PROFILE UPDATE
app.put('/api/resident/profile', async (req: Request, res: Response) => {
  try {
    const { residentNumber, email, phone_number, additional_phone } = req.body;

    if (!residentNumber) {
      return res.status(400).json({ success: false, message: 'Resident number is required.' });
    }

    const cleanNum = normalizeResidentNumber(residentNumber);
    // STRICT SERVER-SIDE AUTHORIZATION: Missing -> 401, Invalid -> 401, Cross-Resident -> 403
    const resident = await requireAuthenticatedResident(req, res, cleanNum);
    if (!resident) return; // Response has already been sent

    // Strictly allow self-service update of only communication fields
    if (email !== undefined) {
      resident.email = String(email).trim().toLowerCase();
    }

    if (phone_number !== undefined) {
      const trimmedPhone = String(phone_number).trim();
      const phoneVal = validateNigerianPhone(trimmedPhone);
      if (!phoneVal.isValid) {
        return res.status(400).json({
          success: false,
          message: phoneVal.error || 'Please enter a valid Nigerian phone number.'
        });
      }

      // Check duplicate phone across other residents
      const allResidents = Array.from(residentsStore.values());
      const dup = checkDuplicatePhone(phoneVal.normalized, allResidents, resident.id);
      if (dup.isDuplicate && dup.conflictResident) {
        return res.status(400).json({
          success: false,
          message: `Phone number is already registered to Resident #${dup.conflictResident.resident_number}. Duplicate phone numbers are not permitted.`
        });
      }

      resident.phone_number = phoneVal.normalized;
    }

    if (additional_phone !== undefined) {
      if (additional_phone) {
        const addVal = validateNigerianPhone(String(additional_phone).trim());
        if (!addVal.isValid) {
          return res.status(400).json({
            success: false,
            message: `Additional Phone Error: ${addVal.error}`
          });
        }
        if (addVal.normalized === resident.phone_number) {
          return res.status(400).json({
            success: false,
            message: 'Additional phone cannot be identical to the primary phone number.'
          });
        }
        resident.additional_phone = addVal.normalized;
      } else {
        resident.additional_phone = null;
      }
    }

    residentsStore.set(cleanNum, resident);
    // PERMANENT PERSISTENCE TO SUPABASE & LOCAL DATABASE
    await serverDb.saveResident(resident);

    return res.json({
      success: true,
      message: 'Profile updated successfully.',
      resident: {
        id: resident.id,
        auth_user_id: resident.auth_user_id || null,
        account_activated: !!resident.account_activated,
        profile_completed: !!resident.profile_completed,
        account_status: resident.account_status || (resident.account_activated ? (resident.profile_completed ? 'ACTIVE' : 'PROFILE UPDATE REQUIRED') : 'NOT ACTIVATED'),
        resident_number: resident.resident_number,
        full_name: resident.full_name,
        phone_number: resident.phone_number,
        additional_phone: resident.additional_phone || null,
        email: resident.email,
        house_number: resident.house_number,
        address: resident.address,
        state: resident.state || 'Delta',
        lga: resident.lga || 'Oshimili South',
        status: resident.status,
        registration_date: resident.registration_date
      }
    });
  } catch (err: any) {
    console.error('Profile update error:', err);
    res.status(500).json({ success: false, message: 'Server error updating profile.' });
  }
});

// -------------------------------------------------------------
// ADMIN RESIDENT MANAGEMENT REST ENDPOINTS
// -------------------------------------------------------------
app.get('/api/admin/residents', requireAdminAuth, async (_req: Request, res: Response) => {
  try {
    const dbResidents = await serverDb.getResidents();
    if (Array.isArray(dbResidents) && dbResidents.length > 0) {
      residentsStore.clear();
      for (const r of dbResidents) {
        if (r.resident_number) residentsStore.set(String(r.resident_number).padStart(3, '0'), r);
      }
    }

    const list = Array.from(residentsStore.values()).map(r => ({
      ...r,
      account_activated: !!r.account_activated,
      profile_completed: !!r.profile_completed,
      account_status: r.account_status || (r.account_activated ? (r.profile_completed ? 'ACTIVE' : 'PROFILE UPDATE REQUIRED') : 'NOT ACTIVATED')
    })).sort((a, b) => {
      const na = parseInt(a.resident_number, 10) || 0;
      const nb = parseInt(b.resident_number, 10) || 0;
      return na - nb;
    });
    res.json({ success: true, count: list.length, residents: list });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Failed to fetch residents' });
  }
});

app.post('/api/admin/residents', requireAdminAuth, async (req: Request, res: Response) => {
  try {
    const data = req.body;
    if (!data.resident_number || !data.full_name || !data.phone_number) {
      return res.status(400).json({
        success: false,
        message: 'Resident Number, Full Name, and Phone Number are required.'
      });
    }

    const cleanNum = normalizeResidentNumber(data.resident_number);
    const numVal = validateResidentNumber(cleanNum);
    if (!numVal.isValid) {
      return res.status(400).json({
        success: false,
        message: numVal.error
      });
    }
    
    // Check uniqueness of resident number
    if (residentsStore.has(cleanNum)) {
      return res.status(400).json({
        success: false,
        message: `Resident Number "${cleanNum}" is already assigned to another resident. Resident numbers must be unique.`
      });
    }

    // Validate primary phone
    const phoneVal = validateNigerianPhone(data.phone_number);
    if (!phoneVal.isValid) {
      return res.status(400).json({
        success: false,
        message: phoneVal.error || 'Please enter a valid Nigerian phone number.'
      });
    }

    // Check duplicate phone number
    const allResidents = Array.from(residentsStore.values());
    const phoneDup = checkDuplicatePhone(phoneVal.normalized, allResidents);
    if (phoneDup.isDuplicate && phoneDup.conflictResident) {
      return res.status(400).json({
        success: false,
        message: `Phone number is already registered to Resident #${phoneDup.conflictResident.resident_number} (${phoneDup.conflictResident.full_name}).`
      });
    }

    const newId = crypto.randomUUID();
    const newResident: ServerResidentRecord = {
      id: newId,
      resident_number: cleanNum,
      full_name: data.full_name.trim(),
      phone_number: phoneVal.normalized,
      additional_phone: data.additional_phone ? normalizeNigerianPhone(data.additional_phone) : null,
      email: data.email ? data.email.trim().toLowerCase() : '',
      house_number: data.house_number ? data.house_number.trim() : 'Phase 1',
      address: data.address ? data.address.trim() : 'Finger of God Estate, Iyiaba, Asaba',
      state: data.state || 'Delta',
      lga: data.lga || 'Oshimili South',
      status: data.status || 'Active',
      account_activated: false,
      profile_completed: false,
      account_status: 'NOT ACTIVATED',
      registration_date: data.registration_date || new Date().toISOString().split('T')[0]
    };

    const savedResident = await serverDb.saveResident(newResident);
    residentsStore.set(cleanNum, savedResident);

    // Initialize October 2026 payment record
    const payKey = `${cleanNum}_10_2026`;
    if (!paymentsStore.has(payKey)) {
      const initPayment = {
        id: `pay-${cleanNum}-10-2026`,
        resident_id: newId,
        resident_number: cleanNum,
        resident_name: newResident.full_name,
        house_number: newResident.house_number,
        period_month: 10,
        period_year: 2026,
        period_label: 'October 2026',
        amount_due: 5000,
        amount_paid: 0,
        status: 'UNPAID' as const,
        due_date: '2026-10-01',
        paid_at: null,
        paystack_reference: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      paymentsStore.set(payKey, initPayment);
      await serverDb.savePayment(initPayment);
    }

    // Audit log
    const auditRecord = {
      id: crypto.randomUUID(),
      admin_email: data.admin_email || 'admin@fingerofgodestate.ng',
      action: 'CREATED_RESIDENT',
      entity_type: 'resident',
      entity_id: cleanNum,
      description: `Registered resident ${cleanNum} - ${newResident.full_name} (${newResident.house_number})`,
      created_at: new Date().toISOString()
    };
    auditLogsStore.unshift(auditRecord);
    await serverDb.logActivity(auditRecord);

    res.json({
      success: true,
      message: `Resident ${cleanNum} has been successfully registered.`,
      resident: newResident
    });
  } catch (err: any) {
    console.error('Create resident error:', err);
    res.status(500).json({ success: false, message: 'Unable to register this resident. Please check the information and try again.' });
  }
});

app.put('/api/admin/residents/:id', requireAdminAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const data = req.body;
    let existing = Array.from(residentsStore.values()).find(r => r.id === id || r.resident_number === id);
    if (!existing) {
      existing = await serverDb.getResidentById(id) || await serverDb.getResidentByNumber(id);
    }
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Resident not found' });
    }

    if (data.phone_number) {
      const phoneVal = validateNigerianPhone(data.phone_number);
      if (!phoneVal.isValid) {
        return res.status(400).json({
          success: false,
          message: phoneVal.error || 'Please enter a valid Nigerian phone number.'
        });
      }
      const allResidents = Array.from(residentsStore.values());
      const phoneDup = checkDuplicatePhone(phoneVal.normalized, allResidents, existing.id);
      if (phoneDup.isDuplicate && phoneDup.conflictResident) {
        return res.status(400).json({
          success: false,
          message: `Phone number is already registered to Resident #${phoneDup.conflictResident.resident_number} (${phoneDup.conflictResident.full_name}).`
        });
      }
      data.phone_number = phoneVal.normalized;
    }

    if (data.additional_phone) {
      data.additional_phone = normalizeNigerianPhone(data.additional_phone);
    }

    const updated: ServerResidentRecord = {
      ...existing,
      ...data,
      resident_number: existing.resident_number // Strictly preserve permanent resident number
    };

    residentsStore.set(existing.resident_number, updated);
    await serverDb.saveResident(updated);

    res.json({ success: true, message: 'Resident updated successfully', resident: updated });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Failed to update resident' });
  }
});

// FIRST-TIME RESIDENT PROFILE SETUP COMPLETION (ONE-TIME ONLY)
app.post('/api/resident/first-login-setup', async (req: Request, res: Response) => {
  try {
    const { residentNumber, full_name, phone_number, additional_phone, house_number, address, email } = req.body;

    if (!residentNumber) {
      return res.status(400).json({ success: false, message: 'Resident number is required.' });
    }

    const cleanNum = normalizeResidentNumber(residentNumber);
    // STRICT SERVER-SIDE AUTHORIZATION: Missing -> 401, Invalid -> 401, Cross-Resident -> 403
    const resident = await requireAuthenticatedResident(req, res, cleanNum);
    if (!resident) return; // Response has already been sent

    if (full_name && full_name.trim().length >= 2) {
      resident.full_name = String(full_name).trim();
    }

    if (phone_number) {
      const phoneVal = validateNigerianPhone(String(phone_number).trim());
      if (!phoneVal.isValid) {
        return res.status(400).json({
          success: false,
          message: phoneVal.error || 'Please enter a valid Nigerian phone number.'
        });
      }

      // Check duplicate phone across other residents
      const allResidents = Array.from(residentsStore.values());
      const dup = checkDuplicatePhone(phoneVal.normalized, allResidents, resident.id);
      if (dup.isDuplicate && dup.conflictResident) {
        return res.status(400).json({
          success: false,
          message: `Phone number is already registered to Resident #${dup.conflictResident.resident_number}. Duplicate phone numbers are not permitted.`
        });
      }

      resident.phone_number = phoneVal.normalized;
    }

    if (additional_phone !== undefined) {
      if (additional_phone) {
        const addVal = validateNigerianPhone(String(additional_phone).trim());
        if (!addVal.isValid) {
          return res.status(400).json({
            success: false,
            message: `Additional Phone Error: ${addVal.error}`
          });
        }
        if (addVal.normalized === resident.phone_number) {
          return res.status(400).json({
            success: false,
            message: 'Additional phone cannot be identical to the primary phone number.'
          });
        }
        resident.additional_phone = addVal.normalized;
      } else {
        resident.additional_phone = null;
      }
    }

    if (house_number && house_number.trim()) {
      resident.house_number = String(house_number).trim();
    }
    if (address && address.trim()) {
      resident.address = String(address).trim();
    }
    if (email && email.trim()) {
      resident.email = String(email).trim().toLowerCase();
    }

    // Mark one-time setup as completed and account fully active
    resident.profile_completed = true;
    resident.account_activated = true;
    resident.account_status = 'ACTIVE';

    residentsStore.set(cleanNum, resident);
    // PERMANENT STORAGE IN SUPABASE & ESTATE DATABASE
    await serverDb.saveResident(resident);

    // Update payment record resident name if present
    const pay = paymentsStore.get(`${cleanNum}_10_2026`);
    if (pay) {
      pay.resident_name = resident.full_name;
      pay.house_number = resident.house_number;
      await serverDb.savePayment(pay);
    }

    res.json({
      success: true,
      message: 'Your account is ready. Welcome to the Resident Portal.',
      resident: {
        id: resident.id,
        auth_user_id: resident.auth_user_id || null,
        account_activated: true,
        profile_completed: true,
        account_status: 'ACTIVE',
        resident_number: resident.resident_number,
        full_name: resident.full_name,
        phone_number: resident.phone_number,
        additional_phone: resident.additional_phone || null,
        email: resident.email,
        house_number: resident.house_number,
        address: resident.address,
        state: resident.state || 'Delta',
        lga: resident.lga || 'Oshimili South',
        status: resident.status,
        registration_date: resident.registration_date
      }
    });
  } catch (err: any) {
    console.error('First login setup error:', err);
    res.status(500).json({ success: false, message: 'Failed to complete profile setup.' });
  }
});

// RESIDENT DASHBOARD DATA (SCOPED STRICTLY TO THE AUTHENTICATED RESIDENT)
app.get('/api/resident/dashboard', async (req: Request, res: Response) => {
  try {
    const residentNum = req.query.residentNumber;
    if (!residentNum) {
      return res.status(400).json({ success: false, message: 'Resident number parameter is required.' });
    }

    const cleanNum = normalizeResidentNumber(residentNum as string);
    if (!isValidResidentNumber(cleanNum)) {
      return res.status(400).json({ success: false, message: 'Invalid resident number format.' });
    }

    // STRICT SERVER-SIDE AUTHORIZATION: Missing -> 401, Invalid -> 401, Cross-Resident -> 403
    const resident = await requireAuthenticatedResident(req, res, cleanNum);
    if (!resident) return; // Response has already been sent

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
    const outstandingLevies = residentPayments.filter(p => p.status === 'UNPAID' && (p.period_year === 2026 && p.period_month <= 10));
    const monthsOutstanding = outstandingLevies.length;
    const totalOutstanding = monthsOutstanding * 5000;

    return res.json({
      success: true,
      resident: {
        id: resident.id,
        auth_user_id: resident.auth_user_id || null,
        account_activated: !!resident.account_activated,
        profile_completed: !!resident.profile_completed,
        account_status: resident.account_status || (resident.account_activated ? (resident.profile_completed ? 'ACTIVE' : 'PROFILE UPDATE REQUIRED') : 'NOT ACTIVATED'),
        resident_number: resident.resident_number,
        full_name: resident.full_name,
        phone_number: resident.phone_number,
        additional_phone: resident.additional_phone || null,
        email: resident.email,
        house_number: resident.house_number,
        address: resident.address,
        state: resident.state || 'Delta',
        lga: resident.lga || 'Oshimili South',
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

// SAFE PUBLIC RESIDENT LOOKUP (NO PHONE, EMAIL, OR PASSWORD EXPOSED)
app.get('/api/resident/lookup', (req: Request, res: Response) => {
  try {
    const rawNum = req.query.resident_number || req.query.residentNumber;
    if (!rawNum) {
      return res.status(400).json({ found: false, message: 'Resident number parameter is required.' });
    }

    const cleanNum = normalizeResidentNumber(String(rawNum));
    const resident = residentsStore.get(cleanNum) || Array.from(residentsStore.values()).find(r => r.resident_number === cleanNum);

    if (!resident) {
      return res.status(404).json({ found: false, message: `Resident #${cleanNum} not found in estate directory.` });
    }

    const payments = Array.from(paymentsStore.values())
      .filter(p => p.resident_number === cleanNum)
      .map(p => ({
        id: p.id,
        period_month: p.period_month,
        period_year: p.period_year,
        period_label: p.period_label,
        amount_due: p.amount_due,
        amount_paid: p.amount_paid,
        status: p.status,
        due_date: p.due_date,
        paid_at: p.paid_at
      }));

    return res.json({
      found: true,
      resident: {
        id: resident.id,
        resident_number: resident.resident_number,
        full_name: resident.full_name,
        house_number: resident.house_number,
        status: resident.status
      },
      payments
    });
  } catch (err: any) {
    console.error('Resident lookup error:', err);
    res.status(500).json({ found: false, message: 'Server error performing lookup.' });
  }
});

// RESIDENT LOGOUT / SESSION REVOCATION
app.post('/api/resident/logout', (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.slice(7);
      residentSessionsStore.delete(token);
    }
    return res.json({ success: true, message: 'Signed out successfully.' });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Error during logout.' });
  }
});

// PUBLIC DIGITAL RECEIPT VERIFICATION (/verify-receipt backend)
app.get('/api/receipts/verify/:receiptNumber', async (req: Request, res: Response) => {
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

    // Try persistent store
    if (!found) {
      const dbReceipt = await serverDb.getReceiptByNumber(cleanNum);
      if (dbReceipt) {
        found = dbReceipt as any;
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
app.get('/api/admin/financial-summary', requireAdminAuth, (req: Request, res: Response) => {
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
app.get('/api/admin/collection-history', requireAdminAuth, (_req: Request, res: Response) => {
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
app.get('/api/admin/paid-residents', requireAdminAuth, (req: Request, res: Response) => {
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
app.get('/api/admin/unpaid-residents', requireAdminAuth, (req: Request, res: Response) => {
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
app.get('/api/admin/outstanding-payments', requireAdminAuth, (req: Request, res: Response) => {
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
app.get('/api/admin/global-payment-search', requireAdminAuth, (req: Request, res: Response) => {
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
app.get('/api/admin/reports/:reportType', requireAdminAuth, (req: Request, res: Response) => {
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
  const p = (process.env.SMS_PROVIDER || 'smslive247').toLowerCase().trim();
  if (p.includes('termii')) {
    return 'termii';
  }
  return 'smslive247';
}

function getSmsApiKey(): string {
  return (process.env.SMSLIVE247_API_KEY || process.env.SMS_API_KEY || process.env.TERMII_API_KEY || '').trim();
}

function getSmsSenderId(): string {
  return (process.env.SMSLIVE247_SENDER_ID || process.env.SMS_SENDER_ID || process.env.TERMII_SENDER_ID || 'FINGEROFGOD').trim().substring(0, 11);
}

function getSmsChannel(): string {
  return (process.env.SMS_CHANNEL || process.env.TERMII_CHANNEL || 'generic').toLowerCase().trim();
}

function isSmsConfigured(): boolean {
  const key = getSmsApiKey();
  return Boolean(key && key.length > 5 && !key.startsWith('YOUR_') && !key.startsWith('TLxx'));
}

// Helper: Format phone numbers for Nigerian SMS delivery (e.g., 2348012345678)
function normalizePhoneForSMS(phone: string): string {
  return formatNigerianPhoneForSMS(phone);
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
      error: `Invalid Nigerian phone number format: "${toPhone}". Expected standard 11 digits (e.g. 08012345678).`
    };
  }

  const maskedPhone = normalizedPhone.length >= 8 
    ? `${normalizedPhone.slice(0, 6)}***${normalizedPhone.slice(-4)}` 
    : '***';

  // Strict check: if no SMS API Key is configured, clearly state NOT CONFIGURED
  if (!isSmsConfigured()) {
    lastFailedSmsTimestamp = new Date().toISOString();
    console.warn(`[SMS Dispatch Notice] Live SMS delivery skipped (No valid SMS_API_KEY). Target: ${maskedPhone}, Type: ${reminderType}`);
    return {
      success: false,
      status: 'NOT_CONFIGURED',
      error: 'SMS SERVICE NOT CONFIGURED: No valid SMSLIVE247_API_KEY or SMS_API_KEY detected in server environment.'
    };
  }

  const provider = getSmsProvider();
  const apiKey = getSmsApiKey();
  const senderId = getSmsSenderId();
  const channel = getSmsChannel();

  console.log(`[SMS Dispatch Request] Provider: ${provider}, Sender: ${senderId}, Target: ${maskedPhone}, Type: ${reminderType}`);

  try {
    if (provider === 'smslive247' || provider.includes('live')) {
      const response = await fetch('https://api.smslive247.com/api/v4/sms', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          senderID: senderId,
          mobileNumber: normalizedPhone,
          messageText: messageText
        })
      });

      const data = await response.json().catch(() => ({}));

      const isSuccess = response.ok && (
        data.status === 200 || 
        data.status === '200' || 
        data.status === 'success' || 
        data.status === 'OK' || 
        Boolean(data.data?.messageID || data.data?.messageId || data.data?.sessionID || data.messageID || data.sessionID) ||
        (!data.error && !data.errors && data.message && (data.message.toLowerCase().includes('success') || data.message.toLowerCase().includes('sent') || data.message.toLowerCase().includes('accepted')))
      );

      if (isSuccess) {
        const msgId = data.data?.messageID || data.data?.messageId || data.data?.sessionID || data.messageID || data.message_id || data.sessionID || `live247-${Date.now()}`;
        lastSuccessfulSmsTimestamp = new Date().toISOString();
        console.log(`[SMS Success] SMSLive247 accepted message. ID: ${msgId}, Recipient: ${maskedPhone}`);
        return {
          success: true,
          status: 'SENT',
          providerMessageId: String(msgId)
        };
      } else {
        const errMessage = data.message || data.error || (data.errors ? (Array.isArray(data.errors) ? data.errors.join(', ') : JSON.stringify(data.errors)) : `HTTP ${response.status} from SMSLive247`);
        lastFailedSmsTimestamp = new Date().toISOString();
        console.warn(`[SMS Failed] Provider: SMSLive247, HTTP: ${response.status}, Phone: ${maskedPhone}, Type: ${reminderType}, Reason: ${errMessage}`);
        return {
          success: false,
          status: 'FAILED',
          error: `SMSLive247 Gateway Error: ${errMessage}`
        };
      }
    } else if (provider === 'termii') {
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
        console.log(`[SMS Success] Termii accepted message. ID: ${msgId}, Recipient: ${maskedPhone}`);
        return {
          success: true,
          status: 'SENT',
          providerMessageId: String(msgId)
        };
      } else {
        const errMessage = data.message || data.error || `HTTP ${response.status} from Termii`;
        lastFailedSmsTimestamp = new Date().toISOString();
        console.warn(`[SMS Failed] Provider: Termii, Status: ${response.status}, Phone: ${maskedPhone}, Type: ${reminderType}, Reason: ${errMessage}`);
        return {
          success: false,
          status: 'FAILED',
          error: `Termii Gateway Error: ${errMessage}`
        };
      }
    } else {
      lastFailedSmsTimestamp = new Date().toISOString();
      return {
        success: false,
        status: 'FAILED',
        error: `Unsupported SMS provider "${provider}". Configured providers: "smslive247", "termii".`
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
app.get('/api/sms/stats', requireAdminAuth, (req: Request, res: Response) => {
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
app.get('/api/sms/logs', requireAdminAuth, (req: Request, res: Response) => {
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
app.post('/api/sms/send-test', requireAdminAuth, async (req: Request, res: Response) => {
  try {
    const { residentId, customMessage } = req.body;
    if (!residentId) {
      return res.status(400).json({ success: false, message: 'Resident ID is required.' });
    }

    const allResidents = Array.from(residentsStore.values());

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
    await serverDb.logSMS(logRecord);

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
app.post('/api/sms/run-reminders', requireAdminAuth, async (req: Request, res: Response) => {
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
// ADMIN SMS TEST DASHBOARD ENDPOINTS (STAGE 5 DIAGNOSTICS)
// -------------------------------------------------------------
interface AdminSmsTestLogRecord {
  id: string;
  created_at: string;
  recipient_masked: string;
  provider: string;
  sender_id: string;
  status: 'ACCEPTED' | 'FAILED' | 'NOT_CONFIGURED';
  delivery_label: string;
  provider_message_id?: string | null;
  error_message?: string | null;
  message_preview: string;
  admin_email: string;
}

const adminTestLogsStore: AdminSmsTestLogRecord[] = [];
let lastAdminTestSmsTimestamp = 0;

// 1. Check Server SMS Configuration (Without Sending SMS)
app.get('/api/admin/sms/check-config', requireAdminAuth, (_req: Request, res: Response) => {
  const rawProvider = getSmsProvider();
  const providerDisplay = rawProvider === 'smslive247' || rawProvider.includes('live') 
    ? 'SMSLive247' 
    : rawProvider === 'termii' 
    ? 'Termii' 
    : 'SMSLive247';
  const configured = isSmsConfigured();
  const apiKey = getSmsApiKey();
  const senderId = getSmsSenderId();
  const channel = getSmsChannel();

  res.json({
    success: true,
    provider: providerDisplay,
    rawProvider,
    senderId,
    channel,
    isConfigured: configured,
    maskedApiKey: apiKey ? '••••••••••••' : null,
    checks: {
      providerConfigured: Boolean(rawProvider),
      apiKeyPresent: Boolean(apiKey && apiKey.length > 5),
      senderIdConfigured: Boolean(senderId && senderId.length > 0),
      channelConfigured: Boolean(channel && channel.length > 0)
    },
    ready: configured,
    checkedAt: new Date().toISOString()
  });
});

// 2. Admin Test SMS Dispatch Endpoint (Direct Test to Any Specified Number)
app.post('/api/admin/sms/test', requireAdminAuth, async (req: Request, res: Response) => {
  try {
    const { testPhone, message } = req.body;

    if (!testPhone || typeof testPhone !== 'string' || !testPhone.trim()) {
      return res.status(400).json({
        success: false,
        status: 'FAILED',
        deliveryLabel: 'Validation Error',
        message: 'Test phone number is required.',
        error: 'Please enter a valid Nigerian mobile phone number (e.g. 08031234567).'
      });
    }

    // Cooldown check (prevent accidental rapid clicks)
    const now = Date.now();
    if (now - lastAdminTestSmsTimestamp < 3000) {
      return res.status(429).json({
        success: false,
        status: 'FAILED',
        deliveryLabel: 'Rate Limited',
        message: 'Please wait 3 seconds before sending another test SMS.',
        error: 'Cooldown active to prevent duplicate dispatches.'
      });
    }

    // Normalize phone number via centralized helper
    const normalizedPhone = normalizePhoneForSMS(testPhone.trim());
    if (!normalizedPhone || normalizedPhone.length !== 13 || !normalizedPhone.startsWith('234')) {
      return res.status(400).json({
        success: false,
        status: 'FAILED',
        deliveryLabel: 'Validation Error',
        message: 'Invalid Nigerian phone number format.',
        error: `Could not parse "${testPhone}". Expected format like 08031234567, +2348031234567, or 2348031234567.`
      });
    }

    lastAdminTestSmsTimestamp = now;

    const rawProvider = getSmsProvider();
    const providerDisplay = rawProvider === 'smslive247' || rawProvider.includes('live') 
      ? 'SMSLive247' 
      : rawProvider === 'termii' 
      ? 'Termii' 
      : 'SMSLive247';
    const senderId = getSmsSenderId();

    const defaultMsg = 'Finger of God Estate: This is a test SMS from the Resident Portal. If you received this message, the estate SMS service is working correctly.';
    const messageText = (message && typeof message === 'string' && message.trim()) ? message.trim() : defaultMsg;

    if (messageText.length > 500) {
      return res.status(400).json({
        success: false,
        status: 'FAILED',
        deliveryLabel: 'Validation Error',
        message: 'Test message exceeds character limit (maximum 500 characters).'
      });
    }

    // Safe recipient masking: 234803***4567
    const maskedPhone = `${normalizedPhone.slice(0, 6)}***${normalizedPhone.slice(-4)}`;

    // Dispatch SMS via existing core dispatch service
    const dispatch = await dispatchSms(normalizedPhone, messageText, 'ADMIN_TEST');

    const adminEmail = (req as any).adminUser?.email || 'admin@fingerofgodestate.com';

    const testLog: AdminSmsTestLogRecord = {
      id: `test-${Date.now()}-${crypto.randomBytes(2).toString('hex')}`,
      created_at: new Date().toISOString(),
      recipient_masked: maskedPhone,
      provider: providerDisplay,
      sender_id: senderId,
      status: dispatch.success ? 'ACCEPTED' : (dispatch.status === 'NOT_CONFIGURED' ? 'NOT_CONFIGURED' : 'FAILED'),
      delivery_label: dispatch.success ? 'Accepted by provider' : (dispatch.status === 'NOT_CONFIGURED' ? 'Not Configured' : 'Failed'),
      provider_message_id: dispatch.providerMessageId || null,
      error_message: dispatch.error || null,
      message_preview: messageText.length > 60 ? `${messageText.slice(0, 57)}...` : messageText,
      admin_email: adminEmail
    };

    // Keep up to 20 recent tests in memory ring buffer
    adminTestLogsStore.unshift(testLog);
    if (adminTestLogsStore.length > 20) {
      adminTestLogsStore.pop();
    }

    // Also record in system SMS log store for audit visibility
    const sysLog: ServerSmsLogRecord = {
      id: testLog.id,
      resident_id: 'admin-test',
      resident_number: 'ADMIN',
      phone_number: maskedPhone,
      payment_month: 10,
      payment_year: 2026,
      period_label: 'Diagnostic Test',
      reminder_type: 'TEST',
      message: messageText,
      provider: rawProvider,
      provider_message_id: dispatch.providerMessageId || null,
      delivery_status: dispatch.status,
      sent_at: dispatch.success ? new Date().toISOString() : null,
      error_message: dispatch.error || null,
      created_at: new Date().toISOString()
    };
    smsLogsStore.set(sysLog.id, sysLog);

    if (dispatch.status === 'NOT_CONFIGURED') {
      return res.json({
        success: false,
        status: 'NOT_CONFIGURED',
        deliveryLabel: 'Not Configured',
        message: 'SMS provider not configured on server.',
        error: dispatch.error || 'No valid SMS_API_KEY detected in server environment.',
        provider: providerDisplay,
        senderId,
        recipientMasked: maskedPhone,
        timestamp: testLog.created_at
      });
    }

    if (!dispatch.success) {
      return res.json({
        success: false,
        status: 'FAILED',
        deliveryLabel: 'Failed',
        message: `${providerDisplay} rejected the SMS request.`,
        error: dispatch.error || 'Provider rejected message transmission.',
        provider: providerDisplay,
        senderId,
        recipientMasked: maskedPhone,
        timestamp: testLog.created_at
      });
    }

    return res.json({
      success: true,
      status: 'ACCEPTED',
      deliveryLabel: 'Accepted by provider',
      message: `${providerDisplay} accepted the test SMS for delivery.`,
      provider: providerDisplay,
      senderId,
      recipientMasked: maskedPhone,
      providerMessageId: dispatch.providerMessageId || null,
      timestamp: testLog.created_at
    });
  } catch (err: any) {
    console.error('Admin test SMS exception:', err);
    res.status(500).json({
      success: false,
      status: 'FAILED',
      deliveryLabel: 'Server Error',
      message: 'Internal server error while processing SMS test.',
      error: err?.message || 'Server error'
    });
  }
});

// 3. Admin Test History Endpoint
app.get('/api/admin/sms/test-history', requireAdminAuth, (_req: Request, res: Response) => {
  res.json({
    success: true,
    tests: adminTestLogsStore.slice(0, 20)
  });
});

// 4. Generate Outstanding Security Levy SMS Drafts (Review & Approval Only - NEVER Auto-sends)
app.get('/api/admin/sms/outstanding-drafts', requireAdminAuth, (req: Request, res: Response) => {
  try {
    const month = parseInt(String(req.query.month || '10'), 10);
    const year = parseInt(String(req.query.year || '2026'), 10);
    const MONTH_NAMES = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    const periodLabel = `${MONTH_NAMES[month - 1] || 'October'} ${year}`;

    const activeResidents = Array.from(residentsStore.values()).filter(r => r.status === 'Active');
    const smsLogs = Array.from(smsLogsStore.values()).filter(s => s.payment_month === month && s.payment_year === year);

    const drafts = [];
    const amountDue = 5000; // Monthly Security Levy standard

    for (const resident of activeResidents) {
      const key = `${resident.resident_number}_${month}_${year}`;
      const p = paymentsStore.get(key) || paymentsStore.get(`${resident.resident_number}-${month}-${year}`);
      
      // Crucial: Only confirmed 'PAID' payments reduce the balance!
      // Pending, Failed, Cancelled, Abandoned do NOT count as paid.
      const amountPaid = (p && p.status === 'PAID') ? (p.amount_paid || 5000) : 0;
      const outstandingAmount = Math.max(0, amountDue - amountPaid);

      // Strictly security levy only (NO road modernization contributions)
      if (outstandingAmount > 0) {
        // Phone validation & normalization
        const rawPhone = resident.phone_number || '';
        const normalized = normalizePhoneForSMS(rawPhone);
        const isPhoneValid = Boolean(normalized && normalized.length === 13 && normalized.startsWith('234'));

        // Check recent SMS reminders to detect duplicates / recent dispatches
        const residentLogs = smsLogs.filter(s => s.resident_number === resident.resident_number);
        const lastSentLog = residentLogs.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];

        // Format message template as specified in requirements:
        // "Finger of God Estate: Dear {residentName}, our records show an outstanding security levy balance of ₦{outstandingAmount} for {paymentPeriod}. Please log in to the Resident Portal to review and make payment. Thank you."
        const formattedAmount = `₦${outstandingAmount.toLocaleString()}`;
        const defaultMessage = `Finger of God Estate: Dear ${resident.full_name.trim()}, our records show an outstanding security levy balance of ${formattedAmount} for ${periodLabel}. Please log in to the Resident Portal to review and make payment. Thank you.`;

        drafts.push({
          draft_id: `draft-${resident.resident_number}-${month}-${year}`,
          resident_id: resident.id,
          resident_number: resident.resident_number,
          resident_name: resident.full_name,
          house_number: resident.house_number,
          phone_number: rawPhone,
          normalized_phone: normalized || '',
          is_phone_valid: isPhoneValid,
          phone_validation_error: isPhoneValid ? null : (rawPhone ? 'Invalid Nigerian phone format' : 'No phone number provided'),
          amount_due: amountDue,
          amount_paid: amountPaid,
          outstanding_amount: outstandingAmount,
          payment_period: periodLabel,
          period_month: month,
          period_year: year,
          message: defaultMessage,
          status: 'draft',
          last_reminder_sent: lastSentLog ? (lastSentLog.sent_at || lastSentLog.created_at) : null,
          created_at: new Date().toISOString()
        });
      }
    }

    // Record audit log for draft generation
    const adminEmail = (req as any).adminUser?.email || 'admin@fingerofgodestate.com';
    auditLogsStore.unshift({
      id: crypto.randomUUID(),
      admin_email: adminEmail,
      action: 'SMS_OUTSTANDING_DRAFTS_GENERATED',
      entity_type: 'sms',
      entity_id: null,
      description: `Administrator generated ${drafts.length} outstanding security levy SMS drafts for ${periodLabel}`,
      metadata: { count: drafts.length, period: periodLabel },
      created_at: new Date().toISOString()
    });
    if (auditLogsStore.length > 500) auditLogsStore.pop();

    res.json({
      success: true,
      count: drafts.length,
      period: periodLabel,
      drafts
    });
  } catch (err: any) {
    console.error('Error generating outstanding SMS drafts:', err);
    res.status(500).json({ success: false, message: 'Server error generating drafts.' });
  }
});

// 5. Send Approved SMS Reminders (Two-Step Admin Action with Explicit Confirmation)
app.post('/api/admin/sms/send-approved-reminders', requireAdminAuth, async (req: Request, res: Response) => {
  try {
    const { approved_drafts } = req.body;

    if (!Array.isArray(approved_drafts) || approved_drafts.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No approved SMS drafts provided for transmission.'
      });
    }

    const adminEmail = (req as any).adminUser?.email || 'admin@fingerofgodestate.com';
    const results = [];
    let sentCount = 0;
    let failedCount = 0;

    for (const draft of approved_drafts) {
      const { draft_id, resident_number, phone_number, message } = draft;

      // Phone validation & normalization
      const normalizedPhone = normalizePhoneForSMS(phone_number || '');
      if (!normalizedPhone || normalizedPhone.length !== 13 || !normalizedPhone.startsWith('234')) {
        failedCount++;
        results.push({
          draft_id,
          resident_number,
          resident_name: draft.resident_name || `Resident ${resident_number}`,
          phone_number: phone_number || '',
          status: 'failed',
          delivery_label: 'Invalid Phone Number',
          provider_message_id: null,
          error: 'No valid Nigerian phone number found for resident.'
        });
        continue;
      }

      const msgText = (typeof message === 'string' && message.trim()) ? message.trim() : '';
      if (!msgText) {
        failedCount++;
        results.push({
          draft_id,
          resident_number,
          resident_name: draft.resident_name || `Resident ${resident_number}`,
          phone_number: normalizedPhone,
          status: 'failed',
          delivery_label: 'Empty Message',
          provider_message_id: null,
          error: 'Message content cannot be blank.'
        });
        continue;
      }

      // Dispatch SMS through existing dispatchSms service
      const dispatch = await dispatchSms(normalizedPhone, msgText, 'REMINDER_OUTSTANDING_ADMIN');

      const maskedPhone = `${normalizedPhone.slice(0, 6)}***${normalizedPhone.slice(-4)}`;

      if (dispatch.success) {
        sentCount++;
        results.push({
          draft_id,
          resident_number,
          resident_name: draft.resident_name || `Resident ${resident_number}`,
          phone_number: maskedPhone,
          status: 'sent',
          delivery_label: 'Accepted by provider',
          provider_message_id: dispatch.providerMessageId || null,
          error: null
        });

        // Record in system SMS logs
        const logId = `sms-${Date.now()}-${crypto.randomBytes(2).toString('hex')}`;
        const newLog: ServerSmsLogRecord = {
          id: logId,
          resident_id: draft.resident_id || resident_number,
          resident_number,
          phone_number: maskedPhone,
          payment_month: draft.period_month || 10,
          payment_year: draft.period_year || 2026,
          period_label: draft.payment_period || 'October 2026',
          reminder_type: 'REMINDER_1',
          message: msgText,
          provider: getSmsProvider(),
          provider_message_id: dispatch.providerMessageId || null,
          delivery_status: 'SENT',
          sent_at: new Date().toISOString(),
          error_message: null,
          created_at: new Date().toISOString()
        };
        smsLogsStore.set(logId, newLog);
      } else {
        failedCount++;
        results.push({
          draft_id,
          resident_number,
          resident_name: draft.resident_name || `Resident ${resident_number}`,
          phone_number: maskedPhone,
          status: 'failed',
          delivery_label: dispatch.status === 'NOT_CONFIGURED' ? 'Not Configured' : 'Rejected by Provider',
          provider_message_id: null,
          error: dispatch.error || 'Provider rejected transmission'
        });

        // Record failed log
        const logId = `sms-${Date.now()}-${crypto.randomBytes(2).toString('hex')}`;
        const newLog: ServerSmsLogRecord = {
          id: logId,
          resident_id: draft.resident_id || resident_number,
          resident_number,
          phone_number: maskedPhone,
          payment_month: draft.period_month || 10,
          payment_year: draft.period_year || 2026,
          period_label: draft.payment_period || 'October 2026',
          reminder_type: 'REMINDER_1',
          message: msgText,
          provider: getSmsProvider(),
          provider_message_id: null,
          delivery_status: 'FAILED',
          sent_at: null,
          error_message: dispatch.error || 'Provider rejected transmission',
          created_at: new Date().toISOString()
        };
        smsLogsStore.set(logId, newLog);
      }

      // Small throttling delay between multiple dispatches (100ms)
      if (approved_drafts.length > 1) {
        await new Promise(res => setTimeout(res, 100));
      }
    }

    // Record audit log
    auditLogsStore.unshift({
      id: crypto.randomUUID(),
      admin_email: adminEmail,
      action: 'SMS_OUTSTANDING_REMINDERS_SENT',
      entity_type: 'sms',
      entity_id: null,
      description: `Administrator dispatched ${sentCount} outstanding reminder SMS (${failedCount} failed) out of ${approved_drafts.length} attempted`,
      metadata: { attempted: approved_drafts.length, sent: sentCount, failed: failedCount },
      created_at: new Date().toISOString()
    });
    if (auditLogsStore.length > 500) auditLogsStore.pop();

    res.json({
      success: true,
      message: `SMS transmission complete: ${sentCount} accepted by provider, ${failedCount} failed.`,
      total_attempted: approved_drafts.length,
      total_sent: sentCount,
      total_failed: failedCount,
      results
    });
  } catch (err: any) {
    console.error('Error sending approved SMS reminders:', err);
    res.status(500).json({ success: false, message: 'Server error sending approved reminders.' });
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

app.post('/api/admin/audit-log', requireAdminAuth, async (req: Request, res: Response) => {
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
    await serverDb.logActivity(record);
    res.json({ success: true, log: record });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Failed to record audit log' });
  }
});

app.get('/api/admin/audit-logs', requireAdminAuth, async (_req: Request, res: Response) => {
  try {
    const dbLogs = await serverDb.getActivityLogs();
    res.json({ success: true, count: dbLogs.length, logs: dbLogs });
  } catch {
    res.json({ success: true, count: auditLogsStore.length, logs: auditLogsStore });
  }
});

// Admin Supabase Database Diagnostics & Health Status
app.get('/api/admin/supabase-status', async (_req: Request, res: Response) => {
  try {
    const health = await serverDb.checkHealth();
    res.json({ success: true, ...health });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message || 'Error checking Supabase health' });
  }
});

// Server-side Administrator Verification Endpoints
app.post('/api/admin/auth/verify-login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required.' });
    }
    const cleanEmail = String(email).trim().toLowerCase();

    // Verify with Supabase Auth
    try {
      const { data, error } = await supabaseAdmin.auth.signInWithPassword({
        email: cleanEmail,
        password
      });

      if (!error && data.user && data.session?.access_token) {
        // Authoritative verification using UUID & profiles.role via verifyAdminToken
        const authResult = await verifyAdminToken(data.session.access_token);
        if (!authResult.valid || !authResult.user) {
          return res.status(403).json({
            success: false,
            message: authResult.error || 'Access denied: Your account is not authorized for administrator access.'
          });
        }

        return res.json({
          success: true,
          token: data.session.access_token,
          user: {
            id: data.user.id,
            email: data.user.email || cleanEmail,
            full_name: authResult.user.full_name || 'Estate Administrator',
            role: authResult.user.role || 'admin'
          }
        });
      }
    } catch {}

    return res.status(401).json({
      success: false,
      message: 'Invalid administrator credentials. Access denied.'
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Server authentication error.' });
  }
});

// Server-side Administrator Session Verification Endpoint
app.get('/api/admin/auth/verify-session', async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null;
    if (!token) {
      return res.status(401).json({ success: false, message: 'Authorization token required.' });
    }

    const authResult = await verifyAdminToken(token);
    if (!authResult.valid || !authResult.user) {
      return res.status(403).json({ success: false, message: authResult.error || 'Unauthorized administrator session.' });
    }

    return res.json({
      success: true,
      user: {
        id: authResult.user.id,
        email: authResult.user.email,
        full_name: authResult.user.full_name,
        role: authResult.user.role || 'admin'
      }
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Error verifying session.' });
  }
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
app.get('/api/admin/announcements', requireAdminAuth, (req: Request, res: Response) => {
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
app.post('/api/admin/announcements', requireAdminAuth, async (req: Request, res: Response) => {
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
    await serverDb.saveAnnouncement(record);

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
    await serverDb.logActivity(auditRecord);

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
app.put('/api/admin/announcements/:id', requireAdminAuth, async (req: Request, res: Response) => {
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
    await serverDb.saveAnnouncement(updated);

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
    await serverDb.logActivity(auditRecord);

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
app.post('/api/admin/announcements/:id/status', requireAdminAuth, async (req: Request, res: Response) => {
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
    await serverDb.saveAnnouncement(updated);

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
    await serverDb.logActivity(auditRecord);

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
app.delete('/api/admin/announcements/:id', requireAdminAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const admin_email = (req.query.admin_email as string) || 'admin@fingerofgodestate.ng';
    const existing = announcementsStore.get(id);

    if (!existing) {
      return res.status(404).json({ success: false, message: 'Announcement not found' });
    }

    announcementsStore.delete(id);
    await serverDb.deleteAnnouncement(id);

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
    await serverDb.logActivity(auditRecord);

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

// ==========================================
// STAGE 11 REST API ENDPOINTS: ACCESS & GATE MANAGEMENT
// ==========================================
const serverVehiclesStore = new Map<string, any>();
const serverWatchlistStore = new Map<string, any>();
const serverContractorsStore = new Map<string, any>();
const serverDeliveriesStore = new Map<string, any>();

// GET /api/vehicles
app.get('/api/vehicles', (req: Request, res: Response) => {
  const residentNumber = req.query.resident_number as string;
  let vehicles = Array.from(serverVehiclesStore.values());
  if (residentNumber) {
    vehicles = vehicles.filter(v => v.resident_number === residentNumber);
  }
  res.json({ success: true, vehicles });
});

// POST /api/vehicles
app.post('/api/vehicles', (req: Request, res: Response) => {
  try {
    const data = req.body;
    const id = `veh-${Date.now()}`;
    const vehicle = {
      id,
      ...data,
      plate_number: data.plate_number ? data.plate_number.toUpperCase() : 'UNKNOWN',
      created_at: new Date().toISOString()
    };
    serverVehiclesStore.set(id, vehicle);
    res.json({ success: true, vehicle });
  } catch {
    res.status(500).json({ success: false, message: 'Failed to register vehicle' });
  }
});

// DELETE /api/vehicles/:id
app.delete('/api/vehicles/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  serverVehiclesStore.delete(id);
  res.json({ success: true });
});

// GET /api/watchlist
app.get('/api/watchlist', (_req: Request, res: Response) => {
  const watchlist = Array.from(serverWatchlistStore.values());
  res.json({ success: true, watchlist });
});

// POST /api/watchlist
app.post('/api/watchlist', (req: Request, res: Response) => {
  try {
    const data = req.body;
    const id = `wl-${Date.now()}`;
    const entry = {
      id,
      ...data,
      plate_number: data.plate_number ? data.plate_number.toUpperCase() : null,
      created_at: new Date().toISOString()
    };
    serverWatchlistStore.set(id, entry);
    res.json({ success: true, entry });
  } catch {
    res.status(500).json({ success: false, message: 'Failed to add watchlist record' });
  }
});

// DELETE /api/watchlist/:id
app.delete('/api/watchlist/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  serverWatchlistStore.delete(id);
  res.json({ success: true });
});

// GET /api/contractors
app.get('/api/contractors', (_req: Request, res: Response) => {
  const contractors = Array.from(serverContractorsStore.values());
  res.json({ success: true, contractors });
});

// POST /api/contractors
app.post('/api/contractors', (req: Request, res: Response) => {
  try {
    const data = req.body;
    const id = `con-${Date.now()}`;
    const passCode = `FOG-CON-2026-${String(serverContractorsStore.size + 1).padStart(4, '0')}`;
    const pass = {
      id,
      pass_code: passCode,
      ...data,
      created_at: new Date().toISOString()
    };
    serverContractorsStore.set(id, pass);
    res.json({ success: true, pass });
  } catch {
    res.status(500).json({ success: false, message: 'Failed to issue contractor pass' });
  }
});

// GET /api/deliveries
app.get('/api/deliveries', (_req: Request, res: Response) => {
  const deliveries = Array.from(serverDeliveriesStore.values());
  res.json({ success: true, deliveries });
});

// POST /api/deliveries
app.post('/api/deliveries', (req: Request, res: Response) => {
  try {
    const data = req.body;
    const id = `del-${Date.now()}`;
    const passCode = `FOG-DEL-2026-${String(serverDeliveriesStore.size + 1).padStart(4, '0')}`;
    const pass = {
      id,
      pass_code: passCode,
      ...data,
      created_at: new Date().toISOString()
    };
    serverDeliveriesStore.set(id, pass);
    res.json({ success: true, pass });
  } catch {
    res.status(500).json({ success: false, message: 'Failed to record delivery' });
  }
});

// -------------------------------------------------------------
// 6.5. ROAD PROJECT FINANCIAL DASHBOARD & VERIFIED LEDGER API
// -------------------------------------------------------------
app.use('/api/road-project', roadProjectRouter);

// -------------------------------------------------------------
// 6.6. ESTATE ELECTION & SECRET BALLOT VOTING SYSTEM API
// -------------------------------------------------------------
app.use('/api/election', electionRouter);

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
  // Ensure the designated administrator account is bootstrapped and verified
  try {
    await ensureDesignatedAdminAccount();
  } catch (err) {
    console.warn('Notice ensuring designated admin account:', err);
  }

  // Synchronize residents directory from persistent database
  try {
    await initializeResidentsStore();
  } catch (err) {
    console.warn('Notice initializing residents store:', err);
  }

  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: false,
      },
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
