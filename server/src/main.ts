import 'dotenv/config';
import { container } from './di.ts';
import { SessionSseSubscriber } from './http/session-sse-subscriber.ts';

async function main() {
  const database = container.resolve('database');
  const server = container.resolve('server');
  const subscriber = container.build(SessionSseSubscriber);

  async function close() {
    subscriber.unsubscribe();
    await server.stop();
    await database.$client.end();
  }

  process.on('SIGTERM', () => close().catch(console.error));
  process.on('SIGINT', () => close().catch(console.error));

  await server.start();
}

main().catch(console.error);
