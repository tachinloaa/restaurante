import express from 'express';
import webhookController from '../controllers/webhookController.js';
import twilioValidator from '../middlewares/twilioValidator.js';

const router = express.Router();

// Webhook de Twilio (con validación de firma)
router.post('/', twilioValidator, webhookController.whatsapp.bind(webhookController));
router.post('/status', twilioValidator, webhookController.status.bind(webhookController));

export default router;
