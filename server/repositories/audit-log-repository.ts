import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";

export class AuditLogRepository {
  async create(params: {
    userId: string;
    action: string;
    entityType: string;
    entityId?: string;
    payloadJson?: Prisma.InputJsonValue;
  }) {
    return prisma.auditLog.create({
      data: {
        userId: params.userId,
        action: params.action,
        entityType: params.entityType,
        entityId: params.entityId,
        payloadJson: params.payloadJson,
      },
    });
  }
}

