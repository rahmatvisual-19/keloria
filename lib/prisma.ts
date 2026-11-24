import { PrismaClient } from "@prisma/client";

/**
 * Prisma Client singleton agar aman saat hot reload Next.js di mode development
 * dan tidak menimbulkan kebocoran koneksi PostgreSQL.
 */
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
