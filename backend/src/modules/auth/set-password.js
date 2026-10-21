import { closeDatabaseConnection, connectToDatabase } from '../../config/database.js';
import { question, readSecret } from './cli-input.js';
import { setAccountPassword } from './auth.service.js';

async function main() {
  const email = await question('Account email: ');
  const password = await readSecret('New password (8-256 characters): ');
  const confirmation = await readSecret('Confirm password: ');
  if (password !== confirmation) {
    throw new Error('Passwords do not match.');
  }

  const database = await connectToDatabase();
  const user = await setAccountPassword(database, email, password);
  console.info(`Password updated for ${user.role} account ${user.email}. Existing sessions have been invalidated.`);
}

main()
  .catch((error) => {
    console.error(`Password update failed: ${error.message}`);
    process.exitCode = 1;
  })
  .finally(closeDatabaseConnection);
