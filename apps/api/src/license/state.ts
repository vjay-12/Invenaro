import { LicenseClaims, LicenseOperationalState } from '@invenaro/shared';

export interface StateMachineParams {
  claims: LicenseClaims | null;
  now?: number;
  isControlReachable?: boolean;
  offlineGraceDays?: number;
  enforcementEnv?: string;
  nodeEnv?: string;
}

export interface OperationalLicenseState {
  state: LicenseOperationalState;
  message: string;
  isReadOnly: boolean;
  isFullAccess: boolean;
  graceEndsAt: string | null;
}

/**
 * Pure function to calculate current license operational state
 */
export function getLicenseState(params: StateMachineParams): OperationalLicenseState {
  const {
    claims,
    now = Date.now(),
    isControlReachable = true,
    offlineGraceDays = 7,
    enforcementEnv = process.env.LICENSE_ENFORCEMENT,
    nodeEnv = process.env.NODE_ENV || 'development',
  } = params;

  // 1. Check LICENSE_ENFORCEMENT=off (dev bypass only)
  if (enforcementEnv === 'off') {
    if (nodeEnv !== 'production') {
      return {
        state: 'active',
        message: 'License enforcement disabled (development mode bypass).',
        isReadOnly: false,
        isFullAccess: true,
        graceEndsAt: null,
      };
    } else {
      console.warn('⚠️ WARNING: LICENSE_ENFORCEMENT=off is ignored in production environment.');
    }
  }

  // 2. No valid verified token exists
  if (!claims) {
    return {
      state: 'unlicensed',
      message: 'License not activated. System is operating in read-only mode.',
      isReadOnly: true,
      isFullAccess: false,
      graceEndsAt: null,
    };
  }

  const expTimeMs = claims.exp * 1000;
  const offlineGraceLimitMs = expTimeMs + offlineGraceDays * 24 * 60 * 60 * 1000;
  const isTokenExpPassed = now > expTimeMs;

  // 3. Status suspended or expired in claims
  if (claims.status === 'suspended') {
    return {
      state: 'read_only',
      message: 'Subscription suspended. Access is restricted to read-only.',
      isReadOnly: true,
      isFullAccess: false,
      graceEndsAt: null,
    };
  }

  if (claims.status === 'expired') {
    return {
      state: 'read_only',
      message: 'Subscription expired. Access is restricted to read-only.',
      isReadOnly: true,
      isFullAccess: false,
      graceEndsAt: null,
    };
  }

  // 4. Status grace
  if (claims.status === 'grace') {
    return {
      state: 'grace',
      message: 'Subscription is in grace period. Please renew to avoid service interruption.',
      isReadOnly: false,
      isFullAccess: true,
      graceEndsAt: claims.licenseExpiresAt || new Date(offlineGraceLimitMs).toISOString(),
    };
  }

  // 5. Status active
  if (claims.status === 'active') {
    if (!isTokenExpPassed) {
      return {
        state: 'active',
        message: 'License active.',
        isReadOnly: false,
        isFullAccess: true,
        graceEndsAt: null,
      };
    }

    // Token expired, check control unreachable offline grace
    if (!isControlReachable) {
      if (now <= offlineGraceLimitMs) {
        return {
          state: 'grace',
          message: `Control service unreachable. Offline grace active until ${new Date(offlineGraceLimitMs).toISOString()}.`,
          isReadOnly: false,
          isFullAccess: true,
          graceEndsAt: new Date(offlineGraceLimitMs).toISOString(),
        };
      }
      return {
        state: 'read_only',
        message: 'Offline grace period exceeded. Access restricted to read-only until license is refreshed.',
        isReadOnly: true,
        isFullAccess: false,
        graceEndsAt: null,
      };
    }

    // Control was reachable but token is expired
    return {
      state: 'read_only',
      message: 'License token has expired. Access restricted to read-only.',
      isReadOnly: true,
      isFullAccess: false,
      graceEndsAt: null,
    };
  }

  return {
    state: 'unlicensed',
    message: 'License not activated.',
    isReadOnly: true,
    isFullAccess: false,
    graceEndsAt: null,
  };
}
