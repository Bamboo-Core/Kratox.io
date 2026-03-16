import pool from '../config/database.js';

async function migrate() {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        console.log('Creating trusted_devices table...');
        await client.query(`
            CREATE TABLE IF NOT EXISTS public.trusted_devices (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
                device_id TEXT NOT NULL,
                expires_at TIMESTAMPTZ NOT NULL,
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                UNIQUE(user_id, device_id)
            );
        `);

        console.log('Adding login_code and login_code_expires_at to users table...');
        await client.query(`
            ALTER TABLE public.users 
            ADD COLUMN IF NOT EXISTS login_code VARCHAR(10),
            ADD COLUMN IF NOT EXISTS login_code_expires_at TIMESTAMPTZ;
        `);

        await client.query('COMMIT');
        console.log('Migration successful!');
    } catch (e) {
        await client.query('ROLLBACK');
        console.error('Migration failed:', e);
        process.exit(1);
    } finally {
        client.release();
        process.exit(0);
    }
}

migrate();
