import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";

config({ path: "../../.env" });
config({ path: "../../.env.local" });

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/schema/index.ts",
  out: "./drizzle",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "postgresql://recipes:recipes@localhost:5432/recipes_db",
  },
});
