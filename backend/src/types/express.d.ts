import { Request } from "express";

export interface JwtPayload {
  id: number;
  email: string;
  role: "USER" | "ADMIN" | "AGENT";
}

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}
