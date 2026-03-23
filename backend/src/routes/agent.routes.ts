import { Router } from "express";
import { prisma } from "../../db/index.ts";
import { agentMiddleware } from "../middleware/agent.middleware.ts";
import { upload } from "../middleware/upload.middleware.ts";
import { cloudinary } from "../config/cloudinary.ts";

// Helper: upload a buffer to Cloudinary and return the secure URL
function uploadToCloudinary(
  buffer: Buffer,
  folder: string,
  publicId?: string,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder, public_id: publicId, resource_type: "image" },
      (error, result) => {
        if (error || !result)
          return reject(error ?? new Error("Upload failed"));
        resolve(result.secure_url);
      },
    );
    stream.end(buffer);
  });
}

const router = Router();
router.use(agentMiddleware);

// ─── 1. Pending jobs (offered to me, waiting for me to accept) ─────────
router.get("/jobs/pending", async (req, res) => {
  try {
    const agentId = req.user!.id;

    // Find orders where this agent has a PENDING assignment AND the order is still up for grabs
    const assignments = await prisma.orderAssignment.findMany({
      where: {
        agentId,
        status: "PENDING",
        orderGroup: { assignedAgentId: null, status: "ASSIGNED" },
      },
      include: {
        orderGroup: {
          include: {
            addressUser: {
              select: { id: true, address: true, pin: true, city: true },
            },
            orders: {
              include: {
                subservice: {
                  select: { name: true, price: true, category: true },
                },
              },
            },
            user: { select: { id: true, email: true, profilepic: true } },
            assignments: {
              include: { agent: { select: { id: true, name: true } } },
            },
          },
        },
      },
    });

    // Return the order groups (keeping old response shape)
    const jobs = assignments.map((a) => a.orderGroup);

    res.json({ jobs });
  } catch {
    res.status(500).json({ error: "Something went wrong" });
  }
});

// ─── 2. Accept an assigned order ───────────────────────────────────────
router.patch("/jobs/:orderId/accept", async (req, res) => {
  try {
    const agentId = req.user!.id;
    const orderId = parseInt(req.params.orderId);
    if (isNaN(orderId))
      return res.status(400).json({ error: "invalid order id" });

    // Check this agent has a PENDING assignment for this order
    const assignment = await prisma.orderAssignment.findUnique({
      where: { orderId_agentId: { orderId, agentId } },
    });
    if (!assignment || assignment.status !== "PENDING") {
      return res
        .status(404)
        .json({ error: "no pending assignment found for this order" });
    }

    // Look up agent's address for agentAddress field
    const agentAddr = await prisma.address.findFirst({
      where: { agentId },
      select: { id: true },
    });

    // Atomic transaction: use updateMany with WHERE condition to prevent race condition
    // Only one agent can win because updateMany checks assignedAgentId IS NULL at the DB level
    const result = await prisma.$transaction(async (tx) => {
      // Atomically claim the order — only succeeds if no agent is assigned yet
      const orderUpdate = await tx.orderGroup.updateMany({
        where: {
          id: orderId,
          assignedAgentId: null,
          status: "ASSIGNED",
        },
        data: {
          assignedAgentId: agentId,
          status: "ON_THEWAY",
          ...(agentAddr && { agentAddress: agentAddr.id }),
        },
      });

      if (orderUpdate.count === 0) {
        // Someone else already accepted — mark ours as declined
        await tx.orderAssignment.update({
          where: { id: assignment.id },
          data: { status: "DECLINED" },
        });
        return null; // signal conflict
      }

      // Mark this assignment as ACCEPTED
      await tx.orderAssignment.update({
        where: { id: assignment.id },
        data: { status: "ACCEPTED" },
      });

      // Decline all other PENDING assignments for this order
      await tx.orderAssignment.updateMany({
        where: { orderId, agentId: { not: agentId }, status: "PENDING" },
        data: { status: "DECLINED" },
      });

      return tx.orderGroup.findUnique({ where: { id: orderId } });
    });

    if (!result) {
      return res
        .status(409)
        .json({ error: "order already accepted by another agent" });
    }

    res.json({ order: result });
  } catch {
    res.status(500).json({ error: "Something went wrong" });
  }
});

// ─── 3. Decline an assigned order ──────────────────────────────────────
router.patch("/jobs/:orderId/decline", async (req, res) => {
  try {
    const agentId = req.user!.id;
    const orderId = parseInt(req.params.orderId);
    if (isNaN(orderId))
      return res.status(400).json({ error: "invalid order id" });

    // Check this agent has a PENDING assignment
    const assignment = await prisma.orderAssignment.findUnique({
      where: { orderId_agentId: { orderId, agentId } },
    });
    if (!assignment || assignment.status !== "PENDING") {
      return res
        .status(404)
        .json({ error: "no pending assignment found for this order" });
    }

    // Mark this assignment as DECLINED
    await prisma.orderAssignment.update({
      where: { id: assignment.id },
      data: { status: "DECLINED" },
    });

    // Check if ALL assignments for this order are now DECLINED
    const remaining = await prisma.orderAssignment.count({
      where: { orderId, status: "PENDING" },
    });

    if (remaining === 0) {
      // All agents declined — revert order to PENDING so admin can re-assign
      await prisma.orderGroup.update({
        where: { id: orderId },
        data: { status: "PENDING", assignedAgentId: null },
      });

      // Notify admin via the user's notification (or a log)
      const order = await prisma.orderGroup.findUnique({
        where: { id: orderId },
      });
      if (order) {
        await prisma.notification.create({
          data: {
            userId: order.userId,
            message: `All agents declined order #${orderId}`,
            description: `The order is back to pending. Admin will reassign.`,
          },
        });
      }
    }

    const updated = await prisma.orderGroup.findUnique({
      where: { id: orderId },
    });
    res.json({ order: updated });
  } catch {
    res.status(500).json({ error: "Something went wrong" });
  }
});

// ─── 4. Update order status (forward-only transitions) ─────────────────
router.patch("/jobs/:orderId/status", async (req, res) => {
  try {
    const agentId = req.user!.id;
    const orderId = parseInt(req.params.orderId);
    if (isNaN(orderId))
      return res.status(400).json({ error: "invalid order id" });

    const { status } = req.body as { status?: string };
    const allowed = ["ON_THEWAY", "IN_PROGRESS", "COMPLETED"] as const;
    if (!status || !allowed.includes(status as (typeof allowed)[number])) {
      return res
        .status(400)
        .json({ error: `status must be one of: ${allowed.join(", ")}` });
    }

    const order = await prisma.orderGroup.findFirst({
      where: { id: orderId, assignedAgentId: agentId },
    });
    if (!order) return res.status(404).json({ error: "order not found" });

    const flow: Record<string, string[]> = {
      ASSIGNED: ["ON_THEWAY"],
      ON_THEWAY: ["IN_PROGRESS"],
      IN_PROGRESS: ["COMPLETED"],
    };
    const nextAllowed = flow[order.status] ?? [];
    if (!nextAllowed.includes(status)) {
      return res
        .status(400)
        .json({ error: `cannot move from ${order.status} to ${status}` });
    }

    const updated = await prisma.orderGroup.update({
      where: { id: orderId },
      data: { status: status as any },
    });

    res.json({ order: updated });
  } catch {
    res.status(500).json({ error: "Something went wrong" });
  }
});

// ─── 5. Request extra material (user must approve) ─────────────────────
router.post("/jobs/:orderId/extra-material", async (req, res) => {
  try {
    const agentId = req.user!.id;
    const orderId = parseInt(req.params.orderId);
    if (isNaN(orderId))
      return res.status(400).json({ error: "invalid order id" });

    const order = await prisma.orderGroup.findFirst({
      where: {
        id: orderId,
        assignedAgentId: agentId,
        status: { in: ["ASSIGNED", "ON_THEWAY", "IN_PROGRESS"] },
      },
    });
    if (!order)
      return res
        .status(404)
        .json({ error: "order not found or not in an active state" });

    const { name, description } = req.body as {
      name?: string;
      quantity?: number;
      price?: number;
      description?: string;
    };

    const quantity = Math.floor(Number(req.body.quantity));
    const price = Number(req.body.price);

    if (!name || !name.trim()) {
      return res.status(400).json({ error: "name is required" });
    }
    if (!quantity || quantity < 1 || isNaN(quantity)) {
      return res
        .status(400)
        .json({ error: "quantity must be a positive integer" });
    }
    if (!price || price <= 0 || isNaN(price)) {
      return res.status(400).json({ error: "price must be a positive number" });
    }

    const material = await prisma.extraMaterial.create({
      data: {
        name: name.trim(),
        quantity,
        price,
        description: description ?? null,
        // paymentMethod is null — user chooses CASH/ONLINE at approval time
        groupId: orderId,
        addedByAgentId: agentId,
        // approvalStatus defaults to PENDING via schema
        paid: false,
      },
    });

    // notify the user
    await prisma.notification.create({
      data: {
        userId: order.userId,
        message: `Agent requested extra material: ${name} (₹${price} × ${quantity})`,
        description: `Order #${orderId} — please approve or decline.`,
      },
    });

    res.status(201).json({ material });
  } catch {
    res.status(500).json({ error: "Something went wrong" });
  }
});

// ─── 5b. Verify cash payment received for extra material ───────────────
router.patch(
  "/jobs/:orderId/extra-material/:materialId/verify-payment",
  async (req, res) => {
    try {
      const agentId = req.user!.id;
      const orderId = parseInt(req.params.orderId);
      const materialId = parseInt(req.params.materialId);

      if (isNaN(orderId) || isNaN(materialId)) {
        return res.status(400).json({ error: "invalid ids" });
      }

      // Verify the order is assigned to this agent
      const order = await prisma.orderGroup.findFirst({
        where: { id: orderId, assignedAgentId: agentId },
      });
      if (!order) return res.status(404).json({ error: "order not found" });

      // Verify material belongs to this order
      const material = await prisma.extraMaterial.findFirst({
        where: { id: materialId, groupId: orderId },
      });
      if (!material)
        return res.status(404).json({ error: "extra material not found" });

      // Can only verify APPROVED + CASH + not-yet-paid materials
      if (material.approvalStatus !== "APPROVED") {
        return res
          .status(400)
          .json({ error: "material not yet approved by user" });
      }
      if (material.paymentMethod !== "CASH") {
        return res
          .status(400)
          .json({ error: "only cash payments need agent verification" });
      }
      if (material.paid) {
        return res.status(400).json({ error: "payment already verified" });
      }

      const updated = await prisma.extraMaterial.update({
        where: { id: materialId },
        data: { paid: true },
      });

      res.json({ material: updated });
    } catch {
      res.status(500).json({ error: "Something went wrong" });
    }
  },
);

// ─── 6. Toggle online / offline ────────────────────────────────────────
router.patch("/availability", async (req, res) => {
  try {
    const agentId = req.user!.id;

    const agent = await prisma.agent.findUnique({ where: { id: agentId } });
    if (!agent) return res.status(404).json({ error: "agent not found" });

    // If agent is trying to go offline, check for ongoing tasks
    if (agent.isAvailable) {
      const ongoingTasks = await prisma.orderGroup.count({
        where: {
          assignedAgentId: agentId,
          status: { in: ["ON_THEWAY", "IN_PROGRESS"] },
        },
      });

      if (ongoingTasks > 0) {
        return res.status(400).json({
          error: "Can't go offline during an ongoing task. Please complete your active jobs first.",
        });
      }
    }

    const updated = await prisma.agent.update({
      where: { id: agentId },
      data: { isAvailable: !agent.isAvailable },
    });

    res.json({ isAvailable: updated.isAvailable });
  } catch {
    res.status(500).json({ error: "Something went wrong" });
  }
});

// ─── 7. Profile ────────────────────────────────────────────────────────
router.get("/profile", async (req, res) => {
  try {
    const agentId = req.user!.id;

    const agent = await prisma.agent.findUnique({
      where: { id: agentId },
      include: {
        address: true,
        bankDetails: true,
        categories: {
          include: {
            category: { select: { id: true, name: true, slug: true } },
          },
          orderBy: { id: "asc" },
        },
        documents: {
          include: {
            requirement: {
              select: {
                id: true,
                name: true,
                categoryId: true,
                category: { select: { id: true, name: true, slug: true } },
              },
            },
          },
          orderBy: { updatedAt: "desc" },
        },
      },
    });
    if (!agent) return res.status(404).json({ error: "agent not found" });

    const { password: _, ...safe } = agent;
    res.json({ agent: safe });
  } catch {
    res.status(500).json({ error: "Something went wrong" });
  }
});

// ─── 8. Update bank details ───────────────────────────────────────────
router.put("/bank-details", async (req, res) => {
  try {
    const agentId = req.user!.id;
    const { accountNumber, holderName, ifscCode, bankName } = req.body as {
      accountNumber?: string;
      holderName?: string;
      ifscCode?: string;
      bankName?: string;
    };

    if (!accountNumber || !holderName || !ifscCode || !bankName) {
      return res.status(400).json({ error: "all bank fields are required" });
    }

    const bank = await prisma.bankDetails.upsert({
      where: { agentId },
      update: { accountNumber, holderName, ifscCode, bankName },
      create: { agentId, accountNumber, holderName, ifscCode, bankName },
    });

    res.json({ bankDetails: bank });
  } catch {
    res.status(500).json({ error: "Something went wrong" });
  }
});

// ─── 9. My jobs (with optional status filter + pagination) ─────────────
router.get("/jobs", async (req, res) => {
  try {
    const agentId = req.user!.id;
    const statusFilter = req.query.status as string | undefined;
    const cursor = req.query.cursor ? Number(req.query.cursor) : undefined;

    const where: any = { assignedAgentId: agentId };
    if (statusFilter) where.status = statusFilter;

    const jobs = await prisma.orderGroup.findMany({
      where,
      include: {
        addressUser: { select: { address: true, pin: true, city: true } },
        orders: {
          include: { subservice: { select: { name: true, price: true } } },
        },
        user: { select: { id: true, email: true } },
        extraMaterials: {
          select: {
            id: true,
            name: true,
            quantity: true,
            price: true,
            description: true,
            approvalStatus: true,
            paid: true,
            paymentMethod: true,
            createdAt: true,
          },
          orderBy: { createdAt: "asc" },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 10,
      ...(cursor && { cursor: { id: cursor }, skip: 1 }),
    });

    const nextCursor = jobs.length === 10 ? jobs[jobs.length - 1]?.id : null;
    res.json({ jobs, nextCursor });
  } catch {
    res.status(500).json({ error: "Something went wrong" });
  }
});

// ─── 10. Earnings summary ─────────────────────────────────────────────
router.get("/earnings", async (req, res) => {
  try {
    const agentId = req.user!.id;
    const month = req.query.month
      ? Number(req.query.month)
      : new Date().getMonth() + 1;
    const year = req.query.year
      ? Number(req.query.year)
      : new Date().getFullYear();

    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 1);

    const completedOrders = await prisma.orderGroup.findMany({
      where: {
        assignedAgentId: agentId,
        status: "COMPLETED",
        createdAt: { gte: startDate, lt: endDate },
      },
      include: {
        payments: true,
        extraMaterials: { where: { approvalStatus: "APPROVED", paid: true } },
      },
    });

    let totalEarnings = 0;
    let serviceEarnings = 0;
    let extraEarnings = 0;
    let codCollected = 0;
    let onlineCollected = 0;

    for (const order of completedOrders) {
      const orderTotal = order.totalPrice ?? 0;
      const extraTotal = order.extraMaterials.reduce(
        (sum, m) => sum + m.price * m.quantity,
        0,
      );
      serviceEarnings += orderTotal;
      extraEarnings += extraTotal;
      totalEarnings += orderTotal + extraTotal;

      for (const p of order.payments) {
        if (p.method === "CASH") codCollected += p.amount;
        else onlineCollected += p.amount;
      }
    }

    // Commission is ONLY on service earnings (not extra materials)
    const commission = serviceEarnings * 0.05;
    const netPayable = totalEarnings - commission;

    // Get previous month carry-over
    const prevMonth = month === 1 ? 12 : month - 1;
    const prevYear = month === 1 ? year - 1 : year;
    const prevSettlement = await prisma.monthlySettlement.findUnique({
      where: {
        agentId_month_year: { agentId, month: prevMonth, year: prevYear },
      },
    });
    const previousCarry = prevSettlement?.carryOver ?? 0;

    const settlement = await prisma.monthlySettlement.findUnique({
      where: { agentId_month_year: { agentId, month, year } },
    });

    res.json({
      month,
      year,
      completedOrderCount: completedOrders.length,
      totalEarnings,
      serviceEarnings,
      extraEarnings,
      commission,
      netPayable,
      codCollected,
      onlineCollected,
      previousCarry,
      amountToSend: Math.max(0, netPayable - previousCarry - codCollected),
      carryOver: Math.max(0, codCollected - (netPayable - previousCarry)),
      settlement: settlement ?? null,
    });
  } catch {
    res.status(500).json({ error: "Something went wrong" });
  }
});

// ─── 11. Get agent categories & verification status ────────────────────
router.get("/categories", async (req, res) => {
  try {
    const agentId = req.user!.id;
    const categoriesRaw = await prisma.agentCategory.findMany({
      where: { agentId },
      include: {
        category: {
          select: {
            id: true,
            name: true,
            slug: true,
            documentRequirements: {
              select: {
                id: true,
                name: true,
                description: true,
                isRequired: true,
              },
            },
          },
        },
      },
      orderBy: { id: "asc" },
    });

    // Also include agent documents for each category
    const documents = await prisma.agentDocument.findMany({
      where: { agentId },
      include: {
        requirement: {
          select: {
            id: true,
            name: true,
            categoryId: true,
            category: { select: { id: true, name: true, slug: true } },
          },
        },
      },
      orderBy: { updatedAt: "desc" },
    });

    const categories = categoriesRaw.map((ac) => ({
      ...ac,
      documents: documents.filter(
        (d) => d.requirement.categoryId === ac.categoryId,
      ),
    }));

    res.json({ categories, documents });
  } catch {
    res.status(500).json({ error: "Something went wrong" });
  }
});

// ─── 11b. Agent notifications (synthetic feed from events) ───────────
router.get("/notifications", async (req, res) => {
  try {
    const agentId = req.user!.id;

    const [pendingAssignments, decidedMaterials, decidedDocs, decidedCats] =
      await Promise.all([
        prisma.orderAssignment.findMany({
          where: { agentId, status: "PENDING" },
          include: {
            orderGroup: {
              select: {
                id: true,
                totalPrice: true,
                servicetime: true,
                createdAt: true,
              },
            },
          },
          orderBy: { createdAt: "desc" },
        }),
        prisma.extraMaterial.findMany({
          where: {
            addedByAgentId: agentId,
            approvalStatus: { in: ["APPROVED", "REJECTED"] },
          },
          include: {
            orderGroup: {
              select: {
                id: true,
                user: { select: { email: true } },
              },
            },
          },
          orderBy: { createdAt: "desc" },
        }),
        prisma.agentDocument.findMany({
          where: {
            agentId,
            status: { in: ["APPROVED", "REJECTED"] },
          },
          include: {
            requirement: {
              select: {
                id: true,
                name: true,
                category: { select: { id: true, name: true } },
              },
            },
          },
          orderBy: { updatedAt: "desc" },
        }),
        prisma.agentCategory.findMany({
          where: {
            agentId,
            OR: [{ isVerified: true }, { rejectionNote: { not: null } }],
          },
          include: {
            category: { select: { id: true, name: true, slug: true } },
          },
          orderBy: { id: "asc" },
        }),
      ]);

    const notifications = [
      ...pendingAssignments.map((a) => ({
        id: `assignment-${a.id}`,
        kind: "TASK_ASSIGNED",
        message: `New task assigned: Order #${a.orderId}`,
        description: `Order value ₹${a.orderGroup.totalPrice ?? 0}. Please accept or decline.`,
        createdAt: a.createdAt,
      })),
      ...decidedMaterials.map((m) => ({
        id: `material-${m.id}-${m.approvalStatus}`,
        kind: "EXTRA_MATERIAL_DECISION",
        message:
          m.approvalStatus === "APPROVED"
            ? `User approved extra material: ${m.name}`
            : `User rejected extra material: ${m.name}`,
        description: `Order #${m.groupId} · ${m.quantity} × ₹${m.price}${m.orderGroup?.user?.email ? ` · ${m.orderGroup.user.email}` : ""}`,
        createdAt: m.createdAt,
      })),
      ...decidedDocs.map((d) => ({
        id: `doc-${d.id}-${d.status}-${d.updatedAt.getTime()}`,
        kind: "DOCUMENT_REVIEW",
        message:
          d.status === "APPROVED"
            ? `${d.requirement.category.name}: ${d.requirement.name} approved`
            : `${d.requirement.category.name}: ${d.requirement.name} rejected`,
        description:
          d.status === "REJECTED"
            ? d.rejectionNote || "Rejected by admin"
            : "Your document has been approved.",
        createdAt: d.updatedAt,
      })),
      ...decidedCats.map((c) => ({
        id: `category-${c.id}-${c.isVerified ? "approved" : "rejected"}`,
        kind: "CATEGORY_REVIEW",
        message: c.isVerified
          ? `Category approved: ${c.category.name}`
          : `Category rejected: ${c.category.name}`,
        description: c.isVerified
          ? "You can accept jobs for this category."
          : c.rejectionNote || "Rejected by admin",
        createdAt: c.createdAt,
      })),
    ]
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, 100);

    res.json({ notifications });
  } catch {
    res.status(500).json({ error: "Something went wrong" });
  }
});

// ─── 12. Upload document for a requirement ─────────────────────────────
router.post(
  "/documents/:requirementId",
  upload.single("document"),
  async (req, res) => {
    try {
      const agentId = req.user!.id;
      const requirementId = parseInt(req.params.requirementId);
      if (isNaN(requirementId))
        return res.status(400).json({ error: "invalid requirement id" });

      const file = req.file;
      if (!file)
        return res.status(400).json({ error: "document file is required" });

      // Verify requirement exists
      const requirement = await prisma.documentRequirement.findUnique({
        where: { id: requirementId },
      });
      if (!requirement)
        return res.status(404).json({ error: "requirement not found" });

      // Verify agent has this category
      const agentCategory = await prisma.agentCategory.findFirst({
        where: { agentId, categoryId: requirement.categoryId },
      });
      if (!agentCategory)
        return res
          .status(403)
          .json({ error: "you are not registered for this category" });

      // Reuse this upload for all requirements with the same name
      // across the agent's selected categories (case-insensitive).
      const sameNameRequirements = await prisma.documentRequirement.findMany({
        where: {
          name: { equals: requirement.name, mode: "insensitive" },
          category: {
            agentCategories: {
              some: { agentId },
            },
          },
        },
        select: { id: true },
      });

      const targetRequirementIds =
        sameNameRequirements.length > 0
          ? sameNameRequirements.map((r) => r.id)
          : [requirementId];

      // Check existing docs for retry limit and prepare per-requirement update logic
      const existingDocs = await prisma.agentDocument.findMany({
        where: {
          agentId,
          requirementId: { in: targetRequirementIds },
        },
      });

      const existingByRequirement = new Map(
        existingDocs.map((d) => [d.requirementId, d]),
      );

      const maxRetry = 5;
      const lockedRequirementIds = targetRequirementIds.filter((rid) => {
        const doc = existingByRequirement.get(rid);
        return (
          !!doc && doc.status === "REJECTED" && doc.resubmitCount >= maxRetry
        );
      });

      if (lockedRequirementIds.length > 0) {
        return res.status(400).json({
          error: `Maximum re-upload limit reached (${maxRetry}) for one or more rejected documents`,
          lockedRequirementIds,
        });
      }

      // Upload to Cloudinary
      const agent = await prisma.agent.findUnique({ where: { id: agentId } });
      const ts = Date.now();
      const url = await uploadToCloudinary(
        file.buffer,
        "urban/agents/documents",
        `agent_${(agent?.email ?? "unknown").replace(/[^a-z0-9]/gi, "_")}_doc_${requirementId}_${ts}`,
      );

      // Upsert for all same-name requirements (single upload, reused docs)
      const docs = await prisma.$transaction(
        targetRequirementIds.map((rid) =>
          prisma.agentDocument.upsert({
            where: { agentId_requirementId: { agentId, requirementId: rid } },
            update: {
              url,
              status: "PENDING",
              rejectionNote: null,
              resubmitCount:
                existingByRequirement.get(rid)?.status === "REJECTED"
                  ? (existingByRequirement.get(rid)?.resubmitCount ?? 0) + 1
                  : (existingByRequirement.get(rid)?.resubmitCount ?? 0),
            },
            create: { agentId, requirementId: rid, url },
          }),
        ),
      );

      res.status(201).json({
        message: "Document uploaded",
        appliedToRequirementIds: targetRequirementIds,
        documents: docs,
      });
    } catch (err) {
      console.error("Document upload error:", err);
      res.status(500).json({ error: "Something went wrong" });
    }
  },
);

export default router;
