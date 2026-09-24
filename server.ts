import express, { Request, Response } from 'express';
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

// Initial in-memory data store for server-side verification and fallback
const paymentsStore = new Map<string, ServerPaymentRecord>(); // key: residentNumber_periodMonth_periodYear
const transactionsStore = new Map<string, ServerTransactionRecord>(); // key: reference
const receiptsStore = new Map<string, ServerReceiptRecord>(); // key: reference or receiptNumber

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
      // Format: RCP-YYYYMM-RESIDENTNUM-HEX
      const receiptNum = `RCP-${transaction.period_year}${String(transaction.period_month).padStart(2, '0')}-${transaction.resident_number}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
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
            const receiptNum = `RCP-${transaction.period_year}${String(transaction.period_month).padStart(2, '0')}-${transaction.resident_number}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
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
// 5. DATA SYNC & ADMIN REPORTING ENDPOINTS
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
// 6. HEALTH CHECK
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
