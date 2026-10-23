import React, { useEffect, useState } from 'react';
import { User, ShieldCheck, Clock, ShieldAlert, CheckCircle2, Camera, Eye } from 'lucide-react';
import type { Resident, LivenessVerificationStatus } from '../../types/database';
import { dbService } from '../../lib/supabase';

interface ResidentPhotoAvatarProps {
  resident?: Pick<
    Resident,
    | 'resident_number'
    | 'full_name'
    | 'has_profile_photo'
    | 'profile_photo_uploaded_at'
    | 'liveness_status'
  >;
  residentNumber?: string;
  fullName?: string;
  hasProfilePhoto?: boolean;
  viewerRole: 'admin' | 'resident';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  allowFullPreview?: boolean;
  refreshTrigger?: number;
  refreshKey?: string | number | null;
}

export const ResidentPhotoAvatar: React.FC<ResidentPhotoAvatarProps> = ({
  resident,
  residentNumber,
  fullName,
  hasProfilePhoto,
  viewerRole,
  size = 'md',
  className = '',
  allowFullPreview = false,
  refreshTrigger = 0,
  refreshKey
}) => {
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);

  const resolvedResidentNumber = resident?.resident_number || residentNumber || '';
  const resolvedFullName = resident?.full_name || fullName || '';
  const resolvedHasPhoto = Boolean(
    resident?.has_profile_photo ?? hasProfilePhoto ?? resident?.profile_photo_uploaded_at
  );
  const resolvedUploadedAt = resident?.profile_photo_uploaded_at || refreshKey || '';

  useEffect(() => {
    let active = true;
    let currentObjectUrl: string | null = null;

    if (!resolvedHasPhoto || !resolvedResidentNumber) {
      setPhotoUrl(null);
      return;
    }

    setIsLoading(true);
    const loader =
      viewerRole === 'admin'
        ? dbService.fetchAdminResidentPhotoObjectUrl(resolvedResidentNumber)
        : dbService.fetchResidentSelfPhotoObjectUrl(resolvedResidentNumber);

    loader
      .then((url) => {
        if (!active) {
          if (url) URL.revokeObjectURL(url);
          return;
        }
        currentObjectUrl = url;
        setPhotoUrl(url);
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });

    return () => {
      active = false;
      if (currentObjectUrl) {
        URL.revokeObjectURL(currentObjectUrl);
      }
    };
  }, [resolvedResidentNumber, resolvedHasPhoto, resolvedUploadedAt, viewerRole, refreshTrigger]);

  const sizeClasses: Record<string, string> = {
    sm: 'w-9 h-9 text-xs rounded-xl',
    md: 'w-12 h-12 text-sm rounded-2xl',
    lg: 'w-16 h-16 text-base rounded-2xl',
    xl: 'w-24 h-24 text-xl rounded-3xl'
  };

  const initials = (resolvedFullName || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || '')
    .join('');

  return (
    <>
      <div
        onClick={() => {
          if (allowFullPreview && photoUrl) {
            setIsLightboxOpen(true);
          }
        }}
        title={
          photoUrl
            ? allowFullPreview
              ? `Click to inspect Resident #${resolvedResidentNumber} verified profile photo`
              : `Resident #${resolvedResidentNumber} profile photo`
            : `No verified profile photo on file for Resident #${resolvedResidentNumber}`
        }
        className={`relative shrink-0 overflow-hidden border flex items-center justify-center select-none ${
          sizeClasses[size]
        } ${
          photoUrl
            ? 'border-emerald-500/40 bg-slate-900 shadow-xs'
            : 'border-slate-200 bg-slate-100 text-slate-500'
        } ${allowFullPreview && photoUrl ? 'cursor-pointer group' : ''} ${className}`}
      >
        {photoUrl ? (
          <>
            <img
              src={photoUrl}
              alt={`${resolvedFullName || `Resident #${resolvedResidentNumber}`} profile photo`}
              className="w-full h-full object-cover"
            />
            {allowFullPreview && (
              <div className="absolute inset-0 bg-slate-950/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <Eye className="w-4 h-4 text-white" />
              </div>
            )}
          </>
        ) : isLoading ? (
          <div className="w-4 h-4 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
        ) : initials ? (
          <span className="font-bold tracking-tight text-slate-600">{initials}</span>
        ) : (
          <User className="w-1/2 h-1/2 text-slate-400" />
        )}
      </div>

      {isLightboxOpen && photoUrl && (
        <div
          className="fixed inset-0 z-[70] bg-slate-950/85 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={() => setIsLightboxOpen(false)}
        >
          <div
            className="bg-white rounded-3xl max-w-md w-full overflow-hidden shadow-2xl border border-slate-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
              <div>
                <p className="text-[10px] font-mono uppercase tracking-widest text-emerald-400">
                  Authorized Profile Photo Inspection
                </p>
                <h4 className="text-sm font-bold">
                  {resolvedFullName || 'Unassigned Slot'} — #{String(resolvedResidentNumber).padStart(3, '0')}
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setIsLightboxOpen(false)}
                className="px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold cursor-pointer"
              >
                Close
              </button>
            </div>
            <div className="bg-slate-950 flex items-center justify-center p-4">
              <img
                src={photoUrl}
                alt={`Resident #${resolvedResidentNumber}`}
                className="max-h-96 w-auto rounded-2xl object-contain border border-slate-800"
              />
            </div>
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs">
              <LivenessStatusBadge status={resident?.liveness_status} />
              {resolvedUploadedAt && (
                <span className="text-slate-500 font-mono text-[11px]">
                  Captured: {new Date(String(resolvedUploadedAt)).toLocaleString('en-NG')}
                </span>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export const LivenessStatusBadge: React.FC<{
  status?: LivenessVerificationStatus | string | null;
  verifiedAt?: string | null;
  compact?: boolean;
}> = ({ status, verifiedAt, compact = false }) => {
  const norm = status || 'NOT_VERIFIED';

  if (norm === 'LIVENESS_VERIFIED') {
    return (
      <span
        title={verifiedAt ? `Verified at ${new Date(verifiedAt).toLocaleString('en-NG')}` : 'Automated Live Human PAD Verified'}
        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200"
      >
        <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
        <span>{compact ? 'Liveness Verified' : 'Live Human Verified (PAD)'}</span>
      </span>
    );
  }

  if (norm === 'MANUAL_REVIEW_APPROVED') {
    return (
      <span
        title={verifiedAt ? `Approved by Admin at ${new Date(verifiedAt).toLocaleString('en-NG')}` : 'Approved via Admin Manual Review'}
        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-teal-50 text-teal-800 border border-teal-200"
      >
        <CheckCircle2 className="w-3.5 h-3.5 text-teal-600 shrink-0" />
        <span>{compact ? 'Admin Approved' : 'Manual Review Approved'}</span>
      </span>
    );
  }

  if (norm === 'PENDING_MANUAL_REVIEW') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
        <Clock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
        <span>{compact ? 'Pending Review' : 'Pending Admin Manual Review'}</span>
      </span>
    );
  }

  if (norm === 'REJECTED') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-rose-50 text-rose-800 border border-rose-200">
        <ShieldAlert className="w-3.5 h-3.5 text-rose-600 shrink-0" />
        <span>{compact ? 'Rejected' : 'Liveness/Photo Rejected'}</span>
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
      <Camera className="w-3.5 h-3.5 text-slate-400 shrink-0" />
      <span>{compact ? 'Not Verified' : 'No Verified Live Photo'}</span>
    </span>
  );
};
