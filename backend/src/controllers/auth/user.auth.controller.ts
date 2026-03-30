import type { Request, Response } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { prisma } from "../../../db/index.ts";
import { env } from "../../config/env.ts";

export async function registerUser(req: Request, res: Response): Promise<void> {
  const { email, password, name, address, pin, city, phone, phoneCountry, profilepic } =
    req.body as {
      email?: string;
      password?: string;
      name?: string;
      address?: string;
      pin?: string;
      city?: string;
      phone?: string;
      phoneCountry?: string;
      profilepic?: string;
    };

  if (!email || !password || !address || !pin) {
    res.status(400).json({
      message: "Required fields: email, password, address, pin",
    });
    return;
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    res.status(409).json({ message: "Email is already registered" });
    return;
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  // Format phone number with country code
  let formattedPhone: string | undefined;
  if (phone) {
    const countryCode = phoneCountry === "USA" ? "+1" : "+91";
    formattedPhone = `${countryCode}${phone}`;
  }

  const user = await prisma.user.create({
    data: {
      email,
      password: hashedPassword,
      ...(name && { name }),
      ...(formattedPhone && { phone: formattedPhone }),
      ...(profilepic && { profilepic }),
      address: {
        create: {
          address,
          pin,
          ...(city && { city: city.trim().toLowerCase() }),
          label: "Home",
          isUser: true,
        },
      },
    },
    include: {
      address: true,
    },
  });

  const primaryAddress = user.address[0] ?? null;

  res.status(201).json({
    message: "Registration successful",
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      address: primaryAddress?.address ?? null,
      pin: primaryAddress?.pin ?? null,
      city: primaryAddress?.city ?? null,
      addresses: user.address,
    },
  });
}

export async function loginUser(req: Request, res: Response): Promise<void> {
  const { email, password } = req.body as {
    email?: string;
    password?: string;
  };

  if (!email || !password) {
    res.status(400).json({ message: "Email and password are required" });
    return;
  }

  const user = await prisma.user.findUnique({
    where: { email },
    include: { address: true },
  });
  if (!user) {
    res.status(401).json({ message: "Invalid credentials" });
    return;
  }

  const passwordMatch = await bcrypt.compare(password, user.password);
  if (!passwordMatch) {
    res.status(401).json({ message: "Invalid credentials" });
    return;
  }

  const token = jwt.sign(
    { id: user.id, email: user.email, role: "USER" },
    env.JWT_USER_SECRET,
    { expiresIn: env.JWT_EXPIRES_IN as jwt.SignOptions["expiresIn"] },
  );

  const primaryAddress = user.address[0] ?? null;

  res.status(200).json({
    message: "Login successful",
    token,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      address: primaryAddress?.address ?? null,
      pin: primaryAddress?.pin ?? null,
      city: primaryAddress?.city ?? null,
      addresses: user.address,
    },
  });
}
