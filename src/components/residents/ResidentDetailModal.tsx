import React, { useRef, useState } from 'react';
import { X, Shield, Phone, Mail, Home, MapPin, Calendar, CheckCircle2, User, Printer, QrCode, XCircle, Loader2 } from 'lucide-react';
import { Resident, EstateSettings } from '../../types/database';
import { ResidentPhotoAvatar, LivenessStatusBadge } from '../common/ResidentPhotoAvatar';
import { dbService } from '../../lib/supabase';

interface ResidentDetailModalProps {
  resident: Resident | null;
  estateSettings: EstateSettings;
  isOpen: boolean;
  onClose: () => void;
  onEdit: (resident: Resident) => void;
  onToggleStatus: (resident: Resident) => void;
}

export const ResidentDetailModal: React.FC<ResidentDetailModalProps> = ({
  resident,
  estateSettings,
  isOpen,
  onClose,
  onEdit,
  onToggleStatus
}) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const [localResident, setLocalResident] = useState<Resident | null>(resident);
  const [reviewLoading, setReviewLoading] = useState(false);
  const [reviewFeedback, setReviewFeedback] = useState<string | null>(null);

  React.useEffect(() => {
    setLocalResident(resident);
    setReviewFeedback(null);
  }, [resident]);

  const activeResident = localResident || resident;
  if (!isOpen || !activeResident) return null;

  const handlePrintCard = () => {
    window.print();
  };

  const handleAdminManualReview = async (decision: 'APPROVE' | 'REJECT') => {
    setReviewLoading(true);
    setReviewFeedback(null);
    try {
      const res = await dbService.submitAdminLivenessReview({
        residentNumber: activeResident.resident_number,
        decision,
        sessionId: activeResident.liveness_session_id || undefined,
        notes:
          decision === 'APPROVE'
            ? 'Manually reviewed and approved by Estate Administrator.'
            : 'Rejected during Estate Administrator manual review.'
      });
      if (res.success && res.resident) {
        setLocalResident(res.resident);
        setReviewFeedback(res.message || `Manual review ${decision.toLowerCase()}d.`);
      } else {
        setReviewFeedback(res.message || 'Unable to process manual review decision.');
      }
    } finally {
      setReviewLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full my-8 border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="p-5 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <ResidentPhotoAvatar
              residentNumber={activeResident.resident_number}
              fullName={activeResident.full_name}
              hasProfilePhoto={Boolean(activeResident.has_profile_photo || activeResident.profile_photo_uploaded_at)}
              viewerRole="admin"
              size="md"
              allowFullPreview={true}
              refreshKey={activeResident.profile_photo_uploaded_at}
            />
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-extrabold px-2 py-0.5 rounded bg-emerald-600 text-white">
                  #{activeResident.resident_number}
                </span>
                <h2 className="font-display text-lg font-bold">{activeResident.full_name}</h2>
              </div>
              <p className="text-xs text-slate-400">Resident Identification &amp; Biometric Security Record</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6 space-y-6">
          {/* Liveness Verification & Profile Photo Summary Banner */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <ResidentPhotoAvatar
                  residentNumber={activeResident.resident_number}
                  fullName={activeResident.full_name}
                  hasProfilePhoto={Boolean(activeResident.has_profile_photo || activeResident.profile_photo_uploaded_at)}
                  viewerRole="admin"
                  size="lg"
                  allowFullPreview={true}
                  refreshKey={activeResident.profile_photo_uploaded_at}
                />
                <div className="space-y-1">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    Biometric Liveness &amp; Photo Verification
                  </div>
                  <LivenessStatusBadge
                    status={activeResident.liveness_status}
                    verifiedAt={activeResident.liveness_verified_at}
                  />
                  {activeResident.liveness_verified_at && (
                    <div className="text-[11px] font-mono text-slate-500">
                      Timestamp: {new Date(activeResident.liveness_verified_at).toLocaleString('en-NG')}
                    </div>
                  )}
                </div>
              </div>

              {activeResident.liveness_status === 'PENDING_MANUAL_REVIEW' && (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={reviewLoading}
                    onClick={() => handleAdminManualReview('APPROVE')}
                    className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1 cursor-pointer disabled:opacity-50"
                  >
                    {reviewLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                    <span>Approve Manual Review</span>
                  </button>
                  <button
                    type="button"
                    disabled={reviewLoading}
                    onClick={() => handleAdminManualReview('REJECT')}
                    className="px-3 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-300 text-xs font-bold flex items-center gap-1 cursor-pointer disabled:opacity-50"
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    <span>Reject</span>
                  </button>
                </div>
              )}
            </div>

            {reviewFeedback && (
              <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 font-semibold">
                {reviewFeedback}
              </div>
            )}
          </div>

          {/* Printable Estate Resident ID Card */}
          <div 
            ref={cardRef}
            className="relative bg-linear-to-br from-slate-900 via-slate-850 to-slate-900 text-white rounded-2xl p-5 border border-slate-700/60 shadow-lg overflow-hidden"
          >
            {/* Background watermarked emblem */}
            <div className="absolute -right-6 -bottom-6 opacity-10 pointer-events-none">
              <Shield className="w-48 h-48 text-white" />
            </div>

            <div className="flex items-center justify-between border-b border-slate-700/60 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-emerald-500 flex items-center justify-center text-white">
                  <Shield className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-display font-bold text-sm text-white leading-none">
                    {estateSettings.estate_name}
                  </h3>
                  <p className="text-[10px] text-emerald-400 font-medium mt-0.5">
                    Official Resident Security Badge
                  </p>
                </div>
              </div>
              <div className="text-right">
                <span className="font-mono text-xl font-extrabold text-emerald-400 tracking-wider">
                  #{activeResident.resident_number}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 mb-4">
              <div className="col-span-2 space-y-2">
                <div>
                  <div className="text-[10px] uppercase font-bold text-slate-400">Resident Name</div>
                  <div className="text-sm font-bold text-white tracking-wide">{activeResident.full_name}</div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <div className="text-[10px] uppercase font-bold text-slate-400">Plot / House</div>
                    <div className="text-xs font-semibold text-slate-200">{activeResident.house_number}</div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase font-bold text-slate-400">Reg. Date</div>
                    <div className="text-xs font-mono text-slate-200">{activeResident.registration_date}</div>
                  </div>
                </div>
              </div>

              {/* QR / Security Pattern placeholder */}
              <div className="flex flex-col items-center justify-center p-2 rounded-xl bg-slate-800/80 border border-slate-700">
                <QrCode className="w-12 h-12 text-slate-300" />
                <span className="text-[9px] font-mono text-slate-400 mt-1">ID VERIFIED</span>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-700/50 flex items-center justify-between text-[11px]">
              <span className="text-slate-400 truncate max-w-[200px]">
                {activeResident.address}
              </span>
              <span className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider ${
                activeResident.status === 'Active' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-slate-700 text-slate-300'
              }`}>
                {activeResident.status}
              </span>
            </div>
          </div>

          {/* Detailed Info Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-start gap-3">
              <Phone className="w-4 h-4 text-slate-500 mt-0.5 shrink-0" />
              <div>
                <span className="text-slate-500 block font-medium">Primary Phone</span>
                <a 
                  href={`tel:${activeResident.phone_number}`}
                  className="font-mono text-sm font-semibold text-slate-900 hover:text-emerald-600 transition-colors"
                >
                  {activeResident.phone_number}
                </a>
              </div>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-start gap-3">
              <Phone className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
              <div>
                <span className="text-slate-500 block font-medium">Alt Phone</span>
                {activeResident.additional_phone ? (
                  <a 
                    href={`tel:${activeResident.additional_phone}`}
                    className="font-mono text-sm font-semibold text-slate-800 hover:text-emerald-600 transition-colors"
                  >
                    {activeResident.additional_phone}
                  </a>
                ) : (
                  <span className="text-slate-400 italic">None provided</span>
                )}
              </div>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-start gap-3">
              <Mail className="w-4 h-4 text-slate-500 mt-0.5 shrink-0" />
              <div>
                <span className="text-slate-500 block font-medium">Email Address</span>
                {activeResident.email ? (
                  <a 
                    href={`mailto:${activeResident.email}`}
                    className="font-semibold text-slate-900 hover:text-emerald-600 transition-colors break-all"
                  >
                    {activeResident.email}
                  </a>
                ) : (
                  <span className="text-slate-400 italic">Not specified</span>
                )}
              </div>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-start gap-3">
              <Home className="w-4 h-4 text-slate-500 mt-0.5 shrink-0" />
              <div>
                <span className="text-slate-500 block font-medium">Plot / House Number</span>
                <span className="font-semibold text-slate-900">{activeResident.house_number}</span>
              </div>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-start gap-3 sm:col-span-2">
              <MapPin className="w-4 h-4 text-slate-500 mt-0.5 shrink-0" />
              <div>
                <span className="text-slate-500 block font-medium">Street / Location</span>
                <span className="font-semibold text-slate-900">{activeResident.address} ({activeResident.lga}, {activeResident.state})</span>
              </div>
            </div>

            {activeResident.notes && (
              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-900 sm:col-span-2">
                <span className="text-amber-800 block font-bold text-[11px] uppercase tracking-wider mb-0.5">Notes</span>
                <p>{activeResident.notes}</p>
              </div>
            )}
          </div>

          {/* Security Levy Obligation Notice */}
          <div className="p-3.5 bg-emerald-50 rounded-xl border border-emerald-200 text-xs text-emerald-900">
            <div className="flex items-center justify-between mb-1">
              <span className="font-bold flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-emerald-700" />
                Monthly Security Levy: ₦{estateSettings.monthly_security_levy.toLocaleString()}
              </span>
              <span className="font-medium text-[11px] text-emerald-700">
                Starts {estateSettings.first_payment_month}
              </span>
            </div>
            <p className="text-[11px] text-emerald-800 leading-relaxed">
              This resident is registered for the security levy tracking cycle. Payments are due on day {estateSettings.payment_due_day} of each month starting October 2026.
            </p>
          </div>
        </div>

        {/* Modal Actions */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <button
              onClick={() => onToggleStatus(activeResident)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                activeResident.status === 'Active'
                  ? 'border-slate-300 text-slate-700 hover:bg-slate-100'
                  : 'border-emerald-600 text-emerald-700 bg-emerald-50 hover:bg-emerald-100'
              }`}
            >
              {activeResident.status === 'Active' ? 'Deactivate Resident' : 'Activate Resident'}
            </button>
            <button
              onClick={handlePrintCard}
              className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-100 text-xs font-semibold transition-colors flex items-center gap-1.5"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Badge</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                onClose();
                onEdit(activeResident);
              }}
              className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition-colors shadow-xs"
            >
              Edit Profile
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
