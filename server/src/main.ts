import 'dotenv/config';
import { container } from './di';
import { SessionSseSubscriber } from './http/session-sse-subscriber';

async function main() {
  const server = container.resolve('server');
  const database = container.resolve('database');

  container.build(SessionSseSubscriber);

  async function close() {
    await server.stop();
    await database.$client.end();
  }

  process.on('SIGTERM', () => close().catch(console.error));
  process.on('SIGINT', () => close().catch(console.error));

  await server.start();
}

main().catch(console.error);
