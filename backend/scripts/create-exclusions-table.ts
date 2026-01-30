
import 'dotenv/config';
import pool from '../src/config/database';

async function createExclusionsTable() {
    try {
        const client = await pool.connect();
        console.log('Connected to database.');

        await client.query(`
      CREATE TABLE IF NOT EXISTS public.tenant_domain_exclusions (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
        domain TEXT NOT NULL,
        excluded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT tenant_domain_exclusions_tenant_domain_key UNIQUE (tenant_id, domain)
      );
    `);

        console.log('Created tenant_domain_exclusions table.');
        client.release();
        process.exit(0);
    } catch (error) {
        console.error('Error creating table:', error);
        process.exit(1);
    }
}

createExclusionsTable();
