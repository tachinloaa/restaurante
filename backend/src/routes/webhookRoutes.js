import express from 'express';
import webhookController from '../controllers/webhookController.js';
import twilioValidator from '../middlewares/twilioValidator.js';
import { webhookLimiter } from '../middlewares/rateLimiter.js';

const router = express.Router();

// Webhook de Twilio (con rate limiting y validación de firma)
router.post('/', webhookLimiter, twilioValidator, webhookController.whatsapp.bind(webhookController));
router.post('/status', webhookLimiter, twilioValidator, webhookController.status.bind(webhookController));

export default router;
