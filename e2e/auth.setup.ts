import { mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';
import { test as setup } from '@playwright/test';
import { AUTH_STATE, loginViaUi } from './support/auth';

setup('autenticar conta administrativa de teste', async ({ page }) => {
  await mkdir(dirname(AUTH_STATE), { recursive: true });
  await loginViaUi(page);
  await page.context().storageState({ path: AUTH_STATE });
});
