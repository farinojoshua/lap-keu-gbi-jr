import { prisma } from "./prisma";

export async function auditLog(params: {
  userId: string;
  userName: string;
  action: "CREATE" | "UPDATE" | "DELETE" | "BACKUP" | "RESTORE" | "RESET";
  entity: string;
  entityId: string;
  details?: string;
}) {
  await prisma.auditLog.create({
    data: {
      userId: params.userId,
      userName: params.userName,
      action: params.action,
      entity: params.entity,
      entityId: params.entityId,
      details: params.details || "",
    },
  });
}
