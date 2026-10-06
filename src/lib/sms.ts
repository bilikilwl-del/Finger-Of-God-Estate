/**
 * Finger of God Estate Security Management
 * SMS Service Client & Template Utilities (Stage 5)
 * 
 * Secure interface connecting frontend UI with server-side SMS execution.
 * SMS API secrets (e.g. SMS_API_KEY) are NEVER accessible here.
 */

import { SMSLog, SMSConfigStatus, SMSSummaryStats, SMSReminderType, SMSDeliveryStatus } from '../types/database';
import { formatNigerianPhoneForSMS } from './phoneUtils';
import { getAdminAuthHeaders } from './supabase';

export interface AdminSmsConfigCheck {
  success: boolean;
  provider: string;
  rawProvider: string;
  senderId: string;
  channel: string;
  isConfigured: boolean;
  maskedApiKey: string | null;
  checks: {
    providerConfigured: boolean;
    apiKeyPresent: boolean;
    senderIdConfigured: boolean;
    channelConfigured: boolean;
  };
  ready: boolean;
  checkedAt: string;
}

export interface AdminSmsTestResult {
  success: boolean;
  status: 'ACCEPTED' | 'FAILED' | 'NOT_CONFIGURED';
  deliveryLabel: string;
  message: string;
  error?: string;
  provider: string;
  senderId: string;
  recipientMasked: string;
  providerMessageId?: string | null;
  timestamp: string;
}

export interface AdminSmsTestHistoryItem {
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

/**
 * Normalizes phone numbers to standard Nigerian international format for SMS gateways (e.g. 2348012345678)
 */
export function formatPhoneForSMS(phone: string): string {
  return formatNigerianPhoneForSMS(phone);
}

/**
 * Template for Reminder 1:
 * Sent 5 days after payment due date (Day 6 of the month).
 */
export function buildReminder1Message(
  residentName: string,
  residentNumber: string,
  periodLabel: string = 'October 2026',
  levyAmount: number = 5000
): string {
  const formattedLevy = `₦${levyAmount.toLocaleString()}`;
  return `Dear ${residentName.trim()}, your Finger of God Estate security levy of ${formattedLevy} for ${periodLabel} is due. Please make payment through the Finger of God Estate Security Management website. Resident No: ${residentNumber}.`;
}

/**
 * Template for Reminder 2:
 * Sent 5 days after Reminder 1 (Day 11 of the month).
 */
export function buildReminder2Message(
  residentName: string,
  residentNumber: string,
  periodLabel: string = 'October 2026',
  levyAmount: number = 5000
): string {
  const formattedLevy = `₦${levyAmount.toLocaleString()}`;
  return `Dear ${residentName.trim()}, this is a second reminder that your Finger of God Estate security levy of ${formattedLevy} for ${periodLabel} remains unpaid. Please make payment through the estate payment portal. Resident No: ${residentNumber}.`;
}

/**
 * Template for Manual Admin Test SMS:
 */
export function buildTestMessage(
  residentName: string,
  residentNumber: string
): string {
  return `Dear ${residentName.trim()}, this is a test notification from Finger of God Estate Security Management. Estate security line: 08023456789. Resident No: ${residentNumber}.`;
}

/**
 * API Client functions for SMS module
 */
export const smsApiClient = {
  /**
   * Fetches server-side SMS configuration status without exposing API keys
   */
  async getConfigStatus(): Promise<SMSConfigStatus> {
    try {
      const res = await fetch('/api/sms/config');
      if (res.ok) {
        return await res.json();
      }
    } catch (err) {
      console.warn('Could not fetch SMS config from server, falling back to local inspection:', err);
    }
    return {
      isConfigured: false,
      provider: 'termii',
      senderId: 'FINGEROFGOD',
      channel: 'generic',
      lastSuccessfulSms: null,
      lastFailedSms: null
    };
  },

  /**
   * Fetches summary statistics for the SMS Management Dashboard
   */
  async getSummaryStats(): Promise<SMSSummaryStats> {
    try {
      const res = await fetch('/api/sms/stats');
      if (res.ok) {
        return await res.json();
      }
    } catch (err) {
      console.warn('Could not fetch SMS stats from server:', err);
    }
    return {
      sentToday: 0,
      sentThisMonth: 0,
      reminder1Sent: 0,
      reminder2Sent: 0,
      failedSms: 0,
      pendingSms: 0,
      totalLogged: 0
    };
  },

  /**
   * Fetches SMS log history with optional filters
   */
  async getLogs(filters?: {
    query?: string;
    reminderType?: string;
    deliveryStatus?: string;
    month?: number;
    year?: number;
  }): Promise<SMSLog[]> {
    try {
      const params = new URLSearchParams();
      if (filters?.query) params.append('query', filters.query);
      if (filters?.reminderType && filters.reminderType !== 'All') params.append('reminderType', filters.reminderType);
      if (filters?.deliveryStatus && filters.deliveryStatus !== 'All') params.append('deliveryStatus', filters.deliveryStatus);
      if (filters?.month) params.append('month', filters.month.toString());
      if (filters?.year) params.append('year', filters.year.toString());

      const url = `/api/sms/logs?${params.toString()}`;
      const res = await fetch(url);
      if (res.ok) {
        return await res.json();
      }
    } catch (err) {
      console.warn('Could not fetch SMS logs from server:', err);
    }
    return [];
  },

  /**
   * Sends an admin-only test SMS to a verified resident
   */
  async sendTestSMS(residentId: string, customMessage?: string): Promise<{
    success: boolean;
    status: SMSDeliveryStatus;
    message: string;
    log?: SMSLog;
  }> {
    const res = await fetch('/api/sms/send-test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ residentId, customMessage })
    });
    return await res.json();
  },

  /**
   * Triggers the automated scheduled reminder batch check on demand
   */
  async runScheduledRemindersNow(month: number = 10, year: number = 2026): Promise<{
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
      reminderType?: SMSReminderType;
      reason: string;
      status: string;
    }>;
  }> {
    const res = await fetch('/api/sms/run-reminders', {
      method: 'POST',
      headers: await getAdminAuthHeaders(),
      body: JSON.stringify({ month, year })
    });
    return await res.json();
  },

  /**
   * Verifies server-side SMS configuration without sending any SMS
   */
  async checkAdminConfig(): Promise<AdminSmsConfigCheck> {
    try {
      const res = await fetch('/api/admin/sms/check-config', {
        headers: await getAdminAuthHeaders()
      });
      if (res.ok) {
        return await res.json();
      }
    } catch (err) {
      console.warn('Could not check admin SMS config:', err);
    }
    return {
      success: false,
      provider: 'Unknown',
      rawProvider: '',
      senderId: 'FINGEROFGOD',
      channel: 'generic',
      isConfigured: false,
      maskedApiKey: null,
      checks: {
        providerConfigured: false,
        apiKeyPresent: false,
        senderIdConfigured: false,
        channelConfigured: false
      },
      ready: false,
      checkedAt: new Date().toISOString()
    };
  },

  /**
   * Dispatches an administrator diagnostic test SMS to any specified Nigerian phone number
   */
  async sendAdminTestSms(testPhone: string, message: string): Promise<AdminSmsTestResult> {
    try {
      const res = await fetch('/api/admin/sms/test', {
        method: 'POST',
        headers: await getAdminAuthHeaders(),
        body: JSON.stringify({ testPhone, message })
      });
      return await res.json();
    } catch (err: any) {
      return {
        success: false,
        status: 'FAILED',
        deliveryLabel: 'Network Error',
        message: 'Could not connect to estate server for SMS test.',
        error: err?.message || 'Network error',
        provider: 'Gateway',
        senderId: 'FINGEROFGOD',
        recipientMasked: '234***',
        timestamp: new Date().toISOString()
      };
    }
  },

  /**
   * Retrieves recent administrator SMS diagnostic tests history
   */
  async getAdminTestHistory(): Promise<AdminSmsTestHistoryItem[]> {
    try {
      const res = await fetch('/api/admin/sms/test-history', {
        headers: await getAdminAuthHeaders()
      });
      if (res.ok) {
        const json = await res.json();
        return json.tests || [];
      }
    } catch (err) {
      console.warn('Could not fetch admin test history:', err);
    }
    return [];
  }
};
