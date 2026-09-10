const puppeteer = require('puppeteer');

const INTERCEPTOR_SCRIPT = `
(function() {
  if (window.__ordersReqCount !== undefined) {
    return { count: window.__ordersReqCount, elapsed: Date.now() - window.__ordersStartTime };
  }
  window.__ordersReqCount = 0;
  window.__ordersStartTime = Date.now();
  const origFetch = window.fetch;
  window.fetch = function(...args) {
    const url = typeof args[0] === 'string' ? args[0] : (args[0]?.url || '');
    if (url.includes('orders') || url.includes('supabase')) {
      window.__ordersReqCount++;
      console.log('[INTERCEPT] orders request #' + window.__ordersReqCount + ':', url.slice(0, 100));
    }
    return origFetch.apply(this, args);
  };
  return { count: 0, elapsed: 0, msg: 'interceptor installed' };
})()
`;

const COUNT_SCRIPT = `({ count: window.__ordersReqCount, elapsed: Date.now() - window.__ordersStartTime })`;

const BADGE_SCRIPT = `
(function() {
  const badges = document.querySelectorAll('.font-mono.text-blue-600, .font-mono.text-amber-600, .font-mono.text-orange-600');
  return { count: badges.length, values: Array.from(badges).map(b => b.textContent.trim()) };
})()
`;

function sleep(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }

(async () => {
  const results = { tabs: [], badge: null, consoleLogs: [], errors: [] };
  let browser;
  try {
    browser = await puppeteer.launch({ headless: false, args: ['--no-sandbox'] });
    const tabUrls = [
      { url: 'http://localhost:5174/dashboard', label: 'Tab1' },
      { url: 'http://localhost:5174/dashboard', label: 'Tab2' },
      { url: 'http://localhost:5174/mall', label: 'Tab3' },
      { url: 'http://localhost:5174/dashboard/cart', label: 'Tab4' },
    ];
    const pages = [];
    for (let i = 0; i < tabUrls.length; i++) {
      const { url, label } = tabUrls[i];
      let page = i === 0 ? (await browser.pages())[0] : await browser.newPage();
      page.on('console', msg => { const t = msg.text(); if (t.includes('[INTERCEPT]')) results.consoleLogs.push({ tab: label, msg: t }); });
      try { await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 }); console.log('nav ok', label); } catch(e) { console.log('nav warn', label, e.message.slice(0,60)); }
      try { const r = await page.evaluate(INTERCEPTOR_SCRIPT); console.log('intercept', label, JSON.stringify(r)); } catch(e) { results.errors.push({ tab: label, error: e.message }); }
      pages.push({ page, label });
    }
    console.log('Waiting 5s...');
    await sleep(5000);
    for (let i = 0; i < pages.length; i++) {
      const c = await pages[i].page.evaluate(COUNT_SCRIPT);
      results.tabs.push({ label: pages[i].label, count5s: c.count, count10s: null });
      console.log('5s', pages[i].label, c.count);
    }
    console.log('Waiting 5s more...');
    await sleep(5000);
    for (let i = 0; i < pages.length; i++) {
      const c = await pages[i].page.evaluate(COUNT_SCRIPT);
      results.tabs[i].count10s = c.count;
      console.log('10s', pages[i].label, c.count);
    }
    try { results.badge = await pages[0].page.evaluate(BADGE_SCRIPT); } catch(e) { results.badge = { error: e.message }; }
    console.log('badge', JSON.stringify(results.badge));
    console.log('[INTERCEPT] logs:', results.consoleLogs.length);
  } catch(e) { results.errors.push({ tab: 'global', error: e.message }); } 
  finally { if (browser) await browser.close(); }
  console.log('RESULTS:', JSON.stringify(results));
})();
