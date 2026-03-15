import { PrismaClient } from "./src/generated/prisma/client.ts";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import "dotenv/config";

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
});

const adapter = new PrismaPg(pool);

// Cast is required because getPrismaClientClass() is in a @ts-nocheck file,
// which causes TypeScript to lose the full generated return type.
export const prisma = new PrismaClient({ adapter }) as unknown as PrismaClient;
export { pool };
