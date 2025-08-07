
import crypto from 'crypto';
import 'dotenv/config';

const algorithm = 'aes-256-cbc';

// The secret key must be 32 bytes (256 bits) for aes-256-cbc
const getSecretKey = (): Buffer => {
    const secretKey = process.env.ENCRYPTION_KEY;
    if (!secretKey || secretKey.length !== 32) {
        throw new Error('ENCRYPTION_KEY environment variable is not set or is not 32 characters long.');
    }
    return Buffer.from(secretKey);
};

// The IV must be 16 bytes (128 bits)
const getIv = (): Buffer => {
    const secretKey = process.env.ENCRYPTION_KEY;
    if (!secretKey || secretKey.length < 16) {
        throw new Error('ENCRYPTION_KEY is too short to derive an IV.');
    }
    // Create an IV from the first 16 bytes of the secret key
    return Buffer.from(secretKey.slice(0, 16));
}

/**
 * Encrypts a piece of text.
 * @param text The text to encrypt.
 * @returns The encrypted text as a hex string.
 */
export function encrypt(text: string): string {
    const secretKey = getSecretKey();
    const iv = getIv();
    const cipher = crypto.createCipheriv(algorithm, secretKey, iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return encrypted;
}

/**
 * Decrypts a piece of text.
 * @param encryptedText The encrypted text (hex string).
 * @returns The original, decrypted text.
 */
export function decrypt(encryptedText: string): string {
    const secretKey = getSecretKey();
    const iv = getIv();
    const decipher = crypto.createDecipheriv(algorithm, secretKey, iv);
    let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
}
