import "dotenv/config";

function normalizeEnvForHostScripts() {
  if (process.env.DATABASE_URL?.includes("@identity-data:")) {
    process.env.DATABASE_URL = process.env.DATABASE_URL.replace("@identity-data:", "@localhost:");
  } else if (process.env.DATABASE_URL?.includes("@postgres:")) {
    process.env.DATABASE_URL = process.env.DATABASE_URL.replace("@postgres:", "@localhost:");
  }

  if (process.env.MINIO_ENDPOINT === "minio" || process.env.MINIO_ENDPOINT === "identity-storage") {
    process.env.MINIO_ENDPOINT = "localhost";
  }
}

async function main() {
  normalizeEnvForHostScripts();

  const [{ prisma }, { healthCheckStorage }] = await Promise.all([
    import("@/lib/db/prisma"),
    import("@/lib/storage/storage-service"),
  ]);

  await prisma.$queryRaw`SELECT 1`;
  await healthCheckStorage();
  console.log("[services:check] postgres and minio are reachable");

  await prisma.$disconnect();
}

main().catch((error) => {
  console.error("[services:check] failed", error);
  process.exit(1);
});
