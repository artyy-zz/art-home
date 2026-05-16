import { PrismaClient } from "@prisma/client";
import { getPerfContext, measureDetailAsync, perfDetailLog, perfLog } from "@/lib/perf";

const globalForPrisma = globalThis as unknown as {
  prisma?: ReturnType<typeof createPrismaClient>;
};

function createPrismaClient() {
  const createStartedAt = performance.now();
  const client = new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });
  perfDetailLog("prisma.client.create", performance.now() - createStartedAt, {
    nodeEnv: process.env.NODE_ENV,
  });

  let connectPromise: Promise<void> | null = null;

  function ensureConnected() {
    if (!connectPromise) {
      connectPromise = measureDetailAsync(
        "prisma.connection startup",
        () => client.$connect(),
        { nodeEnv: process.env.NODE_ENV },
      );
    }

    return connectPromise;
  }

  return client.$extends({
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          await ensureConnected();
          const startedAt = performance.now();

          try {
            return await query(args);
          } finally {
            const durationMs = performance.now() - startedAt;
            const context = {
              ...getPerfContext(),
              model,
              operation,
            };
            perfLog("prisma.query", durationMs, context);
            perfDetailLog("prisma.query await", durationMs, context);
          }
        },
      },
    },
  });
}

const hasExistingPrismaClient = Boolean(globalForPrisma.prisma);
perfDetailLog("prisma.module init", 0, {
  nodeEnv: process.env.NODE_ENV,
  reusedClient: hasExistingPrismaClient,
});

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
