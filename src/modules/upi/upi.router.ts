import { Router } from 'express';
import {
  verifyUpiHandler,
  addUpiIdHandler,
  listUpiIdsHandler,
  deleteUpiIdHandler,
  setPrimaryUpiHandler,
} from './upi.controller';
import { optionalAuth, requireAuth } from '../../middleware/auth0';

export const upiRouter = Router();

// Verify UPI ID format + NPCI resolution (no auth needed for basic verify)
upiRouter.post('/verify', optionalAuth, verifyUpiHandler);

// CRUD for user's UPI IDs (requires auth token OR phone userId header)
upiRouter.get('/list', requireAuth, listUpiIdsHandler);     // GET all UPI IDs for user
upiRouter.post('/add', requireAuth, addUpiIdHandler);       // POST { upiId } — verify & add
upiRouter.delete('/:upiIdRecordId', requireAuth, deleteUpiIdHandler);  // DELETE a UPI ID
upiRouter.post('/:upiIdRecordId/primary', requireAuth, setPrimaryUpiHandler); // Set as primary
