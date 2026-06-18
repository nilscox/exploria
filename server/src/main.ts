import 'dotenv/config';
import { container } from './di';
import { app } from './http/server';

const config = container.resolve('config');
const { host, port } = config.server;

app.listen(port, host, () => {
  console.log(`Server running on http://${host}:${port}`);
});
