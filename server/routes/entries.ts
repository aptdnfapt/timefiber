import express from 'express';
import type { Response } from 'express';
import { verifyToken, type AuthRequest } from '../auth.js';
import { getDb } from '../database.js';

const router = express.Router();

router.get('/', verifyToken, async (req: AuthRequest, res: Response) => {
  const db = getDb();
  const entries = await db.all('SELECT * FROM entries ORDER BY created_at ASC');
  res.json(entries);
});

router.post('/', verifyToken, async (req: AuthRequest, res: Response) => {
  const db = getDb();
  const { week_number, month_number, date, day_name, season, 
          time_string, detail, place, activity } = req.body;

  const result = await db.run(
    `INSERT INTO entries (week_number, month_number, date, day_name, season, 
      time_string, detail, place, activity) 
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [week_number, month_number, date, day_name, season, 
     time_string, detail, place, activity]
  );

  const entry = await db.get('SELECT * FROM entries WHERE id = ?', result.lastID);
  res.status(201).json(entry);
});

router.put('/:id', verifyToken, async (req: AuthRequest, res: Response) => {
  const db = getDb();
  const { id } = req.params;
  const { column, value } = req.body;

  const allowedColumns = ['week_number', 'month_number', 'date', 'day_name', 
    'season', 'time_string', 'detail', 'place', 'activity', 'row_color'];

  if (!allowedColumns.includes(column)) {
    return res.status(400).json({ error: 'Invalid column' });
  }

  await db.run(
    `UPDATE entries SET ${column} = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
    [value, id]
  );

  const entry = await db.get('SELECT * FROM entries WHERE id = ?', id);
  res.json(entry);
});

router.delete('/:id', verifyToken, async (req: AuthRequest, res: Response) => {
  const db = getDb();
  const { id } = req.params;
  await db.run('DELETE FROM entries WHERE id = ?', id);
  res.status(204).send();
});

export default router;
