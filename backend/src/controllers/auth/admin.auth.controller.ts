import type { Request, Response } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { prisma } from "../../../db/index.ts";
import { env } from "../../config/env.ts";

export async function registerAdmin(
  req: Request,
  res: Response
): Promise<void> {
  const { email, password } = req.body as {
    email?: string;
    password?: string;
  };

  if (!email || !password) {
    res.status(400).json({ message: "Required fields: email, password" });
    return;
  }

  const existing = await prisma.admin.findUnique({ where: { email } });
  if (existing) {
    res.status(409).json({ message: "Email is already registered" });
    return;
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  const admin = await prisma.admin.create({
    data: { email, password: hashedPassword },
  });

  res.status(201).json({
    message: "Admin registered successfully",
    admin: {
      id: admin.id,
      email: admin.email,
    },
  });
}

export async function loginAdmin(req: Request, res: Response): Promise<void> {
  const { email, password } = req.body as {
    email?: string;
    password?: string;
  };

  if (!email || !password) {
    res.status(400).json({ message: "Email and password are required" });
    return;
  }

  const admin = await prisma.admin.findUnique({ where: { email } });
  if (!admin) {
    res.status(401).json({ message: "Invalid credentials" });
    return;
  }

  const passwordMatch = await bcrypt.compare(password, admin.password);
  if (!passwordMatch) {
    res.status(401).json({ message: "Invalid credentials" });
    return;
  }

  const token = jwt.sign(
    { id: admin.id, email: admin.email, role: "ADMIN" },
    env.JWT_ADMIN_SECRET,
    { expiresIn: env.JWT_EXPIRES_IN as jwt.SignOptions["expiresIn"] }
  );

  res.status(200).json({
    message: "Login successful",
    token,
    admin: {
      id: admin.id,
      email: admin.email,
    },
  });
}
