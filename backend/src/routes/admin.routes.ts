import { Router } from "express";
import { prisma } from "../../db/index.ts";
import { adminMiddleware } from "../middleware/admin.middleware.ts";

const router = Router();
router.use(adminMiddleware);

const COMMISSION_RATE = 0.05; // 5 %

// ═══════════════════════════════════════════════════════════════════════
//  DASHBOARD
// ═══════════════════════════════════════════════════════════════════════

router.get("/dashboard", async (_req, res) => {
  try {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const [
      totalRevenue,
      activeAgents,
      bookingsToday,
      totalOrders,
      unassignedOrders,
    ] = await Promise.all([
      // sum of all completed order totalPrices
      prisma.orderGroup.aggregate({
        _sum: { totalPrice: true },
        where: { status: "COMPLETED" },
      }),
      prisma.agent.count({ where: { isAvailable: true } }),
      prisma.orderGroup.count({ where: { createdAt: { gte: todayStart } } }),
      prisma.orderGroup.count(),
      prisma.orderGroup.count({ where: { status: "PENDING" } }),
    ]);

    res.json({
      totalRevenue: totalRevenue._sum.totalPrice ?? 0,
      activeAgents,
      bookingsToday,
      totalOrders,
      unassignedOrders,
    });
  } catch {
    res.status(500).json({ error: "Something went wrong" });
  }
});

// ═══════════════════════════════════════════════════════════════════════
//  CITY CRUD
// ═══════════════════════════════════════════════════════════════════════

router.get("/cities", async (_req, res) => {
  try {
    const cities = await prisma.city.findMany({ orderBy: { name: "asc" } });
    res.json({ cities });
  } catch {
    res.status(500).json({ error: "Something went wrong" });
  }
});

router.post("/cities", async (req, res) => {
  try {
    const { name, state } = req.body as { name?: string; state?: string };
    if (!name) return res.status(400).json({ error: "city name is required" });

    const city = await prisma.city.create({
      data: { name: name.trim().toLowerCase(), state: state?.trim() ?? null },
    });

    res.status(201).json({ city });
  } catch (err: any) {
    if (err?.code === "P2002") {
      return res.status(409).json({ error: "city already exists" });
    }
    res.status(500).json({ error: "Something went wrong" });
  }
});

router.delete("/cities/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: "invalid city id" });

    await prisma.city.delete({ where: { id } });
    res.json({ deleted: true });
  } catch {
    res.status(500).json({ error: "city not found or already deleted" });
  }
});

// toggle city active/inactive
router.patch("/cities/:id/toggle", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: "invalid city id" });

    const city = await prisma.city.findUnique({ where: { id } });
    if (!city) return res.status(404).json({ error: "city not found" });

    const updated = await prisma.city.update({
      where: { id },
      data: { isActive: !city.isActive },
    });

    res.json({ city: updated });
  } catch {
    res.status(500).json({ error: "Something went wrong" });
  }
});

// ═══════════════════════════════════════════════════════════════════════
//  CATEGORY CRUD (dynamic service categories)
// ═══════════════════════════════════════════════════════════════════════

router.get("/categories", async (_req, res) => {
  try {
    const categories = await prisma.category.findMany({
      orderBy: { name: "asc" },
      include: {
        documentRequirements: { orderBy: { id: "asc" } },
        _count: { select: { subservices: true, agentCategories: true } },
      },
    });
    res.json({ categories });
  } catch {
    res.status(500).json({ error: "Something went wrong" });
  }
});

router.post("/categories", async (req, res) => {
  try {
    const { name, description, documentRequirements } = req.body as {
      name?: string;
      description?: string;
      documentRequirements?: {
        name: string;
        description?: string;
        isRequired?: boolean;
      }[];
    };
    if (!name) return res.status(400).json({ error: "name is required" });

    const slug = name.trim().toLowerCase().replace(/\s+/g, "-");

    const category = await prisma.category.create({
      data: {
        name: name.trim(),
        slug,
        description: description ?? null,
        ...(documentRequirements?.length && {
          documentRequirements: {
            create: documentRequirements.map((dr) => ({
              name: dr.name,
              description: dr.description ?? null,
              isRequired: dr.isRequired ?? true,
            })),
          },
        }),
      },
      include: { documentRequirements: true },
    });

    res.status(201).json({ category });
  } catch (err: any) {
    if (err?.code === "P2002")
      return res.status(409).json({ error: "category already exists" });
    res.status(500).json({ error: "Something went wrong" });
  }
});

router.put("/categories/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: "invalid id" });

    const { name, description, isActive } = req.body as {
      name?: string;
      description?: string;
      isActive?: boolean;
    };

    const data: any = {};
    if (name !== undefined) {
      data.name = name.trim();
      data.slug = name.trim().toLowerCase().replace(/\s+/g, "-");
    }
    if (description !== undefined) data.description = description;
    if (isActive !== undefined) data.isActive = isActive;

    const category = await prisma.category.update({
      where: { id },
      data,
      include: { documentRequirements: true },
    });
    res.json({ category });
  } catch {
    res.status(500).json({ error: "category not found" });
  }
});

router.delete("/categories/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: "invalid id" });
    await prisma.category.delete({ where: { id } });
    res.json({ deleted: true });
  } catch {
    res.status(500).json({ error: "category not found or has dependencies" });
  }
});

// ── Document requirement CRUD ──────────────────────────────────────────

router.post("/categories/:categoryId/requirements", async (req, res) => {
  try {
    const categoryId = parseInt(req.params.categoryId);
    if (isNaN(categoryId))
      return res.status(400).json({ error: "invalid category id" });

    const { name, description, isRequired } = req.body as {
      name?: string;
      description?: string;
      isRequired?: boolean;
    };
    if (!name) return res.status(400).json({ error: "name is required" });

    const req2 = await prisma.documentRequirement.create({
      data: {
        name,
        description: description ?? null,
        isRequired: isRequired ?? true,
        categoryId,
      },
    });
    res.status(201).json({ requirement: req2 });
  } catch {
    res.status(500).json({ error: "Something went wrong" });
  }
});

router.delete("/requirements/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: "invalid id" });
    await prisma.documentRequirement.delete({ where: { id } });
    res.json({ deleted: true });
  } catch {
    res.status(500).json({ error: "requirement not found" });
  }
});

// ── Per-category agent verification ────────────────────────────────────

router.patch(
  "/agents/:agentId/categories/:categoryId/verify",
  async (req, res) => {
    try {
      const agentId = parseInt(req.params.agentId);
      const categoryId = parseInt(req.params.categoryId);
      if (isNaN(agentId) || isNaN(categoryId))
        return res.status(400).json({ error: "invalid ids" });

      const { approve, rejectionNote } = req.body as {
        approve?: boolean;
        rejectionNote?: string;
      };

      const ac = await prisma.agentCategory.findUnique({
        where: { agentId_categoryId: { agentId, categoryId } },
      });
      if (!ac)
        return res.status(404).json({ error: "agent category not found" });

      const updated = await prisma.agentCategory.update({
        where: { id: ac.id },
        data: {
          isVerified: approve !== false,
          rejectionNote:
            approve === false ? (rejectionNote ?? "Rejected by admin") : null,
        },
        include: { category: { select: { name: true } } },
      });

      // If agent has at least one verified category, mark them as verified overall
      const verifiedCount = await prisma.agentCategory.count({
        where: { agentId, isVerified: true },
      });
      await prisma.agent.update({
        where: { id: agentId },
        data: { isVerified: verifiedCount > 0 },
      });

      res.json({ agentCategory: updated });
    } catch {
      res.status(500).json({ error: "Something went wrong" });
    }
  },
);

// ── Approve/reject agent document ──────────────────────────────────────

router.patch("/agents/documents/:docId", async (req, res) => {
  try {
    const docId = parseInt(req.params.docId);
    if (isNaN(docId)) return res.status(400).json({ error: "invalid id" });

    const { status, rejectionNote } = req.body as {
      status?: string;
      rejectionNote?: string;
    };
    if (!status || !["APPROVED", "REJECTED"].includes(status))
      return res
        .status(400)
        .json({ error: "status must be APPROVED or REJECTED" });

    const doc = await prisma.agentDocument.update({
      where: { id: docId },
      data: {
        status: status as any,
        rejectionNote:
          status === "REJECTED" ? (rejectionNote ?? "Rejected") : null,
      },
    });
    res.json({ document: doc });
  } catch {
    res.status(500).json({ error: "document not found" });
  }
});

// ═══════════════════════════════════════════════════════════════════════
//  SUBSERVICE CRUD
// ═══════════════════════════════════════════════════════════════════════

router.get("/subservices", async (_req, res) => {
  try {
    const subservices = await prisma.subservice.findMany({
      orderBy: { name: "asc" },
      include: { category: { select: { id: true, name: true, slug: true } } },
    });
    res.json({ subservices });
  } catch {
    res.status(500).json({ error: "Something went wrong" });
  }
});

router.post("/subservices", async (req, res) => {
  try {
    const { name, price, description, categoryId } = req.body as {
      name?: string;
      price?: number;
      description?: string;
      categoryId?: number;
    };
    if (!name) return res.status(400).json({ error: "name is required" });

    const sub = await prisma.subservice.create({
      data: {
        name,
        price: price ?? null,
        description: description ?? null,
        ...(categoryId && { categoryId }),
      },
      include: { category: { select: { id: true, name: true, slug: true } } },
    });

    res.status(201).json({ subservice: sub });
  } catch {
    res.status(500).json({ error: "Something went wrong" });
  }
});

router.put("/subservices/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: "invalid id" });

    const { name, price, description, categoryId } = req.body as {
      name?: string;
      price?: number;
      description?: string;
      categoryId?: number | null;
    };

    const sub = await prisma.subservice.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(price !== undefined && { price }),
        ...(description !== undefined && { description }),
        ...(categoryId !== undefined && { categoryId }),
      },
      include: { category: { select: { id: true, name: true, slug: true } } },
    });

    res.json({ subservice: sub });
  } catch {
    res.status(500).json({ error: "subservice not found" });
  }
});

router.delete("/subservices/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: "invalid id" });

    await prisma.subservice.delete({ where: { id } });
    res.json({ deleted: true });
  } catch {
    res.status(500).json({ error: "subservice not found or has orders" });
  }
});

// ═══════════════════════════════════════════════════════════════════════
//  ASSIGN ORDER TO AGENT
// ═══════════════════════════════════════════════════════════════════════

router.patch("/orders/:orderId/assign", async (req, res) => {
  try {
    const orderId = parseInt(req.params.orderId);
    if (isNaN(orderId))
      return res.status(400).json({ error: "invalid order id" });

    // Accept both single agentId and array of agentIds
    let { agentId, agentIds } = req.body as {
      agentId?: number;
      agentIds?: number[];
    };
    if (agentId && !agentIds) agentIds = [agentId];
    if (!agentIds || agentIds.length === 0) {
      return res.status(400).json({ error: "agentIds is required" });
    }

    // verify all agents exist and are available + verified
    const agents = await prisma.agent.findMany({
      where: { id: { in: agentIds }, isAvailable: true, isVerified: true },
    });
    if (agents.length === 0)
      return res.status(404).json({ error: "no valid agents found" });

    const order = await prisma.orderGroup.findUnique({
      where: { id: orderId },
    });
    if (!order) return res.status(404).json({ error: "order not found" });

    if (order.status !== "PENDING") {
      return res
        .status(400)
        .json({ error: "only PENDING orders can be assigned" });
    }

    // Create OrderAssignment for each agent + update order status
    await prisma.$transaction(async (tx) => {
      // Delete any old declined assignments for this order
      await tx.orderAssignment.deleteMany({ where: { orderId } });

      // Create new assignments
      await tx.orderAssignment.createMany({
        data: agents.map((a) => ({ orderId, agentId: a.id })),
      });

      // Set order to ASSIGNED (no single agent yet — waiting for acceptance)
      await tx.orderGroup.update({
        where: { id: orderId },
        data: { status: "ASSIGNED" },
      });
    });

    // Notify user
    await prisma.notification.create({
      data: {
        userId: order.userId,
        message: `Your order #${orderId} has been sent to ${agents.length} agent(s)`,
        description: `Waiting for an agent to accept the job.`,
      },
    });

    const updated = await prisma.orderGroup.findUnique({
      where: { id: orderId },
      include: {
        assignments: {
          include: { agent: { select: { id: true, name: true, type: true } } },
        },
        user: { select: { id: true, email: true } },
      },
    });

    res.json({ order: updated });
  } catch {
    res.status(500).json({ error: "Something went wrong" });
  }
});

// ═══════════════════════════════════════════════════════════════════════
//  LIST ALL ORDERS  (admin view with filters)
// ═══════════════════════════════════════════════════════════════════════

router.get("/orders", async (req, res) => {
  try {
    const statusFilter = req.query.status as string | undefined;
    const cursor = req.query.cursor ? Number(req.query.cursor) : undefined;

    const where: any = {};
    if (statusFilter) where.status = statusFilter;

    const orders = await prisma.orderGroup.findMany({
      where,
      include: {
        user: { select: { id: true, email: true } },
        agent: { select: { id: true, name: true, type: true } },
        addressUser: { select: { address: true, city: true, pin: true } },
        orders: {
          include: {
            subservice: {
              select: {
                name: true,
                price: true,
                category: { select: { name: true, slug: true } },
              },
            },
          },
        },
        assignments: {
          include: {
            agent: { select: { id: true, name: true, type: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 20,
      ...(cursor && { cursor: { id: cursor }, skip: 1 }),
    });

    const nextCursor =
      orders.length === 20 ? orders[orders.length - 1]?.id : null;
    res.json({ orders, nextCursor });
  } catch {
    res.status(500).json({ error: "Something went wrong" });
  }
});

// ═══════════════════════════════════════════════════════════════════════
//  LIST AGENTS
// ═══════════════════════════════════════════════════════════════════════

router.get("/agents", async (req, res) => {
  try {
    const onlyAvailable = req.query.available === "true";
    const forAssignment = req.query.forAssignment === "true";
    const where: any = {};
    if (onlyAvailable) where.isAvailable = true;
    if (forAssignment) {
      where.isAvailable = true;
      where.isVerified = true;
    }

    const agents = await prisma.agent.findMany({
      where,
      select: {
        id: true,
        name: true,
        email: true,
        type: true,
        isAvailable: true,
        isVerified: true,
        rating: true,
        profilepic: true,
        id_proof: true,
        address_proof: true,
        address: { select: { address: true, pin: true, city: true } },
        categories: {
          include: {
            category: { select: { id: true, name: true, slug: true } },
          },
        },
        documents: {
          include: {
            requirement: { select: { id: true, name: true, categoryId: true } },
          },
        },
        _count: { select: { orders: true } },
      },
      orderBy: { name: "asc" },
    });

    // Attach total earnings for each agent (sum of completed order totalPrice)
    const agentsWithEarnings = await Promise.all(
      agents.map(async (agent) => {
        const earnings = await prisma.orderGroup.aggregate({
          _sum: { totalPrice: true },
          where: { assignedAgentId: agent.id, status: "COMPLETED" },
        });
        return { ...agent, totalEarnings: earnings._sum.totalPrice ?? 0 };
      }),
    );

    res.json({ agents: agentsWithEarnings });
  } catch {
    res.status(500).json({ error: "Something went wrong" });
  }
});

// verify / unverify agent
router.patch("/agents/:agentId/verify", async (req, res) => {
  try {
    const agentId = parseInt(req.params.agentId);
    if (isNaN(agentId))
      return res.status(400).json({ error: "invalid agent id" });

    const agent = await prisma.agent.findUnique({ where: { id: agentId } });
    if (!agent) return res.status(404).json({ error: "agent not found" });

    const updated = await prisma.agent.update({
      where: { id: agentId },
      data: { isVerified: !agent.isVerified },
    });

    res.json({ agent: { id: updated.id, isVerified: updated.isVerified } });
  } catch {
    res.status(500).json({ error: "Something went wrong" });
  }
});

// ═══════════════════════════════════════════════════════════════════════
//  MONTHLY REVENUE REPORT (per-agent breakdown)
// ═══════════════════════════════════════════════════════════════════════

router.get("/reports/monthly", async (req, res) => {
  try {
    const month = Number(req.query.month) || new Date().getMonth() + 1;
    const year = Number(req.query.year) || new Date().getFullYear();

    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 1);

    // all completed orders this month
    const orders = await prisma.orderGroup.findMany({
      where: {
        status: "COMPLETED",
        createdAt: { gte: startDate, lt: endDate },
        assignedAgentId: { not: null },
      },
      include: {
        payments: true,
        extraMaterials: { where: { approvalStatus: "APPROVED", paid: true } },
        agent: { select: { id: true, name: true, email: true } },
      },
    });

    // aggregate per agent
    const agentMap = new Map<
      number,
      {
        agentId: number;
        name: string;
        email: string;
        serviceEarnings: number;
        extraEarnings: number;
        totalEarnings: number;
        codCollected: number;
        onlineCollected: number;
        orderCount: number;
      }
    >();

    for (const o of orders) {
      const aid = o.assignedAgentId!;
      if (!agentMap.has(aid)) {
        agentMap.set(aid, {
          agentId: aid,
          name: o.agent?.name ?? "",
          email: o.agent?.email ?? "",
          serviceEarnings: 0,
          extraEarnings: 0,
          totalEarnings: 0,
          codCollected: 0,
          onlineCollected: 0,
          orderCount: 0,
        });
      }
      const a = agentMap.get(aid)!;
      a.orderCount++;
      const orderTotal = o.totalPrice ?? 0;
      const extraTotal = o.extraMaterials.reduce(
        (s, m) => s + m.price * m.quantity,
        0,
      );
      a.serviceEarnings += orderTotal;
      a.extraEarnings += extraTotal;
      a.totalEarnings += orderTotal + extraTotal;

      for (const p of o.payments) {
        if (p.method === "CASH") a.codCollected += p.amount;
        else a.onlineCollected += p.amount;
      }
    }

    // build report rows with commission & carry-over
    // Commission is ONLY on service earnings (not extra materials)
    const report = [];
    let platformRevenue = 0;

    for (const a of agentMap.values()) {
      // carry-over from previous month
      const prevMonth = month === 1 ? 12 : month - 1;
      const prevYear = month === 1 ? year - 1 : year;
      const prevSettlement = await prisma.monthlySettlement.findUnique({
        where: {
          agentId_month_year: {
            agentId: a.agentId,
            month: prevMonth,
            year: prevYear,
          },
        },
      });
      const previousCarry = prevSettlement?.carryOver ?? 0;

      const commission = a.serviceEarnings * COMMISSION_RATE;
      const netPayable = a.totalEarnings - commission - previousCarry;
      const amountToSend = Math.max(0, netPayable - a.codCollected);
      const carryOver = Math.max(0, a.codCollected - netPayable);

      platformRevenue += commission;

      report.push({
        ...a,
        commission,
        netPayable: a.totalEarnings - commission,
        previousCarry,
        adjustedNetPayable: netPayable,
        amountToSend,
        carryOver,
      });
    }

    res.json({ month, year, platformRevenue, agents: report });
  } catch {
    res.status(500).json({ error: "Something went wrong" });
  }
});

// ═══════════════════════════════════════════════════════════════════════
//  GENERATE / RECALCULATE SETTLEMENTS FOR A MONTH
// ═══════════════════════════════════════════════════════════════════════

router.post("/settlements/generate", async (req, res) => {
  try {
    const month = Number(req.query.month) || new Date().getMonth() + 1;
    const year = Number(req.query.year) || new Date().getFullYear();

    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 1);

    // all completed orders this month grouped by agent
    const orders = await prisma.orderGroup.findMany({
      where: {
        status: "COMPLETED",
        createdAt: { gte: startDate, lt: endDate },
        assignedAgentId: { not: null },
      },
      include: {
        payments: true,
        extraMaterials: { where: { approvalStatus: "APPROVED", paid: true } },
      },
    });

    const agentMap = new Map<
      number,
      {
        serviceEarnings: number;
        extraEarnings: number;
        totalEarnings: number;
        codCollected: number;
        onlineCollected: number;
      }
    >();

    for (const o of orders) {
      const aid = o.assignedAgentId!;
      if (!agentMap.has(aid)) {
        agentMap.set(aid, {
          serviceEarnings: 0,
          extraEarnings: 0,
          totalEarnings: 0,
          codCollected: 0,
          onlineCollected: 0,
        });
      }
      const a = agentMap.get(aid)!;
      const orderTotal = o.totalPrice ?? 0;
      const extraTotal = o.extraMaterials.reduce(
        (s, m) => s + m.price * m.quantity,
        0,
      );
      a.serviceEarnings += orderTotal;
      a.extraEarnings += extraTotal;
      a.totalEarnings += orderTotal + extraTotal;

      for (const p of o.payments) {
        if (p.method === "CASH") a.codCollected += p.amount;
        else a.onlineCollected += p.amount;
      }
    }

    const settlements = [];

    for (const [agentId, a] of agentMap) {
      const prevMonth = month === 1 ? 12 : month - 1;
      const prevYear = month === 1 ? year - 1 : year;
      const prev = await prisma.monthlySettlement.findUnique({
        where: {
          agentId_month_year: { agentId, month: prevMonth, year: prevYear },
        },
      });
      const previousCarry = prev?.carryOver ?? 0;

      // Commission is ONLY on service earnings (not extra materials)
      const commission = a.serviceEarnings * COMMISSION_RATE;
      const netPayable = a.totalEarnings - commission - previousCarry;
      const amountToSend = Math.max(0, netPayable - a.codCollected);
      const carryOver = Math.max(0, a.codCollected - netPayable);

      const settlement = await prisma.monthlySettlement.upsert({
        where: { agentId_month_year: { agentId, month, year } },
        update: {
          totalEarnings: a.totalEarnings,
          serviceEarnings: a.serviceEarnings,
          extraEarnings: a.extraEarnings,
          commission,
          netPayable: a.totalEarnings - commission,
          codCollected: a.codCollected,
          onlineCollected: a.onlineCollected,
          amountToSend,
          carryOver,
          previousCarry: previousCarry,
        },
        create: {
          agentId,
          month,
          year,
          totalEarnings: a.totalEarnings,
          serviceEarnings: a.serviceEarnings,
          extraEarnings: a.extraEarnings,
          commission,
          netPayable: a.totalEarnings - commission,
          codCollected: a.codCollected,
          onlineCollected: a.onlineCollected,
          amountToSend,
          carryOver,
          previousCarry: previousCarry,
        },
      });

      settlements.push(settlement);
    }

    res.json({
      month,
      year,
      settlementsCreated: settlements.length,
      settlements,
    });
  } catch {
    res.status(500).json({ error: "Something went wrong" });
  }
});

// mark a settlement as paid
router.patch("/settlements/:id/mark-settled", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id))
      return res.status(400).json({ error: "invalid settlement id" });

    const settlement = await prisma.monthlySettlement.update({
      where: { id },
      data: { settled: true, settledAt: new Date() },
    });

    res.json({ settlement });
  } catch {
    res.status(500).json({ error: "settlement not found" });
  }
});

// list settlements for a month
router.get("/settlements", async (req, res) => {
  try {
    const month = Number(req.query.month) || new Date().getMonth() + 1;
    const year = Number(req.query.year) || new Date().getFullYear();

    const settlements = await prisma.monthlySettlement.findMany({
      where: { month, year },
      include: { agent: { select: { id: true, name: true, email: true } } },
      orderBy: { agentId: "asc" },
    });

    res.json({ month, year, settlements });
  } catch {
    res.status(500).json({ error: "Something went wrong" });
  }
});

// ═══════════════════════════════════════════════════════════════════════
//  APPROVE EXTRA-MATERIAL (admin can also approve on behalf of user)
// ═══════════════════════════════════════════════════════════════════════

router.patch("/extra-materials/:materialId/approve", async (req, res) => {
  try {
    const materialId = parseInt(req.params.materialId);
    if (isNaN(materialId))
      return res.status(400).json({ error: "invalid material id" });

    const existing = await prisma.extraMaterial.findUnique({
      where: { id: materialId },
    });
    if (!existing) return res.status(404).json({ error: "material not found" });

    // Immutability: only PENDING materials can be approved
    if (existing.approvalStatus !== "PENDING") {
      return res.status(400).json({
        error: `material already ${existing.approvalStatus.toLowerCase()} — decision cannot be changed`,
      });
    }

    const material = await prisma.extraMaterial.update({
      where: { id: materialId },
      data: { approvalStatus: "APPROVED" },
    });

    res.json({ material });
  } catch {
    res.status(500).json({ error: "material not found" });
  }
});

// ═══════════════════════════════════════════════════════════════════════
//  DOWNLOAD MONTHLY REVENUE REPORT AS CSV
// ═══════════════════════════════════════════════════════════════════════

router.get("/reports/monthly/download", async (req, res) => {
  try {
    const month = Number(req.query.month) || new Date().getMonth() + 1;
    const year = Number(req.query.year) || new Date().getFullYear();

    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 1);

    const orders = await prisma.orderGroup.findMany({
      where: {
        status: "COMPLETED",
        createdAt: { gte: startDate, lt: endDate },
        assignedAgentId: { not: null },
      },
      include: {
        payments: true,
        extraMaterials: { where: { approvalStatus: "APPROVED", paid: true } },
        agent: { select: { id: true, name: true, email: true } },
      },
    });

    const agentMap2 = new Map<number, any>();

    for (const o of orders) {
      const aid = o.assignedAgentId!;
      if (!agentMap2.has(aid)) {
        agentMap2.set(aid, {
          agentId: aid,
          name: o.agent?.name ?? "",
          email: o.agent?.email ?? "",
          serviceEarnings: 0,
          extraEarnings: 0,
          totalEarnings: 0,
          codCollected: 0,
          onlineCollected: 0,
          orderCount: 0,
        });
      }
      const a = agentMap2.get(aid)!;
      a.orderCount++;
      const orderTotal = o.totalPrice ?? 0;
      const extraTotal = o.extraMaterials.reduce(
        (s: number, m: any) => s + m.price * m.quantity,
        0,
      );
      a.serviceEarnings += orderTotal;
      a.extraEarnings += extraTotal;
      a.totalEarnings += orderTotal + extraTotal;
      for (const p of o.payments) {
        if (p.method === "CASH") a.codCollected += p.amount;
        else a.onlineCollected += p.amount;
      }
    }

    // Build CSV — commission only on service earnings
    const header =
      "Agent ID,Agent Name,Agent Email,Orders,Service Earnings,Extra Material,Total Earnings,Commission (5% svc),Net Payable,COD Collected,Online Collected,Amount To Send,Carry Over,Prev Carry\n";
    let csv = header;

    for (const a of agentMap2.values()) {
      const prevMonth = month === 1 ? 12 : month - 1;
      const prevYear = month === 1 ? year - 1 : year;
      const prevSettlement = await prisma.monthlySettlement.findUnique({
        where: {
          agentId_month_year: {
            agentId: a.agentId,
            month: prevMonth,
            year: prevYear,
          },
        },
      });
      const previousCarry = prevSettlement?.carryOver ?? 0;
      const commission = a.serviceEarnings * COMMISSION_RATE;
      const netPayable = a.totalEarnings - commission - previousCarry;
      const amountToSend = Math.max(0, netPayable - a.codCollected);
      const carryOver = Math.max(0, a.codCollected - netPayable);

      csv += `${a.agentId},${a.name},${a.email},${a.orderCount},${a.serviceEarnings.toFixed(2)},${a.extraEarnings.toFixed(2)},${a.totalEarnings.toFixed(2)},${commission.toFixed(2)},${(a.totalEarnings - commission).toFixed(2)},${a.codCollected.toFixed(2)},${a.onlineCollected.toFixed(2)},${amountToSend.toFixed(2)},${carryOver.toFixed(2)},${previousCarry.toFixed(2)}\n`;
    }

    res.setHeader("Content-Type", "text/csv");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=revenue-report-${year}-${month}.csv`,
    );
    res.send(csv);
  } catch {
    res.status(500).json({ error: "Something went wrong" });
  }
});

export default router;
