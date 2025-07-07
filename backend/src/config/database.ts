import pg from 'pg';
import 'dotenv/config';

// Create a new Pool instance to manage database connections.
// The Pool will automatically use the DATABASE_URL environment variable
// provided by Render.
const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  // Render's PostgreSQL instances require SSL connections.
  // rejectUnauthorized: false is necessary because Render may use a self-signed certificate.
  ssl: {
    rejectUnauthorized: false
  }
});

pool.on('connect', () => {
  console.log('Connected to the database');
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});

export default pool;
