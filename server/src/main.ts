import 'dotenv/config';
import { container } from './di';

const server = container.resolve('server');
const database = container.resolve('database');

async function close() {
  await server.stop();
  await database.$client.end();
}

process.on('SIGTERM', () => close().catch(console.error));
process.on('SIGINT', () => close().catch(console.error));

server.start().catch(console.error);
