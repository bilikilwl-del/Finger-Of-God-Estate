import React, { useState, useEffect, useRef } from 'react';
import { 
  KeyRound, 
  UserCheck, 
  ArrowRight, 
  AlertCircle, 
  CheckCircle2, 
  X,
  Lock,
  Mail,
  Phone,
  ArrowLeft,
  ShieldCheck,
  Smartphone,
  RotateCw,
  HelpCircle,
  Building,
  Info,
  ExternalLink,
  Laptop
} from 'lucide-react';
import { dbService, authService, residentSessionService } from '../../lib/supabase';
import { Resident, EstateSettings } from '../../types/database';
import { EstateLogo } from '../common/EstateLogo';
import { SEOHead } from '../common/SEOHead';

interface ResidentLoginViewProps {
  onSuccess: (resident: Resident) => void;
  onNavigateToHome?: () => void;
  estateSettings?: EstateSettings;
  isModal?: boolean;
  onCloseModal?: () => void;
  initialTab?: 'login' | 'activate' | 'forgot' | 'password_login';
}

export const ResidentLoginView: React.FC<ResidentLoginViewProps> = ({
  onSuccess,
  onNavigateToHome,
  estateSettings,
  isModal = false,
  onCloseModal,
  initialTab = 'login'
}) => {
  // Navigation Tabs: 'login' (OTP) | 'password_login' (Email+Password) | 'activate' | 'forgot'
  const [activeTab, setActiveTab] = useState<'login' | 'password_login' | 'activate' | 'forgot'>('login');

  useEffect(() => {
    if (initialTab === 'password_login') {
      setActiveTab('password_login');
    } else if (initialTab === 'activate') {
      setActiveTab('activate');
    } else if (initialTab === 'forgot') {
      setActiveTab('forgot');
    } else {
      setActiveTab('login');
    }
  }, [initialTab]);

  // Step state for OTP login: 'enter_details' | 'enter_otp'
  const [otpStep, setOtpStep] = useState<'enter_details' | 'enter_otp'>('enter_details');

  // OTP Login Form State
  const [estateNumber, setEstateNumber] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otpCode, setOtpCode] = useState(['', '', '', '', '', '']);
  const [rememberDevice, setRememberDevice] = useState(false);
  const [maskedPhone, setMaskedPhone] = useState<string>('');
  const [resendCooldown, setResendCooldown] = useState(0);
  const [demoOtpHint, setDemoOtpHint] = useState<string | null>(null);

  // Rate Limiting & Failed Attempts Lockout Protection
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [lockoutTimer, setLockoutTimer] = useState(0);

  // Close Resident Portal handler
  const handleClosePortal = () => {
    if (isModal && onCloseModal) {
      onCloseModal();
      return;
    }
    try {
      window.close();
    } catch {}
    setTimeout(() => {
      if (!window.closed) {
        if (onCloseModal) {
          onCloseModal();
        } else if (onNavigateToHome) {
          onNavigateToHome();
        } else if (typeof window !== 'undefined' && window.history && window.history.length > 1) {
          window.history.back();
        } else if (typeof window !== 'undefined') {
          window.location.href = '/';
        }
      }
    }, 60);
  };

  // Password Login State
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Activation Flow State
  const [actStep, setActStep] = useState<'verify' | 'setup'>('verify');
  const [actResidentNumber, setActResidentNumber] = useState('');
  const [actIdentifier, setActIdentifier] = useState('');
  const [verifiedData, setVerifiedData] = useState<{
    residentName: string;
    existingEmail?: string | null;
    isActivated?: boolean;
  } | null>(null);
  const [actEmail, setActEmail] = useState('');
  const [actPassword, setActPassword] = useState('');
  const [actConfirmPassword, setActConfirmPassword] = useState('');

  // Forgot Password State
  const [forgotEmail, setForgotEmail] = useState('');

  // Support / Help Modal or Drawer
  const [showHelpModal, setShowHelpModal] = useState(false);

  // Common UI State
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const otpInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Check for remembered device on initial mount
  useEffect(() => {
    const remembered = residentSessionService.getRememberedDevice();
    if (remembered && remembered.residentNumber) {
      setEstateNumber(remembered.residentNumber);
      setRememberDevice(true);
    }
  }, []);

  // Lock background page scroll when modal is active, restore on unmount
  useEffect(() => {
    if (!isModal) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [isModal]);

  // Cooldown Countdown Timer for Resend OTP
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (resendCooldown > 0) {
      interval = setInterval(() => {
        setResendCooldown((prev) => (prev > 1 ? prev - 1 : 0));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [resendCooldown]);

  // Lockout Countdown Timer for Failed Attempts
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (lockoutTimer > 0) {
      interval = setInterval(() => {
        setLockoutTimer((prev) => (prev > 1 ? prev - 1 : 0));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [lockoutTimer]);

  // Focus the first OTP box when transitioning to enter_otp
  useEffect(() => {
    if (otpStep === 'enter_otp' && otpInputRefs.current[0]) {
      otpInputRefs.current[0]?.focus();
    }
  }, [otpStep]);

  // Handle OTP digit changes
  const handleOtpChange = (index: number, value: string) => {
    if (lockoutTimer > 0) return;
    const cleanVal = value.replace(/\D/g, '');

    // Handle paste of full 6-digit code
    if (cleanVal.length > 1) {
      const pasted = cleanVal.slice(0, 6).split('');
      const newOtp = [...otpCode];
      pasted.forEach((ch, idx) => {
        if (idx < 6) newOtp[idx] = ch;
      });
      setOtpCode(newOtp);
      const nextIndex = Math.min(pasted.length, 5);
      otpInputRefs.current[nextIndex]?.focus();
      return;
    }

    const newOtp = [...otpCode];
    newOtp[index] = cleanVal;
    setOtpCode(newOtp);

    // Auto advance to next box
    if (cleanVal && index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otpCode[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    }
  };

  // 1. STEP 1: SEND OTP (ESTATE NUMBER + PHONE NUMBER)
  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (lockoutTimer > 0) {
      setErrorMessage(`Too many failed attempts. Please wait ${lockoutTimer} seconds before trying again.`);
      return;
    }

    const cleanNum = estateNumber.trim().padStart(3, '0');
    const cleanPhone = phoneNumber.trim();

    if (!cleanNum || !cleanPhone) {
      setErrorMessage('Please enter both your estate number (001–300) and registered phone number.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await dbService.sendResidentOtp(cleanNum, cleanPhone);

      if (res.success) {
        setMaskedPhone(res.maskedPhone || cleanPhone);
        setResendCooldown(res.cooldownSeconds || 45);
        setDemoOtpHint(res.demoOtp || null);
        setOtpStep('enter_otp');
        setOtpCode(['', '', '', '', '', '']);
        setSuccessMessage(`A 6-digit verification code has been dispatched to ${res.maskedPhone || 'your phone'}.`);
      } else {
        const nextFailed = failedAttempts + 1;
        setFailedAttempts(nextFailed);
        if (nextFailed >= 5) {
          setLockoutTimer(120); // 2-minute lockout
          setErrorMessage('Too many failed attempts. Security lockout active for 2 minutes.');
        } else {
          setErrorMessage(res.message || 'Those details could not be verified. Please check your estate number and registered phone number.');
        }
      }
    } catch {
      setErrorMessage("We couldn't complete the request. Please check your internet connection and try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // 2. STEP 2: VERIFY OTP AND LOGIN
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (lockoutTimer > 0) {
      setErrorMessage(`Security lockout active. Please wait ${lockoutTimer} seconds.`);
      return;
    }

    const fullCode = otpCode.join('').trim();
    if (fullCode.length !== 6) {
      setErrorMessage('Please enter the complete 6-digit verification code.');
      return;
    }

    const cleanNum = estateNumber.trim().padStart(3, '0');
    const cleanPhone = phoneNumber.trim();

    setIsLoading(true);
    try {
      const res = await dbService.verifyResidentOtp(cleanNum, cleanPhone, fullCode, rememberDevice);

      if (res.success && res.resident) {
        setFailedAttempts(0);
        setSuccessMessage(`Welcome back, ${res.resident.full_name}! Opening resident dashboard...`);
        setTimeout(() => {
          onSuccess(res.resident!);
          if (isModal && onCloseModal) onCloseModal();
        }, 600);
      } else {
        const nextFailed = failedAttempts + 1;
        setFailedAttempts(nextFailed);
        if (nextFailed >= 5) {
          setLockoutTimer(120);
          setErrorMessage('Too many failed attempts. Security lockout active for 2 minutes.');
        } else {
          setErrorMessage(res.message || 'Incorrect verification code. Please check the digits and try again.');
        }
      }
    } catch {
      setErrorMessage("We couldn't complete the request. Please check your internet connection and try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // Resend OTP Code
  const handleResendOtp = async () => {
    if (resendCooldown > 0 || isLoading || lockoutTimer > 0) return;
    setErrorMessage(null);
    setIsLoading(true);

    try {
      const cleanNum = estateNumber.trim().padStart(3, '0');
      const cleanPhone = phoneNumber.trim();
      const res = await dbService.sendResidentOtp(cleanNum, cleanPhone);

      if (res.success) {
        setResendCooldown(res.cooldownSeconds || 45);
        setDemoOtpHint(res.demoOtp || null);
        setSuccessMessage('A fresh verification code has been dispatched to your phone.');
      } else {
        setErrorMessage(res.message || 'Unable to resend verification code. Please wait a moment.');
      }
    } catch {
      setErrorMessage("We couldn't complete the request. Please check your internet connection and try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // 3. ALTERNATIVE: EMAIL + PASSWORD LOGIN
  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!loginEmail.trim() || !loginPassword.trim()) {
      setErrorMessage('Please enter both your email address and password.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await dbService.loginResident(loginEmail, loginPassword);
      if (res.success && res.resident) {
        if (rememberDevice) {
          residentSessionService.setRememberedDevice(res.resident.resident_number, 'tok_pwd_remember');
        }
        setSuccessMessage(`Welcome back, ${res.resident.full_name}!`);
        setTimeout(() => {
          onSuccess(res.resident!);
          if (isModal && onCloseModal) onCloseModal();
        }, 500);
      } else {
        setErrorMessage(res.message || 'Those details could not be verified. Please check your email and password.');
      }
    } catch {
      setErrorMessage("We couldn't complete the request. Please check your internet connection and try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // 4. ACCOUNT ACTIVATION - STEP 1 (VERIFY RECORD)
  const handleVerifyForActivation = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    const cleanNum = actResidentNumber.trim().padStart(3, '0');
    if (!cleanNum || !actIdentifier.trim()) {
      setErrorMessage('Please enter both your estate number (001–300) and registered phone number.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await dbService.verifyResidentForActivation(cleanNum, actIdentifier);
      if (res.success && res.residentName) {
        setVerifiedData({
          residentName: res.residentName,
          existingEmail: res.existingEmail,
          isActivated: res.isActivated
        });
        setActEmail(res.existingEmail || '');
        setActStep('setup');
        setSuccessMessage('Resident record confirmed. Set your password below to finish activating your account.');
      } else {
        setErrorMessage(res.message || 'Those details could not be verified. Please check your estate number and registered phone number.');
      }
    } catch {
      setErrorMessage('Unable to verify resident record. Please check your connection or contact estate administration.');
    } finally {
      setIsLoading(false);
    }
  };

  // 5. ACCOUNT ACTIVATION - STEP 2 (FINISH ACTIVATION)
  const handleCompleteActivation = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!actEmail.trim()) {
      setErrorMessage('A valid email address is required for your account.');
      return;
    }

    if (actPassword.length < 6) {
      setErrorMessage('Password must be at least 6 characters.');
      return;
    }

    if (actPassword !== actConfirmPassword) {
      setErrorMessage('Passwords do not match. Please re-enter.');
      return;
    }

    setIsLoading(true);
    try {
      const cleanNum = actResidentNumber.trim().padStart(3, '0');
      const res = await dbService.activateResidentAccount({
        residentNumber: cleanNum,
        identifier: actIdentifier,
        email: actEmail,
        password: actPassword
      });

      if (res.success && res.resident) {
        setSuccessMessage('Account activated successfully! Logging you in...');
        setTimeout(() => {
          onSuccess(res.resident!);
          if (isModal && onCloseModal) onCloseModal();
        }, 800);
      } else {
        setErrorMessage(res.message || 'Account activation failed. Please check your details.');
      }
    } catch {
      setErrorMessage('Account activation failed. Please try again or contact estate administration.');
    } finally {
      setIsLoading(false);
    }
  };

  // 6. FORGOT PASSWORD
  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!forgotEmail.trim()) {
      setErrorMessage('Please enter your registered email address.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await authService.resetPassword(forgotEmail.trim());
      if (res.success) {
        setSuccessMessage(res.message || `Password recovery instructions dispatched to ${forgotEmail}.`);
      } else {
        setErrorMessage(res.error || 'Unable to send password reset email.');
      }
    } catch {
      setErrorMessage('Password reset request failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // 7. FAST TEST PROFILE SWITCHER (DEV / DEMO SPEED)
  const handleQuickSelect = async (num: string, phone: string) => {
    setEstateNumber(num);
    setPhoneNumber(phone);
    setErrorMessage(null);
    setSuccessMessage(null);
    setIsLoading(true);
    try {
      const res = await dbService.authResident(num, phone);
      if (res.success && res.resident) {
        onSuccess(res.resident);
        if (isModal && onCloseModal) onCloseModal();
      } else {
        setErrorMessage(res.message || 'Failed to select test resident.');
      }
    } catch {
      setErrorMessage('Failed to sign in with test resident.');
    } finally {
      setIsLoading(false);
    }
  };

  const containerContent = (
    <div className="w-full max-w-[480px] sm:max-w-lg bg-white rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-200/90 overflow-hidden mx-auto transition-all flex flex-col max-h-[calc(100dvh-16px)] sm:max-h-[calc(100dvh-32px)]">
      {!isModal && (
        <SEOHead
          title="Resident Portal Login & Account Activation — Finger of God Estate"
          description="Log in to your Finger of God Estate resident portal to manage security passes, pay monthly security levies, and access resident resources."
          keywords={['Resident Login', 'Account Activation', 'Finger of God Estate Resident Portal', 'Estate Dues']}
          canonicalPath="/#resident-portal"
          ogType="website"
        />
      )}

      {/* Brand Card Header (Fixed at top of portal modal/card) */}
      <div className="flex-shrink-0 bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950 text-white px-3.5 py-2.5 sm:px-5 sm:py-3.5 relative border-b border-slate-800">
        <button
          onClick={handleClosePortal}
          className="absolute top-2.5 right-2.5 sm:top-3.5 sm:right-3.5 w-10 h-10 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800/90 active:bg-slate-700 transition-colors cursor-pointer border border-slate-700/70 flex items-center justify-center z-20 shadow-xs focus:outline-none focus:ring-2 focus:ring-emerald-400"
          title="Close Resident Portal"
          aria-label="Close Resident Portal"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center pr-12">
          <EstateLogo
            size="sm"
            variant="horizontal"
            theme="dark"
            estateName={estateSettings?.estate_name || 'Finger of God Estate'}
            subtitle="RESIDENT PORTAL • ASABA"
          />
        </div>

        <div className="mt-2 pt-1.5 border-t border-slate-800/80 flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 sm:gap-2">
            <h2 id="resident-portal-heading" className="text-sm sm:text-base font-extrabold text-white tracking-tight flex items-center gap-1.5">
              <span>Resident Portal</span>
            </h2>
            <span className="px-1.5 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 text-[9px] sm:text-[10px] font-mono font-bold tracking-wider border border-emerald-500/30 uppercase">
              SECURITY
            </span>
          </div>

          <div className="text-right flex items-center gap-1.5">
            <span className="text-[10px] sm:text-[11px] font-mono text-emerald-400 font-semibold">Estate ID 001–300</span>
            <span className="text-[9px] text-slate-400 hidden sm:inline">• 256-Bit TLS</span>
          </div>
        </div>
      </div>

      {/* Tabs Switcher: Resident Login vs Account Activation (Fixed under header) */}
      <div className="flex-shrink-0 grid grid-cols-2 border-b border-slate-200 bg-slate-50/95 text-xs font-bold">
        <button
          type="button"
          onClick={() => {
            setActiveTab('login');
            setOtpStep('enter_details');
            setErrorMessage(null);
            setSuccessMessage(null);
          }}
          className={`py-2.5 sm:py-3 px-3 sm:px-4 text-center transition-colors cursor-pointer border-b-2 flex items-center justify-center gap-1.5 sm:gap-2 min-h-[40px] ${
            activeTab === 'login' || activeTab === 'password_login'
              ? 'bg-white text-emerald-800 border-emerald-700 shadow-2xs font-extrabold'
              : 'text-slate-600 border-transparent hover:text-slate-900 hover:bg-slate-100/70'
          }`}
        >
          <KeyRound className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
          <span className="truncate">Resident Login</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveTab('activate');
            setActStep('verify');
            setErrorMessage(null);
            setSuccessMessage(null);
          }}
          className={`py-2.5 sm:py-3 px-3 sm:px-4 text-center transition-colors cursor-pointer border-b-2 flex items-center justify-center gap-1.5 sm:gap-2 min-h-[40px] ${
            activeTab === 'activate'
              ? 'bg-white text-emerald-800 border-emerald-700 shadow-2xs font-extrabold'
              : 'text-slate-600 border-transparent hover:text-slate-900 hover:bg-slate-100/70'
          }`}
        >
          <UserCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
          <span className="truncate">Activate Account</span>
        </button>
      </div>

      {/* Main Scrollable Content Area */}
      <div className="flex-1 overflow-y-auto overscroll-contain p-3.5 sm:p-5 space-y-3 sm:space-y-3.5">
        {/* Security Lockout Banner */}
        {lockoutTimer > 0 && (
          <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-start gap-2.5 animate-in fade-in">
            <Lock className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Security Protection Active</p>
              <p className="mt-0.5 leading-relaxed">
                Too many attempts. Login access temporarily locked. Please wait{' '}
                <span className="font-mono font-bold text-amber-950">{lockoutTimer} seconds</span>.
              </p>
            </div>
          </div>
        )}

        {/* Error Alert */}
        {errorMessage && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-start gap-2.5 animate-in fade-in duration-200">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-bold">Verification Notice</p>
              <p className="mt-0.5 leading-relaxed">{errorMessage}</p>
            </div>
          </div>
        )}

        {/* Success Alert */}
        {successMessage && (
          <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 flex items-start gap-2.5 animate-in fade-in duration-200">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-bold">Confirmed</p>
              <p className="mt-0.5 leading-relaxed">{successMessage}</p>
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* TAB 1: RESIDENT LOGIN (ESTATE NUMBER + PHONE NUMBER + OTP) */}
        {/* ============================================================ */}
        {activeTab === 'login' && (
          <div>
            {otpStep === 'enter_details' ? (
              <form onSubmit={handleSendOtp} className="space-y-3 sm:space-y-3.5">
                <div className="p-2.5 sm:p-3 bg-emerald-50/70 border border-emerald-100 rounded-xl text-xs text-emerald-950">
                  <div className="flex items-center gap-1.5 font-bold text-emerald-900 mb-0.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0" />
                    <span>Resident Verification</span>
                  </div>
                  <p className="text-emerald-800 leading-relaxed text-[11px]">
                    Enter your 3-digit estate number (001–300) and registered phone number. We'll send a secure one-time verification code to log you in.
                  </p>
                </div>

                {/* Estate Number Field (001 – 300) */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-[11px] sm:text-xs font-bold uppercase tracking-wider text-slate-700">
                      Estate Number
                    </label>
                    <span className="text-[10px] sm:text-[11px] font-mono font-semibold text-emerald-800">Range: 001 – 300</span>
                  </div>
                  <div className="relative">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-mono text-sm font-bold">
                      #
                    </div>
                    <input
                      type="text"
                      value={estateNumber}
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, '').slice(0, 3);
                        setEstateNumber(val);
                      }}
                      placeholder="e.g. 024"
                      maxLength={3}
                      required
                      disabled={isLoading || lockoutTimer > 0}
                      className="w-full pl-8 pr-3.5 py-2 sm:py-2.5 bg-slate-50/80 border border-slate-300 rounded-xl font-mono text-base font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all shadow-2xs"
                    />
                  </div>
                  <p className="text-[10px] text-slate-500 mt-0.5">
                    Enter your registered estate number (e.g. 024 or 001).
                  </p>
                </div>

                {/* Registered Phone Number Field */}
                <div>
                  <label className="block text-[11px] sm:text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Registered Phone Number
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="tel"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      placeholder="080XXXXXXXX"
                      required
                      disabled={isLoading || lockoutTimer > 0}
                      className="w-full pl-9 pr-3.5 py-2 sm:py-2.5 bg-slate-50/80 border border-slate-300 rounded-xl text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all shadow-2xs"
                    />
                  </div>
                  <p className="text-[10px] text-slate-500 mt-0.5">
                    Must match your official telephone number on the estate resident register.
                  </p>
                </div>

                {/* Remember Device Checkbox */}
                <div className="pt-0.5">
                  <label className="flex items-start gap-2.5 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={rememberDevice}
                      onChange={(e) => setRememberDevice(e.target.checked)}
                      className="w-4 h-4 mt-0.5 rounded text-emerald-600 border-slate-300 focus:ring-emerald-500 cursor-pointer"
                    />
                    <div className="text-xs">
                      <span className="font-bold text-slate-800 group-hover:text-emerald-800 transition-colors text-[11px] sm:text-xs">
                        Remember this device
                      </span>
                      <p className="text-[10px] sm:text-[11px] text-slate-500 leading-tight mt-0.5">
                        Only select this on your trusted personal phone or computer.
                      </p>
                    </div>
                  </label>
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={isLoading || lockoutTimer > 0}
                  className="w-full py-2.5 sm:py-3 px-4 rounded-xl min-h-[42px] sm:min-h-[44px] bg-emerald-700 hover:bg-emerald-800 disabled:bg-slate-300 text-white font-bold text-xs sm:text-sm tracking-wide transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 cursor-pointer mt-1"
                >
                  {isLoading ? (
                    <span className="flex items-center gap-2">
                      <RotateCw className="w-4 h-4 animate-spin" />
                      <span>Verifying Resident Record...</span>
                    </span>
                  ) : (
                    <>
                      <Smartphone className="w-4 h-4" />
                      <span>SEND VERIFICATION CODE</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>

                {/* Alternative: Switch to Email + Password Login */}
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
                  <span>Prefer password login?</span>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab('password_login');
                      setErrorMessage(null);
                      setSuccessMessage(null);
                    }}
                    className="font-bold text-emerald-700 hover:text-emerald-800 hover:underline cursor-pointer text-xs"
                  >
                    Sign in with Password
                  </button>
                </div>
              </form>
            ) : (
              /* STEP 2: ENTER OTP CODE */
              <form onSubmit={handleVerifyOtp} className="space-y-3.5 sm:space-y-4">
                <div className="p-3 bg-emerald-50/80 border border-emerald-200 rounded-xl text-xs text-emerald-950">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-extrabold text-emerald-900 text-xs sm:text-sm">Enter Verification Code</span>
                    <button
                      type="button"
                      onClick={() => {
                        setOtpStep('enter_details');
                        setErrorMessage(null);
                        setSuccessMessage(null);
                      }}
                      className="text-[11px] font-bold text-emerald-700 hover:text-emerald-900 underline flex items-center gap-1 cursor-pointer"
                    >
                      <ArrowLeft className="w-3 h-3" /> Change Number
                    </button>
                  </div>
                  <p className="text-emerald-800 text-[11px] sm:text-xs leading-relaxed">
                    We dispatched a 6-digit code to registered resident contact{' '}
                    <span className="font-bold text-emerald-950">{maskedPhone}</span> (Estate #{estateNumber.padStart(3, '0')}).
                  </p>

                  {/* Dev / Demo Mode Safe Hint */}
                  {demoOtpHint && (
                    <div className="mt-2 pt-1.5 border-t border-emerald-200/60 flex items-center justify-between text-[11px]">
                      <span className="text-emerald-700 font-semibold flex items-center gap-1">
                        <Info className="w-3.5 h-3.5" /> Test Code:
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          const digits = demoOtpHint.split('');
                          setOtpCode(digits);
                        }}
                        className="px-2 py-0.5 bg-emerald-200/80 hover:bg-emerald-300 text-emerald-950 rounded font-mono font-bold tracking-wider cursor-pointer"
                      >
                        Auto-fill: {demoOtpHint}
                      </button>
                    </div>
                  )}
                </div>

                {/* 6-Box OTP Input */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2 text-center">
                    6-Digit Verification Code
                  </label>
                  <div className="flex items-center justify-center gap-1.5 sm:gap-2.5">
                    {otpCode.map((digit, idx) => (
                      <input
                        key={idx}
                        ref={(el) => { otpInputRefs.current[idx] = el; }}
                        type="text"
                        inputMode="numeric"
                        maxLength={1}
                        value={digit}
                        onChange={(e) => handleOtpChange(idx, e.target.value)}
                        onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                        disabled={isLoading || lockoutTimer > 0}
                        className="w-10 h-11 sm:w-11 sm:h-12 text-center font-mono text-lg sm:text-xl font-extrabold text-slate-900 bg-slate-50 border border-slate-300 rounded-lg sm:rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white focus:border-emerald-500 shadow-2xs transition-all"
                      />
                    ))}
                  </div>
                  <p className="text-[10px] sm:text-[11px] text-slate-500 text-center mt-1.5">
                    Code expires in 10 minutes. Do not disclose this code to anyone.
                  </p>
                </div>

                {/* Resend OTP Section */}
                <div className="flex items-center justify-between text-xs pt-0.5">
                  <span className="text-slate-600 text-[11px] sm:text-xs">Didn't receive the SMS?</span>
                  {resendCooldown > 0 ? (
                    <span className="font-mono text-slate-500 text-[11px]">
                      Resend in <span className="font-bold text-slate-800">{resendCooldown}s</span>
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={handleResendOtp}
                      disabled={isLoading || lockoutTimer > 0}
                      className="font-bold text-emerald-700 hover:text-emerald-800 hover:underline inline-flex items-center gap-1 cursor-pointer text-[11px] sm:text-xs"
                    >
                      <RotateCw className="w-3 h-3" />
                      <span>Resend OTP Code</span>
                    </button>
                  )}
                </div>

                {/* Submit & Back Buttons */}
                <div className="pt-1 flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setOtpStep('enter_details');
                      setErrorMessage(null);
                      setSuccessMessage(null);
                    }}
                    className="w-full sm:w-auto px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 font-bold text-xs tracking-wide transition-all flex items-center justify-center gap-1.5 cursor-pointer order-2 sm:order-1 shadow-2xs min-h-[40px]"
                  >
                    <ArrowLeft className="w-3.5 h-3.5 text-slate-500" />
                    <span>Back</span>
                  </button>
                  <button
                    type="submit"
                    disabled={isLoading || lockoutTimer > 0 || otpCode.join('').length !== 6}
                    className="w-full sm:flex-1 py-2.5 sm:py-3 px-4 rounded-xl min-h-[42px] sm:min-h-[44px] bg-emerald-700 hover:bg-emerald-800 disabled:bg-slate-300 text-white font-bold text-xs tracking-wide transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer order-1 sm:order-2"
                  >
                    {isLoading ? (
                      <span className="flex items-center gap-2">
                        <RotateCw className="w-4 h-4 animate-spin" />
                        <span>Verifying Security Code...</span>
                      </span>
                    ) : (
                      <>
                        <ShieldCheck className="w-4 h-4" />
                        <span>VERIFY & ACCESS PORTAL</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

        {/* ============================================================ */}
        {/* TAB 2: ALTERNATIVE EMAIL + PASSWORD LOGIN */}
        {/* ============================================================ */}
        {activeTab === 'password_login' && (
          <form onSubmit={handlePasswordLogin} className="space-y-3 sm:space-y-3.5">
            <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 flex items-center justify-between">
              <span className="font-semibold text-slate-800 text-[11px] sm:text-xs">Password Sign In</span>
              <button
                type="button"
                onClick={() => {
                  setActiveTab('login');
                  setOtpStep('enter_details');
                  setErrorMessage(null);
                  setSuccessMessage(null);
                }}
                className="text-xs font-bold text-emerald-700 hover:text-emerald-900 underline flex items-center gap-1 cursor-pointer"
              >
                <Smartphone className="w-3 h-3" />
                <span>Use Phone OTP Login</span>
              </button>
            </div>

            <div>
              <label className="block text-[11px] sm:text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                Registered Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  placeholder="resident@example.com"
                  required
                  className="w-full pl-9 pr-3.5 py-2 sm:py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-[11px] sm:text-xs font-bold uppercase tracking-wider text-slate-700">
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('forgot');
                    setForgotEmail(loginEmail);
                    setErrorMessage(null);
                    setSuccessMessage(null);
                  }}
                  className="text-xs font-bold text-emerald-700 hover:text-emerald-800 hover:underline cursor-pointer"
                >
                  Forgot Password?
                </button>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full pl-9 pr-3.5 py-2 sm:py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 sm:py-3 px-4 rounded-xl min-h-[42px] sm:min-h-[44px] bg-emerald-700 hover:bg-emerald-800 disabled:bg-slate-300 text-white font-bold text-xs sm:text-sm tracking-wide transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer mt-1"
            >
              {isLoading ? (
                <span>Verifying Credentials...</span>
              ) : (
                <>
                  <KeyRound className="w-4 h-4" />
                  <span>SIGN IN TO RESIDENT PORTAL</span>
                </>
              )}
            </button>
          </form>
        )}

        {/* ============================================================ */}
        {/* TAB 3: ACTIVATE ACCOUNT (2-STEP SAFE FLOW) */}
        {/* ============================================================ */}
        {activeTab === 'activate' && (
          <div>
            {actStep === 'verify' ? (
              <form onSubmit={handleVerifyForActivation} className="space-y-3 sm:space-y-3.5">
                <div className="p-2.5 sm:p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-950">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-emerald-900 text-xs">Step 1 of 2: Locate Resident Record</span>
                    <button
                      type="button"
                      onClick={() => {
                        setActiveTab('login');
                        setErrorMessage(null);
                        setSuccessMessage(null);
                      }}
                      className="text-[11px] font-bold text-emerald-700 hover:text-emerald-900 underline flex items-center gap-1 cursor-pointer transition-colors"
                    >
                      <ArrowLeft className="w-3 h-3" /> Back
                    </button>
                  </div>
                  <p className="mt-0.5 text-emerald-800 text-[11px]">
                    Enter your 3-digit Estate Number (001–300) and registered phone number to verify your record.
                  </p>
                </div>

                <div>
                  <label className="block text-[11px] sm:text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Resident / Estate Number
                  </label>
                  <div className="relative">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-mono text-sm font-bold">
                      #
                    </div>
                    <input
                      type="text"
                      value={actResidentNumber}
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, '').slice(0, 3);
                        setActResidentNumber(val);
                      }}
                      placeholder="024"
                      maxLength={3}
                      required
                      className="w-full pl-8 pr-3.5 py-2 sm:py-2.5 bg-slate-50 border border-slate-300 rounded-xl font-mono text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  <p className="text-[10px] text-slate-500 mt-0.5">Your estate registration identifier (001 – 300)</p>
                </div>

                <div>
                  <label className="block text-[11px] sm:text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Registered Phone Number or Email
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={actIdentifier}
                      onChange={(e) => setActIdentifier(e.target.value)}
                      placeholder="080XXXXXXXX or email"
                      required
                      className="w-full pl-9 pr-3.5 py-2 sm:py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  <p className="text-[10px] text-slate-500 mt-0.5">Must match the contact registered with estate management</p>
                </div>

                <div className="pt-1 flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab('login');
                      setErrorMessage(null);
                      setSuccessMessage(null);
                    }}
                    className="w-full sm:w-auto px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 font-bold text-xs tracking-wide transition-all flex items-center justify-center gap-1.5 cursor-pointer order-2 sm:order-1 shadow-2xs min-h-[40px]"
                  >
                    <ArrowLeft className="w-3.5 h-3.5 text-slate-500" />
                    <span>Back</span>
                  </button>
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full sm:flex-1 py-2.5 sm:py-3 px-4 rounded-xl min-h-[42px] sm:min-h-[44px] bg-emerald-700 hover:bg-emerald-800 disabled:bg-slate-300 text-white font-bold text-xs tracking-wide transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer order-1 sm:order-2"
                  >
                    {isLoading ? (
                      <span>Verifying Record...</span>
                    ) : (
                      <>
                        <span>VERIFY RESIDENT RECORD</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleCompleteActivation} className="space-y-3 sm:space-y-3.5">
                <div className="p-2.5 sm:p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-950">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-emerald-900 text-xs">Step 2 of 2: Set Security Credentials</span>
                    <button
                      type="button"
                      onClick={() => setActStep('verify')}
                      className="text-[11px] font-bold text-emerald-700 hover:text-emerald-900 underline flex items-center gap-1 cursor-pointer transition-colors"
                    >
                      <ArrowLeft className="w-3 h-3" /> Back
                    </button>
                  </div>
                  <p className="mt-0.5 font-semibold text-slate-900 text-[11px]">
                    Resident: <span className="text-emerald-900 font-bold">#{actResidentNumber.padStart(3, '0')}</span> • {verifiedData?.residentName}
                  </p>
                </div>

                <div>
                  <label className="block text-[11px] sm:text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Account Email Address
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      value={actEmail}
                      onChange={(e) => setActEmail(e.target.value)}
                      placeholder="your.email@example.com"
                      required
                      className="w-full pl-9 pr-3.5 py-2 sm:py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  <p className="text-[10px] text-slate-500 mt-0.5">This email can be used for receipts and notices</p>
                </div>

                <div>
                  <label className="block text-[11px] sm:text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Create Password
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="password"
                      value={actPassword}
                      onChange={(e) => setActPassword(e.target.value)}
                      placeholder="Minimum 6 characters"
                      required
                      minLength={6}
                      className="w-full pl-9 pr-3.5 py-2 sm:py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] sm:text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Confirm Password
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="password"
                      value={actConfirmPassword}
                      onChange={(e) => setActConfirmPassword(e.target.value)}
                      placeholder="Re-enter your password"
                      required
                      minLength={6}
                      className="w-full pl-9 pr-3.5 py-2 sm:py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>

                <div className="pt-1 flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setActStep('verify')}
                    className="w-full sm:w-auto px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 font-bold text-xs tracking-wide transition-all flex items-center justify-center gap-1.5 cursor-pointer order-2 sm:order-1 shadow-2xs min-h-[40px]"
                  >
                    <ArrowLeft className="w-3.5 h-3.5 text-slate-500" />
                    <span>Back</span>
                  </button>
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full sm:flex-1 py-2.5 sm:py-3 px-4 rounded-xl min-h-[42px] sm:min-h-[44px] bg-emerald-700 hover:bg-emerald-800 disabled:bg-slate-300 text-white font-bold text-xs tracking-wide transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer order-1 sm:order-2"
                  >
                    {isLoading ? (
                      <span>Activating Account...</span>
                    ) : (
                      <>
                        <UserCheck className="w-4 h-4" />
                        <span>ACTIVATE ACCOUNT & SIGN IN</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

        {/* ============================================================ */}
        {/* TAB 4: FORGOT PASSWORD */}
        {/* ============================================================ */}
        {activeTab === 'forgot' && (
          <form onSubmit={handleForgotPassword} className="space-y-3 sm:space-y-3.5">
            <div className="p-2.5 sm:p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700">
              <p className="font-bold text-slate-900">Reset Your Security Password</p>
              <p className="mt-0.5 text-slate-600 text-[11px]">
                Enter your registered resident email address and we'll dispatch a secure recovery link.
              </p>
            </div>

            <div>
              <label className="block text-[11px] sm:text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                Registered Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  placeholder="resident@example.com"
                  required
                  className="w-full pl-9 pr-3.5 py-2 sm:py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            <div className="pt-1 flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setActiveTab('login');
                  setErrorMessage(null);
                  setSuccessMessage(null);
                }}
                className="w-full sm:w-auto px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 font-bold text-xs tracking-wide transition-all flex items-center justify-center gap-1.5 cursor-pointer order-2 sm:order-1 shadow-2xs min-h-[40px]"
              >
                <ArrowLeft className="w-3.5 h-3.5 text-slate-500" />
                <span>Back to Login</span>
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="w-full sm:flex-1 py-2.5 sm:py-3 px-4 rounded-xl min-h-[42px] sm:min-h-[44px] bg-emerald-700 hover:bg-emerald-800 disabled:bg-slate-300 text-white font-bold text-xs tracking-wide transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer order-1 sm:order-2"
              >
                {isLoading ? (
                  <span>Dispatching Reset Link...</span>
                ) : (
                  <>
                    <Mail className="w-4 h-4" />
                    <span>SEND RECOVERY LINK</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}

        {/* ============================================================ */}
        {/* LOGIN HELP SECTION */}
        {/* ============================================================ */}
        <div className="pt-2 border-t border-slate-100">
          <div className="bg-slate-50/80 rounded-xl p-2.5 sm:p-3 border border-slate-200/80 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-800 flex items-center gap-1.5 text-[11px] sm:text-xs">
                <HelpCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>Need help accessing your account?</span>
              </span>
              <button
                type="button"
                onClick={() => setShowHelpModal(!showHelpModal)}
                className="text-emerald-700 hover:text-emerald-800 font-bold underline cursor-pointer text-[11px] sm:text-xs"
              >
                {showHelpModal ? 'Hide Help' : 'View Support'}
              </button>
            </div>

            {showHelpModal && (
              <div className="mt-2.5 pt-2 border-t border-slate-200/60 space-y-2 text-slate-600 text-[11px] leading-relaxed animate-in fade-in">
                <p>
                  If you recently changed your phone number or cannot receive verification SMS, contact estate administration or visit the Phase 1 Security Desk.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-1">
                  <a
                    href="tel:08023456789"
                    className="p-2 rounded-lg bg-white border border-slate-200 font-semibold text-slate-800 hover:text-emerald-700 hover:border-emerald-300 flex items-center gap-2 transition-all shadow-2xs text-[11px]"
                  >
                    <Phone className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>Desk: 0802 345 6789</span>
                  </a>
                  <a
                    href="mailto:support@fingerofgodestate.ng"
                    className="p-2 rounded-lg bg-white border border-slate-200 font-semibold text-slate-800 hover:text-emerald-700 hover:border-emerald-300 flex items-center gap-2 transition-all shadow-2xs text-[11px]"
                  >
                    <Mail className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>Email Support Desk</span>
                  </a>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Quick Test Demo Selection */}
        <div className="pt-2 border-t border-slate-100 space-y-1.5">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
            Instant Test Resident Profiles:
          </span>
          <div className="grid grid-cols-3 gap-1.5">
            <button
              type="button"
              onClick={() => handleQuickSelect('001', '08023456789')}
              className="text-left p-1.5 sm:p-2 rounded-lg sm:rounded-xl border border-emerald-200 bg-emerald-50/60 hover:bg-emerald-100/80 transition-colors cursor-pointer min-h-[40px] flex flex-col justify-center shadow-2xs"
              title="Test Profile 001 - Engr. Babatunde"
            >
              <div className="flex items-center justify-between">
                <span className="font-mono font-bold text-emerald-950 text-[11px] sm:text-xs">#001</span>
                <span className="text-[9px] font-mono text-emerald-700 hidden sm:inline">0802...</span>
              </div>
              <span className="font-semibold text-emerald-900 text-[10px] sm:text-[11px] truncate block leading-tight">Engr. Babatunde</span>
            </button>

            <button
              type="button"
              onClick={() => handleQuickSelect('002', '08098765432')}
              className="text-left p-1.5 sm:p-2 rounded-lg sm:rounded-xl border border-emerald-200 bg-emerald-50/60 hover:bg-emerald-100/80 transition-colors cursor-pointer min-h-[40px] flex flex-col justify-center shadow-2xs"
              title="Test Profile 002 - Dr. Chioma"
            >
              <div className="flex items-center justify-between">
                <span className="font-mono font-bold text-emerald-950 text-[11px] sm:text-xs">#002</span>
                <span className="text-[9px] font-mono text-emerald-700 hidden sm:inline">0809...</span>
              </div>
              <span className="font-semibold text-emerald-900 text-[10px] sm:text-[11px] truncate block leading-tight">Dr. Chioma</span>
            </button>

            <button
              type="button"
              onClick={() => handleQuickSelect('003', '08123459876')}
              className="text-left p-1.5 sm:p-2 rounded-lg sm:rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer min-h-[40px] flex flex-col justify-center shadow-2xs"
              title="Test Profile 003 - Alhaji Usman"
            >
              <div className="flex items-center justify-between">
                <span className="font-mono font-bold text-slate-900 text-[11px] sm:text-xs">#003</span>
                <span className="text-[9px] font-mono text-slate-500 hidden sm:inline">0812...</span>
              </div>
              <span className="font-semibold text-slate-800 text-[10px] sm:text-[11px] truncate block leading-tight">Alhaji Usman</span>
            </button>
          </div>
        </div>

        {/* Security & RLS Privacy Guarantee Notice */}
        <div className="flex items-center justify-center gap-1.5 text-[10px] text-slate-500 pt-0.5 pb-0.5">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
          <span>RLS security restricts access strictly to your individual estate records.</span>
        </div>
      </div>
    </div>
  );

  if (isModal) {
    return (
      <div 
        className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-3 md:p-4 bg-slate-950/80 backdrop-blur-xs overflow-hidden"
        role="dialog"
        aria-modal="true"
        aria-labelledby="resident-portal-heading"
      >
        <div className="w-full max-w-[480px] sm:max-w-lg flex flex-col justify-center my-auto">
          {containerContent}
        </div>
      </div>
    );
  }

  // Full Page Standalone Layout for /login route
  return (
    <div className="min-h-screen bg-slate-100/90 py-3 sm:py-6 px-2 sm:px-4 flex flex-col items-center justify-center">
      {onNavigateToHome && (
        <div className="w-full max-w-[480px] sm:max-w-lg mb-2 flex items-center justify-between">
          <button
            onClick={onNavigateToHome}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-slate-200/90 text-xs font-bold text-slate-700 hover:text-emerald-700 hover:border-emerald-300 hover:bg-emerald-50/50 shadow-2xs transition-all cursor-pointer group"
          >
            <ArrowLeft className="w-3.5 h-3.5 text-emerald-600 group-hover:-translate-x-0.5 transition-transform" />
            <span>Back to Estate Home</span>
          </button>
          <span className="text-xs font-bold text-slate-600">Finger of God Estate</span>
        </div>
      )}
      {containerContent}
    </div>
  );
};
