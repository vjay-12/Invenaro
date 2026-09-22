import crypto from 'crypto';

/**
 * Generates a cryptographically strong random temporary password.
 * Format: 12 base64url random bytes + '!A9'
 */
export function generateTemporaryPassword(): string {
  return crypto.randomBytes(12).toString('base64url') + '!A9';
}
