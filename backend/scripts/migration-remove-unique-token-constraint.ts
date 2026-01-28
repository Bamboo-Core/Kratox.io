
import 'dotenv/config';
import pool from '../src/config/database.js';

async function migrate() {
    try {
        const client = await pool.connect();
        console.log('Connected to database.');

        await client.query(`
            ALTER TABLE public.tenant_download_tokens 
            DROP CONSTRAINT unique_tenant_token_config;
        `);

        client.release();
        process.exit(0);
    } catch (error) {
        if (error instanceof Error && (error as any).code === '42704') {
            process.exit(0);
        }
        process.exit(1);
    }
}

migrate();
