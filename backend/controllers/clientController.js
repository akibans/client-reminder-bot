import { Client, Reminder, sequelize } from "../models/index.js";
import { Op } from "sequelize";
import Joi from "joi";

// Validation Schema
const clientSchema = Joi.object({
  name: Joi.string().trim().min(2).max(50).required(),
  email: Joi.string().trim().email().required(),
  phone: Joi.string().trim().allow('', null).pattern(/^\+?[1-9]\d{1,14}$/).messages({
    'string.pattern.base': 'Phone number must be in E.164 format (e.g. +1234567890)'
  })
});

// Update schema (all optional)
const clientUpdateSchema = Joi.object({
  name: Joi.string().trim().min(2).max(50),
  email: Joi.string().trim().email(),
  phone: Joi.string().trim().allow('', null).pattern(/^\+?[1-9]\d{1,14}$/)
}).min(1);

// Get all clients (user-scoped with search)
export const getClients = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 10, 100);
    const offset = (page - 1) * limit;
    const search = req.query.search?.trim();

    // Build where clause - ALWAYS scoped to user
    const where = { userId: req.user.id };
    
    // Add search if provided
    if (search) {
      where[Op.or] = [
        { name: { [Op.like]: `%${search}%` } },
        { email: { [Op.like]: `%${search}%` } }
      ];
    }

    const { count, rows } = await Client.findAndCountAll({
      where,
      order: [['createdAt', 'DESC']],
      limit,
      offset
    });

    res.json({
      clients: rows,
      total: count,
      page,
      totalPages: Math.ceil(count / limit)
    });
  } catch (error) {
    next(error);
  }
};

// Create a new client (user-scoped duplicate check)
export const createClient = async (req, res, next) => {
  const t = await sequelize.transaction();
  try {
    const { error, value } = clientSchema.validate(req.body);
    if (error) {
      await t.rollback();
      return res.status(400).json({ message: error.details[0].message });
    }

    // Normalize
    const normalizedEmail = value.email.toLowerCase().trim();
    const normalizedPhone = value.phone ? value.phone.trim() : null;

    // Check for duplicates (scoped to this user only)
    const existingClient = await Client.findOne({
      where: { 
        email: normalizedEmail,
        userId: req.user.id // Only check this user's clients
      },
      transaction: t
    });

    if (existingClient) {
      await t.rollback();
      return res.status(409).json({ message: 'You already have a client with this email' });
    }

    const client = await Client.create({
      ...value,
      email: normalizedEmail,
      phone: normalizedPhone,
      userId: req.user.id // Set ownership
    }, { transaction: t });

    await t.commit();
    res.status(201).json(client);
  } catch (error) {
    await t.rollback();
    next(error);
  }
};

// Get single client
export const getClient = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    const client = await Client.findOne({
      where: { id, userId: req.user.id }
    });
    
    if (!client) {
      return res.status(404).json({ message: "Client not found" });
    }
    
    res.json(client);
  } catch (error) {
    next(error);
  }
};

// Update client
export const updateClient = async (req, res, next) => {
  const t = await sequelize.transaction();
  try {
    const { id } = req.params;
    
    const { error, value } = clientUpdateSchema.validate(req.body);
    if (error) {
      await t.rollback();
      return res.status(400).json({ message: error.details[0].message });
    }

    const client = await Client.findOne({
      where: { id, userId: req.user.id },
      transaction: t
    });
    
    if (!client) {
      await t.rollback();
      return res.status(404).json({ message: "Client not found" });
    }

    // Check email uniqueness if updating email
    if (value.email && value.email !== client.email) {
      const normalizedEmail = value.email.toLowerCase().trim();
      const existing = await Client.findOne({
        where: { 
          email: normalizedEmail,
          userId: req.user.id,
          id: { [Op.ne]: id } // Exclude self
        },
        transaction: t
      });
      
      if (existing) {
        await t.rollback();
        return res.status(409).json({ message: 'You already have another client with this email' });
      }
      
      value.email = normalizedEmail;
    }

    if (value.phone !== undefined) {
      value.phone = value.phone ? value.phone.trim() : null;
    }

    await client.update(value, { transaction: t });
    await t.commit();
    
    res.json(client);
  } catch (error) {
    await t.rollback();
    next(error);
  }
};

// Delete a client (user-scoped with pending reminder check)
export const deleteClient = async (req, res, next) => {
  const t = await sequelize.transaction();
  try {
    const { id } = req.params;
    
    // Find user's client with pending reminders
    const client = await Client.findOne({
      where: { id, userId: req.user.id },
      include: {
        model: Reminder,
        where: { sent: false },
        required: false
      },
      transaction: t
    });
    
    if (!client) {
      await t.rollback();
      return res.status(404).json({ message: "Client not found" });
    }

    // Check for pending reminders
    if (client.Reminders?.length > 0) {
      await t.rollback();
      return res.status(400).json({
        message: `Client has ${client.Reminders.length} pending reminders. Delete or cancel them first.`
      });
    }

    await client.destroy({ transaction: t });
    await t.commit();
    
    res.json({ message: "Client deleted successfully" });
  } catch (error) {
    await t.rollback();
    next(error);
  }
};