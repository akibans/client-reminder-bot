import Joi from 'joi';

// Generic Validator
export const validate = (schema) => (req, res, next) => {
  const { error } = schema.validate(req.body, { abortEarly: false });
  if (error) {
    const errors = error.details.map(detail => detail.message);
    return res.status(400).json({ message: "Validation Error", errors });
  }
  next();
};

// Schemas
export const clientSchema = Joi.object({
  name: Joi.string().min(2).max(50).required(),
  email: Joi.string().email().required(),
  phone: Joi.string().pattern(/^[0-9+\-()\s]+$/).allow('').optional().messages({'string.pattern.base': 'Phone number contains invalid characters'})
});

export const reminderSchema = Joi.object({
  message: Joi.string().required(),
  sendVia: Joi.string().valid('email', 'whatsapp').required(),
  scheduleAt: Joi.date().greater('now').required().messages({'date.greater': 'Schedule time must be in the future'}),
  clients: Joi.array().items(Joi.string().guid({ version: ['uuidv4'] })).min(1).required()
});
