import { randomUUID } from "node:crypto";
import { Readable } from "node:stream";
import {
  DeleteObjectCommand,
  GetObjectCommand,
  ListBucketsCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { AppError } from "@/lib/utils/errors";
import { getEnv } from "@/lib/utils/env";

export type StorageBucket = "uploads" | "generations";

const signedUrlTtlSeconds = 60 * 30;
let cachedClient: S3Client | null = null;

function resolveEndpoint() {
  const env = getEnv();
  const endpoint = env.MINIO_ENDPOINT.startsWith("http")
    ? env.MINIO_ENDPOINT
    : `${env.MINIO_USE_SSL ? "https" : "http"}://${env.MINIO_ENDPOINT}:${env.MINIO_PORT}`;
  return endpoint;
}

function getClient() {
  if (cachedClient) return cachedClient;

  const env = getEnv();

  cachedClient = new S3Client({
    endpoint: resolveEndpoint(),
    forcePathStyle: true,
    region: "us-east-1",
    credentials: {
      accessKeyId: env.MINIO_ACCESS_KEY,
      secretAccessKey: env.MINIO_SECRET_KEY,
    },
  });

  return cachedClient;
}

export function getBucketName(bucket: StorageBucket) {
  const env = getEnv();
  return bucket === "uploads" ? env.MINIO_BUCKET_UPLOADS : env.MINIO_BUCKET_GENERATIONS;
}

function sanitizeFilename(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9.\-_]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export function buildStoragePath(params: {
  userId: string;
  category: "identity" | "reference" | "generation";
  filename: string;
  prefixId?: string;
}) {
  const safe = sanitizeFilename(params.filename);
  const identifier = params.prefixId ?? randomUUID();
  return `${params.userId}/${params.category}/${identifier}-${safe}`;
}

export async function uploadToStorage(params: {
  bucket: StorageBucket;
  storagePath: string;
  body: Buffer;
  contentType: string;
}) {
  const client = getClient();

  await client.send(
    new PutObjectCommand({
      Bucket: getBucketName(params.bucket),
      Key: params.storagePath,
      Body: params.body,
      ContentType: params.contentType,
    }),
  );

  return {
    storagePath: params.storagePath,
  };
}

export async function deleteFromStorage(params: {
  bucket: StorageBucket;
  storagePath: string;
}) {
  const client = getClient();

  await client.send(
    new DeleteObjectCommand({
      Bucket: getBucketName(params.bucket),
      Key: params.storagePath,
    }),
  );
}

async function toBuffer(body: unknown): Promise<Buffer> {
  if (Buffer.isBuffer(body)) return body;
  if (!body) return Buffer.alloc(0);

  if (body instanceof Readable) {
    const chunks: Buffer[] = [];
    for await (const chunk of body) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    return Buffer.concat(chunks);
  }

  if (typeof body === "object" && body !== null && Symbol.asyncIterator in body) {
    const chunks: Buffer[] = [];
    for await (const chunk of body as AsyncIterable<unknown>) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk)));
    }
    return Buffer.concat(chunks);
  }

  throw new AppError("INVALID_STORAGE_STREAM", "Unable to read storage stream", 500);
}

export async function readFromStorage(params: {
  bucket: StorageBucket;
  storagePath: string;
}) {
  const client = getClient();

  const response = await client.send(
    new GetObjectCommand({
      Bucket: getBucketName(params.bucket),
      Key: params.storagePath,
    }),
  );

  const body = await toBuffer(response.Body);

  return {
    body,
    contentType: response.ContentType ?? "application/octet-stream",
  };
}

export async function createSignedReadUrl(params: {
  bucket: StorageBucket;
  storagePath: string;
  expiresInSeconds?: number;
}) {
  const client = getClient();

  return getSignedUrl(
    client,
    new GetObjectCommand({
      Bucket: getBucketName(params.bucket),
      Key: params.storagePath,
    }),
    { expiresIn: params.expiresInSeconds ?? signedUrlTtlSeconds },
  );
}

export async function healthCheckStorage() {
  const client = getClient();
  const env = getEnv();
  const buckets = await client.send(new ListBucketsCommand({}));
  const names = new Set((buckets.Buckets ?? []).map((bucket) => bucket.Name).filter(Boolean));

  if (!names.has(env.MINIO_BUCKET_UPLOADS) || !names.has(env.MINIO_BUCKET_GENERATIONS)) {
    throw new AppError("MINIO_BUCKETS_NOT_READY", "Required MinIO buckets are not ready", 503, {
      existingBuckets: Array.from(names),
      requiredBuckets: [env.MINIO_BUCKET_UPLOADS, env.MINIO_BUCKET_GENERATIONS],
    });
  }
}
