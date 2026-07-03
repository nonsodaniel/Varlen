import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { PrismaService } from '../../database/prisma.service';
import { JwtPayload } from './interfaces/jwt-payload.interface';
import { RegisterDto } from './dto/register.dto';
import { AuthResponseDto } from './dto/auth-response.dto';

const BCRYPT_ROUNDS = 12;
const REFRESH_TOKEN_BYTES = 48;
const REFRESH_TOKEN_EXPIRY_DAYS = 7;
const RESET_TOKEN_BYTES = 32;
const RESET_TOKEN_TTL_SECONDS = 3600; // 1 hour

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Register a new user, create their default household, and return tokens.
   */
  async register(dto: RegisterDto): Promise<AuthResponseDto> {
    const email = dto.email.toLowerCase().trim();

    const existingUser = await this.prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new ConflictException('A user with this email already exists');
    }

    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);

    const result = await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email,
          passwordHash,
          name: dto.name.trim(),
        },
      });

      const household = await tx.household.create({
        data: {
          name: `${dto.name}'s Home`,
        },
      });

      await tx.householdMember.create({
        data: {
          userId: user.id,
          householdId: household.id,
          role: 'OWNER',
        },
      });

      return { user, household };
    });

    const { user, household } = result;

    const tokens = await this.generateTokens(
      user.id,
      user.email,
      household.id,
      'OWNER',
    );

    return {
      ...tokens,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
    };
  }

  /**
   * Login: generate access + refresh tokens for an authenticated user.
   */
  async login(userId: string): Promise<AuthResponseDto> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Look up the user's active household membership
    const membership = await this.prisma.householdMember.findFirst({
      where: { userId: user.id, leftAt: null },
    });

    const tokens = await this.generateTokens(
      user.id,
      user.email,
      membership?.householdId,
      membership?.role,
    );

    return {
      ...tokens,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
    };
  }

  /**
   * Refresh tokens: validate the refresh token, revoke the old one, and issue new pair.
   */
  async refreshTokens(refreshToken: string): Promise<AuthResponseDto> {
    const storedToken = await this.prisma.refreshToken.findUnique({
      where: { token: refreshToken },
      include: { user: true },
    });

    if (!storedToken) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    // Check if the token has been revoked
    if (storedToken.revokedAt) {
      // Possible token reuse attack: revoke all tokens for this user
      await this.prisma.refreshToken.updateMany({
        where: { userId: storedToken.userId, revokedAt: null },
        data: { revokedAt: new Date() },
      });

      this.logger.warn(
        `Refresh token reuse detected for user ${storedToken.userId}`,
      );
      throw new UnauthorizedException(
        'Refresh token has been revoked. All sessions have been invalidated.',
      );
    }

    // Check if the token has expired
    if (new Date() > storedToken.expiresAt) {
      await this.prisma.refreshToken.update({
        where: { id: storedToken.id },
        data: { revokedAt: new Date() },
      });

      throw new UnauthorizedException('Refresh token has expired');
    }

    // Revoke the old refresh token (rotation)
    await this.prisma.refreshToken.update({
      where: { id: storedToken.id },
      data: { revokedAt: new Date() },
    });

    const { user } = storedToken;

    // Look up the user's active household membership
    const membership = await this.prisma.householdMember.findFirst({
      where: { userId: user.id, leftAt: null },
    });

    const tokens = await this.generateTokens(
      user.id,
      user.email,
      membership?.householdId,
      membership?.role,
    );

    return {
      ...tokens,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
    };
  }

  /**
   * Logout: revoke the given refresh token.
   */
  async logout(refreshToken: string): Promise<void> {
    const storedToken = await this.prisma.refreshToken.findUnique({
      where: { token: refreshToken },
    });

    if (storedToken && !storedToken.revokedAt) {
      await this.prisma.refreshToken.update({
        where: { id: storedToken.id },
        data: { revokedAt: new Date() },
      });
    }
  }

  /**
   * Validate user credentials. Returns the user (without passwordHash) or null.
   */
  async validateUser(email: string, password: string): Promise<any | null> {
    const user = await this.prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    if (!user) {
      // Run a dummy hash compare to prevent timing attacks
      await bcrypt.compare(password, '$2b$12$invalidhashfortimingattak');
      return null;
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

    if (!isPasswordValid) {
      return null;
    }

    const { passwordHash: _hash, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  /**
   * Generate JWT access token + opaque refresh token, storing refresh in DB.
   */
  async generateTokens(
    userId: string,
    email: string,
    householdId?: string,
    role?: string,
  ): Promise<{ accessToken: string; refreshToken: string; expiresIn: number }> {
    const payload: JwtPayload = {
      sub: userId,
      email,
      householdId,
      role,
    };

    const accessToken = this.jwtService.sign(payload);

    const refreshToken = crypto.randomBytes(REFRESH_TOKEN_BYTES).toString('hex');

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + REFRESH_TOKEN_EXPIRY_DAYS);

    await this.prisma.refreshToken.create({
      data: {
        token: refreshToken,
        userId,
        expiresAt,
      },
    });

    const expirationStr = this.configService.get<string>(
      'JWT_ACCESS_EXPIRATION',
      '15m',
    );
    const expiresIn = this.parseExpirationToSeconds(expirationStr);

    return {
      accessToken,
      refreshToken,
      expiresIn,
    };
  }

  /**
   * Change password for an authenticated user.
   */
  async changePassword(
    userId: string,
    oldPassword: string,
    newPassword: string,
  ): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const isOldPasswordValid = await bcrypt.compare(oldPassword, user.passwordHash);

    if (!isOldPasswordValid) {
      throw new BadRequestException('Current password is incorrect');
    }

    const newHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);

    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash: newHash },
    });

    // Revoke all existing refresh tokens for security
    await this.prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  /**
   * Forgot password: generate a reset token and log it (MVP - no email sending).
   */
  async forgotPassword(email: string): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    // Always return success to prevent email enumeration
    if (!user) {
      this.logger.debug(
        `Password reset requested for non-existent email: ${email}`,
      );
      return;
    }

    const resetToken = crypto
      .randomBytes(RESET_TOKEN_BYTES)
      .toString('hex');

    const expiresAt = new Date();
    expiresAt.setSeconds(expiresAt.getSeconds() + RESET_TOKEN_TTL_SECONDS);

    // Invalidate any existing reset tokens for this user
    await this.prisma.passwordReset.updateMany({
      where: { userId: user.id, used: false },
      data: { used: true },
    });

    // Create the new reset token
    await this.prisma.passwordReset.create({
      data: {
        token: resetToken,
        userId: user.id,
        expiresAt,
      },
    });

    // MVP: log the token instead of sending email
    this.logger.log(
      `[MVP] Password reset token for ${email}: ${resetToken}`,
    );
  }

  /**
   * Reset password using a valid reset token.
   */
  async resetPassword(token: string, newPassword: string): Promise<void> {
    const resetRecord = await this.prisma.passwordReset.findUnique({
      where: { token },
    });

    if (!resetRecord) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    if (resetRecord.used) {
      throw new BadRequestException('Reset token has already been used');
    }

    if (new Date() > resetRecord.expiresAt) {
      await this.prisma.passwordReset.update({
        where: { id: resetRecord.id },
        data: { used: true },
      });
      throw new BadRequestException('Reset token has expired');
    }

    const passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);

    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: resetRecord.userId },
        data: { passwordHash },
      });

      await tx.passwordReset.update({
        where: { id: resetRecord.id },
        data: { used: true },
      });

      // Revoke all refresh tokens for this user
      await tx.refreshToken.updateMany({
        where: { userId: resetRecord.userId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    });
  }

  /**
   * Parse a duration string (e.g. '15m', '1h', '7d') to seconds.
   */
  private parseExpirationToSeconds(expiration: string): number {
    const match = expiration.match(/^(\d+)([smhd])$/);
    if (!match) {
      return 900; // Default: 15 minutes
    }

    const value = parseInt(match[1], 10);
    const unit = match[2];

    switch (unit) {
      case 's':
        return value;
      case 'm':
        return value * 60;
      case 'h':
        return value * 3600;
      case 'd':
        return value * 86400;
      default:
        return 900;
    }
  }
}
