import { validationResult } from 'express-validator';
import { validationError } from '../utils/responses.js';

/**
 * Middleware para validar resultados de express-validator
 */
export const validateRequest = (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return validationError(res, errors.array());
  }

  next();
};

export default validateRequest;
