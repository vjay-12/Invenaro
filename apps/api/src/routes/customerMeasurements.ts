import { Router } from 'express';
import { authMiddleware } from '../middlewares/auth.js';
import { CustomerMeasurementService } from '../services/customerMeasurementService.js';
import { customerMeasurementProfileSchema, customerMeasurementVersionSchema } from '@invenaro/validation';

const router = Router({ mergeParams: true });
router.use(authMiddleware);

// GET /customers/:customerId/measurement-profiles - List profiles for a customer
router.get('/:customerId/measurement-profiles', async (req, res): Promise<void> => {
  try {
    const { customerId } = req.params;
    const profiles = await CustomerMeasurementService.getProfilesByCustomer(customerId);
    res.json(profiles);
  } catch (err: any) {
    console.error('Fetch customer measurement profiles error:', err);
    res.status(500).json({ error: 'Failed to fetch customer measurement profiles' });
  }
});

// GET /customers/:customerId/measurement-profiles/:profileId - Get profile details
router.get('/:customerId/measurement-profiles/:profileId', async (req, res): Promise<void> => {
  try {
    const { customerId, profileId } = req.params;
    const profile = await CustomerMeasurementService.getProfileDetails(customerId, profileId);
    if (!profile) {
      res.status(404).json({ error: 'Measurement profile not found' });
      return;
    }
    res.json(profile);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch measurement profile' });
  }
});

// GET /customers/:customerId/measurement-profiles/:profileId/history - Get complete version history
router.get('/:customerId/measurement-profiles/:profileId/history', async (req, res): Promise<void> => {
  try {
    const { customerId, profileId } = req.params;
    const history = await CustomerMeasurementService.getProfileHistory(customerId, profileId);
    if (!history) {
      res.status(404).json({ error: 'Measurement profile not found' });
      return;
    }
    res.json(history);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch measurement history' });
  }
});

// POST /customers/:customerId/measurement-profiles - Create new measurement profile
router.post('/:customerId/measurement-profiles', async (req, res): Promise<void> => {
  try {
    const { customerId } = req.params;
    const parse = customerMeasurementProfileSchema.safeParse(req.body);
    if (!parse.success) {
      res.status(400).json({ error: parse.error.errors[0]?.message || 'Invalid measurement profile data' });
      return;
    }

    const created = await CustomerMeasurementService.createProfile(customerId, {
      template_id: parse.data.template_id,
      profile_name: parse.data.profile_name,
      notes: parse.data.notes,
      measured_by: parse.data.measured_by,
      measured_at: parse.data.measured_at,
      values: parse.data.values as any,
    });

    const fullProfile = await CustomerMeasurementService.getProfileDetails(customerId, created.id);
    res.status(201).json(fullProfile);
  } catch (err: any) {
    console.error('Create measurement profile error:', err);
    res.status(500).json({ error: err.message || 'Failed to create measurement profile' });
  }
});

// POST /customers/:customerId/measurement-profiles/:profileId/versions - Add new measurement version
router.post('/:customerId/measurement-profiles/:profileId/versions', async (req, res): Promise<void> => {
  try {
    const { customerId, profileId } = req.params;
    const parse = customerMeasurementVersionSchema.safeParse(req.body);
    if (!parse.success) {
      res.status(400).json({ error: parse.error.errors[0]?.message || 'Invalid measurement version data' });
      return;
    }

    const version = await CustomerMeasurementService.addProfileVersion(customerId, profileId, {
      notes: parse.data.notes,
      measured_by: parse.data.measured_by,
      measured_at: parse.data.measured_at,
      values: parse.data.values as any,
    });

    const updatedProfile = await CustomerMeasurementService.getProfileDetails(customerId, profileId);
    res.status(201).json({ version, profile: updatedProfile });
  } catch (err: any) {
    console.error('Add measurement version error:', err);
    res.status(500).json({ error: err.message || 'Failed to record measurement version' });
  }
});

// PUT /customers/:customerId/measurement-profiles/:profileId - Update profile name / notes
router.put('/:customerId/measurement-profiles/:profileId', async (req, res): Promise<void> => {
  try {
    const { customerId, profileId } = req.params;
    const updated = await CustomerMeasurementService.updateProfile(customerId, profileId, req.body);
    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// DELETE /customers/:customerId/measurement-profiles/:profileId - Archive profile
router.delete('/:customerId/measurement-profiles/:profileId', async (req, res): Promise<void> => {
  try {
    const { customerId, profileId } = req.params;
    await CustomerMeasurementService.deleteProfile(customerId, profileId);
    res.json({ message: 'Measurement profile archived successfully' });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to delete measurement profile' });
  }
});

export default router;
