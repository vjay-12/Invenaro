import { Router } from 'express';
import { authMiddleware } from '../middlewares/auth.js';
import { MeasurementTemplateService } from '../services/measurementTemplateService.js';
import { measurementTemplateSchema, measurementTemplateFieldSchema } from '@invenaro/validation';

const router = Router();
router.use(authMiddleware);

// GET / - List all templates with fields (initializes South Indian defaults if needed)
router.get('/', async (req, res): Promise<void> => {
  try {
    const category = req.query.category as string | undefined;
    const templates = await MeasurementTemplateService.getAllTemplates(category);
    res.json(templates);
  } catch (err: any) {
    console.error('Fetch measurement templates error:', err);
    res.status(500).json({ error: 'Failed to fetch measurement templates' });
  }
});

// GET /:id - Get specific template
router.get('/:id', async (req, res): Promise<void> => {
  try {
    const template = await MeasurementTemplateService.getTemplateById(req.params.id);
    if (!template) {
      res.status(404).json({ error: 'Template not found' });
      return;
    }
    res.json(template);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch template' });
  }
});

// POST / - Create custom template
router.post('/', async (req, res): Promise<void> => {
  try {
    const parse = measurementTemplateSchema.safeParse(req.body);
    if (!parse.success) {
      res.status(400).json({ error: parse.error.errors[0]?.message || 'Invalid template data' });
      return;
    }

    const template = await MeasurementTemplateService.createCustomTemplate(parse.data);
    res.status(201).json(template);
  } catch (err: any) {
    console.error('Create template error:', err);
    res.status(500).json({ error: err.message || 'Failed to create measurement template' });
  }
});

// PUT /:id - Update template metadata
router.put('/:id', async (req, res): Promise<void> => {
  try {
    const { name, description, category } = req.body;
    const updated = await MeasurementTemplateService.updateTemplate(req.params.id, {
      name,
      description,
      category,
    });
    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to update measurement template' });
  }
});

// POST /:id/fields - Add field to template
router.post('/:id/fields', async (req, res): Promise<void> => {
  try {
    const parse = measurementTemplateFieldSchema.safeParse(req.body);
    if (!parse.success) {
      res.status(400).json({ error: parse.error.errors[0]?.message || 'Invalid field data' });
      return;
    }

    const field = await MeasurementTemplateService.addField(req.params.id, parse.data);
    res.status(201).json(field);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to add template field' });
  }
});

// PUT /:id/fields/:fieldId - Update field
router.put('/:id/fields/:fieldId', async (req, res): Promise<void> => {
  try {
    const updated = await MeasurementTemplateService.updateField(
      req.params.id,
      req.params.fieldId,
      req.body
    );
    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to update template field' });
  }
});

// DELETE /:id/fields/:fieldId - Remove field
router.delete('/:id/fields/:fieldId', async (req, res): Promise<void> => {
  try {
    await MeasurementTemplateService.removeField(req.params.id, req.params.fieldId);
    res.json({ message: 'Field removed successfully' });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to remove template field' });
  }
});

export default router;
