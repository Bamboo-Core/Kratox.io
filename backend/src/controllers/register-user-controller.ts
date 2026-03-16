import type { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import pool from '../config/database.js';
import { getPasswordValidationError } from '../utils/password-validator.js';
import { verifyRecaptcha } from '../utils/recaptcha.js';
import { sendVerificationEmail } from '../services/email-service.js';

interface PendingRegistration {
  name: string;
  email: string;
  phone_number: string;
  hashedPassword: string;
  verificationCode: string;
  expiresAt: number;
}

const pendingRegistrations = new Map<string, PendingRegistration>();

setInterval(() => {
  const now = Date.now();
  for (const [email, data] of pendingRegistrations.entries()) {
    if (data.expiresAt < now) pendingRegistrations.delete(email);
  }
}, 5 * 60 * 1000);

const PENDING_TTL_MS = 15 * 60 * 1000;

export async function registerUser(req: Request, res: Response) {
  const { name, email, phone_number, password, password_confirmation, recaptchaToken } = req.body;

  if (!name || !email || !phone_number || !password || !password_confirmation) {
    return res.status(400).json({
      error: 'All fields are required: name, email, phone_number, password, password_confirmation.',
    });
  }

  // Verify reCAPTCHA
  const clientIp = req.ip || req.socket?.remoteAddress || 'unknown';
  const recaptchaResult = await verifyRecaptcha(recaptchaToken, clientIp);
  if (!recaptchaResult.valid) {
    return res.status(400).json({ error: recaptchaResult.error || 'reCAPTCHA verification failed.' });
  }

  if (password !== password_confirmation) {
    return res.status(400).json({
      error: 'Password and password confirmation do not match.',
    });
  }

  const passwordError = getPasswordValidationError(password);
  if (passwordError) {
    return res.status(400).json({ error: passwordError });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ error: 'Invalid email format.' });
  }

  const phoneRegex = /^\+?[\d\s()-]{10,20}$/;
  if (!phoneRegex.test(phone_number)) {
    return res.status(400).json({ error: 'Invalid phone number format.' });
  }

  try {
    const existingUser = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existingUser.rows.length > 0) {
      return res.status(409).json({ error: 'A user with this email already exists.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();

    pendingRegistrations.set(email, {
      name,
      email,
      phone_number,
      hashedPassword,
      verificationCode,
      expiresAt: Date.now() + PENDING_TTL_MS,
    });

    await sendVerificationEmail(email, verificationCode);

    console.log(`Verification email sent to pending user: ${email}`);

    return res.status(200).json({
      message: 'Verification code sent. Please check your email.',
    });
  } catch (error) {
    console.error('Error in registerUser:', error);
    return res.status(500).json({
      error: 'An internal server error occurred during registration.',
    });
  }
}

export async function verifyEmail(req: Request, res: Response) {
  const { email, code } = req.body;

  if (!email || !code) {
    return res.status(400).json({ error: 'Email and code are required.' });
  }

  try {
    const pending = pendingRegistrations.get(email);

    if (!pending) {
      return res.status(404).json({ error: 'No pending registration found for this email. Please register again.' });
    }

    if (pending.expiresAt < Date.now()) {
      pendingRegistrations.delete(email);
      return res.status(410).json({ error: 'Verification code expired. Please register again.' });
    }

    if (pending.verificationCode !== code) {
      return res.status(400).json({ error: 'Invalid verification code.' });
    }

    const tenantRes = await pool.query("SELECT id FROM tenants WHERE name = 'NOC AI Corp' LIMIT 1");
    if (tenantRes.rowCount === 0) {
      console.error('Critical: Default tenant for self-registration not found.');
      return res.status(500).json({ error: 'Registration is temporarily unavailable. Please try again later.' });
    }
    const tenantId = tenantRes.rows[0].id;

    const insertQuery = `
      INSERT INTO users (name, email, password_hash, role, tenant_id, phone_number, zabbix_hostgroup_ids, email_verified)
      VALUES ($1, $2, $3, $4, $5, $6, $7, TRUE)
      RETURNING id, name, email, role, created_at, tenant_id, phone_number
    `;

    await pool.query(insertQuery, [
      pending.name,
      pending.email,
      pending.hashedPassword,
      'cliente',
      tenantId,
      pending.phone_number,
      [],
    ]);

    pendingRegistrations.delete(email);

    console.log(`User account created after email verification: ${email}`);

    return res.status(201).json({ message: 'Email verified and account created successfully.' });
  } catch (error) {
    console.error('Error verifying email:', error);
    return res.status(500).json({ error: 'An internal server error occurred.' });
  }
}

export async function resendVerificationCode(req: Request, res: Response) {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ error: 'Email is required.' });
  }

  try {
    const pending = pendingRegistrations.get(email);

    if (!pending) {
      return res.status(404).json({ error: 'No pending registration found for this email. Please register again.' });
    }

    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();

    pending.verificationCode = verificationCode;
    pending.expiresAt = Date.now() + PENDING_TTL_MS;
    pendingRegistrations.set(email, pending);

    await sendVerificationEmail(email, verificationCode);

    return res.status(200).json({ message: 'Verification code resent successfully.' });
  } catch (error) {
    console.error('Error resending verification code:', error);
    return res.status(500).json({ error: 'An internal server error occurred.' });
  }
}
