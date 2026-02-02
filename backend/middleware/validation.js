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
  name: Joi.string().trim().min(2).max(50).required(),
  email: Joi.string().trim().email().required(),
  phone: Joi.string().trim().allow('', null).pattern(/^\+?[1-9]\d{1,14}$/).messages({
    'string.pattern.base': 'Phone number must be in E.164 format (e.g. +1234567890)'
  })
});

// 🆕 Update schema - all optional, at least one required
export const clientUpdateSchema = Joi.object({
  name: Joi.string().trim().min(2).max(50),
  email: Joi.string().trim().email(),
  phone: Joi.string().trim().allow('', null).pattern(/^\+?[1-9]\d{1,14}$/).messages({
    'string.pattern.base': 'Phone number must be in E.164 format (e.g. +1234567890)'
  })
}).min(1).messages({
  'object.min': 'At least one field must be provided for update'
});

export const reminderSchema = Joi.object({
  message: Joi.string().trim().min(1).max(2000).required(),
  sendVia: Joi.string().valid('email', 'whatsapp').required(),
  scheduleAt: Joi.date().greater('now').required().messages({
    'date.greater': 'Schedule time must be in the future'
  }),
  clients: Joi.array().items(Joi.string().guid({ version: ['uuidv4'] })).min(1).required()
});

// 🆕 Optional: Reminder update schema (only scheduleAt allowed)
export const reminderUpdateSchema = Joi.object({
  scheduleAt: Joi.date().greater('now').required().messages({
    'date.greater': 'Schedule time must be in the future'
  })
});