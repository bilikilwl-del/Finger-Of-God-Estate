import React, { useState } from 'react';
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
  ShieldAlert,
  Sparkles,
  HelpCircle
} from 'lucide-react';
import { dbService, authService } from '../../lib/supabase';
import { Resident, EstateSettings } from '../../types/database';
import { EstateLogo } from '../common/EstateLogo';

interface ResidentLoginViewProps {
  onSuccess: (resident: Resident) => void;
  onNavigateToHome?: () => void;
  estateSettings?: EstateSettings;
  isModal?: boolean;
  onCloseModal?: () => void;
}

export const ResidentLoginView: React.FC<ResidentLoginViewProps> = ({
  onSuccess,
  onNavigateToHome,
  estateSettings,
  isModal = false,
  onCloseModal
}) => {
  // Tabs: 'login' | 'activate' | 'forgot' | 'quick'
  const [activeTab, setActiveTab] = useState<'login' | 'activate' | 'forgot'>('login');

  // Login Form State
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

  // Common UI State
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // 1. Handle Resident Login (Supabase Email + Password)
  const handleLogin = async (e: React.FormEvent) => {
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
        onSuccess(res.resident);
        if (isModal && onCloseModal) onCloseModal();
      } else {
        setErrorMessage(res.message || 'Invalid credentials. Please verify your details or activate your account.');
      }
    } catch (err: any) {
      setErrorMessage('Network error during sign in. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // 2. Handle Resident Verification for Activation (Step 1)
  const handleVerifyForActivation = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!actResidentNumber.trim() || !actIdentifier.trim()) {
      setErrorMessage('Please enter both your Resident Number and registered Phone Number or Email.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await dbService.verifyResidentForActivation(actResidentNumber, actIdentifier);
      if (res.success && res.residentName) {
        setVerifiedData({
          residentName: res.residentName,
          existingEmail: res.existingEmail,
          isActivated: res.isActivated
        });
        setActEmail(res.existingEmail || '');
        setActStep('setup');
        setSuccessMessage('Resident record confirmed. Set your secure password below to finish activation.');
      } else {
        setErrorMessage(res.message || 'We could not verify these details. Please check your information or contact estate administration.');
      }
    } catch {
      setErrorMessage('We could not verify these details. Please check your information or contact estate administration.');
    } finally {
      setIsLoading(false);
    }
  };

  // 3. Handle Complete Activation (Step 2)
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
      const res = await dbService.activateResidentAccount({
        residentNumber: actResidentNumber,
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

  // 4. Handle Password Reset
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
    } catch (err: any) {
      setErrorMessage(err.message || 'Password reset request failed.');
    } finally {
      setIsLoading(false);
    }
  };

  // 5. Quick Test Selection (For Dev & Fast Review)
  const handleQuickSelect = async (num: string, phone: string, email: string) => {
    setIsLoading(true);
    setErrorMessage(null);
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
    <div className="w-full max-w-md bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden mx-auto">
      {/* Top Brand Header */}
      <div className="bg-slate-900 text-white p-6 sm:p-7 relative border-b border-slate-800">
        {isModal && onCloseModal && (
          <button
            onClick={onCloseModal}
            className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        )}

        <div className="flex items-center">
          <EstateLogo
            size="md"
            variant="horizontal"
            theme="dark"
            estateName={estateSettings?.estate_name || 'Finger of God Estate'}
            subtitle="SECURITY MANAGEMENT • ASABA"
          />
        </div>

        <div className="mt-4 pt-3 border-t border-slate-800/80">
          <div className="flex items-center justify-between">
            {activeTab !== 'login' ? (
              <button
                type="button"
                onClick={() => {
                  setActiveTab('login');
                  setActStep('verify');
                  setErrorMessage(null);
                  setSuccessMessage(null);
                }}
                className="text-xs font-bold text-emerald-400 hover:text-emerald-300 uppercase tracking-wider inline-flex items-center gap-1.5 cursor-pointer transition-colors group"
              >
                <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
                <span>Back to Resident Login</span>
              </button>
            ) : (
              <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
                Resident Portal Login
              </span>
            )}
            <span className="text-[10px] font-mono text-slate-400">STAGE 9 SECURE AUTH</span>
          </div>
        </div>
      </div>

      {/* Tab Navigation Switcher */}
      <div className="grid grid-cols-2 border-b border-slate-200 bg-slate-50 text-xs font-bold">
        <button
          type="button"
          onClick={() => {
            setActiveTab('login');
            setErrorMessage(null);
            setSuccessMessage(null);
          }}
          className={`py-3.5 px-4 text-center transition-colors cursor-pointer border-b-2 flex items-center justify-center gap-1.5 ${
            activeTab === 'login'
              ? 'bg-white text-emerald-800 border-emerald-700 shadow-2xs'
              : 'text-slate-600 border-transparent hover:text-slate-900 hover:bg-slate-100/70'
          }`}
        >
          <KeyRound className="w-4 h-4" />
          <span>Resident Login</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveTab('activate');
            setActStep('verify');
            setErrorMessage(null);
            setSuccessMessage(null);
          }}
          className={`py-3.5 px-4 text-center transition-colors cursor-pointer border-b-2 flex items-center justify-center gap-1.5 ${
            activeTab === 'activate'
              ? 'bg-white text-emerald-800 border-emerald-700 shadow-2xs'
              : 'text-slate-600 border-transparent hover:text-slate-900 hover:bg-slate-100/70'
          }`}
        >
          <UserCheck className="w-4 h-4" />
          <span>Activate Account</span>
        </button>
      </div>

      {/* Form Content Area */}
      <div className="p-6 sm:p-8 space-y-6">
        {/* Error Alert */}
        {errorMessage && (
          <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-start gap-2.5 animate-in fade-in duration-200">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Authentication Notice</p>
              <p className="mt-0.5 leading-relaxed">{errorMessage}</p>
            </div>
          </div>
        )}

        {/* Success Alert */}
        {successMessage && (
          <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-start gap-2.5 animate-in fade-in duration-200">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Confirmation</p>
              <p className="mt-0.5 leading-relaxed">{successMessage}</p>
            </div>
          </div>
        )}

        {/* TAB 1: RESIDENT LOGIN */}
        {activeTab === 'login' && (
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Registered Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  placeholder="e.g. resident@fingerofgodestate.ng"
                  required
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
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
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3.5 px-4 rounded-xl bg-emerald-700 hover:bg-emerald-800 disabled:bg-slate-300 text-white font-bold text-sm tracking-wide transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer mt-2"
            >
              {isLoading ? (
                <span>Verifying Resident Account...</span>
              ) : (
                <>
                  <KeyRound className="w-4 h-4" />
                  <span>LOGIN TO RESIDENT PORTAL</span>
                </>
              )}
            </button>

            <div className="pt-3 text-center border-t border-slate-100">
              <p className="text-xs text-slate-600">
                First time here or not yet activated?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('activate');
                    setActStep('verify');
                    setErrorMessage(null);
                    setSuccessMessage(null);
                  }}
                  className="font-bold text-emerald-700 hover:text-emerald-800 underline cursor-pointer"
                >
                  Create / Activate Account
                </button>
              </p>
            </div>
          </form>
        )}

        {/* TAB 2: ACTIVATE ACCOUNT (2-STEP SAFE FLOW) */}
        {activeTab === 'activate' && (
          <div>
            {actStep === 'verify' ? (
              <form onSubmit={handleVerifyForActivation} className="space-y-4">
                <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs text-emerald-950">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-emerald-900">Step 1 of 2: Verify Existing Record</span>
                    <button
                      type="button"
                      onClick={() => {
                        setActiveTab('login');
                        setErrorMessage(null);
                        setSuccessMessage(null);
                      }}
                      className="text-[11px] font-bold text-emerald-700 hover:text-emerald-900 underline flex items-center gap-1 cursor-pointer transition-colors"
                    >
                      <ArrowLeft className="w-3 h-3" /> Back to Login
                    </button>
                  </div>
                  <p className="mt-1 text-emerald-800">
                    Enter your 3-digit Resident Number along with your registered phone number or email to locate your profile.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                    Resident Number
                  </label>
                  <div className="relative">
                    <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-mono text-sm font-bold">
                      #
                    </div>
                    <input
                      type="text"
                      value={actResidentNumber}
                      onChange={(e) => setActResidentNumber(e.target.value)}
                      placeholder="001"
                      maxLength={5}
                      required
                      className="w-full pl-9 pr-4 py-3 bg-slate-50 border border-slate-300 rounded-xl font-mono text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">Your estate registration identifier (e.g. 001)</p>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                    Registered Phone Number or Email
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={actIdentifier}
                      onChange={(e) => setActIdentifier(e.target.value)}
                      placeholder="08023456789 or name@domain.com"
                      required
                      className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">Must match the registered contact on your estate record</p>
                </div>

                <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab('login');
                      setErrorMessage(null);
                      setSuccessMessage(null);
                    }}
                    className="w-full sm:w-auto px-4 py-3 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 font-bold text-xs tracking-wide transition-all flex items-center justify-center gap-1.5 cursor-pointer order-2 sm:order-1 shadow-2xs"
                  >
                    <ArrowLeft className="w-3.5 h-3.5 text-slate-500" />
                    <span>Back to Login</span>
                  </button>
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full sm:flex-1 py-3 px-4 rounded-xl bg-emerald-700 hover:bg-emerald-800 disabled:bg-slate-300 text-white font-bold text-xs tracking-wide transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer order-1 sm:order-2"
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
              <form onSubmit={handleCompleteActivation} className="space-y-4">
                <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs text-emerald-950">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-emerald-900">Step 2 of 2: Set Security Credentials</span>
                    <button
                      type="button"
                      onClick={() => setActStep('verify')}
                      className="text-[11px] font-bold text-emerald-700 hover:text-emerald-900 underline flex items-center gap-1 cursor-pointer transition-colors"
                    >
                      <ArrowLeft className="w-3 h-3" /> Back
                    </button>
                  </div>
                  <p className="mt-1 font-semibold text-slate-900">
                    Resident: <span className="text-emerald-900 font-bold">#{actResidentNumber}</span> • {verifiedData?.residentName}
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                    Account Email Address
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      value={actEmail}
                      onChange={(e) => setActEmail(e.target.value)}
                      placeholder="your.email@example.com"
                      required
                      className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">This email will be your login username</p>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                    Create Password
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="password"
                      value={actPassword}
                      onChange={(e) => setActPassword(e.target.value)}
                      placeholder="Minimum 6 characters"
                      required
                      minLength={6}
                      className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                    Confirm Password
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="password"
                      value={actConfirmPassword}
                      onChange={(e) => setActConfirmPassword(e.target.value)}
                      placeholder="Re-enter your password"
                      required
                      minLength={6}
                      className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>

                <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => setActStep('verify')}
                    className="w-full sm:w-auto px-4 py-3 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 font-bold text-xs tracking-wide transition-all flex items-center justify-center gap-1.5 cursor-pointer order-2 sm:order-1 shadow-2xs"
                  >
                    <ArrowLeft className="w-3.5 h-3.5 text-slate-500" />
                    <span>Back to Step 1</span>
                  </button>
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full sm:flex-1 py-3 px-4 rounded-xl bg-emerald-700 hover:bg-emerald-800 disabled:bg-slate-300 text-white font-bold text-xs tracking-wide transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer order-1 sm:order-2"
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

        {/* TAB 3: FORGOT PASSWORD */}
        {activeTab === 'forgot' && (
          <form onSubmit={handleForgotPassword} className="space-y-4">
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-700">
              <p className="font-bold text-slate-900">Reset Your Security Password</p>
              <p className="mt-0.5 text-slate-600">
                Enter your registered resident email address and we'll dispatch a secure recovery link.
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Registered Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  placeholder="resident@example.com"
                  required
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
              <button
                type="button"
                onClick={() => {
                  setActiveTab('login');
                  setErrorMessage(null);
                  setSuccessMessage(null);
                }}
                className="w-full sm:w-auto px-4 py-3 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 font-bold text-xs tracking-wide transition-all flex items-center justify-center gap-1.5 cursor-pointer order-2 sm:order-1 shadow-2xs"
              >
                <ArrowLeft className="w-3.5 h-3.5 text-slate-500" />
                <span>Back to Login</span>
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="w-full sm:flex-1 py-3 px-4 rounded-xl bg-emerald-700 hover:bg-emerald-800 disabled:bg-slate-300 text-white font-bold text-xs tracking-wide transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer order-1 sm:order-2"
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

        {/* Quick Test Demo Selection */}
        <div className="pt-4 border-t border-slate-100 space-y-2">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
            Instant Test Profile Switcher:
          </span>
          <div className="space-y-1.5">
            <button
              type="button"
              onClick={() => handleQuickSelect('001', '08023456789', 'babatunde.adeleke@gmail.com')}
              className="w-full text-left p-2.5 rounded-xl border border-emerald-200 bg-emerald-50/50 hover:bg-emerald-100/70 transition-colors flex items-center justify-between cursor-pointer text-xs"
            >
              <div>
                <span className="font-mono font-bold text-emerald-950">#001</span> • <span className="font-semibold text-emerald-900">Engr. Babatunde Adeleke</span>
                <span className="block text-[10px] text-emerald-700">babatunde.adeleke@gmail.com • (Status: Paid Oct 2026)</span>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-emerald-200 text-emerald-900 text-[10px] font-bold">PAID</span>
            </button>

            <button
              type="button"
              onClick={() => handleQuickSelect('002', '08098765432', 'dr.chioma@nwachukwumed.ng')}
              className="w-full text-left p-2.5 rounded-xl border border-amber-200 bg-amber-50/50 hover:bg-amber-100/70 transition-colors flex items-center justify-between cursor-pointer text-xs"
            >
              <div>
                <span className="font-mono font-bold text-amber-950">#002</span> • <span className="font-semibold text-amber-900">Dr. Chioma Nwachukwu</span>
                <span className="block text-[10px] text-amber-700">dr.chioma@nwachukwumed.ng • (Status: Unpaid)</span>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-amber-200 text-amber-900 text-[10px] font-bold">UNPAID</span>
            </button>

            <button
              type="button"
              onClick={() => handleQuickSelect('003', '08123459876', '')}
              className="w-full text-left p-2.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 transition-colors flex items-center justify-between cursor-pointer text-xs"
            >
              <div>
                <span className="font-mono font-bold text-slate-900">#003</span> • <span className="font-semibold text-slate-800">Alhaji Usman Danladi</span>
                <span className="block text-[10px] text-slate-500">Plot 18B • (Status: Unpaid)</span>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 text-[10px] font-bold">UNPAID</span>
            </button>
          </div>
        </div>

        {/* Security & RLS Privacy Guarantee Notice */}
        <div className="flex items-center gap-2 text-[11px] text-slate-500 pt-1">
          <Lock className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
          <span>RLS security restricts access strictly to your individual estate records.</span>
        </div>
      </div>
    </div>
  );

  if (isModal) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/75 backdrop-blur-xs overflow-y-auto">
        <div className="relative my-4 w-full max-w-md">
          {containerContent}
        </div>
      </div>
    );
  }

  // Full Page Standalone Layout for /login route
  return (
    <div className="min-h-screen bg-slate-100/80 py-10 px-4 sm:px-6 lg:px-8 flex flex-col items-center justify-center">
      {onNavigateToHome && (
        <div className="w-full max-w-md mb-4 flex items-center justify-between">
          <button
            onClick={onNavigateToHome}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white border border-slate-200/90 text-xs font-bold text-slate-700 hover:text-emerald-700 hover:border-emerald-300 hover:bg-emerald-50/50 shadow-2xs transition-all cursor-pointer group"
          >
            <ArrowLeft className="w-4 h-4 text-emerald-600 group-hover:-translate-x-0.5 transition-transform" />
            <span>Back to Estate Home</span>
          </button>
          <span className="text-[11px] font-semibold text-slate-500">Finger of God Estate</span>
        </div>
      )}
      {containerContent}
    </div>
  );
};
