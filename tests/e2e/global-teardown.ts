import fs from 'fs';
import path from 'path';

const STORAGE_STATE_FILE = path.join(process.cwd(), 'tests', 'e2e', 'fixtures', 'storage-state.json');
const TEST_CREDS_FILE = path.join(process.cwd(), 'tests', 'e2e', 'fixtures', '.test-creds.json');

async function globalTeardown() {
  // Clean up storage state files
  const files = [STORAGE_STATE_FILE, TEST_CREDS_FILE];
  for (const file of files) {
    try {
      if (fs.existsSync(file)) {
        fs.unlinkSync(file);
        console.log('[globalTeardown] Removed:', file);
      }
    } catch {
      // ignore if file doesn't exist
    }
  }

  // Clean up test results / screenshots
  const reportsDir = path.join(process.cwd(), 'reports');
  if (fs.existsSync(reportsDir)) {
    console.log('[globalTeardown] Reports directory preserved at:', reportsDir);
  }

  console.log('[globalTeardown] Done.');
}

export default globalTeardown;
