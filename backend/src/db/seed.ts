import 'dotenv/config';
import bcrypt from 'bcryptjs';
import pool from '../config/database.js';

async function seedDatabase() {
  console.log('Starting database seeding...');

  try {
    // --- CREATE EXTENSIONS ---
    await pool.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp";');
    console.log('uuid-ossp extension ensured.');

    // --- CREATE TABLES ---
    console.log('Creating tables...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS tenants (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          name TEXT NOT NULL UNIQUE,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);
    console.log('- Table "tenants" created or already exists.');

    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
          name VARCHAR(255) NOT NULL,
          email VARCHAR(255) NOT NULL UNIQUE,
          password_hash VARCHAR(255) NOT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);
    console.log('- Table "users" created or already exists.');

    await pool.query(`
      CREATE TABLE IF NOT EXISTS blocked_domains (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          domain TEXT NOT NULL,
          "blockedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
          UNIQUE (domain, tenant_id)
      );
    `);
    console.log('- Table "blocked_domains" created or already exists.');

    // --- SEED DATA ---
    console.log('Seeding initial data...');

    // 1. Seed Tenant
    const tenantName = 'NetGuard Corp';
    const tenantRes = await pool.query(
      'INSERT INTO tenants (name) VALUES ($1) ON CONFLICT (name) DO NOTHING RETURNING id;',
      [tenantName]
    );
    let tenantId = tenantRes.rows[0]?.id;

    // If the tenant already existed, we need to fetch its ID
    if (!tenantId) {
      const existingTenant = await pool.query('SELECT id FROM tenants WHERE name = $1;', [tenantName]);
      tenantId = existingTenant.rows[0].id;
      console.log(`- Tenant "${tenantName}" already exists. Using existing ID.`);
    } else {
      console.log(`- Tenant "${tenantName}" created.`);
    }

    // 2. Seed Admin User
    const adminPassword = 'password123';
    const adminHashedPassword = await bcrypt.hash(adminPassword, 10);
    const adminEmail = 'admin@netguard.ai';
    
    await pool.query(
        `INSERT INTO users (tenant_id, name, email, password_hash)
         VALUES ($1, 'Admin User', $2, $3)
         ON CONFLICT (email) DO NOTHING;`,
        [tenantId, adminEmail, adminHashedPassword]
    );
    console.log(`- User "${adminEmail}" created or already exists. Password is "${adminPassword}"`);


    // 3. Seed Test User
    const testPassword = 'testpassword';
    const testHashedPassword = await bcrypt.hash(testPassword, 10);
    const testEmail = 'test@netguard.ai';

    await pool.query(
        `INSERT INTO users (tenant_id, name, email, password_hash)
         VALUES ($1, 'Test User', $2, $3)
         ON CONFLICT (email) DO NOTHING;`,
        [tenantId, testEmail, testHashedPassword]
    );
    console.log(`- User "${testEmail}" created or already exists. Password is "${testPassword}"`);


    console.log('Database seeding completed successfully!');

  } catch (err) {
    console.error('Error during database seeding:', err);
    process.exit(1);
  } finally {
    // End the pool connection
    await pool.end();
    console.log('Database connection pool closed.');
  }
}

seedDatabase();
