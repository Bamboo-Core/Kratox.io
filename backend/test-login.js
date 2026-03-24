const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgresql://netguard_db_user:2k7sUlqaGi19VrUd55kuEdaWhsjUANjk@dpg-d1lv6m6mcj7s73avvn7g-a.oregon-postgres.render.com/netguard_db', ssl: { rejectUnauthorized: false } });

async function verifyQuery() {
  const email = 'admin@noc.ai';
  const uResult = await pool.query("SELECT * FROM users WHERE email = $1", [email]);
  if (uResult.rows.length === 0) return console.log('Admin not found');
  const user = uResult.rows[0];

  // Lets get one of the existing trusted devices
  const trustResult = await pool.query("SELECT * FROM trusted_devices WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1", [user.id]);
  if (trustResult.rows.length > 0) {
    const dev = trustResult.rows[0];
    console.log('Trusted device found:', dev.device_id);
    
    // Now simulate the login query
    const checkResult = await pool.query(
      "SELECT * FROM trusted_devices WHERE user_id = $1 AND device_id = $2 AND expires_at > NOW()",
      [user.id, dev.device_id]
    );
    console.log('Is valid?', checkResult.rows.length > 0);
  } else {
    console.log('No trusted device found for admin');
  }
  pool.end();
}
verifyQuery();
