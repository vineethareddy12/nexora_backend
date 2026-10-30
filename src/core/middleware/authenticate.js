import { verifyAccessToken } from '../security/tokens.js';
import { AppError } from '../errors/AppError.js';
import { prisma } from '../database/prisma.js';

export const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    let token = null;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    } else if (req.query?.token) {
      token = req.query.token;
    }

    if (!token) {
      return next(AppError.unauthorized('Authentication required: Bearer token missing'));
    }
    const decoded = verifyAccessToken(token);

    if (!decoded || !decoded.userId) {
      return next(AppError.unauthorized('Invalid or expired access token'));
    }

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        status: true,
        passwordChangedAt: true,
        profile: {
          select: {
            phone: true,
          },
        },
      },
    });

    if (!user) {
      return next(AppError.unauthorized('Account not found'));
    }

    if (user.status !== 'ACTIVE') {
      return next(AppError.forbidden('Account is disabled. Please contact support.'));
    }

    // Attach safe user context with phone
    req.user = {
      ...user,
      phone: user.profile?.phone || null,
    };
    next();
  } catch (error) {
    next(error);
  }
};
