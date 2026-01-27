
import 'dotenv/config';
import pool from '../src/config/database';

async function createDownloadTokensTable() {
    try {
        const client = await pool.connect();
        console.log('Connected to database.');

        await client.query(`
      CREATE TABLE IF NOT EXISTS public.tenant_download_tokens (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
        token TEXT NOT NULL,
        format TEXT NOT NULL DEFAULT 'hosts',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        expires_at TIMESTAMPTZ,
        CONSTRAINT tenant_download_tokens_tenant_id_key UNIQUE (tenant_id)
      );
    `);

        console.log('Created tenant_download_tokens table.');
        client.release();
        process.exit(0);
    } catch (error) {
        console.error('Error creating table:', error);
        process.exit(1);
    }
}

createDownloadTokensTable();
