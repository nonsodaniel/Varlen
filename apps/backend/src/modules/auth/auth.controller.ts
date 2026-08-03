import {
  Controller,
  Post,
  Body,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Throttle } from '@nestjs/throttler';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
} from '@nestjs/swagger';
import { AuthService } from './auth.service';
import {
  RegisterDto,
  LoginDto,
  RefreshTokenDto,
  ChangePasswordDto,
  ForgotPasswordDto,
  ResetPasswordDto,
  VerifyEmailDto,
  ResendVerificationDto,
  AuthResponseDto,
  GoogleAuthDto,
  AppleAuthDto,
} from './dto';
import { Public } from '../../common/decorators/public.decorator';
import { JwtPayload } from './interfaces/jwt-payload.interface';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Throttle({ default: { limit: 3, ttl: 300000 } })
  @Post('register')
  @ApiOperation({ summary: 'Register a new user and send verification email' })
  @ApiResponse({
    status: 201,
    description: 'User registered and authenticated.',
  })
  @ApiResponse({ status: 409, description: 'Email already exists' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  async register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Public()
  @Throttle({ default: { limit: 5, ttl: 300000 } })
  @UseGuards(AuthGuard('local'))
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login with email and password' })
  @ApiBody({ type: LoginDto })
  @ApiResponse({
    status: 200,
    description: 'Successfully authenticated',
    type: AuthResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  @ApiResponse({ status: 403, description: 'Email not verified' })
  async login(@Req() req: any): Promise<AuthResponseDto> {
    return this.authService.login(req.user.id);
  }

  @Public()
  @Throttle({ default: { limit: 10, ttl: 300000 } })
  @Post('google')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Authenticate with Google ID token' })
  @ApiResponse({
    status: 200,
    description: 'Successfully authenticated via Google',
    type: AuthResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Invalid Google ID token' })
  async googleAuth(@Body() dto: GoogleAuthDto): Promise<AuthResponseDto> {
    return this.authService.googleAuth(dto.idToken);
  }

  @Public()
  @Throttle({ default: { limit: 10, ttl: 300000 } })
  @Post('apple')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Authenticate with Apple identity token' })
  @ApiResponse({
    status: 200,
    description: 'Successfully authenticated via Apple',
    type: AuthResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Invalid Apple identity token' })
  async appleAuth(@Body() dto: AppleAuthDto): Promise<AuthResponseDto> {
    return this.authService.appleAuth(dto.identityToken, dto.fullName);
  }

  @Public()
  @Throttle({ default: { limit: 3, ttl: 300000 } })
  @Post('verify-email')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify email address with 6-digit code' })
  @ApiResponse({
    status: 200,
    description: 'Email verified successfully. Returns auth tokens.',
    type: AuthResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid or expired verification code' })
  async verifyEmail(@Body() dto: VerifyEmailDto): Promise<AuthResponseDto> {
    return this.authService.verifyEmail(dto.email, dto.code);
  }

  @Public()
  @Throttle({ default: { limit: 3, ttl: 300000 } })
  @Post('resend-verification')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Resend email verification code' })
  @ApiResponse({
    status: 200,
    description:
      'If the email exists and is unverified, a new verification code has been sent',
  })
  async resendVerification(
    @Body() dto: ResendVerificationDto,
  ): Promise<{ message: string }> {
    await this.authService.resendVerification(dto.email);
    return {
      message:
        'If an account with that email exists and is unverified, a new verification code has been sent',
    };
  }

  @Public()
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh access and refresh tokens' })
  @ApiResponse({
    status: 200,
    description: 'Tokens refreshed successfully',
    type: AuthResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Invalid or expired refresh token' })
  async refresh(@Body() dto: RefreshTokenDto): Promise<AuthResponseDto> {
    return this.authService.refreshTokens(dto.refreshToken);
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Logout and revoke refresh token' })
  @ApiResponse({ status: 200, description: 'Successfully logged out' })
  async logout(@Body() dto: RefreshTokenDto): Promise<{ message: string }> {
    await this.authService.logout(dto.refreshToken);
    return { message: 'Successfully logged out' };
  }

  @Post('change-password')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Change password for authenticated user' })
  @ApiResponse({ status: 200, description: 'Password changed successfully' })
  @ApiResponse({ status: 400, description: 'Current password is incorrect' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async changePassword(
    @Req() req: any,
    @Body() dto: ChangePasswordDto,
  ): Promise<{ message: string }> {
    const user = req.user as JwtPayload;
    await this.authService.changePassword(
      user.sub,
      dto.oldPassword,
      dto.newPassword,
    );
    return { message: 'Password changed successfully' };
  }

  @Public()
  @Throttle({ default: { limit: 3, ttl: 300000 } })
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Request a password reset code via email' })
  @ApiResponse({
    status: 200,
    description:
      'If the email exists, a password reset code has been sent',
  })
  async forgotPassword(
    @Body() dto: ForgotPasswordDto,
  ): Promise<{ message: string }> {
    await this.authService.forgotPassword(dto.email);
    return {
      message:
        'If an account with that email exists, a password reset code has been sent',
    };
  }

  @Public()
  @Throttle({ default: { limit: 3, ttl: 300000 } })
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reset password using email and reset code' })
  @ApiResponse({ status: 200, description: 'Password reset successfully' })
  @ApiResponse({ status: 400, description: 'Invalid or expired reset code' })
  async resetPassword(
    @Body() dto: ResetPasswordDto,
  ): Promise<{ message: string }> {
    await this.authService.resetPassword(dto.email, dto.code, dto.newPassword);
    return { message: 'Password has been reset successfully' };
  }
}
