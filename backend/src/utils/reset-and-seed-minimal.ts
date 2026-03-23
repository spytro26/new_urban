import bcrypt from "bcrypt";

export async function resetAndSeedMinimal(prisma: any) {
  // Delete in FK-safe order
  await prisma.$transaction(async (tx: any) => {
    await tx.payment.deleteMany({});
    await tx.extraMaterial.deleteMany({});
    await tx.orders.deleteMany({});
    await tx.orderAssignment.deleteMany({});
    await tx.orderGroup.deleteMany({});

    await tx.monthlySettlement.deleteMany({});
    await tx.agentDocument.deleteMany({});
    await tx.agentCategory.deleteMany({});
    await tx.documentRequirement.deleteMany({});

    await tx.subservice.deleteMany({});
    await tx.notification.deleteMany({});
    await tx.bankDetails.deleteMany({});
    await tx.address.deleteMany({});

    await tx.admin.deleteMany({});
    await tx.agent.deleteMany({});
    await tx.user.deleteMany({});

    await tx.category.deleteMany({});
    await tx.city.deleteMany({});
  });

  const plainPassword = "ankushraj";
  const hashedPassword = await bcrypt.hash(plainPassword, 10);

  const city = await prisma.city.create({
    data: {
      name: "jodhpur",
      state: "Rajasthan",
      isActive: true,
    },
  });

  const admin = await prisma.admin.create({
    data: {
      email: "admin@gmail.com",
      password: hashedPassword,
    },
  });

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
    city,
    admin: { id: admin.id, email: admin.email },
    user: { id: user.id, email: user.email },
    agent: { id: agent.id, email: agent.email },
    credentials: {
      user: { email: "user@gmail.com", password: plainPassword },
      admin: { email: "admin@gmail.com", password: plainPassword },
      agent: { email: "agent@gmail.com", password: plainPassword },
    },
  };
}
