import React, { createContext, useContext, useState, useEffect } from 'react';
import { PlanModules, PlanType } from '@invenaro/types';
import { DEFAULT_PLAN_MODULES } from '@invenaro/shared';
import { api } from '../services/api';

interface EntitlementsContextType {
  plan: PlanType;
  modules: PlanModules;
  hasModule: (moduleName: keyof PlanModules) => boolean;
  isBasic: boolean;
  isBusiness: boolean;
  isEnterprise: boolean;
  enableGst: boolean;
  setPlanPreview: (plan: PlanType) => void;
  refreshEntitlements: () => Promise<void>;
  loading: boolean;
}

const EntitlementsContext = createContext<EntitlementsContextType | undefined>(undefined);

export const EntitlementsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [plan, setPlan] = useState<PlanType>('business'); // Default to business to showcase full multi-godown feature set
  const [modules, setModules] = useState<PlanModules>(DEFAULT_PLAN_MODULES.business);
  const [enableGst, setEnableGst] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);

  const refreshEntitlements = async () => {
    try {
      setLoading(true);
      const data = await api.getEntitlements();
      if (data && data.plan) {
        setPlan(data.plan);
        setModules(data.modules || DEFAULT_PLAN_MODULES[data.plan]);
      }
      const settingsData = await api.getSettings();
      if (settingsData?.settings) {
        setEnableGst(Boolean(settingsData.settings.enable_gst));
      }
    } catch (e) {
      console.warn('Could not fetch entitlements from API, using defaults:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshEntitlements();
  }, []);

  const hasModule = (moduleName: keyof PlanModules): boolean => {
    return Boolean(modules[moduleName]);
  };

  const setPlanPreview = (newPlan: PlanType) => {
    setPlan(newPlan);
    setModules(DEFAULT_PLAN_MODULES[newPlan]);
  };

  return (
    <EntitlementsContext.Provider
      value={{
        plan,
        modules,
        hasModule,
        isBasic: plan === 'basic',
        isBusiness: plan === 'business',
        isEnterprise: plan === 'enterprise',
        enableGst: Boolean(enableGst && modules.gst),
        setPlanPreview,
        refreshEntitlements,
        loading,
      }}
    >
      {children}
    </EntitlementsContext.Provider>
  );
};

export const useEntitlements = () => {
  const context = useContext(EntitlementsContext);
  if (!context) {
    throw new Error('useEntitlements must be used within an EntitlementsProvider');
  }
  return context;
};
