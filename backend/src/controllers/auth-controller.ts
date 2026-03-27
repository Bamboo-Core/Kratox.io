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
  getRefreshTokenCookieOptions,
  TRUST_TOKEN_COOKIE_NAME,
  TRUST_TOKEN_COOKIE_OPTIONS,
  CLEAR_COOKIE_OPTIONS,
  type AccessTokenPayload,
  generateMfaToken,
  verifyMfaToken,
} from '../utils/token-service.js';
import { sendVerificationEmail } from '../services/email-service.js';
import { v4 as uuidv4 } from 'uuid';

// deploy
export async function login(req: Request, res: Response) {
  const clientIp = getClientIp(req);
  const userAgent = req.headers['user-agent'] || 'unknown';

  const { email, password, recaptchaToken, rememberMe } = req.body;

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
    return res.status(401).json({ error: 'login.invalidCredentials' });
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
        error: 'login.emailNotFound',
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
        error: 'login.invalidCredentials',
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
    const trustToken = req.cookies?.[TRUST_TOKEN_COOKIE_NAME];
    let isTrusted = false;

    if (trustToken && typeof trustToken === 'string' && trustToken.length > 10) {
      console.log(`[AUTH] Checking trust token for user ${user.id}: ${trustToken.substring(0, 8)}...`);
      const trustResult = await pool.query(
        'SELECT * FROM trusted_devices WHERE user_id = $1 AND device_id = $2 AND expires_at > NOW()',
        [user.id, trustToken]
      );
      if (trustResult.rows.length > 0) {
        isTrusted = true;
        console.log(`[AUTH] Device is trusted for user ${user.id}`);
        // Renew the trust cookie to extend its life
        res.cookie(TRUST_TOKEN_COOKIE_NAME, trustToken, TRUST_TOKEN_COOKIE_OPTIONS);
      } else {
        console.log(`[AUTH] Trust token provided but not found or expired for user ${user.id}`);
      }
    } else if (trustToken) {
      console.warn(`[AUTH] Invalid trust token format received for user ${user.id}`);
    } else {
      console.log(`[AUTH] No trust token cookie found for user ${user.id}`);
    }
    if (!isTrusted) {
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

      await pool.query(
        'UPDATE users SET login_code = $1, login_code_expires_at = $2 WHERE id = $3',
        [code, expiresAt, user.id]
      );

      await sendVerificationEmail(user.email, code);

      const mfaToken = generateMfaToken(user.id, user.email);

      return res.status(200).json({
        requires2FA: true,
        mfaToken,
      });
    }

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

    const accessToken = generateAccessToken(payload);
    const refreshToken = generateRefreshToken(user.id, user.tenant_id, !!rememberMe);

    logSecurityEvent('LOGIN_SUCCESS', {
      email: sanitizedEmail,
      ip: clientIp,
      userAgent,
    });

    res.cookie(REFRESH_TOKEN_COOKIE_NAME, refreshToken, getRefreshTokenCookieOptions(!!rememberMe));

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
    const newRefreshToken = generateRefreshToken(user.id, user.tenant_id, !!tokenData.rememberMe, tokenData.family);

    // Generate new access token
    const accessToken = generateAccessToken(payload);

    // Set new refresh token cookie
    res.cookie(REFRESH_TOKEN_COOKIE_NAME, newRefreshToken, getRefreshTokenCookieOptions(!!tokenData.rememberMe));

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

/**
 * Verify 2FA code and complete login
 */
export async function verify2FA(req: Request, res: Response) {
  const { mfaToken, code, rememberDevice, rememberMe } = req.body;

  if (!mfaToken || !code) {
    return res.status(400).json({ error: 'MFA token and code are required.' });
  }

  const mfaData = verifyMfaToken(mfaToken);
  if (!mfaData) {
    return res.status(401).json({ error: 'Invalid or expired session. Please login again.' });
  }

  try {
    const checkResult = await pool.query('SELECT login_code, login_code_expires_at FROM users WHERE id = $1', [mfaData.userId]);

    const userResult = await pool.query(
      'SELECT * FROM users WHERE id = $1 AND login_code = $2 AND login_code_expires_at > NOW()',
      [mfaData.userId, code]
    );

    if (userResult.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid or expired code.' });
    }

    const user = userResult.rows[0];

    await pool.query(
      'UPDATE users SET login_code = NULL, login_code_expires_at = NULL WHERE id = $1',
      [user.id]
    );

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

    if (rememberDevice) {
      const deviceId = uuidv4();
      const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

      await pool.query(
        'INSERT INTO trusted_devices (user_id, device_id, expires_at) VALUES ($1, $2, $3)',
        [user.id, deviceId, expiresAt]
      );

      res.cookie(TRUST_TOKEN_COOKIE_NAME, deviceId, TRUST_TOKEN_COOKIE_OPTIONS);
    }

    const accessToken = generateAccessToken(payload);
    const refreshToken = generateRefreshToken(user.id, user.tenant_id, !!rememberMe);

    res.cookie(REFRESH_TOKEN_COOKIE_NAME, refreshToken, getRefreshTokenCookieOptions(!!rememberMe));

    res.status(200).json({
      accessToken,
      user: payload,
    });
  } catch (error) {
    console.error('2FA verification error:', error);
    res.status(500).json({ error: 'An internal server error occurred.' });
  }
}

export async function resend2FA(req: Request, res: Response) {
  const { mfaToken } = req.body;

  if (!mfaToken) {
    return res.status(400).json({ error: 'MFA token is required.' });
  }

  const mfaData = verifyMfaToken(mfaToken);
  if (!mfaData) {
    return res.status(401).json({ error: 'Invalid or expired session. Please login again.' });
  }

  try {
    const userResult = await pool.query('SELECT email FROM users WHERE id = $1', [mfaData.userId]);

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found.' });
    }

    const user = userResult.rows[0];

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    await pool.query(
      'UPDATE users SET login_code = $1, login_code_expires_at = $2 WHERE id = $3',
      [code, expiresAt, mfaData.userId]
    );

    await sendVerificationEmail(user.email, code);

    res.status(200).json({ message: 'Verification code resent successfully.' });
  } catch (error) {
    console.error('Resend 2FA error:', error);
    res.status(500).json({ error: 'An internal server error occurred.' });
  }
}

