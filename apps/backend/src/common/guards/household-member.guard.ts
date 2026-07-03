import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class HouseholdMemberGuard implements CanActivate {
  constructor(private prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const userId = request.user?.sub;
    const householdId = request.params?.householdId;

    if (!userId || !householdId) {
      throw new ForbiddenException('Access denied');
    }

    const membership = await this.prisma.householdMember.findUnique({
      where: {
        userId_householdId: { userId, householdId },
      },
      include: { household: { select: { deletedAt: true } } },
    });

    if (!membership || membership.leftAt || membership.household?.deletedAt) {
      throw new ForbiddenException('You are not a member of this household');
    }

    request.householdMembership = membership;
    return true;
  }
}
