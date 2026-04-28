import pg from 'pg';
import env from '../config/env';

const { Pool } = pg;

export const pool = new Pool({
  host: env.database.host,
  port: env.database.port,
  database: env.database.name,
  user: env.database.user,
  password: env.database.password,
});

export async function checkPostgres(): Promise<boolean> {
  const result = await pool.query<{ ok: number }>('SELECT 1 AS ok');
  return result.rows[0]?.ok === 1;
}
