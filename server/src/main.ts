import 'dotenv/config';
import { drizzleDatabase } from './database';
import { SessionRepository } from './database/session-repository';
import { di, NanoIdGenerator, NativeDate } from './di';
import { Events } from './events';
import { app } from './server';
import { SessionStreams } from './session-streams';

di.bind('generator', new NanoIdGenerator());
di.bind('date', new NativeDate());
di.bind('events', new Events());
di.bind('database', drizzleDatabase);
di.bind('sessionRepository', new SessionRepository());
di.bind('sessionStreams', new SessionStreams());

di.resolve('sessionStreams').bindEvents();

const PORT = Number(process.env.PORT ?? 3000);
const HOST = process.env.HOST ?? 'localhost';

app.listen(PORT, HOST, () => {
  console.log(`Server running on http://${HOST}:${PORT}`);
});
