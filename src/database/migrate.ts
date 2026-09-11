import { pool } from './index';
import { readFileSync, readdirSync } from 'fs';
import path from 'path';

const runMigration = async () => {
  const migrationsDir = path.resolve(__dirname, 'migrations');
  const files = readdirSync(migrationsDir).filter(f => f.endsWith('.sql')).sort();
  try {
    for (const file of files) {
      const migrationPath = path.join(migrationsDir, file);
      const sql = readFileSync(migrationPath, 'utf-8');
      await pool.query(sql);
      console.log(`Migration applied successfully: ${file}`);
    }
    process.exit(0);
  } catch (err) {
    console.error('Migration failed', err);
    process.exit(1);
  }
};

runMigration();
