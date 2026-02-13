"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CLEAR_COOKIE_OPTIONS = exports.REFRESH_TOKEN_COOKIE_OPTIONS = exports.REFRESH_TOKEN_COOKIE_NAME = exports.REFRESH_TOKEN_EXPIRY = exports.ACCESS_TOKEN_EXPIRY = void 0;
exports.generateAccessToken = generateAccessToken;
exports.generateRefreshToken = generateRefreshToken;
exports.rotateRefreshToken = rotateRefreshToken;
exports.getRefreshTokenData = getRefreshTokenData;
exports.revokeRefreshToken = revokeRefreshToken;
exports.revokeAllUserTokens = revokeAllUserTokens;
exports.cleanupExpiredTokens = cleanupExpiredTokens;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const crypto_1 = __importDefault(require("crypto"));
// Token expiration times
exports.ACCESS_TOKEN_EXPIRY = '15m'; // Short-lived access token
exports.REFRESH_TOKEN_EXPIRY = '7d'; // Long-lived refresh token
// Cookie configuration
exports.REFRESH_TOKEN_COOKIE_NAME = 'refreshToken';
// Use SECURE_COOKIES env var to enable cross-origin cookies (set to 'true' in production)
const secureCookies = process.env.SECURE_COOKIES === 'true';
exports.REFRESH_TOKEN_COOKIE_OPTIONS = {
    httpOnly: true,
    secure: secureCookies,
    // 'none' is required for cross-origin cookies (frontend and backend on different domains)
    // 'lax' is safer for local development on the same origin
    sameSite: secureCookies ? 'none' : 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in milliseconds
    path: '/',
};
// Clear cookie options must match the original cookie options for cross-origin to work
exports.CLEAR_COOKIE_OPTIONS = {
    path: '/',
    secure: secureCookies,
    sameSite: secureCookies ? 'none' : 'lax',
};
// In-memory store for refresh tokens (in production, use Redis or database)
// Structure: Map<refreshToken, { userId, tenantId, createdAt, family }>
const refreshTokenStore = new Map();
// Store for revoked token families (for detecting refresh token reuse attacks)
const revokedFamilies = new Set();
/**
 * Generate a new access token (JWT)
 */
function generateAccessToken(payload) {
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
        throw new Error('JWT_SECRET is not defined');
    }
    return jsonwebtoken_1.default.sign(payload, jwtSecret, { expiresIn: exports.ACCESS_TOKEN_EXPIRY });
}
/**
 * Generate a new refresh token (opaque token stored server-side)
 */
function generateRefreshToken(userId, tenantId, existingFamily) {
    const token = crypto_1.default.randomBytes(64).toString('hex');
    const family = existingFamily || crypto_1.default.randomBytes(32).toString('hex');
    refreshTokenStore.set(token, {
        userId,
        tenantId,
        createdAt: new Date(),
        family,
        revoked: false,
    });
    // Clean up old tokens for this user (keep only the latest per family)
    cleanupOldTokens(userId);
    return token;
}
/**
 * Validate and rotate refresh token
 * Returns new tokens if valid, null if invalid
 */
function rotateRefreshToken(oldToken) {
    const tokenData = refreshTokenStore.get(oldToken);
    if (!tokenData) {
        // Token doesn't exist - might be reuse of old token
        return null;
    }
    // Check if token family was revoked (possible token theft)
    if (revokedFamilies.has(tokenData.family)) {
        // Revoke all tokens in this family
        revokeTokenFamily(tokenData.family);
        return null;
    }
    // Check if token was already revoked
    if (tokenData.revoked) {
        // Token reuse detected! Revoke entire family
        revokedFamilies.add(tokenData.family);
        revokeTokenFamily(tokenData.family);
        console.warn(`[SECURITY] Refresh token reuse detected for user ${tokenData.userId}. Revoking all sessions.`);
        return null;
    }
    // Mark old token as revoked (but keep it for reuse detection)
    tokenData.revoked = true;
    // Generate new refresh token in the same family
    const newRefreshToken = generateRefreshToken(tokenData.userId, tokenData.tenantId, tokenData.family);
    // We need to fetch user data to generate access token
    // This will be done in the controller where we have DB access
    return {
        accessToken: '', // Will be filled by controller
        refreshToken: newRefreshToken,
        userData: null, // Will be filled by controller
    };
}
/**
 * Get refresh token data without rotating
 */
function getRefreshTokenData(token) {
    const tokenData = refreshTokenStore.get(token);
    if (!tokenData || tokenData.revoked || revokedFamilies.has(tokenData.family)) {
        return null;
    }
    return {
        userId: tokenData.userId,
        tenantId: tokenData.tenantId,
        family: tokenData.family,
    };
}
/**
 * Revoke a specific refresh token
 */
function revokeRefreshToken(token) {
    const tokenData = refreshTokenStore.get(token);
    if (tokenData) {
        tokenData.revoked = true;
        return true;
    }
    return false;
}
/**
 * Revoke all refresh tokens for a user
 */
function revokeAllUserTokens(userId) {
    for (const [token, data] of refreshTokenStore.entries()) {
        if (data.userId === userId) {
            data.revoked = true;
            revokedFamilies.add(data.family);
        }
    }
}
/**
 * Revoke all tokens in a family
 */
function revokeTokenFamily(family) {
    for (const [, data] of refreshTokenStore.entries()) {
        if (data.family === family) {
            data.revoked = true;
        }
    }
}
/**
 * Clean up old tokens (keep last 5 per user to detect reuse)
 */
function cleanupOldTokens(userId) {
    const userTokens = [];
    for (const [token, data] of refreshTokenStore.entries()) {
        if (data.userId === userId) {
            userTokens.push({ token, createdAt: data.createdAt });
        }
    }
    // Sort by creation date, newest first
    userTokens.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    // Keep only the 10 most recent tokens, delete the rest
    const tokensToDelete = userTokens.slice(10);
    for (const { token } of tokensToDelete) {
        refreshTokenStore.delete(token);
    }
}
/**
 * Periodic cleanup of expired tokens (call this periodically)
 */
function cleanupExpiredTokens() {
    const now = new Date();
    const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 days
    for (const [token, data] of refreshTokenStore.entries()) {
        if (now.getTime() - data.createdAt.getTime() > maxAge) {
            refreshTokenStore.delete(token);
        }
    }
    // Clean up old revoked families (after 30 days)
    // In production, you'd want to persist this with timestamps
}
// Run cleanup every hour
setInterval(cleanupExpiredTokens, 60 * 60 * 1000);
