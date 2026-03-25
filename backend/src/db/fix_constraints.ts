import 'dotenv/config';
import pool from '../config/database.js';

async function fixConstraints() {
  console.log('Starting constraint fix...');
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    console.log('Connected to the database');

    const tables = [
      'users',
      'blocked_domains',
      'device_credentials',
      'tenant_domain_exclusions',
      'blocked_ips',
      'tenant_download_tokens',
      'tenant_blocklist_subscriptions',
      'automation_rules',
      'automation_logs',
      'tenant_template_subscriptions'
    ];

    for (const table of tables) {
      console.log(`Checking table ${table}...`);
      
      // Find the foreign key constraint name for tenant_id
      const res = await client.query(`
        SELECT conname
        FROM pg_constraint con
        JOIN pg_class rel ON rel.oid = con.conrelid
        JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
        WHERE nsp.nspname = 'public'
          AND rel.relname = $1
          AND con.contype = 'f'
          AND ARRAY['tenant_id'::name] <@ (
            SELECT array_agg(attname)
            FROM pg_attribute
            WHERE attrelid = rel.oid AND attnum = ANY(con.conkey)
          );
      `, [table]);

      if (res.rowCount > 0) {
        for (const row of res.rows) {
          const constraintName = row.conname;
          console.log(`- Dropping constraint ${constraintName} on ${table}...`);
          await client.query(`ALTER TABLE public.${table} DROP CONSTRAINT ${constraintName};`);
          
          console.log(`- Adding constraint ${constraintName} back with ON DELETE CASCADE on ${table}...`);
          await client.query(`
            ALTER TABLE public.${table}
            ADD CONSTRAINT ${constraintName}
            FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;
          `);
        }
      } else {
        console.log(`- No tenant_id foreign key found for ${table}.`);
      }
    }

    await client.query('COMMIT');
    console.log('Constraint fix completed successfully!');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error during constraint fix:', err);
  } finally {
    client.release();
    await pool.end();
  }
}

fixConstraints();
