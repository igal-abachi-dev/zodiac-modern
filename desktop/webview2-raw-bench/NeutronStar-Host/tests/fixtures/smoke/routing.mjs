const check = (value, label) => { if (!value) throw new Error(label); };
const render = () => { document.querySelector('#route').textContent = location.hash; };
window.addEventListener('hashchange', render);
render();

function move(action, expected) {
  return new Promise((resolve, reject) => {
    const done = () => {
      clearTimeout(timer);
      window.removeEventListener('hashchange', changed);
    };
    const changed = () => {
      done();
      if (location.hash === expected && document.querySelector('#route').textContent === expected) resolve();
      else reject(new Error('Unexpected route'));
    };
    const timer = setTimeout(() => { done(); reject(new Error('Route event timeout')); }, 4000);
    window.addEventListener('hashchange', changed);
    action();
  });
}

async function run() {
  const { fixture } = await import('./module.mjs');
  check(fixture === 'local module loaded', 'Dynamic module under fragment route');
  check(getComputedStyle(document.querySelector('#sentinel')).color === 'rgb(12, 34, 56)', 'External CSS');
  check(location.pathname === '/routing.html', 'Physical entry remains unchanged');
  if (location.hash === '#/reload-probe') {
    check(!window.neutronstarReloadSentinel, 'Fresh document after reload');
    check(document.querySelector('#route').textContent === '#/reload-probe', 'Route reconstructed from fragment');
    check((await fetch('/missing-route')).status === 403, 'Extensionless route has no MIME/fallback');
    check((await fetch('/missing-route.html')).status === 404, 'Missing allowed HTML stays missing');
    check((await fetch('/missing-route/')).status === 403, 'No directory index expansion');
    check((await fetch('/fragment.html')).status === 200, 'Explicit existing HTML still served');
    // pushState can change the client URL, but cannot create a native resource mapping.
    history.pushState(null, '', '/synthetic-history-route');
    check((await fetch(location.pathname)).status === 403, 'History route cannot reload as a document');
    history.replaceState(null, '', '/routing.html#/reload-probe');
    // Exercise the existing normal smoke runner's navigation-block assertion too.
    location.href = 'https://external.invalid/routing-probe';
    await new Promise(resolve => setTimeout(resolve, 300));
    document.title = 'NeutronStar smoke: PASS';
    return;
  }
  check(location.hash === '', 'Initial unfragmented entry');
  await move(() => { location.hash = '/basic'; }, '#/basic');
  await move(() => { location.hash = '/stress'; }, '#/stress');
  await move(() => history.back(), '#/basic');
  await move(() => history.forward(), '#/stress');
  await move(() => { location.hash = '/reload-probe'; }, '#/reload-probe');
  window.neutronstarReloadSentinel = true;
  location.reload(); // Fragment selects the second phase; no storage/cookie/test listener is needed.
}

run().catch(() => { document.title = 'NeutronStar smoke: FAIL'; });
