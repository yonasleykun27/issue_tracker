const { Pool } = require('pg');
require('dotenv').config();

const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });

async function main() {
  const res = await pool.query('SELECT id, name, email, role, status FROM "User"');
  console.log("Users in Database:");
  console.log(JSON.stringify(res.rows, null, 2));
}

main()
  .catch(console.error)
  .finally(() => pool.end());
