import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { VendorStatus } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";

const PRODUCT_THRESHOLD = 5;
const UNVERIFIED_GRACE_PERIOD_DAYS = 14;

const SUSPENSION_WARNING_MESSAGE =
  "Your store has more than 5 products listed, but your identity and " +
  "liveness verification are still incomplete after 2 weeks. Please " +
  "complete verification soon — accounts that stay unverified may be " +
  "suspended.";

/**
 * Daily check for vendors selling actively (more than 5 products, still
 * APPROVED) without ever completing identity/liveness verification, more
 * than two weeks after they signed up. Sends one system VendorMessage per
 * match and stamps VendorProfile.suspensionWarnedAt so the same vendor
 * isn't warned again every day — see that field's comment in schema.prisma.
 *
 * This only *warns*; it never actually suspends anyone — an admin still
 * makes that call manually via the existing Suspend action, same as every
 * other vendor-status decision in this app.
 */
@Injectable()
export class VendorComplianceService {
  private readonly logger = new Logger(VendorComplianceService.name);

  constructor(private readonly prisma: PrismaService) {}

  @Cron(CronExpression.EVERY_DAY_AT_9AM)
  async warnUnverifiedActiveVendors() {
    const cutoff = new Date(Date.now() - UNVERIFIED_GRACE_PERIOD_DAYS * 24 * 60 * 60 * 1000);

    const candidates = await this.prisma.vendorProfile.findMany({
      where: {
        status: VendorStatus.APPROVED,
        suspensionWarnedAt: null,
        createdAt: { lte: cutoff },
        user: {
          OR: [{ identityVerified: false }, { livenessVerified: false }],
        },
      },
      select: {
        id: true,
        _count: { select: { products: true } },
      },
    });

    const toWarn = candidates.filter((vendor) => vendor._count.products > PRODUCT_THRESHOLD);
    if (toWarn.length === 0) {
      return;
    }

    for (const vendor of toWarn) {
      await this.prisma.$transaction([
        this.prisma.vendorMessage.create({
          data: {
            vendorId: vendor.id,
            isSystemMessage: true,
            body: SUSPENSION_WARNING_MESSAGE,
          },
        }),
        this.prisma.vendorProfile.update({
          where: { id: vendor.id },
          data: { suspensionWarnedAt: new Date() },
        }),
      ]);
    }

    this.logger.log(`Sent suspension-risk warnings to ${toWarn.length} vendor(s)`);
  }
}
