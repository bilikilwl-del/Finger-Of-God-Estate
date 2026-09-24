/**
 * Finger of God Estate Security Management
 * Paystack Integration Client Library
 * Handles communication with secure backend endpoints for initialization, verification, and receipt generation.
 * NEVER accesses PAYSTACK_SECRET_KEY.
 */

export interface PaystackConfig {
  publicKey: string;
  isConfigured: boolean;
  mode: 'test' | 'live';
  currency: string;
  levyAmount: number;
  webhookUrl?: string;
}

export interface InitializePaymentResponse {
  success: boolean;
  authorization_url?: string;
  access_code?: string;
  reference: string;
  amount: number;
  currency: string;
  resident_number: string;
  resident_name: string;
  period_label: string;
  mode: 'test' | 'live';
  is_simulation?: boolean;
  alreadyPaid?: boolean;
  message?: string;
}

export interface VerifyPaymentResponse {
  success: boolean;
  verified: boolean;
  message?: string;
  payment?: any;
  transaction?: any;
  receipt?: any;
  discrepancy?: boolean;
}

/**
 * Fetch public Paystack configuration from backend (safe for frontend)
 */
export async function getPaystackConfig(): Promise<PaystackConfig> {
  try {
    const res = await fetch('/api/paystack/config');
    if (!res.ok) {
      throw new Error(`Config fetch failed: ${res.statusText}`);
    }
    return await res.json();
  } catch (err) {
    console.warn('Could not fetch server Paystack config, using default test settings:', err);
    return {
      publicKey: '',
      isConfigured: false,
      mode: 'test',
      currency: 'NGN',
      levyAmount: 5000
    };
  }
}

/**
 * Initialize payment on the server.
 * The server securely looks up resident and determines amount due (₦5,000 = 500,000 kobo).
 */
export async function initializePayment(params: {
  residentNumber: string;
  periodMonth?: number;
  periodYear?: number;
  email?: string;
}): Promise<InitializePaymentResponse> {
  const res = await fetch('/api/paystack/initialize', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      residentNumber: params.residentNumber,
      periodMonth: params.periodMonth || 10,
      periodYear: params.periodYear || 2026,
      email: params.email
    })
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || 'Payment initialization failed.');
  }
  return data;
}

/**
 * Trigger server-side transaction verification with Paystack using PAYSTACK_SECRET_KEY.
 * NEVER trust client status alone.
 */
export async function verifyPayment(reference: string): Promise<VerifyPaymentResponse> {
  const res = await fetch('/api/paystack/verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ reference })
  });

  const data = await res.json();
  return data;
}

/**
 * Formats Naira currency representation
 */
export function formatNaira(amount: number): string {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    minimumFractionDigits: 2
  }).format(amount).replace('NGN', '₦');
}

/**
 * Dynamically loads Paystack Inline JS script if not already loaded
 */
export function loadPaystackInlineScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined') return resolve(false);
    if ((window as any).PaystackPop) return resolve(true);

    const script = document.createElement('script');
    script.src = 'https://js.paystack.co/v1/inline.js';
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => {
      console.warn('Failed to load Paystack inline script from CDN. Will use test checkout modal fallback.');
      resolve(false);
    };
    document.body.appendChild(script);
  });
}
