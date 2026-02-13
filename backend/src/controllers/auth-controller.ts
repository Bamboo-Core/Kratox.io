import type { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import pool from '../config/database.js';
import {
  checkLoginAllowed,
  recordFailedAttempt,
  recordSuccessfulLogin,
  isValidEmailFormat,
  sanitizeEmail,
  getClientIp,
  logSecurityEvent,
  detectSuspiciousActivity,
} from '../utils/login-security.js';
import { verifyRecaptcha } from '../utils/recaptcha.js';
import {
  generateAccessToken,
  generateRefreshToken,
  getRefreshTokenData,
  revokeRefreshToken,
  revokeAllUserTokens,
  REFRESH_TOKEN_COOKIE_NAME,
  REFRESH_TOKEN_COOKIE_OPTIONS,
  CLEAR_COOKIE_OPTIONS,
  type AccessTokenPayload,
} from '../utils/token-service.js';

// deploy
export async function login(req: Request, res: Response) {
  const clientIp = getClientIp(req);
  const userAgent = req.headers['user-agent'] || 'unknown';

  const { email, password, recaptchaToken } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  // Verify reCAPTCHA
  const recaptchaResult = await verifyRecaptcha(recaptchaToken, clientIp);
  if (!recaptchaResult.valid) {
    logSecurityEvent('LOGIN_BLOCKED', {
      ip: clientIp,
      userAgent,
      reason: 'reCAPTCHA verification failed',
    });
    return res.status(400).json({ error: recaptchaResult.error || 'reCAPTCHA verification failed.' });
  }

  if (!isValidEmailFormat(email)) {
    return res.status(400).json({ error: 'Invalid email format.' });
  }

  const sanitizedEmail = sanitizeEmail(email);

  const suspiciousCheck = detectSuspiciousActivity(sanitizedEmail, clientIp, userAgent);
  if (suspiciousCheck.suspicious) {
    logSecurityEvent('SUSPICIOUS_ACTIVITY', {
      email: sanitizedEmail,
      ip: clientIp,
      userAgent,
      reason: suspiciousCheck.reasons.join(', '),
    });

    return res.status(400).json({ error: 'Invalid request.' });
  }

  const blockCheck = checkLoginAllowed(sanitizedEmail, clientIp);
  if (blockCheck) {
    logSecurityEvent('LOGIN_BLOCKED', {
      email: sanitizedEmail,
      ip: clientIp,
      userAgent,
      reason: 'Rate limit exceeded',
    });

    return res.status(429).json({
      error: blockCheck.message,
      retryAfter: blockCheck.retryAfter,
    });
  }

  if (typeof password !== 'string' || password.length === 0 || password.length > 128) {
    recordFailedAttempt(sanitizedEmail, clientIp);
    return res.status(401).json({ error: 'Invalid credentials.' });
  }

  try {
    const userResult = await pool.query('SELECT * FROM users WHERE email = $1', [sanitizedEmail]);

    if (userResult.rows.length === 0) {
      const result = recordFailedAttempt(sanitizedEmail, clientIp);

      logSecurityEvent('LOGIN_FAILED', {
        email: sanitizedEmail,
        ip: clientIp,
        userAgent,
        reason: 'User not found',
        attemptsRemaining: result.attemptsRemaining,
      });

      if (result.locked) {
        logSecurityEvent('ACCOUNT_LOCKED', {
          email: sanitizedEmail,
          ip: clientIp,
          userAgent,
          reason: 'Too many failed attempts',
        });
      }

      await simulatePasswordCheck();

      return res.status(401).json({
        error: 'Invalid credentials.',
        ...(result.attemptsRemaining > 0 && result.attemptsRemaining <= 3
          ? { attemptsRemaining: result.attemptsRemaining }
          : {}),
      });
    }

    const user = userResult.rows[0];

    const isMatch = await bcrypt.compare(password, user.password_hash);

    if (!isMatch) {
      const result = recordFailedAttempt(sanitizedEmail, clientIp);

      logSecurityEvent('LOGIN_FAILED', {
        email: sanitizedEmail,
        ip: clientIp,
        userAgent,
        reason: 'Password mismatch',
        attemptsRemaining: result.attemptsRemaining,
      });

      if (result.locked) {
        logSecurityEvent('ACCOUNT_LOCKED', {
          email: sanitizedEmail,
          ip: clientIp,
          userAgent,
          reason: 'Too many failed attempts',
        });

        return res.status(429).json({
          error:
            'Account temporarily locked due to too many failed attempts. Please try again later.',
        });
      }

      return res.status(401).json({
        error: 'Invalid credentials.',
        ...(result.attemptsRemaining > 0 && result.attemptsRemaining <= 3
          ? { attemptsRemaining: result.attemptsRemaining }
          : {}),
      });
    }

    recordSuccessfulLogin(sanitizedEmail, clientIp);

    const tenantResult = await pool.query('SELECT name FROM tenants WHERE id = $1', [
      user.tenant_id,
    ]);
    const tenantName = tenantResult.rows.length > 0 ? tenantResult.rows[0].name : 'Unknown Tenant';

    const payload: AccessTokenPayload = {
      userId: user.id,
      tenantId: user.tenant_id,
      email: user.email,
      name: user.name,
      role: user.role,
      tenantName: tenantName,
      zabbix_hostgroup_ids: user.zabbix_hostgroup_ids || [],
      phone_number: user.phone_number,
    };

    // Generate access token (short-lived, 15 min)
    const accessToken = generateAccessToken(payload);

    // Generate refresh token (long-lived, 7 days, stored server-side)
    const refreshToken = generateRefreshToken(user.id, user.tenant_id);

    logSecurityEvent('LOGIN_SUCCESS', {
      email: sanitizedEmail,
      ip: clientIp,
      userAgent,
    });

    // Set refresh token as httpOnly cookie
    res.cookie(REFRESH_TOKEN_COOKIE_NAME, refreshToken, REFRESH_TOKEN_COOKIE_OPTIONS);

    // Send access token in response body (will be stored in memory on frontend)
    res.status(200).json({
      accessToken,
      user: payload,
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'An internal server error occurred during login.' });
  }
}

async function simulatePasswordCheck(): Promise<void> {
  const dummyHash = '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy';
  await bcrypt.compare('dummy_password', dummyHash);
}

/**
 * Refresh access token using refresh token from httpOnly cookie
 */
export async function refreshAccessToken(req: Request, res: Response) {
  const refreshToken = req.cookies?.[REFRESH_TOKEN_COOKIE_NAME];

  if (!refreshToken) {
    return res.status(401).json({ error: 'No refresh token provided.' });
  }

  const tokenData = getRefreshTokenData(refreshToken);

  if (!tokenData) {
    // Clear invalid cookie
    res.clearCookie(REFRESH_TOKEN_COOKIE_NAME, CLEAR_COOKIE_OPTIONS);
    return res.status(401).json({ error: 'Invalid or expired refresh token.' });
  }

  try {
    // Fetch user data from database
    const userResult = await pool.query('SELECT * FROM users WHERE id = $1', [tokenData.userId]);

    if (userResult.rows.length === 0) {
      revokeRefreshToken(refreshToken);
      res.clearCookie(REFRESH_TOKEN_COOKIE_NAME, CLEAR_COOKIE_OPTIONS);
      return res.status(401).json({ error: 'User not found.' });
    }

    const user = userResult.rows[0];

    // Verify tenant still matches (security check)
    if (user.tenant_id !== tokenData.tenantId) {
      revokeAllUserTokens(tokenData.userId);
      res.clearCookie(REFRESH_TOKEN_COOKIE_NAME, CLEAR_COOKIE_OPTIONS);
      return res.status(401).json({ error: 'Session invalidated.' });
    }

    const tenantResult = await pool.query('SELECT name FROM tenants WHERE id = $1', [
      user.tenant_id,
    ]);
    const tenantName = tenantResult.rows.length > 0 ? tenantResult.rows[0].name : 'Unknown Tenant';

    const payload: AccessTokenPayload = {
      userId: user.id,
      tenantId: user.tenant_id,
      email: user.email,
      name: user.name,
      role: user.role,
      tenantName: tenantName,
      zabbix_hostgroup_ids: user.zabbix_hostgroup_ids || [],
      phone_number: user.phone_number,
    };

    // Revoke old refresh token and generate new one (rotation)
    revokeRefreshToken(refreshToken);
    const newRefreshToken = generateRefreshToken(user.id, user.tenant_id, tokenData.family);

    // Generate new access token
    const accessToken = generateAccessToken(payload);

    // Set new refresh token cookie
    res.cookie(REFRESH_TOKEN_COOKIE_NAME, newRefreshToken, REFRESH_TOKEN_COOKIE_OPTIONS);

    res.status(200).json({
      accessToken,
      user: payload,
    });
  } catch (error) {
    console.error('Token refresh error:', error);
    res.status(500).json({ error: 'An internal server error occurred.' });
  }
}

/**
 * Logout - revoke refresh token and clear cookie
 */
export async function logout(req: Request, res: Response) {
  const refreshToken = req.cookies?.[REFRESH_TOKEN_COOKIE_NAME];

  if (refreshToken) {
    revokeRefreshToken(refreshToken);
  }

  res.clearCookie(REFRESH_TOKEN_COOKIE_NAME, CLEAR_COOKIE_OPTIONS);
  res.status(200).json({ message: 'Logged out successfully.' });
}

/**
 * Logout from all devices - revoke all refresh tokens for user
 */
export async function logoutAll(req: Request, res: Response) {
  const userId = req.user?.id;

  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized.' });
  }

  revokeAllUserTokens(userId);
  res.clearCookie(REFRESH_TOKEN_COOKIE_NAME, CLEAR_COOKIE_OPTIONS);
  res.status(200).json({ message: 'Logged out from all devices successfully.' });
}
