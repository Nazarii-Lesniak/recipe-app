import { SEED_CATEGORIES } from "@recipes/domain";
import { config } from "dotenv";
import { closeDb, getDb } from "./client";
import { categories } from "./schema";

config({ path: "../../.env" });
config({ path: "../../.env.local" });

async function main() {
  const db = getDb();

  for (const category of SEED_CATEGORIES) {
    await db
      .insert(categories)
      .values(category)
      .onConflictDoUpdate({
        target: categories.slug,
        set: {
          nameUk: category.nameUk,
          nameEn: category.nameEn,
          icon: category.icon,
          sortOrder: category.sortOrder,
        },
      });
  }

  console.log(`Seeded ${SEED_CATEGORIES.length} curated categories.`);
  await closeDb();
}

main().catch(async (error) => {
  console.error("Failed to seed database:", error);
  await closeDb();
  process.exit(1);
});
