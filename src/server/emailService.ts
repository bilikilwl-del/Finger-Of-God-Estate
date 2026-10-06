/**
 * Finger of God Estate Management System
 * Transactional Email Notification Service
 * 
 * Supports production transactional email dispatch for payment receipts,
 * account registration, security levy reminders, and estate announcements.
 * Fails safely without blocking financial transactions.
 */

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export interface PaymentReceiptEmailData {
  recipientEmail: string;
  recipientName: string;
  residentNumber: string;
  houseNumber: string;
  receiptNumber: string;
  paystackReference: string;
  amountPaid: number;
  periodCovered: string;
  paymentDate: string;
}

export interface ResidentWelcomeEmailData {
  recipientEmail: string;
  fullName: string;
  residentNumber: string;
  houseNumber: string;
  portalUrl: string;
}

export interface SecurityLevyReminderEmailData {
  recipientEmail: string;
  fullName: string;
  residentNumber: string;
  amountDue: number;
  periodLabel: string;
  paymentUrl: string;
}

class EmailService {
  private brevoApiKey: string;
  private fromEmail: string;
  private fromName: string;
  private isConfigured: boolean;

  constructor() {
    this.brevoApiKey = (process.env.BREVO_API_KEY || process.env.SENDINBLUE_API_KEY || '').trim();
    
    // Sender Name: prioritize BREVO_SENDER_NAME
    this.fromName = (process.env.BREVO_SENDER_NAME || 'Finger of God Estate').trim();

    // Sender Email: prioritize BREVO_SENDER_EMAIL
    const rawFrom = (process.env.BREVO_SENDER_EMAIL || process.env.FROM_EMAIL || process.env.EMAIL_FROM || '').trim();
    const match = rawFrom.match(/^(.*?)\s*<(.+?)>$/);
    if (match) {
      if (!process.env.BREVO_SENDER_NAME && match[1]) {
        this.fromName = match[1].trim().replace(/^["']|["']$/g, '');
      }
      this.fromEmail = match[2].trim();
    } else {
      this.fromEmail = rawFrom || 'notifications@fingerofgodestate.ng';
    }

    this.isConfigured = Boolean(this.brevoApiKey && !this.brevoApiKey.includes('xxxx') && this.brevoApiKey.length > 10);
  }

  public getStatus() {
    return {
      isConfigured: this.isConfigured,
      fromEmail: this.fromEmail,
      fromName: this.fromName,
      provider: this.isConfigured ? 'brevo' : 'none'
    };
  }

  /**
   * Dispatches an email via Brevo transactional API (https://api.brevo.com/v3/smtp/email)
   */
  async sendEmail(options: EmailOptions & { recipientName?: string }): Promise<{ success: boolean; messageId?: string; error?: string; status?: 'SENT' | 'FAILED' | 'NOT_CONFIGURED' }> {
    if (!options.to || !options.to.includes('@')) {
      return { success: false, status: 'FAILED', error: 'Invalid recipient email address' };
    }

    const cleanTo = options.to.trim().toLowerCase();

    // Check configuration
    if (!this.isConfigured) {
      console.warn(`[Brevo Email Notice] Brevo API Key not configured. Simulated dispatch to ${cleanTo.replace(/^(.{2})(.*)(@.*)$/, '$1***$3')}`);
      return {
        success: false,
        status: 'NOT_CONFIGURED',
        error: 'BREVO_API_KEY is not configured in server environment.'
      };
    }

    try {
      const response = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'api-key': this.brevoApiKey,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          sender: {
            name: this.fromName,
            email: this.fromEmail
          },
          to: [
            {
              email: cleanTo,
              name: options.recipientName || 'Resident'
            }
          ],
          subject: options.subject,
          htmlContent: options.html,
          textContent: options.text || options.html.replace(/<[^>]*>?/gm, '')
        })
      });

      const data = await response.json().catch(() => ({}));
      if (response.ok && (data.messageId || data.messageIds)) {
        const msgId = data.messageId || (Array.isArray(data.messageIds) ? data.messageIds[0] : 'brevo-sent');
        const masked = cleanTo.replace(/^(.{2})(.*)(@.*)$/, '$1***$3');
        console.log(`[Brevo Email Success] Dispatched email to ${masked}. Message ID: ${msgId}`);
        return { success: true, status: 'SENT', messageId: String(msgId) };
      } else {
        const errMessage = data.message || data.error || `HTTP ${response.status} from Brevo`;
        console.warn('[Brevo Email Failed] Provider response:', data);
        return { success: false, status: 'FAILED', error: `Brevo error: ${errMessage}` };
      }
    } catch (err: any) {
      console.error('[Brevo Network Error]', err?.message || err);
      return { success: false, status: 'FAILED', error: `Network error connecting to Brevo: ${err?.message || err}` };
    }
  }

  /**
   * OTP Verification Email (dual-channel delivery with SMS)
   */
  async sendOtpEmail(to: string, residentName: string, otpCode: string, type: 'LOGIN' | 'ACTIVATION' = 'LOGIN') {
    const actionLabel = type === 'ACTIVATION' ? 'Account Activation' : 'Portal Login';
    const html = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 580px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden;">
        <div style="background: #0f172a; padding: 24px; text-align: center; color: #ffffff;">
          <h2 style="margin: 0; font-size: 20px; font-weight: 800; letter-spacing: 0.5px;">FINGER OF GOD ESTATE</h2>
          <p style="margin: 4px 0 0; font-size: 12px; color: #94a3b8;">Resident Portal Security Verification</p>
        </div>
        <div style="padding: 32px 24px;">
          <p style="font-size: 14px; color: #334155; margin: 0 0 16px;">Dear <strong>${residentName}</strong>,</p>
          <p style="font-size: 13px; color: #475569; line-height: 1.6; margin: 0 0 20px;">
            Here is your 6-digit one-time verification code for <strong>${actionLabel}</strong> on the Finger of God Estate Resident Portal:
          </p>
          <div style="background: #f8fafc; border: 2px dashed #cbd5e1; border-radius: 12px; padding: 20px; text-align: center; margin-bottom: 24px;">
            <span style="font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 1.5px; display: block; margin-bottom: 8px;">Your Verification Code</span>
            <div style="font-family: monospace, Courier, monospace; font-size: 36px; font-weight: 800; letter-spacing: 8px; color: #047857;">
              ${otpCode}
            </div>
            <span style="font-size: 12px; color: #94a3b8; display: block; margin-top: 8px;">Expires in 10 minutes</span>
          </div>
          <p style="font-size: 12px; color: #64748b; line-height: 1.5; margin: 0 0 12px;">
            This same code was also dispatched via SMS to your registered telephone number. You only need to enter this code once to proceed.
          </p>
          <p style="font-size: 11px; color: #94a3b8; margin: 0;">
            If you did not request this verification, please contact estate security administration immediately.
          </p>
        </div>
        <div style="background: #f8fafc; padding: 16px; text-align: center; border-top: 1px solid #e2e8f0; font-size: 11px; color: #94a3b8;">
          Finger of God Estate • Main Gate Boulevard, Phase 1, Asaba, Delta State
        </div>
      </div>
    `;

    return this.sendEmail({
      to,
      recipientName: residentName,
      subject: `Finger of God Estate: Your Verification Code is ${otpCode}`,
      html,
      text: `Dear ${residentName},\n\nYour Finger of God Estate verification code is ${otpCode}. It expires in 10 minutes.\n\nFinger of God Estate Management`
    });
  }

  /**
   * Official Digital Receipt Email Template
   */
  async sendPaymentReceipt(data: PaymentReceiptEmailData) {
    const formattedAmount = `₦${data.amountPaid.toLocaleString()}`;
    const html = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden;">
        <div style="background: #0f172a; padding: 24px; text-align: center; color: #ffffff;">
          <h2 style="margin: 0; font-size: 20px; font-weight: 800; letter-spacing: 0.5px;">FINGER OF GOD ESTATE</h2>
          <p style="margin: 4px 0 0; font-size: 12px; color: #94a3b8;">Security Management & Official Digital Receipt</p>
        </div>
        <div style="padding: 32px 24px;">
          <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 12px; padding: 16px; text-align: center; margin-bottom: 24px;">
            <span style="font-size: 11px; font-weight: 700; color: #166534; text-transform: uppercase; letter-spacing: 1px;">Payment Verified & Confirmed</span>
            <div style="font-size: 32px; font-weight: 900; color: #15803d; margin: 6px 0;">${formattedAmount}</div>
            <span style="font-size: 12px; color: #4b5563;">Period Covered: <strong>${data.periodCovered}</strong></span>
          </div>

          <table style="width: 100%; border-collapse: collapse; font-size: 13px; margin-bottom: 24px;">
            <tr style="border-bottom: 1px solid #f1f5f9;">
              <td style="padding: 10px 0; color: #64748b;">Receipt Number:</td>
              <td style="padding: 10px 0; font-weight: 700; text-align: right; font-family: monospace; color: #0f172a;">${data.receiptNumber}</td>
            </tr>
            <tr style="border-bottom: 1px solid #f1f5f9;">
              <td style="padding: 10px 0; color: #64748b;">Resident Details:</td>
              <td style="padding: 10px 0; font-weight: 600; text-align: right; color: #0f172a;">${data.recipientName} (No: ${data.residentNumber})</td>
            </tr>
            <tr style="border-bottom: 1px solid #f1f5f9;">
              <td style="padding: 10px 0; color: #64748b;">House / Plot:</td>
              <td style="padding: 10px 0; font-weight: 600; text-align: right; color: #0f172a;">${data.houseNumber}</td>
            </tr>
            <tr style="border-bottom: 1px solid #f1f5f9;">
              <td style="padding: 10px 0; color: #64748b;">Paystack Reference:</td>
              <td style="padding: 10px 0; font-family: monospace; text-align: right; color: #0f172a;">${data.paystackReference}</td>
            </tr>
            <tr>
              <td style="padding: 10px 0; color: #64748b;">Date & Time:</td>
              <td style="padding: 10px 0; font-weight: 600; text-align: right; color: #0f172a;">${new Date(data.paymentDate).toLocaleString('en-GB')}</td>
            </tr>
          </table>

          <p style="font-size: 12px; color: #64748b; line-height: 1.5; margin: 0; text-align: center;">
            This is an official cryptographic receipt generated by the Finger of God Estate Administration Console. You can verify this receipt anytime on the estate portal using your receipt number.
          </p>
        </div>
        <div style="background: #f8fafc; padding: 16px; text-align: center; border-top: 1px solid #e2e8f0; font-size: 11px; color: #94a3b8;">
          Finger of God Estate • Main Gate Boulevard, Phase 1, Asaba, Delta State
        </div>
      </div>
    `;

    return this.sendEmail({
      to: data.recipientEmail,
      subject: `Official Security Levy Receipt: ${data.receiptNumber} (${data.periodCovered})`,
      html
    });
  }

  /**
   * Welcome & Account Registration Confirmation Email
   */
  async sendResidentWelcome(data: ResidentWelcomeEmailData) {
    const html = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; padding: 24px;">
        <div style="text-align: center; margin-bottom: 20px;">
          <h2 style="margin: 0; font-size: 20px; font-weight: 800; color: #0f172a;">Welcome to Finger of God Estate</h2>
          <p style="margin: 4px 0 0; font-size: 12px; color: #64748b;">Official Resident Onboarding & Verification</p>
        </div>
        <p style="font-size: 14px; color: #334155;">Dear <strong>${data.fullName}</strong>,</p>
        <p style="font-size: 13px; color: #475569; line-height: 1.6;">
          Your resident profile has been successfully registered on the Finger of God Estate management platform.
        </p>
        <div style="background: #f1f5f9; border-radius: 12px; padding: 16px; margin: 20px 0;">
          <p style="margin: 0 0 8px; font-size: 13px;"><strong>Your Resident Number:</strong> <span style="font-family: monospace; font-size: 16px; color: #047857; font-weight: 800;">${data.residentNumber}</span></p>
          <p style="margin: 0; font-size: 13px;"><strong>Assigned Residence:</strong> ${data.houseNumber}</p>
        </div>
        <p style="font-size: 13px; color: #475569; line-height: 1.6;">
          You can use your Resident Number and registered phone number to activate your portal account, pay the monthly ₦5,000 security levy, download verified receipts, and request visitor gate passes.
        </p>
        <div style="text-align: center; margin: 24px 0;">
          <a href="${data.portalUrl}" style="background: #047857; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 10px; font-weight: 700; font-size: 13px; display: inline-block;">
            Access Resident Portal
          </a>
        </div>
        <p style="font-size: 11px; color: #94a3b8; text-align: center; margin-top: 24px;">
          Finger of God Estate Management • Asaba, Delta State
        </p>
      </div>
    `;

    return this.sendEmail({
      to: data.recipientEmail,
      subject: `Welcome to Finger of God Estate — Resident #${data.residentNumber}`,
      html
    });
  }
}

export const emailService = new EmailService();
