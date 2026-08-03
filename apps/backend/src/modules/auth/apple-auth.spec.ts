import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { PrismaService } from '../../database/prisma.service';
import { EmailService } from '../email/email.service';

// ── Mock apple-signin-auth ────────────────────────────────────────────────────
const mockVerifyAppleIdToken = jest.fn();
jest.mock('apple-signin-auth', () => ({
  verifyIdToken: (...args: any[]) => mockVerifyAppleIdToken(...args),
}));

// ── Shared fixtures ───────────────────────────────────────────────────────────
const APPLE_ID = 'apple_sub_001';
const EMAIL = 'jane@example.com';
const FULL_NAME = 'Jane Doe';

const fakeApplePayload = {
  iss: 'https://appleid.apple.com',
  sub: APPLE_ID,
  aud: 'com.sivena.app',
  exp: String(Math.floor(Date.now() / 1000) + 300),
  iat: String(Math.floor(Date.now() / 1000)),
  nonce: '',
  nonce_supported: true,
  email: EMAIL,
  email_verified: true as const,
  is_private_email: false as const,
};

const fakeUser = {
  id: 'user-123',
  email: EMAIL,
  name: FULL_NAME,
  appleId: APPLE_ID,
  googleId: null,
  authProvider: 'apple',
  passwordHash: null,
  avatarUrl: null,
  color: null,
  emailVerified: true,
  primaryCircleId: 'household-123',
  country: null,
  suspendedAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  deletedAt: null,
};

const fakeMembership = {
  id: 'member-1',
  userId: fakeUser.id,
  householdId: 'household-123',
  role: 'OWNER',
  leftAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const fakeTokens = {
  accessToken: 'fake.access.token',
  refreshToken: 'fake-refresh-token',
  expiresIn: 900,
};

// ── Mock builders ─────────────────────────────────────────────────────────────
function buildPrismaMock(overrides: Record<string, any> = {}) {
  return {
    user: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    household: { create: jest.fn() },
    householdMember: { create: jest.fn(), findFirst: jest.fn() },
    refreshToken: { create: jest.fn() },
    $transaction: jest.fn(async (cb: any) => cb(overrides.tx ?? buildTxMock())),
    ...overrides,
  };
}

function buildTxMock(overrides: Record<string, any> = {}) {
  return {
    user: {
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    household: { create: jest.fn() },
    householdMember: { create: jest.fn() },
    ...overrides,
  };
}

// ── Test suite ────────────────────────────────────────────────────────────────
describe('AuthService.appleAuth()', () => {
  let service: AuthService;
  let prisma: ReturnType<typeof buildPrismaMock>;

  const buildModule = async (prismaMock: any) => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prismaMock },
        {
          provide: JwtService,
          useValue: { sign: jest.fn().mockReturnValue('fake.access.token') },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, def?: any) => {
              if (key === 'APPLE_BUNDLE_ID') return 'com.sivena.app';
              if (key === 'JWT_ACCESS_EXPIRATION') return '15m';
              return def;
            }),
          },
        },
        { provide: EmailService, useValue: { sendWelcomeEmail: jest.fn() } },
      ],
    }).compile();
    return module.get<AuthService>(AuthService);
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ── 1. New user first sign-in ─────────────────────────────────────────────
  describe('new user (first sign-in)', () => {
    it('creates user + household and returns tokens', async () => {
      mockVerifyAppleIdToken.mockResolvedValue(fakeApplePayload);

      const tx = buildTxMock();
      tx.user.findFirst.mockResolvedValue(null);  // no existing by appleId
      tx.user.create.mockResolvedValue(fakeUser);
      tx.household.create.mockResolvedValue({ id: 'household-123' });
      tx.householdMember.create.mockResolvedValue({});
      tx.user.update.mockResolvedValue(fakeUser);

      prisma = buildPrismaMock({ tx });
      prisma.householdMember.findFirst.mockResolvedValue(fakeMembership);
      prisma.refreshToken.create.mockResolvedValue({});

      service = await buildModule(prisma);
      const result = await service.appleAuth(
        'valid.apple.identity.token',
        FULL_NAME,
      );

      // Correct user was created with apple provider
      expect(tx.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            email: EMAIL,
            appleId: APPLE_ID,
            authProvider: 'apple',
          }),
        }),
      );

      // Household was created
      expect(tx.household.create).toHaveBeenCalledTimes(1);
      expect(tx.householdMember.create).toHaveBeenCalledTimes(1);

      // Response shape is correct
      expect(result).toMatchObject({
        accessToken: expect.any(String),
        refreshToken: expect.any(String),
        user: {
          id: fakeUser.id,
          email: EMAIL,
          name: FULL_NAME,
        },
      });
    });
  });

  // ── 2. Returning user (already has appleId) ───────────────────────────────
  describe('returning user with appleId', () => {
    it('finds user by appleId, skips creation, returns tokens', async () => {
      // Second sign-in: Apple does NOT send email
      mockVerifyAppleIdToken.mockResolvedValue({
        ...fakeApplePayload,
        email: undefined,
      });

      const tx = buildTxMock();
      tx.user.findFirst.mockResolvedValue(fakeUser); // found by appleId

      prisma = buildPrismaMock({ tx });
      prisma.householdMember.findFirst.mockResolvedValue(fakeMembership);
      prisma.refreshToken.create.mockResolvedValue({});

      service = await buildModule(prisma);
      const result = await service.appleAuth('valid.apple.identity.token');

      // No user creation
      expect(tx.user.create).not.toHaveBeenCalled();
      expect(tx.household.create).not.toHaveBeenCalled();

      expect(result.user.id).toBe(fakeUser.id);
    });
  });

  // ── 3. Existing email account — appleId linking ───────────────────────────
  describe('existing email account (first Apple sign-in)', () => {
    it('links appleId to the existing email account', async () => {
      mockVerifyAppleIdToken.mockResolvedValue(fakeApplePayload);

      const existingUser = { ...fakeUser, appleId: null }; // has email, no appleId yet
      const linkedUser = { ...fakeUser };

      const tx = buildTxMock();
      // First lookup (by appleId) → null; second lookup (by email) → existing
      tx.user.findFirst
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(existingUser);
      tx.user.update.mockResolvedValue(linkedUser);

      prisma = buildPrismaMock({ tx });
      prisma.householdMember.findFirst.mockResolvedValue(fakeMembership);
      prisma.refreshToken.create.mockResolvedValue({});

      service = await buildModule(prisma);
      const result = await service.appleAuth('valid.apple.identity.token');

      // appleId was linked
      expect(tx.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: existingUser.id },
          data: { appleId: APPLE_ID },
        }),
      );

      // No new user or household created
      expect(tx.user.create).not.toHaveBeenCalled();
      expect(result.user.email).toBe(EMAIL);
    });
  });

  // ── 4. Invalid token → 401 ───────────────────────────────────────────────
  describe('invalid identity token', () => {
    it('throws UnauthorizedException when Apple rejects the token', async () => {
      mockVerifyAppleIdToken.mockRejectedValue(new Error('jwt expired'));

      prisma = buildPrismaMock();
      service = await buildModule(prisma);

      await expect(
        service.appleAuth('tampered.token'),
      ).rejects.toThrow(UnauthorizedException);

      // No DB writes
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });
  });

  // ── 5. Subsequent sign-in but user not in DB → 401 ───────────────────────
  describe('no email on unregistered user', () => {
    it('throws UnauthorizedException when email is absent and user is unknown', async () => {
      mockVerifyAppleIdToken.mockResolvedValue({
        ...fakeApplePayload,
        email: undefined,
      });

      const tx = buildTxMock();
      tx.user.findFirst.mockResolvedValue(null); // unknown appleId, no email to fall back on

      prisma = buildPrismaMock({ tx });
      service = await buildModule(prisma);

      await expect(
        service.appleAuth('valid.apple.identity.token'),
      ).rejects.toThrow(UnauthorizedException);

      expect(tx.user.create).not.toHaveBeenCalled();
    });
  });

  // ── 6. Token audience verification is passed correctly ───────────────────
  describe('token verification options', () => {
    it('passes bundle ID as audience to verifyAppleIdToken', async () => {
      mockVerifyAppleIdToken.mockResolvedValue(fakeApplePayload);

      const tx = buildTxMock();
      tx.user.findFirst.mockResolvedValue(fakeUser);

      prisma = buildPrismaMock({ tx });
      prisma.householdMember.findFirst.mockResolvedValue(fakeMembership);
      prisma.refreshToken.create.mockResolvedValue({});

      service = await buildModule(prisma);
      await service.appleAuth('valid.apple.identity.token');

      expect(mockVerifyAppleIdToken).toHaveBeenCalledWith(
        'valid.apple.identity.token',
        expect.objectContaining({ audience: 'com.sivena.app' }),
      );
    });
  });
});
