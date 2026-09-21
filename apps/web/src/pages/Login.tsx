import React, { useState, useEffect } from 'react';
import {
  IconLock,
  IconMail,
  IconArrowRight,
  IconAlertCircle,
  IconKey,
  IconShieldCheck,
  IconServer,
  IconDatabase,
  IconCheck,
  IconRefreshCw,
  IconClock,
  IconSun,
  IconMoon,
} from '../components/icons';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { PageMeta } from '../components/common/PageMeta';
import { JsonLd } from '../components/common/JsonLd';
import { api } from '../services/api';

export interface LoginProps {
  isModal?: boolean;
  onClose?: () => void;
  onNavigate?: (tab: string) => void;
}

export const Login: React.FC<LoginProps> = ({ isModal = false, onClose, onNavigate }) => {
  const { login } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Sign in form state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // First-time forced password change state
  const [isForcePasswordChange, setIsForcePasswordChange] = useState(false);
  const [forcedNewPassword, setForcedNewPassword] = useState('');
  const [forcedConfirmPassword, setForcedConfirmPassword] = useState('');
  const [forcePasswordLoading, setForcePasswordLoading] = useState(false);
  const [forcePasswordError, setForcePasswordError] = useState<string | null>(null);

  // Password reset flow state
  const [isResetMode, setIsResetMode] = useState(false);
  const [resetStep, setResetStep] = useState<'email' | 'otp' | 'password' | 'success'>('email');
  const [resetEmail, setResetEmail] = useState('');
  const [resetOtp, setResetOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState(0);

  // Countdown timer for OTP resend
  useEffect(() => {
    let timer: any;
    if (resendCooldown > 0) {
      timer = setTimeout(() => setResendCooldown((c) => c - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsLoading(true);

    try {
      const data = await login(loginEmail, loginPassword);
      if (data?.must_change_password) {
        setIsForcePasswordChange(true);
      } else if (onClose) {
        onClose();
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Invalid email or password');
    } finally {
      setIsLoading(false);
    }
  };

  const handleForcePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (forcedNewPassword.length < 10) {
      setForcePasswordError('New password must be at least 10 characters.');
      return;
    }
    if (forcedNewPassword !== forcedConfirmPassword) {
      setForcePasswordError('Passwords do not match.');
      return;
    }
    setForcePasswordLoading(true);
    setForcePasswordError(null);
    try {
      await api.changePassword({ newPassword: forcedNewPassword });
      setIsForcePasswordChange(false);
      if (onClose) {
        onClose();
      }
    } catch (err: any) {
      setForcePasswordError(err.message || 'Failed to update password.');
    } finally {
      setForcePasswordLoading(false);
    }
  };

  // Step 1: Send OTP to email
  const handleSendResetOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetError(null);
    setResetLoading(true);
    try {
      await api.forgotPassword(resetEmail.trim());
      setResetStep('otp');
      setResendCooldown(60);
    } catch (err: any) {
      setResetError(err.message || 'Failed to dispatch verification code. Please try again.');
    } finally {
      setResetLoading(false);
    }
  };

  // Step 2: Verify OTP
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (resetOtp.trim().length !== 6) {
      setResetError('Please enter the complete 6-digit code.');
      return;
    }
    setResetError(null);
    setResetLoading(true);
    try {
      await api.verifyResetOtp(resetEmail.trim(), resetOtp.trim());
      setResetStep('password');
    } catch (err: any) {
      setResetError(err.message || 'Invalid or expired verification code.');
    } finally {
      setResetLoading(false);
    }
  };

  // Step 3: Set New Password
  const handleSetNewPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 8) {
      setResetError('Password must be at least 8 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setResetError('Passwords do not match. Please verify.');
      return;
    }
    setResetError(null);
    setResetLoading(true);
    try {
      await api.resetPassword({
        email: resetEmail.trim(),
        otp: resetOtp.trim(),
        new_password: newPassword,
      });
      setResetStep('success');
    } catch (err: any) {
      setResetError(err.message || 'Failed to reset password. Please try again.');
    } finally {
      setResetLoading(false);
    }
  };

  const handleReturnToLogin = () => {
    setIsResetMode(false);
    setResetStep('email');
    setResetOtp('');
    setNewPassword('');
    setConfirmPassword('');
    setResetError(null);
    if (resetEmail) {
      setLoginEmail(resetEmail);
    }
  };

  const renderCardContent = () => {
    if (isForcePasswordChange) {
      return (
        <div className={isModal ? 'w-full' : 'bg-white dark:bg-[#131924] border border-slate-200 dark:border-[#1E2636] rounded-xl p-6 sm:p-8 shadow-card'}>
          <div className="mb-6">
            <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded font-mono text-[10px] font-bold bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20 mb-2">
              <IconKey className="w-3 h-3" />
              <span>Password Change Required</span>
            </div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">Set New Password</h2>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
              Your account was provisioned with a temporary password. Please set a secure password (minimum 10 characters) to continue.
            </p>
          </div>

          {forcePasswordError && (
            <div className="mb-5 p-3 rounded-lg bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 text-rose-800 dark:text-rose-300 text-xs flex items-start gap-2.5">
              <IconAlertCircle className="w-4 h-4 shrink-0 text-rose-600 dark:text-rose-400 mt-0.5" />
              <span>{forcePasswordError}</span>
            </div>
          )}

          <form onSubmit={handleForcePasswordSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                New Password (minimum 10 characters)
              </label>
              <div className="relative">
                <IconLock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500" />
                <input
                  type="password"
                  value={forcedNewPassword}
                  onChange={(e) => setForcedNewPassword(e.target.value)}
                  required
                  autoComplete="new-password"
                  minLength={10}
                  placeholder="••••••••••••"
                  className="w-full pl-9 pr-3 py-2 rounded-lg bg-[#F6F8FA] dark:bg-[#0C1017] border border-slate-200 dark:border-[#1E2636] text-xs text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-teal-600 font-mono transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Confirm New Password
              </label>
              <div className="relative">
                <IconLock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500" />
                <input
                  type="password"
                  value={forcedConfirmPassword}
                  onChange={(e) => setForcedConfirmPassword(e.target.value)}
                  required
                  autoComplete="new-password"
                  minLength={10}
                  placeholder="••••••••••••"
                  className="w-full pl-9 pr-3 py-2 rounded-lg bg-[#F6F8FA] dark:bg-[#0C1017] border border-slate-200 dark:border-[#1E2636] text-xs text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-teal-600 font-mono transition-colors"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={forcePasswordLoading}
              className="w-full mt-2 py-2.5 px-4 rounded-lg bg-teal-700 hover:bg-teal-800 font-bold text-xs text-white shadow-subtle transition-colors flex items-center justify-center gap-2"
            >
              <span>{forcePasswordLoading ? 'Updating Password...' : 'Save Password & Continue'}</span>
              <IconArrowRight className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>
      );
    }

    return (
      <div className={isModal ? 'w-full' : 'bg-white dark:bg-[#131924] border border-slate-200 dark:border-[#1E2636] rounded-xl p-6 sm:p-8 shadow-card'}>
        {!isResetMode ? (
          <>
            {/* Header */}
            <div className="mb-6">
              <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded font-mono text-[10px] font-bold bg-teal-500/10 text-teal-700 dark:text-teal-400 border border-teal-500/20 mb-2">
                <IconLock className="w-3 h-3" />
                <span>Authorized Access Only</span>
              </div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">Sign in to Invenaro</h2>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                Enter your system credentials. Accounts are provisioned by your organization's Administrator.
              </p>
            </div>

            {/* Error Message */}
            {errorMessage && (
              <div className="mb-5 p-3 rounded-lg bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 text-rose-800 dark:text-rose-300 text-xs flex items-start gap-2.5">
                <IconAlertCircle className="w-4 h-4 shrink-0 text-rose-600 dark:text-rose-400 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Login Form */}
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Email Address
                </label>
                <div className="relative">
                  <IconMail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500" />
                  <input
                    type="email"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    required
                    autoComplete="username"
                    placeholder="name@company.com"
                    className="w-full pl-9 pr-3 py-2 rounded-lg bg-[#F6F8FA] dark:bg-[#0C1017] border border-slate-200 dark:border-[#1E2636] text-xs text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-teal-600 font-mono transition-colors"
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setIsResetMode(true);
                      setResetStep('email');
                      setResetEmail(loginEmail || '');
                      setResetError(null);
                    }}
                    className="text-[11px] font-semibold text-teal-700 dark:text-teal-400 hover:text-teal-900 dark:hover:text-teal-300 transition-colors"
                  >
                    Forgot Password?
                  </button>
                </div>
                <div className="relative">
                  <IconLock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500" />
                  <input
                    type="password"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                    placeholder="••••••••••••"
                    className="w-full pl-9 pr-3 py-2 rounded-lg bg-[#F6F8FA] dark:bg-[#0C1017] border border-slate-200 dark:border-[#1E2636] text-xs text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-teal-600 font-mono transition-colors"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full mt-2 py-2.5 px-4 rounded-lg bg-teal-700 hover:bg-teal-800 font-bold text-xs text-white shadow-subtle transition-colors flex items-center justify-center gap-2"
              >
                <span>{isLoading ? 'Authenticating Operator...' : 'Sign In to Workspace'}</span>
                <IconArrowRight className="w-3.5 h-3.5" />
              </button>
            </form>
          </>
            ) : (
              /* --- COMPLETE FORGOT PASSWORD / RESET WIZARD --- */
              <div>
                {/* Header */}
                <div className="mb-6">
                  <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded font-mono text-[10px] font-bold bg-teal-500/10 text-teal-700 dark:text-teal-400 border border-teal-500/20 mb-2">
                    <IconKey className="w-3 h-3" />
                    <span>Secure Password Recovery</span>
                  </div>
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
                    {resetStep === 'email' && 'Reset Your Password'}
                    {resetStep === 'otp' && 'Verify 6-Digit Code'}
                    {resetStep === 'password' && 'Choose New Password'}
                    {resetStep === 'success' && 'Password Updated!'}
                  </h2>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                    {resetStep === 'email' && 'Enter your registered email address to receive a secure, time-limited verification code.'}
                    {resetStep === 'otp' && `Enter the 6-digit code dispatched to ${resetEmail}. Valid for 10 minutes.`}
                    {resetStep === 'password' && 'Create a strong new password for your Invenza operator account.'}
                    {resetStep === 'success' && 'Your credentials have been securely updated in PostgreSQL. You may now sign in.'}
                  </p>
                </div>

                {/* Reset Error Message */}
                {resetError && (
                  <div className="mb-5 p-3 rounded-lg bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 text-rose-800 dark:text-rose-300 text-xs flex items-start gap-2.5">
                    <IconAlertCircle className="w-4 h-4 shrink-0 text-rose-600 dark:text-rose-400 mt-0.5" />
                    <span>{resetError}</span>
                  </div>
                )}

                {/* Step 1: Request OTP Form */}
                {resetStep === 'email' && (
                  <form onSubmit={handleSendResetOtp} className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Registered Email Address
                      </label>
                      <div className="relative">
                        <IconMail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500" />
                        <input
                          type="email"
                          value={resetEmail}
                          onChange={(e) => setResetEmail(e.target.value)}
                          required
                          autoFocus
                          placeholder="name@company.com"
                          className="w-full pl-9 pr-3 py-2 rounded-lg bg-[#F6F8FA] dark:bg-[#0C1017] border border-slate-200 dark:border-[#1E2636] text-xs text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-teal-600 font-mono transition-colors"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={resetLoading}
                      className="w-full py-2.5 px-4 rounded-lg bg-teal-700 hover:bg-teal-800 font-bold text-xs text-white shadow-subtle transition-colors flex items-center justify-center gap-2"
                    >
                      <span>{resetLoading ? 'Generating Secure OTP...' : 'Send Verification Code'}</span>
                      <IconArrowRight className="w-3.5 h-3.5" />
                    </button>

                    <div className="text-center pt-2">
                      <button
                        type="button"
                        onClick={handleReturnToLogin}
                        className="text-xs text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors"
                      >
                        &larr; Back to Sign In
                      </button>
                    </div>
                  </form>
                )}

                {/* Step 2: Verify OTP Form */}
                {resetStep === 'otp' && (
                  <form onSubmit={handleVerifyOtp} className="space-y-4">
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                          6-Digit Verification Code
                        </label>
                        <span className="text-[11px] font-mono text-teal-700 dark:text-teal-400 flex items-center gap-1 font-semibold">
                          <IconClock className="w-3 h-3" />
                          <span>10 min TTL</span>
                        </span>
                      </div>
                      <input
                        type="text"
                        maxLength={6}
                        value={resetOtp}
                        onChange={(e) => setResetOtp(e.target.value.replace(/\D/g, ''))}
                        required
                        autoFocus
                        placeholder="••••••"
                        className="w-full py-2.5 px-4 text-center text-xl tracking-[0.5em] font-mono font-bold rounded-lg bg-[#F6F8FA] dark:bg-[#0C1017] border border-slate-200 dark:border-[#1E2636] text-teal-700 dark:text-teal-400 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-teal-600 transition-colors"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={resetLoading || resetOtp.length !== 6}
                      className="w-full py-2.5 px-4 rounded-lg bg-teal-700 hover:bg-teal-800 disabled:opacity-50 font-bold text-xs text-white shadow-subtle transition-colors flex items-center justify-center gap-2"
                    >
                      <span>{resetLoading ? 'Verifying OTP...' : 'Verify Code & Proceed'}</span>
                      <IconArrowRight className="w-3.5 h-3.5" />
                    </button>

                    <div className="flex items-center justify-between pt-2 text-xs">
                      <button
                        type="button"
                        onClick={handleReturnToLogin}
                        className="text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors"
                      >
                        &larr; Back to Sign In
                      </button>

                      <button
                        type="button"
                        disabled={resendCooldown > 0 || resetLoading}
                        onClick={handleSendResetOtp}
                        className="text-teal-700 dark:text-teal-400 hover:text-teal-900 dark:hover:text-teal-300 disabled:text-slate-400 dark:disabled:text-slate-600 transition-colors flex items-center gap-1 font-semibold"
                      >
                        <IconRefreshCw className="w-3 h-3" />
                        <span>{resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend Code'}</span>
                      </button>
                    </div>
                  </form>
                )}

                {/* Step 3: New Password Form */}
                {resetStep === 'password' && (
                  <form onSubmit={handleSetNewPassword} className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        New Password
                      </label>
                      <div className="relative">
                        <IconLock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500" />
                        <input
                          type="password"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          required
                          autoFocus
                          placeholder="Min. 8 characters"
                          className="w-full pl-9 pr-3 py-2 rounded-lg bg-[#F6F8FA] dark:bg-[#0C1017] border border-slate-200 dark:border-[#1E2636] text-xs text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-teal-600 font-mono transition-colors"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Confirm New Password
                      </label>
                      <div className="relative">
                        <IconLock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500" />
                        <input
                          type="password"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          required
                          placeholder="Re-enter password"
                          className="w-full pl-9 pr-3 py-2 rounded-lg bg-[#F6F8FA] dark:bg-[#0C1017] border border-slate-200 dark:border-[#1E2636] text-xs text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-teal-600 font-mono transition-colors"
                        />
                      </div>
                    </div>

                    {/* Requirements checklist */}
                    <div className="p-3 rounded-lg bg-[#F6F8FA] dark:bg-[#0C1017] border border-slate-200 dark:border-[#1E2636] space-y-1 font-mono text-[11px]">
                      <div className={`flex items-center gap-2 ${newPassword.length >= 8 ? 'text-teal-700 dark:text-teal-400 font-semibold' : 'text-slate-400 dark:text-slate-500'}`}>
                        <IconCheck className="w-3 h-3" />
                        <span>At least 8 characters</span>
                      </div>
                      <div className={`flex items-center gap-2 ${/[A-Z]/.test(newPassword) ? 'text-teal-700 dark:text-teal-400 font-semibold' : 'text-slate-400 dark:text-slate-500'}`}>
                        <IconCheck className="w-3 h-3" />
                        <span>One uppercase letter (A-Z)</span>
                      </div>
                      <div className={`flex items-center gap-2 ${/[a-z]/.test(newPassword) ? 'text-teal-700 dark:text-teal-400 font-semibold' : 'text-slate-400 dark:text-slate-500'}`}>
                        <IconCheck className="w-3 h-3" />
                        <span>One lowercase letter (a-z)</span>
                      </div>
                      <div className={`flex items-center gap-2 ${/\d/.test(newPassword) ? 'text-teal-700 dark:text-teal-400 font-semibold' : 'text-slate-400 dark:text-slate-500'}`}>
                        <IconCheck className="w-3 h-3" />
                        <span>At least one number (0-9)</span>
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={resetLoading}
                      className="w-full py-2.5 px-4 rounded-lg bg-teal-700 hover:bg-teal-800 font-bold text-xs text-white shadow-subtle transition-colors flex items-center justify-center gap-2"
                    >
                      <span>{resetLoading ? 'Hashing & Updating PostgreSQL...' : 'Update Password'}</span>
                      <IconArrowRight className="w-3.5 h-3.5" />
                    </button>

                    <div className="text-center pt-2">
                      <button
                        type="button"
                        onClick={handleReturnToLogin}
                        className="text-xs text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors"
                      >
                        &larr; Back to Sign In
                      </button>
                    </div>
                  </form>
                )}

                {/* Step 4: Success State */}
                {resetStep === 'success' && (
                  <div className="text-center space-y-4 py-2">
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-teal-500/10 text-teal-700 dark:text-teal-400 border border-teal-500/20">
                      <IconCheck className="w-6 h-6" />
                    </div>

                    <p className="text-xs text-slate-700 dark:text-slate-300">
                      Your password has been successfully hashed and committed to the database.
                    </p>

                    <button
                      type="button"
                      onClick={handleReturnToLogin}
                      className="w-full py-2.5 px-4 rounded-lg bg-teal-700 hover:bg-teal-800 font-bold text-xs text-white shadow-subtle transition-colors flex items-center justify-center gap-2"
                    >
                      <span>Sign In with New Password</span>
                      <IconArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            )}
    </div>
  );
};

  if (isModal) {
    return (
      <div className="w-full">
        {renderCardContent()}
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full flex flex-col lg:flex-row bg-[#F1F3F7] dark:bg-[#0C1017] text-slate-900 dark:text-slate-100 selection:bg-teal-700 selection:text-white relative">
      <PageMeta
        title={isResetMode ? "Reset Password | Invenza Enterprise Inventory" : "Operator Sign In | Invenza Enterprise Inventory"}
        description="Secure multi-tenant inventory portal. Sign in with organizational credentials to access movement ledgers, warehouse routing, and order dispatches."
        canonicalPath="/login"
      />
      <JsonLd type="organization" />
      <JsonLd type="software" />

      {/* Floating Theme Toggle */}
      <div className="absolute top-4 right-4 z-20">
        <button
          type="button"
          onClick={toggleTheme}
          className="p-2 sm:px-3 sm:py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#131924] text-slate-700 dark:text-slate-300 hover:text-teal-700 dark:hover:text-teal-400 shadow-subtle transition-colors flex items-center gap-2 text-xs font-semibold"
          title={theme === 'dark' ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
        >
          {theme === 'dark' ? (
            <>
              <IconSun className="w-4 h-4 text-amber-400" />
              <span className="hidden sm:inline">Light Mode</span>
            </>
          ) : (
            <>
              <IconMoon className="w-4 h-4 text-slate-700" />
              <span className="hidden sm:inline">Dark Mode</span>
            </>
          )}
        </button>
      </div>

      {/* Left Column: Brand & Architecture Matrix */}
      <div className="lg:w-1/2 p-8 sm:p-12 lg:p-16 flex flex-col justify-between border-b lg:border-b-0 lg:border-r border-slate-200 dark:border-[#1E2636] bg-[#E8ECF2] dark:bg-[#0E131C]">
        <div>
          {/* Logo */}
          <div className="flex items-center gap-3.5 mb-12">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-teal-800 text-white font-mono font-bold text-lg border border-teal-700 shadow-subtle">
              I
            </div>
            <div>
              <span className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">Invenza</span>
              <span className="ml-2 text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-teal-500/10 text-teal-700 dark:text-teal-400 border border-teal-500/20 uppercase tracking-wider">
                Enterprise Core
              </span>
            </div>
          </div>

          {/* Value Prop Header */}
          <div className="max-w-xl mb-12">
            <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight leading-tight">
              Enterprise Multi-Tenant Inventory & Ledger Engine.
            </h1>
            <p className="text-slate-600 dark:text-slate-400 text-sm mt-4 leading-relaxed">
              Cryptographically verified movement auditing, multi-warehouse routing, and dual-state GST invoicing.
              Sign in with your organization account below.
            </p>
          </div>

          {/* Architecture Summary Table */}
          <div className="max-w-xl rounded-lg border border-slate-200 dark:border-[#1E2636] bg-white dark:bg-[#131924] p-4 space-y-3 font-mono text-xs shadow-card">
            <div className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-[#1E2636] pb-2">
              System Capabilities & Security Specs
            </div>
            <div className="flex justify-between items-center text-slate-700 dark:text-slate-300">
              <span className="text-slate-500 dark:text-slate-400">Database Engine:</span>
              <span className="text-teal-700 dark:text-teal-400 font-medium">PostgreSQL 16 with Row-Level Isolation</span>
            </div>
            <div className="flex justify-between items-center text-slate-700 dark:text-slate-300">
              <span className="text-slate-500 dark:text-slate-400">Ledger Protocol:</span>
              <span className="text-teal-700 dark:text-teal-400 font-medium">Append-Only Cryptographic Audit Stream</span>
            </div>
            <div className="flex justify-between items-center text-slate-700 dark:text-slate-300">
              <span className="text-slate-500 dark:text-slate-400">Authentication:</span>
              <span className="text-teal-700 dark:text-teal-400 font-medium">JWT Bearer with Role Matrix (RBAC)</span>
            </div>
            <div className="flex justify-between items-center text-slate-700 dark:text-slate-300">
              <span className="text-slate-500 dark:text-slate-400">Session Security:</span>
              <span className="text-teal-700 dark:text-teal-400 font-medium">Redis OTP with Rate Limiting</span>
            </div>
          </div>
        </div>

        {/* Footer info & Legal Links */}
        <div className="pt-8 border-t border-slate-200 dark:border-[#1E2636] mt-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
            <span>&copy; 2026 Invenza IMS.</span>
            <a href="/terms" className="hover:text-slate-900 dark:hover:text-slate-200 transition-colors">
              Terms of Service
            </a>
            <span>&bull;</span>
            <a href="/privacy" className="hover:text-slate-900 dark:hover:text-slate-200 transition-colors">
              Privacy Policy
            </a>
          </div>
          <span className="flex items-center gap-1.5 font-mono text-[11px] text-emerald-700 dark:text-emerald-400 font-medium">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            Production API Online
          </span>
        </div>
      </div>

      {/* Right Column: Clean Login Portal & Reset Flow */}
      <div className="lg:w-1/2 flex items-center justify-center p-6 sm:p-10 lg:p-16">
        <div className="w-full max-w-md">
          {renderCardContent()}
        </div>
      </div>
    </div>
  );
};
