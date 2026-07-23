import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { OAuth2Client, TokenPayload } from 'google-auth-library';
import { PrismaService } from '../../database/prisma.service';
import { EmailService } from '../email/email.service';
import { JwtPayload } from './interfaces/jwt-payload.interface';
import { RegisterDto } from './dto/register.dto';
import { AuthResponseDto } from './dto/auth-response.dto';

const BCRYPT_ROUNDS = 12;
const REFRESH_TOKEN_BYTES = 48;
const REFRESH_TOKEN_EXPIRY_DAYS = 7;
const VERIFICATION_CODE_EXPIRY_MINUTES = 15;
const RESET_CODE_EXPIRY_MINUTES = 60;
const MAX_CODE_ATTEMPTS = 5;

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly googleClient: OAuth2Client;

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly emailService: EmailService,
  ) {
    this.googleClient = new OAuth2Client(
      this.configService.get<string>('GOOGLE_CLIENT_ID'),
    );
  }

  // ─── Registration ──────────────────────────────────────────────────

  async register(dto: RegisterDto) {
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
          emailVerified: true, // Skip verification while emailing is not ready
          ...(dto.country ? { country: dto.country.toUpperCase().slice(0, 3) } : {}),
        },
      });

      const household = await tx.household.create({
        data: {
          name: `${dto.name}'s Home`,
          type: 'PRIMARY',
          createdById: user.id,
        },
      });

      await tx.householdMember.create({
        data: {
          userId: user.id,
          householdId: household.id,
          role: 'OWNER',
        },
      });

      await tx.user.update({
        where: { id: user.id },
        data: { primaryCircleId: household.id },
      });

      return { user, household };
    });

    const { user } = result;

    // Generate tokens immediately — email verification skipped (emailing not ready)
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
      message: 'Account created successfully.',
      ...tokens,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        emailVerified: true,
      },
    };
  }

  // ─── Login ─────────────────────────────────────────────────────────

  async login(userId: string): Promise<AuthResponseDto> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Email verification gate disabled while emailing is not ready.
    // All new accounts are auto-verified at registration.

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
        emailVerified: user.emailVerified,
      },
    };
  }

  // ─── Google OAuth ──────────────────────────────────────────────────

  async googleAuth(idToken: string): Promise<AuthResponseDto> {
    let payload: TokenPayload | undefined;
    try {
      const ticket = await this.googleClient.verifyIdToken({
        idToken,
        audience: this.configService.get<string>('GOOGLE_CLIENT_ID'),
      });
      payload = ticket.getPayload();
      if (!payload) throw new Error('Empty payload');
    } catch (error) {
      this.logger.warn(`Google token verification failed: ${(error as Error).message}`);
      throw new UnauthorizedException('Invalid Google ID token');
    }

    const { sub: googleId, email, name, picture, email_verified } = payload;

    if (!email) {
      throw new UnauthorizedException('Google account does not have an email');
    }

    let user = await this.prisma.$transaction(async (tx) => {
      let existing = await tx.user.findFirst({
        where: {
          OR: [{ googleId }, { email: email.toLowerCase() }],
        },
      });

      if (existing) {
        if (!existing.googleId) {
          existing = await tx.user.update({
            where: { id: existing.id },
            data: {
              googleId,
              avatarUrl: existing.avatarUrl ?? picture,
              emailVerified: email_verified ?? existing.emailVerified,
            },
          });
        }
        return existing;
      }

      const newUser = await tx.user.create({
        data: {
          email: email.toLowerCase(),
          name: name ?? email.split('@')[0],
          googleId,
          authProvider: 'google',
          passwordHash: null,
          avatarUrl: picture,
          emailVerified: email_verified ?? false,
        },
      });

      const household = await tx.household.create({
        data: {
          name: `${newUser.name}'s Home`,
          type: 'PRIMARY',
          createdById: newUser.id,
        },
      });

      await tx.householdMember.create({
        data: {
          userId: newUser.id,
          householdId: household.id,
          role: 'OWNER',
        },
      });

      await tx.user.update({
        where: { id: newUser.id },
        data: { primaryCircleId: household.id },
      });

      return newUser;
    });

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
        emailVerified: user.emailVerified,
      },
    };
  }

  // ─── Email Verification ────────────────────────────────────────────

  async verifyEmail(email: string, code: string): Promise<AuthResponseDto> {
    const normalizedEmail = email.toLowerCase().trim();

    const user = await this.prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (!user) {
      throw new BadRequestException('Invalid verification code');
    }

    if (user.emailVerified) {
      throw new BadRequestException('Email is already verified');
    }

    const verification = await this.prisma.emailVerification.findFirst({
      where: {
        userId: user.id,
        used: false,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!verification) {
      throw new BadRequestException(
        'No active verification code found. Please request a new one.',
      );
    }

    if (verification.attempts >= MAX_CODE_ATTEMPTS) {
      // Burn the code after too many failed attempts
      await this.prisma.emailVerification.update({
        where: { id: verification.id },
        data: { used: true },
      });
      throw new BadRequestException(
        'Too many failed attempts. Please request a new verification code.',
      );
    }

    // Timing-safe comparison to prevent timing attacks on short codes
    const isValid =
      code.length === verification.code.length &&
      crypto.timingSafeEqual(
        Buffer.from(code),
        Buffer.from(verification.code),
      );

    if (!isValid) {
      await this.prisma.emailVerification.update({
        where: { id: verification.id },
        data: { attempts: { increment: 1 } },
      });

      const remaining = MAX_CODE_ATTEMPTS - verification.attempts - 1;
      throw new BadRequestException(
        remaining > 0
          ? `Invalid verification code. ${remaining} attempt${remaining === 1 ? '' : 's'} remaining.`
          : 'Too many failed attempts. Please request a new verification code.',
      );
    }

    // Atomically mark as used to prevent TOCTOU race
    const { count } = await this.prisma.emailVerification.updateMany({
      where: { id: verification.id, used: false },
      data: { used: true },
    });

    if (count === 0) {
      throw new BadRequestException('Verification code has already been used');
    }

    // Mark email as verified
    await this.prisma.user.update({
      where: { id: user.id },
      data: { emailVerified: true },
    });

    // Send welcome email
    this.emailService
      .sendWelcomeEmail(user.email, user.name)
      .catch((err) =>
        this.logger.error(`Failed to send welcome email: ${err.message}`),
      );

    // Generate tokens so the user is logged in after verification
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
        emailVerified: true,
      },
    };
  }

  async resendVerification(email: string): Promise<void> {
    const normalizedEmail = email.toLowerCase().trim();

    const user = await this.prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    // Always return success to prevent email enumeration
    if (!user) {
      this.logger.debug(
        `Verification resend requested for non-existent email: ${email}`,
      );
      return;
    }

    if (user.emailVerified) {
      // Don't reveal that the email is already verified
      return;
    }

    await this.createAndSendVerificationCode(
      user.id,
      user.email,
      user.name,
    );
  }

  // ─── Forgot Password ──────────────────────────────────────────────

  async forgotPassword(email: string): Promise<void> {
    const normalizedEmail = email.toLowerCase().trim();

    const user = await this.prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    // Always return success to prevent email enumeration.
    // Use dummy work to make the response time indistinguishable.
    if (!user) {
      // Perform dummy hash to match timing of the real path
      await bcrypt.hash('dummy', BCRYPT_ROUNDS);
      this.logger.debug(
        `Password reset requested for non-existent email: ${email}`,
      );
      return;
    }

    // Don't send reset codes for Google-only accounts (no password)
    if (!user.passwordHash) {
      // Perform dummy hash to match timing
      await bcrypt.hash('dummy', BCRYPT_ROUNDS);
      this.logger.debug(
        `Password reset requested for Google-only account: ${email}`,
      );
      return;
    }

    const code = this.generateSixDigitCode();

    const expiresAt = new Date();
    expiresAt.setMinutes(
      expiresAt.getMinutes() + RESET_CODE_EXPIRY_MINUTES,
    );

    // Invalidate any existing reset codes for this user
    await this.prisma.passwordReset.updateMany({
      where: { userId: user.id, used: false },
      data: { used: true },
    });

    // Create the new reset code
    await this.prisma.passwordReset.create({
      data: {
        token: code,
        userId: user.id,
        expiresAt,
      },
    });

    // Send password reset email
    await this.emailService.sendPasswordResetEmail(
      user.email,
      user.name,
      code,
    );

    this.logger.debug(`Password reset code generated for ${email}`);
  }

  // ─── Reset Password ───────────────────────────────────────────────

  async resetPassword(
    email: string,
    code: string,
    newPassword: string,
  ): Promise<void> {
    const normalizedEmail = email.toLowerCase().trim();

    const user = await this.prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (!user) {
      throw new BadRequestException('Invalid or expired reset code');
    }

    const resetRecord = await this.prisma.passwordReset.findFirst({
      where: {
        userId: user.id,
        used: false,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!resetRecord) {
      throw new BadRequestException('Invalid or expired reset code');
    }

    if (resetRecord.attempts >= MAX_CODE_ATTEMPTS) {
      await this.prisma.passwordReset.update({
        where: { id: resetRecord.id },
        data: { used: true },
      });
      throw new BadRequestException(
        'Too many failed attempts. Please request a new reset code.',
      );
    }

    // Timing-safe comparison
    const isValid =
      code.length === resetRecord.token.length &&
      crypto.timingSafeEqual(
        Buffer.from(code),
        Buffer.from(resetRecord.token),
      );

    if (!isValid) {
      await this.prisma.passwordReset.update({
        where: { id: resetRecord.id },
        data: { attempts: { increment: 1 } },
      });

      const remaining = MAX_CODE_ATTEMPTS - resetRecord.attempts - 1;
      throw new BadRequestException(
        remaining > 0
          ? `Invalid reset code. ${remaining} attempt${remaining === 1 ? '' : 's'} remaining.`
          : 'Too many failed attempts. Please request a new reset code.',
      );
    }

    // Atomically mark code as used to prevent TOCTOU race
    const { count } = await this.prisma.passwordReset.updateMany({
      where: { id: resetRecord.id, used: false },
      data: { used: true },
    });

    if (count === 0) {
      throw new BadRequestException('Reset code has already been used');
    }

    const passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);

    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: user.id },
        data: { passwordHash },
      });

      // Revoke all refresh tokens for this user
      await tx.refreshToken.updateMany({
        where: { userId: user.id, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    });

    // Send password changed confirmation email
    this.emailService
      .sendPasswordChangedEmail(user.email, user.name)
      .catch((err) =>
        this.logger.error(
          `Failed to send password changed email: ${err.message}`,
        ),
      );
  }

  // ─── Refresh Tokens ───────────────────────────────────────────────

  async refreshTokens(refreshToken: string): Promise<AuthResponseDto> {
    const storedToken = await this.prisma.refreshToken.findUnique({
      where: { token: refreshToken },
      include: { user: true },
    });

    if (!storedToken) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    if (storedToken.revokedAt) {
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

    if (new Date() > storedToken.expiresAt) {
      await this.prisma.refreshToken.update({
        where: { id: storedToken.id },
        data: { revokedAt: new Date() },
      });

      throw new UnauthorizedException('Refresh token has expired');
    }

    const { count } = await this.prisma.refreshToken.updateMany({
      where: { id: storedToken.id, revokedAt: null },
      data: { revokedAt: new Date() },
    });

    if (count === 0) {
      throw new UnauthorizedException('Refresh token has already been used');
    }

    const { user } = storedToken;

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
        emailVerified: user.emailVerified,
      },
    };
  }

  // ─── Logout ────────────────────────────────────────────────────────

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

  // ─── Validate Credentials ─────────────────────────────────────────

  async validateUser(email: string, password: string): Promise<any | null> {
    const user = await this.prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    if (!user) {
      // Dummy hash compare to prevent timing attacks
      await bcrypt.compare(password, '$2b$12$invalidhashfortimingattak');
      return null;
    }

    if (!user.passwordHash) {
      return null;
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

    if (!isPasswordValid) {
      return null;
    }

    const { passwordHash: _hash, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  // ─── Change Password (authenticated) ──────────────────────────────

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

    if (!user.passwordHash) {
      throw new BadRequestException(
        'This account uses Google sign-in and does not have a password',
      );
    }

    const isOldPasswordValid = await bcrypt.compare(
      oldPassword,
      user.passwordHash,
    );

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

    // Send password changed confirmation email
    this.emailService
      .sendPasswordChangedEmail(user.email, user.name)
      .catch((err) =>
        this.logger.error(
          `Failed to send password changed email: ${err.message}`,
        ),
      );
  }

  // ─── Token Generation ─────────────────────────────────────────────

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

    const refreshToken = crypto
      .randomBytes(REFRESH_TOKEN_BYTES)
      .toString('hex');

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

  // ─── Private helpers ───────────────────────────────────────────────

  private async createAndSendVerificationCode(
    userId: string,
    email: string,
    name: string,
  ): Promise<void> {
    const code = this.generateSixDigitCode();

    const expiresAt = new Date();
    expiresAt.setMinutes(
      expiresAt.getMinutes() + VERIFICATION_CODE_EXPIRY_MINUTES,
    );

    // Invalidate any existing verification codes for this user
    await this.prisma.emailVerification.updateMany({
      where: { userId, used: false },
      data: { used: true },
    });

    // Create the new verification code
    await this.prisma.emailVerification.create({
      data: {
        code,
        userId,
        expiresAt,
      },
    });

    // Send verification email
    await this.emailService.sendVerificationEmail(email, name, code);
  }

  private generateSixDigitCode(): string {
    return crypto.randomInt(100000, 999999).toString();
  }

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
