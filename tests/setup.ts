import "@testing-library/jest-dom/vitest";

process.env.DATABASE_URL ??= "postgresql://postgres:postgres@localhost:5432/identity";
process.env.AUTH_SECRET ??= "test-auth-secret";
process.env.APP_URL ??= "http://localhost:3000";
process.env.MINIO_ENDPOINT ??= "localhost";
process.env.MINIO_PORT ??= "9000";
process.env.MINIO_ACCESS_KEY ??= "minioadmin";
process.env.MINIO_SECRET_KEY ??= "minioadmin";
process.env.MINIO_BUCKET_UPLOADS ??= "identity-uploads";
process.env.MINIO_BUCKET_GENERATIONS ??= "identity-generations";

