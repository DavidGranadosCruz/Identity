import "dotenv/config";
import { CreateBucketCommand, HeadBucketCommand, S3Client } from "@aws-sdk/client-s3";
import { getEnv } from "@/lib/utils/env";

function normalizeEnvForHostScripts() {
  if (process.env.MINIO_ENDPOINT === "minio" || process.env.MINIO_ENDPOINT === "identity-storage") {
    process.env.MINIO_ENDPOINT = "localhost";
  }
}

function createClient() {
  const env = getEnv();

  const endpoint = env.MINIO_ENDPOINT.startsWith("http")
    ? env.MINIO_ENDPOINT
    : `${env.MINIO_USE_SSL ? "https" : "http"}://${env.MINIO_ENDPOINT}:${env.MINIO_PORT}`;

  return new S3Client({
    endpoint,
    forcePathStyle: true,
    region: "us-east-1",
    credentials: {
      accessKeyId: env.MINIO_ACCESS_KEY,
      secretAccessKey: env.MINIO_SECRET_KEY,
    },
  });
}

async function ensureBucket(client: S3Client, bucket: string) {
  try {
    await client.send(new HeadBucketCommand({ Bucket: bucket }));
    console.log(`[minio:init] bucket exists: ${bucket}`);
  } catch {
    await client.send(new CreateBucketCommand({ Bucket: bucket }));
    console.log(`[minio:init] bucket created: ${bucket}`);
  }
}

async function main() {
  normalizeEnvForHostScripts();

  const env = getEnv();
  const client = createClient();

  await ensureBucket(client, env.MINIO_BUCKET_UPLOADS);
  await ensureBucket(client, env.MINIO_BUCKET_GENERATIONS);

  console.log("[minio:init] done");
}

main().catch((error) => {
  console.error("[minio:init] failed", error);
  process.exit(1);
});
