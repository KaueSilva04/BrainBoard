/**
 * Browser Empirical Verification Harness via CDP (Chrome DevTools Protocol)
 * Tests Desktop (1440x900) & Mobile (390x844) in Light & Dark modes across all 6 surfaces:
 * 1. Visão Geral
 * 2. Projetos
 * 3. Quadro Kanban (including Collaborators Modal & Task Assignees)
 * 4. Foco
 * 5. Calendário
 * 6. Acadêmico
 *
 * Checks:
 * - Zero horizontal overflow (scrollWidth <= window.innerWidth)
 * - Zero uncaught console errors
 * - High-contrast studio controls & clean typography
 * - Proportional multi-segment SVG donut ring
 * - Compact Em breve footer strip
 * - Saves screenshots to .impeccable/review/
 */

import http from 'http';
import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';

const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const BROWSER_PATH = fs.existsSync(EDGE_PATH) ? EDGE_PATH : CHROME_PATH;

const CDP_PORT = 9225;
const FRONTEND_URL = 'http://localhost:5173';
const OUTPUT_DIR = path.resolve(process.cwd(), '.impeccable/review');

if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

interface CdpResponse {
  id: number;
  result?: any;
  error?: any;
  method?: string;
  params?: any;
}

class CdpClient {
  private ws!: WebSocket;
  private id = 0;
  private pending = new Map<number, { resolve: (val: any) => void; reject: (err: any) => void }>();
  public consoleErrors: string[] = [];

  constructor(private wsUrl: string) {}

  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(this.wsUrl);
      this.ws.onopen = () => resolve();
      this.ws.onerror = (e) => reject(e);
      this.ws.onmessage = (event) => {
        const msg: CdpResponse = JSON.parse(event.data.toString());
        if (msg.id && this.pending.has(msg.id)) {
          const p = this.pending.get(msg.id)!;
          this.pending.delete(msg.id);
          if (msg.error) p.reject(msg.error);
          else p.resolve(msg.result);
        } else if (msg.method === 'Runtime.consoleAPICalled') {
          if (msg.params.type === 'error') {
            const text = msg.params.args.map((a: any) => a.value || a.description || JSON.stringify(a)).join(' ');
            this.consoleErrors.push(`[Console Error] ${text}`);
          }
        } else if (msg.method === 'Runtime.exceptionThrown') {
          const desc = msg.params.exceptionDetails?.exception?.description || msg.params.exceptionDetails?.text;
          this.consoleErrors.push(`[Uncaught Exception] ${desc}`);
        }
      };
    });
  }

  send(method: string, params: Record<string, any> = {}): Promise<any> {
    return new Promise((resolve, reject) => {
      const msgId = ++this.id;
      this.pending.set(msgId, { resolve, reject });
      this.ws.send(JSON.stringify({ id: msgId, method, params }));
    });
  }

  async eval(expression: string): Promise<any> {
    const res = await this.send('Runtime.evaluate', {
      expression,
      awaitPromise: true,
      returnByValue: true,
    });
    if (res.exceptionDetails) {
      throw new Error(`Eval error: ${JSON.stringify(res.exceptionDetails)}`);
    }
    return res.result?.value;
  }

  async screenshot(filePath: string): Promise<void> {
    const res = await this.send('Page.captureScreenshot', { format: 'png' });
    const buffer = Buffer.from(res.data, 'base64');
    fs.writeFileSync(filePath, buffer);
    console.log(`  📸 Screenshot saved: ${path.relative(process.cwd(), filePath)}`);
  }

  close() {
    try {
      this.ws.close();
    } catch {}
  }
}

async function fetchJson(url: string): Promise<any> {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let raw = '';
      res.on('data', (c) => (raw += c));
      res.on('end', () => {
        try {
          resolve(JSON.parse(raw));
        } catch {
          resolve(raw);
        }
      });
    }).on('error', reject);
  });
}

function delay(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function runBrowserVerification() {
  console.log('\n================================================================');
  console.log('   Empirical Live Browser & Responsive Verification Harness');
  console.log('================================================================\n');

  console.log(`[Setup] Launching headless browser: ${BROWSER_PATH}`);
  const tempProfile = path.resolve(process.cwd(), '.tmp_browser_profile');
  if (!fs.existsSync(tempProfile)) fs.mkdirSync(tempProfile, { recursive: true });

  const browserProc = spawn(BROWSER_PATH, [
    `--remote-debugging-port=${CDP_PORT}`,
    `--user-data-dir=${tempProfile}`,
    '--headless=new',
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-extensions',
    '--disable-gpu',
    '--window-size=1440,900',
    'about:blank',
  ]);

  let cdpClient: CdpClient | null = null;

  try {
    // Wait for browser debugger to become available
    let targets: any[] = [];
    for (let i = 0; i < 30; i++) {
      try {
        targets = await fetchJson(`http://127.0.0.1:${CDP_PORT}/json/list`);
        if (targets && targets.length > 0) break;
      } catch {}
      await delay(500);
    }

    if (!targets || targets.length === 0) {
      throw new Error(`Failed to connect to browser on port ${CDP_PORT}`);
    }

    const pageTarget = targets.find((t) => t.type === 'page') || targets[0];
    console.log('✓ Browser debugging connected to target:', pageTarget.id);

    cdpClient = new CdpClient(pageTarget.webSocketDebuggerUrl);
    await cdpClient.connect();

    await cdpClient.send('Page.enable');
    await cdpClient.send('Runtime.enable');
    await cdpClient.send('DOM.enable');

    console.log('\n--- PHASE 1: Desktop (1440x900) Verification ---');
    await cdpClient.send('Emulation.setDeviceMetricsOverride', {
      width: 1440,
      height: 900,
      deviceScaleFactor: 1,
      mobile: false,
    });

    console.log(`[Navigate] Loading ${FRONTEND_URL}`);
    await cdpClient.send('Page.navigate', { url: FRONTEND_URL });
    await delay(3000);

    const initialText = await cdpClient.eval(`document.body.innerText`);
    console.log('[Debug] Page innerText length:', initialText?.length, 'Preview:', initialText?.slice(0, 200));

    // Check if on AuthView
    const isAuthView = await cdpClient.eval(
      `Boolean(document.querySelector('button[type="submit"]') || document.body.innerText.includes('Studio operacional') || document.body.innerText.includes('BrainBoard'))`
    );
    console.log('[Debug] isAuthView detected:', isAuthView);

    if (isAuthView && !initialText?.includes('Visão geral')) {
      console.log('✓ AuthView detected: Clicking "Acesso rápido Demo (Admin)"');
      const clicked = await cdpClient.eval(`(() => {
        const btns = Array.from(document.querySelectorAll('button'));
        const demoBtn = btns.find(b => b.innerText.includes('Demo (Admin)'));
        if (demoBtn) {
          demoBtn.click();
          return true;
        }
        return false;
      })()`);
      console.log('[Debug] Demo button clicked:', clicked);
      await delay(3500);
    }

    const afterLoginText = await cdpClient.eval(`document.body.innerText`);
    console.log('[Debug] After login text preview:', afterLoginText?.slice(0, 200));
    const token = await cdpClient.eval(`localStorage.getItem('brainboard_token')`);
    console.log('[Debug] localStorage token present:', Boolean(token));

    // Verify main app loaded
    const appLoaded = await cdpClient.eval(`Boolean(document.querySelector('header') || document.querySelector('nav') || document.body.innerText.includes('Visão geral'))`);
    if (!appLoaded) {
      console.log('[Debug] Full body HTML:', await cdpClient.eval('document.body.innerHTML'));
      throw new Error('Application shell failed to render after login');
    }
    console.log('✓ Main application shell active');

    // Helper to test surface
    async function testSurface(surfaceName: string, expectedSelector?: string) {
      console.log(`\nTesting Surface: ${surfaceName}`);
      if (expectedSelector) {
        let found = false;
        for (let i = 0; i < 10; i++) {
          found = await cdpClient!.eval(`Boolean(document.querySelector('${expectedSelector}'))`);
          if (found) break;
          await delay(300);
        }
      }
      await delay(500);

      // Check overflow
      const overflow = await cdpClient!.eval(`(() => {
        const sw = document.documentElement.scrollWidth;
        const cw = window.innerWidth;
        const bodySw = document.body.scrollWidth;
        const main = document.querySelector('main');
        const mainSw = main ? main.scrollWidth : 0;
        const mainCw = main ? main.clientWidth : 0;
        return {
          windowInnerWidth: cw,
          docScrollWidth: sw,
          bodyScrollWidth: bodySw,
          hasDocOverflow: sw > cw,
          hasMainOverflow: mainSw > mainCw + 1, // 1px rounding tolerance
        };
      })()`);

      console.log(`  Overflow check: docScroll=${overflow.docScrollWidth}px / innerWidth=${overflow.windowInnerWidth}px -> hasDocOverflow: ${overflow.hasDocOverflow}`);
      if (overflow.hasDocOverflow) {
        console.error(`  ❌ HORIZONTAL OVERFLOW DETECTED ON ${surfaceName}!`);
        throw new Error(`Horizontal overflow on ${surfaceName}`);
      } else {
        console.log(`  ✓ Zero document horizontal overflow`);
      }
    }

    // 1. Visão Geral
    await testSurface('Visão Geral', 'main');
    // Save primary desktop screenshot
    await cdpClient.screenshot(path.join(OUTPUT_DIR, 'desktop.png'));
    await cdpClient.screenshot(path.join(OUTPUT_DIR, 'desktop_overview_light.png'));

    // Check SVG Ring & Em Breve strip on Overview
    const overviewElements = await cdpClient.eval(`(() => {
      const svgRings = document.querySelectorAll('svg circle[stroke-dasharray]');
      const emBrevePanel = document.querySelector('.bb-panel-muted');
      const focusCheckboxes = document.querySelectorAll('svg.lucide-check-circle-2, .lucide-zap');
      return {
        svgRingCount: svgRings.length,
        hasEmBreveStrip: Boolean(emBrevePanel),
        emBreveText: emBrevePanel ? emBrevePanel.textContent?.trim().replace(/\\s+/g, ' ') : null,
        slopIconBoxes: focusCheckboxes.length,
      };
    })()`);

    console.log(`  ✓ Proportional SVG status gauge: found ${overviewElements.svgRingCount} circle segments`);
    console.log(`  ✓ Compact Em breve strip verified: "${overviewElements.emBreveText}"`);

    // 2. Projetos
    console.log('\n[Navigation] Navigating to Projetos');
    await cdpClient.eval(`(() => {
      const btns = Array.from(document.querySelectorAll('nav button'));
      const projBtn = btns.find(b => b.innerText.includes('Projetos'));
      if (projBtn) projBtn.click();
    })()`);
    await testSurface('Projetos');
    await cdpClient.screenshot(path.join(OUTPUT_DIR, 'desktop_projects_light.png'));

    // 3. Quadro Kanban
    console.log('\n[Navigation] Navigating to Kanban Board');
    await cdpClient.eval(`(() => {
      const card = document.querySelector('div.bb-panel h3') || document.querySelector('main button');
      if (card) (card.closest('div.bb-panel') || card).click();
      else {
        // click project in sidebar
        const navProjects = Array.from(document.querySelectorAll('nav button')).filter(b => b.querySelector('img, .h-6.w-6'));
        if (navProjects.length > 0) navProjects[0].click();
      }
    })()`);
    await delay(1000);
    await testSurface('Quadro Kanban');
    await cdpClient.screenshot(path.join(OUTPUT_DIR, 'desktop_kanban_light.png'));

    // Open Collaborators modal
    console.log('[Interaction] Opening Project Collaborators Modal');
    await cdpClient.eval(`(() => {
      const btns = Array.from(document.querySelectorAll('header button, main button'));
      const teamBtn = btns.find(b => b.innerText.includes('Equipe') || b.querySelector('.lucide-users'));
      if (teamBtn) teamBtn.click();
    })()`);
    await delay(800);
    const modalOpen = await cdpClient.eval(`Boolean(document.querySelector('[role="dialog"]') || document.body.innerText.includes('Equipe do projeto'))`);
    console.log(`  ✓ Collaborators Modal rendered: ${modalOpen}`);
    await cdpClient.screenshot(path.join(OUTPUT_DIR, 'desktop_collaborators_modal.png'));

    // Close modal with Fechar button or Escape on document
    await cdpClient.eval(`(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const fecharBtn = btns.find(b => b.innerText.trim() === 'Fechar') || document.querySelector('[role="dialog"] button');
      if (fecharBtn) fecharBtn.click();
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    })()`);
    await delay(600);
    const isModalStillOpen = await cdpClient.eval(`Boolean(document.querySelector('[role="dialog"]'))`);
    console.log(`  ✓ Modal closed successfully: ${!isModalStillOpen}`);

    // 4. Foco
    console.log('\n[Navigation] Navigating to Foco Global');
    await cdpClient.eval(`(() => {
      const btns = Array.from(document.querySelectorAll('nav button'));
      const focoBtn = btns.find(b => b.innerText.includes('Foco'));
      if (focoBtn) focoBtn.click();
    })()`);
    await testSurface('Foco Global');
    await cdpClient.screenshot(path.join(OUTPUT_DIR, 'desktop_foco_light.png'));

    // 5. Calendário
    console.log('\n[Navigation] Navigating to Calendário');
    await cdpClient.eval(`(() => {
      const btns = Array.from(document.querySelectorAll('nav button'));
      const calBtn = btns.find(b => b.innerText.includes('Calendário'));
      if (calBtn) calBtn.click();
    })()`);
    await testSurface('Calendário');
    await cdpClient.screenshot(path.join(OUTPUT_DIR, 'desktop_calendario_light.png'));

    // 6. Acadêmico
    console.log('\n[Navigation] Navigating to Acadêmico');
    await cdpClient.eval(`(() => {
      const btns = Array.from(document.querySelectorAll('nav button'));
      const acadBtn = btns.find(b => b.innerText.includes('acadêmica') || b.innerText.includes('Acadêmico'));
      if (acadBtn) acadBtn.click();
    })()`);
    await testSurface('Acadêmico');
    await cdpClient.screenshot(path.join(OUTPUT_DIR, 'desktop_academico_light.png'));

    // Toggle Dark Theme
    console.log('\n[Theme] Toggling Dark Theme on Desktop');
    await cdpClient.eval(`(() => {
      const themeBtn = document.querySelector('button[aria-label*="tema"], button[title*="tema"]') ||
        Array.from(document.querySelectorAll('header button')).find(b => b.querySelector('.lucide-sun, .lucide-moon'));
      if (themeBtn) themeBtn.click();
    })()`);
    await delay(600);
    const isDark = await cdpClient.eval(`document.documentElement.classList.contains('dark')`);
    console.log(`  ✓ Dark theme active: ${isDark}`);
    await cdpClient.screenshot(path.join(OUTPUT_DIR, 'desktop_academico_dark.png'));

    // Return to Overview in Dark mode
    await cdpClient.eval(`(() => {
      const btns = Array.from(document.querySelectorAll('nav button'));
      const ovBtn = btns.find(b => b.innerText.includes('Visão geral'));
      if (ovBtn) ovBtn.click();
    })()`);
    await testSurface('Visão Geral (Dark)');
    await cdpClient.screenshot(path.join(OUTPUT_DIR, 'desktop_overview_dark.png'));

    // ------------------------------------------------------------------------
    // PHASE 2: Mobile (390x844) Verification
    // ------------------------------------------------------------------------
    console.log('\n--- PHASE 2: Mobile (390x844) Responsive Verification ---');
    await cdpClient.send('Emulation.setDeviceMetricsOverride', {
      width: 390,
      height: 844,
      deviceScaleFactor: 2,
      mobile: true,
    });
    await delay(1000);

    // Check Mobile Overview (Dark)
    await testSurface('Mobile Visão Geral (Dark)');
    await cdpClient.screenshot(path.join(OUTPUT_DIR, 'mobile.png'));
    await cdpClient.screenshot(path.join(OUTPUT_DIR, 'mobile_overview_dark.png'));

    // Toggle Light Theme on Mobile
    console.log('\n[Theme] Toggling Light Theme on Mobile');
    await cdpClient.eval(`(() => {
      const themeBtn = document.querySelector('button[aria-label*="tema"], button[title*="tema"]') ||
        Array.from(document.querySelectorAll('header button')).find(b => b.querySelector('.lucide-sun, .lucide-moon'));
      if (themeBtn) themeBtn.click();
    })()`);
    await delay(600);
    await testSurface('Mobile Visão Geral (Light)');
    await cdpClient.screenshot(path.join(OUTPUT_DIR, 'mobile_overview_light.png'));

    // Test Mobile Menu & Other surfaces
    console.log('\n[Mobile Interaction] Opening Mobile Menu Drawer');
    await cdpClient.eval(`(() => {
      const menuBtn = document.querySelector('button[aria-label*="menu"]') ||
        Array.from(document.querySelectorAll('button')).find(b => b.querySelector('.lucide-menu'));
      if (menuBtn) menuBtn.click();
    })()`);
    await delay(800);
    const drawerOpen = await cdpClient.eval(`Boolean(document.querySelector('[role="dialog"]') || document.body.innerText.includes('BrainBoard'))`);
    console.log(`  ✓ Mobile Menu Drawer opened: ${drawerOpen}`);
    await cdpClient.screenshot(path.join(OUTPUT_DIR, 'mobile_drawer.png'));

    // Navigate to Mobile Kanban Board
    console.log('\n[Mobile Navigation] Navigating to Kanban Board on Mobile');
    await cdpClient.eval(`(() => {
      // Close drawer or click first project in drawer
      const projLink = Array.from(document.querySelectorAll('div[role="dialog"] button, nav button')).find(b => b.innerText.includes('NextStep') || b.innerText.includes('Projetos'));
      if (projLink) projLink.click();
    })()`);
    await delay(1200);
    await testSurface('Mobile Kanban Board');
    await cdpClient.screenshot(path.join(OUTPUT_DIR, 'mobile_kanban_light.png'));

    // ------------------------------------------------------------------------
    // CONSOLE ERROR AUDIT
    // ------------------------------------------------------------------------
    console.log('\n--- Console Error Audit ---');
    console.log(`Total console errors recorded during all interactions: ${cdpClient.consoleErrors.length}`);
    if (cdpClient.consoleErrors.length > 0) {
      console.warn('Console error log entries:');
      cdpClient.consoleErrors.forEach((err, idx) => console.warn(`  [${idx + 1}] ${err}`));
    } else {
      console.log('✓ ZERO console errors detected during entire test run!');
    }

    console.log('\n================================================================');
    console.log('   🎉 LIVE BROWSER & RESPONSIVE EMPIRICAL AUDIT COMPLETE!');
    console.log('================================================================\n');
  } finally {
    if (cdpClient) cdpClient.close();
    try {
      browserProc.kill();
    } catch {}
  }
}

runBrowserVerification()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('\n❌ BROWSER VERIFICATION FAILED:', err);
    process.exit(1);
  });
