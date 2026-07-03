import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  ServiceUnavailableException,
} from "@nestjs/common";
import { PrismaService } from "./prisma/prisma.service";

@Controller()
export class AppController {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Readiness probe: confirms the process is up AND can reach the database,
   * so orchestrators (Kubernetes, load balancers) don't route traffic to an
   * instance that's running but can't actually serve requests.
   */
  @Get("health")
  @HttpCode(HttpStatus.OK)
  async health() {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
    } catch {
      throw new ServiceUnavailableException("Database is unreachable");
    }
    return { status: "ok", timestamp: new Date().toISOString() };
  }
}
