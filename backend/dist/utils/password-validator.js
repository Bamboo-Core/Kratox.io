"use strict";
/**
 * Password validation utility with security rules
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.validatePassword = validatePassword;
exports.getPasswordValidationError = getPasswordValidationError;
exports.getAllPasswordValidationErrors = getAllPasswordValidationErrors;
// Common weak passwords that should be blocked
const COMMON_WEAK_PASSWORDS = new Set([
    'password', 'password1', 'password123', '12345678', '123456789', '1234567890',
    'qwerty123', 'qwertyui', 'abcdefgh', 'abc12345', 'admin123', 'letmein1',
    'welcome1', 'monkey12', 'dragon12', 'master12', 'trustno1', 'baseball1',
    'iloveyou', 'sunshine1', 'princess1', 'football1', 'shadow12', 'superman1',
    'michael1', 'jennifer1', 'hunter12', 'charlie1', 'andrew12', 'joshua12',
    'matthew1', 'daniel12', 'jessica1', 'ashley12', 'passw0rd', 'p@ssword',
    'p@ssw0rd', 'senha123', 'mudar123', 'trocar123', 'alterar1', 'novasenha',
]);
// Sequential patterns to detect
const SEQUENTIAL_PATTERNS = [
    '012345678', '123456789', '234567890',
    'abcdefgh', 'bcdefghi', 'cdefghij', 'defghijk', 'efghijkl', 'fghijklm',
    'ghijklmn', 'hijklmno', 'ijklmnop', 'jklmnopq', 'klmnopqr', 'lmnopqrs',
    'mnopqrst', 'nopqrstu', 'opqrstuv', 'pqrstuvw', 'qrstuvwx', 'rstuvwxy', 'stuvwxyz',
    'qwertyui', 'wertyuio', 'ertyuiop', 'asdfghjk', 'sdfghjkl', 'zxcvbnm',
];
/**
 * Validates password strength with multiple security rules
 *
 * Rules:
 * 1. Minimum 8 characters
 * 2. Maximum 128 characters
 * 3. At least one uppercase letter
 * 4. At least one lowercase letter
 * 5. At least one number
 * 6. At least one special character
 * 7. No common weak passwords
 * 8. No sequential patterns (abc, 123, qwerty)
 * 9. No repeated characters (more than 3 in a row)
 * 10. Cannot contain spaces at start/end
 */
function validatePassword(password) {
    const errors = [];
    // Rule 1: Minimum length
    if (password.length < 8) {
        errors.push('Password must be at least 8 characters long.');
    }
    // Rule 2: Maximum length (prevents DoS with very long passwords)
    if (password.length > 128) {
        errors.push('Password must not exceed 128 characters.');
    }
    // Rule 3: Uppercase letter
    if (!/[A-Z]/.test(password)) {
        errors.push('Password must contain at least one uppercase letter.');
    }
    // Rule 4: Lowercase letter
    if (!/[a-z]/.test(password)) {
        errors.push('Password must contain at least one lowercase letter.');
    }
    // Rule 5: Number
    if (!/[0-9]/.test(password)) {
        errors.push('Password must contain at least one number.');
    }
    // Rule 6: Special character
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]/.test(password)) {
        errors.push('Password must contain at least one special character (!@#$%^&*()_+-=[]{};\':"|,.<>/?`~).');
    }
    // Rule 7: Check against common weak passwords
    const lowerPassword = password.toLowerCase();
    if (COMMON_WEAK_PASSWORDS.has(lowerPassword)) {
        errors.push('This password is too common. Please choose a more unique password.');
    }
    // Rule 8: Check for sequential patterns
    for (const pattern of SEQUENTIAL_PATTERNS) {
        if (lowerPassword.includes(pattern) || lowerPassword.includes(pattern.split('').reverse().join(''))) {
            errors.push('Password contains a sequential pattern. Avoid sequences like "abc", "123", or "qwerty".');
            break;
        }
    }
    // Rule 9: Check for repeated characters (more than 3 in a row)
    if (/(.)\1{3,}/.test(password)) {
        errors.push('Password must not contain more than 3 repeated characters in a row.');
    }
    // Rule 10: No leading/trailing spaces
    if (password !== password.trim()) {
        errors.push('Password must not start or end with spaces.');
    }
    return {
        isValid: errors.length === 0,
        errors,
    };
}
/**
 * Returns a formatted error message for password validation failures
 */
function getPasswordValidationError(password) {
    const result = validatePassword(password);
    if (result.isValid) {
        return null;
    }
    return result.errors[0]; // Return first error for simpler API responses
}
/**
 * Returns all password validation errors (useful for frontend display)
 */
function getAllPasswordValidationErrors(password) {
    return validatePassword(password).errors;
}
