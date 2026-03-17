import { Router } from "express";
import { prisma } from "../../db/index.ts";
import { userMiddleware } from "../middleware/user.middleware.ts";
const router = Router();

const normalizeCityName = (value: string) =>
  value
    .toLowerCase()
    .split(",")[0]
    ?.replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim() || "";
//
// user can approve or reject a request from the plubmer / electrician
// user can order
// user can view all the request
// user can view all the orders
router.use(userMiddleware);
// Placeholder route for user-related operations

// Get user orders with pagination is this url correct ?
router.get("/orders", async (req, res) => {
  try {
    const userId = req.user!.id;

    if (!userId) {
      return res.status(400).json({ error: "user id not present" });
    }

    const cursor = req.query.cursor ? Number(req.query.cursor) : undefined;

    const orders = await prisma.orderGroup.findMany({
      where: {
        userId,
      },

      include: {
        addressUser: {
          select: {
            id: true,
            address: true,
            pin: true,
            city: true,
          },
        },
        agent: {
          select: {
            name: true,
            type: true,
          },
        },
      },

      orderBy: [
        { createdAt: "desc" }, //
        { id: "desc" },
      ],

      take: 10,

      ...(cursor && {
        cursor: { id: cursor },
        skip: 1,
      }),
    });

    // send next cursor
    const nextCursor =
      orders.length === 10 ? orders[orders.length - 1]?.id : null;

    res.json({
      orders,
      nextCursor,
    });
  } catch (err) {
    res.status(500).json({ error: "Something went wrong" });
  }
});

router.get("/orderdetails/:orderId", async (req, res) => {
  try {
    const userId = req.user!.id;
    const orderId = parseInt(req.params.orderId);

    if (!userId) {
      return res.status(400).json({ message: "user not present" });
    }

    if (isNaN(orderId)) {
      return res.status(400).json({ message: "invalid order id" });
    }

    const orderDetails = await prisma.orderGroup.findFirst({
      where: {
        id: orderId,
        userId,
      },
      include: {
        addressUser: {
          select: {
            id: true,
            address: true,
            pin: true,
            city: true,
          },
        },
        orders: {
          include: {
            subservice: {
              select: {
                id: true,
                name: true,
                price: true,
                description: true,
              },
            },
          },
        },
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
            addedByAgent: {
              select: {
                name: true,
              },
            },
          },
        },
        payments: {
          select: {
            id: true,
            amount: true,
            method: true,
            transactionId: true,
            note: true,
            createdAt: true,
          },
          orderBy: { createdAt: "asc" },
        },
        agent: {
          select: {
            id: true,
            name: true,
            type: true,
            rating: true,
            profilepic: true,
          },
        },
      },
    });

    if (!orderDetails) {
      return res.status(404).json({ message: "order not found" });
    }

    // compute payment summary
    const totalPaid = orderDetails.payments.reduce(
      (sum, p) => sum + p.amount,
      0,
    );
    const extraMaterialTotal = orderDetails.extraMaterials.reduce(
      (sum, m) => sum + m.price * m.quantity,
      0,
    );

    res.json({
      order: orderDetails,
      summary: {
        extraMaterialTotal,
        totalPaid,
      },
    });
  } catch (err) {
    res.status(500).json({ error: "Something went wrong" });
  }
});

// Create a new order
router.post("/orders", async (req, res) => {
  try {
    const userId = req.user!.id;

    if (!userId) {
      return res.status(400).json({ error: "user id not present" });
    }

    const {
      name,
      description,
      servicetime,
      services,
      addressId,
      addressIndex,
    } = req.body as {
      name?: string;
      description?: string;
      servicetime: string;
      services: { subserviceId: number; serviceCharge: number }[];
      addressId?: number;
      addressIndex?: number;
    };

    // validate required fields
    if (!servicetime) {
      return res.status(400).json({ error: "servicetime is required" });
    }

    if (!services || !Array.isArray(services) || services.length === 0) {
      return res
        .status(400)
        .json({ error: "at least one service is required" });
    }

    // Resolve which user address should be used for this order.
    // Preferred: explicit `addressId` (Address.id). Alternative: `addressIndex` into the user's address list.
    const resolvedAddressIndex =
      addressIndex === undefined ? 0 : Number(addressIndex);

    let userAddressId: number;
    if (addressId !== undefined) {
      const addressRow = await prisma.address.findFirst({
        where: { id: Number(addressId), userId },
        select: { id: true },
      });

      if (!addressRow) {
        return res.status(400).json({
          error:
            "invalid addressId (address not found for this user). Use /profile to add one.",
        });
      }

      userAddressId = addressRow.id;
    } else {
      if (!Number.isInteger(resolvedAddressIndex) || resolvedAddressIndex < 0) {
        return res
          .status(400)
          .json({ error: "addressIndex must be a non-negative integer" });
      }

      const addresses = await prisma.address.findMany({
        where: { userId },
        orderBy: { id: "asc" },
        select: { id: true },
      });

      if (addresses.length === 0) {
        return res.status(400).json({
          error: "no address found for user. Add address first using /profile",
        });
      }

      if (resolvedAddressIndex >= addresses.length) {
        return res.status(400).json({
          error: `addressIndex out of range. You have ${addresses.length} address(es).`,
        });
      }

      const selected = addresses[resolvedAddressIndex];
      if (!selected) {
        return res.status(400).json({
          error: "invalid addressIndex",
        });
      }

      userAddressId = selected.id;
    }

    // validate all subserviceIds exist
    const subserviceIds = services.map((s) => s.subserviceId);
    const existingServices = await prisma.subservice.findMany({
      where: { id: { in: subserviceIds } },
      select: { id: true },
    });

    if (existingServices.length !== subserviceIds.length) {
      const found = new Set(existingServices.map((s) => s.id));
      const missing = subserviceIds.filter((id) => !found.has(id));
      return res
        .status(400)
        .json({ error: `subservice ids not found: ${missing.join(", ")}` });
    }

    // compute total price
    const totalPrice = services.reduce((sum, s) => sum + s.serviceCharge, 0);

    // explicit transaction: create OrderGroup + Orders atomically
    const order = await prisma.$transaction(async (tx) => {
      const orderGroup = await tx.orderGroup.create({
        data: {
          userId,
          userAddress: userAddressId,
          name,
          description,
          servicetime: new Date(servicetime),
          totalPrice,
        },
      });

      await tx.orders.createMany({
        data: services.map((s) => ({
          subserviceId: s.subserviceId,
          serviceCharge: s.serviceCharge,
          groupId: orderGroup.id,
        })),
      });

      // return full order with relations
      return tx.orderGroup.findUnique({
        where: { id: orderGroup.id },
        include: {
          addressUser: {
            select: {
              id: true,
              address: true,
              pin: true,
              city: true,
            },
          },
          orders: {
            include: {
              subservice: {
                select: {
                  name: true,
                  price: true,
                },
              },
            },
          },
        },
      });
    });

    res.status(201).json({ order });
  } catch (err) {
    res.status(500).json({ error: "Something went wrong" });
  }
});

// Cancel an order (only if still PENDING)
router.patch("/orders/:orderId/cancel", async (req, res) => {
  try {
    const userId = req.user!.id;
    const orderId = parseInt(req.params.orderId);

    if (isNaN(orderId)) {
      return res.status(400).json({ error: "invalid order id" });
    }

    const order = await prisma.orderGroup.findFirst({
      where: { id: orderId, userId },
      select: { id: true, status: true, paymentStatus: true },
    });

    if (!order) {
      return res.status(404).json({ error: "order not found" });
    }

    if (order.status !== "PENDING") {
      return res
        .status(400)
        .json({ error: "only pending orders can be cancelled" });
    }

    const updated = await prisma.orderGroup.update({
      where: { id: orderId },
      data: { status: "CANCELLED" },
    });

    res.json({ order: updated });
  } catch (err) {
    res.status(500).json({ error: "Something went wrong" });
  }
});

// Get user profile
router.get("/profile", async (req, res) => {
  try {
    const userId = req.user!.id;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        address: { orderBy: { id: "asc" } },
      },
    });

    if (!user) {
      return res.status(404).json({ error: "user not found" });
    }

    const primaryAddress = user.address[0] ?? null;

    res.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        phone: user.phone,
        profilepic: user.profilepic,
        createdAt: user.createdAt,
        address: primaryAddress?.address ?? null,
        pin: primaryAddress?.pin ?? null,
        city: primaryAddress?.city ?? null,
        addresses: user.address,
      },
    });
  } catch (err) {
    res.status(500).json({ error: "Something went wrong" });
  }
});

// Update user profile
router.put("/profile", async (req, res) => {
  try {
    const userId = req.user!.id;

    const { address, pin, city, name, phone } = req.body as {
      address?: string;
      pin?: string;
      city?: string;
      name?: string;
      phone?: string;
    };

    if (!address && !pin && !city && !name && phone === undefined) {
      return res
        .status(400)
        .json({ error: "provide at least one field to update" });
    }

    // Update user name and/or phone if provided
    const userData: any = {};
    if (name) userData.name = name;
    if (phone !== undefined) userData.phone = phone || null;
    if (Object.keys(userData).length > 0) {
      await prisma.user.update({ where: { id: userId }, data: userData });
    }

    // If address fields provided, update primary address (backward compat)
    if (address || pin || city) {
      const existingAddress = await prisma.address.findFirst({
        where: { userId },
        orderBy: { id: "asc" },
      });

      if (!existingAddress) {
        if (!address || !pin) {
          return res.status(400).json({
            error: "address and pin are required to create your first address",
          });
        }

        await prisma.address.create({
          data: {
            userId,
            address,
            pin,
            ...(city && { city }),
            label: "Home",
            isUser: true,
          },
        });
      } else {
        await prisma.address.update({
          where: { id: existingAddress.id },
          data: {
            ...(address && { address }),
            ...(pin && { pin }),
            ...(city && { city }),
          },
        });
      }
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { address: { orderBy: { id: "asc" } } },
    });

    if (!user) {
      return res.status(404).json({ error: "user not found" });
    }

    const primaryAddress = user.address[0] ?? null;

    res.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        phone: user.phone,
        profilepic: user.profilepic,
        createdAt: user.createdAt,
        address: primaryAddress?.address ?? null,
        pin: primaryAddress?.pin ?? null,
        city: primaryAddress?.city ?? null,
        addresses: user.address,
      },
    });
  } catch (err) {
    res.status(500).json({ error: "Something went wrong" });
  }
});

// ═══════════════════════════════════════════════════════════════════════
//  ADDRESS CRUD (multi-address)
// ═══════════════════════════════════════════════════════════════════════

// List all addresses
router.get("/addresses", async (req, res) => {
  try {
    const userId = req.user!.id;
    const addresses = await prisma.address.findMany({
      where: { userId },
      orderBy: { id: "asc" },
    });
    res.json({ addresses });
  } catch {
    res.status(500).json({ error: "Something went wrong" });
  }
});

// Add a new address
router.post("/addresses", async (req, res) => {
  try {
    const userId = req.user!.id;
    const { address, pin, city, label } = req.body as {
      address?: string;
      pin?: string;
      city?: string;
      label?: string;
    };

    if (!address || !pin) {
      return res.status(400).json({ error: "address and pin are required" });
    }

    const created = await prisma.address.create({
      data: {
        userId,
        address,
        pin,
        city: city ?? null,
        label: label || "Other",
        isUser: true,
      },
    });

    res.status(201).json({ address: created });
  } catch {
    res.status(500).json({ error: "Something went wrong" });
  }
});

// Update an address
router.put("/addresses/:addressId", async (req, res) => {
  try {
    const userId = req.user!.id;
    const addressId = parseInt(req.params.addressId);
    if (isNaN(addressId))
      return res.status(400).json({ error: "invalid address id" });

    const existing = await prisma.address.findFirst({
      where: { id: addressId, userId },
    });
    if (!existing) return res.status(404).json({ error: "address not found" });

    const { address, pin, city, label } = req.body as {
      address?: string;
      pin?: string;
      city?: string;
      label?: string;
    };

    const updated = await prisma.address.update({
      where: { id: addressId },
      data: {
        ...(address && { address }),
        ...(pin && { pin }),
        ...(city !== undefined && { city: city || null }),
        ...(label && { label }),
      },
    });

    res.json({ address: updated });
  } catch {
    res.status(500).json({ error: "Something went wrong" });
  }
});

// Delete an address
router.delete("/addresses/:addressId", async (req, res) => {
  try {
    const userId = req.user!.id;
    const addressId = parseInt(req.params.addressId);
    if (isNaN(addressId))
      return res.status(400).json({ error: "invalid address id" });

    const existing = await prisma.address.findFirst({
      where: { id: addressId, userId },
    });
    if (!existing) return res.status(404).json({ error: "address not found" });

    // Don't allow deleting the last address
    const count = await prisma.address.count({ where: { userId } });
    if (count <= 1) {
      return res.status(400).json({ error: "cannot delete your only address" });
    }

    // Check if address is used in any order
    const usedInOrder = await prisma.orderGroup.findFirst({
      where: { userAddress: addressId },
      select: { id: true },
    });
    if (usedInOrder) {
      return res
        .status(400)
        .json({ error: "cannot delete address used in orders" });
    }

    await prisma.address.delete({ where: { id: addressId } });
    res.json({ deleted: true });
  } catch {
    res.status(500).json({ error: "Something went wrong" });
  }
});

// Get user notifications with pagination
router.get("/notifications", async (req, res) => {
  try {
    const userId = req.user!.id;
    const cursor = req.query.cursor ? Number(req.query.cursor) : undefined;

    const notifications = await prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 20,
      ...(cursor && {
        cursor: { id: cursor },
        skip: 1,
      }),
    });

    const nextCursor =
      notifications.length === 20
        ? notifications[notifications.length - 1]?.id
        : null;

    res.json({ notifications, nextCursor });
  } catch (err) {
    res.status(500).json({ error: "Something went wrong" });
  }
});

// Mark a notification as read
router.patch("/notifications/:notifId/read", async (req, res) => {
  try {
    const userId = req.user!.id;
    const notifId = parseInt(req.params.notifId);

    if (isNaN(notifId)) {
      return res.status(400).json({ error: "invalid notification id" });
    }

    const notif = await prisma.notification.findFirst({
      where: { id: notifId, userId },
    });

    if (!notif) {
      return res.status(404).json({ error: "notification not found" });
    }

    const updated = await prisma.notification.update({
      where: { id: notifId },
      data: { isRead: true },
    });

    res.json({ notification: updated });
  } catch (err) {
    res.status(500).json({ error: "Something went wrong" });
  }
});

// Mark all notifications as read
router.patch("/notifications/read-all", async (req, res) => {
  try {
    const userId = req.user!.id;

    const result = await prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });

    res.json({ markedRead: result.count });
  } catch (err) {
    res.status(500).json({ error: "Something went wrong" });
  }
});

// ═══════════════════════════════════════════════════════════════════════
//  CITY AVAILABILITY
// ═══════════════════════════════════════════════════════════════════════

// Check if a city is serviceable
router.get("/cities/check", async (req, res) => {
  try {
    const rawCityName = (req.query.city as string)?.trim();
    const cityName = rawCityName ? normalizeCityName(rawCityName) : "";
    if (!cityName)
      return res.status(400).json({ error: "city query param is required" });

    const activeCities = await prisma.city.findMany({
      where: { isActive: true },
      select: { id: true, name: true, state: true, isActive: true },
    });

    const city = activeCities.find((c) => {
      const normalizedDbCity = normalizeCityName(c.name);
      return (
        normalizedDbCity === cityName ||
        cityName.startsWith(`${normalizedDbCity} `) ||
        cityName.endsWith(` ${normalizedDbCity}`)
      );
    });

    if (!city) {
      return res.json({
        available: false,
        message: "Service is not available in your city yet",
      });
    }

    res.json({ available: true, city });
  } catch {
    res.status(500).json({ error: "Something went wrong" });
  }
});

// City name suggestions (autocomplete while typing)
router.get("/cities/suggest", async (req, res) => {
  try {
    const q = (req.query.q as string)?.trim().toLowerCase();
    if (!q) return res.json({ suggestions: [] });

    const cities = await prisma.city.findMany({
      where: { name: { startsWith: q }, isActive: true },
      take: 10,
      orderBy: { name: "asc" },
      select: { id: true, name: true, state: true },
    });

    res.json({ suggestions: cities });
  } catch {
    res.status(500).json({ error: "Something went wrong" });
  }
});

// ═══════════════════════════════════════════════════════════════════════
//  APPROVE / REJECT EXTRA MATERIAL REQUESTED BY AGENT
// ═══════════════════════════════════════════════════════════════════════

router.patch(
  "/orders/:orderId/extra-materials/:materialId/approve",
  async (req, res) => {
    try {
      const userId = req.user!.id;
      const orderId = parseInt(req.params.orderId);
      const materialId = parseInt(req.params.materialId);

      if (isNaN(orderId) || isNaN(materialId)) {
        return res.status(400).json({ error: "invalid ids" });
      }

      // verify order belongs to user
      const order = await prisma.orderGroup.findFirst({
        where: { id: orderId, userId },
      });
      if (!order) return res.status(404).json({ error: "order not found" });

      // verify material belongs to this order
      const material = await prisma.extraMaterial.findFirst({
        where: { id: materialId, groupId: orderId },
      });
      if (!material)
        return res.status(404).json({ error: "extra material not found" });

      // Immutability: only PENDING materials can be approved
      if (material.approvalStatus !== "PENDING") {
        return res.status(400).json({
          error: `material already ${material.approvalStatus.toLowerCase()} — decision cannot be changed`,
        });
      }

      const { paymentMethod } = req.body as { paymentMethod?: string };
      if (!paymentMethod || !["CASH", "ONLINE"].includes(paymentMethod)) {
        return res
          .status(400)
          .json({ error: "paymentMethod must be CASH or ONLINE" });
      }

      // ONLINE → approved + paid immediately
      // CASH   → approved + not paid (agent must verify cash receipt)
      const isOnline = paymentMethod === "ONLINE";

      const updated = await prisma.extraMaterial.update({
        where: { id: materialId },
        data: {
          approvalStatus: "APPROVED",
          paymentMethod: paymentMethod as any,
          paid: isOnline, // online = paid now, cash = agent verifies later
        },
      });

      res.json({ material: updated });
    } catch {
      res.status(500).json({ error: "Something went wrong" });
    }
  },
);

router.patch(
  "/orders/:orderId/extra-materials/:materialId/reject",
  async (req, res) => {
    try {
      const userId = req.user!.id;
      const orderId = parseInt(req.params.orderId);
      const materialId = parseInt(req.params.materialId);

      if (isNaN(orderId) || isNaN(materialId)) {
        return res.status(400).json({ error: "invalid ids" });
      }

      const order = await prisma.orderGroup.findFirst({
        where: { id: orderId, userId },
      });
      if (!order) return res.status(404).json({ error: "order not found" });

      // verify material belongs to this order
      const material = await prisma.extraMaterial.findFirst({
        where: { id: materialId, groupId: orderId },
      });
      if (!material)
        return res.status(404).json({ error: "extra material not found" });

      // Immutability: only PENDING materials can be rejected
      if (material.approvalStatus !== "PENDING") {
        return res.status(400).json({
          error: `material already ${material.approvalStatus.toLowerCase()} — decision cannot be changed`,
        });
      }

      await prisma.extraMaterial.update({
        where: { id: materialId },
        data: { approvalStatus: "REJECTED" },
      });

      res.json({ rejected: true });
    } catch {
      res.status(500).json({ error: "Something went wrong" });
    }
  },
);

// ═══════════════════════════════════════════════════════════════════════
//  RATE AGENT (after order is completed)
// ═══════════════════════════════════════════════════════════════════════

router.patch("/orders/:orderId/rate", async (req, res) => {
  try {
    const userId = req.user!.id;
    const orderId = parseInt(req.params.orderId);

    if (isNaN(orderId))
      return res.status(400).json({ error: "invalid order id" });

    const { rating } = req.body as { rating?: number };
    if (!rating || rating < 1 || rating > 5 || !Number.isInteger(rating)) {
      return res
        .status(400)
        .json({ error: "rating must be an integer between 1 and 5" });
    }

    const order = await prisma.orderGroup.findFirst({
      where: { id: orderId, userId },
    });
    if (!order) return res.status(404).json({ error: "order not found" });
    if (order.status !== "COMPLETED") {
      return res.status(400).json({ error: "can only rate completed orders" });
    }
    if (order.rating) {
      return res.status(400).json({ error: "order already rated" });
    }
    if (!order.assignedAgentId) {
      return res.status(400).json({ error: "no agent assigned to this order" });
    }

    // Update order rating and recalculate agent average
    const agent = await prisma.agent.findUnique({
      where: { id: order.assignedAgentId },
    });
    if (!agent) return res.status(404).json({ error: "agent not found" });

    const currentTotal = (agent.rating ?? 0) * agent.ratingCount;
    const newCount = agent.ratingCount + 1;
    const newAverage = (currentTotal + rating) / newCount;

    await prisma.$transaction([
      prisma.orderGroup.update({
        where: { id: orderId },
        data: { rating },
      }),
      prisma.agent.update({
        where: { id: order.assignedAgentId },
        data: {
          rating: Math.round(newAverage * 10) / 10,
          ratingCount: newCount,
        },
      }),
    ]);

    res.json({ rated: true, newAgentRating: Math.round(newAverage * 10) / 10 });
  } catch {
    res.status(500).json({ error: "Something went wrong" });
  }
});

// ═══════════════════════════════════════════════════════════════════════
//  MAKE PAYMENT (for order or extra material)
// ═══════════════════════════════════════════════════════════════════════

router.post("/orders/:orderId/pay", async (req, res) => {
  try {
    const userId = req.user!.id;
    const orderId = parseInt(req.params.orderId);

    if (isNaN(orderId))
      return res.status(400).json({ error: "invalid order id" });

    const { amount, method, transactionId, note, isExtraMaterial } =
      req.body as {
        amount?: number;
        method?: string;
        transactionId?: string;
        note?: string;
        isExtraMaterial?: boolean;
      };

    if (!amount || amount <= 0)
      return res.status(400).json({ error: "amount must be positive" });
    if (!method || !["CASH", "ONLINE"].includes(method)) {
      return res.status(400).json({ error: "method must be CASH or ONLINE" });
    }

    const order = await prisma.orderGroup.findFirst({
      where: { id: orderId, userId },
    });
    if (!order) return res.status(404).json({ error: "order not found" });

    const payment = await prisma.payment.create({
      data: {
        groupId: orderId,
        amount,
        method: method as any,
        isExtraMaterial: isExtraMaterial ?? false,
        transactionId: transactionId ?? null,
        note: note ?? null,
      },
    });

    // recalculate payment status
    const allPayments = await prisma.payment.findMany({
      where: { groupId: orderId },
    });
    const totalPaid = allPayments.reduce((sum, p) => sum + p.amount, 0);
    const orderTotal = order.totalPrice ?? 0;

    // Get approved extra materials total
    const extraMaterials = await prisma.extraMaterial.findMany({
      where: { groupId: orderId, approvalStatus: "APPROVED" },
    });
    const extraTotal = extraMaterials.reduce(
      (sum, m) => sum + m.price * m.quantity,
      0,
    );
    const grandTotal = orderTotal + extraTotal;

    let paymentStatus: "PENDING" | "PAID" | "PARTIALLY_PAID" = "PENDING";
    if (totalPaid >= grandTotal) paymentStatus = "PAID";
    else if (totalPaid > 0) paymentStatus = "PARTIALLY_PAID";

    await prisma.orderGroup.update({
      where: { id: orderId },
      data: { paymentStatus },
    });

    // Mark extra materials as paid if this is an extra material payment
    if (isExtraMaterial) {
      await prisma.extraMaterial.updateMany({
        where: { groupId: orderId, approvalStatus: "APPROVED", paid: false },
        data: { paid: true },
      });
    }

    res.status(201).json({ payment, paymentStatus });
  } catch {
    res.status(500).json({ error: "Something went wrong" });
  }
});

// ═══════════════════════════════════════════════════════════════════════
//  GET SUBSERVICES (public-ish, but behind auth; filterable by category)
// ═══════════════════════════════════════════════════════════════════════

router.get("/subservices", async (req, res) => {
  try {
    const categoryId = req.query.categoryId
      ? Number(req.query.categoryId)
      : undefined;
    const categorySlug = req.query.category as string | undefined;

    const where: any = {};
    if (categoryId) {
      where.categoryId = categoryId;
    } else if (categorySlug) {
      where.category = { slug: categorySlug.toLowerCase() };
    }

    const subservices = await prisma.subservice.findMany({
      where,
      include: { category: { select: { id: true, name: true, slug: true } } },
      orderBy: { name: "asc" },
    });

    res.json({ subservices });
  } catch {
    res.status(500).json({ error: "Something went wrong" });
  }
});

// ═══════════════════════════════════════════════════════════════════════
//  GET ACTIVE CITIES (for user to select from)
// ═══════════════════════════════════════════════════════════════════════

router.get("/cities/active", async (_req, res) => {
  try {
    const cities = await prisma.city.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true, state: true },
    });
    res.json({ cities });
  } catch {
    res.status(500).json({ error: "Something went wrong" });
  }
});

// ═══════════════════════════════════════════════════════════════════════
//  PENDING EXTRA-MATERIAL REQUESTS (efficient polling)
// ═══════════════════════════════════════════════════════════════════════

router.get("/extra-materials/pending", async (req, res) => {
  try {
    const userId = req.user!.id;

    // Get all unapproved extra materials for this user's active orders
    const pending = await prisma.extraMaterial.findMany({
      where: {
        approvalStatus: "PENDING",
        orderGroup: {
          userId,
          status: { in: ["ASSIGNED", "ON_THEWAY", "IN_PROGRESS"] },
        },
      },
      include: {
        addedByAgent: { select: { name: true } },
        orderGroup: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    res.json({ pending, count: pending.length });
  } catch {
    res.status(500).json({ error: "Something went wrong" });
  }
});

export default router;
