const puppeteer = require('puppeteer');

(async () => {
  const out = msg => console.log('[E2E]', msg);
  const browser = await puppeteer.launch({ args: ['--no-sandbox','--disable-setuid-sandbox'] });
  const page = await browser.newPage();
  page.setDefaultTimeout(30000);

  page.on('console', msg => out('PAGE_CONSOLE: ' + msg.text()));
  page.on('pageerror', err => out('PAGE_ERROR: ' + err.message));
  page.on('error', err => out('PAGE_ERR: ' + err.message));

  page.on('response', async resp => {
    try {
      const url = resp.url();
      if (/\/api\/auth\/register|\/api\/auth\/register-tenant|\/api\/auth\/login|\/api\/tenants\/me|\/api\/business\/tipos/.test(url)) {
        const text = await resp.text().catch(()=>'<no-body>');
        out(`RESP ${resp.status()} ${url} -> ${text.substring(0,400)}`);
      }
    } catch (e) {
      out('RESP_ERR '+e.message);
    }
  });

  try {
    const base = 'https://redcomercialweb.vercel.app';
    out('Opening '+base+'/register');
    await page.goto(base + '/register', { waitUntil: 'networkidle2' });

    // Step 0: wait for tipos grid and click first option
    await page.waitForSelector('div[style*="grid"] button', { timeout: 15000 });
    await page.click('div[style*="grid"] button');
    out('Clicked first business type');

    // Click Continuar
    const continuar = await page.$x("//button[contains(., 'Continuar')]");
    if (continuar.length) {
      await continuar[0].click();
      out('Clicked Continuar (to step 1)');
    } else {
      throw new Error('Continuar button not found');
    }

    // Step 1: fill business name
    await page.waitForSelector('input[placeholder="Ex: Restaurante XYZ"]', { timeout: 10000 });
    const nome = 'UI Test Tenant ' + Date.now();
    await page.type('input[placeholder="Ex: Restaurante XYZ"]', nome, { delay: 50 });
    out('Filled business nome: ' + nome);

    // Continue to step 2
    const continuar2 = await page.$x("//button[contains(., 'Continuar')]");
    if (continuar2.length) {
      await continuar2[0].click();
      out('Clicked Continuar (to step 2)');
    }

    // Step 2: fill email and passwords
    await page.waitForSelector('input[type="email"]', { timeout: 10000 });
    const email = 'ui_test+' + Date.now() + '@example.com';
    const password = 'TestPass123!';
    await page.type('input[type="email"]', email, { delay: 30 });
    // two password inputs - pick the visible ones
    const passInputs = await page.$$('input[type="password"]');
    if (passInputs.length >= 2) {
      await passInputs[0].type(password, { delay: 30 });
      await passInputs[1].type(password, { delay: 30 });
    } else if (passInputs.length === 1) {
      await passInputs[0].type(password, { delay: 30 });
    } else {
      throw new Error('Password inputs not found');
    }
    out('Filled email and passwords: ' + email);

    // Click Criar Negócio
    const criar = await page.$x("//button[contains(., 'Criar Negócio') or contains(., 'Criar')]");
    if (criar.length) {
      await criar[0].click();
      out('Clicked Criar Negócio');
    } else {
      throw new Error('Criar Negócio button not found');
    }

    // Wait for either navigation or toast
    await page.waitForTimeout(3000);

    out('Waiting additional 6s for background requests...');
    await page.waitForTimeout(6000);

    out('E2E UI script finished');
  } catch (e) {
    out('ERROR: ' + e.message);
    process.exitCode = 2;
  } finally {
    try { await browser.close(); } catch (e){}
  }
})();
