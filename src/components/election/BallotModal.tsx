import React, { useState, useEffect } from 'react';
import { 
  X, 
  ShieldCheck, 
  Lock, 
  KeyRound, 
  CheckCircle2, 
  AlertCircle, 
  Vote, 
  User, 
  ArrowRight, 
  ArrowLeft, 
  Printer, 
  Copy, 
  Check, 
  HelpCircle,
  FileText
} from 'lucide-react';
import { 
  Election, 
  ElectionPosition, 
  ElectionCandidate 
} from '../../types/election';
import { electionService } from '../../services/electionService';
import { CandidateModal } from './CandidateModal';

interface BallotModalProps {
  election: Election;
  positions: ElectionPosition[];
  candidates: ElectionCandidate[];
  onClose: () => void;
  onVoteCastSuccess?: () => void;
}

type BallotStep = 'accreditation' | 'otp_verify' | 'voting' | 'review' | 'success';

export const BallotModal: React.FC<BallotModalProps> = ({
  election,
  positions,
  candidates,
  onClose,
  onVoteCastSuccess
}) => {
  const [step, setStep] = useState<BallotStep>('accreditation');
  
  // Form State
  const [estateNumber, setEstateNumber] = useState('');
  const [maskedPhone, setMaskedPhone] = useState('');
  const [sessionToken, setSessionToken] = useState('');
  const [otpCode, setOtpCode] = useState('');

  // Voting Selections: positionId -> candidateId
  const [selections, setSelections] = useState<Record<string, string>>({});
  
  // Inspection modal
  const [viewingCandidate, setViewingCandidate] = useState<ElectionCandidate | null>(null);
  const [viewingCandidatePosition, setViewingCandidatePosition] = useState<ElectionPosition | undefined>(undefined);

  // Submission result
  const [confirmationCode, setConfirmationCode] = useState('');
  const [submittedAt, setSubmittedAt] = useState('');

  // UI / Error state
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [copiedCode, setCopiedCode] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState(600); // 10 minutes

  // Active positions sorted
  const activePositions = positions
    .filter(p => p.active)
    .sort((a, b) => a.display_order - b.display_order);

  // Countdown timer for OTP
  useEffect(() => {
    if (step !== 'otp_verify') return;
    const interval = setInterval(() => {
      setTimerSeconds(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [step]);

  // Step 1: Request OTP
  const handleInitiateAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    const cleanNum = estateNumber.trim().padStart(3, '0');
    if (!cleanNum || cleanNum.length !== 3 || cleanNum === '000') {
      setErrorMessage('Please enter a valid 3-digit Estate Number between 001 and 300.');
      return;
    }

    const numInt = parseInt(cleanNum, 10);
    if (isNaN(numInt) || numInt < 1 || numInt > 300) {
      setErrorMessage('Estate Number must be between 001 and 300.');
      return;
    }

    setLoading(true);
    try {
      const res = await electionService.initiateVoterAuth(cleanNum, election.id);
      if (res.success && res.sessionToken) {
        setSessionToken(res.sessionToken);
        setMaskedPhone(res.maskedPhone || 'Registered Phone');
        setEstateNumber(cleanNum);
        setTimerSeconds(600);
        setStep('otp_verify');
      } else {
        setErrorMessage(res.message || 'Unable to verify Estate Number.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Error communicating with accreditation server.');
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Verify OTP
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!otpCode || otpCode.trim().length !== 6) {
      setErrorMessage('Please enter the complete 6-digit verification code.');
      return;
    }

    setLoading(true);
    try {
      const res = await electionService.verifyVoterOtp(sessionToken, otpCode.trim());
      if (res.success) {
        setStep('voting');
      } else {
        setErrorMessage(res.message || 'Invalid verification code. Please check and try again.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Error validating code.');
    } finally {
      setLoading(false);
    }
  };

  // Handle Candidate Selection
  const handleSelectCandidate = (positionId: string, candidateId: string) => {
    setSelections(prev => ({
      ...prev,
      [positionId]: candidateId
    }));
  };

  // Validate Selections before Review
  const handleProceedToReview = () => {
    setErrorMessage('');
    const unselectedPositions = activePositions.filter(p => !selections[p.id]);

    if (unselectedPositions.length > 0) {
      setErrorMessage(`Please select a candidate for all positions. Missing: ${unselectedPositions.map(p => p.title).join(', ')}.`);
      return;
    }

    setStep('review');
  };

  // Step 4: Final Submit Ballot
  const handleSubmitBallot = async () => {
    setErrorMessage('');
    setLoading(true);

    const ballotSelections = activePositions.map(pos => ({
      positionId: pos.id,
      candidateId: selections[pos.id]
    }));

    try {
      const res = await electionService.submitBallot({
        sessionToken,
        electionId: election.id,
        selections: ballotSelections
      });

      if (res.success && res.confirmationCode) {
        setConfirmationCode(res.confirmationCode);
        setSubmittedAt(res.submittedAt || new Date().toISOString());
        setStep('success');
        if (onVoteCastSuccess) onVoteCastSuccess();
      } else {
        setErrorMessage(res.message || 'Failed to submit ballot.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Network error submitting ballot.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyCode = () => {
    if (!confirmationCode) return;
    navigator.clipboard.writeText(confirmationCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2500);
  };

  const handlePrint = () => {
    window.print();
  };

  const formatTimer = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const s = sec % 60;
    return `${mins}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <>
      <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
        <div className="w-full max-w-2xl bg-white rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[calc(100dvh-24px)]">
          {/* Top Bar Header */}
          <div className="bg-slate-900 text-white px-5 sm:px-6 py-4 flex items-center justify-between border-b border-slate-800 shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                <Vote className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-500/20">
                    Official Secret Ballot
                  </span>
                  {estateNumber && (
                    <span className="text-[11px] font-semibold text-slate-300">
                      Estate #{estateNumber}
                    </span>
                  )}
                </div>
                <h3 className="text-sm sm:text-base font-bold text-white truncate max-w-[280px] sm:max-w-md">
                  {election.title}
                </h3>
              </div>
            </div>

            <button
              onClick={onClose}
              disabled={loading}
              className="p-1.5 sm:p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors disabled:opacity-50"
              title="Close Ballot"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Stepper Indicator */}
          {step !== 'success' && (
            <div className="bg-slate-50 px-5 sm:px-6 py-2.5 border-b border-slate-200 flex items-center justify-between text-xs font-medium text-slate-600 shrink-0">
              <div className="flex items-center gap-2">
                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                  step === 'accreditation' ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-700'
                }`}>1</span>
                <span className={step === 'accreditation' ? 'font-bold text-slate-900' : ''}>Accredit</span>
              </div>
              <span className="text-slate-300">/</span>
              <div className="flex items-center gap-2">
                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                  step === 'otp_verify' ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-700'
                }`}>2</span>
                <span className={step === 'otp_verify' ? 'font-bold text-slate-900' : ''}>Verify OTP</span>
              </div>
              <span className="text-slate-300">/</span>
              <div className="flex items-center gap-2">
                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                  step === 'voting' ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-700'
                }`}>3</span>
                <span className={step === 'voting' ? 'font-bold text-slate-900' : ''}>Cast Ballot</span>
              </div>
              <span className="text-slate-300">/</span>
              <div className="flex items-center gap-2">
                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                  step === 'review' ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-700'
                }`}>4</span>
                <span className={step === 'review' ? 'font-bold text-slate-900' : ''}>Confirm</span>
              </div>
            </div>
          )}

          {/* Scrollable Modal Content */}
          <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-5">
            {/* Error Message */}
            {errorMessage && (
              <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 flex items-start gap-2.5 text-xs sm:text-sm text-rose-800 animate-in fade-in duration-150">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <div className="flex-1">{errorMessage}</div>
              </div>
            )}

            {/* ========================================================= */}
            {/* STEP 1: ACCREDITATION */}
            {/* ========================================================= */}
            {step === 'accreditation' && (
              <div className="space-y-5">
                <div className="bg-emerald-50/60 border border-emerald-200/80 rounded-2xl p-4 text-xs sm:text-sm text-emerald-950 flex items-start gap-3">
                  <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold block text-emerald-900">Accredited Property Verification</span>
                    Voting is strictly restricted to verified landlords and registered residents with an assigned Estate Number between <strong>001 and 300</strong>. Each accredited property may cast exactly one vote.
                  </div>
                </div>

                <form onSubmit={handleInitiateAuth} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                      Your Estate Number (001–300)
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="e.g. 014"
                        value={estateNumber}
                        onChange={(e) => setEstateNumber(e.target.value.replace(/\D/g, '').slice(0, 3))}
                        maxLength={3}
                        required
                        className="w-full pl-11 pr-4 py-3 bg-white border border-slate-300 rounded-xl text-lg font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent placeholder:text-slate-400 placeholder:font-normal"
                      />
                      <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">
                        #
                      </div>
                    </div>
                    <span className="text-[11px] text-slate-500 mt-1 block">
                      A 6-digit one-time code will be dispatched to the phone number registered to this property.
                    </span>
                  </div>

                  <button
                    type="submit"
                    disabled={loading || !estateNumber}
                    className="w-full py-3.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer text-sm"
                  >
                    {loading ? (
                      <span>Verifying Accreditation...</span>
                    ) : (
                      <>
                        <span>Request Voting Code</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </form>
              </div>
            )}

            {/* ========================================================= */}
            {/* STEP 2: OTP VERIFY */}
            {/* ========================================================= */}
            {step === 'otp_verify' && (
              <div className="space-y-5">
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-xs sm:text-sm text-slate-700">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-slate-900">Verification Code Sent</span>
                    <span className="text-xs font-mono font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      Expires in {formatTimer(timerSeconds)}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600">
                    A 6-digit security code was dispatched to registered contact <strong className="text-slate-800">{maskedPhone}</strong> for Estate #{estateNumber}.
                  </p>
                </div>

                <form onSubmit={handleVerifyOtp} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                      Enter 6-Digit Code
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="••••••"
                        value={otpCode}
                        onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                        maxLength={6}
                        required
                        className="w-full pl-11 pr-4 py-3 bg-white border border-slate-300 rounded-xl text-center text-2xl font-mono font-bold tracking-widest text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent placeholder:text-slate-300"
                      />
                      <KeyRound className="w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setStep('accreditation')}
                      disabled={loading}
                      className="px-4 py-3 border border-slate-300 rounded-xl text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                    >
                      <ArrowLeft className="w-4 h-4 inline mr-1" /> Back
                    </button>
                    <button
                      type="submit"
                      disabled={loading || otpCode.length !== 6}
                      className="flex-1 py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50 text-sm cursor-pointer"
                    >
                      {loading ? (
                        <span>Validating Code...</span>
                      ) : (
                        <>
                          <Lock className="w-4 h-4" />
                          <span>Unlock Secret Ballot</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* ========================================================= */}
            {/* STEP 3: CAST BALLOT */}
            {/* ========================================================= */}
            {step === 'voting' && (
              <div className="space-y-6">
                <div className="bg-slate-900 text-slate-200 rounded-2xl p-4 text-xs sm:text-sm flex items-start gap-3 border border-slate-800 shadow-sm">
                  <Lock className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <div className="font-bold text-white flex items-center gap-2">
                      <span>Confidential Voting in Progress</span>
                      <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded border border-emerald-500/30">
                        ANONYMOUS
                      </span>
                    </div>
                    <p className="text-slate-300 text-xs leading-relaxed">
                      Select exactly one accredited candidate for each executive position below. When satisfied, proceed to review your ballot before irreversible submission.
                    </p>
                  </div>
                </div>

                {/* Progress bar of selected positions */}
                <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
                  <span>Selections: {Object.keys(selections).length} of {activePositions.length} positions decided</span>
                  <span className="text-emerald-700 font-bold">
                    {Math.round((Object.keys(selections).length / activePositions.length) * 100)}% Complete
                  </span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                  <div 
                    className="bg-emerald-600 h-2 transition-all duration-300 rounded-full"
                    style={{ width: `${(Object.keys(selections).length / activePositions.length) * 100}%` }}
                  />
                </div>

                {/* Positions and Candidates */}
                <div className="space-y-6">
                  {activePositions.map((position, index) => {
                    const posCandidates = candidates.filter(
                      c => c.position_id === position.id && c.status === 'APPROVED'
                    );
                    const selectedCandId = selections[position.id];

                    return (
                      <div 
                        key={position.id}
                        className={`rounded-2xl border p-4 sm:p-5 transition-all ${
                          selectedCandId 
                            ? 'border-emerald-300 bg-emerald-50/20 shadow-xs' 
                            : 'border-slate-200 bg-white hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3 mb-3">
                          <div>
                            <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider block">
                              Position #{index + 1}
                            </span>
                            <h4 className="text-base sm:text-lg font-bold text-slate-900">
                              {position.title}
                            </h4>
                            <p className="text-xs text-slate-500 mt-0.5">
                              {position.description}
                            </p>
                          </div>

                          {selectedCandId ? (
                            <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-100 px-2.5 py-1 rounded-full border border-emerald-200 shrink-0">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                              Selected
                            </span>
                          ) : (
                            <span className="text-xs font-medium text-amber-700 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200 shrink-0">
                              Choice Required
                            </span>
                          )}
                        </div>

                        {/* Candidates Grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
                          {posCandidates.map((cand) => {
                            const isChosen = selectedCandId === cand.id;

                            return (
                              <div
                                key={cand.id}
                                onClick={() => handleSelectCandidate(position.id, cand.id)}
                                className={`p-3.5 rounded-xl border-2 transition-all cursor-pointer flex flex-col justify-between ${
                                  isChosen
                                    ? 'border-emerald-600 bg-white shadow-sm ring-2 ring-emerald-500/20'
                                    : 'border-slate-200 bg-slate-50/50 hover:bg-slate-50 hover:border-slate-300'
                                }`}
                              >
                                <div className="flex items-start gap-3">
                                  {cand.photograph_url ? (
                                    <img
                                      src={cand.photograph_url}
                                      alt={cand.full_name}
                                      className="w-12 h-12 rounded-xl object-cover border border-slate-200 shrink-0"
                                    />
                                  ) : (
                                    <div className="w-12 h-12 rounded-xl bg-slate-200 flex items-center justify-center text-slate-500 shrink-0 font-bold">
                                      <User className="w-6 h-6 text-slate-400" />
                                    </div>
                                  )}

                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between gap-1">
                                      <h5 className="text-sm font-bold text-slate-900 truncate">
                                        {cand.full_name}
                                      </h5>
                                      <div className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                                        isChosen ? 'border-emerald-600 bg-emerald-600 text-white' : 'border-slate-300 bg-white'
                                      }`}>
                                        {isChosen && <Check className="w-3 h-3 stroke-[3]" />}
                                      </div>
                                    </div>

                                    <p className="text-xs text-slate-500 line-clamp-2 mt-1">
                                      {cand.biography || cand.candidate_statement}
                                    </p>
                                  </div>
                                </div>

                                <div className="mt-3 pt-2 border-t border-slate-200/60 flex items-center justify-between text-xs">
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setViewingCandidate(cand);
                                      setViewingCandidatePosition(position);
                                    }}
                                    className="text-emerald-700 hover:text-emerald-800 font-semibold flex items-center gap-1"
                                  >
                                    <FileText className="w-3.5 h-3.5" />
                                    <span>Read Manifesto</span>
                                  </button>

                                  <span className={`text-[11px] font-bold ${
                                    isChosen ? 'text-emerald-700' : 'text-slate-400'
                                  }`}>
                                    {isChosen ? 'Selected' : 'Click to select'}
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Footer Action */}
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={handleProceedToReview}
                    className="w-full py-3.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-md transition-all flex items-center justify-center gap-2 text-sm cursor-pointer"
                  >
                    <span>Review Ballot Selections</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* ========================================================= */}
            {/* STEP 4: REVIEW & CONFIRM */}
            {/* ========================================================= */}
            {step === 'review' && (
              <div className="space-y-5">
                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-xs sm:text-sm text-amber-900 flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold block text-amber-950">Irreversible Action Warning</span>
                    Please review your choices carefully. Once your ballot is submitted, your choices will be detached from your identity and sealed in the secret ballot ledger. <strong>You cannot modify your vote afterwards.</strong>
                  </div>
                </div>

                {/* Summary Table */}
                <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
                  <div className="bg-slate-100 px-4 py-2.5 border-b border-slate-200 text-xs font-bold uppercase tracking-wider text-slate-700">
                    Your Ballot Summary
                  </div>
                  <div className="divide-y divide-slate-100">
                    {activePositions.map((pos) => {
                      const candId = selections[pos.id];
                      const cand = candidates.find(c => c.id === candId);

                      return (
                        <div key={pos.id} className="p-3.5 sm:p-4 flex items-center justify-between gap-4 bg-white hover:bg-slate-50 transition-colors">
                          <div>
                            <span className="text-[11px] font-semibold text-slate-500 uppercase block">
                              {pos.title}
                            </span>
                            <span className="text-sm sm:text-base font-bold text-slate-900">
                              {cand?.full_name || 'No selection'}
                            </span>
                          </div>

                          <div className="text-right shrink-0">
                            <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                              Confirmed
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="flex items-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setStep('voting')}
                    disabled={loading}
                    className="px-4 py-3 border border-slate-300 rounded-xl text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                  >
                    <ArrowLeft className="w-4 h-4 inline mr-1" /> Edit Selections
                  </button>

                  <button
                    type="button"
                    onClick={handleSubmitBallot}
                    disabled={loading}
                    className="flex-1 py-3.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50 text-sm cursor-pointer"
                  >
                    {loading ? (
                      <span>Sealing Anonymous Ballot...</span>
                    ) : (
                      <>
                        <ShieldCheck className="w-4 h-4" />
                        <span>Cast Confidential Vote Now</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* ========================================================= */}
            {/* STEP 5: OFFICIAL CONFIRMATION RECEIPT */}
            {/* ========================================================= */}
            {step === 'success' && (
              <div className="space-y-6 text-center py-2">
                <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 mx-auto flex items-center justify-center shadow-inner">
                  <CheckCircle2 className="w-10 h-10" />
                </div>

                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full">
                    Vote Recorded Successfully
                  </span>
                  <h3 className="text-xl sm:text-2xl font-black text-slate-900 mt-2">
                    Official Election Digital Receipt
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-md mx-auto">
                    Your ballot has been confidentially committed into the official Finger of God Estate election ledger.
                  </p>
                </div>

                {/* Printable Receipt Card */}
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 text-left max-w-md mx-auto space-y-3 font-mono text-xs shadow-xs">
                  <div className="border-b border-slate-200 pb-2 flex items-center justify-between">
                    <span className="font-bold text-slate-700">FINGER OF GOD ESTATE</span>
                    <span className="text-emerald-700 font-semibold">{election.year} ELECTION</span>
                  </div>

                  <div className="space-y-1.5 text-slate-600">
                    <div className="flex justify-between">
                      <span>Accredited Estate No:</span>
                      <strong className="text-slate-900">#{estateNumber}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span>Accreditation Status:</span>
                      <strong className="text-emerald-700 font-bold">VOTED & ACCREDITED</strong>
                    </div>
                    <div className="flex justify-between">
                      <span>Timestamp:</span>
                      <strong className="text-slate-900">{new Date(submittedAt).toLocaleString()}</strong>
                    </div>
                    <div className="flex justify-between items-center pt-2 border-t border-slate-200">
                      <span>Confirmation Code:</span>
                      <strong className="text-slate-900 text-sm font-bold bg-white px-2 py-0.5 rounded border border-slate-300">
                        {confirmationCode}
                      </strong>
                    </div>
                  </div>

                  <div className="pt-2 text-[10px] text-slate-400 text-center leading-tight">
                    *Choices are protected by anonymous secret ballot separation. Keep this confirmation code for your personal audit record.
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={handleCopyCode}
                    className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors flex items-center justify-center gap-1.5"
                  >
                    {copiedCode ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                    <span>{copiedCode ? 'Code Copied' : 'Copy Reference Code'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handlePrint}
                    className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors flex items-center justify-center gap-1.5"
                  >
                    <Printer className="w-4 h-4" />
                    <span>Print Receipt</span>
                  </button>

                  <button
                    type="button"
                    onClick={onClose}
                    className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-xs"
                  >
                    Finish
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Candidate Manifesto Modal */}
      {viewingCandidate && (
        <CandidateModal
          candidate={viewingCandidate}
          position={viewingCandidatePosition}
          onClose={() => {
            setViewingCandidate(null);
            setViewingCandidatePosition(undefined);
          }}
          onSelectCandidate={(cand) => {
            if (viewingCandidatePosition) {
              handleSelectCandidate(viewingCandidatePosition.id, cand.id);
            }
          }}
          isSelected={viewingCandidatePosition ? selections[viewingCandidatePosition.id] === viewingCandidate.id : false}
          canVote={step === 'voting'}
        />
      )}
    </>
  );
};
