import TemplateService from '../services/templateService.js';
import Joi from 'joi';

const templateSchema = Joi.object({
  name: Joi.string().min(1).max(100).required().messages({
    'string.empty': 'Template name is required',
    'string.max': 'Template name must be 100 characters or less'
  }),
  content: Joi.string().min(1).required().messages({
    'string.empty': 'Template content is required'
  })
});

const parseSchema = Joi.object({
  template: Joi.string().required(),
  variables: Joi.object().pattern(Joi.string(), Joi.any()).default({})
});

// GET /api/templates
export const getAll = async (req, res, next) => {
  try {
    const templates = await TemplateService.getUserTemplates(req.user.id);
    res.json({ success: true, data: templates });
  } catch (error) {
    next(error);
  }
};

// GET /api/templates/:id
export const getOne = async (req, res, next) => {
  try {
    const template = await TemplateService.getTemplateById(
      parseInt(req.params.id),
      req.user.id
    );
    
    if (!template) {
      return res.status(404).json({ success: false, error: 'Template not found' });
    }
    
    res.json({ success: true, data: template });
  } catch (error) {
    next(error);
  }
};

// POST /api/templates
export const create = async (req, res, next) => {
  try {
    const { error, value } = templateSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ 
        success: false, 
        error: error.details[0].message 
      });
    }

    const template = await TemplateService.createTemplate({
      ...value,
      userId: req.user.id
    });

    res.status(201).json({ success: true, data: template });
  } catch (error) {
    if (error.message.startsWith('Invalid template')) {
      return res.status(400).json({ success: false, error: error.message });
    }
    next(error);
  }
};

// PUT /api/templates/:id
export const update = async (req, res, next) => {
  try {
    const { error, value } = templateSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ 
        success: false, 
        error: error.details[0].message 
      });
    }

    const template = await TemplateService.updateTemplate(
      parseInt(req.params.id),
      req.user.id,
      value
    );

    res.json({ success: true, data: template });
  } catch (error) {
    if (error.message === 'Template not found or cannot be modified') {
      return res.status(404).json({ success: false, error: error.message });
    }
    if (error.message.startsWith('Invalid template')) {
      return res.status(400).json({ success: false, error: error.message });
    }
    next(error);
  }
};

// DELETE /api/templates/:id
export const remove = async (req, res, next) => {
  try {
    await TemplateService.deleteTemplate(
      parseInt(req.params.id), 
      req.user.id
    );
    res.json({ success: true, message: 'Template deleted' });
  } catch (error) {
    if (error.message === 'Template not found or cannot be deleted') {
      return res.status(404).json({ success: false, error: error.message });
    }
    next(error);
  }
};

// POST /api/templates/parse (test parsing without saving)
export const parse = async (req, res, next) => {
  try {
    const { error, value } = parseSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ 
        success: false, 
        error: error.details[0].message 
      });
    }

    const { template, variables } = value;
    const parsed = TemplateService.parse(template, variables);
    const extractedVars = TemplateService.extractVariables(template);
    const validation = TemplateService.validateTemplate(template);
    
    res.json({ 
      success: true, 
      data: { 
        parsed, 
        variables: extractedVars,
        isValid: validation.valid,
        validationErrors: validation.errors
      } 
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/templates/:id/duplicate
export const duplicate = async (req, res, next) => {
  try {
    const template = await TemplateService.duplicateTemplate(
      parseInt(req.params.id),
      req.user.id
    );
    res.status(201).json({ success: true, data: template });
  } catch (error) {
    if (error.message === 'Template not found') {
      return res.status(404).json({ success: false, error: error.message });
    }
    next(error);
  }
};
