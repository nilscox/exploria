import cors from 'cors';
import express, { type ErrorRequestHandler } from 'express';
import z from 'zod';

import { container } from '../di';

export const app = express();

app.use(cors());
app.use(express.json());

app.use('/session', container.resolve('sessionController').router);

app.use((req, res) => {
  res.status(404).end();
});

app.use(((err, _req, res, _next) => {
  if (err instanceof z.ZodError) {
    return res.status(400).json(z.formatError(err));
  }

  console.error(err);
  res.status(500);

  if (err instanceof Error) {
    res.send(err.message);
  } else {
    res.end();
  }
}) satisfies ErrorRequestHandler);
