import Client from "../models/Client.js";

// Get all clients
export const getClients = async (req, res, next) => {
  try {
    const clients = await Client.findAll({ order: [['createdAt', 'DESC']] });
    res.json(clients);
  } catch (error) {
    next(error);
  }
};

// Create a new client
export const createClient = async (req, res, next) => {
  try {
    const client = await Client.create(req.body);
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
