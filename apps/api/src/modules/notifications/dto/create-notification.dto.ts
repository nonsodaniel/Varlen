import { NotificationType } from '@prisma/client';

export class CreateNotificationDto {
  userId: string;
  householdId?: string;
  title: string;
  body: string;
  type: NotificationType;
  icon?: string;
  resourceId?: string;
  resourceType?: string;
}
