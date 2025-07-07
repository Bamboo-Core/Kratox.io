import pg from 'pg';
import 'dotenv/config';

// Create a new Pool instance to manage database connections.
// The Pool will automatically use the DATABASE_URL environment variable
// provided by Render, so no explicit connection details are needed here.
const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  // If you are connecting to a database that requires SSL and you're not on Render,
  // you might need to add this configuration:
  // ssl: {
  //   rejectUnauthorized: false
  // }
});

pool.on('connect', () => {
  console.log('Connected to the database');
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});

export default pool;
