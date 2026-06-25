import 'dotenv/config';
import { container } from './di';
import { SessionSseSubscriber } from './http/session-sse-subscriber';

const server = container.resolve('server');
const database = container.resolve('database');

async function close() {
  await server.stop();
  await database.$client.end();
}

process.on('SIGTERM', () => close().catch(console.error));
process.on('SIGINT', () => close().catch(console.error));

new SessionSseSubscriber(
  container.resolve('events'),
  container.resolve('sessionRepository'),
  container.resolve('uiNotifier'),
);

server.start().catch(console.error);
