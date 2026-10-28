export const authOpenApi = {
  '/api/v1/auth/register': {
    post: {
      tags: ['Authentication'],
      summary: 'Register applicant account',
      description: 'Creates applicant account and baseline profile transactionally.',
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['fullName', 'email', 'password'],
              properties: {
                fullName: { type: 'string', example: 'Alex Morgan' },
                email: { type: 'string', example: 'alex.morgan@example.com' },
                password: { type: 'string', example: 'SecretPass123!' },
              },
            },
          },
        },
      },
      responses: {
        201: { description: 'Registered successfully' },
        409: { description: 'Email already registered' },
      },
    },
  },
  '/api/v1/auth/login': {
    post: {
      tags: ['Authentication'],
      summary: 'Authenticate and receive access + refresh token',
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['email', 'password'],
              properties: {
                email: { type: 'string', example: 'alex.morgan@example.com' },
                password: { type: 'string', example: 'SecretPass123!' },
              },
            },
          },
        },
      },
      responses: {
        200: { description: 'Authenticated successfully' },
        401: { description: 'Invalid credentials' },
      },
    },
  },
  '/api/v1/auth/refresh': {
    post: {
      tags: ['Authentication'],
      summary: 'Rotate refresh token and issue new access token',
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['refreshToken'],
              properties: {
                refreshToken: { type: 'string' },
              },
            },
          },
        },
      },
      responses: {
        200: { description: 'New token pair issued' },
        401: { description: 'Invalid or revoked refresh token' },
      },
    },
  },
  '/api/v1/auth/logout': {
    post: {
      tags: ['Authentication'],
      summary: 'Revoke active refresh token session',
      responses: {
        200: { description: 'Logged out successfully' },
      },
    },
  },
  '/api/v1/auth/me': {
    get: {
      tags: ['Authentication'],
      summary: 'Get current authenticated user',
      security: [{ BearerAuth: [] }],
      responses: {
        200: { description: 'User retrieved' },
        401: { description: 'Unauthorized' },
      },
    },
  },
  '/api/v1/auth/forgot-password': {
    post: {
      tags: ['Authentication'],
      summary: 'Request password reset link',
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['email'],
              properties: {
                email: { type: 'string', example: 'alex.morgan@example.com' },
              },
            },
          },
        },
      },
      responses: {
        200: { description: 'Reset link dispatched if account exists' },
      },
    },
  },
  '/api/v1/auth/reset-password': {
    post: {
      tags: ['Authentication'],
      summary: 'Reset password with reset JWT',
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['token', 'newPassword'],
              properties: {
                token: { type: 'string' },
                newPassword: { type: 'string', example: 'NewSecretPass123!' },
              },
            },
          },
        },
      },
      responses: {
        200: { description: 'Password reset successfully' },
        400: { description: 'Token invalid or expired' },
      },
    },
  },
};
