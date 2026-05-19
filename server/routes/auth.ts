import express from 'express';
import { generateToken } from '../auth.js';

const router = express.Router();

router.post('/login', async (req, res) => {
  const { password } = req.body;
  const expectedPassword = process.env.APP_PASSWORD;

  if (!password || !expectedPassword) {
    return res.status(400).json({ error: 'Missing password' });
  }

  if (password !== expectedPassword) {
    return res.status(401).json({ error: 'Wrong password' });
  }

  res.json({ token: generateToken() });
});

export default router;
