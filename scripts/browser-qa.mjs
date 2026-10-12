import { spawn } from 'node:child_process';
import { access, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const artifacts = path.join(root, 'artifacts');
const baseUrl = process.argv[2] || 'http://127.0.0.1:4173';
const debugUrl = 'http://127.0.0.1:9223';
const results = [];
const javascriptErrors = [];
let browser;
let cdp;
let browserLog = '';

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const check = (name, passed, details = undefined) => {
  const result = { name, passed: Boolean(passed), ...(details === undefined ? {} : { details }) };
  results.push(result);
  console.log(`${result.passed ? 'PASS' : 'FAIL'} ${name}${details === undefined ? '' : `: ${JSON.stringify(details)}`}`);
  return result.passed;
};

async function until(operation, timeoutMs = 10000) {
  const deadline = Date.now() + timeoutMs;
  let lastError;
  while (Date.now() < deadline) {
    try {
      const result = await operation();
      if (result) return result;
    } catch (error) {
      lastError = error;
    }
    await delay(120);
  }
  throw new Error(`Timed out after ${timeoutMs} ms${lastError ? `: ${lastError.message}` : ''}`);
}

class DevTools {
  constructor(socket) {
    this.socket = socket;
    this.nextId = 1;
    this.pending = new Map();
    socket.addEventListener('message', ({ data }) => {
      const message = JSON.parse(data);
      if (message.id) {
        const request = this.pending.get(message.id);
        if (!request) return;
        this.pending.delete(message.id);
        clearTimeout(request.timeout);
        message.error ? request.reject(new Error(JSON.stringify(message.error))) : request.resolve(message.result);
      } else if (message.method === 'Runtime.exceptionThrown') {
        const exception = message.params.exceptionDetails;
        javascriptErrors.push(exception.exception?.description || exception.text);
      } else if (message.method === 'Log.entryAdded' && message.params.entry.level === 'error' && message.params.entry.source === 'javascript') {
        javascriptErrors.push(message.params.entry.text);
      }
    });
    socket.addEventListener('close', () => {
      for (const request of this.pending.values()) {
        clearTimeout(request.timeout);
        request.reject(new Error('Chrome DevTools connection closed'));
      }
      this.pending.clear();
    });
  }

  static async connect(url) {
    const socket = new WebSocket(url);
    await new Promise((resolve, reject) => {
      socket.addEventListener('open', resolve, { once: true });
      socket.addEventListener('error', reject, { once: true });
    });
    return new DevTools(socket);
  }

  send(method, params = {}) {
    const id = this.nextId++;
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`CDP command timed out: ${method}`));
      }, 15000);
      this.pending.set(id, { resolve, reject, timeout });
      this.socket.send(JSON.stringify({ id, method, params }));
    });
  }

  async evaluate(expression, userGesture = false) {
    const result = await this.send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true, userGesture });
    if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text);
    return result.result.value;
  }
}

async function ready() {
  await until(() => cdp.evaluate("document.readyState === 'complete' && document.querySelector('main') !== null"));
  await cdp.evaluate(`(async () => {
    for (const image of document.images) image.loading = 'eager';
    await Promise.all([...document.images].map(image => image.complete ? Promise.resolve() : new Promise(resolve => { image.addEventListener('load', resolve, {once:true}); image.addEventListener('error', resolve, {once:true}); })));
    await document.fonts.ready;
    return true;
  })()`);
  await delay(350);
}

async function viewport(name, width, height, mobile, fullPage = true) {
  await cdp.send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile });
  await cdp.send('Emulation.setTouchEmulationEnabled', { enabled: mobile });
  await cdp.send('Page.navigate', { url: baseUrl });
  await ready();
  const layout = await cdp.evaluate(`({
    viewportWidth: innerWidth,
    documentWidth: document.documentElement.scrollWidth,
    bodyWidth: document.body.scrollWidth,
    images: [...document.images].map(image => ({src: image.getAttribute('src'), loaded: image.complete && image.naturalWidth > 0}))
  })`);
  check(`${name}: no horizontal overflow`, Math.max(layout.documentWidth, layout.bodyWidth) <= layout.viewportWidth + 1, layout);
  check(`${name}: all images loaded`, layout.images.length > 0 && layout.images.every(image => image.loaded), layout.images);
  const screenshot = await cdp.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
  await writeFile(path.join(artifacts, `${name}.png`), Buffer.from(screenshot.data, 'base64'));
  if (fullPage) {
    const { cssContentSize } = await cdp.send('Page.getLayoutMetrics');
    const fullScreenshot = await cdp.send('Page.captureScreenshot', {
      format: 'png',
      captureBeyondViewport: true,
      clip: { x: 0, y: 0, width: cssContentSize.width, height: cssContentSize.height, scale: 1 },
    });
    await writeFile(path.join(artifacts, `${name}-full.png`), Buffer.from(fullScreenshot.data, 'base64'));
  }
}

async function desktopInteractions() {
  const experience = await cdp.evaluate(`(() => {
    const link = [...document.querySelectorAll('a')].find(a => a.textContent.trim() === 'Experience' && a.hash);
    const section = document.querySelector(link?.hash || '#experience');
    return { sectionId: section?.id, count: section?.querySelectorAll('details').length || 0 };
  })()`);
  check('experience uses expandable details', experience.count > 0, experience);
  if (!experience.sectionId) return;
  const sectionSelector = JSON.stringify(`#${experience.sectionId}`);
  const allCount = experience.count;
  const recent = await cdp.evaluate(`(() => {
    const button = [...document.querySelectorAll('button')].find(b => b.textContent.trim() === 'Recent roles');
    button?.click();
    return Boolean(button);
  })()`, true);
  await delay(200);
  const recentCount = await cdp.evaluate(`document.querySelector(${sectionSelector}).querySelectorAll('details').length`);
  check('recent experience filter changes the visible roles', recent && recentCount > 0 && recentCount < allCount, { allCount, recentCount });
  const all = await cdp.evaluate(`(() => {
    const button = [...document.querySelectorAll('button')].find(b => b.textContent.trim() === 'All experience');
    button?.click();
    return Boolean(button);
  })()`, true);
  await delay(200);
  const restoredCount = await cdp.evaluate(`document.querySelector(${sectionSelector}).querySelectorAll('details').length`);
  check('all experience filter restores every role', all && restoredCount === allCount, { restoredCount });
  const toggles = await cdp.evaluate(`(() => [...document.querySelector(${sectionSelector}).querySelectorAll('details')].map(details => {
    const summary = details.querySelector('summary');
    const before = details.open;
    summary?.click();
    const changed = details.open !== before;
    summary?.click();
    return { label: summary?.textContent.trim(), changed, restored: details.open === before };
  }))()`, true);
  check('every experience disclosure opens and closes', toggles.length > 0 && toggles.every(toggle => toggle.changed && toggle.restored), toggles);

  try {
    await cdp.send('Page.bringToFront');
    await cdp.send('Emulation.setFocusEmulationEnabled', { enabled: true });
    await cdp.send('Browser.grantPermissions', { origin: new URL(baseUrl).origin, permissions: ['clipboardReadWrite', 'clipboardSanitizedWrite'] });
    const copied = await cdp.evaluate(`(async () => {
      const button = document.querySelector('button[aria-label="Copy email address"]');
      const expected = document.querySelector('a[href^="mailto:"]')?.getAttribute('href').slice(7).split('?')[0];
      button?.click();
      await new Promise(resolve => setTimeout(resolve, 350));
      return { found: Boolean(button), expected, clipboard: await navigator.clipboard.readText(), status: document.querySelector('[role="status"]')?.textContent.trim() };
    })()`, true);
    check('copy email writes the contact email to the clipboard', copied.found && Boolean(copied.expected) && copied.clipboard === copied.expected, copied);
  } catch (error) {
    check('copy email writes the contact email to the clipboard', false, error.message);
  }

  const pdf = await cdp.evaluate(`(async () => {
    const link = [...document.querySelectorAll('a[href]')].find(a => new URL(a.href).pathname.toLowerCase().endsWith('.pdf'));
    if (!link) return { found: false };
    const response = await fetch(link.href);
    return { found: true, url: link.href, status: response.status, type: response.headers.get('content-type'), bytes: (await response.arrayBuffer()).byteLength };
  })()`);
  check('resume PDF is available with the correct MIME type', pdf.found && pdf.status === 200 && /application\/pdf/i.test(pdf.type) && pdf.bytes > 0, pdf);
}

async function mobileInteractions() {
  const menuOpened = await cdp.evaluate(`(() => {
    const button = document.querySelector('button[aria-label="Open menu"]');
    button?.click();
    return Boolean(button);
  })()`, true);
  await delay(150);
  const expanded = await cdp.evaluate(`Boolean(document.querySelector('button[aria-expanded="true"]'))`);
  check('mobile menu opens', menuOpened && expanded);
  const navigated = await cdp.evaluate(`(() => {
    const link = [...document.querySelectorAll('a')].find(a => {
      const bounds = a.getBoundingClientRect();
      return a.textContent.trim() === 'Experience' && a.hash && bounds.width > 0 && bounds.height > 0 && getComputedStyle(a).visibility !== 'hidden';
    });
    const target = link?.hash;
    link?.click();
    return { found: Boolean(link), target };
  })()`, true);
  await delay(350);
  const navState = await cdp.evaluate(`({hash: location.hash, openMenu: Boolean(document.querySelector('button[aria-expanded="true"]'))})`);
  check('mobile Experience link navigates and closes the menu', navigated.found && navState.hash === navigated.target && !navState.openMenu, navState);
}

try {
  await mkdir(path.join(artifacts, 'browser-profile'), { recursive: true });
  const response = await fetch(baseUrl);
  if (!response.ok) throw new Error(`Preview returned HTTP ${response.status}`);
  let occupied = false;
  try { occupied = (await fetch(`${debugUrl}/json/version`, { signal: AbortSignal.timeout(500) })).ok; } catch {}
  if (occupied) throw new Error('Port 9223 is already occupied by another debugging browser; refusing to attach.');
  const candidates = [
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  ];
  let executable;
  for (const candidate of candidates) {
    try { await access(candidate); executable = candidate; break; } catch {}
  }
  if (!executable) throw new Error('No existing Chrome or Edge installation found.');
  browser = spawn(executable, [
    '--headless=new', '--no-first-run', '--no-default-browser-check',
    '--disable-background-networking', '--remote-debugging-port=9223',
    '--remote-debugging-address=127.0.0.1',
    `--user-data-dir=${path.join(artifacts, 'browser-profile')}`,
    '--window-size=1440,1000', 'about:blank',
  ], { windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
  browser.on('error', error => { browserLog += error.message; });
  browser.stdout.on('data', data => { browserLog = (browserLog + data).slice(-6000); });
  browser.stderr.on('data', data => { browserLog = (browserLog + data).slice(-6000); });
  const target = await until(async () => {
    const targets = await (await fetch(`${debugUrl}/json/list`)).json();
    return targets.find(target => target.type === 'page' && target.webSocketDebuggerUrl);
  }, 15000);
  cdp = await DevTools.connect(target.webSocketDebuggerUrl);
  await Promise.all([cdp.send('Page.enable'), cdp.send('Runtime.enable'), cdp.send('Log.enable'), cdp.send('Network.enable')]);
  await cdp.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
  await viewport('desktop', 1440, 1000, false);
  await desktopInteractions();
  await viewport('mobile', 390, 844, true);
  await mobileInteractions();
  await viewport('mobile-narrow', 320, 844, true, false);
  check('no JavaScript runtime errors', javascriptErrors.length === 0, javascriptErrors);
} catch (error) {
  check('browser QA completed', false, { error: error.message, browserLog });
} finally {
  if (cdp) {
    try { await cdp.send('Browser.close'); } catch {}
    cdp.socket.close();
  }
  if (browser && browser.exitCode === null) {
    browser.kill();
    await Promise.race([new Promise(resolve => browser.once('exit', resolve)), delay(2000)]);
  }
  await mkdir(artifacts, { recursive: true });
  await writeFile(path.join(artifacts, 'qa-report.json'), JSON.stringify({ baseUrl, results, javascriptErrors }, null, 2) + '\n');
  const failures = results.filter(result => !result.passed);
  console.log(`Browser QA: ${results.length - failures.length}/${results.length} checks passed. Artifacts: ${artifacts}`);
  process.exitCode = failures.length ? 1 : 0;
}
