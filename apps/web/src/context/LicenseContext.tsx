import React, { createContext, useContext, useState, useEffect } from 'react';
import { PlanModules, PlanType } from '@invenaro/types';
import { DEFAULT_PLAN_MODULES, LicenseOperationalState } from '@invenaro/shared';
import { api } from '../services/api';

interface LicenseContextType {
  plan: PlanType;
  modules: PlanModules;
  state: LicenseOperationalState;
  licenseExpiresAt: string | null;
  graceEndsAt: string | null;
  message: string;
  hasModule: (moduleName: keyof PlanModules) => boolean;
  isReadOnly: boolean;
  isGrace: boolean;
  isUnlicensed: boolean;
  refreshLicense: () => Promise<void>;
  loading: boolean;
}

const LicenseContext = createContext<LicenseContextType | undefined>(undefined);

export const LicenseProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [plan, setPlan] = useState<PlanType>('business');
  const [modules, setModules] = useState<PlanModules>(DEFAULT_PLAN_MODULES.business);
  const [state, setState] = useState<LicenseOperationalState>('active');
  const [licenseExpiresAt, setLicenseExpiresAt] = useState<string | null>(null);
  const [graceEndsAt, setGraceEndsAt] = useState<string | null>(null);
  const [message, setMessage] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);

  const refreshLicense = async () => {
    try {
      setLoading(true);
      const data = await api.getLicenseStatus();
      if (data && data.plan) {
        setPlan(data.plan);
        setModules(data.modules || DEFAULT_PLAN_MODULES[data.plan as PlanType]);
        setState(data.state || 'active');
        setLicenseExpiresAt(data.licenseExpiresAt || null);
        setGraceEndsAt(data.graceEndsAt || null);
        setMessage(data.message || '');
      }
    } catch (e) {
      console.warn('Could not retrieve license status, falling back to defaults:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshLicense();
  }, []);

  const hasModule = (moduleName: keyof PlanModules): boolean => {
    return Boolean(modules[moduleName]);
  };

  const isReadOnly = state === 'read_only' || state === 'unlicensed';
  const isGrace = state === 'grace';
  const isUnlicensed = state === 'unlicensed';

  return (
    <LicenseContext.Provider
      value={{
        plan,
        modules,
        state,
        licenseExpiresAt,
        graceEndsAt,
        message,
        hasModule,
        isReadOnly,
        isGrace,
        isUnlicensed,
        refreshLicense,
        loading,
      }}
    >
      {children}
    </LicenseContext.Provider>
  );
};

export const useLicense = (): LicenseContextType => {
  const context = useContext(LicenseContext);
  if (!context) {
    throw new Error('useLicense must be used within a LicenseProvider');
  }
  return context;
};
