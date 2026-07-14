import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class NotificationPreferencesService {
  constructor(private readonly prisma: PrismaService) {}

  async getPreferences(userId: string, householdId?: string) {
    const hid = householdId ?? '';
    let prefs = await this.prisma.notificationPreference.findUnique({
      where: { userId_householdId: { userId, householdId: hid } },
    });

    if (!prefs) {
      prefs = await this.prisma.notificationPreference.create({
        data: { userId, householdId: hid },
      });
    }

    return prefs;
  }

  async updatePreferences(
    userId: string,
    data: {
      householdId?: string;
      pushEnabled?: boolean;
      emailEnabled?: boolean;
      reminders?: boolean;
      activities?: boolean;
      chores?: boolean;
      events?: boolean;
      expenses?: boolean;
      system?: boolean;
      digestEnabled?: boolean;
      digestTime?: string;
      quietHoursStart?: string;
      quietHoursEnd?: string;
    },
  ) {
    const { householdId, ...updateData } = data;
    const hid = householdId ?? '';

    return this.prisma.notificationPreference.upsert({
      where: { userId_householdId: { userId, householdId: hid } },
      create: { userId, householdId: hid, ...updateData },
      update: updateData,
    });
  }

  async shouldNotify(
    userId: string,
    type: string,
    householdId?: string,
  ): Promise<boolean> {
    const prefs = await this.prisma.notificationPreference.findUnique({
      where: {
        userId_householdId: { userId, householdId: householdId ?? '' },
      },
    });

    if (!prefs) return true; // Default: allow all

    if (!prefs.pushEnabled) return false;

    // Check quiet hours
    if (prefs.quietHoursStart && prefs.quietHoursEnd) {
      const now = new Date();
      const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      if (prefs.quietHoursStart <= prefs.quietHoursEnd) {
        if (currentTime >= prefs.quietHoursStart && currentTime <= prefs.quietHoursEnd) {
          return false;
        }
      } else {
        // Overnight quiet hours (e.g., 22:00-07:00)
        if (currentTime >= prefs.quietHoursStart || currentTime <= prefs.quietHoursEnd) {
          return false;
        }
      }
    }

    // Check by notification type
    const typeMap: Record<string, keyof typeof prefs> = {
      REMINDER: 'reminders',
      ACTIVITY: 'activities',
      CHORE: 'chores',
      EVENT: 'events',
      SYSTEM: 'system',
    };

    const prefKey = typeMap[type];
    if (prefKey && prefs[prefKey] === false) return false;

    return true;
  }
}
