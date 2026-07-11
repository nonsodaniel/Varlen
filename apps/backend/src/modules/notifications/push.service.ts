import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class PushService implements OnModuleInit {
  private expo: any;
  private ExpoModule: any;
  private readonly logger = new Logger(PushService.name);

  constructor(private prisma: PrismaService) {}

  async onModuleInit() {
    try {
      // Use Function constructor to prevent TypeScript from compiling import() to require()
      this.ExpoModule = await new Function('return import("expo-server-sdk")')();
      const ExpoClass = this.ExpoModule.default ?? this.ExpoModule.Expo;
      this.expo = new ExpoClass();
      this.logger.log('Expo push SDK loaded');
    } catch (error) {
      this.logger.error('Failed to load expo-server-sdk', error);
    }
  }

  private isExpoPushToken(token: string): boolean {
    return this.ExpoModule?.default?.isExpoPushToken?.(token)
      ?? this.ExpoModule?.Expo?.isExpoPushToken?.(token)
      ?? /^Expo[A-Za-z0-9\-_]+$/.test(token);
  }

  async saveToken(userId: string, token: string, platform: string) {
    return this.prisma.pushToken.upsert({
      where: { token },
      create: { userId, token, platform, active: true },
      update: { userId, platform, active: true },
    });
  }

  async removeToken(token: string) {
    return this.prisma.pushToken.updateMany({
      where: { token },
      data: { active: false },
    });
  }

  async sendToUser(
    userId: string,
    title: string,
    body: string,
    data?: Record<string, unknown>,
  ) {
    if (!this.expo) return;

    const tokens = await this.prisma.pushToken.findMany({
      where: { userId, active: true },
    });

    if (tokens.length === 0) return;

    const messages = tokens
      .filter((t) => this.isExpoPushToken(t.token))
      .map((t) => ({
        to: t.token,
        title,
        body,
        sound: 'default' as const,
        data: data ?? {},
      }));

    if (messages.length === 0) return;

    try {
      const chunks = this.expo.chunkPushNotifications(messages);
      for (const chunk of chunks) {
        const tickets = await this.expo.sendPushNotificationsAsync(chunk);
        await this.handleTickets(tickets, tokens.map((t) => t.token));
      }
    } catch (error) {
      this.logger.error(`Failed to send push to user ${userId}`, error);
    }
  }

  async sendToMany(
    userIds: string[],
    title: string,
    body: string,
    data?: Record<string, unknown>,
  ) {
    if (!this.expo) return;

    const tokens = await this.prisma.pushToken.findMany({
      where: { userId: { in: userIds }, active: true },
    });

    if (tokens.length === 0) return;

    const messages = tokens
      .filter((t) => this.isExpoPushToken(t.token))
      .map((t) => ({
        to: t.token,
        title,
        body,
        sound: 'default' as const,
        data: data ?? {},
      }));

    if (messages.length === 0) return;

    try {
      const chunks = this.expo.chunkPushNotifications(messages);
      for (const chunk of chunks) {
        const tickets = await this.expo.sendPushNotificationsAsync(chunk);
        await this.handleTickets(tickets, tokens.map((t) => t.token));
      }
    } catch (error) {
      this.logger.error('Failed to send batch push', error);
    }
  }

  private async handleTickets(tickets: any[], tokenList: string[]) {
    for (let i = 0; i < tickets.length; i++) {
      const ticket = tickets[i];
      if (ticket.status === 'error') {
        if (
          ticket.details?.error === 'DeviceNotRegistered' &&
          tokenList[i]
        ) {
          await this.prisma.pushToken.updateMany({
            where: { token: tokenList[i] },
            data: { active: false },
          });
          this.logger.warn(`Deactivated invalid token: ${tokenList[i].slice(0, 20)}...`);
        }
      }
    }
  }
}
