import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
  IsEmail,
  IsOptional,
  IsString,
  MinLength,
  ValidateNested,
} from "class-validator";

// Same shape as users/dto/address.dto.ts's AddressDto minus isDefault — a
// guest checkout's address is always the one created, always the default.
class GuestAddressDto {
  @ApiPropertyOptional({ default: "Home" })
  @IsOptional()
  @IsString()
  label?: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  line1: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  line2?: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  city: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  state: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  country?: string;

  @ApiProperty()
  @IsString()
  @MinLength(7)
  phone: string;
}

// POST /auth/guest-checkout — lets a buyer complete an order without
// registering first. Creates a real (but password-less until
// AuthService.setPassword) account behind the scenes; see AuthService for
// why this is a full account and not a nullable-buyerId guest order.
export class GuestCheckoutDto {
  @ApiProperty()
  @IsEmail()
  email: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  firstName: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  lastName: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({ type: GuestAddressDto })
  @ValidateNested()
  @Type(() => GuestAddressDto)
  address: GuestAddressDto;
}
