import { ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsDateString, IsEnum, IsIn, IsInt, IsOptional, IsString, Min } from "class-validator";
import { OrderStatus } from "@prisma/client";

export class AdminOrdersQueryDto {
  // Only read by the /orders/admin/export route — harmless and unused on
  // the plain list route. Declared here (not as a bolted-on intersection
  // type in the controller) because the global ValidationPipe's
  // whitelist:true strips any query field not declared on the DTO class
  // itself, regardless of what the controller's TypeScript type says.
  @ApiPropertyOptional({ enum: ["xlsx", "pdf"], default: "xlsx" })
  @IsOptional()
  @IsIn(["xlsx", "pdf"])
  format?: "xlsx" | "pdf";
  @ApiPropertyOptional({ enum: OrderStatus })
  @IsOptional()
  @IsEnum(OrderStatus)
  status?: OrderStatus;

  // Matches against the buyer's name/email — see OrdersService
  // .buildAdminOrdersWhere.
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: "ISO date — orders created on/after this date" })
  @IsOptional()
  @IsDateString()
  from?: string;

  @ApiPropertyOptional({ description: "ISO date — orders created on/before this date" })
  @IsOptional()
  @IsDateString()
  to?: string;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  pageSize?: number;
}
