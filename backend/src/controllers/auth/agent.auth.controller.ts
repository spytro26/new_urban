import type { Request, Response } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
// import { Prisma } from "../../../db/src/generated/prisma/client.ts";
import { prisma } from "../../../db/index.ts";
import { env } from "../../config/env.ts";
import { cloudinary } from "../../config/cloudinary.ts";

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

export async function registerAgent(
  req: Request,
  res: Response,
): Promise<void> {
  const body = (req.body || {}) as {
    email?: string;
    password?: string;
    name?: string;
    type?: string;
    address?: string;
    pin?: string;
    city?: string;
    profilepic?: string;
    accountNumber?: string;
    holderName?: string;
    ifscCode?: string;
    bankName?: string;
    categoryIds?: string; // comma-separated or JSON array
  };
  const {
    email,
    password,
    name,
    type,
    address,
    pin,
    city,
    profilepic,
    accountNumber,
    holderName,
    ifscCode,
    bankName,
  } = body;

  // Parse categoryIds from FormData (could be comma-separated string or JSON array)
  let categoryIds: number[] = [];
  if (body.categoryIds) {
    try {
      const parsed = JSON.parse(body.categoryIds);
      categoryIds = Array.isArray(parsed)
        ? parsed.map(Number)
        : [Number(parsed)];
    } catch {
      categoryIds = body.categoryIds
        .split(",")
        .map((s) => Number(s.trim()))
        .filter((n) => !isNaN(n));
    }
  }

  // Get uploaded files
  const files = req.files as
    | { [fieldname: string]: Express.Multer.File[] }
    | undefined;
  const idProofFile = files?.["id_proof"]?.[0];
  const addressProofFile = files?.["address_proof"]?.[0];

  if (!email || !password || !name || !address || !pin) {
    res.status(400).json({
      message: "Required fields: email, password, name, address, pin",
    });
    return;
  }

  // Need at least a type or categoryIds
  if (!type && categoryIds.length === 0) {
    res.status(400).json({
      message:
        "At least one service category is required (type or categoryIds)",
    });
    return;
  }

  // Bank details are optional during registration — agent can add later on profile
  const hasBankDetails = accountNumber && holderName && ifscCode && bankName;

  const existing = await prisma.agent.findUnique({ where: { email } });
  if (existing) {
    res.status(409).json({ message: "Email is already registered" });
    return;
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  // Upload proof images to Cloudinary (if provided)
  let idProofUrl: string | undefined;
  let addressProofUrl: string | undefined;
  const timestamp = Date.now();

  if (idProofFile) {
    idProofUrl = await uploadToCloudinary(
      idProofFile.buffer,
      "urban/agents/documents",
      `agent_${email.replace(/[^a-z0-9]/gi, "_")}_id_proof_${timestamp}`,
    );
  }
  if (addressProofFile) {
    addressProofUrl = await uploadToCloudinary(
      addressProofFile.buffer,
      "urban/agents/documents",
      `agent_${email.replace(/[^a-z0-9]/gi, "_")}_address_proof_${timestamp}`,
    );
  }

  // If no categoryIds provided, try to map the legacy `type` to a category
  if (categoryIds.length === 0 && type) {
    const cat = await prisma.category.findFirst({
      where: { slug: type.trim().toLowerCase() },
    });
    if (cat) categoryIds = [cat.id];
  }

  const agent = await prisma.agent.create({
    data: {
      email,
      password: hashedPassword,
      name,
      type: (type ?? categoryIds.length > 0) ? (type ?? "multi") : "general",
      ...(profilepic && { profilepic }),
      ...(idProofUrl && { id_proof: idProofUrl }),
      ...(addressProofUrl && { address_proof: addressProofUrl }),
      address: {
        create: {
          address,
          pin,
          ...(city && { city: city.trim().toLowerCase() }),
          isUser: false,
        },
      },
      ...(hasBankDetails && {
        bankDetails: {
          create: {
            accountNumber: accountNumber!,
            holderName: holderName!,
            ifscCode: ifscCode!,
            bankName: bankName!,
          },
        },
      }),
      ...(categoryIds.length > 0 && {
        categories: {
          create: categoryIds.map((catId) => ({
            categoryId: catId,
          })),
        },
      }),
    },
    include: {
      address: true,
      bankDetails: true,
      categories: {
        include: { category: { select: { id: true, name: true, slug: true } } },
      },
    },
  });

  const primaryAddress = agent.address[0] ?? null;

  res.status(201).json({
    message: "Agent registered successfully",
    agent: {
      id: agent.id,
      email: agent.email,
      name: agent.name,
      type: agent.type,
      address: primaryAddress?.address ?? null,
      pin: primaryAddress?.pin ?? null,
      city: primaryAddress?.city ?? null,
      addresses: agent.address,
      isVerified: agent.isVerified,
      categories: agent.categories,
    },
  });
}

export async function loginAgent(req: Request, res: Response): Promise<void> {
  const { email, password } = req.body as {
    email?: string;
    password?: string;
  };

  if (!email || !password) {
    res.status(400).json({ message: "Email and password are required" });
    return;
  }

  const agent = await prisma.agent.findUnique({
    where: { email },
    include: {
      address: true,
      categories: {
        include: { category: { select: { id: true, name: true, slug: true } } },
      },
    },
  });
  if (!agent) {
    res.status(401).json({ message: "Invalid credentials" });
    return;
  }

  const passwordMatch = await bcrypt.compare(password, agent.password);
  if (!passwordMatch) {
    res.status(401).json({ message: "Invalid credentials" });
    return;
  }

  // Allow unverified agents to login — they see verification status on dashboard
  const token = jwt.sign(
    { id: agent.id, email: agent.email, role: "AGENT" },
    env.JWT_AGENT_SECRET,
    { expiresIn: env.JWT_EXPIRES_IN as jwt.SignOptions["expiresIn"] },
  );

  const primaryAddress = agent.address[0] ?? null;

  res.status(200).json({
    message: "Login successful",
    token,
    agent: {
      id: agent.id,
      email: agent.email,
      name: agent.name,
      type: agent.type,
      isVerified: agent.isVerified,
      isAvailable: agent.isAvailable,
      address: primaryAddress?.address ?? null,
      pin: primaryAddress?.pin ?? null,
      city: primaryAddress?.city ?? null,
      addresses: agent.address,
      categories: agent.categories,
    },
  });
}
