import { defineConfig } from "vitest/config";
import path from "path";

/**
 * Integration tests — they talk to the real database.
 *
 * Kept out of `vitest.config.ts` on purpose so `npm run test` stays hermetic and
 * runnable without credentials. These create their own fixtures and delete them
 * in `afterAll`.
 *
 *   npx vitest run --config vitest.integration.config.ts
 */
export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/__tests__/**/*.integration.ts"],
    // One file at a time: they share a database and clean up after themselves.
    fileParallelism: false,
    testTimeout: 30_000,
    hookTimeout: 30_000,
  },
  resolve: { alias: { "@": path.resolve(__dirname, "./src") } },
});
