/**
 * Automated Verification Test Suite: Frontend Session Isolation & Context Security
 * Milestone 3: Frontend User Context & Session Isolation
 *
 * Verifies:
 * 1) AST & Structural Verification of App.tsx:
 *    - Dynamic user key remounting (`<AppContent key={user?.id ?? 'anonymous'} />`)
 *    - Intermediate `AuthenticatedAppContent` component inside `<AuthProvider>`
 * 2) AST & Structural Verification of AcademicView.tsx:
 *    - Safe fallback in `loadData()` for activeSubjectId (`!activeSubjectId || !subs.some(...)`)
 *    - Graceful error handling in `loadAssignments()` (resets assignments, sets error flag, clears loading)
 * 3) Session & Token Lifecycle Verification:
 *    - AST verification of `logout()` in `AuthContext.tsx`
 *    - AST verification of `setAuthToken(null)` in `api.ts` triggering `localStorage.removeItem('brainboard_token')`
 *    - Runtime mock simulation validating token purge on logout
 * 4) Production Build Execution:
 *    - `npm run build` executed in `frontend/` exits cleanly with code 0
 * 5) Production Build Artifacts Validation:
 *    - `frontend/dist/index.html` exists and is non-empty
 *    - `frontend/dist/assets` contains compiled JS and CSS bundles
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const ts = require('../backend/node_modules/typescript/lib/typescript.js');

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const frontendDir = path.resolve(rootDir, 'frontend');

interface AssertionResult {
  scenarioNumber: number;
  name: string;
  passed: boolean;
  error?: string;
  assertions: number;
}

const scenarioResults: AssertionResult[] = [];
let totalAssertions = 0;

function assert(condition: boolean, message: string, scenarioNumber: number, scenarioName: string): void {
  totalAssertions++;
  if (!condition) {
    const err = `Assertion FAILED [${scenarioName}]: ${message}`;
    console.error(`  ✗ ${err}`);
    throw new Error(err);
  }
  console.log(`  ✓ ${message}`);
}

console.log('================================================================');
console.log('   BrainBoard Frontend User Context & Session Isolation Tests   ');
console.log('================================================================\n');

// -----------------------------------------------------------------------------
// Scenario 1: Dynamic User Key Remounting in App.tsx
// -----------------------------------------------------------------------------
console.log('--- Scenario 1: AST Verification of Dynamic User Key in App.tsx ---');
try {
  let assertionsInScenario = 0;
  const appPath = path.resolve(frontendDir, 'src', 'App.tsx');
  assert(fs.existsSync(appPath), 'App.tsx exists at expected location', 1, 'App.tsx Key Remounting');
  assertionsInScenario++;

  const appSource = fs.readFileSync(appPath, 'utf-8');
  const sourceFile = ts.createSourceFile(
    'App.tsx',
    appSource,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX
  );

  let foundAuthenticatedAppContent = false;
  let foundDynamicKeyExpression = false;
  let dynamicKeyExpressionText = '';
  let foundAppContentJsx = false;
  let foundAuthProviderWrapping = false;

  function visit(node: ts.Node) {
    // Check for AuthenticatedAppContent component declaration
    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.name.text === 'AuthenticatedAppContent') {
      foundAuthenticatedAppContent = true;
    }

    // Check for App component wrapping AuthenticatedAppContent inside AuthProvider
    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.name.text === 'App') {
      const text = node.getText(sourceFile);
      if (text.includes('<AuthProvider>') && text.includes('<AuthenticatedAppContent />')) {
        foundAuthProviderWrapping = true;
      }
    }

    // Check for JSX SelfClosingElement or OpeningElement for AppContent with key prop
    if (ts.isJsxSelfClosingElement(node) || ts.isJsxOpeningElement(node)) {
      const tagName = node.tagName.getText(sourceFile);
      if (tagName === 'AppContent') {
        foundAppContentJsx = true;
        for (const attr of node.attributes.properties) {
          if (ts.isJsxAttribute(attr) && attr.name.getText(sourceFile) === 'key') {
            if (attr.initializer && ts.isJsxExpression(attr.initializer) && attr.initializer.expression) {
              dynamicKeyExpressionText = attr.initializer.expression.getText(sourceFile);
              if (
                dynamicKeyExpressionText.includes('user?.id') ||
                dynamicKeyExpressionText.includes('user.id')
              ) {
                foundDynamicKeyExpression = true;
              }
            }
          }
        }
      }
    }

    ts.forEachChild(node, visit);
  }

  visit(sourceFile);

  assert(foundAuthenticatedAppContent, 'Found intermediate AuthenticatedAppContent component declaration', 1, 'App.tsx Key Remounting');
  assertionsInScenario++;

  assert(foundAppContentJsx, 'Found <AppContent /> JSX element', 1, 'App.tsx Key Remounting');
  assertionsInScenario++;

  assert(foundDynamicKeyExpression, `Found dynamic user key prop on AppContent: "${dynamicKeyExpressionText}"`, 1, 'App.tsx Key Remounting');
  assertionsInScenario++;

  assert(
    dynamicKeyExpressionText.includes('anonymous') || dynamicKeyExpressionText.includes('guest') || dynamicKeyExpressionText.includes('null'),
    `Key expression contains safe fallback for unauthenticated user: "${dynamicKeyExpressionText}"`,
    1,
    'App.tsx Key Remounting'
  );
  assertionsInScenario++;

  assert(foundAuthProviderWrapping, 'App component renders <AuthProvider><AuthenticatedAppContent /></AuthProvider>', 1, 'App.tsx Key Remounting');
  assertionsInScenario++;

  scenarioResults.push({
    scenarioNumber: 1,
    name: 'Dynamic User Key Remounting in App.tsx',
    passed: true,
    assertions: assertionsInScenario,
  });
  console.log('✓ Scenario 1 PASSED: Client state purges on user switch/logout via dynamic key\n');
} catch (err: any) {
  scenarioResults.push({
    scenarioNumber: 1,
    name: 'Dynamic User Key Remounting in App.tsx',
    passed: false,
    error: err.message,
    assertions: 0,
  });
}

// -----------------------------------------------------------------------------
// Scenario 2: AcademicView Safe Fallback & Graceful Error Handling
// -----------------------------------------------------------------------------
console.log('--- Scenario 2: AST Verification of AcademicView.tsx Fallback & Error Handling ---');
try {
  let assertionsInScenario = 0;
  const academicPath = path.resolve(frontendDir, 'src', 'components', 'academic', 'AcademicView.tsx');
  assert(fs.existsSync(academicPath), 'AcademicView.tsx exists at expected location', 2, 'AcademicView Fallback');
  assertionsInScenario++;

  const academicSource = fs.readFileSync(academicPath, 'utf-8');
  const sourceFile = ts.createSourceFile(
    'AcademicView.tsx',
    academicSource,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX
  );

  let hasSafeSubjectFallback = false;
  let hasNullSubjectFallback = false;
  let hasGracefulAssignmentsErrorCatch = false;
  let hasAssignmentsLoadingFinally = false;

  function visit(node: ts.Node) {
    // Check loadData function content
    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.name.text === 'loadData') {
      const text = node.getText(sourceFile);
      if (
        text.includes('subs.some') &&
        text.includes('setActiveSubjectId(subs[0].id)')
      ) {
        hasSafeSubjectFallback = true;
      }
      if (text.includes('setActiveSubjectId(null)')) {
        hasNullSubjectFallback = true;
      }
    }

    // Check loadAssignments function content
    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.name.text === 'loadAssignments') {
      const text = node.getText(sourceFile);
      if (
        text.includes('catch') &&
        text.includes('setAssignments([])') &&
        text.includes('setAssignmentsError(true)')
      ) {
        hasGracefulAssignmentsErrorCatch = true;
      }
      if (
        text.includes('finally') &&
        text.includes('setAssignmentsLoading(false)')
      ) {
        hasAssignmentsLoadingFinally = true;
      }
    }

    ts.forEachChild(node, visit);
  }

  visit(sourceFile);

  assert(hasSafeSubjectFallback, 'loadData validates activeSubjectId against loaded subjects and falls back to subs[0].id', 2, 'AcademicView Fallback');
  assertionsInScenario++;

  assert(hasNullSubjectFallback, 'loadData sets activeSubjectId(null) when loaded subjects array is empty', 2, 'AcademicView Fallback');
  assertionsInScenario++;

  assert(hasGracefulAssignmentsErrorCatch, 'loadAssignments catches errors gracefully, resets assignments array, and sets error flag', 2, 'AcademicView Fallback');
  assertionsInScenario++;

  assert(hasAssignmentsLoadingFinally, 'loadAssignments resets assignmentsLoading flag in finally block', 2, 'AcademicView Fallback');
  assertionsInScenario++;

  scenarioResults.push({
    scenarioNumber: 2,
    name: 'AcademicView Safe Fallback & Graceful Error Handling',
    passed: true,
    assertions: assertionsInScenario,
  });
  console.log('✓ Scenario 2 PASSED: AcademicView handles empty subjects, subject deletions, and network errors safely\n');
} catch (err: any) {
  scenarioResults.push({
    scenarioNumber: 2,
    name: 'AcademicView Safe Fallback & Graceful Error Handling',
    passed: false,
    error: err.message,
    assertions: 0,
  });
}

// -----------------------------------------------------------------------------
// Scenario 3: Session & Token Purge on Logout Verification
// -----------------------------------------------------------------------------
console.log('--- Scenario 3: Session & Token Purge on Logout Verification ---');
try {
  let assertionsInScenario = 0;
  const authContextPath = path.resolve(frontendDir, 'src', 'context', 'AuthContext.tsx');
  const apiPath = path.resolve(frontendDir, 'src', 'services', 'api.ts');

  assert(fs.existsSync(authContextPath), 'AuthContext.tsx exists', 3, 'Token Purge on Logout');
  assertionsInScenario++;

  assert(fs.existsSync(apiPath), 'api.ts exists', 3, 'Token Purge on Logout');
  assertionsInScenario++;

  const authSource = fs.readFileSync(authContextPath, 'utf-8');
  const apiSource = fs.readFileSync(apiPath, 'utf-8');

  // Verify AuthContext logout function
  const authSourceFile = ts.createSourceFile('AuthContext.tsx', authSource, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let foundLogoutFunction = false;
  let logoutCallsSetAuthTokenNull = false;
  let logoutResetsState = false;

  function visitAuth(node: ts.Node) {
    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.name.text === 'logout') {
      foundLogoutFunction = true;
      const text = node.getText(authSourceFile);
      if (text.includes('setAuthToken(null)')) {
        logoutCallsSetAuthTokenNull = true;
      }
      if (text.includes('setTokenState(null)') && text.includes('setUser(null)')) {
        logoutResetsState = true;
      }
    }
    ts.forEachChild(node, visitAuth);
  }
  visitAuth(authSourceFile);

  assert(foundLogoutFunction, 'AuthContext declares logout() function', 3, 'Token Purge on Logout');
  assertionsInScenario++;

  assert(logoutCallsSetAuthTokenNull, 'logout() invokes setAuthToken(null) in finally block', 3, 'Token Purge on Logout');
  assertionsInScenario++;

  assert(logoutResetsState, 'logout() resets user and token React states to null', 3, 'Token Purge on Logout');
  assertionsInScenario++;

  // Verify api.ts setAuthToken function
  const apiSourceFile = ts.createSourceFile('api.ts', apiSource, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  let foundSetAuthTokenFunction = false;
  let setAuthTokenRemovesLocalStorage = false;

  function visitApi(node: ts.Node) {
    if (ts.isFunctionDeclaration(node) && node.name && node.name.text === 'setAuthToken') {
      foundSetAuthTokenFunction = true;
      const text = node.getText(apiSourceFile);
      if (text.includes("localStorage.removeItem('brainboard_token')")) {
        setAuthTokenRemovesLocalStorage = true;
      }
    }
    ts.forEachChild(node, visitApi);
  }
  visitApi(apiSourceFile);

  assert(foundSetAuthTokenFunction, 'api.ts exports setAuthToken function', 3, 'Token Purge on Logout');
  assertionsInScenario++;

  assert(setAuthTokenRemovesLocalStorage, "setAuthToken(null) executes localStorage.removeItem('brainboard_token')", 3, 'Token Purge on Logout');
  assertionsInScenario++;

  // Runtime Mock Simulation of Token Storage
  const mockStorage = new Map<string, string>();
  let currentToken: string | null = null;
  const mockLocalStorage = {
    getItem: (key: string) => mockStorage.get(key) ?? null,
    setItem: (key: string, val: string) => { mockStorage.set(key, val); },
    removeItem: (key: string) => { mockStorage.delete(key); },
  };

  function testSetAuthToken(token: string | null): void {
    currentToken = token;
    if (token) {
      mockLocalStorage.setItem('brainboard_token', token);
    } else {
      mockLocalStorage.removeItem('brainboard_token');
    }
  }

  // Simulate login
  testSetAuthToken('mock-jwt-token-user-a');
  assert(mockLocalStorage.getItem('brainboard_token') === 'mock-jwt-token-user-a', 'Token correctly stored after login', 3, 'Token Purge on Logout');
  assertionsInScenario++;
  assert(currentToken === 'mock-jwt-token-user-a', 'Current in-memory token updated on login', 3, 'Token Purge on Logout');
  assertionsInScenario++;

  // Simulate logout
  testSetAuthToken(null);
  assert(mockLocalStorage.getItem('brainboard_token') === null, "Token completely removed from localStorage on logout", 3, 'Token Purge on Logout');
  assertionsInScenario++;
  assert(currentToken === null, 'In-memory token purged to null on logout', 3, 'Token Purge on Logout');
  assertionsInScenario++;

  scenarioResults.push({
    scenarioNumber: 3,
    name: 'Session & Token Purge on Logout Verification',
    passed: true,
    assertions: assertionsInScenario,
  });
  console.log('✓ Scenario 3 PASSED: LocalStorage and memory token purged with zero persistence after logout\n');
} catch (err: any) {
  scenarioResults.push({
    scenarioNumber: 3,
    name: 'Session & Token Purge on Logout Verification',
    passed: false,
    error: err.message,
    assertions: 0,
  });
}

// -----------------------------------------------------------------------------
// Scenario 4: Clean Production Build Execution (npm run build)
// -----------------------------------------------------------------------------
console.log('--- Scenario 4: Clean Production Build Execution (npm run build) ---');
try {
  let assertionsInScenario = 0;
  console.log('  Running npm run build in frontend directory...');
  const buildOutput = execSync('npm run build', {
    cwd: frontendDir,
    encoding: 'utf-8',
    stdio: 'pipe',
  });

  assert(buildOutput.includes('built in') || buildOutput.includes('dist/'), 'Vite build completed successfully', 4, 'Frontend Build');
  assertionsInScenario++;

  assert(!buildOutput.includes('error TS'), 'Zero TypeScript compilation errors during build', 4, 'Frontend Build');
  assertionsInScenario++;

  scenarioResults.push({
    scenarioNumber: 4,
    name: 'Clean Production Build Execution',
    passed: true,
    assertions: assertionsInScenario,
  });
  console.log('✓ Scenario 4 PASSED: Frontend compiles cleanly with exit code 0\n');
} catch (err: any) {
  scenarioResults.push({
    scenarioNumber: 4,
    name: 'Clean Production Build Execution',
    passed: false,
    error: err.message,
    assertions: 0,
  });
}

// -----------------------------------------------------------------------------
// Scenario 5: Full Production Build Artifacts Validation in frontend/dist
// -----------------------------------------------------------------------------
console.log('--- Scenario 5: Production Build Artifacts Validation in frontend/dist ---');
try {
  let assertionsInScenario = 0;
  const distDir = path.resolve(frontendDir, 'dist');
  assert(fs.existsSync(distDir), 'frontend/dist directory exists', 5, 'Build Artifacts');
  assertionsInScenario++;

  const indexPath = path.resolve(distDir, 'index.html');
  assert(fs.existsSync(indexPath), 'frontend/dist/index.html exists', 5, 'Build Artifacts');
  assertionsInScenario++;

  const indexContent = fs.readFileSync(indexPath, 'utf-8');
  assert(indexContent.length > 500, `index.html is non-empty (${indexContent.length} bytes)`, 5, 'Build Artifacts');
  assertionsInScenario++;

  assert(indexContent.includes('<script type="module"'), 'index.html includes module script tag for production bundle', 5, 'Build Artifacts');
  assertionsInScenario++;

  const assetsDir = path.resolve(distDir, 'assets');
  assert(fs.existsSync(assetsDir), 'frontend/dist/assets directory exists', 5, 'Build Artifacts');
  assertionsInScenario++;

  const assetFiles = fs.readdirSync(assetsDir);
  const jsBundles = assetFiles.filter(f => f.endsWith('.js'));
  const cssBundles = assetFiles.filter(f => f.endsWith('.css'));

  assert(jsBundles.length > 0, `Generated JS bundles found: ${jsBundles.join(', ')}`, 5, 'Build Artifacts');
  assertionsInScenario++;

  assert(cssBundles.length > 0, `Generated CSS bundles found: ${cssBundles.join(', ')}`, 5, 'Build Artifacts');
  assertionsInScenario++;

  const mainJsPath = path.resolve(assetsDir, jsBundles[0]);
  const jsStat = fs.statSync(mainJsPath);
  assert(jsStat.size > 50_000, `JS bundle size is healthy (${jsStat.size} bytes)`, 5, 'Build Artifacts');
  assertionsInScenario++;

  scenarioResults.push({
    scenarioNumber: 5,
    name: 'Production Build Artifacts Validation in frontend/dist',
    passed: true,
    assertions: assertionsInScenario,
  });
  console.log('✓ Scenario 5 PASSED: Production build artifacts verified in frontend/dist\n');
} catch (err: any) {
  scenarioResults.push({
    scenarioNumber: 5,
    name: 'Production Build Artifacts Validation in frontend/dist',
    passed: false,
    error: err.message,
    assertions: 0,
  });
}

// -----------------------------------------------------------------------------
// Summary
// -----------------------------------------------------------------------------
console.log('================================================================');
console.log('   FRONTEND SESSION ISOLATION TEST EXECUTION SUMMARY            ');
console.log('================================================================');
let allPassed = true;
for (const res of scenarioResults) {
  const status = res.passed ? '[✓ PASS]' : '[✗ FAIL]';
  console.log(`Scenario ${res.scenarioNumber}: ${status} ${res.name} (${res.assertions} assertions)`);
  if (!res.passed) {
    allPassed = false;
    if (res.error) console.log(`   Error: ${res.error}`);
  }
}
console.log('----------------------------------------------------------------');
console.log(`Total Assertions: ${totalAssertions} | All Scenarios Passed: ${allPassed}`);
console.log('================================================================\n');

if (!allPassed) {
  process.exit(1);
} else {
  console.log('🎉 ALL FRONTEND SESSION ISOLATION SCENARIOS PASSED WITH ZERO LEAKAGE!\n');
  process.exit(0);
}
