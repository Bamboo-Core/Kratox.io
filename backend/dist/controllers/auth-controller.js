"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.login = login;
exports.refreshAccessToken = refreshAccessToken;
exports.logout = logout;
exports.logoutAll = logoutAll;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const database_js_1 = __importDefault(require("../config/database.js"));
const login_security_js_1 = require("../utils/login-security.js");
const recaptcha_js_1 = require("../utils/recaptcha.js");
const token_service_js_1 = require("../utils/token-service.js");
// deploy
async function login(req, res) {
    const clientIp = (0, login_security_js_1.getClientIp)(req);
    const userAgent = req.headers['user-agent'] || 'unknown';
    const { email, password, recaptchaToken } = req.body;
    if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required.' });
    }
    // Verify reCAPTCHA
    const recaptchaResult = await (0, recaptcha_js_1.verifyRecaptcha)(recaptchaToken, clientIp);
    if (!recaptchaResult.valid) {
        (0, login_security_js_1.logSecurityEvent)('LOGIN_BLOCKED', {
            ip: clientIp,
            userAgent,
            reason: 'reCAPTCHA verification failed',
        });
        return res.status(400).json({ error: recaptchaResult.error || 'reCAPTCHA verification failed.' });
    }
    if (!(0, login_security_js_1.isValidEmailFormat)(email)) {
        return res.status(400).json({ error: 'Invalid email format.' });
    }
    const sanitizedEmail = (0, login_security_js_1.sanitizeEmail)(email);
    const suspiciousCheck = (0, login_security_js_1.detectSuspiciousActivity)(sanitizedEmail, clientIp, userAgent);
    if (suspiciousCheck.suspicious) {
        (0, login_security_js_1.logSecurityEvent)('SUSPICIOUS_ACTIVITY', {
            email: sanitizedEmail,
            ip: clientIp,
            userAgent,
            reason: suspiciousCheck.reasons.join(', '),
        });
        return res.status(400).json({ error: 'Invalid request.' });
    }
    const blockCheck = (0, login_security_js_1.checkLoginAllowed)(sanitizedEmail, clientIp);
    if (blockCheck) {
        (0, login_security_js_1.logSecurityEvent)('LOGIN_BLOCKED', {
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
        (0, login_security_js_1.recordFailedAttempt)(sanitizedEmail, clientIp);
        return res.status(401).json({ error: 'Invalid credentials.' });
    }
    try {
        const userResult = await database_js_1.default.query('SELECT * FROM users WHERE email = $1', [sanitizedEmail]);
        if (userResult.rows.length === 0) {
            const result = (0, login_security_js_1.recordFailedAttempt)(sanitizedEmail, clientIp);
            (0, login_security_js_1.logSecurityEvent)('LOGIN_FAILED', {
                email: sanitizedEmail,
                ip: clientIp,
                userAgent,
                reason: 'User not found',
                attemptsRemaining: result.attemptsRemaining,
            });
            if (result.locked) {
                (0, login_security_js_1.logSecurityEvent)('ACCOUNT_LOCKED', {
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
        const isMatch = await bcryptjs_1.default.compare(password, user.password_hash);
        if (!isMatch) {
            const result = (0, login_security_js_1.recordFailedAttempt)(sanitizedEmail, clientIp);
            (0, login_security_js_1.logSecurityEvent)('LOGIN_FAILED', {
                email: sanitizedEmail,
                ip: clientIp,
                userAgent,
                reason: 'Password mismatch',
                attemptsRemaining: result.attemptsRemaining,
            });
            if (result.locked) {
                (0, login_security_js_1.logSecurityEvent)('ACCOUNT_LOCKED', {
                    email: sanitizedEmail,
                    ip: clientIp,
                    userAgent,
                    reason: 'Too many failed attempts',
                });
                return res.status(429).json({
                    error: 'Account temporarily locked due to too many failed attempts. Please try again later.',
                });
            }
            return res.status(401).json({
                error: 'Invalid credentials.',
                ...(result.attemptsRemaining > 0 && result.attemptsRemaining <= 3
                    ? { attemptsRemaining: result.attemptsRemaining }
                    : {}),
            });
        }
        (0, login_security_js_1.recordSuccessfulLogin)(sanitizedEmail, clientIp);
        const tenantResult = await database_js_1.default.query('SELECT name FROM tenants WHERE id = $1', [
            user.tenant_id,
        ]);
        const tenantName = tenantResult.rows.length > 0 ? tenantResult.rows[0].name : 'Unknown Tenant';
        const payload = {
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
        const accessToken = (0, token_service_js_1.generateAccessToken)(payload);
        // Generate refresh token (long-lived, 7 days, stored server-side)
        const refreshToken = (0, token_service_js_1.generateRefreshToken)(user.id, user.tenant_id);
        (0, login_security_js_1.logSecurityEvent)('LOGIN_SUCCESS', {
            email: sanitizedEmail,
            ip: clientIp,
            userAgent,
        });
        // Set refresh token as httpOnly cookie
        res.cookie(token_service_js_1.REFRESH_TOKEN_COOKIE_NAME, refreshToken, token_service_js_1.REFRESH_TOKEN_COOKIE_OPTIONS);
        // Send access token in response body (will be stored in memory on frontend)
        res.status(200).json({
            accessToken,
            user: payload,
        });
    }
    catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'An internal server error occurred during login.' });
    }
}
async function simulatePasswordCheck() {
    const dummyHash = '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy';
    await bcryptjs_1.default.compare('dummy_password', dummyHash);
}
/**
 * Refresh access token using refresh token from httpOnly cookie
 */
async function refreshAccessToken(req, res) {
    const refreshToken = req.cookies?.[token_service_js_1.REFRESH_TOKEN_COOKIE_NAME];
    if (!refreshToken) {
        return res.status(401).json({ error: 'No refresh token provided.' });
    }
    const tokenData = (0, token_service_js_1.getRefreshTokenData)(refreshToken);
    if (!tokenData) {
        // Clear invalid cookie
        res.clearCookie(token_service_js_1.REFRESH_TOKEN_COOKIE_NAME, token_service_js_1.CLEAR_COOKIE_OPTIONS);
        return res.status(401).json({ error: 'Invalid or expired refresh token.' });
    }
    try {
        // Fetch user data from database
        const userResult = await database_js_1.default.query('SELECT * FROM users WHERE id = $1', [tokenData.userId]);
        if (userResult.rows.length === 0) {
            (0, token_service_js_1.revokeRefreshToken)(refreshToken);
            res.clearCookie(token_service_js_1.REFRESH_TOKEN_COOKIE_NAME, token_service_js_1.CLEAR_COOKIE_OPTIONS);
            return res.status(401).json({ error: 'User not found.' });
        }
        const user = userResult.rows[0];
        // Verify tenant still matches (security check)
        if (user.tenant_id !== tokenData.tenantId) {
            (0, token_service_js_1.revokeAllUserTokens)(tokenData.userId);
            res.clearCookie(token_service_js_1.REFRESH_TOKEN_COOKIE_NAME, token_service_js_1.CLEAR_COOKIE_OPTIONS);
            return res.status(401).json({ error: 'Session invalidated.' });
        }
        const tenantResult = await database_js_1.default.query('SELECT name FROM tenants WHERE id = $1', [
            user.tenant_id,
        ]);
        const tenantName = tenantResult.rows.length > 0 ? tenantResult.rows[0].name : 'Unknown Tenant';
        const payload = {
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
        (0, token_service_js_1.revokeRefreshToken)(refreshToken);
        const newRefreshToken = (0, token_service_js_1.generateRefreshToken)(user.id, user.tenant_id, tokenData.family);
        // Generate new access token
        const accessToken = (0, token_service_js_1.generateAccessToken)(payload);
        // Set new refresh token cookie
        res.cookie(token_service_js_1.REFRESH_TOKEN_COOKIE_NAME, newRefreshToken, token_service_js_1.REFRESH_TOKEN_COOKIE_OPTIONS);
        res.status(200).json({
            accessToken,
            user: payload,
        });
    }
    catch (error) {
        console.error('Token refresh error:', error);
        res.status(500).json({ error: 'An internal server error occurred.' });
    }
}
/**
 * Logout - revoke refresh token and clear cookie
 */
async function logout(req, res) {
    const refreshToken = req.cookies?.[token_service_js_1.REFRESH_TOKEN_COOKIE_NAME];
    if (refreshToken) {
        (0, token_service_js_1.revokeRefreshToken)(refreshToken);
    }
    res.clearCookie(token_service_js_1.REFRESH_TOKEN_COOKIE_NAME, token_service_js_1.CLEAR_COOKIE_OPTIONS);
    res.status(200).json({ message: 'Logged out successfully.' });
}
/**
 * Logout from all devices - revoke all refresh tokens for user
 */
async function logoutAll(req, res) {
    const userId = req.user?.id;
    if (!userId) {
        return res.status(401).json({ error: 'Unauthorized.' });
    }
    (0, token_service_js_1.revokeAllUserTokens)(userId);
    res.clearCookie(token_service_js_1.REFRESH_TOKEN_COOKIE_NAME, token_service_js_1.CLEAR_COOKIE_OPTIONS);
    res.status(200).json({ message: 'Logged out from all devices successfully.' });
}
