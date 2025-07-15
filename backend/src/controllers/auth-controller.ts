import type { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import pool from '../config/database.js';

export async function login(req: Request, res: Response) {
  console.log('Login attempt received for email:', req.body.email);

  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  try {
    // Find the user by email
    const userResult = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (userResult.rows.length === 0) {
      console.warn(`Login failed: User not found for email ${email}`);
      return res.status(401).json({ error: 'Invalid credentials.' });
    }

    const user = userResult.rows[0];

    // Compare the provided password with the stored hash
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      console.warn(`Login failed: Password mismatch for email ${email}`);
      return res.status(401).json({ error: 'Invalid credentials.' });
    }

    // Find tenant information
    const tenantResult = await pool.query('SELECT name FROM tenants WHERE id = $1', [user.tenant_id]);
    const tenantName = tenantResult.rows.length > 0 ? tenantResult.rows[0].name : 'Unknown Tenant';

    // Create JWT payload
    const payload = {
      userId: user.id,
      tenantId: user.tenant_id,
      email: user.email,
      name: user.name,
      role: user.role, // Add user role to the payload
      tenantName: tenantName,
    };

    // Sign the token
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      console.error('FATAL ERROR: The JWT_SECRET environment variable is not defined.');
      return res.status(500).json({ error: 'Internal server error: JWT secret is missing.' });
    }

    const token = jwt.sign(payload, jwtSecret, { expiresIn: '1d' });

    console.log(`Login successful for user: ${user.email} with role: ${user.role}`);
    // Send the token and user info back to the client
    res.status(200).json({
      token,
      user: payload,
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'An internal server error occurred during login.' });
  }
}
