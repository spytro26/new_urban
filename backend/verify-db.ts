import { prisma, pool } from "./db/index.ts";

async function verify() {
  const admins = await prisma.admin.findMany({
    select: { id: true, email: true, createdAt: true },
  });
  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      createdAt: true,
      address: {
        select: {
          id: true,
          address: true,
          pin: true,
          city: true,
          isUser: true,
        },
      },
    },
  });
  const agents = await prisma.agent.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      type: true,
      isVerified: true,
      createdAt: true,
      address: {
        select: {
          id: true,
          address: true,
          pin: true,
          city: true,
          isUser: true,
        },
      },
    },
  });

  console.log("\n=== Admin Table ===");
  console.table(admins);

  console.log("\n=== User Table ===");
  console.table(users);

  console.log("\n=== Agent Table ===");
  console.table(agents);
}

verify()
  .catch(console.error)
  .finally(async () => {
    await pool.end();
  });
