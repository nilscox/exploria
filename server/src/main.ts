import 'dotenv/config';
import { container } from './di';
import { app } from './server';

container.resolve('sessionStreams').bindEvents();

const PORT = Number(process.env.PORT ?? 3000);
const HOST = process.env.HOST ?? 'localhost';

app.listen(PORT, HOST, () => {
  console.log(`Server running on http://${HOST}:${PORT}`);
});
