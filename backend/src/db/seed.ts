
import 'dotenv/config';
import bcrypt from 'bcryptjs';
import pool from '../config/database.js';

async function seedDatabase() {
  console.log('Starting database seeding...');
  const client = await pool.connect();

  try {
    await client.query('BEGIN'); // Start transaction
    console.log('Connected to the database');

    // --- CREATE EXTENSIONS ---
    await client.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp";');
    console.log('uuid-ossp extension ensured.');

    // --- DROP OBSOLETE TABLES ---
    await client.query('DROP TABLE IF EXISTS public.probes CASCADE;');
    console.log('- Obsolete table "probes" dropped.');

    // --- CREATE/ALTER TABLES ---
    console.log('Creating/Altering tables...');

    await client.query(`
      CREATE TABLE IF NOT EXISTS public.tenants (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        name TEXT NOT NULL UNIQUE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);
    console.log('- Table "tenants" created or already exists.');

    // tenants.probe_api_url
    const probeUrlColumnResult = await client.query(`
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'tenants'
        AND column_name = 'probe_api_url';
    `);
    if (probeUrlColumnResult.rowCount === 0) {
      console.log('- Column "probe_api_url" not found in "tenants" table. Adding it...');
      await client.query(`
        ALTER TABLE public.tenants
        ADD COLUMN probe_api_url TEXT;
      `);
      console.log('- Column "probe_api_url" added successfully.');
    } else {
      console.log('- Column "probe_api_url" already exists in "tenants" table.');
    }

    await client.query(`
      CREATE TABLE IF NOT EXISTS public.users (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL UNIQUE,
        password_hash VARCHAR(255) NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);
    console.log('- Table "users" created or already exists.');

    // users.role
    const roleColumnResult = await client.query(`
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'users'
        AND column_name = 'role';
    `);
    if (roleColumnResult.rowCount === 0) {
      console.log('- Column "role" not found in "users" table. Adding it...');
      await client.query(`
        ALTER TABLE public.users
        ADD COLUMN role VARCHAR(50) NOT NULL DEFAULT 'collaborator';
      `);
      console.log('- Column "role" added successfully.');
    } else {
      console.log('- Column "role" already exists in "users" table.');
    }

    // users.zabbix_hostgroup_ids
    const zabbixColumnResult = await client.query(`
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'users'
        AND column_name = 'zabbix_hostgroup_ids';
    `);
    if (zabbixColumnResult.rowCount === 0) {
      console.log('- Column "zabbix_hostgroup_ids" not found in "users" table. Adding it...');
      await client.query(`
        ALTER TABLE public.users
        ADD COLUMN zabbix_hostgroup_ids TEXT[] DEFAULT '{}';
      `);
      console.log('- Column "zabbix_hostgroup_ids" added successfully.');
    } else {
      console.log('- Column "zabbix_hostgroup_ids" already exists in "users" table.');
    }

    await client.query(`
      CREATE TABLE IF NOT EXISTS public.blocked_domains (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        domain TEXT NOT NULL,
        "blockedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
        source_list_id UUID
      );
    `);
    console.log('- Table "blocked_domains" created or already exists.');

    // blocked_domains (domain, tenant_id) unique
    const constraintResult = await client.query(`
      SELECT 1 FROM pg_constraint
      WHERE conname = 'blocked_domains_domain_tenant_id_key';
    `);
    if (constraintResult.rowCount === 0) {
      console.log('- Unique constraint on (domain, tenant_id) not found in "blocked_domains". Adding it...');
      await client.query(`
        ALTER TABLE public.blocked_domains
        ADD CONSTRAINT blocked_domains_domain_tenant_id_key UNIQUE (domain, tenant_id);
      `);
      console.log('- Unique constraint added successfully.');
    } else {
      console.log('- Unique constraint on (domain, tenant_id) already exists.');
    }

    await client.query(`
      CREATE TABLE IF NOT EXISTS public.device_credentials (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        host_id TEXT NOT NULL, -- Zabbix host ID
        tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
        username VARCHAR(255) NOT NULL,
        encrypted_password TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE(host_id, tenant_id)
      );
    `);
    console.log('- Table "device_credentials" created or already exists.');

    // device_credentials.port
    const portColumnResult = await client.query(`
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'device_credentials'
        AND column_name = 'port';
    `);
    if (portColumnResult.rowCount === 0) {
      console.log('- Column "port" not found in "device_credentials" table. Adding it...');
      await client.query(`
        ALTER TABLE public.device_credentials
        ADD COLUMN port INTEGER;
      `);
      console.log('- Column "port" added successfully.');
    } else {
      console.log('- Column "port" already exists in "device_credentials" table.');
    }

    // device_credentials.device_type
    const deviceTypeColumnResult = await client.query(`
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'device_credentials'
        AND column_name = 'device_type';
    `);
    if (deviceTypeColumnResult.rowCount === 0) {
      console.log('- Column "device_type" not found in "device_credentials" table. Adding it...');
      await client.query(`
        ALTER TABLE public.device_credentials
        ADD COLUMN device_type TEXT;
      `);
      await client.query(`
        UPDATE public.device_credentials
        SET device_type = 'huawei'
        WHERE device_type IS NULL;
      `);
      await client.query(`
        ALTER TABLE public.device_credentials
        ALTER COLUMN device_type SET NOT NULL;
      `);
      console.log('- Column "device_type" added successfully.');
    } else {
      console.log('- Column "device_type" already exists in "device_credentials" table.');
    }

    await client.query(`
      CREATE TABLE IF NOT EXISTS public.dns_blocklists (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        name TEXT NOT NULL UNIQUE,
        description TEXT,
        source TEXT,
        domains TEXT[] NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);
    console.log('- Table "dns_blocklists" created or already exists.');

    await client.query(`
      CREATE TABLE IF NOT EXISTS public.tenant_blocklist_subscriptions (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
        blocklist_id UUID NOT NULL REFERENCES public.dns_blocklists(id) ON DELETE CASCADE,
        subscribed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE(tenant_id, blocklist_id)
      );
    `);
    console.log('- Table "tenant_blocklist_subscriptions" created or already exists.');

    await client.query(`
      CREATE TABLE IF NOT EXISTS public.automation_rules (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        trigger_type TEXT NOT NULL,
        trigger_conditions JSONB NOT NULL,
        action_type TEXT NOT NULL,
        action_params JSONB NOT NULL,
        is_enabled BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);
    console.log('- Table "automation_rules" created or already exists.');

    await client.query(`
      CREATE TABLE IF NOT EXISTS public.automation_logs (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        rule_id UUID REFERENCES public.automation_rules(id) ON DELETE SET NULL,
        rule_name TEXT NOT NULL,
        tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
        trigger_event JSONB NOT NULL,
        action_type TEXT NOT NULL,
        action_details JSONB,
        status VARCHAR(50) NOT NULL,
        message TEXT,
        executed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);
    console.log('- Table "automation_logs" created or already exists.');

    await client.query(`
      CREATE TABLE IF NOT EXISTS public.automation_criteria (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        name TEXT NOT NULL UNIQUE,
        label TEXT NOT NULL,
        description TEXT,
        value_type TEXT NOT NULL DEFAULT 'text',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);
    console.log('- Table "automation_criteria" created or already exists.');

    await client.query(`
      CREATE TABLE IF NOT EXISTS public.automation_actions (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        name TEXT NOT NULL UNIQUE,
        label TEXT NOT NULL,
        description TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);
    console.log('- Table "automation_actions" created or already exists.');

    // New table for scriptable automation templates
    await client.query(`
      CREATE TABLE IF NOT EXISTS public.automation_templates (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        name TEXT NOT NULL UNIQUE,
        description TEXT,
        trigger_description TEXT NOT NULL,
        device_vendor TEXT NOT NULL,
        action_script TEXT NOT NULL,
        is_enabled BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);
    console.log('- Table "automation_templates" created or already exists.');

    // New table for tenant template subscriptions
    await client.query(`
      CREATE TABLE IF NOT EXISTS public.tenant_template_subscriptions (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
        template_id UUID NOT NULL REFERENCES public.automation_templates(id) ON DELETE CASCADE,
        subscribed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE(tenant_id, template_id)
      );
    `);
    console.log('- Table "tenant_template_subscriptions" created or already exists.');

    // --- SEED DATA ---
    console.log('Seeding initial data...');

    // TENANT 1: NOC AI Corp (Admin Tenant)
    const tenant1Name = 'NOC AI Corp';
    const tenant1Res = await client.query(
      'INSERT INTO public.tenants (name) VALUES ($1) ON CONFLICT (name) DO NOTHING RETURNING id;',
      [tenant1Name]
    );
    let tenant1Id = tenant1Res.rows[0]?.id;
    if (!tenant1Id) {
      const existingTenant = await client.query('SELECT id FROM public.tenants WHERE name = $1;', [tenant1Name]);
      tenant1Id = existingTenant.rows[0].id;
      console.log(`- Tenant "${tenant1Name}" already exists. Using existing ID.`);
    } else {
      console.log(`- Tenant "${tenant1Name}" created.`);
    }

    const adminPassword = process.env.ADMIN_SEED_PASSWORD || 'password123';
    const adminHashedPassword = await bcrypt.hash(adminPassword, 10);
    const adminEmail = 'admin@noc.ai';
    await client.query(
      `INSERT INTO public.users (tenant_id, name, email, password_hash, role)
       VALUES ($1, $2, $3, $4, 'admin')
       ON CONFLICT (email)
       DO UPDATE SET name = EXCLUDED.name,
                     password_hash = EXCLUDED.password_hash,
                     role = EXCLUDED.role,
                     tenant_id = EXCLUDED.tenant_id;`,
      [tenant1Id, 'Admin User', adminEmail, adminHashedPassword]
    );
    console.log(`- User "${adminEmail}" (admin) created or updated. Password is "${adminPassword}"`);

    // TENANT 2: ACME Inc.
    const tenant2Name = 'ACME Inc.';
    const tenant2Res = await client.query(
      'INSERT INTO public.tenants (name) VALUES ($1) ON CONFLICT (name) DO NOTHING RETURNING id;',
      [tenant2Name]
    );
    let tenant2Id = tenant2Res.rows[0]?.id;
    if (!tenant2Id) {
      const existingTenant = await client.query('SELECT id FROM public.tenants WHERE name = $1;', [tenant2Name]);
      tenant2Id = existingTenant.rows[0].id;
      console.log(`- Tenant "${tenant2Name}" already exists. Using existing ID.`);
    } else {
      console.log(`- Tenant "${tenant2Name}" created.`);
    }

    const acmePassword = 'acmepassword';
    const acmeHashedPassword = await bcrypt.hash(acmePassword, 10);
    const acmeEmail = 'user@acme.inc';
    await client.query(
      `INSERT INTO public.users (tenant_id, name, email, password_hash, role, zabbix_hostgroup_ids)
       VALUES ($1, $2, $3, $4, 'cliente', $5)
       ON CONFLICT (email)
       DO UPDATE SET name = EXCLUDED.name,
                     password_hash = EXCLUDED.password_hash,
                     role = EXCLUDED.role,
                     tenant_id = EXCLUDED.tenant_id,
                     zabbix_hostgroup_ids = EXCLUDED.zabbix_hostgroup_ids;`,
      [tenant2Id, 'ACME User', acmeEmail, acmeHashedPassword, '{4}']
    );
    console.log(`- User "${acmeEmail}" (cliente) created or updated. Password is "${acmePassword}"`);
    
    // --- NEW MOCKED TENANT AND USER ---
    // TENANT 3: Fibra Veloz Telecom
    const tenant3Name = 'Fibra Veloz Telecom';
    const tenant3Res = await client.query(
      'INSERT INTO public.tenants (name) VALUES ($1) ON CONFLICT (name) DO NOTHING RETURNING id;',
      [tenant3Name]
    );
    let tenant3Id = tenant3Res.rows[0]?.id;
    if (!tenant3Id) {
      const existingTenant = await client.query('SELECT id FROM public.tenants WHERE name = $1;', [tenant3Name]);
      tenant3Id = existingTenant.rows[0].id;
      console.log(`- Tenant "${tenant3Name}" already exists. Using existing ID.`);
    } else {
      console.log(`- Tenant "${tenant3Name}" created.`);
    }

    const fibraPassword = 'fibra123';
    const fibraHashedPassword = await bcrypt.hash(fibraPassword, 10);
    const fibraEmail = 'ana.silva@fibraveloz.com';
    await client.query(
      `INSERT INTO public.users (tenant_id, name, email, password_hash, role, zabbix_hostgroup_ids)
       VALUES ($1, $2, $3, $4, 'cliente', $5)
       ON CONFLICT (email)
       DO UPDATE SET name = EXCLUDED.name,
                     password_hash = EXCLUDED.password_hash,
                     role = EXCLUDED.role,
                     tenant_id = EXCLUDED.tenant_id,
                     zabbix_hostgroup_ids = EXCLUDED.zabbix_hostgroup_ids;`,
      [tenant3Id, 'Ana Silva', fibraEmail, fibraHashedPassword, '{15}'] // Mocked Zabbix Group ID '15'
    );
    console.log(`- User "${fibraEmail}" (cliente) created or updated. Password is "${fibraPassword}"`);


    // --- Seed Data for Tenants ---
    console.log('Seeding tenant-specific data...');
    await client.query('DELETE FROM public.blocked_domains;');
    await client.query('DELETE FROM public.automation_rules;');
    await client.query('DELETE FROM public.automation_logs;');
    console.log('- Cleared existing tenant data for a clean seed.');

    // Data for NOC AI Corp
    await client.query('INSERT INTO public.blocked_domains (domain, tenant_id) VALUES ($1, $2);', ['nocai-blocked.com', tenant1Id]);
    await client.query('INSERT INTO public.blocked_domains (domain, tenant_id) VALUES ($1, $2);', ['malware-site-1.org', tenant1Id]);
    console.log(`- Seeded blocked domains for "${tenant1Name}".`);
    
    // Data for ACME Inc.
    await client.query('INSERT INTO public.blocked_domains (domain, tenant_id) VALUES ($1, $2);', ['acme-blocked.io', tenant2Id]);
    await client.query('INSERT INTO public.blocked_domains (domain, tenant_id) VALUES ($1, $2);', ['another-bad-site.net', tenant2Id]);
    const acmeRuleRes = await client.query(
      `INSERT INTO public.automation_rules (tenant_id, name, trigger_type, trigger_conditions, action_type, action_params)
       VALUES ($1, $2, 'zabbix_alert', '{"alert_name_contains": "malware"}', 'dns_block_domain_from_alert', '{}')
       RETURNING id;`,
      [tenant2Id, 'Regra de Bloqueio de Malware']
    );
    console.log(`- Seeded data for "${tenant2Name}".`);

    // Data for Fibra Veloz Telecom
    await client.query('INSERT INTO public.blocked_domains (domain, tenant_id) VALUES ($1, $2);', ['streaming-problematico.net', tenant3Id]);
    await client.query('INSERT INTO public.blocked_domains (domain, tenant_id) VALUES ($1, $2);', ['site-lento.com', tenant3Id]);
    const fibraRuleRes = await client.query(
      `INSERT INTO public.automation_rules (tenant_id, name, trigger_type, trigger_conditions, action_type, action_params)
       VALUES ($1, $2, 'zabbix_alert', '{"alert_name_contains": "baixa reputação"}', 'dns_block_domain_from_alert', '{}')
       RETURNING id;`,
      [tenant3Id, 'Bloquear Sites de Baixa Reputação']
    );
    console.log(`- Seeded data for "${tenant3Name}".`);


    // --- Seed Automation building blocks ---
    console.log('Seeding automation building blocks...');
    await client.query(`DELETE FROM public.automation_criteria;`);
    await client.query(`DELETE FROM public.automation_actions;`);

    await client.query(
      `INSERT INTO public.automation_criteria (name, label, description, value_type)
       VALUES ('alert_name_contains', 'Alert Name Contains', 'Triggers when the Zabbix alert name includes the specified text.', 'text');`
    );
    console.log('- Seeded "alert_name_contains" criterion.');

    await client.query(
      `INSERT INTO public.automation_actions (name, label, description)
       VALUES ('dns_block_domain_from_alert', 'Block Domain from Alert', 'Uses AI to extract a domain from the alert text and adds it to the DNS blocklist.');`
    );
    console.log('- Seeded "dns_block_domain_from_alert" action.');
    
    // --- Seed Mock Automation Logs ---
    console.log('Seeding mock automation logs...');
    
    // Log for ACME Inc.
    await client.query(
      `INSERT INTO public.automation_logs (rule_id, rule_name, tenant_id, trigger_event, action_type, action_details, status, message, executed_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW() - interval '2 hour 30 minutes');`,
      [
        acmeRuleRes.rows[0].id,
        'Regra de Bloqueio de Malware',
        tenant2Id,
        { host: 'router-core-la', alert_name: 'Zabbix: Detectado acesso a domínio de malware (virus-distributor.net)' },
        'dns_block_domain_from_alert',
        { blocked: ['virus-distributor.net'], failed: [] },
        'success',
        'Bloqueado 1 domínio(s). Falha ao bloquear 0.'
      ]
    );

     // Log de Falha para ACME Inc.
    await client.query(
      `INSERT INTO public.automation_logs (rule_id, rule_name, tenant_id, trigger_event, action_type, action_details, status, message, executed_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW() - interval '5 hour');`,
      [
        acmeRuleRes.rows[0].id,
        'Regra de Bloqueio de Malware',
        tenant2Id,
        { host: 'switch-access-04', alert_name: 'Zabbix: Acesso suspeito a site de C2' },
        'dns_block_domain_from_alert',
        { analyzedText: 'Zabbix: Acesso suspeito a site de C2' },
        'failure',
        'Nenhum domínio encontrado no texto do alerta. Ação finalizada.'
      ]
    );
    
    // Log de Sucesso para Fibra Veloz
    await client.query(
      `INSERT INTO public.automation_logs (rule_id, rule_name, tenant_id, trigger_event, action_type, action_details, status, message, executed_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW() - interval '1 hour');`,
      [
        fibraRuleRes.rows[0].id,
        'Bloquear Sites de Baixa Reputação',
        tenant3Id,
        { host: 'firewall-sp-01', alert_name: 'ALERTA DE SEGURANÇA: Site de baixa reputação acessado (anuncio-suspeito.biz)' },
        'dns_block_domain_from_alert',
        { blocked: ['anuncio-suspeito.biz'], failed: [] },
        'success',
        'Bloqueado 1 domínio(s).'
      ]
    );
    console.log(`- Seeded 3 mock automation logs for tenants.`);


    // --- Seed new Automation Templates ---
    console.log('Seeding new automation templates...');
    await client.query(`
        INSERT INTO public.automation_templates (name, description, trigger_description, device_vendor, action_script)
        VALUES 
            ('Diagnóstico de Alta CPU em Cisco IOS', 'Executa comandos para verificar o uso de CPU em roteadores Cisco IOS.', 'Alerta de alta utilização de CPU em dispositivo Cisco', 'cisco_ios', 'show processes cpu sorted\nshow memory allocating-process'),
            ('Diagnóstico de Alta CPU em Huawei', 'Executa comandos para verificar o uso de CPU em equipamentos Huawei.', 'Alerta de alta utilização de CPU em dispositivo Huawei', 'huawei', 'display cpu-usage\ndisplay memory-usage')
        ON CONFLICT (name) DO NOTHING;
    `);
    console.log('- Seeded 2 new automation templates.');

    await client.query('COMMIT');
    console.log('Database seeding completed successfully!');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error during database seeding:', err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
    console.log('Database connection pool closed.');
  }
}

seedDatabase();
