import {
  BuildingEstateLevyObligation,
  BuildingEstateLevyTransaction,
  BuildingEstateLevyReceipt
} from '../types/database';

export interface EstateLevyBuildingItem {
  id: string;
  house_number: string;
  building_name?: string | null;
  landlord_name?: string | null;
  total_flats_count: number;
  monthly_levy_amount: number;
  status: string;
  obligation: {
    id?: string;
    billing_month: string;
    amount_due: number;
    amount_paid: number;
    balance_due: number;
    status: 'UNPAID' | 'PARTIALLY_PAID' | 'PAID';
    paid_at?: string | null;
  };
}

export interface EstateLevyLookupResult {
  success: boolean;
  message?: string;
  building?: {
    id: string;
    house_number: string;
    building_name?: string | null;
    landlord_name?: string | null;
    total_flats_count: number;
  };
  billing_month?: string;
  rate_per_building?: number;
  obligation?: {
    id?: string;
    status: 'UNPAID' | 'PARTIALLY_PAID' | 'PAID';
    amount_due: number;
    amount_paid: number;
    balance_due: number;
    paid_at?: string | null;
  };
  receipts?: BuildingEstateLevyReceipt[];
}

export const estateLevyService = {
  // Fetch active buildings with monthly levy obligations
  async getBuildings(billingMonth?: string): Promise<{
    success: boolean;
    data: EstateLevyBuildingItem[];
    monthly_rate_per_building: number;
    billing_month: string;
  }> {
    const q = billingMonth ? `?billingMonth=${encodeURIComponent(billingMonth)}` : '';
    const res = await fetch(`/api/estate-levy/buildings${q}`);
    const data = await res.json();
    return data;
  },

  // Lookup building levy status by building/house number
  async lookupBuilding(houseNumber: string, billingMonth?: string): Promise<EstateLevyLookupResult> {
    const params = new URLSearchParams();
    params.set('houseNumber', houseNumber.trim());
    if (billingMonth) params.set('billingMonth', billingMonth);
    const res = await fetch(`/api/estate-levy/lookup?${params.toString()}`);
    return res.json();
  },

  // Initialize payment for a specific building (₦1,000 per building)
  async initializePayment(params: {
    building_id: string;
    billing_month: string;
    payer_name: string;
    payer_email: string;
    payer_phone?: string;
  }): Promise<{
    success: boolean;
    authorization_url?: string;
    access_code?: string;
    reference?: string;
    amount?: number;
    currency?: string;
    building_house_number?: string;
    billing_month?: string;
    is_simulation?: boolean;
    alreadyPaid?: boolean;
    message?: string;
    receipt?: BuildingEstateLevyReceipt;
  }> {
    const res = await fetch('/api/estate-levy/initialize-payment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params)
    });
    return res.json();
  },

  // Verify payment using reference
  async verifyPayment(reference: string): Promise<{
    success: boolean;
    verified: boolean;
    message?: string;
    transaction?: BuildingEstateLevyTransaction;
    receipt?: BuildingEstateLevyReceipt;
  }> {
    const res = await fetch('/api/estate-levy/verify-payment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reference })
    });
    return res.json();
  },

  // Get receipt by number
  async getReceipt(receiptNumber: string): Promise<{
    success: boolean;
    receipt?: BuildingEstateLevyReceipt;
    message?: string;
  }> {
    const res = await fetch(`/api/estate-levy/receipt/${encodeURIComponent(receiptNumber)}`);
    return res.json();
  }
};
