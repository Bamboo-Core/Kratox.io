"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const database_1 = __importDefault(require("../config/database"));
async function migrate() {
    const client = await database_1.default.connect();
    try {
        await client.query('BEGIN');
        await client.query(`ALTER TABLE tenant_download_tokens ADD COLUMN IF NOT EXISTS list_type VARCHAR(20) DEFAULT 'dns'`);
        await client.query(`
      DO $$ 
      DECLARE 
        r RECORD;
      BEGIN 
        FOR r IN (
          SELECT conname 
          FROM pg_constraint 
          WHERE conrelid = 'tenant_download_tokens'::regclass 
          AND contype = 'u' 
          AND conkey = ARRAY[1::smallint] -- Assuming tenant_id is the first column or we check differently. 
          -- Safer: Look for constraint involving ONLY tenant_id
        ) LOOP
          EXECUTE 'ALTER TABLE tenant_download_tokens DROP CONSTRAINT ' || r.conname;
        END LOOP;
      END $$;
    `);
        await client.query(`
      DO $$ 
      BEGIN 
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'unique_tenant_token_config') THEN 
          ALTER TABLE tenant_download_tokens ADD CONSTRAINT unique_tenant_token_config UNIQUE (tenant_id, list_type, format); 
        END IF; 
      END $$;
    `);
        await client.query('COMMIT');
    }
    catch (e) {
        await client.query('ROLLBACK');
        process.exit(1);
    }
    finally {
        client.release();
        process.exit(0);
    }
}
migrate();
