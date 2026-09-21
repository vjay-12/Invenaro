import React, { useState, useEffect } from 'react';
import {
  IconUser,
  IconBuilding,
  IconLock,
  IconKey,
  IconMail,
  IconShieldCheck,
  IconClock,
  IconCheck,
  IconCheckCircle2,
  IconAlertTriangle,
  IconAlertCircle,
  IconEye,
  IconEyeOff,
  IconRefreshCw,
  IconX,
  IconSend,
} from '../components/icons';
import { PageMeta } from '../components/common/PageMeta';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';

interface UserProfileResponse {
  user: {
    id: string;
    email: string;
    full_name: string;
    role: string;
    is_active: boolean;
    created_at: string | null;
  };
  company: {
    id: string | null;
    name: string;
    company_code: string | null;
    industry: string;
    location: string;
    currency_code: string;
  };
  is_admin: boolean;
  pending_email_request: {
    id: string;
    current_email: string;
    requested_email: string;
    status: string;
    reason: string | null;
    created_at: string;
  } | null;
}

export const Profile: React.FC = () => {
  const { user: authUser, updateUserLocal } = useAuth();

  // Page state
  const [profile, setProfile] = useState<UserProfileResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // User details state
  const [fullName, setFullName] = useState<string>('');
  const [isSavingName, setIsSavingName] = useState<boolean>(false);
  const [nameSuccess, setNameSuccess] = useState<string | null>(null);
  const [nameError, setNameError] = useState<string | null>(null);

  // Email change request state
  const [showEmailRequestForm, setShowEmailRequestForm] = useState<boolean>(false);
  const [requestedEmail, setRequestedEmail] = useState<string>('');
  const [emailReason, setEmailReason] = useState<string>('');
  const [isSubmittingEmail, setIsSubmittingEmail] = useState<boolean>(false);
  const [emailSuccess, setEmailSuccess] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [isCancellingEmail, setIsCancellingEmail] = useState<boolean>(false);

  // Company details state
  const [companyName, setCompanyName] = useState<string>('');
  const [companyIndustry, setCompanyIndustry] = useState<string>('');
  const [companyLocation, setCompanyLocation] = useState<string>('');
  const [isSavingCompany, setIsSavingCompany] = useState<boolean>(false);
  const [companySuccess, setCompanySuccess] = useState<string | null>(null);
  const [companyError, setCompanyError] = useState<string | null>(null);

  // Reset password OTP flow state
  const [resetStage, setResetStage] = useState<'request' | 'verify'>('request');
  const [resetOtp, setResetOtp] = useState<string>('');
  const [newPassword, setNewPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [showNewPass, setShowNewPass] = useState<boolean>(false);
  const [showConfirmPass, setShowConfirmPass] = useState<boolean>(false);
  const [isSendingOtp, setIsSendingOtp] = useState<boolean>(false);
  const [isResettingPassword, setIsResettingPassword] = useState<boolean>(false);
  const [otpCooldown, setOtpCooldown] = useState<number>(0);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  // Fetch profile data
  const loadProfile = async () => {
    setIsLoading(true);
    setFetchError(null);
    try {
      const data = await api.getProfile();
      if (data && data.user) {
        setProfile(data);
        setFullName(data.user.full_name || '');
        setCompanyName(data.company?.name || '');
        setCompanyIndustry(data.company?.industry || '');
        setCompanyLocation(data.company?.location || '');
      } else {
        // Fallback to auth context if API fails
        setFullName(authUser?.fullName || '');
        setCompanyName(authUser?.companyName || '');
      }
    } catch (err: any) {
      console.error('Failed to load profile:', err);
      setFetchError(err.message || 'Failed to load profile data.');
      setFullName(authUser?.fullName || '');
      setCompanyName(authUser?.companyName || '');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadProfile();
  }, []);

  // Format display role
  const formatRole = (role?: string) => {
    switch (role) {
      case 'super_admin':
        return 'Super Administrator';
      case 'admin':
        return 'Organization Administrator';
      case 'manager':
        return 'Operations Manager';
      case 'staff':
        return 'Staff Member';
      case 'viewer':
        return 'Read-Only Viewer';
      default:
        return 'Team Member';
    }
  };

  // Handle Full Name Update
  const handleUpdateName = async (e: React.FormEvent) => {
    e.preventDefault();
    setNameSuccess(null);
    setNameError(null);

    const clean = fullName.trim();
    if (!clean) {
      setNameError('Full name cannot be left blank.');
      return;
    }

    setIsSavingName(true);
    try {
      const res = await api.updateUserName(clean);
      setNameSuccess(res?.message || 'Profile name updated successfully.');
      updateUserLocal({ fullName: clean });
      if (profile) {
        setProfile({
          ...profile,
          user: { ...profile.user, full_name: clean },
        });
      }
      setTimeout(() => setNameSuccess(null), 4000);
    } catch (err: any) {
      setNameError(err.message || 'Failed to update name.');
    } finally {
      setIsSavingName(false);
    }
  };

  // Handle Email Change Request
  const handleRequestEmailChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmailSuccess(null);
    setEmailError(null);

    const cleanEmail = requestedEmail.trim().toLowerCase();
    if (!cleanEmail) {
      setEmailError('Please enter a valid email address.');
      return;
    }

    if (cleanEmail === profile?.user.email.toLowerCase()) {
      setEmailError('The requested email is already your current registered email.');
      return;
    }

    setIsSubmittingEmail(true);
    try {
      const res = await api.requestEmailChange(cleanEmail, emailReason.trim() || undefined);
      setEmailSuccess(res?.message || 'Email change request submitted and held pending approval.');
      setShowEmailRequestForm(false);
      setRequestedEmail('');
      setEmailReason('');
      await loadProfile();
    } catch (err: any) {
      setEmailError(err.message || 'Failed to submit email change request.');
    } finally {
      setIsSubmittingEmail(false);
    }
  };

  // Handle Cancel Email Change Request
  const handleCancelEmailRequest = async () => {
    setIsCancellingEmail(true);
    setEmailError(null);
    try {
      await api.cancelEmailChangeRequest();
      setEmailSuccess('Email change request cancelled.');
      await loadProfile();
      setTimeout(() => setEmailSuccess(null), 4000);
    } catch (err: any) {
      setEmailError(err.message || 'Failed to cancel email change request.');
    } finally {
      setIsCancellingEmail(false);
    }
  };

  // Handle Company Details Update (Admin only)
  const handleUpdateCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    setCompanySuccess(null);
    setCompanyError(null);

    const cleanName = companyName.trim();
    if (!cleanName) {
      setCompanyError('Company name cannot be blank.');
      return;
    }

    setIsSavingCompany(true);
    try {
      const res = await api.updateCompanyDetails({
        name: cleanName,
        industry: companyIndustry.trim() || undefined,
        location: companyLocation.trim() || undefined,
      });
      setCompanySuccess(res?.message || 'Company details updated successfully.');
      updateUserLocal({ companyName: cleanName });
      if (profile && res?.company) {
        setProfile({
          ...profile,
          company: {
            ...profile.company,
            ...res.company,
          },
        });
      }
      setTimeout(() => setCompanySuccess(null), 4000);
    } catch (err: any) {
      setCompanyError(err.message || 'Failed to update company details.');
    } finally {
      setIsSavingCompany(false);
    }
  };

  // Cooldown timer for resending OTP
  useEffect(() => {
    if (otpCooldown <= 0) return;
    const timer = setInterval(() => {
      setOtpCooldown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [otpCooldown]);

  // Step 1: Send OTP to user's registered email
  const handleSendResetOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const userEmail = profile?.user.email || authUser?.email;
    if (!userEmail) {
      setPasswordError('No registered email found for this user account.');
      return;
    }

    setPasswordError(null);
    setPasswordSuccess(null);
    setIsSendingOtp(true);
    try {
      await api.forgotPassword(userEmail);
      setResetStage('verify');
      setOtpCooldown(60);
      setPasswordSuccess(`A 6-digit verification code has been dispatched to ${userEmail}.`);
    } catch (err: any) {
      setPasswordError(err.message || 'Failed to dispatch verification code. Please try again.');
    } finally {
      setIsSendingOtp(false);
    }
  };

  // Step 2: Verify OTP and update password
  const handleVerifyAndChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    const userEmail = profile?.user.email || authUser?.email;
    if (!userEmail) {
      setPasswordError('No registered email found for this user account.');
      return;
    }

    const cleanOtp = resetOtp.trim();
    if (cleanOtp.length !== 6) {
      setPasswordError('Please enter the complete 6-digit verification code (OTP).');
      return;
    }

    if (newPassword.length < 8) {
      setPasswordError('New password must be at least 8 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('The new passwords do not match. Please verify and retype.');
      return;
    }

    setPasswordError(null);
    setPasswordSuccess(null);
    setIsResettingPassword(true);
    try {
      const res = await api.resetPassword({
        email: userEmail,
        otp: cleanOtp,
        new_password: newPassword,
      });
      setPasswordSuccess(res?.message || 'Your account password has been successfully updated via email OTP verification.');
      setResetOtp('');
      setNewPassword('');
      setConfirmPassword('');
      setResetStage('request');
      setOtpCooldown(0);
      setTimeout(() => setPasswordSuccess(null), 6000);
    } catch (err: any) {
      setPasswordError(err.message || 'Failed to update password. Please check your verification code.');
    } finally {
      setIsResettingPassword(false);
    }
  };

  // Password validation helpers
  const hasMinLength = newPassword.length >= 8;
  const hasUppercase = /[A-Z]/.test(newPassword);
  const hasLowercase = /[a-z]/.test(newPassword);
  const hasDigit = /[0-9]/.test(newPassword);
  const hasSpecial = /[^A-Za-z0-9]/.test(newPassword);
  const isMatch = newPassword.length > 0 && newPassword === confirmPassword;

  const isAdmin = profile?.is_admin ?? (authUser?.role === 'admin' || authUser?.role === 'super_admin');

  if (isLoading) {
    return (
      <div className="flex-1 overflow-y-auto bg-[#F1F3F7] dark:bg-[#0C1017] p-6 lg:p-10">
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="h-8 w-48 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
          <div className="h-4 w-72 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
          <div className="h-64 bg-white dark:bg-[#131924] rounded-xl border border-slate-200 dark:border-slate-800 p-6 animate-pulse" />
          <div className="h-64 bg-white dark:bg-[#131924] rounded-xl border border-slate-200 dark:border-slate-800 p-6 animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto bg-[#F1F3F7] dark:bg-[#0C1017] p-4 sm:p-6 lg:p-8">
      <PageMeta
        title="User & Organization Profile"
        description="Manage your Invenza personal details, organizational information, email change requests, and account credentials."
        canonicalPath="/profile"
      />

      <div className="max-w-4xl mx-auto space-y-8">
        {/* Page Header */}
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-slate-500 dark:text-slate-400 mb-1">
            <span>Account</span>
            <span>/</span>
            <span className="text-teal-600 dark:text-teal-400">Profile & Organization</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Profile Settings
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Manage your personal profile, review organization settings, and update your security credentials.
          </p>
        </div>

        {fetchError && (
          <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-4 text-xs text-amber-700 dark:text-amber-400 flex items-center gap-2">
            <IconAlertTriangle className="h-4 w-4 shrink-0" />
            <span>{fetchError}</span>
          </div>
        )}

        {/* ========================================================================= */}
        {/* SECTION 1: User Profile Details                                          */}
        {/* ========================================================================= */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#131924] p-6 shadow-sm">
          <div className="flex items-center justify-between pb-5 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-teal-500/10 border border-teal-500/20 text-teal-600 dark:text-teal-400 flex items-center justify-center font-bold text-sm">
                <IconUser className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-slate-900 dark:text-white">
                  Personal Details
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Your identity and registered account details on Invenza.
                </p>
              </div>
            </div>

            <div className="inline-flex items-center gap-1.5 rounded-md bg-teal-500/10 px-2.5 py-1 text-xs font-mono font-medium text-teal-700 dark:text-teal-400 border border-teal-500/20">
              <IconShieldCheck className="h-3.5 w-3.5" />
              <span>{formatRole(profile?.user.role || authUser?.role)}</span>
            </div>
          </div>

          {/* Full Name Edit Form */}
          <form onSubmit={handleUpdateName} className="mt-6 space-y-4">
            {nameSuccess && (
              <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-3 text-xs text-emerald-700 dark:text-emerald-400 flex items-center gap-2">
                <IconCheckCircle2 className="h-4 w-4 shrink-0" />
                <span>{nameSuccess}</span>
              </div>
            )}
            {nameError && (
              <div className="rounded-lg border border-rose-500/20 bg-rose-500/10 p-3 text-xs text-rose-700 dark:text-rose-400 flex items-center gap-2">
                <IconAlertCircle className="h-4 w-4 shrink-0" />
                <span>{nameError}</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Full Name
                </label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Your full name"
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0C1017] px-3.5 py-2 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-teal-500 transition-colors"
                />
                <span className="text-[11px] text-slate-400 mt-1 block">
                  You can edit and update your display name directly.
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Account Role
                </label>
                <input
                  type="text"
                  readOnly
                  disabled
                  value={formatRole(profile?.user.role || authUser?.role)}
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 px-3.5 py-2 text-sm text-slate-500 dark:text-slate-400 cursor-not-allowed font-mono"
                />
                <span className="text-[11px] text-slate-400 mt-1 block">
                  Roles are assigned by Organization Administrators.
                </span>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={isSavingName || fullName.trim() === (profile?.user.full_name || '')}
                className="inline-flex items-center gap-2 rounded-lg bg-teal-600 px-4 py-2 text-xs font-semibold text-white hover:bg-teal-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isSavingName ? (
                  <>
                    <IconRefreshCw className="h-3.5 w-3.5 animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <IconCheck className="h-3.5 w-3.5" />
                    <span>Save Name</span>
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Email Management & Approval Section */}
          <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-800">
            <div className="flex items-start justify-between flex-wrap gap-4">
              <div>
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                  <IconMail className="h-4 w-4 text-slate-500 dark:text-slate-400" />
                  <span>Registered Email Address</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Used for signing in, invoice dispatch notifications, and security alerts.
                </p>
              </div>

              {!profile?.pending_email_request && !showEmailRequestForm && (
                <button
                  type="button"
                  onClick={() => setShowEmailRequestForm(true)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0C1017] px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:border-teal-500 transition-colors"
                >
                  <IconMail className="h-3.5 w-3.5 text-teal-600" />
                  <span>Request Email Change</span>
                </button>
              )}
            </div>

            {/* Current Email Display */}
            <div className="mt-3 flex items-center gap-3">
              <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 px-4 py-2 text-sm font-mono text-slate-800 dark:text-slate-200">
                {profile?.user.email || authUser?.email || 'user@invenza.internal'}
              </div>
              <span className="inline-flex items-center gap-1 text-[11px] font-mono text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded">
                <IconCheck className="h-3 w-3" />
                <span>Active & Verified</span>
              </span>
            </div>

            {/* Pending Email Change Request Notice */}
            {profile?.pending_email_request && (
              <div className="mt-4 rounded-xl border border-amber-500/30 bg-amber-500/5 dark:bg-amber-500/10 p-4">
                <div className="flex items-start justify-between flex-wrap gap-3">
                  <div className="flex items-start gap-3">
                    <div className="p-1.5 rounded-lg bg-amber-500/20 text-amber-700 dark:text-amber-400 mt-0.5">
                      <IconClock className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-amber-800 dark:text-amber-300">
                          Email Change Pending Approval
                        </h4>
                        <span className="rounded bg-amber-500/20 px-2 py-0.5 text-[10px] font-mono font-semibold text-amber-800 dark:text-amber-300">
                          Pending Review
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">
                        You requested to change your email to{' '}
                        <span className="font-mono font-semibold text-slate-900 dark:text-white">
                          {profile.pending_email_request.requested_email}
                        </span>
                        . For security compliance, this change will take effect once approved by an Organization Administrator.
                      </p>
                      {profile.pending_email_request.reason && (
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 italic">
                          Reason: &ldquo;{profile.pending_email_request.reason}&rdquo;
                        </p>
                      )}
                      <p className="text-[10px] font-mono text-slate-400 mt-1">
                        Submitted: {new Date(profile.pending_email_request.created_at).toLocaleString()}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleCancelEmailRequest}
                    disabled={isCancellingEmail}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-rose-300 dark:border-rose-900/50 bg-rose-50 dark:bg-rose-950/30 px-3 py-1.5 text-xs font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-900/50 transition-colors"
                  >
                    {isCancellingEmail ? (
                      <IconRefreshCw className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <IconX className="h-3.5 w-3.5" />
                    )}
                    <span>Cancel Request</span>
                  </button>
                </div>
              </div>
            )}

            {/* Email Change Request Form (Accordion) */}
            {showEmailRequestForm && !profile?.pending_email_request && (
              <form onSubmit={handleRequestEmailChange} className="mt-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30 p-4 space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    Request Change of Registered Email
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setShowEmailRequestForm(false);
                      setEmailError(null);
                    }}
                    className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  >
                    <IconX className="h-4 w-4" />
                  </button>
                </div>

                <div className="rounded-lg border border-teal-500/20 bg-teal-500/5 p-2.5 text-[11px] text-teal-800 dark:text-teal-300">
                  Security Notice: Email changes are submitted and held pending administrative approval rather than applying immediately.
                </div>

                {emailError && (
                  <div className="rounded-lg border border-rose-500/20 bg-rose-500/10 p-2.5 text-xs text-rose-700 dark:text-rose-400 flex items-center gap-2">
                    <IconAlertCircle className="h-4 w-4 shrink-0" />
                    <span>{emailError}</span>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      New Email Address *
                    </label>
                    <input
                      type="email"
                      required
                      value={requestedEmail}
                      onChange={(e) => setRequestedEmail(e.target.value)}
                      placeholder="e.g. yourname@company.com"
                      className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0C1017] px-3 py-1.5 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-teal-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Reason for Change (Optional)
                    </label>
                    <input
                      type="text"
                      value={emailReason}
                      onChange={(e) => setEmailReason(e.target.value)}
                      placeholder="e.g. Corporate domain migration"
                      className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0C1017] px-3 py-1.5 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-teal-500"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setShowEmailRequestForm(false)}
                    className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingEmail || !requestedEmail.trim()}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-teal-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-teal-500 disabled:opacity-50"
                  >
                    {isSubmittingEmail ? (
                      <>
                        <IconRefreshCw className="h-3 w-3 animate-spin" />
                        <span>Submitting...</span>
                      </>
                    ) : (
                      <>
                        <IconMail className="h-3 w-3" />
                        <span>Submit Change Request</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>

        {/* ========================================================================= */}
        {/* SECTION 2: Company / Organization Details                                */}
        {/* ========================================================================= */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#131924] p-6 shadow-sm">
          <div className="flex items-center justify-between pb-5 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-teal-500/10 border border-teal-500/20 text-teal-600 dark:text-teal-400 flex items-center justify-center font-bold text-sm">
                <IconBuilding className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-slate-900 dark:text-white">
                  Company Details
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Organizational profile and workspace metadata.
                </p>
              </div>
            </div>

            {isAdmin ? (
              <span className="inline-flex items-center gap-1.5 rounded-md bg-emerald-500/10 px-2.5 py-1 text-xs font-mono font-medium text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
                <IconCheck className="h-3.5 w-3.5" />
                <span>Admin Access Enabled</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-md bg-slate-100 dark:bg-slate-800 px-2.5 py-1 text-xs font-mono font-medium text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                <IconLock className="h-3.5 w-3.5" />
                <span>Admin Restricted</span>
              </span>
            )}
          </div>

          {!isAdmin && (
            <div className="mt-4 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/40 p-3.5 flex items-center gap-3">
              <IconLock className="h-4 w-4 text-slate-400 shrink-0" />
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                <span className="font-semibold text-slate-800 dark:text-slate-200">View-Only Mode:</span>{' '}
                Editing company and organizational details is restricted to Organization Administrators.
                If any organizational information requires correction, please contact your administrator.
              </p>
            </div>
          )}

          <form onSubmit={handleUpdateCompany} className="mt-6 space-y-4">
            {companySuccess && (
              <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-3 text-xs text-emerald-700 dark:text-emerald-400 flex items-center gap-2">
                <IconCheckCircle2 className="h-4 w-4 shrink-0" />
                <span>{companySuccess}</span>
              </div>
            )}
            {companyError && (
              <div className="rounded-lg border border-rose-500/20 bg-rose-500/10 p-3 text-xs text-rose-700 dark:text-rose-400 flex items-center gap-2">
                <IconAlertCircle className="h-4 w-4 shrink-0" />
                <span>{companyError}</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Company Name {isAdmin && '*'}
                </label>
                <input
                  type="text"
                  required
                  disabled={!isAdmin}
                  readOnly={!isAdmin}
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="Company legal / trading name"
                  className={`w-full rounded-lg border border-slate-200 dark:border-slate-800 px-3.5 py-2 text-sm transition-colors ${
                    isAdmin
                      ? 'bg-white dark:bg-[#0C1017] text-slate-900 dark:text-slate-100 focus:outline-none focus:border-teal-500'
                      : 'bg-slate-50 dark:bg-slate-900/50 text-slate-500 dark:text-slate-400 cursor-not-allowed'
                  }`}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Industry / Sector
                </label>
                <input
                  type="text"
                  disabled={!isAdmin}
                  readOnly={!isAdmin}
                  value={companyIndustry}
                  onChange={(e) => setCompanyIndustry(e.target.value)}
                  placeholder="e.g. Retail, Manufacturing, Logistics"
                  className={`w-full rounded-lg border border-slate-200 dark:border-slate-800 px-3.5 py-2 text-sm transition-colors ${
                    isAdmin
                      ? 'bg-white dark:bg-[#0C1017] text-slate-900 dark:text-slate-100 focus:outline-none focus:border-teal-500'
                      : 'bg-slate-50 dark:bg-slate-900/50 text-slate-500 dark:text-slate-400 cursor-not-allowed'
                  }`}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Primary Location / Headquarters
                </label>
                <input
                  type="text"
                  disabled={!isAdmin}
                  readOnly={!isAdmin}
                  value={companyLocation}
                  onChange={(e) => setCompanyLocation(e.target.value)}
                  placeholder="e.g. Mumbai, Maharashtra"
                  className={`w-full rounded-lg border border-slate-200 dark:border-slate-800 px-3.5 py-2 text-sm transition-colors ${
                    isAdmin
                      ? 'bg-white dark:bg-[#0C1017] text-slate-900 dark:text-slate-100 focus:outline-none focus:border-teal-500'
                      : 'bg-slate-50 dark:bg-slate-900/50 text-slate-500 dark:text-slate-400 cursor-not-allowed'
                  }`}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Workspace Unique Identifier
                </label>
                <input
                  type="text"
                  readOnly
                  disabled
                  value={profile?.company?.company_code || profile?.company?.id || 'TENANT-DEFAULT'}
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 px-3.5 py-2 text-sm text-slate-500 dark:text-slate-400 cursor-not-allowed font-mono"
                />
              </div>
            </div>

            {isAdmin && (
              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={isSavingCompany}
                  className="inline-flex items-center gap-2 rounded-lg bg-teal-600 px-4 py-2 text-xs font-semibold text-white hover:bg-teal-500 disabled:opacity-50 transition-colors"
                >
                  {isSavingCompany ? (
                    <>
                      <IconRefreshCw className="h-3.5 w-3.5 animate-spin" />
                      <span>Saving Details...</span>
                    </>
                  ) : (
                    <>
                      <IconCheck className="h-3.5 w-3.5" />
                      <span>Save Company Details</span>
                    </>
                  )}
                </button>
              </div>
            )}
          </form>
        </div>

        {/* ========================================================================= */}
        {/* SECTION 3: Reset Password Option                                         */}
        {/* ========================================================================= */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#131924] p-6 shadow-sm">
          <div className="flex items-center justify-between pb-5 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-teal-500/10 border border-teal-500/20 text-teal-600 dark:text-teal-400 flex items-center justify-center font-bold text-sm">
                <IconKey className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-slate-900 dark:text-white">
                  Reset Password
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Reset your password securely via a 6-digit verification code sent to your registered email.
                </p>
              </div>
            </div>

            {resetStage === 'verify' && (
              <span className="inline-flex items-center gap-1.5 rounded-md bg-amber-500/10 px-2.5 py-1 text-xs font-mono font-medium text-amber-700 dark:text-amber-400 border border-amber-500/20">
                <IconClock className="h-3.5 w-3.5" />
                <span>Verification in Progress</span>
              </span>
            )}
          </div>

          {passwordSuccess && (
            <div className="mt-4 rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-3.5 text-xs text-emerald-700 dark:text-emerald-400 flex items-center gap-2.5">
              <IconCheckCircle2 className="h-4 w-4 shrink-0" />
              <span>{passwordSuccess}</span>
            </div>
          )}
          {passwordError && (
            <div className="mt-4 rounded-lg border border-rose-500/20 bg-rose-500/10 p-3.5 text-xs text-rose-700 dark:text-rose-400 flex items-center gap-2.5">
              <IconAlertCircle className="h-4 w-4 shrink-0" />
              <span>{passwordError}</span>
            </div>
          )}

          {resetStage === 'request' ? (
            <div className="mt-6 space-y-4">
              <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/30 p-4">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-teal-500/10 text-teal-600 dark:text-teal-400 shrink-0">
                    <IconMail className="h-4 w-4" />
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                      Registered Account Email
                    </h4>
                    <p className="text-xs font-mono text-slate-600 dark:text-slate-300">
                      {profile?.user.email || authUser?.email || 'user@invenza.internal'}
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 pt-0.5">
                      To protect your account, password resets require a one-time verification code (OTP) sent to your registered email address.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-1">
                <button
                  type="button"
                  onClick={() => handleSendResetOtp()}
                  disabled={isSendingOtp}
                  className="inline-flex items-center gap-2 rounded-lg bg-teal-600 px-4 py-2 text-xs font-semibold text-white hover:bg-teal-500 disabled:opacity-50 transition-colors"
                >
                  {isSendingOtp ? (
                    <>
                      <IconRefreshCw className="h-3.5 w-3.5 animate-spin" />
                      <span>Dispatching Code...</span>
                    </>
                  ) : (
                    <>
                      <IconSend className="h-3.5 w-3.5" />
                      <span>Send Verification Code to Email</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleVerifyAndChangePassword} className="mt-6 space-y-4">
              <div className="rounded-lg border border-teal-500/20 bg-teal-500/5 p-3 flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-2 text-xs text-teal-800 dark:text-teal-300">
                  <IconMail className="h-4 w-4 shrink-0" />
                  <span>
                    Verification code sent to{' '}
                    <strong className="font-mono">{profile?.user.email || authUser?.email}</strong>.
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => handleSendResetOtp()}
                  disabled={otpCooldown > 0 || isSendingOtp}
                  className="text-xs font-mono font-semibold text-teal-600 dark:text-teal-400 hover:underline disabled:opacity-50 disabled:no-underline shrink-0"
                >
                  {otpCooldown > 0 ? `Resend in ${otpCooldown}s` : 'Resend Code'}
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* 6-Digit OTP Code */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    6-Digit Verification Code (OTP) *
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    value={resetOtp}
                    onChange={(e) => setResetOtp(e.target.value.replace(/\D/g, ''))}
                    placeholder="e.g. 849201"
                    className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0C1017] px-3.5 py-2 text-sm font-mono tracking-widest font-bold text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-teal-500 transition-colors text-center sm:text-left"
                  />
                  <span className="text-[11px] text-slate-400 mt-1 block">
                    Check your inbox or spam folder.
                  </span>
                </div>

                {/* New Password */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    New Password *
                  </label>
                  <div className="relative">
                    <input
                      type={showNewPass ? 'text' : 'password'}
                      required
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Create new password"
                      className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0C1017] pl-3.5 pr-10 py-2 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-teal-500 transition-colors"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPass(!showNewPass)}
                      className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                    >
                      {showNewPass ? <IconEyeOff className="h-4 w-4" /> : <IconEye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {/* Confirm New Password */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Confirm New Password *
                  </label>
                  <div className="relative">
                    <input
                      type={showConfirmPass ? 'text' : 'password'}
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Retype new password"
                      className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0C1017] pl-3.5 pr-10 py-2 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-teal-500 transition-colors"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPass(!showConfirmPass)}
                      className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                    >
                      {showConfirmPass ? <IconEyeOff className="h-4 w-4" /> : <IconEye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Password Requirements Checklist */}
              <div className="rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/30 p-3">
                <p className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-2">
                  Password Security Checklist:
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px]">
                  <span className={`flex items-center gap-1.5 ${hasMinLength ? 'text-emerald-600 dark:text-emerald-400 font-medium' : 'text-slate-400'}`}>
                    <IconCheck className={`h-3 w-3 ${hasMinLength ? 'text-emerald-600' : 'text-slate-300 dark:text-slate-600'}`} />
                    At least 8 characters
                  </span>
                  <span className={`flex items-center gap-1.5 ${hasUppercase ? 'text-emerald-600 dark:text-emerald-400 font-medium' : 'text-slate-400'}`}>
                    <IconCheck className={`h-3 w-3 ${hasUppercase ? 'text-emerald-600' : 'text-slate-300 dark:text-slate-600'}`} />
                    1 uppercase letter
                  </span>
                  <span className={`flex items-center gap-1.5 ${hasLowercase ? 'text-emerald-600 dark:text-emerald-400 font-medium' : 'text-slate-400'}`}>
                    <IconCheck className={`h-3 w-3 ${hasLowercase ? 'text-emerald-600' : 'text-slate-300 dark:text-slate-600'}`} />
                    1 lowercase letter
                  </span>
                  <span className={`flex items-center gap-1.5 ${hasDigit ? 'text-emerald-600 dark:text-emerald-400 font-medium' : 'text-slate-400'}`}>
                    <IconCheck className={`h-3 w-3 ${hasDigit ? 'text-emerald-600' : 'text-slate-300 dark:text-slate-600'}`} />
                    1 numeric digit
                  </span>
                  <span className={`flex items-center gap-1.5 ${hasSpecial ? 'text-emerald-600 dark:text-emerald-400 font-medium' : 'text-slate-400'}`}>
                    <IconCheck className={`h-3 w-3 ${hasSpecial ? 'text-emerald-600' : 'text-slate-300 dark:text-slate-600'}`} />
                    1 special symbol
                  </span>
                  <span className={`flex items-center gap-1.5 ${isMatch ? 'text-emerald-600 dark:text-emerald-400 font-medium' : 'text-slate-400'}`}>
                    <IconCheck className={`h-3 w-3 ${isMatch ? 'text-emerald-600' : 'text-slate-300 dark:text-slate-600'}`} />
                    Passwords match
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setResetStage('request');
                    setPasswordError(null);
                    setResetOtp('');
                  }}
                  className="px-3 py-1.5 text-xs text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                >
                  Back to request
                </button>

                <button
                  type="submit"
                  disabled={isResettingPassword || resetOtp.trim().length !== 6 || !newPassword || !confirmPassword}
                  className="inline-flex items-center gap-2 rounded-lg bg-teal-600 px-4 py-2 text-xs font-semibold text-white hover:bg-teal-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isResettingPassword ? (
                    <>
                      <IconRefreshCw className="h-3.5 w-3.5 animate-spin" />
                      <span>Verifying & Updating...</span>
                    </>
                  ) : (
                    <>
                      <IconLock className="h-3.5 w-3.5" />
                      <span>Verify OTP & Change Password</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
