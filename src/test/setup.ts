import { vi } from "vitest";

// Mock Prisma client — individual tests override specific methods as needed
vi.mock("@/lib/db", () => ({
  db: {
    $queryRaw: vi.fn().mockResolvedValue([]),
    $queryRawUnsafe: vi.fn().mockResolvedValue([]),
    $executeRaw: vi.fn().mockResolvedValue(0),
    $executeRawUnsafe: vi.fn().mockResolvedValue(0),
  },
}));

// Default env vars for tests
process.env.ADMIN_SECRET = "test-admin-secret-key";
process.env.CRON_SECRET = "test-cron-secret";
