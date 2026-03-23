import bcrypt from "bcrypt";

export async function resetAndSeedMinimal(prisma: any) {
  // Delete only user and agent related data (keep admin, categories, cities, subservices)
  await prisma.$transaction(async (tx: any) => {
    // Order-related data
    await tx.payment.deleteMany({});
    await tx.extraMaterial.deleteMany({});
    await tx.orders.deleteMany({});
    await tx.orderAssignment.deleteMany({});
    await tx.orderGroup.deleteMany({});

    // Agent-related data
    await tx.monthlySettlement.deleteMany({});
    await tx.agentDocument.deleteMany({});
    await tx.agentCategory.deleteMany({});
    await tx.bankDetails.deleteMany({});

    // User-related data
    await tx.notification.deleteMany({});

    // Addresses (for both users and agents)
    await tx.address.deleteMany({});

    // Delete users and agents only (keep admin, categories, cities, subservices, documentRequirements)
    await tx.agent.deleteMany({});
    await tx.user.deleteMany({});
  });

  const plainPassword = "ankushraj";
  const hashedPassword = await bcrypt.hash(plainPassword, 10);

  const user = await prisma.user.create({
    data: {
      email: "user@gmail.com",
      password: hashedPassword,
      name: "Default User",
      address: {
        create: {
          address: "Jodhpur",
          pin: "342001",
          city: "jodhpur",
          label: "Home",
          isUser: true,
        },
      },
    },
    include: { address: true },
  });

  const agent = await prisma.agent.create({
    data: {
      email: "agent@gmail.com",
      password: hashedPassword,
      name: "Default Agent",
      type: "plumber",
      isVerified: false,
      isAvailable: true,
      address: {
        create: {
          address: "Jodhpur",
          pin: "342001",
          city: "jodhpur",
          isUser: false,
        },
      },
    },
    include: { address: true },
  });

  return {
    user: { id: user.id, email: user.email },
    agent: { id: agent.id, email: agent.email },
    credentials: {
      user: { email: "user@gmail.com", password: plainPassword },
      agent: { email: "agent@gmail.com", password: plainPassword },
    },
    note: "Admin, categories, cities, and subservices were preserved",
  };
}
