import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from "@nestjs/common";
import { Prisma, WalletTransactionType, WithdrawalStatus } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { FlutterwaveService } from "../payments/flutterwave/flutterwave.service";
import type { PayoutAccount } from "../payment-settings/payment-settings.service";

const RECENT_TRANSACTIONS_LIMIT = 50;

export interface FlutterwaveTransferWebhookPayload {
  event?: string;
  data?: {
    id?: number;
    reference?: string;
    status?: string;
    complete_message?: string;
  };
}

@Injectable()
export class WalletsService {
  private readonly logger = new Logger(WalletsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly flutterwaveService: FlutterwaveService,
  ) {}

  private async getVendorProfile(userId: string) {
    const vendorProfile = await this.prisma.vendorProfile.findUnique({
      where: { userId },
    });
    if (!vendorProfile) {
      throw new ForbiddenException(
        "No vendor profile is associated with this account",
      );
    }
    return vendorProfile;
  }

  private async getOrCreateWallet(vendorId: string) {
    const existing = await this.prisma.wallet.findUnique({
      where: { vendorId },
    });
    if (existing) {
      return existing;
    }
    return this.prisma.wallet.create({ data: { vendorId } });
  }

  private async getOrCreatePlatformWallet() {
    const existing = await this.prisma.wallet.findFirst({
      where: { vendorId: null },
    });
    if (existing) {
      return existing;
    }
    return this.prisma.wallet.create({ data: { vendorId: null } });
  }

  /**
   * Credits a vendor's wallet — called from OrdersService within its own
   * transaction when a VendorOrder is marked DELIVERED, so the credit and
   * the status flip commit atomically together. Not exposed via HTTP.
   */
  async creditVendorWallet(
    tx: Prisma.TransactionClient,
    vendorId: string,
    amount: number,
    description: string,
    vendorOrderId: string,
  ) {
    let wallet = await tx.wallet.findUnique({ where: { vendorId } });
    if (!wallet) {
      wallet = await tx.wallet.create({ data: { vendorId } });
    }
    const balanceAfter = Number(wallet.balance) + amount;
    await tx.wallet.update({
      where: { id: wallet.id },
      data: { balance: balanceAfter },
    });
    await tx.walletTransaction.create({
      data: {
        walletId: wallet.id,
        type: WalletTransactionType.CREDIT,
        amount,
        balanceAfter,
        description,
        vendorOrderId,
      },
    });
  }

  /** Platform-wallet counterpart of creditVendorWallet — same transaction. */
  async creditPlatformWallet(
    tx: Prisma.TransactionClient,
    amount: number,
    description: string,
    vendorOrderId: string,
  ) {
    let wallet = await tx.wallet.findFirst({ where: { vendorId: null } });
    if (!wallet) {
      wallet = await tx.wallet.create({ data: { vendorId: null } });
    }
    const balanceAfter = Number(wallet.balance) + amount;
    await tx.wallet.update({
      where: { id: wallet.id },
      data: { balance: balanceAfter },
    });
    await tx.walletTransaction.create({
      data: {
        walletId: wallet.id,
        type: WalletTransactionType.CREDIT,
        amount,
        balanceAfter,
        description,
        vendorOrderId,
      },
    });
  }

  async getMyWallet(userId: string) {
    const vendorProfile = await this.getVendorProfile(userId);
    const wallet = await this.getOrCreateWallet(vendorProfile.id);
    const transactions = await this.prisma.walletTransaction.findMany({
      where: { walletId: wallet.id },
      orderBy: { createdAt: "desc" },
      take: RECENT_TRANSACTIONS_LIMIT,
    });
    return { ...wallet, transactions };
  }

  async getPlatformWallet() {
    const wallet = await this.getOrCreatePlatformWallet();
    const transactions = await this.prisma.walletTransaction.findMany({
      where: { walletId: wallet.id },
      orderBy: { createdAt: "desc" },
      take: RECENT_TRANSACTIONS_LIMIT,
    });
    return { ...wallet, transactions };
  }

  async requestWithdrawal(userId: string, amount: number) {
    const vendorProfile = await this.getVendorProfile(userId);
    if (!vendorProfile.payoutAccount) {
      throw new BadRequestException(
        "Set up a payout account before requesting a withdrawal",
      );
    }

    const wallet = await this.getOrCreateWallet(vendorProfile.id);
    if (amount <= 0 || amount > Number(wallet.balance)) {
      throw new BadRequestException("Invalid withdrawal amount");
    }

    return this.prisma.$transaction(async (tx) => {
      const withdrawalRequest = await tx.withdrawalRequest.create({
        data: { walletId: wallet.id, vendorId: vendorProfile.id, amount },
      });

      const balanceAfter = Number(wallet.balance) - amount;
      await tx.wallet.update({
        where: { id: wallet.id },
        data: { balance: balanceAfter },
      });
      await tx.walletTransaction.create({
        data: {
          walletId: wallet.id,
          type: WalletTransactionType.DEBIT,
          amount,
          balanceAfter,
          description: "Withdrawal requested",
          withdrawalRequestId: withdrawalRequest.id,
        },
      });

      return withdrawalRequest;
    });
  }

  async listMyWithdrawals(userId: string) {
    const vendorProfile = await this.getVendorProfile(userId);
    return this.prisma.withdrawalRequest.findMany({
      where: { vendorId: vendorProfile.id },
      orderBy: { requestedAt: "desc" },
    });
  }

  async listPendingWithdrawals() {
    return this.prisma.withdrawalRequest.findMany({
      where: { status: WithdrawalStatus.PENDING, vendorId: { not: null } },
      include: { vendor: { select: { businessName: true } } },
      orderBy: { requestedAt: "asc" },
    });
  }

  async approveWithdrawal(id: string, adminUserId: string) {
    let request = await this.prisma.withdrawalRequest.findUnique({
      where: { id },
      include: { vendor: true },
    });
    if (!request || !request.vendorId || !request.vendor) {
      throw new NotFoundException("Withdrawal request not found");
    }
    if (
      request.status !== WithdrawalStatus.PENDING &&
      request.status !== WithdrawalStatus.APPROVED
    ) {
      throw new BadRequestException(
        "This withdrawal request has already been processed",
      );
    }

    if (request.status === WithdrawalStatus.PENDING) {
      request = await this.prisma.withdrawalRequest.update({
        where: { id },
        data: {
          status: WithdrawalStatus.APPROVED,
          reviewedAt: new Date(),
          reviewedBy: adminUserId,
        },
        include: { vendor: true },
      });
    }

    const payoutAccount = request.vendor!.payoutAccount as unknown as PayoutAccount | null;
    if (!payoutAccount) {
      throw new BadRequestException(
        "Vendor has no payout account configured",
      );
    }

    // If the transfer call throws, the request stays APPROVED (already
    // persisted above) rather than reverting or getting lost — admin can
    // retry by calling this same endpoint again.
    const { transferId } = await this.flutterwaveService.initiateTransfer(
      request.id,
      Number(request.amount),
      "NGN",
      payoutAccount.bankCode,
      payoutAccount.accountNumber,
      `Vendor payout - ${request.vendor!.businessName}`,
    );

    return this.prisma.withdrawalRequest.update({
      where: { id },
      data: { status: WithdrawalStatus.PROCESSING, providerReference: transferId },
    });
  }

  async rejectWithdrawal(id: string, adminUserId: string, reason?: string) {
    const request = await this.prisma.withdrawalRequest.findUnique({
      where: { id },
    });
    if (!request || !request.vendorId) {
      throw new NotFoundException("Withdrawal request not found");
    }
    if (request.status !== WithdrawalStatus.PENDING) {
      throw new BadRequestException(
        "Only pending withdrawal requests can be rejected",
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const wallet = await tx.wallet.findUniqueOrThrow({
        where: { id: request.walletId },
      });
      const balanceAfter = Number(wallet.balance) + Number(request.amount);

      await tx.wallet.update({
        where: { id: wallet.id },
        data: { balance: balanceAfter },
      });
      await tx.walletTransaction.create({
        data: {
          walletId: wallet.id,
          type: WalletTransactionType.CREDIT,
          amount: request.amount,
          balanceAfter,
          description: "Withdrawal rejected — reversed",
          withdrawalRequestId: request.id,
        },
      });

      return tx.withdrawalRequest.update({
        where: { id },
        data: {
          status: WithdrawalStatus.REJECTED,
          reviewedAt: new Date(),
          reviewedBy: adminUserId,
          failureReason: reason,
        },
      });
    });
  }

  async withdrawFromPlatformWallet(adminUserId: string, amount: number) {
    const wallet = await this.getOrCreatePlatformWallet();

    // Retry an existing stuck request instead of double-debiting the wallet.
    const stuck = await this.prisma.withdrawalRequest.findFirst({
      where: {
        walletId: wallet.id,
        vendorId: null,
        status: WithdrawalStatus.APPROVED,
      },
    });

    const settings = await this.prisma.platformPaymentSettings.findFirst();
    const payoutAccount = settings?.payoutAccount as unknown as PayoutAccount | null;
    if (!payoutAccount) {
      throw new BadRequestException(
        "Set up the platform payout account first",
      );
    }

    const request =
      stuck ??
      (await (async () => {
        if (amount <= 0 || amount > Number(wallet.balance)) {
          throw new BadRequestException("Invalid withdrawal amount");
        }
        return this.prisma.$transaction(async (tx) => {
          const withdrawalRequest = await tx.withdrawalRequest.create({
            data: {
              walletId: wallet.id,
              vendorId: null,
              amount,
              status: WithdrawalStatus.APPROVED,
              reviewedAt: new Date(),
              reviewedBy: adminUserId,
            },
          });
          const balanceAfter = Number(wallet.balance) - amount;
          await tx.wallet.update({
            where: { id: wallet.id },
            data: { balance: balanceAfter },
          });
          await tx.walletTransaction.create({
            data: {
              walletId: wallet.id,
              type: WalletTransactionType.DEBIT,
              amount,
              balanceAfter,
              description: "Platform wallet withdrawal",
              withdrawalRequestId: withdrawalRequest.id,
            },
          });
          return withdrawalRequest;
        });
      })());

    const { transferId } = await this.flutterwaveService.initiateTransfer(
      request.id,
      Number(request.amount),
      "NGN",
      payoutAccount.bankCode,
      payoutAccount.accountNumber,
      "Platform wallet withdrawal",
    );

    return this.prisma.withdrawalRequest.update({
      where: { id: request.id },
      data: { status: WithdrawalStatus.PROCESSING, providerReference: transferId },
    });
  }

  async handleTransferWebhook(
    rawBody: Buffer,
    signature: string | undefined,
    payload: FlutterwaveTransferWebhookPayload,
  ) {
    if (!this.flutterwaveService.verifyWebhookSignature(rawBody, signature)) {
      throw new UnauthorizedException("Invalid Flutterwave webhook signature");
    }

    const transferId = payload.data?.id;
    if (transferId === undefined) {
      return { received: true };
    }

    const request = await this.prisma.withdrawalRequest.findFirst({
      where: { providerReference: String(transferId) },
    });
    if (!request) {
      this.logger.warn(`No withdrawal request found for transfer ${transferId}`);
      return { received: true };
    }
    if (request.status === WithdrawalStatus.PAID || request.status === WithdrawalStatus.FAILED) {
      return { received: true };
    }

    const successful = payload.data?.status === "SUCCESSFUL";
    if (successful) {
      await this.prisma.withdrawalRequest.update({
        where: { id: request.id },
        data: { status: WithdrawalStatus.PAID, paidAt: new Date() },
      });
      return { received: true };
    }

    // Failed transfer — the money never left, so reverse the debit.
    await this.prisma.$transaction(async (tx) => {
      const wallet = await tx.wallet.findUniqueOrThrow({
        where: { id: request.walletId },
      });
      const balanceAfter = Number(wallet.balance) + Number(request.amount);

      await tx.wallet.update({
        where: { id: wallet.id },
        data: { balance: balanceAfter },
      });
      await tx.walletTransaction.create({
        data: {
          walletId: wallet.id,
          type: WalletTransactionType.CREDIT,
          amount: request.amount,
          balanceAfter,
          description: "Transfer failed — reversed",
          withdrawalRequestId: request.id,
        },
      });
      await tx.withdrawalRequest.update({
        where: { id: request.id },
        data: {
          status: WithdrawalStatus.FAILED,
          failureReason: payload.data?.complete_message ?? "Transfer failed",
        },
      });
    });

    return { received: true };
  }
}
