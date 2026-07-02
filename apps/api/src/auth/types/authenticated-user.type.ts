import { UserRole } from "@prisma/client";

export interface AuthenticatedUser {
  userId: string;
  email: string;
  role: UserRole;
}

export interface JwtPayload {
  sub: string;
  email: string;
  role: UserRole;
}
