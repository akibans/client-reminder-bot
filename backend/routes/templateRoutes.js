import express from 'express';
import * as templateController from '../controllers/templateController.js';

const router = express.Router();

// GET /api/templates - Get all templates for user
router.get('/', templateController.getAll);

// GET /api/templates/:id - Get single template
router.get('/:id', templateController.getOne);

// POST /api/templates - Create new template
router.post('/', templateController.create);

// POST /api/templates/parse - Parse template with variables (test endpoint)
router.post('/parse', templateController.parse);

// POST /api/templates/:id/duplicate - Duplicate a template
router.post('/:id/duplicate', templateController.duplicate);

// PUT /api/templates/:id - Update template
router.put('/:id', templateController.update);

// DELETE /api/templates/:id - Delete template
router.delete('/:id', templateController.remove);

export default router;
