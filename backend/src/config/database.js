import pkg from "pg";
const { Pool } = pkg;
import dotenv from "dotenv";
dotenv.config();

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});
let isConnected = false;
pool.on('connect', () => {
  if (!isConnected) {
    console.log('✓ PostgreSQL pool created');
    isConnected = true;
  }
});

pool.on('error', (err) => {
  console.error('PostgreSQL error:', err);
  process.exit(-1);
});

export default pool;