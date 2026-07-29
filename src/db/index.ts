import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is not set. Copy .env.example to .env.local and fill it in.");
}

/* Reuse the client across hot reloads in dev so we don't exhaust
   Supabase's connection pool. prepare:false is required for the
   transaction pooler (port 6543). */
const globalForDb = globalThis as unknown as { sql?: ReturnType<typeof postgres> };

/* Supabase's transaction pooler requires prepare:false.
   Keep the pool small and let queries queue: a handful of parallel
   statements on a pooled connection is where parameter binding gets
   crossed, and a class-sized app never needs more than this. */
const sql =
  globalForDb.sql ??
  postgres(connectionString, {
    prepare: false,
    max: 3,
    connect_timeout: 15,
  });

if (process.env.NODE_ENV !== "production") globalForDb.sql = sql;

export const db = drizzle(sql, { schema });
export * from "./schema";
