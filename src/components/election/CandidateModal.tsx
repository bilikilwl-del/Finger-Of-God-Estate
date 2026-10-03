import React from 'react';
import { X, User, Award, FileText, CheckCircle2 } from 'lucide-react';
import { ElectionCandidate, ElectionPosition } from '../../types/election';

interface CandidateModalProps {
  candidate: ElectionCandidate | null;
  position?: ElectionPosition;
  onClose: () => void;
  onSelectCandidate?: (candidate: ElectionCandidate) => void;
  isSelected?: boolean;
  canVote?: boolean;
}

export const CandidateModal: React.FC<CandidateModalProps> = ({
  candidate,
  position,
  onClose,
  onSelectCandidate,
  isSelected = false,
  canVote = false
}) => {
  if (!candidate) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4">
      <div 
        className="w-full max-w-xl bg-white rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-200 overflow-hidden transform transition-all animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-slate-900 text-white px-6 py-5 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[11px] font-semibold uppercase tracking-wider text-emerald-400">
                Candidate Profile
              </span>
              <h3 className="text-base sm:text-lg font-bold text-white leading-tight">
                {position?.title || 'Executive Position'}
              </h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6 max-h-[calc(85vh-140px)] overflow-y-auto">
          {/* Candidate Bio Header */}
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4">
            {candidate.photograph_url ? (
              <img
                src={candidate.photograph_url}
                alt={candidate.full_name}
                className="w-24 h-24 rounded-2xl object-cover border-2 border-emerald-500/40 shadow-md shrink-0"
              />
            ) : (
              <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200 border-2 border-slate-300 flex items-center justify-center text-slate-600 shadow-inner shrink-0">
                <User className="w-12 h-12 text-slate-400" />
              </div>
            )}

            <div className="text-center sm:text-left flex-1">
              <div className="flex items-center justify-center sm:justify-start gap-2 flex-wrap">
                <h4 className="text-xl font-bold text-slate-900">{candidate.full_name}</h4>
                {candidate.status === 'APPROVED' && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                    Accredited Candidate
                  </span>
                )}
              </div>
              <p className="text-sm font-medium text-emerald-700 mt-0.5">
                Contesting for: {position?.title}
              </p>
              <div className="mt-2 text-xs text-slate-600 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-100">
                <span className="font-semibold text-slate-800 block mb-1">Background & Experience:</span>
                {candidate.biography || 'No biographical notes provided.'}
              </div>
            </div>
          </div>

          {/* Candidate Manifesto / Statement */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
              <FileText className="w-4 h-4 text-emerald-600" />
              <span>Official Election Statement & Vision</span>
            </div>
            <div className="bg-emerald-50/50 border border-emerald-100/80 rounded-2xl p-4 text-sm text-slate-700 leading-relaxed italic">
              &ldquo;{candidate.candidate_statement || 'No campaign statement on file.'}&rdquo;
            </div>
          </div>

          {/* Position Details */}
          {position?.description && (
            <div className="text-xs text-slate-500 bg-slate-50 p-3 rounded-xl border border-slate-100">
              <span className="font-semibold text-slate-700">Role Mandate ({position.title}):</span> {position.description}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex items-center justify-between gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl border border-slate-300 text-sm font-medium text-slate-700 hover:bg-slate-100 transition-colors"
          >
            Back to Directory
          </button>

          {canVote && onSelectCandidate && (
            <button
              onClick={() => {
                onSelectCandidate(candidate);
                onClose();
              }}
              className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-all shadow-xs flex items-center gap-2 ${
                isSelected
                  ? 'bg-emerald-700 text-white hover:bg-emerald-800'
                  : 'bg-emerald-600 text-white hover:bg-emerald-700'
              }`}
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{isSelected ? 'Candidate Selected' : `Select ${candidate.full_name.split(' ')[0]}`}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
