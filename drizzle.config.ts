import type { Config } from "drizzle-kit";
import { config } from "dotenv";

config({ path: ".env" });
config({ path: ".env.local" });

const url = process.env.DIRECT_URL ?? process.env.DATABASE_URL;

if (!url) {
  throw new Error(
    'No DIRECT_URL or DATABASE_URL found. Create .env (or .env.local) with your Supabase connection strings — see .env.example.'
  );
}

export default {
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: { url },
} satisfies Config;
