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
  return {
    count: badges.length,
    values: Array.from(badges).map(b => b.textContent.trim())
  };
})()
`;

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

(async () => {
  let browser;
  const results = {
    tabs: [],
    badge: null,
    consoleLogs: [],
    errors: []
  };

  try {
    console.log('Launching browser...');
    browser = await puppeteer.launch({
      headless: false,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const tabUrls = [
      { url: 'http://localhost:5174/dashboard', label: '탭1 (/dashboard, 1번째)' },
      { url: 'http://localhost:5174/dashboard', label: '탭2 (/dashboard, 2번째)' },
      { url: 'http://localhost:5174/mall', label: '탭3 (/mall)' },
      { url: 'http://localhost:5174/dashboard/cart', label: '탭4 (/dashboard/cart)' },
    ];

    const pages = [];

    // Step 1: Open all tabs and install interceptors immediately
    console.log('\n=== Opening tabs and installing interceptors ===');
    for (let i = 0; i < tabUrls.length; i++) {
      const { url, label } = tabUrls[i];
      console.log(`Opening ${label}: ${url}`);
      
      let page;
      if (i === 0) {
        page = (await browser.pages())[0];
      } else {
        page = await browser.newPage();
      }
      
      // Capture console logs
      page.on('console', msg => {
        const text = msg.text();
        if (text.includes('[INTERCEPT]')) {
          results.consoleLogs.push({ tab: label, msg: text });
        }
      });

      try {
        await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
        console.log(`  -> Navigated to ${url}`);
      } catch (e) {
        console.log(`  -> Navigation warning (continuing): ${e.message}`);
      }

      // Install interceptor
      try {
        const interceptResult = await page.evaluate(INTERCEPTOR_SCRIPT);
        console.log(`  -> Interceptor installed:`, JSON.stringify(interceptResult));
      } catch (e) {
        console.log(`  -> Interceptor install error: ${e.message}`);
        results.errors.push({ tab: label, error: e.message });
      }

      pages.push({ page, label, url });
    }

    // Step 2: Wait 5 seconds
    console.log('\n=== Waiting 5 seconds... ===');
    await sleep(5000);

    // Step 3: Read counts at 5s
    console.log('\n=== Reading counts at 5s ===');
    for (const { page, label } of pages) {
      try {
        const count5s = await page.evaluate(COUNT_SCRIPT);
        console.log(`  ${label}: ${JSON.stringify(count5s)}`);
        results.tabs.push({ label, count5s: count5s.count, count10s: null });
      } catch (e) {
        console.log(`  ${label}: ERROR ${e.message}`);
        results.tabs.push({ label, count5s: 'ERROR', count10s: null, error: e.message });
      }
    }

    // Step 4: Wait another 5 seconds (total 10s)
    console.log('\n=== Waiting another 5 seconds (total 10s)... ===');
    await sleep(5000);

    // Step 5: Read counts at 10s
    console.log('\n=== Reading counts at 10s ===');
    for (let i = 0; i < pages.length; i++) {
      const { page, label } = pages[i];
      try {
        const count10s = await page.evaluate(COUNT_SCRIPT);
        console.log(`  ${label}: ${JSON.stringify(count10s)}`);
        results.tabs[i].count10s = count10s.count;
      } catch (e) {
        console.log(`  ${label}: ERROR ${e.message}`);
        results.tabs[i].count10s = 'ERROR';
      }
    }

    // Step 6: Badge check on tab 1 (dashboard)
    console.log('\n=== Checking badges on Tab 1 ===');
    try {
      const badge = await pages[0].page.evaluate(BADGE_SCRIPT);
      results.badge = badge;
      console.log('  Badge result:', JSON.stringify(badge));
    } catch (e) {
      console.log('  Badge error:', e.message);
      results.badge = { error: e.message };
    }

    // Step 7: Get console logs captured
    console.log('\n=== Console logs captured ===');
    console.log(`  Total [INTERCEPT] logs: ${results.consoleLogs.length}`);
    results.consoleLogs.forEach(log => console.log(`  [${log.tab}] ${log.msg}`));

  } catch (e) {
    console.log('FATAL ERROR:', e.message);
    results.errors.push({ tab: 'global', error: e.message });
  } finally {
    if (browser) {
      await browser.close();
    }
  }

  // Final summary
  console.log('\n\n=== FINAL RESULTS ===');
  console.log(JSON.stringify(results, null, 2));

  // Determine pass/fail
  let allStable = true;
  let reasonableCounts = true;
  for (const tab of results.tabs) {
    if (tab.count5s === 'ERROR' || tab.count10s === 'ERROR') {
      allStable = false;
      reasonableCounts = false;
      continue;
    }
    // Check if count is increasing between 5s and 10s significantly
    const increase = tab.count10s - tab.count5s;
    if (increase > 5) {
      allStable = false;
    }
    // Reasonable count: should be low (1-5 per tab, not hundreds)
    if (tab.count10s > 20) {
      reasonableCounts = false;
    }
  }

  const badge = results.badge;
  const badgeStable = badge && badge.count !== undefined && !badge.error;

  console.log('\n=== PASS/FAIL ANALYSIS ===');
  console.log('요청 안정성 (10s 이내 < 20회):', reasonableCounts ? 'PASS' : 'FAIL');
  console.log('요청 증가 없음 (5s→10s 5회 이하 증가):', allStable ? 'PASS' : 'FAIL');
  console.log('사이드바 배지 안정:', badgeStable ? 'PASS' : 'FAIL');
  
  const overall = reasonableCounts && allStable ? 'PASS' : 'FAIL';
  console.log('종합 판정:', overall);

  return results;
})();
