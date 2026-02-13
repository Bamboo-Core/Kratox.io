"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.encrypt = encrypt;
exports.decrypt = decrypt;
const crypto_1 = __importDefault(require("crypto"));
require("dotenv/config");
const algorithm = 'aes-256-cbc';
// The secret key must be 32 bytes (256 bits) for aes-256-cbc
const getSecretKey = () => {
    const secretKey = process.env.ENCRYPTION_KEY;
    if (!secretKey || secretKey.length !== 32) {
        throw new Error('ENCRYPTION_KEY environment variable is not set or is not 32 characters long.');
    }
    return Buffer.from(secretKey);
};
// The IV must be 16 bytes (128 bits)
const getIv = () => {
    const secretKey = process.env.ENCRYPTION_KEY;
    if (!secretKey || secretKey.length < 16) {
        throw new Error('ENCRYPTION_KEY is too short to derive an IV.');
    }
    // Create an IV from the first 16 bytes of the secret key
    return Buffer.from(secretKey.slice(0, 16));
};
/**
 * Encrypts a piece of text.
 * @param text The text to encrypt.
 * @returns The encrypted text as a hex string.
 */
function encrypt(text) {
    const secretKey = getSecretKey();
    const iv = getIv();
    const cipher = crypto_1.default.createCipheriv(algorithm, secretKey, iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return encrypted;
}
/**
 * Decrypts a piece of text.
 * @param encryptedText The encrypted text (hex string).
 * @returns The original, decrypted text.
 */
function decrypt(encryptedText) {
    const secretKey = getSecretKey();
    const iv = getIv();
    const decipher = crypto_1.default.createDecipheriv(algorithm, secretKey, iv);
    let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
}
