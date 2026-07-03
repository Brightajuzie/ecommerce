import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { UpdateProfileDto } from "./dto/update-profile.dto";
import { AddressDto } from "./dto/address.dto";

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async getProfile(userId: string) {
    return this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        phone: true,
        firstName: true,
        lastName: true,
        role: true,
        createdAt: true,
        vendorProfile: true,
      },
    });
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    return this.prisma.user.update({
      where: { id: userId },
      data: dto,
      select: {
        id: true,
        email: true,
        phone: true,
        firstName: true,
        lastName: true,
        role: true,
      },
    });
  }

  async listAddresses(userId: string) {
    return this.prisma.address.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });
  }

  async createAddress(userId: string, dto: AddressDto) {
    if (dto.isDefault) {
      await this.prisma.address.updateMany({
        where: { userId },
        data: { isDefault: false },
      });
    }
    return this.prisma.address.create({ data: { ...dto, userId } });
  }

  async updateAddress(
    userId: string,
    addressId: string,
    dto: Partial<AddressDto>,
  ) {
    const address = await this.prisma.address.findUnique({
      where: { id: addressId },
    });
    if (!address || address.userId !== userId) {
      throw new NotFoundException("Address not found");
    }

    if (dto.isDefault) {
      await this.prisma.address.updateMany({
        where: { userId },
        data: { isDefault: false },
      });
    }

    return this.prisma.address.update({ where: { id: addressId }, data: dto });
  }

  async deleteAddress(userId: string, addressId: string) {
    const address = await this.prisma.address.findUnique({
      where: { id: addressId },
    });
    if (!address || address.userId !== userId) {
      throw new NotFoundException("Address not found");
    }
    await this.prisma.address.delete({ where: { id: addressId } });
    return { success: true };
  }
}
