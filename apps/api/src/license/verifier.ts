import * as jose from 'jose';
import { LicenseClaims, LicenseClaimsSchema } from '@invenaro/shared';

function parsePublicKeyPem(keyEnv: string): string {
  const trimmed = keyEnv.trim();
  // If it's already a PEM string
  if (trimmed.includes('BEGIN PUBLIC KEY')) {
    return trimmed.replace(/\\n/g, '\n');
  }
  // If it's base64 encoded SPKI PEM
  try {
    const decoded = Buffer.from(trimmed, 'base64').toString('utf-8');
    if (decoded.includes('BEGIN PUBLIC KEY')) {
      return decoded.replace(/\\n/g, '\n');
    }
  } catch {}

  // Fallback wrapping if raw base64 DER/SPKI
  return `-----BEGIN PUBLIC KEY-----\n${trimmed}\n-----END PUBLIC KEY-----`;
}

export async function verifyLicenseToken(token: string): Promise<LicenseClaims> {
  const publicKeyEnv = process.env.LICENSE_PUBLIC_KEY;
  const jwksEnv = process.env.LICENSE_PUBLIC_JWKS;

  if (!publicKeyEnv && !jwksEnv) {
    throw new Error('No LICENSE_PUBLIC_KEY or LICENSE_PUBLIC_JWKS configured');
  }

  let verifyResult: jose.JWTVerifyResult;

  if (jwksEnv) {
    // Local JWKS verification
    try {
      const jwks = JSON.parse(jwksEnv);
      const JWKS = jose.createLocalJWKSet(jwks);
      verifyResult = await jose.jwtVerify(token, JWKS, {
        algorithms: ['EdDSA'],
      });
    } catch (err: any) {
      throw new Error(`JWKS verification failed: ${err.message}`);
    }
  } else {
    // Single Ed25519 SPKI Public Key
    const pem = parsePublicKeyPem(publicKeyEnv!);
    const cryptoKey = await jose.importSPKI(pem, 'EdDSA');
    verifyResult = await jose.jwtVerify(token, cryptoKey, {
      algorithms: ['EdDSA'],
    });
  }

  // Validate payload claims with Zod
  const parse = LicenseClaimsSchema.safeParse(verifyResult.payload);
  if (!parse.success) {
    throw new Error(`Invalid token claims: ${parse.error.errors.map((e) => e.message).join(', ')}`);
  }

  const claims = parse.data;

  // Verify issuer
  if (claims.iss !== 'invenaro-control') {
    throw new Error(`Invalid issuer: ${claims.iss}`);
  }

  // Verify domain if APP_DOMAIN is configured
  const appDomain = process.env.APP_DOMAIN;
  if (appDomain && appDomain.trim() !== '') {
    const normalizedApp = appDomain.trim().toLowerCase();
    const normalizedToken = claims.domain.trim().toLowerCase();
    if (normalizedApp !== normalizedToken && normalizedToken !== 'localhost') {
      throw new Error(`Domain mismatch: expected "${normalizedApp}", received "${normalizedToken}"`);
    }
  }

  return claims;
}
