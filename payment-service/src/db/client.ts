import fs from "node:fs";
import path from "node:path";

import Database from "better-sqlite3";

let database: Database.Database | null = null;

export function getDatabase(dbPath: string): Database.Database {
  if (database) {
    return database;
  }

  const resolvedPath = path.resolve(dbPath);
  fs.mkdirSync(path.dirname(resolvedPath), { recursive: true });
  database = new Database(resolvedPath);
  database.pragma("journal_mode = WAL");
  return database;
}
