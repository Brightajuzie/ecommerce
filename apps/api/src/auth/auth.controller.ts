import { Body, Controller, HttpCode, HttpStatus, Post } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { Throttle } from "@nestjs/throttler";
import { AuthService } from "./auth.service";
import { RegisterDto } from "./dto/register.dto";
import { LoginDto } from "./dto/login.dto";
import { RefreshDto } from "./dto/refresh.dto";

// Tighter than the global rate limit (100 req/min) on credential-guessing
// surfaces, to slow down brute-force/credential-stuffing attempts.
const AUTH_THROTTLE = { default: { limit: 10, ttl: 60_000 } };

@ApiTags("auth")
@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Throttle(AUTH_THROTTLE)
  @Post("register")
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Throttle(AUTH_THROTTLE)
  @Post("login")
  @HttpCode(HttpStatus.OK)
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Throttle(AUTH_THROTTLE)
  @Post("refresh")
  @HttpCode(HttpStatus.OK)
  refresh(@Body() dto: RefreshDto) {
    return this.authService.refresh(dto.refreshToken);
  }
}
