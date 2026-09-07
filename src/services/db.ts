import Database from '@tauri-apps/plugin-sql';

let dbInstance: Database | null = null;

export async function getDatabase(): Promise<Database> {
  if (dbInstance) return dbInstance;
  try {
    dbInstance = await Database.load('sqlite:dailyflow.db');
    return dbInstance;
  } catch (error) {
    console.warn('Could not load native SQLite database, operating with local memory cache:', error);
    throw error;
  }
}
