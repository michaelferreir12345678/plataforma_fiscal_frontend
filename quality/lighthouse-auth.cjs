/**
 * Autentica o Chrome controlado pelo Lighthouse no ambiente de teste.
 * As credenciais vêm exclusivamente de .env.e2e/secret store.
 */
module.exports = async (browser, context) => {
  const email = process.env.E2E_EMAIL;
  const password = process.env.E2E_PASSWORD;
  if (!email || !password) {
    throw new Error(
      'Lighthouse requer E2E_EMAIL e E2E_PASSWORD de uma conta administrativa de teste.',
    );
  }

  const origin = new URL(context.url).origin;
  const pages = await browser.pages();
  const page = pages[0] || (await browser.newPage());
  await page.goto(`${origin}/dashboard`, { waitUntil: 'domcontentloaded' });
  await page.waitForNetworkIdle({ idleTime: 500, timeout: 15_000 }).catch(() => undefined);

  const authenticated = await page.evaluate(() =>
    Boolean(localStorage.getItem('erario_token')),
  );
  if (!authenticated) {
    await page.waitForSelector('form input[type="password"]');
    const inputs = await page.$$('form input');
    if (inputs.length < 2) {
      throw new Error('Formulário de autenticação não encontrado pelo Lighthouse.');
    }
    await inputs[0].click({ clickCount: 3 });
    await page.keyboard.press('Backspace');
    await inputs[0].type(email);
    await inputs[1].click({ clickCount: 3 });
    await page.keyboard.press('Backspace');
    await inputs[1].type(password);
    await page.click('form button[type="submit"]');
    await page.waitForFunction(() => Boolean(localStorage.getItem('erario_token')));
  }

  await page.goto(context.url, { waitUntil: 'networkidle0', timeout: 60_000 });
  await page.waitForFunction(
    () => {
      const period = document.querySelector(
        'button[aria-label="Selecionar período"]',
      );
      const hasFiscalContext = Boolean(period && !/[…—]/.test(period.textContent || ''));
      return hasFiscalContext && !document.querySelector('[aria-busy="true"]');
    },
    { timeout: 60_000 },
  );
};
