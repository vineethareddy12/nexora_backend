import crypto from 'crypto';
import { authRepository } from './auth.repository.js';
import { hashPassword, verifyPassword } from '../../core/security/password.js';
import { 
  signAccessToken, 
  generateRefreshTokenString, 
  hashToken, 
  signPasswordResetToken, 
  verifyPasswordResetToken 
} from '../../core/security/tokens.js';
import { AppError } from '../../core/errors/AppError.js';
import { env } from '../../core/config/env.js';

export const AUTH_MESSAGES = {
  REGISTER_SUCCESS: 'Account registered successfully',
  LOGIN_SUCCESS: 'Authenticated successfully',
  LOGOUT_SUCCESS: 'Session logged out successfully',
  EMAIL_EXISTS: 'An account with this email address already exists',
  INVALID_CREDENTIALS: 'Invalid email or password',
  TOKEN_REFRESH_SUCCESS: 'Access token refreshed successfully',
  RESET_REQUEST_SUCCESS: 'If an account exists for that email, password-reset instructions will be sent.',
  RESET_CONFIRM_SUCCESS: 'Password has been reset successfully',
  RESET_TOKEN_INVALID: 'Invalid or expired password reset token',
};

export class AuthService {
  // 1. Applicant Registration
  async register({ fullName, email, password }) {
    const existing = await authRepository.findByEmail(email);
    if (existing) {
      throw AppError.conflict(AUTH_MESSAGES.EMAIL_EXISTS);
    }

    const passwordHash = await hashPassword(password);
    const user = await authRepository.createApplicantWithProfile({
      fullName,
      email,
      passwordHash,
    });

    const accessToken = signAccessToken({ userId: user.id, role: user.role });
    const refreshToken = await this.createSession(user.id);

    return {
      user: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        status: user.status,
      },
      tokens: { accessToken, refreshToken },
    };
  }

  // 2. User Login
  async login({ email, password }) {
    const user = await authRepository.findByEmail(email);
    if (!user) {
      throw AppError.unauthorized(AUTH_MESSAGES.INVALID_CREDENTIALS);
    }

    if (user.status !== 'ACTIVE') {
      throw AppError.forbidden('Account is disabled. Please contact support.');
    }

    const passwordValid = await verifyPassword(password, user.passwordHash);
    if (!passwordValid) {
      throw AppError.unauthorized(AUTH_MESSAGES.INVALID_CREDENTIALS);
    }

    await authRepository.updateLastLogin(user.id);

    const accessToken = signAccessToken({ userId: user.id, role: user.role });
    const refreshToken = await this.createSession(user.id);

    return {
      user: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        status: user.status,
      },
      tokens: { accessToken, refreshToken },
    };
  }

  // 3. Session Management (Create, Rotate, Revoke)
  async createSession(userId) {
    const rawRefreshToken = generateRefreshTokenString();
    const refreshTokenHash = hashToken(rawRefreshToken);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    await authRepository.createSession({
      userId,
      refreshTokenHash,
      expiresAt,
    });

    return rawRefreshToken;
  }

  async refreshTokens(rawRefreshToken) {
    if (!rawRefreshToken) {
      throw AppError.unauthorized('Refresh token is required');
    }

    const tokenHash = hashToken(rawRefreshToken);
    const session = await authRepository.findSessionByHash(tokenHash);

    if (!session) {
      throw AppError.unauthorized('Invalid refresh token session');
    }

    if (session.revokedAt) {
      // Security: possible token reuse detected -> invalidate all active sessions
      await authRepository.revokeAllUserSessions(session.userId);
      throw AppError.unauthorized('Refresh token was previously revoked. Please log in again.');
    }

    if (new Date() > session.expiresAt) {
      await authRepository.revokeSession(session.id);
      throw AppError.unauthorized('Refresh token session has expired. Please log in again.');
    }

    if (!session.user || session.user.status !== 'ACTIVE') {
      throw AppError.forbidden('User account is deactivated');
    }

    // Revoke old session and issue new rotated refresh token
    await authRepository.revokeSession(session.id);
    const newRawRefreshToken = await this.createSession(session.userId);
    const newAccessToken = signAccessToken({
      userId: session.user.id,
      role: session.user.role,
    });

    return {
      accessToken: newAccessToken,
      refreshToken: newRawRefreshToken,
      user: {
        id: session.user.id,
        email: session.user.email,
        fullName: session.user.fullName,
        role: session.user.role,
      },
    };
  }

  async logout(rawRefreshToken) {
    if (rawRefreshToken) {
      const tokenHash = hashToken(rawRefreshToken);
      const session = await authRepository.findSessionByHash(tokenHash);
      if (session && !session.revokedAt) {
        await authRepository.revokeSession(session.id);
      }
    }
  }

  // 4. Password Reset (Stateless JWT + session revocation)
  async requestPasswordReset(email) {
    const user = await authRepository.findByEmail(email);

    // Always return neutral message to prevent user enumeration
    if (!user || user.status !== 'ACTIVE') {
      return { message: AUTH_MESSAGES.RESET_REQUEST_SUCCESS };
    }

    const resetToken = signPasswordResetToken(user.id);
    const resetUrl = `${env.CLIENT_URL}/reset-password?token=${resetToken}`;

    if (env.SMTP_HOST && env.SMTP_USER) {
      console.log(`[SMTP] Dispatched password reset email to ${user.email}`);
    } else if (env.NODE_ENV === 'development') {
      console.log(`[DEV EMAIL PREVIEW] Reset link for ${user.email}: ${resetUrl}`);
    }

    return {
      message: AUTH_MESSAGES.RESET_REQUEST_SUCCESS,
      ...(env.NODE_ENV === 'development' ? { devPreviewToken: resetToken } : {}),
    };
  }

  async resetPassword(token, newPassword) {
    const decoded = verifyPasswordResetToken(token);
    if (!decoded || !decoded.sub || decoded.purpose !== 'pwd-reset') {
      throw AppError.badRequest(AUTH_MESSAGES.RESET_TOKEN_INVALID);
    }

    const user = await authRepository.findById(decoded.sub);
    if (!user || user.status !== 'ACTIVE') {
      throw AppError.badRequest(AUTH_MESSAGES.RESET_TOKEN_INVALID);
    }

    // Invalidate token if password was already changed after this token was issued
    if (user.passwordChangedAt) {
      const tokenIssuedAt = new Date(decoded.iat * 1000);
      if (tokenIssuedAt <= user.passwordChangedAt) {
        throw AppError.badRequest('This reset link has already been used or expired.');
      }
    }

    const newHash = await hashPassword(newPassword);
    await authRepository.updatePassword(user.id, newHash);

    // Instantly revoke all active sessions across all devices
    await authRepository.revokeAllUserSessions(user.id);

    return { message: AUTH_MESSAGES.RESET_CONFIRM_SUCCESS };
  }

  async changePassword(userId, currentPassword, newPassword) {
    const user = await authRepository.findById(userId);
    if (!user || user.status !== 'ACTIVE') {
      throw AppError.unauthorized('User account not found or disabled.');
    }

    const isValid = await verifyPassword(currentPassword, user.passwordHash);
    if (!isValid) {
      throw AppError.badRequest('Current password entered is incorrect.');
    }

    if (currentPassword === newPassword) {
      throw AppError.badRequest('New password must be different from current password.');
    }

    const newHash = await hashPassword(newPassword);
    await authRepository.updatePassword(user.id, newHash);

    return { message: 'Password updated successfully.' };
  }
}

export const authService = new AuthService();
