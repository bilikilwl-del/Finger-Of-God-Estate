import {
  Building,
  Flat,
  FlatObligation,
  SecurityLevyTransaction,
  FlatPaymentAllocation,
  ManualPaymentLog,
  EstateAuditLog
} from '../types/database';

export const securityLevyService = {
  // BUILDINGS
  async getBuildings(): Promise<Building[]> {
    const res = await fetch('/api/security-levy/buildings');
    const data = await res.json();
    return data.success && Array.isArray(data.data) ? data.data : [];
  },

  async createBuilding(buildingData: Partial<Building>, adminToken: string): Promise<{ success: boolean; data?: Building; message?: string }> {
    const res = await fetch('/api/security-levy/buildings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      },
      body: JSON.stringify(buildingData)
    });
    return res.json();
  },

  async updateBuilding(id: string, updates: Partial<Building>, adminToken: string): Promise<{ success: boolean; data?: Building; message?: string }> {
    const res = await fetch(`/api/security-levy/buildings/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      },
      body: JSON.stringify(updates)
    });
    return res.json();
  },

  async archiveBuilding(id: string, adminToken: string): Promise<{ success: boolean; message?: string }> {
    const res = await fetch(`/api/security-levy/buildings/${id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${adminToken}`
      }
    });
    return res.json();
  },

  // FLATS
  async getFlats(buildingId: string): Promise<Flat[]> {
    const res = await fetch(`/api/security-levy/buildings/${buildingId}/flats`);
    const data = await res.json();
    return data.success && Array.isArray(data.data) ? data.data : [];
  },

  async createFlat(buildingId: string, flatData: Partial<Flat>, adminToken: string): Promise<{ success: boolean; data?: Flat; message?: string }> {
    const res = await fetch(`/api/security-levy/buildings/${buildingId}/flats`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      },
      body: JSON.stringify(flatData)
    });
    return res.json();
  },

  async updateFlat(id: string, updates: Partial<Flat>, adminToken: string): Promise<{ success: boolean; data?: Flat; message?: string }> {
    const res = await fetch(`/api/security-levy/flats/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      },
      body: JSON.stringify(updates)
    });
    return res.json();
  },

  async archiveFlat(id: string, adminToken: string): Promise<{ success: boolean; message?: string }> {
    const res = await fetch(`/api/security-levy/flats/${id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${adminToken}`
      }
    });
    return res.json();
  },

  // OBLIGATIONS
  async getObligations(params?: { billingMonth?: string; flatId?: string; buildingId?: string }): Promise<FlatObligation[]> {
    const url = new URL('/api/security-levy/obligations', window.location.origin);
    if (params?.billingMonth) url.searchParams.set('billingMonth', params.billingMonth);
    if (params?.flatId) url.searchParams.set('flatId', params.flatId);
    if (params?.buildingId) url.searchParams.set('buildingId', params.buildingId);

    const res = await fetch(url.toString());
    const data = await res.json();
    return data.success && Array.isArray(data.data) ? data.data : [];
  },

  async generateObligations(billingMonth: string, adminToken: string): Promise<{ success: boolean; message?: string; data?: any }> {
    const res = await fetch('/api/security-levy/obligations/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      },
      body: JSON.stringify({ billing_month: billingMonth })
    });
    return res.json();
  },

  // PAYMENT INITIALIZATION & VERIFICATION
  async initializePayment(params: {
    transaction_type: 'INDIVIDUAL_FLAT' | 'BULK_FLATS';
    building_id?: string;
    flat_ids: string[];
    billing_month?: string;
    payer_name: string;
    payer_email: string;
    payer_phone?: string;
    payer_type?: 'LANDLORD' | 'AGENT' | 'RESIDENT';
  }): Promise<{
    success: boolean;
    authorization_url?: string;
    access_code?: string;
    reference?: string;
    amount?: number;
    total_units?: number;
    billing_month?: string;
    mode?: string;
    is_simulation?: boolean;
    message?: string;
  }> {
    const res = await fetch('/api/security-levy/initialize-payment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params)
    });
    return res.json();
  },

  async verifyPayment(reference: string): Promise<{
    success: boolean;
    verified: boolean;
    message?: string;
    transaction?: SecurityLevyTransaction;
    allocations?: FlatPaymentAllocation[];
  }> {
    const res = await fetch('/api/security-levy/verify-payment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reference })
    });
    return res.json();
  },

  // MANUAL PAYMENT
  async recordManualPayment(params: {
    transaction_type: 'INDIVIDUAL_FLAT' | 'BULK_FLATS';
    building_id?: string;
    flat_ids: string[];
    billing_month?: string;
    payer_name: string;
    payer_email?: string;
    payer_phone?: string;
    payer_type?: 'LANDLORD' | 'AGENT' | 'RESIDENT';
    payment_method: 'MANUAL_BANK_TRANSFER' | 'MANUAL_CASH' | 'MANUAL_POS';
    bank_reference?: string;
    notes: string;
  }, adminToken: string): Promise<{
    success: boolean;
    message?: string;
    transaction?: SecurityLevyTransaction;
    allocations?: FlatPaymentAllocation[];
  }> {
    const res = await fetch('/api/security-levy/manual-payment', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      },
      body: JSON.stringify(params)
    });
    return res.json();
  },

  // TRANSACTIONS & ALLOCATIONS
  async getTransactions(adminToken: string): Promise<SecurityLevyTransaction[]> {
    const res = await fetch('/api/security-levy/transactions', {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    const data = await res.json();
    return data.success && Array.isArray(data.data) ? data.data : [];
  },

  async getAllocations(params?: { transactionId?: string; flatId?: string }): Promise<FlatPaymentAllocation[]> {
    const url = new URL('/api/security-levy/allocations', window.location.origin);
    if (params?.transactionId) url.searchParams.set('transactionId', params.transactionId);
    if (params?.flatId) url.searchParams.set('flatId', params.flatId);
    const res = await fetch(url.toString());
    const data = await res.json();
    return data.success && Array.isArray(data.data) ? data.data : [];
  },

  async getReceipt(receiptNumber: string): Promise<{ success: boolean; receipt?: any; message?: string }> {
    const res = await fetch(`/api/security-levy/receipt/${encodeURIComponent(receiptNumber)}`);
    return res.json();
  },

  async getAuditLogs(adminToken: string): Promise<EstateAuditLog[]> {
    const res = await fetch('/api/security-levy/audit-logs', {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    const data = await res.json();
    return data.success && Array.isArray(data.data) ? data.data : [];
  }
};
