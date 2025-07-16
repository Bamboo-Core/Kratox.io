import 'dotenv/config';
import bcrypt from 'bcryptjs';
import pool from '../config/database.js';

async function seedDatabase() {
  console.log('Starting database seeding...');
  const client = await pool.connect();

  try {
    await client.query('BEGIN'); // Start transaction

    // --- CREATE EXTENSIONS ---
    await client.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp";');
    console.log('uuid-ossp extension ensured.');

    // --- CREATE/ALTER TABLES ---
    console.log('Creating/Altering tables...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS tenants (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          name TEXT NOT NULL UNIQUE,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);
    console.log('- Table "tenants" created or already exists.');

    await client.query(`
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

    // --- SCHEMA MIGRATION: Add role column if it doesn't exist ---
    const roleColumnResult = await client.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'users' AND column_name = 'role';
    `);

    if (roleColumnResult.rowCount === 0) {
      console.log('- Column "role" not found in "users" table. Adding it...');
      await client.query(`
        ALTER TABLE users
        ADD COLUMN role VARCHAR(50) NOT NULL DEFAULT 'cliente';
      `);
      console.log('- Column "role" added successfully.');
    } else {
      console.log('- Column "role" already exists in "users" table.');
    }


    await client.query(`
      CREATE TABLE IF NOT EXISTS blocked_domains (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          domain TEXT NOT NULL,
          "blockedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE
      );
    `);
    console.log('- Table "blocked_domains" created or already exists.');

    // --- SCHEMA MIGRATION: Add unique constraint to blocked_domains if it doesn't exist ---
    const constraintResult = await client.query(`
        SELECT conname
        FROM pg_constraint
        WHERE conname = 'blocked_domains_domain_tenant_id_key';
    `);

    if (constraintResult.rowCount === 0) {
        console.log('- Unique constraint on (domain, tenant_id) not found in "blocked_domains". Adding it...');
        await client.query(`
            ALTER TABLE blocked_domains
            ADD CONSTRAINT blocked_domains_domain_tenant_id_key UNIQUE (domain, tenant_id);
        `);
        console.log('- Unique constraint added successfully.');
    } else {
        console.log('- Unique constraint on (domain, tenant_id) already exists.');
    }


    // --- SEED DATA ---
    console.log('Seeding initial data...');

    // --- TENANT 1: NOC AI Corp ---
    const tenant1Name = 'NOC AI Corp';
    const tenant1Res = await client.query(
      'INSERT INTO tenants (name) VALUES ($1) ON CONFLICT (name) DO NOTHING RETURNING id;',
      [tenant1Name]
    );
    let tenant1Id = tenant1Res.rows[0]?.id;
    if (!tenant1Id) {
      const existingTenant = await client.query('SELECT id FROM tenants WHERE name = $1;', [tenant1Name]);
      tenant1Id = existingTenant.rows[0].id;
      console.log(`- Tenant "${tenant1Name}" already exists. Using existing ID.`);
    } else {
      console.log(`- Tenant "${tenant1Name}" created.`);
    }

    const adminPassword = 'password123';
    const adminHashedPassword = await bcrypt.hash(adminPassword, 10);
    const adminEmail = 'admin@noc.ai';
    
    await client.query(
        `INSERT INTO users (tenant_id, name, email, password_hash, role)
         VALUES ($1, $2, $3, $4, 'admin')
         ON CONFLICT (email) 
         DO UPDATE SET name = EXCLUDED.name, password_hash = EXCLUDED.password_hash, role = EXCLUDED.role, tenant_id = EXCLUDED.tenant_id;`,
        [tenant1Id, 'Admin User', adminEmail, adminHashedPassword]
    );
    console.log(`- User "${adminEmail}" (admin) created or updated. Password is "${adminPassword}"`);

    const testPassword = 'testpassword';
    const testHashedPassword = await bcrypt.hash(testPassword, 10);
    const testEmail = 'test@noc.ai';

    await client.query(
        `INSERT INTO users (tenant_id, name, email, password_hash, role)
         VALUES ($1, $2, $3, $4, 'cliente')
         ON CONFLICT (email)
         DO UPDATE SET name = EXCLUDED.name, password_hash = EXCLUDED.password_hash, role = EXCLUDED.role, tenant_id = EXCLUDED.tenant_id;`,
        [tenant1Id, 'Test User', testEmail, testHashedPassword]
    );
    console.log(`- User "${testEmail}" (cliente) created or updated. Password is "${testPassword}"`);

    // --- TENANT 2: ACME Inc. ---
    const tenant2Name = 'ACME Inc.';
    const tenant2Res = await client.query(
      'INSERT INTO tenants (name) VALUES ($1) ON CONFLICT (name) DO NOTHING RETURNING id;',
      [tenant2Name]
    );
    let tenant2Id = tenant2Res.rows[0]?.id;
    if (!tenant2Id) {
      const existingTenant = await client.query('SELECT id FROM tenants WHERE name = $1;', [tenant2Name]);
      tenant2Id = existingTenant.rows[0].id;
      console.log(`- Tenant "${tenant2Name}" already exists. Using existing ID.`);
    } else {
      console.log(`- Tenant "${tenant2Name}" created.`);
    }

    const acmePassword = 'acmepassword';
    const acmeHashedPassword = await bcrypt.hash(acmePassword, 10);
    const acmeEmail = 'user@acme.inc';

    await client.query(
        `INSERT INTO users (tenant_id, name, email, password_hash, role)
         VALUES ($1, $2, $3, $4, 'cliente')
         ON CONFLICT (email)
         DO UPDATE SET name = EXCLUDED.name, password_hash = EXCLUDED.password_hash, role = EXCLUDED.role, tenant_id = EXCLUDED.tenant_id;`,
        [tenant2Id, 'ACME User', acmeEmail, acmeHashedPassword]
    );
    console.log(`- User "${acmeEmail}" (cliente) created or updated. Password is "${acmePassword}"`);
    
    // --- Seed Blocked Domains for each tenant ---
    console.log('Seeding tenant-specific data...');
    
    await client.query('DELETE FROM blocked_domains;');
    console.log('- Cleared existing blocked domains for a clean seed.');

    // Domains for NOC AI Corp (Tenant 1)
    await client.query(
      'INSERT INTO blocked_domains (domain, tenant_id) VALUES ($1, $2) ON CONFLICT (domain, tenant_id) DO NOTHING;',
      ['nocai-blocked.com', tenant1Id]
    );
    await client.query(
      'INSERT INTO blocked_domains (domain, tenant_id) VALUES ($1, $2) ON CONFLICT (domain, tenant_id) DO NOTHING;',
      ['malware-site-1.org', tenant1Id]
    );
    console.log(`- Seeded blocked domains for "${tenant1Name}".`);

    // Domains for ACME Inc. (Tenant 2)
    await client.query(
      'INSERT INTO blocked_domains (domain, tenant_id) VALUES ($1, $2) ON CONFLICT (domain, tenant_id) DO NOTHING;',
      ['acme-blocked.io', tenant2Id]
    );
    await client.query(
      'INSERT INTO blocked_domains (domain, tenant_id) VALUES ($1, $2) ON CONFLICT (domain, tenant_id) DO NOTHING;',
      ['another-bad-site.net', tenant2Id]
    );
    console.log(`- Seeded blocked domains for "${tenant2Name}".`);

    await client.query('COMMIT'); // Commit transaction
    console.log('Database seeding completed successfully!');

  } catch (err) {
    await client.query('ROLLBACK'); // Rollback on error
    console.error('Error during database seeding:', err);
    process.exit(1);
  } finally {
    client.release(); // Release the client back to the pool
    await pool.end();
    console.log('Database connection pool closed.');
  }
}

seedDatabase();
