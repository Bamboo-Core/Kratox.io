/**
 * reCAPTCHA verification service
 */

const RECAPTCHA_SECRET_KEY = process.env.RECAPTCHA_SECRET_KEY || '';
const RECAPTCHA_VERIFY_URL = 'https://www.google.com/recaptcha/api/siteverify';

export interface RecaptchaVerifyResult {
  success: boolean;
  score?: number; // For reCAPTCHA v3
  action?: string; // For reCAPTCHA v3
  challenge_ts?: string;
  hostname?: string;
  'error-codes'?: string[];
}

/**
 * Verifies a reCAPTCHA token with Google's API
 * @param token - The reCAPTCHA token from the client
 * @param remoteIp - Optional client IP address
 * @returns Verification result
 */
export async function verifyRecaptcha(
  token: string,
  remoteIp?: string
): Promise<{ valid: boolean; error?: string }> {
  if (!RECAPTCHA_SECRET_KEY) {
    console.warn('[RECAPTCHA] Secret key not configured, skipping verification');
    return { valid: true }; // Skip verification if not configured
  }

  if (!token) {
    return { valid: false, error: 'reCAPTCHA token is required' };
  }

  try {
    const params = new URLSearchParams({
      secret: RECAPTCHA_SECRET_KEY,
      response: token,
    });

    if (remoteIp) {
      params.append('remoteip', remoteIp);
    }

    const response = await fetch(RECAPTCHA_VERIFY_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    if (!response.ok) {
      console.error('[RECAPTCHA] API request failed:', response.status);
      return { valid: false, error: 'reCAPTCHA verification failed' };
    }

    const result = (await response.json()) as RecaptchaVerifyResult;

    if (!result.success) {
      const errorCodes = result['error-codes'] || [];
      console.warn('[RECAPTCHA] Verification failed:', errorCodes);

      // Map error codes to user-friendly messages
      const errorMessage = mapRecaptchaError(errorCodes);
      return { valid: false, error: errorMessage };
    }

    // For reCAPTCHA v3, check the score (optional)
    if (result.score !== undefined && result.score < 0.5) {
      console.warn('[RECAPTCHA] Low score:', result.score);
      return { valid: false, error: 'reCAPTCHA verification failed - suspicious activity detected' };
    }

    return { valid: true };
  } catch (error) {
    console.error('[RECAPTCHA] Verification error:', error);
    return { valid: false, error: 'reCAPTCHA verification failed' };
  }
}

/**
 * Maps reCAPTCHA error codes to user-friendly messages
 */
function mapRecaptchaError(errorCodes: string[]): string {
  if (errorCodes.includes('timeout-or-duplicate')) {
    return 'reCAPTCHA expired. Please try again.';
  }
  if (errorCodes.includes('invalid-input-response')) {
    return 'Invalid reCAPTCHA. Please try again.';
  }
  if (errorCodes.includes('bad-request')) {
    return 'reCAPTCHA verification failed. Please try again.';
  }
  return 'reCAPTCHA verification failed. Please try again.';
}
