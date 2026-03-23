import { prisma, pool } from "./db/index.ts";
import { resetAndSeedMinimal } from "./src/utils/reset-and-seed-minimal.ts";

async function run() {
  console.log("Resetting users and agents (keeping admin, categories, cities, subservices)...");

  const result = await resetAndSeedMinimal(prisma);

  console.log("\nDone ✅");
  console.log("Preserved: Admin, categories, cities, subservices, document requirements");
  console.log("\nNew test accounts created:");
  console.log("  User  -> user@gmail.com / ankushraj");
  console.log("  Agent -> agent@gmail.com / ankushraj");
}

run()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await pool.end();
  });
