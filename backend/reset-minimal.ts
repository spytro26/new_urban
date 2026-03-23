import { prisma, pool } from "./db/index.ts";
import { resetAndSeedMinimal } from "./src/utils/reset-and-seed-minimal.ts";

async function run() {
  console.log("Resetting database and seeding minimal accounts...");

  const result = await resetAndSeedMinimal(prisma);

  console.log("\nDone ✅");
  console.log("City:", result.city.name, "(active:", result.city.isActive, ")");
  console.log("Credentials:");
  console.log("  Admin -> admin@gmail.com / ankushraj");
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
