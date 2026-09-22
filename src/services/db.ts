import Database from '@tauri-apps/plugin-sql';
let database: Promise<Database> | undefined;
export function getDatabase(): Promise<Database> {
  database ??= Database.load('sqlite:dailyflow.db').catch((error) => {
    database = undefined;
    throw error;
  });
  return database;
}
