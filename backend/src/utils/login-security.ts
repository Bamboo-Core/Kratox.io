/**
 * Login security module - Rate limiting and brute force protection
 */

interface LoginAttempt {
  attempts: number;
  firstAttempt: number;
  lockedUntil: number | null;
  consecutiveFailures: number;
}

interface SecurityConfig {
  maxAttempts: number;           // Max attempts before lockout
  windowMs: number;              // Time window for counting attempts (ms)
  lockoutDurationMs: number;     // Initial lockout duration (ms)
  maxLockoutDurationMs: number;  // Maximum lockout duration (ms)
  lockoutMultiplier: number;     // Multiplier for progressive lockout
}

const DEFAULT_CONFIG: SecurityConfig = {
  maxAttempts: 5,                    // 5 attempts
  windowMs: 15 * 60 * 1000,          // 15 minutes window
  lockoutDurationMs: 5 * 60 * 1000,  // 5 minutes initial lockout
  maxLockoutDurationMs: 60 * 60 * 1000, // 1 hour max lockout
  lockoutMultiplier: 2,              // Double lockout time each time
};

// In-memory store for login attempts (consider Redis for production with multiple instances)
const loginAttemptsStore = new Map<string, LoginAttempt>();

// Store for IP-based rate limiting
const ipAttemptsStore = new Map<string, LoginAttempt>();

/**
 * Cleans up expired entries from the store
 */
function cleanupExpiredEntries(): void {
  const now = Date.now();

  for (const [key, data] of loginAttemptsStore.entries()) {
    if (data.lockedUntil && now > data.lockedUntil && now > data.firstAttempt + DEFAULT_CONFIG.windowMs) {
      loginAttemptsStore.delete(key);
    }
  }

  for (const [key, data] of ipAttemptsStore.entries()) {
    if (data.lockedUntil && now > data.lockedUntil && now > data.firstAttempt + DEFAULT_CONFIG.windowMs) {
      ipAttemptsStore.delete(key);
    }
  }
}

// Run cleanup every 5 minutes
setInterval(cleanupExpiredEntries, 5 * 60 * 1000);

/**
 * Gets or creates login attempt data for a key
 */
function getAttemptData(store: Map<string, LoginAttempt>, key: string): LoginAttempt {
  const now = Date.now();
  let data = store.get(key);

  if (!data) {
    data = {
      attempts: 0,
      firstAttempt: now,
      lockedUntil: null,
      consecutiveFailures: 0,
    };
    store.set(key, data);
  }

  // Reset window if expired (but keep consecutive failures for progressive lockout)
  if (now > data.firstAttempt + DEFAULT_CONFIG.windowMs && !data.lockedUntil) {
    data.attempts = 0;
    data.firstAttempt = now;
  }

  return data;
}

/**
 * Calculates lockout duration based on consecutive failures (progressive lockout)
 */
function calculateLockoutDuration(consecutiveFailures: number): number {
  const duration = DEFAULT_CONFIG.lockoutDurationMs * Math.pow(DEFAULT_CONFIG.lockoutMultiplier, consecutiveFailures - 1);
  return Math.min(duration, DEFAULT_CONFIG.maxLockoutDurationMs);
}

/**
 * Checks if a login attempt should be blocked
 * Returns null if allowed, or an error object if blocked
 */
export function checkLoginAllowed(email: string, ip: string): { blocked: true; message: string; retryAfter: number } | null {
  const now = Date.now();
  const normalizedEmail = email.toLowerCase().trim();

  // Check email-based lockout
  const emailData = getAttemptData(loginAttemptsStore, normalizedEmail);
  if (emailData.lockedUntil && now < emailData.lockedUntil) {
    const retryAfter = Math.ceil((emailData.lockedUntil - now) / 1000);
    return {
      blocked: true,
      message: `Account temporarily locked due to too many failed attempts. Try again in ${formatTimeRemaining(retryAfter)}.`,
      retryAfter,
    };
  }

  // Check IP-based lockout (more lenient)
  const ipData = getAttemptData(ipAttemptsStore, ip);
  if (ipData.lockedUntil && now < ipData.lockedUntil) {
    const retryAfter = Math.ceil((ipData.lockedUntil - now) / 1000);
    return {
      blocked: true,
      message: `Too many login attempts from this IP. Try again in ${formatTimeRemaining(retryAfter)}.`,
      retryAfter,
    };
  }

  return null;
}

/**
 * Records a failed login attempt
 */
export function recordFailedAttempt(email: string, ip: string): { locked: boolean; attemptsRemaining: number } {
  const now = Date.now();
  const normalizedEmail = email.toLowerCase().trim();

  // Record email-based attempt
  const emailData = getAttemptData(loginAttemptsStore, normalizedEmail);
  emailData.attempts++;
  emailData.consecutiveFailures++;

  let locked = false;
  let attemptsRemaining = DEFAULT_CONFIG.maxAttempts - emailData.attempts;

  if (emailData.attempts >= DEFAULT_CONFIG.maxAttempts) {
    const lockoutDuration = calculateLockoutDuration(emailData.consecutiveFailures);
    emailData.lockedUntil = now + lockoutDuration;
    locked = true;
    attemptsRemaining = 0;
  }

  // Record IP-based attempt (higher threshold)
  const ipData = getAttemptData(ipAttemptsStore, ip);
  ipData.attempts++;

  // IP gets locked after 10 failed attempts (from any email)
  if (ipData.attempts >= 10) {
    ipData.lockedUntil = now + DEFAULT_CONFIG.lockoutDurationMs;
    ipData.consecutiveFailures++;
  }

  return { locked, attemptsRemaining: Math.max(0, attemptsRemaining) };
}

/**
 * Records a successful login (resets failure counters)
 */
export function recordSuccessfulLogin(email: string, ip: string): void {
  const normalizedEmail = email.toLowerCase().trim();

  // Reset email-based tracking
  loginAttemptsStore.delete(normalizedEmail);

  // Reset IP-based tracking
  const ipData = ipAttemptsStore.get(ip);
  if (ipData) {
    ipData.attempts = 0;
    ipData.consecutiveFailures = 0;
    ipData.lockedUntil = null;
  }
}

/**
 * Formats seconds into human-readable time
 */
function formatTimeRemaining(seconds: number): string {
  if (seconds < 60) {
    return `${seconds} seconds`;
  } else if (seconds < 3600) {
    const minutes = Math.ceil(seconds / 60);
    return `${minutes} minute${minutes > 1 ? 's' : ''}`;
  } else {
    const hours = Math.ceil(seconds / 3600);
    return `${hours} hour${hours > 1 ? 's' : ''}`;
  }
}

/**
 * Validates email format
 */
export function isValidEmailFormat(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Sanitizes email input (prevents NoSQL injection, etc.)
 */
export function sanitizeEmail(email: string): string {
  return email.toLowerCase().trim().slice(0, 254); // Max email length per RFC
}

/**
 * Gets client IP from request (handles proxies)
 */
export function getClientIp(req: { headers: Record<string, string | string[] | undefined>; ip?: string; socket?: { remoteAddress?: string } }): string {
  // Check for forwarded IP (behind proxy/load balancer)
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    const ips = Array.isArray(forwarded) ? forwarded[0] : forwarded.split(',')[0];
    return ips.trim();
  }

  // Check for real IP header (nginx)
  const realIp = req.headers['x-real-ip'];
  if (realIp) {
    return Array.isArray(realIp) ? realIp[0] : realIp;
  }

  // Fall back to direct connection IP
  return req.ip || req.socket?.remoteAddress || 'unknown';
}

/**
 * Security event types for logging
 */
export type SecurityEventType =
  | 'LOGIN_SUCCESS'
  | 'LOGIN_FAILED'
  | 'LOGIN_BLOCKED'
  | 'ACCOUNT_LOCKED'
  | 'SUSPICIOUS_ACTIVITY';

/**
 * Logs security events for audit trail
 */
export function logSecurityEvent(
  eventType: SecurityEventType,
  details: {
    email?: string;
    ip: string;
    userAgent?: string;
    reason?: string;
    attemptsRemaining?: number;
  }
): void {
  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp,
    eventType,
    ...details,
    email: details.email ? maskEmail(details.email) : undefined,
  };

  // Log to console (in production, send to logging service)
  if (eventType === 'LOGIN_SUCCESS') {
    console.log(`[SECURITY] ${timestamp} - ${eventType}:`, JSON.stringify(logEntry));
  } else {
    console.warn(`[SECURITY] ${timestamp} - ${eventType}:`, JSON.stringify(logEntry));
  }
}

/**
 * Masks email for logging (privacy)
 */
function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (!domain) return '***@***';

  const maskedLocal = local.length > 2
    ? local[0] + '*'.repeat(Math.min(local.length - 2, 5)) + local[local.length - 1]
    : '*'.repeat(local.length);

  return `${maskedLocal}@${domain}`;
}

/**
 * Checks for suspicious patterns in login attempt
 */
export function detectSuspiciousActivity(
  email: string,
  ip: string,
  userAgent?: string
): { suspicious: boolean; reasons: string[] } {
  const reasons: string[] = [];

  // Check for potential SQL injection attempts
  const sqlPatterns = /('|"|;|--|\/\*|\*\/|union|select|insert|delete|update|drop|exec|execute)/i;
  if (sqlPatterns.test(email)) {
    reasons.push('Potential SQL injection in email');
  }

  // Check for script injection
  const scriptPatterns = /<script|javascript:|on\w+=/i;
  if (scriptPatterns.test(email) || (userAgent && scriptPatterns.test(userAgent))) {
    reasons.push('Potential script injection');
  }

  // Check for abnormally long input
  if (email.length > 254) {
    reasons.push('Abnormally long email input');
  }

  // Check for null bytes or control characters
  if (/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/.test(email)) {
    reasons.push('Control characters in input');
  }

  return {
    suspicious: reasons.length > 0,
    reasons,
  };
}
