import React, { useState, useEffect, useRef } from 'react';
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
  FileText,
  LogIn,
  UserCheck
} from 'lucide-react';
import { 
  Election, 
  ElectionPosition, 
  ElectionCandidate,
  VoterEligibilityStatus
} from '../../types/election';
import { Resident } from '../../types/database';
import { electionService } from '../../services/electionService';
import { CandidateModal } from './CandidateModal';

interface BallotModalProps {
  election: Election;
  positions: ElectionPosition[];
  candidates: ElectionCandidate[];
  currentResident?: Resident | null;
  voterStatus?: VoterEligibilityStatus | null;
  onOpenResidentLogin?: (initialTab?: 'login' | 'activate') => void;
  onClose: () => void;
  onVoteCastSuccess?: () => void;
}

type BallotStep = 'accreditation' | 'otp_verify' | 'voting' | 'review' | 'success';

export const BallotModal: React.FC<BallotModalProps> = ({
  election,
  positions,
  candidates,
  currentResident,
  voterStatus,
  onOpenResidentLogin,
  onClose,
  onVoteCastSuccess
}) => {
  const [step, setStep] = useState<BallotStep>('accreditation');
  
  // Form State
  const [estateNumber, setEstateNumber] = useState(
    currentResident?.resident_number ? String(currentResident.resident_number).trim().padStart(3, '0') : ''
  );
  const [residentName, setResidentName] = useState(currentResident?.full_name || '');
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
  const [errorCode, setErrorCode] = useState('');
  const [copiedCode, setCopiedCode] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState(600); // 10 minutes

  // Idempotency key & in-flight submission guard to prevent duplicate clicks/tab races
  const idempotencyKeyRef = useRef<string>('');
  const submittingRef = useRef<boolean>(false);

  // Active positions that have at least one APPROVED candidate
  const activePositions = positions
    .filter(p => p.active && candidates.some(c => c.position_id === p.id && c.status === 'APPROVED'))
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

  // Step 1A: Authenticate directly via signed-in Resident Portal Account
  const handleAuthenticateViaResidentAccount = async () => {
    setErrorMessage('');
    setErrorCode('');
    setLoading(true);
    try {
      const res = await electionService.initiateVoterAuth(undefined, election.id);
      if (res.success && res.sessionToken) {
        setSessionToken(res.sessionToken);
        if (res.residentNumber) setEstateNumber(res.residentNumber);
        if (res.residentName) setResidentName(res.residentName);
        if (res.maskedPhone) setMaskedPhone(res.maskedPhone);

        if (res.authenticatedViaAccount) {
          setStep('voting');
        } else {
          setTimerSeconds(600);
          setStep('otp_verify');
        }
      } else {
        setErrorCode(res.code || '');
        setErrorMessage(res.message || 'Unable to verify your resident account eligibility.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Error communicating with accreditation server.');
    } finally {
      setLoading(false);
    }
  };

  // Step 1B: Request OTP by Estate Number (for activated resident accounts)
  const handleInitiateAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setErrorCode('');

    const cleanNum = estateNumber.trim().padStart(3, '0');
    if (!cleanNum || cleanNum.length !== 3 || cleanNum === '000') {
      setErrorMessage('Please enter a valid 3-digit Estate Number between 001 and 100.');
      return;
    }

    const numInt = parseInt(cleanNum, 10);
    if (isNaN(numInt) || numInt < 1 || numInt > 100) {
      setErrorMessage('Estate Number must be between 001 and 100.');
      return;
    }

    setLoading(true);
    try {
      const res = await electionService.initiateVoterAuth(cleanNum, election.id);
      if (res.success && res.sessionToken) {
        setSessionToken(res.sessionToken);
        setMaskedPhone(res.maskedPhone || 'Registered Phone');
        setEstateNumber(res.residentNumber || cleanNum);
        if (res.residentName) setResidentName(res.residentName);

        if (res.authenticatedViaAccount) {
          setStep('voting');
        } else {
          setTimerSeconds(600);
          setStep('otp_verify');
        }
      } else {
        setErrorCode(res.code || '');
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
    setErrorCode('');

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
        setErrorCode(res.code || '');
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
    setErrorCode('');
    const unselectedPositions = activePositions.filter(p => !selections[p.id]);

    if (unselectedPositions.length > 0) {
      setErrorMessage(`Please select a candidate for all positions. Missing: ${unselectedPositions.map(p => p.title).join(', ')}.`);
      return;
    }

    // Generate a fresh idempotency key for this confirmed ballot review state
    idempotencyKeyRef.current = `ballot-${election.id}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    setStep('review');
  };

  // Step 4: Final Submit Ballot (Concurrency-safe & Idempotent)
  const handleSubmitBallot = async () => {
    if (submittingRef.current || loading) return;
    submittingRef.current = true;
    setErrorMessage('');
    setErrorCode('');
    setLoading(true);

    const ballotSelections = activePositions.map(pos => ({
      positionId: pos.id,
      candidateId: selections[pos.id]
    }));

    if (!idempotencyKeyRef.current) {
      idempotencyKeyRef.current = `ballot-${election.id}-${Date.now()}`;
    }

    try {
      const res = await electionService.submitBallot({
        sessionToken,
        electionId: election.id,
        selections: ballotSelections,
        idempotencyKey: idempotencyKeyRef.current
      });

      if (res.success && res.confirmationCode) {
        setConfirmationCode(res.confirmationCode);
        setSubmittedAt(res.submittedAt || new Date().toISOString());
        setStep('success');
        if (onVoteCastSuccess) onVoteCastSuccess();
      } else {
        setErrorCode(res.code || '');
        setErrorMessage(res.message || 'Failed to submit ballot.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Network error submitting ballot. You can safely retry without duplicating your vote.');
    } finally {
      setLoading(false);
      submittingRef.current = false;
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

  const isResidentLoggedIn = Boolean(currentResident && currentResident.resident_number);

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
                <span className={step === 'accreditation' ? 'font-bold text-slate-900' : ''}>Account Verify</span>
              </div>
              <span className="text-slate-300">/</span>
              <div className="flex items-center gap-2">
                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                  step === 'otp_verify' ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-700'
                }`}>2</span>
                <span className={step === 'otp_verify' ? 'font-bold text-slate-900' : ''}>Unlock</span>
              </div>
              <span className="text-slate-300">/</span>
              <div className="flex items-center gap-2">
                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                  step === 'voting' ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-700'
                }`}>3</span>
                <span className={step === 'voting' ? 'font-bold text-slate-900' : ''}>Select Candidates</span>
              </div>
              <span className="text-slate-300">/</span>
              <div className="flex items-center gap-2">
                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                  step === 'review' ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-700'
                }`}>4</span>
                <span className={step === 'review' ? 'font-bold text-slate-900' : ''}>Review & Submit</span>
              </div>
            </div>
          )}

          {/* Scrollable Modal Content */}
          <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-5">
            {/* Error Message Banner with Contextual Action */}
            {errorMessage && (
              <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 space-y-2.5 text-xs sm:text-sm text-rose-800 animate-in fade-in duration-150">
                <div className="flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <div className="flex-1 font-medium">{errorMessage}</div>
                </div>
                {errorCode === 'ACCOUNT_NOT_ACTIVATED' && onOpenResidentLogin && (
                  <div className="pt-1 pl-6">
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onOpenResidentLogin('activate');
                      }}
                      className="px-3.5 py-2 bg-rose-700 hover:bg-rose-800 text-white text-xs font-bold rounded-lg transition-colors inline-flex items-center gap-1.5"
                    >
                      <UserCheck className="w-3.5 h-3.5" />
                      <span>Activate My Resident Account Now</span>
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* ========================================================= */}
            {/* STEP 1: ACCREDITATION VIA EXISTING RESIDENT ACCOUNT */}
            {/* ========================================================= */}
            {step === 'accreditation' && (
              <div className="space-y-5">
                <div className="bg-emerald-50/60 border border-emerald-200/80 rounded-2xl p-4 text-xs sm:text-sm text-emerald-950 flex items-start gap-3">
                  <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold block text-emerald-900">Activated Resident Account Verification</span>
                    Only eligible residents with <strong>activated accounts</strong> (Estate Plots <strong>001–100</strong>) may vote. Each accredited resident account can cast one confidential ballot per election, and voter identity is permanently separated from ballot choices.
                  </div>
                </div>

                {isResidentLoggedIn ? (
                  <div className="bg-slate-900 text-white rounded-2xl p-5 border border-slate-800 space-y-4 shadow-md">
                    <div className="flex items-center justify-between gap-3 border-b border-slate-800 pb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-bold">
                          #{String(currentResident?.resident_number).trim().padStart(3, '0')}
                        </div>
                        <div>
                          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 block">
                            Signed-In Resident Account
                          </span>
                          <h4 className="text-sm sm:text-base font-bold text-white">
                            {currentResident?.full_name || `Resident #${currentResident?.resident_number}`}
                          </h4>
                          {currentResident?.house_number && (
                            <span className="text-xs text-slate-400 block">{currentResident.house_number}</span>
                          )}
                        </div>
                      </div>
                      <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border ${
                        currentResident?.account_activated
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                          : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                      }`}>
                        {currentResident?.account_activated ? 'ACTIVATED' : 'NOT ACTIVATED'}
                      </span>
                    </div>

                    {voterStatus?.hasVoted ? (
                      <div className="p-3.5 bg-purple-950/60 border border-purple-500/30 rounded-xl text-xs text-purple-200 flex items-start gap-2.5">
                        <CheckCircle2 className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
                        <div>
                          <strong className="block text-white font-bold">Ballot Already Recorded</strong>
                          Your resident account (#{String(currentResident?.resident_number).trim().padStart(3, '0')}) has already cast its confidential vote in this election.
                        </div>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={handleAuthenticateViaResidentAccount}
                        disabled={loading}
                        className="w-full py-3.5 px-4 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black rounded-xl shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer text-sm"
                      >
                        {loading ? (
                          <span>Verifying Resident Eligibility...</span>
                        ) : (
                          <>
                            <Lock className="w-4 h-4" />
                            <span>Continue as Resident #{String(currentResident?.resident_number).trim().padStart(3, '0')} & Unlock Ballot</span>
                            <ArrowRight className="w-4 h-4" />
                          </>
                        )}
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {onOpenResidentLogin && (
                      <div className="bg-slate-900 text-white rounded-2xl p-4 sm:p-5 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="space-y-1">
                          <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400 block">
                            Recommended: Sign In to Your Resident Account
                          </span>
                          <p className="text-xs text-slate-300">
                            Sign in to your existing activated Resident Portal account to unlock your ballot directly.
                          </p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={() => {
                              onClose();
                              onOpenResidentLogin('login');
                            }}
                            className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold text-xs rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
                          >
                            <LogIn className="w-3.5 h-3.5" />
                            <span>Resident Sign In</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              onClose();
                              onOpenResidentLogin('activate');
                            }}
                            className="px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-semibold text-xs rounded-xl transition-colors cursor-pointer"
                          >
                            Activate Account
                          </button>
                        </div>
                      </div>
                    )}

                    <form onSubmit={handleInitiateAuth} className="space-y-4 pt-2 border-t border-slate-200">
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                          Or Verify Activated Account via OTP (Plots 001–100)
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
                          Your resident account must already be activated. A 6-digit verification code will be sent to your registered phone number.
                        </span>
                      </div>

                      <button
                        type="submit"
                        disabled={loading || !estateNumber}
                        className="w-full py-3.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer text-sm"
                      >
                        {loading ? (
                          <span>Verifying Activated Account...</span>
                        ) : (
                          <>
                            <span>Request Voting Verification Code</span>
                            <ArrowRight className="w-4 h-4" />
                          </>
                        )}
                      </button>
                    </form>
                  </div>
                )}
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
                    <div className="font-bold text-white flex items-center gap-2 flex-wrap">
                      <span>Confidential Voting in Progress</span>
                      <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded border border-emerald-500/30">
                        ANONYMOUS SECRET BALLOT
                      </span>
                      {estateNumber && (
                        <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded border border-slate-700">
                          Accredited Plot #{estateNumber}{residentName ? ` · ${residentName}` : ''}
                        </span>
                      )}
                    </div>
                    <p className="text-slate-300 text-xs leading-relaxed">
                      Select one approved candidate for each executive position below. Your identity is never stored with your ballot choices.
                    </p>
                  </div>
                </div>

                {/* Progress bar of selected positions */}
                {activePositions.length > 0 && (
                  <>
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
                  </>
                )}

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
                    <span className="font-bold block text-amber-950">Final Ballot Confirmation</span>
                    Please review your candidate choices carefully. Once committed to the database, your ballot choices are permanently detached from your resident identity and sealed. <strong>Submitted ballots cannot be modified.</strong>
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
                      <span>Committing Anonymous Ballot...</span>
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
                    Vote Committed Successfully
                  </span>
                  <h3 className="text-xl sm:text-2xl font-black text-slate-900 mt-2">
                    Official Election Digital Receipt
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-md mx-auto">
                    Your ballot transaction has been committed into the official Finger of God Estate election ledger.
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
