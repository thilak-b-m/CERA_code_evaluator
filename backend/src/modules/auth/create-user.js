import { closeDatabaseConnection, connectToDatabase } from '../../config/database.js';
import { question, readSecret } from './cli-input.js';
import { initializeAuthCollections, inviteFaculty } from './auth.service.js';

async function main() {
  const name = await question('Full name: ');
  const email = await question('Institutional email: ');
  const department = await question('Department or branch: ');
  const password = await readSecret('Password (8-256 characters): ');
  const confirmation = await readSecret('Confirm password: ');
  if (password !== confirmation) {
    throw new Error('Passwords do not match.');
  }

  const database = await connectToDatabase();
  await initializeAuthCollections(database);
  const user = await inviteFaculty(database, { name, email, department, password });
  console.info(`Created faculty account for ${user.email} (${user.department}).`);
}

main()
  .catch((error) => {
    console.error(`Account provisioning failed: ${error.message}`);
    process.exitCode = 1;
  })
  .finally(closeDatabaseConnection);
