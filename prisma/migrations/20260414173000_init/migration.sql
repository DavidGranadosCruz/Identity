-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "public"."IdentityPackStatus" AS ENUM ('draft', 'analyzing', 'ready', 'failed');

-- CreateEnum
CREATE TYPE "public"."AnalysisStatus" AS ENUM ('pending', 'running', 'completed', 'failed');

-- CreateEnum
CREATE TYPE "public"."KeepRecommendation" AS ENUM ('keep', 'replace');

-- CreateEnum
CREATE TYPE "public"."GenerationStatus" AS ENUM ('queued', 'processing', 'completed', 'failed');

-- CreateEnum
CREATE TYPE "public"."GenerationVariantType" AS ENUM ('faithful', 'editorial', 'cinematic');

-- CreateEnum
CREATE TYPE "public"."JobType" AS ENUM ('analyze_identity_image', 'analyze_reference_image', 'generate_recreation');

-- CreateEnum
CREATE TYPE "public"."JobStatus" AS ENUM ('pending', 'running', 'completed', 'failed', 'cancelled');

-- CreateTable
CREATE TABLE "public"."User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "avatarUrl" TEXT,
    "emailVerified" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Session" (
    "id" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Account" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."VerificationToken" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL
);

-- CreateTable
CREATE TABLE "public"."IdentityPack" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" "public"."IdentityPackStatus" NOT NULL DEFAULT 'draft',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IdentityPack_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."IdentityPackImage" (
    "id" TEXT NOT NULL,
    "packId" TEXT NOT NULL,
    "storagePath" TEXT NOT NULL,
    "originalFilename" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "width" INTEGER NOT NULL,
    "height" INTEGER NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "analysisStatus" "public"."AnalysisStatus" NOT NULL DEFAULT 'pending',
    "score" INTEGER,
    "keepRecommendation" "public"."KeepRecommendation",
    "analysisJson" JSONB,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IdentityPackImage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ReferenceImage" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "storagePath" TEXT NOT NULL,
    "originalFilename" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "width" INTEGER NOT NULL,
    "height" INTEGER NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "analysisStatus" "public"."AnalysisStatus" NOT NULL DEFAULT 'pending',
    "analysisJson" JSONB,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReferenceImage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Generation" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "packId" TEXT NOT NULL,
    "referenceImageId" TEXT NOT NULL,
    "status" "public"."GenerationStatus" NOT NULL DEFAULT 'queued',
    "referenceFidelity" INTEGER NOT NULL,
    "identityStrength" INTEGER NOT NULL,
    "promptJson" JSONB,
    "selectedIdentityImagesJson" JSONB,
    "provider" TEXT,
    "providerModel" TEXT,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Generation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."GenerationVariant" (
    "id" TEXT NOT NULL,
    "generationId" TEXT NOT NULL,
    "variantType" "public"."GenerationVariantType" NOT NULL,
    "storagePath" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "width" INTEGER NOT NULL,
    "height" INTEGER NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "metadataJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GenerationVariant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Job" (
    "id" TEXT NOT NULL,
    "type" "public"."JobType" NOT NULL,
    "status" "public"."JobStatus" NOT NULL DEFAULT 'pending',
    "userId" TEXT,
    "generationId" TEXT,
    "payloadJson" JSONB NOT NULL,
    "resultJson" JSONB,
    "errorMessage" TEXT,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 3,
    "runAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lockedAt" TIMESTAMP(3),
    "lockedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Job_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."UserSettings" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "defaultFidelity" INTEGER NOT NULL DEFAULT 80,
    "defaultIdentityStrength" INTEGER NOT NULL DEFAULT 80,
    "watermarkEnabled" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."AuditLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT,
    "payloadJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "public"."User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Session_sessionToken_key" ON "public"."Session"("sessionToken");

-- CreateIndex
CREATE INDEX "Session_userId_idx" ON "public"."Session"("userId");

-- CreateIndex
CREATE INDEX "Session_expires_idx" ON "public"."Session"("expires");

-- CreateIndex
CREATE INDEX "Account_userId_idx" ON "public"."Account"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Account_provider_providerAccountId_key" ON "public"."Account"("provider", "providerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_token_key" ON "public"."VerificationToken"("token");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_identifier_token_key" ON "public"."VerificationToken"("identifier", "token");

-- CreateIndex
CREATE INDEX "IdentityPack_userId_createdAt_idx" ON "public"."IdentityPack"("userId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "IdentityPack_userId_status_idx" ON "public"."IdentityPack"("userId", "status");

-- CreateIndex
CREATE INDEX "IdentityPackImage_packId_createdAt_idx" ON "public"."IdentityPackImage"("packId", "createdAt");

-- CreateIndex
CREATE INDEX "IdentityPackImage_analysisStatus_updatedAt_idx" ON "public"."IdentityPackImage"("analysisStatus", "updatedAt");

-- CreateIndex
CREATE INDEX "ReferenceImage_userId_createdAt_idx" ON "public"."ReferenceImage"("userId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "ReferenceImage_analysisStatus_updatedAt_idx" ON "public"."ReferenceImage"("analysisStatus", "updatedAt");

-- CreateIndex
CREATE INDEX "Generation_userId_createdAt_idx" ON "public"."Generation"("userId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "Generation_userId_status_updatedAt_idx" ON "public"."Generation"("userId", "status", "updatedAt");

-- CreateIndex
CREATE INDEX "Generation_packId_idx" ON "public"."Generation"("packId");

-- CreateIndex
CREATE INDEX "Generation_referenceImageId_idx" ON "public"."Generation"("referenceImageId");

-- CreateIndex
CREATE INDEX "GenerationVariant_generationId_createdAt_idx" ON "public"."GenerationVariant"("generationId", "createdAt");

-- CreateIndex
CREATE INDEX "Job_status_runAt_createdAt_idx" ON "public"."Job"("status", "runAt", "createdAt");

-- CreateIndex
CREATE INDEX "Job_type_status_idx" ON "public"."Job"("type", "status");

-- CreateIndex
CREATE INDEX "Job_generationId_idx" ON "public"."Job"("generationId");

-- CreateIndex
CREATE INDEX "Job_userId_idx" ON "public"."Job"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "UserSettings_userId_key" ON "public"."UserSettings"("userId");

-- CreateIndex
CREATE INDEX "AuditLog_userId_createdAt_idx" ON "public"."AuditLog"("userId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "AuditLog_entityType_entityId_idx" ON "public"."AuditLog"("entityType", "entityId");

-- AddForeignKey
ALTER TABLE "public"."Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."IdentityPack" ADD CONSTRAINT "IdentityPack_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."IdentityPackImage" ADD CONSTRAINT "IdentityPackImage_packId_fkey" FOREIGN KEY ("packId") REFERENCES "public"."IdentityPack"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ReferenceImage" ADD CONSTRAINT "ReferenceImage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Generation" ADD CONSTRAINT "Generation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Generation" ADD CONSTRAINT "Generation_packId_fkey" FOREIGN KEY ("packId") REFERENCES "public"."IdentityPack"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Generation" ADD CONSTRAINT "Generation_referenceImageId_fkey" FOREIGN KEY ("referenceImageId") REFERENCES "public"."ReferenceImage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."GenerationVariant" ADD CONSTRAINT "GenerationVariant_generationId_fkey" FOREIGN KEY ("generationId") REFERENCES "public"."Generation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Job" ADD CONSTRAINT "Job_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Job" ADD CONSTRAINT "Job_generationId_fkey" FOREIGN KEY ("generationId") REFERENCES "public"."Generation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."UserSettings" ADD CONSTRAINT "UserSettings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;


