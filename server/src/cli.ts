import { Command, InvalidArgumentError } from 'commander';
import 'dotenv/config';

import { container } from './di.ts';
import { languages, type Language } from './domain/i18n/index.ts';
import { Session } from './domain/session.ts';

const program = new Command();

program.name('exploria').description('Exploria maintenance CLI');

program
  .command('create-user')
  .description('Create a new user')
  .argument('<name>', "the user's name")
  .action(async (name: string) => {
    const userRepository = container.resolve('userRepository');
    const generator = container.resolve('generator');
    const config = container.resolve('config');

    const loginToken = generator.token();
    const user = await userRepository.create({ name, loginToken });

    const link = `${config.auth.clientUrl}/auth/login?token=${loginToken}`;

    console.log(`User created: ${user.id}`);
    console.log(`Login link:   ${link}`);
  });

program
  .command('generate-demo')
  .description('Generate a demo session by simulating a participant guided by the assistant')
  .requiredOption('-m, --model <model>', 'LLM model to use')
  .option('-l, --language <language>', `session language (${languages.join(', ')})`, parseLanguage, 'en')
  .option('-s, --subject <subject>', 'session subject')
  .option('-n, --messages <count>', 'number of participant messages to generate', parseCount, 4)
  .action(async (options: { model: string; language: Language; subject?: string; messages: number }) => {
    const { model, language, subject, messages } = options;

    const generator = container.resolve('generator');
    const clock = container.resolve('clock');
    const sessionRepository = container.resolve('sessionRepository');
    const demoGenerator = container.resolve('demoGenerator');

    const session = Session.create(generator, clock, { model, language, ownerId: null });

    await sessionRepository.insert(session);
    await sessionRepository.save(session);

    console.log(`Generating demo session ${session.id}...`);

    const commit = async () => {
      await sessionRepository.save(session);
    };

    await demoGenerator.generate(session, commit, subject, messages);

    console.log(`\nDone: ${session.id}`);
  });

function parseLanguage(value: string): Language {
  if (!(languages as readonly string[]).includes(value)) {
    throw new InvalidArgumentError(`Invalid language "${value}", expected one of: ${languages.join(', ')}`);
  }

  return value as Language;
}

function parseCount(value: string): number {
  const count = Number(value);

  if (!Number.isInteger(count) || count < 1) {
    throw new InvalidArgumentError(`Invalid message count "${value}", expected a positive integer`);
  }

  return count;
}

program
  .parseAsync()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await container.resolve('database').$client.end();
  });
