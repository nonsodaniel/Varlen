import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';

// Role hierarchy: higher index = more privilege
const ROLE_HIERARCHY: Record<string, number> = {
  VIEWER: 0,
  FRIEND: 1,
  FAMILY: 2,
  CHILD: 3,
  MEMBER: 4,
  PARTNER: 5,
  ADMIN: 6,
  OWNER: 7,
};

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!requiredRoles) {
      return true;
    }
    const request = context.switchToHttp().getRequest();

    // Check household membership role (set by HouseholdMemberGuard)
    const membershipRole = request.householdMembership?.role;
    if (membershipRole) {
      const userLevel = ROLE_HIERARCHY[membershipRole] ?? -1;
      // User passes if their level >= any required role level
      const passes = requiredRoles.some(
        (role) => userLevel >= (ROLE_HIERARCHY[role] ?? 99),
      );
      if (!passes) {
        throw new ForbiddenException(
          `Role "${membershipRole}" does not have sufficient permissions. Required: ${requiredRoles.join(', ')}`,
        );
      }
      return true;
    }

    // Fallback to user-level role
    const userRole = request.user?.role;
    if (userRole) {
      const userLevel = ROLE_HIERARCHY[userRole] ?? -1;
      return requiredRoles.some(
        (role) => userLevel >= (ROLE_HIERARCHY[role] ?? 99),
      );
    }

    throw new ForbiddenException('Insufficient permissions');
  }
}
