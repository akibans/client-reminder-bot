import { MessageTemplate } from '../models/index.js';
import { Op } from 'sequelize';

class TemplateService {
  /**
   * Parse template string with variables
   * @param {string} template - "Hi {{name}}, reminder for {{event}}"
   * @param {object} variables - { name: "John", event: "Meeting" }
   * @returns {string} - "Hi John, reminder for Meeting"
   */
  static parse(template, variables = {}) {
    if (!template) return '';
    
    return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      const value = variables[key];
      return value !== undefined && value !== null ? String(value) : match;
    });
  }

  /**
   * Extract variables from template content
   * @param {string} content 
   * @returns {string[]} - ["name", "event"]
   */
  static extractVariables(content) {
    if (!content) return [];
    const matches = content.match(/\{\{(\w+)\}\}/g) || [];
    return [...new Set(matches.map(m => m.replace(/[{}]/g, '')))];
  }

  /**
   * Validate template content has proper variable syntax
   * @param {string} content 
   * @returns {{ valid: boolean, errors: string[] }}
   */
  static validateTemplate(content) {
    const errors = [];
    
    // Check for unclosed braces
    const openBraces = (content.match(/\{\{/g) || []).length;
    const closeBraces = (content.match(/\}\}/g) || []).length;
    
    if (openBraces !== closeBraces) {
      errors.push('Mismatched braces: some {{ or }} are not properly paired');
    }
    
    // Check for empty variables
    if (/\{\{\s*\}\}/.test(content)) {
      errors.push('Empty variable placeholders found: {{}}');
    }
    
    // Check for invalid variable names (non-word characters)
    const invalidVars = content.match(/\{\{[^}]*[^\w}][^}]*\}\}/g);
    if (invalidVars) {
      errors.push(`Invalid variable names: ${invalidVars.join(', ')}. Use only letters, numbers, and underscores.`);
    }
    
    return { valid: errors.length === 0, errors };
  }

  /**
   * Get all templates for user (including defaults)
   */
  static async getUserTemplates(userId) {
    return await MessageTemplate.findAll({
      where: {
        [Op.or]: [
          { userId },
          { isDefault: true }
        ]
      },
      order: [['isDefault', 'DESC'], ['updatedAt', 'DESC']]
    });
  }

  /**
   * Get a single template by ID (must belong to user or be default)
   */
  static async getTemplateById(id, userId) {
    return await MessageTemplate.findOne({
      where: {
        id,
        [Op.or]: [
          { userId },
          { isDefault: true }
        ]
      }
    });
  }

  /**
   * Create template with auto-extracted variables
   */
  static async createTemplate(data) {
    const variables = this.extractVariables(data.content);
    
    // Validate template syntax
    const validation = this.validateTemplate(data.content);
    if (!validation.valid) {
      throw new Error(`Invalid template: ${validation.errors.join('; ')}`);
    }
    
    return await MessageTemplate.create({
      ...data,
      variables
    });
  }

  /**
   * Update template with re-extracted variables
   */
  static async updateTemplate(id, userId, data) {
    const template = await MessageTemplate.findOne({ 
      where: { id, userId, isDefault: false } 
    });
    
    if (!template) {
      throw new Error('Template not found or cannot be modified');
    }

    // Validate new content if provided
    if (data.content) {
      const validation = this.validateTemplate(data.content);
      if (!validation.valid) {
        throw new Error(`Invalid template: ${validation.errors.join('; ')}`);
      }
    }

    const variables = data.content 
      ? this.extractVariables(data.content) 
      : template.variables;
    
    await template.update({ ...data, variables });
    return template;
  }

  /**
   * Delete template
   */
  static async deleteTemplate(id, userId) {
    const template = await MessageTemplate.findOne({ 
      where: { id, userId, isDefault: false } 
    });
    
    if (!template) {
      throw new Error('Template not found or cannot be deleted');
    }
    
    await template.destroy();
    return true;
  }

  /**
   * Seed default templates for new users
   */
  static async seedDefaultTemplates(userId) {
    const defaults = [
      {
        name: 'Gentle Reminder',
        content: 'Hi {{name}}, just a friendly reminder about {{event}} on {{date}} at {{time}}. Looking forward to seeing you!',
        isDefault: false
      },
      {
        name: 'Appointment Confirmation',
        content: 'Hello {{name}}, this confirms your appointment for {{event}} scheduled for {{date}}. Please reply to confirm.',
        isDefault: false
      },
      {
        name: 'Payment Due',
        content: 'Hi {{name}}, this is a reminder that your payment of ${{amount}} for {{event}} is due on {{date}}. Thank you!',
        isDefault: false
      },
      {
        name: 'Follow-up',
        content: 'Hi {{name}}, following up on our {{event}}. Please let me know if you have any questions!',
        isDefault: false
      },
      {
        name: 'Meeting Reminder',
        content: 'Hello {{name}}, this is a reminder about our {{event}} scheduled for {{date}} at {{time}}. Location: {{location}}. See you there!',
        isDefault: false
      }
    ];

    // Only seed if user has no templates
    const existing = await MessageTemplate.count({ where: { userId } });
    if (existing === 0) {
      const templatesWithVars = defaults.map(t => ({
        ...t,
        userId,
        variables: this.extractVariables(t.content)
      }));
      await MessageTemplate.bulkCreate(templatesWithVars);
    }
  }

  /**
   * Duplicate a template for a user
   */
  static async duplicateTemplate(id, userId) {
    const original = await this.getTemplateById(id, userId);
    if (!original) {
      throw new Error('Template not found');
    }

    return await this.createTemplate({
      name: `${original.name} (Copy)`,
      content: original.content,
      userId,
      isDefault: false
    });
  }
}

export default TemplateService;
