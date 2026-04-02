import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Connection pool size is configured via DATABASE_URL params:
// ?connection_limit=10&pool_timeout=10
// See: https://www.prisma.io/docs/concepts/components/prisma-client/working-with-prismaclient/connection-pool
export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
    datasourceUrl: process.env.DATABASE_URL,
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
