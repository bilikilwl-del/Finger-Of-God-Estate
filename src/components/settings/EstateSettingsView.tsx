import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  MapPin, 
  ShieldCheck, 
  Calendar, 
  CreditCard, 
  Phone, 
  Mail, 
  MessageSquare, 
  Save, 
  Check, 
  AlertCircle,
  Database
} from 'lucide-react';
import { EstateSettings } from '../../types/database';
import { NIGERIAN_STATES_LGAS } from '../../data/nigerianStates';
import { dbService } from '../../lib/supabase';

interface EstateSettingsViewProps {
  settings: EstateSettings;
  onSettingsUpdated: (updated: EstateSettings) => void;
  adminEmail: string;
}

export const EstateSettingsView: React.FC<EstateSettingsViewProps> = ({
  settings,
  onSettingsUpdated,
  adminEmail
}) => {
  const [estateName, setEstateName] = useState(settings.estate_name);
  const [estateAddress, setEstateAddress] = useState(settings.estate_address);
  const [estateState, setEstateState] = useState(settings.estate_state);
  const [estateLga, setEstateLga] = useState(settings.estate_lga);
  const [monthlyLevy, setMonthlyLevy] = useState(settings.monthly_security_levy.toString());
  const [paymentDueDay, setPaymentDueDay] = useState(settings.payment_due_day.toString());
  const [currency, setCurrency] = useState(settings.currency);
  const [contactPhone, setContactPhone] = useState(settings.contact_phone);
  const [contactEmail, setContactEmail] = useState(settings.contact_email);
  const [smsSenderName, setSmsSenderName] = useState(settings.sms_sender_name);
  const [firstPaymentMonth, setFirstPaymentMonth] = useState(settings.first_payment_month || 'October 2026');

  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [lgaList, setLgaList] = useState<string[]>([]);

  useEffect(() => {
    const found = NIGERIAN_STATES_LGAS.find(s => s.state.toLowerCase() === estateState.toLowerCase());
    if (found) {
      setLgaList(found.lgas);
      if (!found.lgas.includes(estateLga)) {
        setEstateLga(found.lgas[0] || '');
      }
    } else {
      setLgaList([]);
    }
  }, [estateState]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaveSuccess(false);
    setErrorMessage(null);

    const parsedLevy = parseFloat(monthlyLevy);
    const parsedDueDay = parseInt(paymentDueDay, 10);

    if (isNaN(parsedLevy) || parsedLevy <= 0) {
      setErrorMessage('Monthly security levy must be a valid positive amount.');
      setSaving(false);
      return;
    }

    if (isNaN(parsedDueDay) || parsedDueDay < 1 || parsedDueDay > 28) {
      setErrorMessage('Payment due day must be between 1 and 28.');
      setSaving(false);
      return;
    }

    if (!estateName.trim()) {
      setErrorMessage('Estate name is required.');
      setSaving(false);
      return;
    }

    try {
      const updated = await dbService.updateSettings(
        {
          estate_name: estateName.trim(),
          estate_address: estateAddress.trim(),
          estate_state: estateState,
          estate_lga: estateLga,
          monthly_security_levy: parsedLevy,
          payment_due_day: parsedDueDay,
          currency: currency.trim(),
          contact_phone: contactPhone.trim(),
          contact_email: contactEmail.trim(),
          sms_sender_name: smsSenderName.trim().toUpperCase(),
          first_payment_month: firstPaymentMonth.trim()
        },
        adminEmail
      );

      onSettingsUpdated(updated);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      console.error('Failed to update settings:', err);
      setErrorMessage(err.message || 'Failed to update estate settings.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-4xl space-y-6">
      {/* Intro Header */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center text-white">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-display font-bold text-lg text-slate-900">Estate & Security Configuration</h3>
            <p className="text-xs text-slate-500">
              Configure estate parameters, billing schedule, and communication identifiers
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {errorMessage && (
          <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-3 text-xs text-rose-800">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        {saveSuccess && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-3 text-xs text-emerald-800">
            <Check className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="font-semibold">Estate settings successfully updated in the database.</span>
          </div>
        )}

        {/* Section 1: General Estate Info */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs space-y-4">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2 border-b border-slate-100 pb-3">
            <Building2 className="w-4 h-4 text-emerald-600" />
            Estate Identification & Location
          </h4>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Estate Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={estateName}
                onChange={(e) => setEstateName(e.target.value)}
                placeholder="e.g. Palm Grove Residential Estate"
                required
                className="w-full px-3.5 py-2 rounded-lg border border-slate-300 text-sm text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Estate Address <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  value={estateAddress}
                  onChange={(e) => setEstateAddress(e.target.value)}
                  placeholder="e.g. Plot 10-14, Security Gate Avenue, Phase 2"
                  required
                  className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-300 text-sm text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                State <span className="text-rose-500">*</span>
              </label>
              <select
                value={estateState}
                onChange={(e) => setEstateState(e.target.value)}
                required
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm text-slate-900 bg-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
              >
                {NIGERIAN_STATES_LGAS.map((s) => (
                  <option key={s.state} value={s.state}>
                    {s.state}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                LGA <span className="text-rose-500">*</span>
              </label>
              <select
                value={estateLga}
                onChange={(e) => setEstateLga(e.target.value)}
                required
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm text-slate-900 bg-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
              >
                {lgaList.map((lga) => (
                  <option key={lga} value={lga}>
                    {lga}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Section 2: Security Levy Financial Rules */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs space-y-4">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2 border-b border-slate-100 pb-3">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            Security Levy & Billing Cadence
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Monthly Security Levy (₦) <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 font-bold text-slate-500 text-sm">₦</span>
                <input
                  type="number"
                  value={monthlyLevy}
                  onChange={(e) => setMonthlyLevy(e.target.value)}
                  min="500"
                  step="100"
                  required
                  className="w-full pl-8 pr-3 py-2 rounded-lg border border-slate-300 text-sm font-mono font-bold text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                />
              </div>
              <p className="text-[11px] text-slate-500 mt-1">Default rate: ₦5,000 / month</p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Payment Due Day <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="number"
                  value={paymentDueDay}
                  onChange={(e) => setPaymentDueDay(e.target.value)}
                  min="1"
                  max="28"
                  required
                  className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-300 text-sm font-mono text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                />
              </div>
              <p className="text-[11px] text-slate-500 mt-1">Day of month (Default: Day 1)</p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                First Payment Month <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={firstPaymentMonth}
                onChange={(e) => setFirstPaymentMonth(e.target.value)}
                placeholder="e.g. October 2026"
                required
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm font-semibold text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
              />
              <p className="text-[11px] text-slate-500 mt-1">Levy ledger commencement</p>
            </div>
          </div>
        </div>

        {/* Section 3: Contact & SMS Sender */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs space-y-4">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2 border-b border-slate-100 pb-3">
            <MessageSquare className="w-4 h-4 text-emerald-600" />
            Contact & SMS Channel Settings
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Contact Phone <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="tel"
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                  placeholder="08012345678"
                  required
                  className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-300 text-sm font-mono text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Contact Email <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="email"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  placeholder="admin@palmgroveestate.ng"
                  required
                  className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-300 text-sm text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                SMS Sender Name (Max 11 Chars)
              </label>
              <input
                type="text"
                value={smsSenderName}
                onChange={(e) => setSmsSenderName(e.target.value.slice(0, 11).toUpperCase())}
                placeholder="PALMGROVE"
                maxLength={11}
                required
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm font-mono uppercase font-bold text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
              />
              <p className="text-[11px] text-slate-500 mt-1">Used for Stage 3 reminders</p>
            </div>
          </div>
        </div>

        {/* Submit Bar */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold shadow-xs transition-colors flex items-center gap-2 disabled:opacity-50"
          >
            {saving ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            <span>Save Estate Settings</span>
          </button>
        </div>
      </form>
    </div>
  );
};
