import { Injectable, Logger, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { EmailService } from '../email/email.service';
import { JoinWaitlistDto } from './dto/join-waitlist.dto';

@Injectable()
export class WaitlistService {
  private readonly logger = new Logger(WaitlistService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
  ) {}

  async join(dto: JoinWaitlistDto, ipCountry?: string) {
    const email = dto.email.toLowerCase().trim();

    // Check if already on waitlist
    const existing = await this.prisma.waitlistEntry.findUnique({
      where: { email },
    });

    if (existing) {
      // Don't throw error — just return success to avoid email enumeration
      return {
        message: "You're already on the waitlist! We'll be in touch soon.",
        alreadyJoined: true,
      };
    }

    const entry = await this.prisma.waitlistEntry.create({
      data: {
        email,
        name: dto.name?.trim() || null,
        country: ipCountry || null,
        source: dto.source || 'landing',
      },
    });

    // Get position (total count)
    const position = await this.prisma.waitlistEntry.count();

    // Send welcome email
    try {
      await this.emailService.sendWaitlistWelcomeEmail(
        email,
        dto.name?.trim() || 'there',
        position,
      );
    } catch (err) {
      this.logger.warn(`Failed to send waitlist email to ${email}: ${(err as Error).message}`);
    }

    this.logger.log(`New waitlist signup: ${email} (position #${position})`);

    return {
      message: "You're on the list! Check your email for confirmation.",
      position,
      alreadyJoined: false,
    };
  }

  async getAll(page = 1, limit = 50) {
    const skip = (page - 1) * limit;

    const [entries, total] = await Promise.all([
      this.prisma.waitlistEntry.findMany({
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.waitlistEntry.count(),
    ]);

    return {
      data: entries,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getStats() {
    const [total, today, thisWeek, byCountry, bySource, recentSignups] = await Promise.all([
      this.prisma.waitlistEntry.count(),
      this.prisma.waitlistEntry.count({
        where: {
          createdAt: {
            gte: new Date(new Date().setHours(0, 0, 0, 0)),
          },
        },
      }),
      this.prisma.waitlistEntry.count({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          },
        },
      }),
      this.prisma.waitlistEntry.groupBy({
        by: ['country'],
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
        take: 20,
      }),
      this.prisma.waitlistEntry.groupBy({
        by: ['source'],
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
      }),
      this.prisma.waitlistEntry.findMany({
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
    ]);

    return {
      total,
      today,
      thisWeek,
      byCountry: byCountry.map((c) => ({
        country: c.country || 'Unknown',
        count: c._count.id,
      })),
      bySource: bySource.map((s) => ({
        source: s.source || 'Unknown',
        count: s._count.id,
      })),
      recentSignups: recentSignups.map((e) => ({
        id: e.id,
        email: e.email,
        name: e.name,
        country: e.country,
        source: e.source,
        createdAt: e.createdAt,
      })),
    };
  }

  async delete(id: string) {
    await this.prisma.waitlistEntry.delete({ where: { id } });
    return { message: 'Entry removed' };
  }
}
