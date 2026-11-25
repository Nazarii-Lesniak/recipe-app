import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

export type Database = PostgresJsDatabase<typeof schema>;

let cachedClient: ReturnType<typeof postgres> | null = null;
let cachedDb: Database | null = null;

export function isDatabaseConfigured(): boolean {
  return Boolean(process.env.DATABASE_URL && process.env.DATABASE_URL.trim().length > 0);
}

export function getDb(): Database {
  if (cachedDb) {
    return cachedDb;
  }

  const connectionString =
    process.env.DATABASE_URL ?? "postgresql://recipes:recipes@localhost:5432/recipes_db";

  cachedClient = postgres(connectionString, {
    max: 10,
    idle_timeout: 20,
    connect_timeout: 5,
  });

  cachedDb = drizzle(cachedClient, { schema });
  return cachedDb;
}

export async function closeDb(): Promise<void> {
  if (cachedClient) {
    await cachedClient.end();
    cachedClient = null;
    cachedDb = null;
  }
}
