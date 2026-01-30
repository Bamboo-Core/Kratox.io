
import 'dotenv/config';
import pool from '../src/config/database';

async function createIpTable() {
    try {
        const client = await pool.connect();
        console.log('Connected to database.');

        await client.query(`
      CREATE TABLE IF NOT EXISTS public.blocked_ips (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        ip_address TEXT NOT NULL,
        "blockedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
        source_list_id UUID,
        CONSTRAINT blocked_ips_ip_tenant_id_key UNIQUE (ip_address, tenant_id)
      );
    `);

        console.log('Created blocked_ips table.');
        client.release();
        process.exit(0);
    } catch (error) {
        console.error('Error creating table:', error);
        process.exit(1);
    }
}

createIpTable();
