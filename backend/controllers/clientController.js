import { Client } from "../models/index.js";
import Joi from "joi";

// Validation Schema
const clientSchema = Joi.object({
  name: Joi.string().min(2).max(50).required(),
  email: Joi.string().email().required(),
  phone: Joi.string().allow('', null).pattern(/^\+?[1-9]\d{1,14}$/).messages({
    'string.pattern.base': 'Phone number must be in E.164 format (e.g. +1234567890)'
  })
});

// Get all clients (with pagination)
export const getClients = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    const { count, rows } = await Client.findAndCountAll({
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

// Create a new client
export const createClient = async (req, res, next) => {
  try {
    const { error, value } = clientSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ message: error.details[0].message });
    }
    const client = await Client.create(value);
    res.status(201).json(client);
  } catch (error) {
    next(error);
  }
};

// Delete a client
export const deleteClient = async (req, res, next) => {
    try {
        const { id } = req.params;
        const deleted = await Client.destroy({ where: { id } });
        
        if (!deleted) {
            return res.status(404).json({ message: "Client not found" });
        }
        res.json({ message: "Client deleted" });
    } catch (error) {
        next(error);
    }
};
