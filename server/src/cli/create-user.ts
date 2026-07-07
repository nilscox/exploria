import 'dotenv/config';
import { container } from '../di.ts';

async function main() {
  const [, , name] = process.argv;

  if (!name) {
    console.error('Usage: create-user <name>');
    process.exit(1);
  }

  const userRepository = container.resolve('userRepository');
  const generator = container.resolve('generator');
  const config = container.resolve('config');

  const loginToken = generator.token();
  const user = await userRepository.create({ name, loginToken });

  const link = `${config.auth.clientUrl}/auth/login?token=${loginToken}`;

  console.log(`User created: ${user.id}`);
  console.log(`Login link:   ${link}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await container.resolve('database').$client.end();
  });
