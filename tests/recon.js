const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const consoleErrors = [];
  page.on('console', msg => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });
  page.on('pageerror', err => consoleErrors.push('PAGEERROR ' + err.message));
  await page.goto(`http://127.0.0.1:${process.env.TEST_PORT || 3000}`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1200);
  console.log('title', await page.title());
  console.log('home heading', await page.locator('h1').first().innerText());
  await page.screenshot({ path: 'tests/screenshots/recon_current.png', fullPage: true });
  console.log('desktop body overflow', await page.evaluate(() => document.body.scrollWidth > window.innerWidth));
  console.log('buttons', await page.locator('button').count());

  async function clickView(label) {
    const loc = page.locator('.sidebar .nav-item').filter({ hasText: label }).first();
    if (await loc.count()) { await loc.click(); await page.waitForTimeout(1200); return true; }
    return false;
  }

  for (const view of ['Schedule','Academics','Study chat','Notes','Files','Analytics','Settings']) {
    await clickView(view);
    console.log('view', view, 'heading', await page.locator('h1').first().innerText().catch(()=>''));
  }

  await page.locator('button.search-trigger').click();
  await page.waitForSelector('input[placeholder*="Search subjects"]', { timeout: 5000 }).catch(() => {});
  console.log('search modal html', (await page.locator('.modal-backdrop').count()), (await page.locator('body').innerHTML()).match(/modal[^>]{0,80}/g)?.slice(-5));
  console.log('body has search placeholder', (await page.content()).includes('Search subjects'));
  console.log('search-results classes', await page.locator('[class*="search"]').evaluateAll(els => els.map(e => ({tag:e.tagName, cls:e.className, text:e.textContent?.slice(0,40)})).slice(-10)));
  console.log('search dialog', await page.locator('.modal-backdrop').count(), await page.locator('input[placeholder*="Search subjects"]').count());
  if (await page.locator('input[placeholder*="Search subjects"]').count()) {
    await page.locator('input[placeholder*="Search subjects"]').fill('History');
    console.log('search matches', await page.locator('.search-results button').count());
    await page.keyboard.press('Escape');
    console.log('search after escape', await page.locator('input[placeholder*="Search subjects"]').count());
    if (await page.locator('input[placeholder*="Search subjects"]').count()) await page.locator('.modal-backdrop').first().click({position:{x:2,y:2}});
  }

  // Return to home and open quick add through the visible button.
  await clickView('Home');
  await page.getByRole('button', { name: /Quick add/i }).last().click();
  console.log('quick add dialog', await page.locator('.quick-add-modal').count());
  const titleInput = page.locator('.quick-add-modal input').first();
  await titleInput.fill('Browser test task');
  await page.locator('.quick-add-modal').getByRole('button', { name: /Add to Timely/i }).click();
  console.log('task visible', await page.getByText('Browser test task', { exact: true }).count());

  await page.getByRole('button', { name: 'Notifications' }).click();
  console.log('notification popover', await page.locator('.notification-popover').count());
  await page.getByText('Mark all read', { exact: true }).click();
  console.log('unread badges after mark all', await page.locator('.notification-badge').count());

  await page.setViewportSize({ width: 390, height: 844 });
  await page.reload({ waitUntil: 'networkidle' });
  console.log('mobile overflow', await page.evaluate(() => document.body.scrollWidth > window.innerWidth));
  console.log('mobile nav', await page.locator('.mobile-nav').count());
  await page.getByRole('button', { name: 'More sections' }).click();
  console.log('mobile more menu visible', await page.locator('.mobile-more-menu').evaluate(el => getComputedStyle(el).display));
  await page.getByRole('button', { name: 'More sections' }).click();
  console.log('mobile more menu after second click', await page.locator('.mobile-more-menu').evaluate(el => getComputedStyle(el).display));
  console.log('console errors', JSON.stringify(consoleErrors));
  await browser.close();
})();
