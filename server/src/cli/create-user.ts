import 'dotenv/config';
import { container } from '../di.ts';

async function main() {
  const [, , email, name] = process.argv;

  if (!email) {
    console.error('Usage: create-user <email> [name]');
    process.exit(1);
  }

  const userRepository = container.resolve('userRepository');
  const generator = container.resolve('generator');
  const config = container.resolve('config');

  const loginToken = generator.token();
  const user = await userRepository.create({ email, name, loginToken });

  const link = `${config.auth.clientUrl}/auth/login?token=${loginToken}`;

  console.log(`User created: ${user.id} <${user.email}>`);
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
