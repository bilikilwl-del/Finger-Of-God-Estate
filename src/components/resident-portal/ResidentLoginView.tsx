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
  Laptop,
  User,
  Home
} from 'lucide-react';
import { dbService, authService, residentSessionService } from '../../lib/supabase';
import { Resident, EstateSettings, LivenessVerificationStatus } from '../../types/database';
import { normalizeResidentNumber } from '../../lib/residentUtils';
import { EstateLogo } from '../common/EstateLogo';
import { SEOHead } from '../common/SEOHead';
import { ResidentLivenessCapture } from '../auth/ResidentLivenessCapture';

interface ResidentLoginViewProps {
  onSuccess: (resident: Resident) => void;
  onNavigateToHome?: () => void;
  estateSettings?: EstateSettings;
  isModal?: boolean;
  onCloseModal?: () => void;
  initialTab?: 'id_email_login' | 'update_details' | 'login' | 'activate' | 'forgot' | 'password_login';
}

export const ResidentLoginView: React.FC<ResidentLoginViewProps> = ({
  onSuccess,
  onNavigateToHome,
  estateSettings,
  isModal = false,
  onCloseModal,
  initialTab = 'id_email_login'
}) => {
  // Navigation Tabs: 'id_email_login' | 'update_details' | 'login' (OTP) | 'password_login' | 'activate' | 'forgot'
  const [activeTab, setActiveTab] = useState<'id_email_login' | 'update_details' | 'login' | 'password_login' | 'activate' | 'forgot'>('id_email_login');

  useEffect(() => {
    if (initialTab === 'password_login') {
      setActiveTab('password_login');
    } else if (initialTab === 'activate' || initialTab === 'update_details') {
      setActiveTab('update_details');
    } else if (initialTab === 'forgot') {
      setActiveTab('forgot');
    } else if (initialTab === 'login') {
      setActiveTab('id_email_login');
    } else {
      setActiveTab('id_email_login');
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

  // Activation Flow State (SMS + Email OTP-based activation with resident-entered email)
  const [actStep, setActStep] = useState<'enter_details' | 'enter_otp'>('enter_details');
  const [actResidentNumber, setActResidentNumber] = useState('');
  const [actPhoneNumber, setActPhoneNumber] = useState('');
  const [actEmail, setActEmail] = useState('');
  const [actOtpCode, setActOtpCode] = useState(['', '', '', '', '', '']);
  const [actMaskedPhone, setActMaskedPhone] = useState('');
  const [actMaskedEmail, setActMaskedEmail] = useState('');
  const [actResidentName, setActResidentName] = useState('');
  const [actResendCooldown, setActResendCooldown] = useState(0);
  const [actRememberDevice, setActRememberDevice] = useState(false);
  const [actIsAlreadyActivated, setActIsAlreadyActivated] = useState(false);
  const actInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Forgot Password State
  const [forgotEmail, setForgotEmail] = useState('');

  // Support / Help Modal or Drawer
  const [showHelpModal, setShowHelpModal] = useState(false);

  // ID + Email Login State (Primary - with 6-digit Email OTP verification)
  const [residentIdInput, setResidentIdInput] = useState('');
  const [residentEmailInput, setResidentEmailInput] = useState('');
  const [idEmailStep, setIdEmailStep] = useState<'enter_credentials' | 'enter_otp'>('enter_credentials');
  const [idEmailOtpCode, setIdEmailOtpCode] = useState(['', '', '', '', '', '']);
  const [idEmailMasked, setIdEmailMasked] = useState('');
  const [idEmailResendCooldown, setIdEmailResendCooldown] = useState(0);
  const idEmailOtpInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Activate Account State (Full Names, Phone Numbers, Email Address, Home Address - One-Time Only)
  const [updateResidentNumber, setUpdateResidentNumber] = useState('');
  const [updateFullName, setUpdateFullName] = useState('');
  const [updatePhoneNumber, setUpdatePhoneNumber] = useState('');
  const [updateEmail, setUpdateEmail] = useState('');
  const [updateHomeAddress, setUpdateHomeAddress] = useState('');
  const [updateHouseNumber, setUpdateHouseNumber] = useState('');
  const [isDetailsStepTwo, setIsDetailsStepTwo] = useState(false);

  // Liveness & Profile Photo Verification State for Account Activation
  const [livenessSessionId, setLivenessSessionId] = useState<string>('');
  const [livenessStatus, setLivenessStatus] = useState<LivenessVerificationStatus>('NOT_STARTED');

  // Common UI State
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const otpInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Cooldown Countdown Timer for ID + Email OTP Resend
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (idEmailResendCooldown > 0) {
      interval = setInterval(() => {
        setIdEmailResendCooldown((prev) => (prev > 1 ? prev - 1 : 0));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [idEmailResendCooldown]);

  // Focus first OTP box when entering OTP step in ID + Email Login
  useEffect(() => {
    if (activeTab === 'id_email_login' && idEmailStep === 'enter_otp' && idEmailOtpInputRefs.current[0]) {
      idEmailOtpInputRefs.current[0]?.focus();
    }
  }, [activeTab, idEmailStep]);

  const handleIdEmailOtpChange = (index: number, value: string) => {
    if (lockoutTimer > 0) return;
    const cleanVal = value.replace(/\D/g, '');

    if (cleanVal.length > 1) {
      const pasted = cleanVal.slice(0, 6).split('');
      const newOtp = [...idEmailOtpCode];
      pasted.forEach((ch, idx) => {
        if (idx < 6) newOtp[idx] = ch;
      });
      setIdEmailOtpCode(newOtp);
      const nextIndex = Math.min(pasted.length, 5);
      idEmailOtpInputRefs.current[nextIndex]?.focus();
      return;
    }

    const newOtp = [...idEmailOtpCode];
    newOtp[index] = cleanVal;
    setIdEmailOtpCode(newOtp);

    if (cleanVal && index < 5) {
      idEmailOtpInputRefs.current[index + 1]?.focus();
    }
  };

  const handleIdEmailOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !idEmailOtpCode[index] && index > 0) {
      idEmailOtpInputRefs.current[index - 1]?.focus();
    }
  };

  // Cooldown Countdown Timer for Resend Activation OTP
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (actResendCooldown > 0) {
      interval = setInterval(() => {
        setActResendCooldown((prev) => (prev > 1 ? prev - 1 : 0));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [actResendCooldown]);

  // Focus the first OTP box when transitioning to enter_otp in activation
  useEffect(() => {
    if (activeTab === 'activate' && actStep === 'enter_otp' && actInputRefs.current[0]) {
      actInputRefs.current[0]?.focus();
    }
  }, [activeTab, actStep]);

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

  // CHECK RESIDENT ID FOR ONE-TIME ACCOUNT ACTIVATION
  const handleLookupIdForUpdate = async (idInput: string) => {
    const raw = idInput.trim();
    if (!raw) {
      setErrorMessage('Please enter your Resident ID number (e.g. 1 or 001).');
      return;
    }
    const cleanNum = normalizeResidentNumber(raw);
    setUpdateResidentNumber(cleanNum);
    setErrorMessage(null);
    setSuccessMessage(null);
    setIsLoading(true);

    try {
      const res = await dbService.checkResidentId(cleanNum);
      if (res.found) {
        // STRICT ONE-TIME ACTIVATION RULE:
        // If already activated, do NOT allow activating again! Direct resident to Login.
        if (res.already_activated || !res.needs_update) {
          setIsDetailsStepTwo(false);
          setActiveTab('id_email_login');
          setIdEmailStep('enter_credentials');
          setResidentIdInput(cleanNum);
          setErrorMessage(
            `Resident #${cleanNum} account has already been activated and cannot be activated again. Please log in below with your Resident ID and registered Email (${res.masked_email || 'your email'}) to receive your login OTP.`
          );
          return;
        }

        setIsDetailsStepTwo(true);
        setActiveTab('update_details');
        setUpdateFullName('');
        setUpdatePhoneNumber('');
        setUpdateEmail('');
        setUpdateHouseNumber('');
        setUpdateHomeAddress('');
        setLivenessSessionId('');
        setLivenessStatus('NOT_STARTED');
        setSuccessMessage(`Resident #${cleanNum} verified! Please enter your Full Names, Phone Number, Email Address, Home Address, and snap your face photo to activate your account.`);
      } else {
        setErrorMessage(res.message || `Resident ID #${cleanNum} not found in estate directory (valid IDs: 001 - 100).`);
      }
    } catch {
      setErrorMessage('Unable to connect to the estate directory. Please check your network.');
    } finally {
      setIsLoading(false);
    }
  };

  // STEP 1: SUBMIT RESIDENT ID & EMAIL TO RECEIVE EMAIL OTP
  const handleIdEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    const rawId = residentIdInput.trim();
    const rawEmail = residentEmailInput.trim().toLowerCase();

    if (!rawId) {
      setErrorMessage('Please enter your Resident ID number (e.g. 1 or 001).');
      return;
    }

    const cleanNum = normalizeResidentNumber(rawId);

    if (!rawEmail || !rawEmail.includes('@')) {
      setErrorMessage('Please enter the Email Address used during your account activation.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await dbService.loginWithIdAndEmail(cleanNum, rawEmail);
      if (res.success && res.otp_required) {
        setIdEmailMasked(res.masked_email || rawEmail);
        setIdEmailResendCooldown(res.cooldownSeconds || 45);
        setIdEmailOtpCode(['', '', '', '', '', '']);
        setIdEmailStep('enter_otp');
        setSuccessMessage(
          res.message || `A 6-digit verification code (OTP) has been sent to ${rawEmail}. Please enter it below to access your account.`
        );
      } else if (res.success && res.resident) {
        setSuccessMessage(`Welcome back, ${res.resident.full_name}! Opening resident portal...`);
        setTimeout(() => {
          onSuccess(res.resident!);
        }, 300);
      } else if (res.needs_update) {
        // Account not activated yet — take them to Activate Account
        await handleLookupIdForUpdate(cleanNum);
      } else {
        setErrorMessage(res.message || 'Those login credentials could not be verified. Please check your Resident ID and Email.');
      }
    } catch {
      setErrorMessage('Unable to connect to the server. Please check your connection.');
    } finally {
      setIsLoading(false);
    }
  };

  // STEP 2: VERIFY 6-DIGIT EMAIL OTP TO COMPLETE LOGIN
  const handleVerifyIdEmailOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    const fullOtp = idEmailOtpCode.join('').trim();
    if (fullOtp.length !== 6) {
      setErrorMessage('Please enter the complete 6-digit OTP verification code sent to your email.');
      return;
    }

    const cleanNum = normalizeResidentNumber(residentIdInput.trim());
    const cleanEmail = residentEmailInput.trim().toLowerCase();

    setIsLoading(true);
    try {
      const res = await dbService.loginWithIdAndEmail(cleanNum, cleanEmail, fullOtp);
      if (res.success && res.resident) {
        setSuccessMessage(`OTP verified! Welcome back, ${res.resident.full_name}. Opening your account...`);
        setTimeout(() => {
          onSuccess(res.resident!);
          if (isModal && onCloseModal) onCloseModal();
        }, 400);
      } else {
        setErrorMessage(res.message || 'Incorrect or expired verification code. Please check the 6-digit OTP sent to your email.');
      }
    } catch {
      setErrorMessage('Unable to verify OTP right now. Please check your network and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // RESEND EMAIL OTP FOR LOGIN
  const handleResendIdEmailOtp = async () => {
    if (idEmailResendCooldown > 0 || isLoading) return;
    setErrorMessage(null);
    setSuccessMessage(null);

    const cleanNum = normalizeResidentNumber(residentIdInput.trim());
    const cleanEmail = residentEmailInput.trim().toLowerCase();

    setIsLoading(true);
    try {
      const res = await dbService.loginWithIdAndEmail(cleanNum, cleanEmail, undefined, true);
      if (res.success && res.otp_required) {
        setIdEmailResendCooldown(res.cooldownSeconds || 45);
        setIdEmailOtpCode(['', '', '', '', '', '']);
        setSuccessMessage(res.message || `A fresh 6-digit verification code has been sent to ${cleanEmail}.`);
      } else {
        if (res.cooldownSeconds) setIdEmailResendCooldown(res.cooldownSeconds);
        setErrorMessage(res.message || 'Unable to resend OTP right now. Please wait a moment.');
      }
    } catch {
      setErrorMessage('Network error while resending OTP.');
    } finally {
      setIsLoading(false);
    }
  };

  // SUBMIT ONE-TIME ACCOUNT ACTIVATION (Full Names, Phone Numbers, Email Address, Home Address)
  // After activation, requires resident to log in and verify via Email OTP
  const handleSaveResidentDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    const cleanNum = normalizeResidentNumber(updateResidentNumber);
    if (!cleanNum) {
      setErrorMessage('Resident ID is required.');
      return;
    }

    if (!updateFullName.trim() || updateFullName.trim().length < 2) {
      setErrorMessage('Please enter your Full Names (at least 2 characters).');
      return;
    }

    if (!updatePhoneNumber.trim()) {
      setErrorMessage('Please enter your Phone Number.');
      return;
    }

    if (!updateEmail.trim() || !updateEmail.includes('@')) {
      setErrorMessage('Please enter a valid Email Address.');
      return;
    }

    if (!updateHomeAddress.trim()) {
      setErrorMessage('Please enter your Home Address.');
      return;
    }

    if (!livenessSessionId) {
      setErrorMessage(
        'Please snap a clear photo of your face using the camera below to set your resident profile photo before activating your account.'
      );
      return;
    }

    const activatedEmail = updateEmail.trim().toLowerCase();

    setIsLoading(true);
    try {
      const res = await dbService.updateResidentDetails({
        residentNumber: cleanNum,
        full_name: updateFullName.trim(),
        phone_number: updatePhoneNumber.trim(),
        email: activatedEmail,
        house_number: updateHouseNumber.trim() || `Plot ${cleanNum}`,
        address: updateHomeAddress.trim(),
        livenessSessionId
      });

      if (res.success) {
        // Account activated once! Now require the resident to log in with their ID & Email OTP
        setIsDetailsStepTwo(false);
        setLivenessSessionId('');
        setLivenessStatus('NOT_STARTED');
        setResidentIdInput(cleanNum);
        setResidentEmailInput(activatedEmail);
        setIdEmailStep('enter_credentials');
        setActiveTab('id_email_login');
        setSuccessMessage(
          `Account for Resident #${cleanNum} has been activated with your profile photo! Please log in below — a 6-digit OTP will be sent to ${activatedEmail} to access your account.`
        );
      } else {
        if (res.already_activated) {
          setIsDetailsStepTwo(false);
          setResidentIdInput(cleanNum);
          setActiveTab('id_email_login');
          setIdEmailStep('enter_credentials');
        }
        setErrorMessage(res.message || 'Failed to activate account. Please review your entries and try again.');
      }
    } catch {
      setErrorMessage('Network error occurred while activating account. Please try again.');
    } finally {
      setIsLoading(false);
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
      setErrorMessage('Please enter both your estate number (001–100) and registered phone number.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await dbService.sendResidentOtp(cleanNum, cleanPhone);

      if (res.success) {
        setMaskedPhone(res.maskedPhone || cleanPhone);
        setResendCooldown(res.cooldownSeconds || 45);
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
        setSuccessMessage('A fresh verification code has been dispatched to your registered contact.');
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

  // Handle Activation OTP digit changes
  const handleActOtpChange = (index: number, value: string) => {
    const cleanVal = value.replace(/\D/g, '');

    // Handle paste of full 6-digit code
    if (cleanVal.length > 1) {
      const pasted = cleanVal.slice(0, 6).split('');
      const newOtp = [...actOtpCode];
      pasted.forEach((ch, idx) => {
        if (idx < 6) newOtp[idx] = ch;
      });
      setActOtpCode(newOtp);
      const nextIndex = Math.min(pasted.length, 5);
      actInputRefs.current[nextIndex]?.focus();
      return;
    }

    const newOtp = [...actOtpCode];
    newOtp[index] = cleanVal;
    setActOtpCode(newOtp);

    // Auto advance to next box
    if (cleanVal && index < 5) {
      actInputRefs.current[index + 1]?.focus();
    }
  };

  const handleActOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !actOtpCode[index] && index > 0) {
      actInputRefs.current[index - 1]?.focus();
    }
  };

  // 4. ACCOUNT ACTIVATION - STEP 1 (REQUEST ACTIVATION CODE)
  const handleSendActivationOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);
    setActIsAlreadyActivated(false);

    const cleanNum = actResidentNumber.trim().padStart(3, '0');
    const cleanPhone = actPhoneNumber.trim();
    const cleanEmail = actEmail.trim().toLowerCase();

    if (!cleanNum || !cleanPhone || !cleanEmail) {
      setErrorMessage('Please enter your Resident Number (001–100), registered phone number, and email address.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      setErrorMessage('Please enter a valid email address (e.g. resident@example.com).');
      return;
    }

    setIsLoading(true);
    try {
      const res = await dbService.requestActivationCode(cleanNum, cleanPhone, cleanEmail);

      if (res.success) {
        setActMaskedPhone(res.maskedPhone || cleanPhone);
        setActMaskedEmail(res.maskedEmail || cleanEmail);
        setActResidentName(res.residentName || '');
        setActResendCooldown(res.cooldownSeconds || 45);
        setActOtpCode(['', '', '', '', '', '']);
        setActStep('enter_otp');
        setSuccessMessage(`A 6-digit verification code has been dispatched via SMS to ${res.maskedPhone || 'your registered phone'} and Email to ${res.maskedEmail || cleanEmail}.`);
      } else {
        if (res.isAlreadyActivated) {
          setActIsAlreadyActivated(true);
        }
        setErrorMessage(res.message || 'Those details could not be verified. Please check your Resident Number and registered phone number.');
      }
    } catch {
      setErrorMessage("We couldn't complete the request. Please check your internet connection and try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // 5. ACCOUNT ACTIVATION - STEP 2 (VERIFY CODE & ACTIVATE)
  const handleVerifyActivationOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    const fullCode = actOtpCode.join('').trim();
    if (fullCode.length !== 6) {
      setErrorMessage('Please enter the complete 6-digit activation code.');
      return;
    }

    const cleanNum = actResidentNumber.trim().padStart(3, '0');

    if (!livenessSessionId) {
      setErrorMessage(
        'Please snap a photo of your face using the camera below to set your profile photo before completing account activation.'
      );
      return;
    }

    setIsLoading(true);
    try {
      const res = await dbService.verifyActivationOtp({
        residentNumber: cleanNum,
        phoneNumber: actPhoneNumber.trim(),
        otp: fullCode,
        rememberDevice: actRememberDevice,
        livenessSessionId
      });

      if (res.success && res.resident) {
        setSuccessMessage(`Account activated successfully! Welcome to Finger of God Estate Resident Portal, ${res.resident.full_name}.`);
        setTimeout(() => {
          onSuccess(res.resident!);
          if (isModal && onCloseModal) onCloseModal();
        }, 800);
      } else {
        setErrorMessage(res.message || 'Incorrect activation code. Please check the digits and try again.');
      }
    } catch {
      setErrorMessage("Account activation failed. Please try again or contact estate administration.");
    } finally {
      setIsLoading(false);
    }
  };

  // Resend Activation OTP
  const handleResendActivationOtp = async () => {
    if (actResendCooldown > 0 || isLoading) return;
    setErrorMessage(null);
    setIsLoading(true);

    try {
      const cleanNum = actResidentNumber.trim().padStart(3, '0');
      const cleanPhone = actPhoneNumber.trim();
      const cleanEmail = actEmail.trim().toLowerCase();
      const res = await dbService.requestActivationCode(cleanNum, cleanPhone, cleanEmail);

      if (res.success) {
        setActResendCooldown(res.cooldownSeconds || 45);
        setSuccessMessage('A fresh verification code has been dispatched to your SMS & Email.');
      } else {
        setErrorMessage(res.message || 'Unable to resend activation code. Please wait a moment.');
      }
    } catch {
      setErrorMessage("We couldn't complete the request. Please check your internet connection and try again.");
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
            <span className="text-[10px] sm:text-[11px] font-mono text-emerald-400 font-semibold">Estate ID 001–100</span>
            <span className="text-[9px] text-slate-400 hidden sm:inline">• 256-Bit TLS</span>
          </div>
        </div>
      </div>

      {/* Tabs Switcher: Resident Login vs Update Details */}
      <div className="flex-shrink-0 grid grid-cols-2 border-b border-slate-200 bg-slate-50/95 text-xs font-bold">
        <button
          type="button"
          onClick={() => {
            setActiveTab('id_email_login');
            setErrorMessage(null);
            setSuccessMessage(null);
          }}
          className={`py-2.5 sm:py-3 px-3 sm:px-4 text-center transition-colors cursor-pointer border-b-2 flex items-center justify-center gap-1.5 sm:gap-2 min-h-[40px] ${
            activeTab === 'id_email_login' || activeTab === 'login' || activeTab === 'password_login'
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
            setActiveTab('update_details');
            setErrorMessage(null);
            setSuccessMessage(null);
          }}
          className={`py-2.5 sm:py-3 px-3 sm:px-4 text-center transition-colors cursor-pointer border-b-2 flex items-center justify-center gap-1.5 sm:gap-2 min-h-[40px] ${
            activeTab === 'update_details' || activeTab === 'activate'
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
        {/* TAB 0: RESIDENT ID & EMAIL OTP LOGIN (PRIMARY FLOW) */}
        {/* ============================================================ */}
        {activeTab === 'id_email_login' && (
          <div>
            {idEmailStep === 'enter_credentials' ? (
              <form onSubmit={handleIdEmailLogin} className="space-y-3 sm:space-y-3.5">
                <div className="p-2.5 sm:p-3 bg-emerald-50/70 border border-emerald-100 rounded-xl text-xs text-emerald-950">
                  <div className="flex items-center gap-1.5 font-bold text-emerald-900 mb-0.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0" />
                    <span>Resident Portal Sign-In (Email OTP)</span>
                  </div>
                  <p className="text-emerald-800 leading-relaxed text-[11px]">
                    Enter your Resident ID number (001–100 or 1–100) and the Email Address used during your account activation. A 6-digit OTP verification code will be sent to your email to access your account.
                  </p>
                </div>

                {/* Resident ID Number (001 or 1) */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-[11px] sm:text-xs font-bold uppercase tracking-wider text-slate-700">
                      Resident ID Number
                    </label>
                    <span className="text-[10px] sm:text-[11px] font-mono font-semibold text-emerald-800">
                      Estate IDs 001 – 100
                    </span>
                  </div>
                  <div className="relative">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-mono text-sm font-bold">
                      #
                    </div>
                    <input
                      type="text"
                      value={residentIdInput}
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, '').slice(0, 3);
                        setResidentIdInput(val);
                      }}
                      placeholder="e.g. 001 or 1"
                      maxLength={3}
                      required
                      disabled={isLoading || lockoutTimer > 0}
                      className="w-full pl-8 pr-3.5 py-2 sm:py-2.5 bg-slate-50/80 border border-slate-300 rounded-xl font-mono text-base font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all shadow-2xs"
                    />
                  </div>
                  <p className="text-[10px] text-slate-500 mt-0.5">
                    Enter your resident number (e.g. 1 or 001).
                  </p>
                </div>

                {/* Email Address */}
                <div>
                  <label className="block text-[11px] sm:text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Activation Email Address
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      value={residentEmailInput}
                      onChange={(e) => setResidentEmailInput(e.target.value)}
                      placeholder="e.g. resident@example.com"
                      required
                      disabled={isLoading || lockoutTimer > 0}
                      className="w-full pl-9 pr-3.5 py-2 sm:py-2.5 bg-slate-50/80 border border-slate-300 rounded-xl text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all shadow-2xs"
                    />
                  </div>
                  <p className="text-[10px] text-slate-500 mt-0.5">
                    A 6-digit login OTP will be sent to this email address. If you have not activated your account yet, click "Activate Account" below.
                  </p>
                </div>

                {/* Action Buttons */}
                <div className="pt-1 flex flex-col gap-2">
                  <button
                    type="submit"
                    disabled={isLoading || lockoutTimer > 0}
                    className="w-full py-2.5 sm:py-3 px-4 rounded-xl min-h-[42px] sm:min-h-[44px] bg-emerald-700 hover:bg-emerald-800 disabled:bg-slate-300 text-white font-bold text-xs sm:text-sm tracking-wide transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {isLoading ? (
                      <span className="flex items-center gap-2">
                        <RotateCw className="w-4 h-4 animate-spin" />
                        <span>Sending Login OTP...</span>
                      </span>
                    ) : (
                      <>
                        <Mail className="w-4 h-4" />
                        <span>SEND LOGIN OTP TO EMAIL</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </div>

                {/* First Time / Activate Account Prompt */}
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs">
                  <div>
                    <span className="font-bold text-slate-800 block text-[11px] sm:text-xs">First time logging in?</span>
                    <span className="text-[10px] sm:text-[11px] text-slate-500">Activate your account once with your Full Name, Phone, Email and Address.</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (residentIdInput.trim()) {
                        handleLookupIdForUpdate(residentIdInput);
                      } else {
                        setActiveTab('update_details');
                        setIsDetailsStepTwo(false);
                      }
                    }}
                    className="px-3 py-1.5 rounded-lg bg-emerald-100 hover:bg-emerald-200 text-emerald-900 font-bold text-xs transition-colors cursor-pointer shrink-0"
                  >
                    Activate Account &rarr;
                  </button>
                </div>

                {/* Other Login Methods */}
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
                  <span className="text-[11px] text-slate-500">Other login options:</span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setActiveTab('login');
                        setOtpStep('enter_details');
                      }}
                      className="text-[11px] font-bold text-emerald-700 hover:underline cursor-pointer"
                    >
                      Phone OTP
                    </button>
                    <span className="text-slate-300">•</span>
                    <button
                      type="button"
                      onClick={() => setActiveTab('password_login')}
                      className="text-[11px] font-bold text-emerald-700 hover:underline cursor-pointer"
                    >
                      Password
                    </button>
                  </div>
                </div>
              </form>
            ) : (
              /* STEP 2: ENTER 6-DIGIT EMAIL OTP TO COMPLETE LOGIN */
              <form onSubmit={handleVerifyIdEmailOtp} className="space-y-4">
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-950 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-emerald-900 flex items-center gap-1.5">
                      <Mail className="w-4 h-4 text-emerald-700" />
                      <span>Enter Email Verification OTP</span>
                    </span>
                    <span className="font-mono font-bold text-[11px] bg-white px-2 py-0.5 rounded border border-emerald-200 text-emerald-900">
                      Resident #{normalizeResidentNumber(residentIdInput)}
                    </span>
                  </div>
                  <p className="text-[11px] text-emerald-800 leading-relaxed">
                    We sent a 6-digit verification code to <strong>{residentEmailInput || idEmailMasked}</strong>. Enter the 6 digits below to access your resident portal account.
                  </p>
                </div>

                {/* 6-Digit OTP Input Boxes */}
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-2 text-center">
                    6-Digit Email OTP Code
                  </label>
                  <div className="grid grid-cols-6 gap-2 max-w-xs mx-auto">
                    {idEmailOtpCode.map((digit, index) => (
                      <input
                        key={index}
                        ref={(el) => {
                          idEmailOtpInputRefs.current[index] = el;
                        }}
                        type="text"
                        inputMode="numeric"
                        maxLength={6}
                        value={digit}
                        onChange={(e) => handleIdEmailOtpChange(index, e.target.value)}
                        onKeyDown={(e) => handleIdEmailOtpKeyDown(index, e)}
                        disabled={isLoading || lockoutTimer > 0}
                        className="w-full h-12 text-center font-mono text-lg font-extrabold text-slate-900 bg-slate-50 border-2 border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-600 focus:bg-white transition-all"
                      />
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setIdEmailStep('enter_credentials');
                      setIdEmailOtpCode(['', '', '', '', '', '']);
                      setErrorMessage(null);
                      setSuccessMessage(null);
                    }}
                    className="text-slate-600 hover:text-slate-900 font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Change ID / Email</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleResendIdEmailOtp}
                    disabled={idEmailResendCooldown > 0 || isLoading}
                    className="text-emerald-700 hover:text-emerald-900 disabled:text-slate-400 font-bold cursor-pointer"
                  >
                    {idEmailResendCooldown > 0 ? `Resend OTP in ${idEmailResendCooldown}s` : 'Resend OTP to Email'}
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={isLoading || idEmailOtpCode.join('').length !== 6}
                  className="w-full py-3 px-4 rounded-xl bg-emerald-700 hover:bg-emerald-800 disabled:bg-slate-300 text-white font-bold text-xs sm:text-sm tracking-wide transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
                >
                  {isLoading ? (
                    <span className="flex items-center gap-2">
                      <RotateCw className="w-4 h-4 animate-spin" />
                      <span>Verifying OTP...</span>
                    </span>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>VERIFY OTP &amp; LOGIN TO ACCOUNT</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            )}
          </div>
        )}

        {/* ============================================================ */}
        {/* TAB 0.5: ONE-TIME ACTIVATE ACCOUNT (001 OR 1) */}
        {/* ============================================================ */}
        {activeTab === 'update_details' && (
          <div className="space-y-3.5">
            {!isDetailsStepTwo ? (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleLookupIdForUpdate(updateResidentNumber);
                }}
                className="space-y-3.5"
              >
                <div className="p-3 bg-emerald-50/80 border border-emerald-200 rounded-xl text-xs text-emerald-950">
                  <p className="font-bold text-emerald-900 text-sm mb-1">One-Time Account Activation</p>
                  <p className="text-emerald-800 leading-relaxed text-[11px]">
                    Estate residents (1–100): enter your resident ID number (e.g. <strong>001</strong> or <strong>1</strong>) to activate your account with your Full Names, Phone Numbers, Email Address, and Home Address. <strong>Note:</strong> Account activation can only be done once.
                  </p>
                </div>

                <div>
                  <label className="block text-[11px] sm:text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Resident ID Number (001 – 100)
                  </label>
                  <div className="relative">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-mono text-sm font-bold">
                      #
                    </div>
                    <input
                      type="text"
                      value={updateResidentNumber}
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, '').slice(0, 3);
                        setUpdateResidentNumber(val);
                      }}
                      placeholder="e.g. 001 or 1"
                      maxLength={3}
                      required
                      className="w-full pl-8 pr-3.5 py-2.5 bg-slate-50/80 border border-slate-300 rounded-xl font-mono text-base font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  <p className="text-[10px] text-slate-500 mt-1">
                    Enter 1, 24, 001, etc.
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row gap-2">
                  <button
                    type="button"
                    onClick={() => setActiveTab('id_email_login')}
                    className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-bold text-xs hover:bg-slate-50 cursor-pointer order-2 sm:order-1"
                  >
                    &larr; Back to Login
                  </button>
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="flex-1 py-3 px-4 rounded-xl bg-emerald-700 hover:bg-emerald-800 disabled:bg-slate-300 text-white font-bold text-xs sm:text-sm tracking-wide transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer order-1 sm:order-2"
                  >
                    {isLoading ? (
                      <span className="flex items-center gap-2">
                        <RotateCw className="w-4 h-4 animate-spin" />
                        <span>Checking Activation Status...</span>
                      </span>
                    ) : (
                      <>
                        <span>CONTINUE TO ACTIVATE ACCOUNT</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleSaveResidentDetails} className="space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                  <div>
                    <h3 className="text-sm font-extrabold text-slate-900">Activate Resident Account (One-Time)</h3>
                    <p className="text-[11px] text-slate-500">Provide your details once. After activation, you will log in via OTP sent to your email.</p>
                  </div>
                  <span className="px-2.5 py-1 bg-emerald-100 text-emerald-900 rounded-lg font-mono font-bold text-xs border border-emerald-200">
                    Resident #{updateResidentNumber}
                  </span>
                </div>

                {/* Full Names */}
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Full Names *
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={updateFullName}
                      onChange={(e) => setUpdateFullName(e.target.value)}
                      placeholder="e.g. Chief Emeka Okafor"
                      required
                      className="w-full pl-9 pr-3.5 py-2 bg-slate-50/80 border border-slate-300 rounded-xl text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>

                {/* Phone Numbers */}
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Phone Numbers *
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="tel"
                      value={updatePhoneNumber}
                      onChange={(e) => setUpdatePhoneNumber(e.target.value)}
                      placeholder="e.g. 0803 123 4567"
                      required
                      className="w-full pl-9 pr-3.5 py-2 bg-slate-50/80 border border-slate-300 rounded-xl text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>

                {/* Email Address */}
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Email Address (For Login OTP) *
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      value={updateEmail}
                      onChange={(e) => setUpdateEmail(e.target.value)}
                      placeholder="e.g. resident@example.com"
                      required
                      className="w-full pl-9 pr-3.5 py-2 bg-slate-50/80 border border-slate-300 rounded-xl text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  <p className="text-[10px] text-slate-500 mt-0.5">A 6-digit OTP will be sent to this email whenever you log into your account.</p>
                </div>

                {/* House / Plot Number */}
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1">
                    House / Plot Number
                  </label>
                  <div className="relative">
                    <Building className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={updateHouseNumber}
                      onChange={(e) => setUpdateHouseNumber(e.target.value)}
                      placeholder={`e.g. Plot ${updateResidentNumber}`}
                      className="w-full pl-9 pr-3.5 py-2 bg-slate-50/80 border border-slate-300 rounded-xl text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>

                {/* Home Address */}
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Home Address *
                  </label>
                  <div className="relative">
                    <Home className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <textarea
                      value={updateHomeAddress}
                      onChange={(e) => setUpdateHomeAddress(e.target.value)}
                      placeholder="e.g. Road 2, Phase 1, Finger of God Estate, Iyiaba, Asaba"
                      rows={2}
                      required
                      className="w-full pl-9 pr-3.5 py-2 bg-slate-50/80 border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>

                {/* Live Profile Photo & Real Human Liveness Verification */}
                <div className="pt-1">
                  <ResidentLivenessCapture
                    residentNumber={updateResidentNumber}
                    purpose="ACTIVATION"
                    disabled={isLoading}
                    onVerified={({ sessionId, livenessStatus: status }) => {
                      setLivenessSessionId(sessionId);
                      setLivenessStatus(status);
                      setErrorMessage(null);
                    }}
                    onManualReviewQueued={({ sessionId }) => {
                      setLivenessSessionId(sessionId);
                      setLivenessStatus('PENDING_MANUAL_REVIEW');
                    }}
                  />
                </div>

                {/* Submit / Back Buttons */}
                <div className="pt-2 flex flex-col sm:flex-row gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsDetailsStepTwo(false);
                      setLivenessSessionId('');
                      setLivenessStatus('NOT_STARTED');
                    }}
                    className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-bold text-xs hover:bg-slate-50 cursor-pointer order-2 sm:order-1"
                  >
                    &larr; Back
                  </button>
                  <button
                    type="submit"
                    disabled={
                      isLoading ||
                      !livenessSessionId ||
                      (livenessStatus !== 'LIVENESS_VERIFIED' && livenessStatus !== 'MANUAL_REVIEW_APPROVED')
                    }
                    className="flex-1 py-3 px-4 rounded-xl bg-emerald-700 hover:bg-emerald-800 disabled:bg-slate-300 text-white font-bold text-xs sm:text-sm tracking-wide transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer order-1 sm:order-2"
                  >
                    {isLoading ? (
                      <span className="flex items-center gap-2">
                        <RotateCw className="w-4 h-4 animate-spin" />
                        <span>Activating Account...</span>
                      </span>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
                        <span>
                          {livenessStatus === 'LIVENESS_VERIFIED' || livenessStatus === 'MANUAL_REVIEW_APPROVED'
                            ? 'COMPLETE ACCOUNT ACTIVATION'
                            : 'SNAP FACE PHOTO TO ACTIVATE'}
                        </span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
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
                    Enter your 3-digit estate number (001–100) and registered phone number. We'll send a secure one-time verification code to log you in.
                  </p>
                </div>

                {/* Estate Number Field (001 – 100) */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-[11px] sm:text-xs font-bold uppercase tracking-wider text-slate-700">
                      Estate Number
                    </label>
                    <span className="text-[10px] sm:text-[11px] font-mono font-semibold text-emerald-800">Range: 001 – 100</span>
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

                {/* Alternative: Switch to Account Activation or Email + Password */}
                <div className="pt-2 border-t border-slate-100 space-y-1.5 text-xs text-slate-600">
                  <div className="flex items-center justify-between">
                    <span>First time logging in?</span>
                    <button
                      type="button"
                      onClick={() => {
                        setActiveTab('activate');
                        setActStep('enter_details');
                        setErrorMessage(null);
                        setSuccessMessage(null);
                      }}
                      className="font-bold text-emerald-700 hover:text-emerald-800 hover:underline cursor-pointer text-xs"
                    >
                      Activate Account
                    </button>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-500">
                    <span>Prefer password login?</span>
                    <button
                      type="button"
                      onClick={() => {
                        setActiveTab('password_login');
                        setErrorMessage(null);
                        setSuccessMessage(null);
                      }}
                      className="font-semibold text-slate-600 hover:text-slate-800 hover:underline cursor-pointer"
                    >
                      Sign in with Password
                    </button>
                  </div>
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
                    We dispatched a 6-digit verification code via <strong className="text-emerald-950">SMS &amp; Email</strong> to your registered contact{' '}
                    <span className="font-bold text-emerald-950">{maskedPhone}</span> (Estate #{estateNumber.padStart(3, '0')}). Check either your phone messages or inbox and enter the code below.
                  </p>
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
        {/* TAB 3: ACTIVATE ACCOUNT (ADMIN ENTERS RESIDENT -> RESIDENT ENTERS NUMBER & PHONE -> OTP VERIFIED -> ACTIVATED) */}
        {/* ============================================================ */}
        {activeTab === 'activate' && (
          <div>
            {actStep === 'enter_details' ? (
              <div className="space-y-3 sm:space-y-3.5">
                {/* Activation Header Notice */}
                <div className="p-3 bg-emerald-50/80 border border-emerald-200/90 rounded-2xl text-xs text-emerald-950">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-1.5 font-extrabold text-emerald-950 text-xs sm:text-sm">
                      <UserCheck className="w-4 h-4 text-emerald-700 shrink-0" />
                      <span>Activate Your Finger of God Estate Account</span>
                    </div>
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
                  <p className="text-emerald-900 text-[11px] sm:text-xs leading-relaxed mt-0.5">
                    Your resident profile was added by estate administration. Enter your assigned Resident Number and registered phone number to receive your secure SMS activation code.
                  </p>
                </div>

                <form onSubmit={handleSendActivationOtp} className="space-y-3 sm:space-y-3.5">
                  {/* STEP 1: Resident Number Field (001–100) */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-[11px] sm:text-xs font-bold uppercase tracking-wider text-slate-700">
                        Step 1: Resident Number
                      </label>
                      <span className="text-[10px] sm:text-[11px] font-mono font-semibold text-emerald-800 bg-emerald-100/70 px-2 py-0.5 rounded-md">
                        Format: 001 – 100
                      </span>
                    </div>
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
                          setActIsAlreadyActivated(false);
                        }}
                        placeholder="001"
                        maxLength={3}
                        required
                        disabled={isLoading}
                        className="w-full pl-8 pr-3.5 py-2 sm:py-2.5 bg-slate-50/80 border border-slate-300 rounded-xl font-mono text-base font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all shadow-2xs"
                      />
                    </div>
                    <p className="text-[10px] text-slate-500 mt-0.5">
                      Example: <strong className="font-mono text-slate-700">001</strong>, <strong className="font-mono text-slate-700">002</strong>, or <strong className="font-mono text-slate-700">024</strong>
                    </p>
                  </div>

                  {/* STEP 2: Registered Phone Number Field */}
                  <div>
                    <label className="block text-[11px] sm:text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                      Step 2: Registered Phone Number
                    </label>
                    <div className="relative">
                      <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="tel"
                        value={actPhoneNumber}
                        onChange={(e) => {
                          setActPhoneNumber(e.target.value);
                          setActIsAlreadyActivated(false);
                        }}
                        placeholder="080XXXXXXXX"
                        required
                        disabled={isLoading}
                        className="w-full pl-9 pr-3.5 py-2 sm:py-2.5 bg-slate-50/80 border border-slate-300 rounded-xl text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all shadow-2xs"
                      />
                    </div>
                    <p className="text-[10px] text-slate-500 mt-0.5">
                      Enter the phone number registered with Finger of God Estate. Your phone number must match our records before you can continue.
                    </p>
                  </div>

                  {/* STEP 3: Email Address Field */}
                  <div>
                    <label className="block text-[11px] sm:text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                      Step 3: Email Address
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="email"
                        value={actEmail}
                        onChange={(e) => {
                          setActEmail(e.target.value);
                          setActIsAlreadyActivated(false);
                        }}
                        placeholder="resident@example.com"
                        required
                        disabled={isLoading}
                        className="w-full pl-9 pr-3.5 py-2 sm:py-2.5 bg-slate-50/80 border border-slate-300 rounded-xl text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all shadow-2xs"
                      />
                    </div>
                    <p className="text-[10px] text-slate-500 mt-0.5">
                      Enter the email address you want to use for your Finger of God Estate account.
                    </p>
                  </div>

                  {/* Notice if already activated */}
                  {actIsAlreadyActivated && (
                    <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-start gap-2.5 animate-in fade-in">
                      <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <p className="font-bold">Account Already Activated</p>
                        <p className="mt-0.5 leading-relaxed text-[11px]">
                          This resident account is already active. You can sign in immediately using your estate number and registered phone number.
                        </p>
                        <button
                          type="button"
                          onClick={() => {
                            setActiveTab('login');
                            setEstateNumber(actResidentNumber);
                            setPhoneNumber(actPhoneNumber);
                            setErrorMessage(null);
                            setSuccessMessage(null);
                          }}
                          className="mt-2 px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer inline-flex items-center gap-1.5 shadow-2xs"
                        >
                          <span>Switch to Resident Login</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Buttons */}
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
                      className="w-full sm:flex-1 py-2.5 sm:py-3 px-4 rounded-xl min-h-[42px] sm:min-h-[44px] bg-emerald-700 hover:bg-emerald-800 disabled:bg-slate-300 text-white font-bold text-xs sm:text-sm tracking-wide transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 cursor-pointer order-1 sm:order-2"
                    >
                      {isLoading ? (
                        <span className="flex items-center gap-2">
                          <RotateCw className="w-4 h-4 animate-spin" />
                          <span>Validating Record & Sending OTP...</span>
                        </span>
                      ) : (
                        <>
                          <Smartphone className="w-4 h-4" />
                          <span>SEND ACTIVATION CODE</span>
                          <ArrowRight className="w-4 h-4" />
                        </>
                      )}
                    </button>
                  </div>
                </form>

                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
                  <span>Already activated your account?</span>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab('login');
                      setErrorMessage(null);
                      setSuccessMessage(null);
                    }}
                    className="font-bold text-emerald-700 hover:text-emerald-800 hover:underline cursor-pointer text-xs"
                  >
                    Sign in via Resident Login
                  </button>
                </div>
              </div>
            ) : (
              /* STEP 2: ENTER ACTIVATION OTP CODE */
              <div className="space-y-3.5 sm:space-y-4">
                <div className="p-3 bg-emerald-50/80 border border-emerald-200 rounded-xl text-xs text-emerald-950">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-extrabold text-emerald-900 text-xs sm:text-sm">Enter Activation Code</span>
                    <button
                      type="button"
                      onClick={() => {
                        setActStep('enter_details');
                        setErrorMessage(null);
                        setSuccessMessage(null);
                      }}
                      className="text-[11px] font-bold text-emerald-700 hover:text-emerald-900 underline flex items-center gap-1 cursor-pointer transition-colors"
                    >
                      <ArrowLeft className="w-3 h-3" /> Change Details
                    </button>
                  </div>
                  <p className="text-emerald-800 text-[11px] leading-relaxed">
                    We dispatched a 6-digit activation code via <strong className="text-emerald-950">SMS &amp; Email</strong> to{' '}
                    <strong className="text-emerald-950 font-mono font-bold">{actMaskedPhone}</strong>
                    {actMaskedEmail ? <> and <strong className="text-emerald-950 font-mono font-bold">{actMaskedEmail}</strong></> : null} for{' '}
                    <strong className="text-emerald-950">Resident #{actResidentNumber.padStart(3, '0')}</strong>
                    {actResidentName ? ` (${actResidentName})` : ''}. Check either your SMS or Email inbox and enter the code below.
                  </p>
                </div>

                <form onSubmit={handleVerifyActivationOtp} className="space-y-3.5 sm:space-y-4">
                  {/* 6 Digit OTP Inputs */}
                  <div>
                    <label className="block text-[11px] sm:text-xs font-bold uppercase tracking-wider text-slate-700 mb-2 text-center">
                      Enter 6-Digit Verification Code
                    </label>
                    <div className="flex items-center justify-center gap-1.5 sm:gap-2">
                      {actOtpCode.map((digit, idx) => (
                        <input
                          key={idx}
                          ref={(el) => { actInputRefs.current[idx] = el; }}
                          type="text"
                          inputMode="numeric"
                          maxLength={1}
                          value={digit}
                          onChange={(e) => handleActOtpChange(idx, e.target.value)}
                          onKeyDown={(e) => handleActOtpKeyDown(idx, e)}
                          disabled={isLoading}
                          className="w-10 h-12 sm:w-11 sm:h-13 text-center text-lg sm:text-xl font-mono font-black rounded-xl bg-slate-50 border-2 border-slate-300 text-slate-900 focus:outline-none focus:border-emerald-600 focus:bg-white focus:ring-2 focus:ring-emerald-500/30 transition-all shadow-xs"
                        />
                      ))}
                    </div>
                  </div>

                  {/* Live Profile Photo & Real Human Liveness Verification */}
                  <div className="pt-1">
                    <ResidentLivenessCapture
                      residentNumber={actResidentNumber.trim().padStart(3, '0')}
                      purpose="ACTIVATION"
                      disabled={isLoading}
                      onVerified={({ sessionId, livenessStatus: status }) => {
                        setLivenessSessionId(sessionId);
                        setLivenessStatus(status);
                        setErrorMessage(null);
                      }}
                      onManualReviewQueued={({ sessionId }) => {
                        setLivenessSessionId(sessionId);
                        setLivenessStatus('PENDING_MANUAL_REVIEW');
                      }}
                    />
                  </div>

                  {/* Remember Device Checkbox */}
                  <div className="pt-0.5">
                    <label className="flex items-start gap-2.5 cursor-pointer group">
                      <input
                        type="checkbox"
                        checked={actRememberDevice}
                        onChange={(e) => setActRememberDevice(e.target.checked)}
                        className="w-4 h-4 mt-0.5 rounded text-emerald-600 border-slate-300 focus:ring-emerald-500 cursor-pointer"
                      />
                      <div className="text-xs">
                        <span className="font-bold text-slate-800 group-hover:text-emerald-800 transition-colors text-[11px] sm:text-xs">
                          Remember this device
                        </span>
                        <p className="text-[10px] text-slate-500 leading-tight mt-0.5">
                          Keep me signed in on this personal device
                        </p>
                      </div>
                    </label>
                  </div>

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={
                      isLoading ||
                      actOtpCode.join('').length !== 6 ||
                      !livenessSessionId ||
                      (livenessStatus !== 'LIVENESS_VERIFIED' && livenessStatus !== 'MANUAL_REVIEW_APPROVED')
                    }
                    className="w-full py-2.5 sm:py-3 px-4 rounded-xl min-h-[44px] bg-emerald-700 hover:bg-emerald-800 disabled:bg-slate-300 text-white font-bold text-xs sm:text-sm tracking-wide transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {isLoading ? (
                      <span className="flex items-center gap-2">
                        <RotateCw className="w-4 h-4 animate-spin" />
                        <span>Activating Account...</span>
                      </span>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
                        <span>ACTIVATE ACCOUNT & ACCESS PORTAL</span>
                      </>
                    )}
                  </button>

                  {/* Resend Code Button with Cooldown */}
                  <div className="text-center pt-1">
                    <button
                      type="button"
                      onClick={handleResendActivationOtp}
                      disabled={actResendCooldown > 0 || isLoading}
                      className="text-xs font-semibold text-emerald-700 hover:text-emerald-900 disabled:text-slate-400 hover:underline cursor-pointer disabled:cursor-not-allowed transition-colors"
                    >
                      {actResendCooldown > 0
                        ? `Resend verification code in ${actResendCooldown}s`
                        : 'Did not receive code? Resend SMS & Email code'}
                    </button>
                  </div>
                </form>
              </div>
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
                    href="tel:07057543935"
                    className="p-2 rounded-lg bg-white border border-slate-200 font-semibold text-slate-800 hover:text-emerald-700 hover:border-emerald-300 flex items-center gap-2 transition-all shadow-2xs text-[11px]"
                  >
                    <Phone className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>Desk: 0705 754 3935</span>
                  </a>
                  <a
                    href="mailto:support@fingerofgodestate.com"
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
        className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-3 md:p-4 bg-slate-950/80 backdrop-blur-xs overflow-y-auto"
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
