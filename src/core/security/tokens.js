import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { env } from '../config/env.js';

export const signAccessToken = (payload) => {
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, {
    expiresIn: env.ACCESS_TOKEN_TTL,
    issuer: 'nexora-auth',
  });
};

export const verifyAccessToken = (token) => {
  try {
    return jwt.verify(token, env.JWT_ACCESS_SECRET, { issuer: 'nexora-auth' });
  } catch (error) {
    return null;
  }
};

export const generateRefreshTokenString = () => {
  return crypto.randomBytes(40).toString('hex');
};

export const hashToken = (rawToken) => {
  return crypto.createHash('sha256').update(rawToken).digest('hex');
};

export const signPasswordResetToken = (userId) => {
  return jwt.sign(
    { sub: userId, purpose: 'pwd-reset' },
    env.JWT_RESET_SECRET,
    {
      expiresIn: env.RESET_TOKEN_TTL,
      issuer: 'nexora-auth',
      audience: 'nexora-pwd-reset',
    }
  );
};

export const verifyPasswordResetToken = (token) => {
  try {
    return jwt.verify(token, env.JWT_RESET_SECRET, {
      issuer: 'nexora-auth',
      audience: 'nexora-pwd-reset',
    });
  } catch (error) {
    return null;
  }
};
