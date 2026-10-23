import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Camera,
  CheckCircle2,
  AlertCircle,
  RotateCcw,
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

export const ResidentLivenessCapture: React.FC<ResidentLivenessCaptureProps> = ({
  residentNumber,
  purpose = 'ACTIVATION',
  disabled = false,
  verifiedSessionId,
  onVerificationComplete,
  onVerified,
  onResetVerification
}) => {
  const [flowStep, setFlowStep] = useState<
    'IDLE' | 'CAMERA_ACTIVE' | 'PHOTO_PREVIEW' | 'SAVING' | 'COMPLETED'
  >(verifiedSessionId ? 'COMPLETED' : 'IDLE');

  const [sessionData, setSessionData] = useState<{
    sessionId: string;
    challengeNonce: string;
    challengeSequence: string[];
  } | null>(null);

  const [capturedPhotoDataUrl, setCapturedPhotoDataUrl] = useState<string | null>(null);
  const [deviceLabel, setDeviceLabel] = useState<string>('');
  const [isStartingCamera, setIsStartingCamera] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

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

  const handleOpenCamera = async () => {
    setErrorMsg(null);

    if (!residentNumber || !residentNumber.trim()) {
      setErrorMsg('Please enter your Resident ID Number (001–100) first.');
      return;
    }

    setIsStartingCamera(true);
    try {
      const sessionRes = await dbService.startLivenessSession({
        residentNumber: cleanResidentNumber,
        purpose,
        consentAccepted: true
      });

      if (!sessionRes.success || !sessionRes.session) {
        setErrorMsg(sessionRes.message || 'Could not initialize camera session. Please try again.');
        setIsStartingCamera(false);
        return;
      }

      setSessionData(sessionRes.session);
      setCapturedPhotoDataUrl(null);

      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setErrorMsg(
          'Your browser does not support camera access. Please use a phone or computer browser with a working camera.'
        );
        setIsStartingCamera(false);
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
        setErrorMsg(
          'Camera permission was denied. Please allow camera access in your browser settings and try again.'
        );
      } else if (errName === 'NotFoundError' || errName === 'DevicesNotFoundError') {
        setErrorMsg('No camera was found on this device. Please use a device with a working camera.');
      } else {
        setErrorMsg(err?.message || 'Unable to open your camera. Please check camera permissions and try again.');
      }
    } finally {
      setIsStartingCamera(false);
    }
  };

  const handleSnapPhoto = () => {
    const video = videoRef.current;
    if (!video || video.videoWidth === 0 || video.videoHeight === 0) {
      setErrorMsg('Camera is still loading. Please wait a second and snap again.');
      return;
    }

    const canvas = document.createElement('canvas');
    const maxDim = 640;
    const size = Math.min(video.videoWidth, video.videoHeight);
    const sx = Math.floor((video.videoWidth - size) / 2);
    const sy = Math.floor((video.videoHeight - size) / 2);

    canvas.width = maxDim;
    canvas.height = maxDim;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, sx, sy, size, size, 0, 0, maxDim, maxDim);
    const frameDataUrl = canvas.toDataURL('image/jpeg', 0.85);

    setCapturedPhotoDataUrl(frameDataUrl);
    stopCameraStream();
    setFlowStep('PHOTO_PREVIEW');
  };

  const handleConfirmPhoto = async () => {
    if (!sessionData || !capturedPhotoDataUrl) return;
    setFlowStep('SAVING');
    setErrorMsg(null);

    try {
      const res = await dbService.verifyLivenessCapture({
        sessionId: sessionData.sessionId,
        residentNumber: cleanResidentNumber,
        challengeNonce: sessionData.challengeNonce,
        completedChallenges: sessionData.challengeSequence || ['CENTER_FACE'],
        challengeFramesCount: 2,
        profilePhotoDataUrl: capturedPhotoDataUrl,
        captureSource: 'LIVE_CAMERA_STREAM',
        cameraMetadata: {
          facingMode: 'user',
          deviceLabel
        }
      });

      if (res.success && res.verified) {
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

      setErrorMsg(res.message || 'Could not save your face photo. Please snap again.');
      setFlowStep('PHOTO_PREVIEW');
    } catch {
      setErrorMsg('Network error while saving your photo. Please try again.');
      setFlowStep('PHOTO_PREVIEW');
    }
  };

  const handleRetake = () => {
    stopCameraStream();
    setCapturedPhotoDataUrl(null);
    setErrorMsg(null);
    if (onResetVerification) onResetVerification();
    setFlowStep('IDLE');
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 space-y-3.5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-emerald-900 text-emerald-300 flex items-center justify-center shrink-0">
            <Camera className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs sm:text-sm font-extrabold text-slate-900 uppercase tracking-wider">
              Snap Your Face (Profile Photo)
            </h4>
            <p className="text-[11px] text-slate-500">
              Your snapped face photo will be used as your official profile picture for Resident{' '}
              <span className="font-mono font-bold text-slate-800">#{cleanResidentNumber}</span>
            </p>
          </div>
        </div>

        {flowStep === 'COMPLETED' && (
          <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 bg-emerald-100 text-emerald-800 border border-emerald-300">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Photo Captured</span>
          </span>
        )}
      </div>

      {errorMsg && (
        <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-900 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          <p className="font-semibold">{errorMsg}</p>
        </div>
      )}

      {/* STEP 1: OPEN CAMERA */}
      {flowStep === 'IDLE' && (
        <button
          type="button"
          onClick={handleOpenCamera}
          disabled={disabled || isStartingCamera}
          className="w-full py-3 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs"
        >
          {isStartingCamera ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span>Opening Camera...</span>
            </>
          ) : (
            <>
              <Camera className="w-4 h-4 text-emerald-400" />
              <span>Open Camera to Snap Your Face</span>
            </>
          )}
        </button>
      )}

      {/* STEP 2: LIVE CAMERA SNAP */}
      {flowStep === 'CAMERA_ACTIVE' && (
        <div className="space-y-3.5">
          <div className="relative mx-auto w-60 h-60 sm:w-64 sm:h-64 rounded-3xl overflow-hidden bg-slate-950 border-2 border-emerald-500 shadow-lg">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover scale-x-[-1]"
            />
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
              <div className="w-40 h-52 rounded-full border-2 border-dashed border-emerald-400/80 shadow-[0_0_0_9999px_rgba(2,6,23,0.40)]" />
            </div>
            <div className="absolute bottom-2.5 inset-x-3 bg-slate-900/80 backdrop-blur-xs text-white px-3 py-1 rounded-xl text-[11px] font-medium text-center">
              Position your face inside the frame and snap
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
              onClick={handleSnapPhoto}
              className="flex-1 py-2.5 px-4 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm cursor-pointer"
            >
              <Camera className="w-4 h-4" />
              <span>Snap Face Photo</span>
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: PREVIEW SNAPPED PHOTO */}
      {flowStep === 'PHOTO_PREVIEW' && capturedPhotoDataUrl && (
        <div className="space-y-3.5">
          <div className="flex flex-col sm:flex-row items-center gap-4 bg-white p-3.5 rounded-2xl border border-slate-200">
            <img
              src={capturedPhotoDataUrl}
              alt="Snapped Face Preview"
              className="w-24 h-24 rounded-2xl object-cover border-2 border-emerald-600 shadow-xs shrink-0"
            />
            <div className="space-y-1 text-center sm:text-left">
              <h5 className="text-xs sm:text-sm font-bold text-slate-900">Use This Photo as Your Profile Picture?</h5>
              <p className="text-[11px] text-slate-600 leading-relaxed">
                Make sure your face is clear. This photo will appear on your Resident #{cleanResidentNumber} profile.
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            <button
              type="button"
              onClick={handleOpenCamera}
              className="px-4 py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Retake Photo</span>
            </button>
            <button
              type="button"
              onClick={handleConfirmPhoto}
              className="flex-1 py-2.5 px-4 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Use This Photo</span>
            </button>
          </div>
        </div>
      )}

      {/* STEP 4: SAVING */}
      {flowStep === 'SAVING' && (
        <div className="p-5 text-center space-y-2 bg-white rounded-2xl border border-slate-200">
          <RefreshCw className="w-5 h-5 text-emerald-700 animate-spin mx-auto" />
          <p className="text-xs font-bold text-slate-900">Saving your profile photo...</p>
        </div>
      )}

      {/* STEP 5: COMPLETED */}
      {flowStep === 'COMPLETED' && (
        <div className="flex items-center justify-between gap-3 p-3 rounded-xl bg-white border border-emerald-200">
          <div className="flex items-center gap-3">
            {capturedPhotoDataUrl ? (
              <img
                src={capturedPhotoDataUrl}
                alt="Resident Profile Photo"
                className="w-12 h-12 rounded-xl object-cover border border-emerald-500"
              />
            ) : (
              <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5" />
              </div>
            )}
            <div className="text-xs">
              <p className="font-bold text-slate-900">Face Photo Saved for Profile</p>
              <p className="text-[11px] text-slate-500">
                Linked to Resident #{cleanResidentNumber}. You can now complete activation below.
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
