import jwt from 'jsonwebtoken';

// Token expiration times
export const ACCESS_TOKEN_EXPIRY = '15m'; // Short-lived access token
export const REFRESH_TOKEN_EXPIRY = '7d'; // Long-lived refresh token

// Cookie configuration
export const REFRESH_TOKEN_COOKIE_NAME = 'refreshToken';
// Use SECURE_COOKIES env var to enable cross-origin cookies (set to 'true' in production)
const secureCookies = process.env.SECURE_COOKIES === 'true';
export const REFRESH_TOKEN_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: secureCookies,
  // 'none' is required for cross-origin cookies (frontend and backend on different domains)
  // 'lax' is safer for local development on the same origin
  sameSite: secureCookies ? ('none' as const) : ('lax' as const),
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in milliseconds
  path: '/',
};

// Clear cookie options must match the original cookie options for cross-origin to work
export const CLEAR_COOKIE_OPTIONS = {
  path: '/',
  secure: secureCookies,
  sameSite: secureCookies ? ('none' as const) : ('lax' as const),
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
}

export interface RefreshTokenData {
  userId: string;
  tenantId: string;
  family: string; // Kept for backwards compatibility, not used in JWT version
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
  _existingFamily?: string // Kept for backwards compatibility, ignored
): string {
  const payload: RefreshTokenPayload = {
    userId,
    tenantId,
    type: 'refresh',
  };
  return jwt.sign(payload, getRefreshSecret(), { expiresIn: REFRESH_TOKEN_EXPIRY });
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
