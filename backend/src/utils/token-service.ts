import jwt from 'jsonwebtoken';

// Token expiration times
export const ACCESS_TOKEN_EXPIRY = '15m'; // Short-lived access token
export const REFRESH_TOKEN_EXPIRY = '30d'; // Long-lived refresh token

// Cookie configuration
export const REFRESH_TOKEN_COOKIE_NAME = 'refreshToken';
// Use SECURE_COOKIES env var or detect production environment
const secureCookies = process.env.SECURE_COOKIES === 'true' || process.env.NODE_ENV === 'production';

export const REFRESH_TOKEN_COOKIE_OPTIONS_BASE = {
  httpOnly: true,
  secure: secureCookies,
  sameSite: secureCookies ? ('none' as const) : ('lax' as const),
  path: '/',
};

export function getRefreshTokenCookieOptions(rememberMe: boolean = false) {
  const options: any = { ...REFRESH_TOKEN_COOKIE_OPTIONS_BASE };
  if (rememberMe) {
    options.maxAge = 30 * 24 * 60 * 60 * 1000; // 30 days in milliseconds
  }
  return options;
}

export const REFRESH_TOKEN_COOKIE_OPTIONS = {
  ...REFRESH_TOKEN_COOKIE_OPTIONS_BASE,
  maxAge: 30 * 24 * 60 * 60 * 1000,
};

// Clear cookie options must match the original cookie options for cross-origin to work
export const CLEAR_COOKIE_OPTIONS = {
  path: '/',
  secure: secureCookies,
  sameSite: secureCookies ? ('none' as const) : ('lax' as const),
};

export const TRUST_TOKEN_COOKIE_NAME = 'kratoxTrustToken';
export const TRUST_TOKEN_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: secureCookies,
  sameSite: secureCookies ? ('none' as const) : ('lax' as const),
  maxAge: 30 * 24 * 60 * 60 * 1000, // 30 dias em milissegundos
  path: '/',
};

export interface AccessTokenPayload {
  userId: string;
  tenantId: string;
  email: string;
  name: string;
  role: 'admin' | 'cliente';
  tenantName: string;
  zabbix_hostgroup_ids: string[];
  phone_number: string | null;
}

export interface RefreshTokenPayload {
  userId: string;
  tenantId: string;
  type: 'refresh'; // To distinguish from access tokens
  rememberMe?: boolean;
}

export interface RefreshTokenData {
  userId: string;
  tenantId: string;
  family: string; // Kept for backwards compatibility, not used in JWT version
  rememberMe?: boolean;
}

export interface MfaTokenPayload {
  userId: string;
  email: string;
  type: 'mfa';
}

function getJwtSecret(): string {
  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    throw new Error('JWT_SECRET is not defined');
  }
  return jwtSecret;
}

function getRefreshSecret(): string {
  // Use a different secret for refresh tokens (derived from JWT_SECRET)
  return getJwtSecret() + '_REFRESH';
}

/**
 * Generate a new access token (JWT)
 */
export function generateAccessToken(payload: AccessTokenPayload): string {
  return jwt.sign(payload, getJwtSecret(), { expiresIn: ACCESS_TOKEN_EXPIRY });
}

/**
 * Generate a new refresh token (JWT - stateless, survives server restarts)
 */
export function generateRefreshToken(
  userId: string,
  tenantId: string,
  rememberMe?: boolean,
  _existingFamily?: string // Kept for backwards compatibility, ignored
): string {
  const payload: RefreshTokenPayload = {
    userId,
    tenantId,
    type: 'refresh',
    rememberMe,
  };
  return jwt.sign(payload, getRefreshSecret(), { expiresIn: REFRESH_TOKEN_EXPIRY });
}

/**
 * Generate a temporary MFA token for 2FA verification
 */
export function generateMfaToken(userId: string, email: string): string {
  const payload: MfaTokenPayload = {
    userId,
    email,
    type: 'mfa',
  };
  return jwt.sign(payload, getJwtSecret(), { expiresIn: '10m' });
}

/**
 * Verify and decode an MFA token
 */
export function verifyMfaToken(token: string): MfaTokenPayload | null {
  try {
    const decoded = jwt.verify(token, getJwtSecret()) as MfaTokenPayload;
    if (decoded.type !== 'mfa') return null;
    return decoded;
  } catch (error) {
    return null;
  }
}

/**
 * Verify and get refresh token data
 * Returns null if token is invalid or expired
 */
export function getRefreshTokenData(token: string): RefreshTokenData | null {
  try {
    const decoded = jwt.verify(token, getRefreshSecret()) as RefreshTokenPayload;

    // Verify it's a refresh token
    if (decoded.type !== 'refresh') {
      return null;
    }

    return {
      userId: decoded.userId,
      tenantId: decoded.tenantId,
      family: '', // Not used in JWT version
      rememberMe: decoded.rememberMe,
    };
  } catch (error) {
    // Token is invalid or expired
    return null;
  }
}

/**
 * Revoke a specific refresh token
 * Note: With JWT tokens, we can't truly revoke without a blacklist.
 * For now, this is a no-op. Implement token blacklist with Redis/DB for production.
 */
export function revokeRefreshToken(_token: string): boolean {
  // TODO: Implement token blacklist for true revocation
  // For now, JWT tokens can't be revoked mid-flight
  return true;
}

/**
 * Revoke all refresh tokens for a user
 * Note: With JWT tokens, this requires changing the user's "token version" in the DB.
 * For now, this is a no-op.
 */
export function revokeAllUserTokens(_userId: string): void {
  // TODO: Implement by incrementing user's token_version in DB
  // and checking it during token validation
}
