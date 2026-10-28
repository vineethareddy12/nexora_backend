import { Router } from 'express';
import { sendSuccess } from '../../core/http/response.js';
import { env } from '../../core/config/env.js';

const router = Router();

/**
 * @openapi
 * /health:
 *   get:
 *     summary: Health check endpoint
 *     description: Returns the API service status, uptime, timestamp, and environment.
 *     tags:
 *       - System
 *     responses:
 *       200:
 *         description: Service is healthy
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/HealthResponse'
 */
router.get('/', (req, res) => {
  const healthData = {
    status: 'healthy',
    uptime: Math.round(process.uptime() * 100) / 100,
    timestamp: new Date().toISOString(),
    environment: env.NODE_ENV,
    version: '1.0.0',
  };

  sendSuccess(res, healthData, 'Nexora Technologies API is running');
});

export default router;
