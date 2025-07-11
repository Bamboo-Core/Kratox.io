
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

    // --- TENANT 1: NOC AI Corp ---
    const tenant1Name = 'NOC AI Corp';
    const tenant1Res = await pool.query(
      'INSERT INTO tenants (name) VALUES ($1) ON CONFLICT (name) DO NOTHING RETURNING id;',
      [tenant1Name]
    );
    let tenant1Id = tenant1Res.rows[0]?.id;
    if (!tenant1Id) {
      const existingTenant = await pool.query('SELECT id FROM tenants WHERE name = $1;', [tenant1Name]);
      tenant1Id = existingTenant.rows[0].id;
      console.log(`- Tenant "${tenant1Name}" already exists. Using existing ID.`);
    } else {
      console.log(`- Tenant "${tenant1Name}" created.`);
    }

    const adminPassword = 'password123';
    const adminHashedPassword = await bcrypt.hash(adminPassword, 10);
    const adminEmail = 'admin@noc.ai';
    
    await pool.query(
        `INSERT INTO users (tenant_id, name, email, password_hash)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (email) 
         DO UPDATE SET name = EXCLUDED.name, password_hash = EXCLUDED.password_hash;`,
        [tenant1Id, 'Admin User', adminEmail, adminHashedPassword]
    );
    console.log(`- User "${adminEmail}" created or updated. Password is "${adminPassword}"`);

    const testPassword = 'testpassword';
    const testHashedPassword = await bcrypt.hash(testPassword, 10);
    const testEmail = 'test@noc.ai';

    await pool.query(
        `INSERT INTO users (tenant_id, name, email, password_hash)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (email)
         DO UPDATE SET name = EXCLUDED.name, password_hash = EXCLUDED.password_hash;`,
        [tenant1Id, 'Test User', testEmail, testHashedPassword]
    );
    console.log(`- User "${testEmail}" created or updated. Password is "${testPassword}"`);

    // --- TENANT 2: ACME Inc. ---
    const tenant2Name = 'ACME Inc.';
    const tenant2Res = await pool.query(
      'INSERT INTO tenants (name) VALUES ($1) ON CONFLICT (name) DO NOTHING RETURNING id;',
      [tenant2Name]
    );
    let tenant2Id = tenant2Res.rows[0]?.id;
    if (!tenant2Id) {
      const existingTenant = await pool.query('SELECT id FROM tenants WHERE name = $1;', [tenant2Name]);
      tenant2Id = existingTenant.rows[0].id;
      console.log(`- Tenant "${tenant2Name}" already exists. Using existing ID.`);
    } else {
      console.log(`- Tenant "${tenant2Name}" created.`);
    }

    const acmePassword = 'acmepassword';
    const acmeHashedPassword = await bcrypt.hash(acmePassword, 10);
    const acmeEmail = 'user@acme.inc';

    await pool.query(
        `INSERT INTO users (tenant_id, name, email, password_hash)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (email)
         DO UPDATE SET name = EXCLUDED.name, password_hash = EXCLUDED.password_hash;`,
        [tenant2Id, 'ACME User', acmeEmail, acmeHashedPassword]
    );
    console.log(`- User "${acmeEmail}" created or updated. Password is "${acmePassword}"`);
    
    // --- Seed Blocked Domains for each tenant ---
    console.log('Seeding tenant-specific data...');
    
    // Clear existing domains to avoid conflicts on re-run
    await pool.query('DELETE FROM blocked_domains;');
    console.log('- Cleared existing blocked domains for a clean seed.');

    // Domains for NOC AI Corp (Tenant 1)
    await pool.query(
      'INSERT INTO blocked_domains (domain, tenant_id) VALUES ($1, $2) ON CONFLICT (domain, tenant_id) DO NOTHING;',
      ['nocai-blocked.com', tenant1Id]
    );
    await pool.query(
      'INSERT INTO blocked_domains (domain, tenant_id) VALUES ($1, $2) ON CONFLICT (domain, tenant_id) DO NOTHING;',
      ['malware-site-1.org', tenant1Id]
    );
    console.log(`- Seeded blocked domains for "${tenant1Name}".`);

    // Domains for ACME Inc. (Tenant 2)
    await pool.query(
      'INSERT INTO blocked_domains (domain, tenant_id) VALUES ($1, $2) ON CONFLICT (domain, tenant_id) DO NOTHING;',
      ['acme-blocked.io', tenant2Id]
    );
    await pool.query(
      'INSERT INTO blocked_domains (domain, tenant_id) VALUES ($1, $2) ON CONFLICT (domain, tenant_id) DO NOTHING;',
      ['another-bad-site.net', tenant2Id]
    );
    console.log(`- Seeded blocked domains for "${tenant2Name}".`);


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
