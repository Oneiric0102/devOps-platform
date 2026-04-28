import { Router } from 'express';
import { client } from '../middlewares/metrics.middleware';

const router = Router();

router.get('/metrics', async (req, res) => {
  res.set('Content-Type', client.register.contentType);
  res.end(await client.register.metrics());
});

export default router;
