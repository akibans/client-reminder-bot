import db from '../models/index.js';
const { User } = db;
import jwt from 'jsonwebtoken';
import Joi from 'joi';
import TemplateService from '../services/templateService.js';

const authSchema = Joi.object({
  username: Joi.string().min(3).max(50).required(),
  password: Joi.string().min(6).required()
});

export const register = async (req, res, next) => {
  try {
    console.log('Register request body:', req.body);
    const { error, value } = authSchema.validate(req.body, { stripUnknown: true });
    if (error) return res.status(400).json({ message: error.details[0].message });

    const existingUser = await User.findOne({ where: { username: value.username } });
    if (existingUser) return res.status(400).json({ message: 'Username already exists' });

    const user = await User.create(value);
    
    // Seed default templates for new user
    await TemplateService.seedDefaultTemplates(user.id);
    
    // Auto-login after registration
    const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: '7d' });
    
    res.status(201).json({
      message: 'User registered successfully',
      token,
      user: { id: user.id, username: user.username }
    });
  } catch (error) {
    next(error);
  }
};

export const login = async (req, res, next) => {
  try {
    const { username, password } = req.body;
    
    const user = await User.findOne({ where: { username } });
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: '7d' });

    res.json({
      message: 'Login successful',
      token,
      user: { id: user.id, username: user.username }
    });
  } catch (error) {
    next(error);
  }
};
