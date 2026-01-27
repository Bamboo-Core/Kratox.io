import type { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import pool from '../config/database.js';

export async function registerUser(req: Request, res: Response) {
  const { name, email, phone_number, password, password_confirmation } = req.body;

  if (!name || !email || !phone_number || !password || !password_confirmation) {
    return res.status(400).json({
      error: 'All fields are required: name, email, phone_number, password, password_confirmation.',
    });
  }

  if (password !== password_confirmation) {
    return res.status(400).json({
      error: 'Password and password confirmation do not match.',
    });
  }

  if (password.length < 8) {
    return res.status(400).json({
      error: 'Password must be at least 8 characters long.',
    });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({
      error: 'Invalid email format.',
    });
  }

  const phoneRegex = /^\+?[\d\s()-]{10,20}$/;
  if (!phoneRegex.test(phone_number)) {
    return res.status(400).json({
      error: 'Invalid phone number format.',
    });
  }

  try {
    const existingUser = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existingUser.rows.length > 0) {
      return res.status(409).json({
        error: 'A user with this email already exists.',
      });
    }

    const tenantRes = await pool.query("SELECT id FROM tenants WHERE name = 'NOC AI Corp' LIMIT 1");
    if (tenantRes.rowCount === 0) {
      console.error('Critical: Default tenant for self-registration not found.');
      return res.status(500).json({
        error: 'Registration is temporarily unavailable. Please try again later.',
      });
    }
    const tenantId = tenantRes.rows[0].id;

    const hashedPassword = await bcrypt.hash(password, 10);

    const insertQuery = `
      INSERT INTO users (name, email, password_hash, role, tenant_id, phone_number, zabbix_hostgroup_ids)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id, name, email, role, created_at, tenant_id, phone_number
    `;

    const result = await pool.query(insertQuery, [
      name,
      email,
      hashedPassword,
      'cliente',
      tenantId,
      phone_number,
      [],
    ]);

    const newUser = result.rows[0];

    console.log(`New user self-registered: ${newUser.email}`);

    res.status(201).json({
      message: 'User registered successfully.',
      user: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        phone_number: newUser.phone_number,
        created_at: newUser.created_at,
      },
    });
  } catch (error) {
    console.error('Error in registerUser:', error);
    res.status(500).json({
      error: 'An internal server error occurred during registration.',
    });
  }
}
