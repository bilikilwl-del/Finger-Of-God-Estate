import React from 'react';
import { 
  ArrowLeft, 
  Shield, 
  Phone, 
  Mail, 
  Home, 
  MapPin, 
  Calendar, 
  CheckCircle2, 
  XCircle, 
  Edit3, 
  UserCheck, 
  UserX, 
  Printer, 
  QrCode, 
  CreditCard, 
  Clock, 
  FileText,
  AlertCircle,
  Building,
  PhoneCall
} from 'lucide-react';
import { Resident, EstateSettings } from '../../types/database';

interface ResidentProfileViewProps {
  resident: Resident;
  estateSettings: EstateSettings;
  onBack: () => void;
  onEdit: (resident: Resident) => void;
  onToggleStatus: (resident: Resident) => void;
}

export const ResidentProfileView: React.FC<ResidentProfileViewProps> = ({
  resident,
  estateSettings,
  onBack,
  onEdit,
  onToggleStatus
}) => {
  const isSuspended = resident.status === 'Inactive';

  const handlePrintBadge = () => {
    window.print();
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Top Breadcrumb & Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-white px-3 py-2 rounded-xl border border-slate-200/80 shadow-2xs hover:border-slate-300 transition-colors w-fit"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Resident Directory</span>
        </button>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => onToggleStatus(resident)}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold border transition-all flex items-center gap-1.5 shadow-2xs ${
              resident.status === 'Active'
                ? 'bg-white border-amber-300 text-amber-800 hover:bg-amber-50'
                : 'bg-emerald-600 border-emerald-600 text-white hover:bg-emerald-700'
            }`}
          >
            {resident.status === 'Active' ? (
              <>
                <UserX className="w-3.5 h-3.5" />
                <span>Deactivate Resident</span>
              </>
            ) : (
              <>
                <UserCheck className="w-3.5 h-3.5" />
                <span>Activate Resident</span>
              </>
            )}
          </button>

          <button
            onClick={handlePrintBadge}
            className="px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold transition-colors flex items-center gap-1.5 shadow-2xs"
          >
            <Printer className="w-3.5 h-3.5 text-slate-500" />
            <span>Print Badge</span>
          </button>

          <button
            onClick={() => onEdit(resident)}
            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition-colors flex items-center gap-1.5 shadow-2xs"
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>Edit Profile</span>
          </button>
        </div>
      </div>

      {/* Main Resident Header Card */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start gap-4 sm:gap-5">
            {/* Resident Badge Number Avatar */}
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-slate-900 text-emerald-400 border-2 border-slate-800 flex flex-col items-center justify-center font-mono font-bold shadow-md shrink-0">
              <span className="text-[10px] text-slate-400 uppercase tracking-widest font-sans font-semibold">ID NO</span>
              <span className="text-xl sm:text-2xl tracking-wider text-white font-extrabold">{resident.resident_number}</span>
            </div>

            <div>
              <div className="flex flex-wrap items-center gap-2.5 mb-1.5">
                <h1 className="font-display font-bold text-xl sm:text-2xl text-slate-900 tracking-tight">
                  {resident.full_name}
                </h1>
                <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider ${
                  resident.status === 'Active'
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                    : 'bg-slate-100 text-slate-600 border border-slate-200'
                }`}>
                  {resident.status === 'Active' ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  ) : (
                    <XCircle className="w-3.5 h-3.5 text-slate-400" />
                  )}
                  {resident.status}
                </span>
              </div>

              <p className="text-xs sm:text-sm text-slate-500 flex items-center gap-2">
                <span className="font-semibold text-slate-800">{resident.house_number}</span>
                <span>·</span>
                <span>{resident.address}</span>
              </p>

              <div className="text-[11px] text-slate-400 mt-2 flex items-center gap-2 font-mono">
                <span>Registered: {resident.registration_date}</span>
                <span>·</span>
                <span>Finger of God Estate Security Registry</span>
              </div>
            </div>
          </div>

          {/* Monthly Levy Status Indicator */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 shrink-0 md:min-w-[240px]">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
              Monthly Security Levy
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-sm font-semibold text-slate-500">₦</span>
              <span className="text-2xl font-bold font-mono text-slate-900 tabular-nums">
                {estateSettings.monthly_security_levy.toLocaleString()}
              </span>
              <span className="text-xs text-slate-400">/month</span>
            </div>
            <div className="mt-2 text-[11px] flex items-center gap-1.5 text-emerald-700 font-medium">
              <Clock className="w-3.5 h-3.5 shrink-0" />
              <span>Billing Cycle Starts {estateSettings.first_payment_month}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Grid: Details & Official Security Pass */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Comprehensive Resident Info (2 Cols) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Contact & Location Details Card */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-6">
            <h2 className="font-display font-bold text-base text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2">
              <Building className="w-4 h-4 text-emerald-600" />
              <span>Resident Demographic & Property Record</span>
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="p-4 bg-slate-50/80 rounded-2xl border border-slate-200/60">
                <span className="text-slate-400 block font-medium mb-1">Primary Phone Number</span>
                <a 
                  href={`tel:${resident.phone_number}`}
                  className="font-mono text-sm font-bold text-slate-900 hover:text-emerald-600 transition-colors flex items-center gap-2"
                >
                  <Phone className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{resident.phone_number}</span>
                </a>
              </div>

              <div className="p-4 bg-slate-50/80 rounded-2xl border border-slate-200/60">
                <span className="text-slate-400 block font-medium mb-1">Additional Contact Phone</span>
                {resident.additional_phone ? (
                  <a 
                    href={`tel:${resident.additional_phone}`}
                    className="font-mono text-sm font-semibold text-slate-800 hover:text-emerald-600 transition-colors flex items-center gap-2"
                  >
                    <PhoneCall className="w-4 h-4 text-slate-400 shrink-0" />
                    <span>{resident.additional_phone}</span>
                  </a>
                ) : (
                  <span className="text-slate-400 italic">None provided</span>
                )}
              </div>

              <div className="p-4 bg-slate-50/80 rounded-2xl border border-slate-200/60">
                <span className="text-slate-400 block font-medium mb-1">Email Address</span>
                {resident.email ? (
                  <a 
                    href={`mailto:${resident.email}`}
                    className="font-medium text-slate-800 hover:text-emerald-600 transition-colors flex items-center gap-2 break-all"
                  >
                    <Mail className="w-4 h-4 text-slate-400 shrink-0" />
                    <span>{resident.email}</span>
                  </a>
                ) : (
                  <span className="text-slate-400 italic">No email on record</span>
                )}
              </div>

              <div className="p-4 bg-slate-50/80 rounded-2xl border border-slate-200/60">
                <span className="text-slate-400 block font-medium mb-1">House / Plot Identifier</span>
                <div className="font-bold text-slate-900 text-sm flex items-center gap-2">
                  <Home className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{resident.house_number}</span>
                </div>
              </div>

              <div className="p-4 bg-slate-50/80 rounded-2xl border border-slate-200/60 sm:col-span-2">
                <span className="text-slate-400 block font-medium mb-1">Street Address</span>
                <div className="font-medium text-slate-800 text-sm flex items-start gap-2">
                  <MapPin className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                  <div>
                    <div>{resident.address}</div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      LGA: <strong>{resident.lga}</strong> · State: <strong>{resident.state}</strong>
                    </div>
                  </div>
                </div>
              </div>

              {resident.notes && (
                <div className="p-4 bg-amber-50/60 rounded-2xl border border-amber-200/70 sm:col-span-2">
                  <span className="text-amber-800 block font-bold text-[11px] uppercase tracking-wider mb-1 flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-amber-700" />
                    Administrative Notes
                  </span>
                  <p className="text-xs text-amber-900 leading-relaxed">
                    {resident.notes}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Payment Status & Stage 2 Ledger Module */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-emerald-600" />
                <h3 className="font-display font-bold text-base text-slate-900">Security Levy Payment Ledger</h3>
              </div>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-semibold">
                Starts {estateSettings.first_payment_month}
              </span>
            </div>

            {/* Current Month Status Box */}
            <div className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800 block">
                  Current Billing Status
                </span>
                <p className="text-xs font-semibold text-emerald-950 mt-0.5">
                  Account in Good Standing · Scheduled for {estateSettings.first_payment_month}
                </p>
                <p className="text-[11px] text-emerald-800 mt-1">
                  Monthly levy obligation: ₦{estateSettings.monthly_security_levy.toLocaleString()} per household due on day {estateSettings.payment_due_day}.
                </p>
              </div>

              <div className="px-3 py-1.5 rounded-xl bg-white border border-emerald-300 text-emerald-800 font-mono font-bold text-xs shrink-0 self-start sm:self-auto">
                NOT YET DUE
              </div>
            </div>

            {/* Historical Payment Placeholder (Stage 2) */}
            <div className="p-6 bg-slate-50/60 rounded-2xl border border-dashed border-slate-200 text-center">
              <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-2">
                <CreditCard className="w-5 h-5" />
              </div>
              <h4 className="text-xs font-bold text-slate-700">Payment Transactions Ledger</h4>
              <p className="text-[11px] text-slate-500 max-w-md mx-auto mt-1">
                Verified payment receipts, Paystack online settlements, and bank transfer confirmations will automatically synchronize here once billing tracking commences in October 2026.
              </p>
            </div>
          </div>
        </div>

        {/* Right Column: Printable Security Badge Card (1 Col) */}
        <div className="space-y-6">
          <div className="bg-slate-900 text-white rounded-3xl p-6 border border-slate-800 shadow-xl relative overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center text-white">
                  <Shield className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-display font-bold text-xs text-white leading-tight">
                    FINGER OF GOD ESTATE
                  </h3>
                  <p className="text-[10px] text-emerald-400 font-medium">Security Access Pass</p>
                </div>
              </div>
              <div className="font-mono text-xl font-black text-emerald-400">
                #{resident.resident_number}
              </div>
            </div>

            <div className="space-y-3 mb-6">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Resident Name</span>
                <span className="text-sm font-bold text-white tracking-wide block">{resident.full_name}</span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Plot / House</span>
                  <span className="font-semibold text-slate-200">{resident.house_number}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Status</span>
                  <span className={`font-semibold ${resident.status === 'Active' ? 'text-emerald-400' : 'text-slate-400'}`}>
                    {resident.status}
                  </span>
                </div>
              </div>

              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Address</span>
                <span className="text-xs text-slate-300 block truncate">{resident.address}</span>
              </div>
            </div>

            {/* QR Pattern Preview */}
            <div className="p-3 bg-slate-800/90 rounded-2xl border border-slate-700/80 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <QrCode className="w-10 h-10 text-slate-300" />
                <div>
                  <div className="text-[11px] font-mono text-emerald-400 font-bold">PASS VERIFIED</div>
                  <div className="text-[10px] text-slate-400">Gate Access Authority</div>
                </div>
              </div>
              <button
                onClick={handlePrintBadge}
                className="px-2.5 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-white text-[11px] font-semibold transition-colors flex items-center gap-1"
              >
                <Printer className="w-3 h-3" />
                <span>Print</span>
              </button>
            </div>
          </div>

          {/* Quick System Record Card */}
          <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs space-y-3 text-xs">
            <h3 className="font-display font-bold text-sm text-slate-900">Security Audit Metadata</h3>
            <div className="space-y-2 text-slate-600">
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-400">Internal ID</span>
                <span className="font-mono text-slate-900 font-medium truncate max-w-[140px]">{resident.id}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-400">Created At</span>
                <span className="font-mono text-slate-900">{new Date(resident.created_at).toLocaleDateString()}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-400">Last Updated</span>
                <span className="font-mono text-slate-900">{new Date(resident.updated_at).toLocaleDateString()}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
