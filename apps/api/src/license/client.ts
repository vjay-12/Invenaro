import { LicenseVerifyResponse, LicenseVerifyResponseSchema } from '@invenaro/shared';

export interface VerifyLicenseParams {
  licenseKey: string;
  domain?: string;
  appVersion?: string;
}

export class LicenseClientError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode?: number
  ) {
    super(message);
    this.name = 'LicenseClientError';
  }
}

export async function fetchLicenseVerification(
  params: VerifyLicenseParams
): Promise<LicenseVerifyResponse> {
  const apiUrl = process.env.LICENSE_API_URL;
  if (!apiUrl) {
    throw new LicenseClientError(
      'LICENSE_API_URL environment variable is not configured',
      'missing_config'
    );
  }

  const cleanApiUrl = apiUrl.replace(/\/+$/, '');
  const targetUrl = `${cleanApiUrl}/v1/licenses/verify`;

  const domain = params.domain || process.env.APP_DOMAIN || 'localhost';
  const appVersion = params.appVersion || process.env.APP_VERSION || '1.0.0';

  let response: globalThis.Response;
  try {
    response = await fetch(targetUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        licenseKey: params.licenseKey,
        domain,
        appVersion,
      }),
    });
  } catch (err: any) {
    throw new LicenseClientError(
      `Failed to connect to license service at ${targetUrl}: ${err.message}`,
      'network_unreachable'
    );
  }

  const bodyText = await response.text();
  let json: any;
  try {
    json = JSON.parse(bodyText);
  } catch {
    throw new LicenseClientError(
      `Invalid JSON response from license service (status ${response.status})`,
      'invalid_response',
      response.status
    );
  }

  if (!response.ok) {
    const errorCode = json?.error || json?.code || `http_${response.status}`;
    const errorMsg = json?.message || `License verification rejected with status ${response.status}`;
    throw new LicenseClientError(errorMsg, errorCode, response.status);
  }

  const parse = LicenseVerifyResponseSchema.safeParse(json);
  if (!parse.success) {
    throw new LicenseClientError(
      `Malformed verification response: ${parse.error.errors.map((e) => e.message).join(', ')}`,
      'schema_mismatch'
    );
  }

  return parse.data;
}
