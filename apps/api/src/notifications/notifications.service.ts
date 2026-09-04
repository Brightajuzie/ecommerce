import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { NotificationType, UserRole } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    userId: string,
    type: NotificationType,
    title: string,
    body: string,
    orderId?: string,
  ) {
    return this.prisma.notification.create({
      data: { userId, type, title, body, orderId },
    });
  }

  /**
   * One row with userId: null rather than one per admin — every current and
   * future ADMIN/SUPER_ADMIN sees it via listForAdmin()'s userId-null query,
   * mirroring how VendorMessage.isBroadcast fans out without needing a
   * per-recipient row.
   */
  async createAdminBroadcast(
    type: NotificationType,
    title: string,
    body: string,
    orderId?: string,
  ) {
    return this.prisma.notification.create({
      data: { userId: null, type, title, body, orderId },
    });
  }

  async listMine(userId: string) {
    return this.prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
  }

  async unreadCountMine(userId: string) {
    return this.prisma.notification.count({ where: { userId, readAt: null } });
  }

  async listForAdmin() {
    return this.prisma.notification.findMany({
      where: { userId: null },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
  }

  async unreadCountForAdmin() {
    return this.prisma.notification.count({ where: { userId: null, readAt: null } });
  }

  /**
   * Handles both audiences: a buyer can only mark their own notification
   * read; an admin/super-admin can only mark a broadcast (userId: null) one
   * read, never another buyer's personal notification.
   */
  async markRead(userId: string, role: UserRole, notificationId: string) {
    const notification = await this.prisma.notification.findUnique({
      where: { id: notificationId },
    });
    if (!notification) {
      throw new NotFoundException("Notification not found");
    }

    const isAdmin = role === UserRole.ADMIN || role === UserRole.SUPER_ADMIN;
    const ownsIt = notification.userId === userId;
    const isAdminBroadcast = notification.userId === null && isAdmin;
    if (!ownsIt && !isAdminBroadcast) {
      throw new ForbiddenException("Not your notification");
    }

    if (notification.readAt) {
      return notification; // idempotent
    }
    return this.prisma.notification.update({
      where: { id: notificationId },
      data: { readAt: new Date() },
    });
  }
}
