import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Camera,
  ShieldCheck,
  ShieldAlert,
  AlertCircle,
  CheckCircle2,
  RotateCcw,
  Lock,
  Eye,
  Clock,
  ArrowRight,
  UserCheck,
  Sparkles,
  RefreshCw
} from 'lucide-react';
import { dbService } from '../../lib/supabase';

export interface LivenessCaptureOutcome {
  sessionId: string;
  status: 'LIVENESS_VERIFIED' | 'PENDING_MANUAL_REVIEW';
  photoPreviewUrl: string;
  provider?: string;
  confidenceScore?: number | null;
}

interface ResidentLivenessCaptureProps {
  residentNumber: string;
  purpose?: 'ACTIVATION' | 'PHOTO_REPLACEMENT';
  disabled?: boolean;
  verifiedSessionId?: string | null;
  verifiedStatus?: 'LIVENESS_VERIFIED' | 'PENDING_MANUAL_REVIEW' | null;
  onVerificationComplete?: (outcome: LivenessCaptureOutcome) => void;
  onVerified?: (outcome: {
    sessionId: string;
    livenessStatus: 'LIVENESS_VERIFIED' | 'MANUAL_REVIEW_APPROVED';
    photoPreviewUrl: string;
    provider?: string;
    confidenceScore?: number | null;
  }) => void | Promise<void>;
  onManualReviewQueued?: (outcome: {
    sessionId: string;
    message?: string;
    photoPreviewUrl: string;
  }) => void;
  onResetVerification?: () => void;
}

const CHALLENGE_LABELS: Record<string, { title: string; instruction: string }> = {
  CENTER_FACE: {
    title: 'Step 1: Center Your Face',
    instruction: 'Position your face inside the frame in clear lighting and look straight at the camera.'
  },
  TURN_HEAD_LEFT: {
    title: 'Live Challenge: Turn Head Left',
    instruction: 'Slowly turn your head slightly to the left, then return to center.'
  },
  TURN_HEAD_RIGHT: {
    title: 'Live Challenge: Turn Head Right',
    instruction: 'Slowly turn your head slightly to the right, then return to center.'
  },
  NOD_HEAD: {
    title: 'Live Challenge: Nod Head Gently',
    instruction: 'Gently nod your head up and down while looking at the camera.'
  },
  HOLD_STILL: {
    title: 'Final Step: Hold Still for Profile Photo',
    instruction: 'Look straight ahead and hold still to capture your official estate profile photo.'
  }
};

export const ResidentLivenessCapture: React.FC<ResidentLivenessCaptureProps> = ({
  residentNumber,
  purpose = 'ACTIVATION',
  verifiedSessionId,
  verifiedStatus,
  onVerificationComplete,
  onVerified,
  onManualReviewQueued,
  onResetVerification
}) => {
  const [consentAccepted, setConsentAccepted] = useState(false);
  const [flowStep, setFlowStep] = useState<
    | 'PRIVACY_CONSENT'
    | 'CAMERA_ACTIVE'
    | 'PHOTO_PREVIEW'
    | 'VERIFYING'
    | 'NEEDS_MANUAL_REVIEW'
    | 'COMPLETED'
  >(verifiedSessionId ? 'COMPLETED' : 'PRIVACY_CONSENT');

  const [sessionData, setSessionData] = useState<{
    sessionId: string;
    challengeNonce: string;
    challengeSequence: string[];
    provider: string;
    automatedPadAvailable: boolean;
    expiresAt: string;
  } | null>(null);

  const [currentChallengeIndex, setCurrentChallengeIndex] = useState(0);
  const [completedChallenges, setCompletedChallenges] = useState<string[]>([]);
  const [challengeFramesCount, setChallengeFramesCount] = useState(0);
  const [capturedPhotoDataUrl, setCapturedPhotoDataUrl] = useState<string | null>(null);
  const [deviceLabel, setDeviceLabel] = useState<string>('');

  const [isStartingSession, setIsStartingSession] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [verificationError, setVerificationError] = useState<string | null>(null);
  const [retryInstructions, setRetryInstructions] = useState<string | null>(null);
  const [serverResultStatus, setServerResultStatus] = useState<string | null>(verifiedStatus || null);
  const [manualReviewReason, setManualReviewReason] = useState<string>(
    'Live camera capture completed; requesting Estate Administrator manual verification review.'
  );
  const [isSubmittingManualReview, setIsSubmittingManualReview] = useState(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const stopCameraStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      stopCameraStream();
    };
  }, [stopCameraStream]);

  const cleanResidentNumber = String(residentNumber || '').trim().padStart(3, '0');

  const handleStartVerification = async () => {
    setCameraError(null);
    setVerificationError(null);
    setRetryInstructions(null);

    if (!residentNumber || !residentNumber.trim()) {
      setVerificationError('Please enter your Resident ID Number (001–100) above before starting camera verification.');
      return;
    }

    if (!consentAccepted) {
      setVerificationError('Please accept the Biometric & Profile Photo Privacy Notice before activating your camera.');
      return;
    }

    setIsStartingSession(true);
    try {
      // 1. Start server-bound session with randomized challenge sequence
      const sessionRes = await dbService.startLivenessSession({
        residentNumber: cleanResidentNumber,
        purpose,
        consentAccepted: true
      });

      if (!sessionRes.success || !sessionRes.session) {
        setVerificationError(sessionRes.message || 'Could not start liveness verification session.');
        setIsStartingSession(false);
        return;
      }

      setSessionData(sessionRes.session);
      setCurrentChallengeIndex(0);
      setCompletedChallenges([]);
      setChallengeFramesCount(0);
      setCapturedPhotoDataUrl(null);

      // 2. Request live camera permission ONLY after consent & session initialization
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setCameraError(
          'Your browser or device does not support live camera access (getUserMedia). Please use a modern mobile or desktop browser with a working camera.'
        );
        setIsStartingSession(false);
        return;
      }

      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'user',
          width: { ideal: 640 },
          height: { ideal: 640 }
        },
        audio: false
      });

      streamRef.current = mediaStream;
      const videoTrack = mediaStream.getVideoTracks()[0];
      if (videoTrack) {
        setDeviceLabel(videoTrack.label || 'Front Camera');
      }

      setFlowStep('CAMERA_ACTIVE');
      setTimeout(() => {
        if (videoRef.current && streamRef.current) {
          videoRef.current.srcObject = streamRef.current;
          videoRef.current.play().catch(() => {});
        }
      }, 80);
    } catch (err: any) {
      stopCameraStream();
      const errName = String(err?.name || '');
      if (errName === 'NotAllowedError' || errName === 'PermissionDeniedError') {
        setCameraError(
          'Camera permission was denied. Please allow camera access in your browser address bar settings and click "Retry Live Camera" to complete verification.'
        );
      } else if (errName === 'NotFoundError' || errName === 'DevicesNotFoundError') {
        setCameraError(
          'No physical camera was detected on this device. Please connect a webcam or switch to your smartphone to complete live photo capture.'
        );
      } else {
        setCameraError(err?.message || 'Unable to access your device camera. Please check camera permissions and try again.');
      }
    } finally {
      setIsStartingSession(false);
    }
  };

  /**
   * Captures a compressed JPEG frame (<= 640x640) from the live video element.
   */
  const captureFrameFromVideo = (): string | null => {
    const video = videoRef.current;
    if (!video || video.videoWidth === 0 || video.videoHeight === 0) {
      return null;
    }

    const canvas = document.createElement('canvas');
    const maxDim = 640;
    const size = Math.min(video.videoWidth, video.videoHeight);
    const sx = Math.floor((video.videoWidth - size) / 2);
    const sy = Math.floor((video.videoHeight - size) / 2);

    canvas.width = maxDim;
    canvas.height = maxDim;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    ctx.drawImage(video, sx, sy, size, size, 0, 0, maxDim, maxDim);
    return canvas.toDataURL('image/jpeg', 0.85);
  };

  const handleCompleteChallengeStep = () => {
    if (!sessionData) return;
    const sequence = sessionData.challengeSequence;
    const currentStepKey = sequence[currentChallengeIndex];

    const frameDataUrl = captureFrameFromVideo();
    if (!frameDataUrl) {
      setVerificationError('Camera stream is still initializing. Please wait a moment and try again.');
      return;
    }

    const updatedCompleted = [...completedChallenges, currentStepKey];
    const updatedFrameCount = challengeFramesCount + 1;
    setCompletedChallenges(updatedCompleted);
    setChallengeFramesCount(updatedFrameCount);

    if (currentChallengeIndex + 1 < sequence.length) {
      setCurrentChallengeIndex(currentChallengeIndex + 1);
    } else {
      // Final step ('HOLD_STILL') completed: save profile photo preview and stop camera tracks
      setCapturedPhotoDataUrl(frameDataUrl);
      stopCameraStream();
      setFlowStep('PHOTO_PREVIEW');
    }
  };

  const handleSubmitForVerification = async () => {
    if (!sessionData || !capturedPhotoDataUrl) return;
    setFlowStep('VERIFYING');
    setVerificationError(null);
    setRetryInstructions(null);

    const res = await dbService.verifyLivenessCapture({
      sessionId: sessionData.sessionId,
      residentNumber: cleanResidentNumber,
      challengeNonce: sessionData.challengeNonce,
      completedChallenges,
      challengeFramesCount,
      profilePhotoDataUrl: capturedPhotoDataUrl,
      captureSource: 'LIVE_CAMERA_STREAM',
      cameraMetadata: {
        facingMode: 'user',
        deviceLabel
      }
    });

    if (res.success && res.verified && res.status === 'LIVENESS_VERIFIED') {
      setServerResultStatus('LIVENESS_VERIFIED');
      setFlowStep('COMPLETED');
      if (onVerificationComplete) {
        onVerificationComplete({
          sessionId: sessionData.sessionId,
          status: 'LIVENESS_VERIFIED',
          photoPreviewUrl: capturedPhotoDataUrl,
          provider: res.provider,
          confidenceScore: res.confidenceScore
        });
      }
      if (onVerified) {
        await onVerified({
          sessionId: sessionData.sessionId,
          livenessStatus: 'LIVENESS_VERIFIED',
          photoPreviewUrl: capturedPhotoDataUrl,
          provider: res.provider,
          confidenceScore: res.confidenceScore
        });
      }
      return;
    }

    // Handle presentation-attack spoof detection
    if (res.status === 'SPOOF_DETECTED') {
      setServerResultStatus('SPOOF_DETECTED');
      setVerificationError(
        res.message ||
          'Presentation attack detected (printed photo, screen display, or prerecorded video). Automated liveness check failed.'
      );
      setRetryInstructions(
        res.retryInstructions ||
          'Please present your real face live to the camera in good lighting without holding up a photograph or secondary screen.'
      );
      setFlowStep('PRIVACY_CONSENT');
      return;
    }

    // Handle PROVIDER_UNCONFIGURED, PROVIDER_UNAVAILABLE, or INCONCLUSIVE honestly
    setServerResultStatus(res.status || 'INCONCLUSIVE');
    setVerificationError(res.message || 'Automated liveness verification could not be completed.');
    setRetryInstructions(
      res.retryInstructions ||
        'You may retake your live photo in better lighting, or submit your captured live photo and challenge sequence for Authorized Estate Administrator Manual Review.'
    );
    setFlowStep('NEEDS_MANUAL_REVIEW');
  };

  const handleRequestManualReview = async () => {
    if (!sessionData || !capturedPhotoDataUrl) return;
    setIsSubmittingManualReview(true);
    setVerificationError(null);

    try {
      const res = await dbService.requestManualLivenessReview({
        sessionId: sessionData.sessionId,
        residentNumber: cleanResidentNumber,
        reason: manualReviewReason,
        profilePhotoDataUrl: capturedPhotoDataUrl
      });

      if (res.success && res.status === 'PENDING_MANUAL_REVIEW') {
        setServerResultStatus('PENDING_MANUAL_REVIEW');
        setFlowStep('COMPLETED');
        if (onVerificationComplete) {
          onVerificationComplete({
            sessionId: sessionData.sessionId,
            status: 'PENDING_MANUAL_REVIEW',
            photoPreviewUrl: capturedPhotoDataUrl
          });
        }
        if (onManualReviewQueued) {
          onManualReviewQueued({
            sessionId: sessionData.sessionId,
            message: res.message,
            photoPreviewUrl: capturedPhotoDataUrl
          });
        }
      } else {
        setVerificationError(res.message || 'Unable to submit for manual review. Please retry.');
      }
    } finally {
      setIsSubmittingManualReview(false);
    }
  };

  const handleRetake = () => {
    stopCameraStream();
    setCapturedPhotoDataUrl(null);
    setCompletedChallenges([]);
    setChallengeFramesCount(0);
    setCurrentChallengeIndex(0);
    setVerificationError(null);
    setRetryInstructions(null);
    setServerResultStatus(null);
    if (onResetVerification) onResetVerification();
    setFlowStep('PRIVACY_CONSENT');
  };

  const activeChallengeKey =
    sessionData?.challengeSequence?.[currentChallengeIndex] || 'CENTER_FACE';
  const activeChallengeInfo =
    CHALLENGE_LABELS[activeChallengeKey] || CHALLENGE_LABELS.CENTER_FACE;

  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 sm:p-5 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-emerald-900 text-emerald-300 flex items-center justify-center shrink-0">
            <Camera className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs sm:text-sm font-extrabold text-slate-900 uppercase tracking-wider">
              Live Profile Photo & Human Liveness Check
            </h4>
            <p className="text-[11px] text-slate-500">
              Bound to Resident Slot <span className="font-mono font-bold text-slate-800">#{cleanResidentNumber}</span>
            </p>
          </div>
        </div>

        {flowStep === 'COMPLETED' && (
          <span
            className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 ${
              serverResultStatus === 'LIVENESS_VERIFIED'
                ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                : 'bg-amber-100 text-amber-800 border border-amber-300'
            }`}
          >
            {serverResultStatus === 'LIVENESS_VERIFIED' ? (
              <>
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Live Human Verified</span>
              </>
            ) : (
              <>
                <Clock className="w-3.5 h-3.5" />
                <span>Queued for Admin Manual Review</span>
              </>
            )}
          </span>
        )}
      </div>

      {/* Camera / Verification Error Banner */}
      {(cameraError || verificationError) && (
        <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-900 space-y-1.5">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-bold">{cameraError || verificationError}</p>
              {retryInstructions && (
                <p className="text-[11px] text-rose-700 leading-relaxed">{retryInstructions}</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* STEP 1: PRIVACY NOTICE & CAMERA PERMISSION CONSENT */}
      {flowStep === 'PRIVACY_CONSENT' && (
        <div className="space-y-3.5">
          <div className="p-3.5 rounded-xl bg-white border border-slate-200 text-xs text-slate-600 space-y-2">
            <div className="flex items-center gap-1.5 text-slate-900 font-bold">
              <Lock className="w-3.5 h-3.5 text-emerald-700" />
              <span>Privacy & Biometric Data Protection Notice (NDPA 2023)</span>
            </div>
            <ul className="list-disc pl-4 space-y-1 text-[11px] leading-relaxed">
              <li>
                <strong>Purpose:</strong> We capture a live profile photo and perform a presentation-attack liveness check to verify that a real human is activating Resident Slot #{cleanResidentNumber} and to display your verified photo to authorized Estate Administrators.
              </li>
              <li>
                <strong>No Government ID Matching:</strong> Your photo is never matched against government databases or shared with third-party facial recognition networks.
              </li>
              <li>
                <strong>Retention & Security:</strong> Temporary challenge frames are deleted immediately after verification. Only your approved profile photo is stored in a private, encrypted estate bucket.
              </li>
            </ul>

            <label className="flex items-start gap-2.5 pt-2 border-t border-slate-100 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={consentAccepted}
                onChange={(e) => setConsentAccepted(e.target.checked)}
                className="mt-0.5 rounded border-slate-300 text-emerald-700 focus:ring-emerald-500"
              />
              <span className="text-[11px] font-semibold text-slate-800">
                I understand the purpose of collecting my live profile photo and consent to activate my camera for human liveness verification.
              </span>
            </label>
          </div>

          <button
            type="button"
            onClick={handleStartVerification}
            disabled={isStartingSession || !consentAccepted}
            className="w-full py-3 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            {isStartingSession ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Initializing Secure Camera Session...</span>
              </>
            ) : (
              <>
                <Camera className="w-4 h-4 text-emerald-400" />
                <span>Start Live Camera & Liveness Challenge</span>
              </>
            )}
          </button>
        </div>
      )}

      {/* STEP 2: ACTIVE LIVE CAMERA + RANDOMIZED CHALLENGE PROMPTS */}
      {flowStep === 'CAMERA_ACTIVE' && sessionData && (
        <div className="space-y-4">
          <div className="p-3 rounded-xl bg-emerald-950 text-white border border-emerald-800 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-mono uppercase tracking-widest text-emerald-400 block">
                Challenge {currentChallengeIndex + 1} of {sessionData.challengeSequence.length}
              </span>
              <p className="text-xs sm:text-sm font-bold">{activeChallengeInfo.title}</p>
              <p className="text-[11px] text-emerald-200 mt-0.5">{activeChallengeInfo.instruction}</p>
            </div>
            <div className="text-right font-mono text-xs font-bold text-emerald-300">
              {Math.round(((currentChallengeIndex + 1) / sessionData.challengeSequence.length) * 100)}%
            </div>
          </div>

          <div className="relative mx-auto w-64 h-64 sm:w-72 sm:h-72 rounded-3xl overflow-hidden bg-slate-950 border-2 border-emerald-500 shadow-lg">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover scale-x-[-1]"
            />
            {/* Oval Face Alignment Guide */}
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
              <div className="w-44 h-56 rounded-full border-2 border-dashed border-emerald-400/80 shadow-[0_0_0_9999px_rgba(2,6,23,0.45)]" />
            </div>
            <div className="absolute bottom-2.5 inset-x-3 bg-slate-900/85 backdrop-blur-xs text-white px-3 py-1.5 rounded-xl text-[11px] font-medium text-center">
              Do not present a printed photo or phone screen
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleRetake}
              className="px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 font-bold text-xs cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleCompleteChallengeStep}
              className="flex-1 py-2.5 px-4 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm cursor-pointer"
            >
              <Camera className="w-4 h-4" />
              <span>
                {currentChallengeIndex + 1 < sessionData.challengeSequence.length
                  ? `Confirm "${activeChallengeInfo.title.replace(/^Step \d+: |^Live Challenge: /, '')}"`
                  : 'Capture Final Live Profile Photo'}
              </span>
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: PREVIEW BEFORE SUBMISSION */}
      {flowStep === 'PHOTO_PREVIEW' && capturedPhotoDataUrl && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-center gap-4 bg-white p-4 rounded-2xl border border-slate-200">
            <img
              src={capturedPhotoDataUrl}
              alt="Captured Resident Profile Preview"
              className="w-28 h-28 rounded-2xl object-cover border-2 border-emerald-600 shadow-sm shrink-0"
            />
            <div className="space-y-1.5 text-center sm:text-left">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 text-[10px] font-bold border border-emerald-200">
                <CheckCircle2 className="w-3 h-3" />
                Live Challenge Sequence Completed ({challengeFramesCount} frames)
              </span>
              <h5 className="text-sm font-bold text-slate-900">Review Your Profile Photo</h5>
              <p className="text-xs text-slate-600 leading-relaxed">
                Confirm that your face is clearly visible. This photo will be bound to Resident #{cleanResidentNumber} and displayed to Estate Administrators.
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-2.5">
            <button
              type="button"
              onClick={handleRetake}
              className="px-4 py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Retake Live Photo</span>
            </button>
            <button
              type="button"
              onClick={handleSubmitForVerification}
              className="flex-1 py-2.5 px-4 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm cursor-pointer"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Verify Liveness & Approve Photo</span>
            </button>
          </div>
        </div>
      )}

      {/* STEP 4: SERVER VALIDATION IN PROGRESS */}
      {flowStep === 'VERIFYING' && (
        <div className="p-6 text-center space-y-2 bg-white rounded-2xl border border-slate-200">
          <RefreshCw className="w-6 h-6 text-emerald-700 animate-spin mx-auto" />
          <p className="text-xs font-bold text-slate-900">
            Validating Live Challenge & Presentation-Attack Detection on Server...
          </p>
          <p className="text-[11px] text-slate-500">
            Binding verification session and encrypted profile photo to Resident #{cleanResidentNumber}.
          </p>
        </div>
      )}

      {/* STEP 5: AUTHORIZED MANUAL REVIEW FALLBACK (WHEN PROVIDER UNCONFIGURED / INCONCLUSIVE / OUTAGE) */}
      {flowStep === 'NEEDS_MANUAL_REVIEW' && sessionData && capturedPhotoDataUrl && (
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 space-y-3.5 text-xs">
          <div className="flex items-start gap-2.5">
            <Clock className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-amber-950">
                Automated Biometric PAD Status: {serverResultStatus}
              </p>
              <p className="text-[11px] text-amber-900 mt-0.5 leading-relaxed">
                In accordance with estate security rules, your account is <strong>not</strong> marked as automated liveness-verified when the external PAD provider is unconfigured or inconclusive. You may retry camera verification or submit your live camera capture for <strong>Authorized Estate Administrator Manual Review</strong>.
              </p>
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-amber-950 mb-1">
              Note for Estate Administrator Review (Optional)
            </label>
            <input
              type="text"
              value={manualReviewReason}
              onChange={(e) => setManualReviewReason(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-white border border-amber-300 text-xs text-slate-900"
            />
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            <button
              type="button"
              onClick={handleRetake}
              className="px-3.5 py-2.5 rounded-xl bg-white border border-amber-300 hover:bg-amber-100 text-amber-950 font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Retry Live Camera</span>
            </button>
            <button
              type="button"
              onClick={handleRequestManualReview}
              disabled={isSubmittingManualReview}
              className="flex-1 py-2.5 px-4 rounded-xl bg-amber-700 hover:bg-amber-800 text-white font-bold text-xs flex items-center justify-center gap-2 cursor-pointer"
            >
              <UserCheck className="w-4 h-4" />
              <span>
                {isSubmittingManualReview
                  ? 'Submitting for Admin Review...'
                  : 'Submit Live Capture for Authorized Manual Review'}
              </span>
            </button>
          </div>
        </div>
      )}

      {/* STEP 6: COMPLETED STATE */}
      {flowStep === 'COMPLETED' && (
        <div className="flex items-center justify-between gap-3 p-3.5 rounded-xl bg-white border border-emerald-200">
          <div className="flex items-center gap-3">
            {capturedPhotoDataUrl ? (
              <img
                src={capturedPhotoDataUrl}
                alt="Verified Live Capture"
                className="w-14 h-14 rounded-xl object-cover border border-emerald-500"
              />
            ) : (
              <div className="w-14 h-14 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center">
                <ShieldCheck className="w-6 h-6" />
              </div>
            )}
            <div className="text-xs">
              <p className="font-bold text-slate-900">
                {serverResultStatus === 'LIVENESS_VERIFIED'
                  ? 'Live Profile Photo & Human Liveness Verified'
                  : 'Live Profile Photo Bound for Admin Manual Review'}
              </p>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Session bound to Resident #{cleanResidentNumber}. Ready to complete activation below.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleRetake}
            className="px-3 py-1.5 rounded-lg text-[11px] font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 cursor-pointer"
          >
            Retake
          </button>
        </div>
      )}
    </div>
  );
};
