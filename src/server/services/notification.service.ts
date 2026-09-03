import { prisma } from "@/lib/db";
import type { Prisma } from "@prisma/client";
import type { NotificationType, NotificationCategory, NotificationPriority } from "@prisma/client";

// ─────────────────────────────────────────────────────────────────────────────
// TrustDNA — Notification Service
// ─────────────────────────────────────────────────────────────────────────────

export interface CreateNotificationInput {
  userId: string;
  organizationId?: string;
  type: NotificationType;
  category: NotificationCategory;
  title: string;
  body: string;
  priority?: NotificationPriority;
  data?: Record<string, unknown>;
}

export const NotificationService = {
  /** Create a in-app notification */
  async createNotification(input: CreateNotificationInput) {
    return await prisma.notification.create({
      data: {
        userId: input.userId,
        organizationId: input.organizationId,
        type: input.type,
        category: input.category,
        title: input.title,
        body: input.body,
        priority: input.priority || "MEDIUM",
        status: "SENT",
        sentAt: new Date(),
        data: input.data as Prisma.InputJsonValue,
      },
    });
  },

  /** Get user notifications */
  async getUserNotifications(userId: string) {
    return await prisma.notification.findMany({
      where: { userId, deletedAt: null },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
  },

  /** Mark notification as read */
  async markRead(notificationId: string, userId: string) {
    return await prisma.notification.updateMany({
      where: { id: notificationId, userId },
      data: { status: "READ", readAt: new Date() },
    });
  },
};
