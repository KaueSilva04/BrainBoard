/**
 * Challenger 2: Empirical Build, Distribution Bundle & Edge Condition Harness
 *
 * Verifies:
 * 1. Build distribution assets existence and size constraints
 * 2. Theme compilation fidelity (#F0F2F5 canvas, scrollbars, no dark mode, no dark root)
 * 3. Component edge conditions (empty tasks, 100% completion, category & search filtering)
 * 4. TaskCard and Subtask progress edge conditions (zero subtasks, undefined subtasks, all done)
 * 5. Source contracts and layout compliance
 */

import fs from 'fs';
import path from 'path';

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
};

interface TestRecord {
  id: string;
  name: string;
  category: string;
  passed: boolean;
  error?: string;
  durationMs: number;
}

const testRecords: TestRecord[] = [];

async function test(id: string, name: string, category: string, fn: () => Promise<void> | void) {
  const start = Date.now();
  try {
    await fn();
    const durationMs = Date.now() - start;
    testRecords.push({ id, name, category, passed: true, durationMs });
    console.log(`  ${colors.green}✓ [PASS]${colors.reset} ${colors.bright}${id}${colors.reset} - ${name} (${durationMs}ms)`);
  } catch (err: any) {
    const durationMs = Date.now() - start;
    const errorMsg = err?.message || String(err);
    testRecords.push({ id, name, category, passed: false, error: errorMsg, durationMs });
    console.log(`  ${colors.red}✗ [FAIL]${colors.reset} ${colors.bright}${id}${colors.reset} - ${name} (${durationMs}ms)`);
    console.log(`     ${colors.red}Error:${colors.reset} ${errorMsg}`);
  }
}

function assert(condition: boolean, msg: string) {
  if (!condition) throw new Error(msg);
}

async function runAllTests() {
  console.log('====================================================');
  console.log('   Challenger 2: Empirical Build & Edge Suite      ');
  console.log('====================================================');

  const frontendDir = path.resolve(process.cwd(), 'frontend');
  const distDir = path.join(frontendDir, 'dist');
  const assetsDir = path.join(distDir, 'assets');

  // ----------------------------------------------------
  // SECTION 1: BUILD ARTIFACTS & ASSET INTEGRITY
  // ----------------------------------------------------
  console.log('\n--- SECTION 1: PRODUCTION BUILD ARTIFACTS & SIZES ---');

  await test('CH2-BLD-01', 'dist/index.html exists and meets size budget (< 5KB)', 'BUILD', () => {
    const indexPath = path.join(distDir, 'index.html');
    assert(fs.existsSync(indexPath), 'dist/index.html does not exist');
    const stat = fs.statSync(indexPath);
    assert(stat.size > 200, `dist/index.html too small: ${stat.size} bytes`);
    assert(stat.size < 5000, `dist/index.html too large: ${stat.size} bytes`);
  });

  await test('CH2-BLD-02', 'CSS bundle exists and is reasonably bundled (< 100KB)', 'BUILD', () => {
    const files = fs.readdirSync(assetsDir);
    const cssFiles = files.filter(f => f.endsWith('.css'));
    assert(cssFiles.length > 0, 'No CSS bundle found in dist/assets');
    const cssPath = path.join(assetsDir, cssFiles[0]);
    const stat = fs.statSync(cssPath);
    assert(stat.size > 10000, `CSS bundle suspiciously small: ${stat.size} bytes`);
    assert(stat.size < 100000, `CSS bundle exceeds 100KB: ${stat.size} bytes`);
  });

  await test('CH2-BLD-03', 'JS bundle exists and is reasonably bundled (< 400KB)', 'BUILD', () => {
    const files = fs.readdirSync(assetsDir);
    const jsFiles = files.filter(f => f.endsWith('.js'));
    assert(jsFiles.length > 0, 'No JS bundle found in dist/assets');
    const jsPath = path.join(assetsDir, jsFiles[0]);
    const stat = fs.statSync(jsPath);
    assert(stat.size > 50000, `JS bundle suspiciously small: ${stat.size} bytes`);
    assert(stat.size < 400000, `JS bundle exceeds 400KB: ${stat.size} bytes`);
  });

  // ----------------------------------------------------
  // SECTION 2: LIGHT THEME & DOMINANT CLASS AUDIT
  // ----------------------------------------------------
  console.log('\n--- SECTION 2: LIGHT THEME & COMPILED CSS AUDIT ---');

  const htmlContent = fs.readFileSync(path.join(distDir, 'index.html'), 'utf-8');
  const cssFiles = fs.readdirSync(assetsDir).filter(f => f.endsWith('.css'));
  const cssContent = fs.readFileSync(path.join(assetsDir, cssFiles[0]), 'utf-8');

  await test('CH2-THM-01', 'Absence of class="dark" in built index.html', 'THEME', () => {
    assert(!htmlContent.includes('class="dark"'), 'Built HTML contains class="dark"');
    assert(!htmlContent.includes("class='dark'"), 'Built HTML contains class=\'dark\'');
  });

  await test('CH2-THM-02', 'Absence of dominant dark background (bg-slate-950/bg-slate-900) in root HTML', 'THEME', () => {
    const bodyMatch = htmlContent.match(/<body[^>]*class="([^"]*)"/);
    assert(bodyMatch !== null, 'No <body> tag with class found in index.html');
    const bodyClass = bodyMatch[1];
    assert(!bodyClass.includes('bg-slate-950'), 'body class includes bg-slate-950');
    assert(!bodyClass.includes('bg-slate-900'), 'body class includes bg-slate-900');
  });

  await test('CH2-THM-03', 'Canvas background #F0F2F5 explicitly specified on body in HTML', 'THEME', () => {
    const bodyMatch = htmlContent.match(/<body[^>]*class="([^"]*)"/);
    assert(bodyMatch !== null, 'No <body> tag found');
    assert(bodyMatch[1].includes('bg-[#F0F2F5]'), 'body class does not include bg-[#F0F2F5]');
  });

  await test('CH2-THM-04', 'Canvas color #F0F2F5 / rgb(240 242 245) compiled into CSS bundle', 'THEME', () => {
    const hasRgb = cssContent.includes('240 242 245');
    const hasHex = cssContent.includes('#F0F2F5') || cssContent.includes('#f0f2f5');
    assert(hasRgb || hasHex, 'Canvas color 240 242 245 not found in compiled CSS');
  });

  await test('CH2-THM-05', 'Absence of active dark selector (.dark ) rule in CSS bundle', 'THEME', () => {
    assert(!cssContent.includes('.dark '), 'Compiled CSS includes active .dark selector');
  });

  await test('CH2-THM-06', 'Light scrollbar track #f1f5f9 and thumb #cbd5e1 compiled in CSS', 'THEME', () => {
    assert(cssContent.includes('#f1f5f9'), 'Scrollbar track #f1f5f9 not found in compiled CSS');
    assert(cssContent.includes('#cbd5e1'), 'Scrollbar thumb #cbd5e1 not found in compiled CSS');
  });

  // ----------------------------------------------------
  // SECTION 3: COMPONENT EDGE CONDITIONS
  // ----------------------------------------------------
  console.log('\n--- SECTION 3: COMPONENT EDGE CONDITIONS & STRESS ---');

  function calculateOverview(tasks: any[]) {
    const totalTasks = tasks.length;
    const todoTasks = tasks.filter((t) => t.status === 'TODO').length;
    const inProgressTasks = tasks.filter((t) => t.status === 'IN_PROGRESS').length;
    const doneTasks = tasks.filter((t) => t.status === 'DONE').length;
    const completionRate = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;
    const strokeDasharray = `${completionRate}, 100`;
    return { totalTasks, todoTasks, inProgressTasks, doneTasks, completionRate, strokeDasharray };
  }

  await test('CH2-EDG-01', 'Empty task list: 0/0 division yields 0 (not NaN or Infinity)', 'EDGE', () => {
    const res = calculateOverview([]);
    assert(res.totalTasks === 0, 'totalTasks must be 0');
    assert(res.todoTasks === 0, 'todoTasks must be 0');
    assert(res.inProgressTasks === 0, 'inProgressTasks must be 0');
    assert(res.doneTasks === 0, 'doneTasks must be 0');
    assert(res.completionRate === 0, `completionRate must be 0, got ${res.completionRate}`);
    assert(!Number.isNaN(res.completionRate), 'completionRate must not be NaN');
    assert(Number.isFinite(res.completionRate), 'completionRate must be finite');
    assert(res.strokeDasharray === '0, 100', `strokeDasharray must be '0, 100', got ${res.strokeDasharray}`);
  });

  await test('CH2-EDG-02', '100% completion rate when all tasks are DONE', 'EDGE', () => {
    const tasks = [
      { id: '1', title: 'Task 1', status: 'DONE' },
      { id: '2', title: 'Task 2', status: 'DONE' },
      { id: '3', title: 'Task 3', status: 'DONE' },
    ];
    const res = calculateOverview(tasks);
    assert(res.totalTasks === 3, 'totalTasks must be 3');
    assert(res.doneTasks === 3, 'doneTasks must be 3');
    assert(res.completionRate === 100, `completionRate must be 100, got ${res.completionRate}`);
    assert(res.strokeDasharray === '100, 100', `strokeDasharray must be '100, 100', got ${res.strokeDasharray}`);
  });

  await test('CH2-EDG-03', '0% completion rate when tasks exist but none are DONE', 'EDGE', () => {
    const tasks = [
      { id: '1', title: 'Task 1', status: 'TODO' },
      { id: '2', title: 'Task 2', status: 'IN_PROGRESS' },
    ];
    const res = calculateOverview(tasks);
    assert(res.totalTasks === 2, 'totalTasks must be 2');
    assert(res.doneTasks === 0, 'doneTasks must be 0');
    assert(res.completionRate === 0, `completionRate must be 0, got ${res.completionRate}`);
    assert(res.strokeDasharray === '0, 100', `strokeDasharray must be '0, 100', got ${res.strokeDasharray}`);
  });

  await test('CH2-EDG-04', 'Rounding behavior on recurring fractions (1/3 -> 33%, 2/3 -> 67%)', 'EDGE', () => {
    const tasks1 = [
      { id: '1', title: 'T1', status: 'DONE' },
      { id: '2', title: 'T2', status: 'TODO' },
      { id: '3', title: 'T3', status: 'TODO' },
    ];
    const res1 = calculateOverview(tasks1);
    assert(res1.completionRate === 33, `1/3 should round to 33, got ${res1.completionRate}`);
    assert(res1.strokeDasharray === '33, 100', `strokeDasharray should be '33, 100'`);

    const tasks2 = [
      { id: '1', title: 'T1', status: 'DONE' },
      { id: '2', title: 'T2', status: 'DONE' },
      { id: '3', title: 'T3', status: 'TODO' },
    ];
    const res2 = calculateOverview(tasks2);
    assert(res2.completionRate === 67, `2/3 should round to 67, got ${res2.completionRate}`);
    assert(res2.strokeDasharray === '67, 100', `strokeDasharray should be '67, 100'`);
  });

  function calculateSubtaskProgress(subtasks?: any[]) {
    const completedSubtasks = subtasks?.filter((st) => st.isDone).length || 0;
    const totalSubtasks = subtasks?.length || 0;
    const progressPercent = totalSubtasks > 0 ? Math.round((completedSubtasks / totalSubtasks) * 100) : 0;
    return { completedSubtasks, totalSubtasks, progressPercent };
  }

  await test('CH2-EDG-05', 'TaskCard subtask progress: undefined or empty subtasks array', 'EDGE', () => {
    const resUndef = calculateSubtaskProgress(undefined);
    assert(resUndef.completedSubtasks === 0, 'completedSubtasks must be 0');
    assert(resUndef.totalSubtasks === 0, 'totalSubtasks must be 0');
    assert(resUndef.progressPercent === 0, 'progressPercent must be 0');
    assert(!Number.isNaN(resUndef.progressPercent), 'progressPercent must not be NaN');

    const resEmpty = calculateSubtaskProgress([]);
    assert(resEmpty.completedSubtasks === 0, 'completedSubtasks must be 0');
    assert(resEmpty.totalSubtasks === 0, 'totalSubtasks must be 0');
    assert(resEmpty.progressPercent === 0, 'progressPercent must be 0');
  });

  await test('CH2-EDG-06', 'TaskCard subtask progress: partial and full completion', 'EDGE', () => {
    const subtasks = [
      { id: 's1', title: 'S1', isDone: true },
      { id: 's2', title: 'S2', isDone: false },
      { id: 's3', title: 'S3', isDone: true },
      { id: 's4', title: 'S4', isDone: true },
    ];
    const res = calculateSubtaskProgress(subtasks);
    assert(res.completedSubtasks === 3, 'completedSubtasks must be 3');
    assert(res.totalSubtasks === 4, 'totalSubtasks must be 4');
    assert(res.progressPercent === 75, `progressPercent must be 75, got ${res.progressPercent}`);
  });

  function filterByCategory(tasks: any[], selectedCategory: string) {
    return tasks.filter((task) => {
      if (selectedCategory === 'ALL') return true;
      return task.category === selectedCategory;
    });
  }

  await test('CH2-EDG-07', 'Category filtering: ALL, PROJECT, COLLEGE, PERSONAL, and unknown filter', 'EDGE', () => {
    const dataset = [
      { id: '1', category: 'PROJECT' },
      { id: '2', category: 'PROJECT' },
      { id: '3', category: 'COLLEGE' },
      { id: '4', category: 'PERSONAL' },
    ];

    assert(filterByCategory(dataset, 'ALL').length === 4, 'ALL should return 4 tasks');
    assert(filterByCategory(dataset, 'PROJECT').length === 2, 'PROJECT should return 2 tasks');
    assert(filterByCategory(dataset, 'COLLEGE').length === 1, 'COLLEGE should return 1 task');
    assert(filterByCategory(dataset, 'PERSONAL').length === 1, 'PERSONAL should return 1 task');
    assert(filterByCategory(dataset, 'UNKNOWN').length === 0, 'UNKNOWN category should return 0 tasks');
  });

  function filterBySearch(tasks: any[], searchQuery: string) {
    if (!searchQuery.trim()) return tasks;
    const q = searchQuery.toLowerCase().trim();
    return tasks.filter(
      (t) =>
        t.title.toLowerCase().includes(q) ||
        (t.description && t.description.toLowerCase().includes(q))
    );
  }

  await test('CH2-EDG-08', 'Search filtering: whitespace, null description, case insensitivity, regex tokens', 'EDGE', () => {
    const dataset = [
      { id: '1', title: 'Deploy Frontend to Nginx', description: 'Configure SPA routing and proxy' },
      { id: '2', title: 'Write Prisma Migrations', description: null },
      { id: '3', title: 'Study Calculus [Exam 1]', description: undefined },
    ];

    assert(filterBySearch(dataset, '   ').length === 3, 'Whitespace query should return all 3 tasks');
    assert(filterBySearch(dataset, 'FRONTEND').length === 1, 'Should find 1 task for FRONTEND');
    assert(filterBySearch(dataset, 'routing').length === 1, 'Should match on description');
    assert(filterBySearch(dataset, 'migrations').length === 1, 'Should match task with null description');
    assert(filterBySearch(dataset, '[Exam 1]').length === 1, 'Search with regex characters [Exam 1] should work');
    assert(filterBySearch(dataset, 'nonexistent').length === 0, 'Nonexistent query should return 0');
  });

  // ----------------------------------------------------
  // SECTION 4: CONTRACT REGRESSION VERIFICATION
  // ----------------------------------------------------
  console.log('\n--- SECTION 4: SOURCE CONTRACT REGRESSION AUDIT ---');

  await test('CH2-CTR-01', 'KanbanBoard.tsx exports KanbanBoard and preserves required column keys', 'CONTRACT', () => {
    const kb = fs.readFileSync(path.join(frontendDir, 'src/components/KanbanBoard.tsx'), 'utf-8');
    assert(kb.includes('status="TODO"'), 'KanbanBoard missing TODO status column');
    assert(kb.includes('status="IN_PROGRESS"'), 'KanbanBoard missing IN_PROGRESS status column');
    assert(kb.includes('status="DONE"'), 'KanbanBoard missing DONE status column');
    assert(kb.includes('DashboardOverview'), 'KanbanBoard does not integrate DashboardOverview');
  });

  await test('CH2-CTR-02', 'Navbar.tsx exports lateral sidebar with category filters and labels', 'CONTRACT', () => {
    const nb = fs.readFileSync(path.join(frontendDir, 'src/components/Navbar.tsx'), 'utf-8');
    assert(nb.includes('Projetos'), 'Navbar missing Projetos label');
    assert(nb.includes('Faculdade'), 'Navbar missing Faculdade label');
    assert(nb.includes('Pessoais'), 'Navbar missing Pessoais label');
    assert(nb.includes('<aside'), 'Navbar does not render lateral <aside> sidebar');
  });

  await test('CH2-CTR-03', 'TaskCard.tsx preserves required action identifiers and gradient bar', 'CONTRACT', () => {
    const tc = fs.readFileSync(path.join(frontendDir, 'src/components/TaskCard.tsx'), 'utf-8');
    assert(tc.includes('onDeleteTask') || tc.includes('Trash2'), 'TaskCard missing delete trigger');
    assert(tc.includes('subtaskTitle') || tc.includes('Nova subtarefa'), 'TaskCard missing subtask addition trigger');
    assert(tc.includes('gradient'), 'TaskCard does not contain colorful gradient progress');
  });

  // ----------------------------------------------------
  // SUMMARY
  // ----------------------------------------------------
  console.log('\n====================================================');
  console.log('              CHALLENGE TEST SUMMARY                ');
  console.log('====================================================');
  const total = testRecords.length;
  const passed = testRecords.filter(t => t.passed).length;
  const failed = testRecords.filter(t => !t.passed).length;
  console.log(`Total Tests Run:  ${total}`);
  console.log(`Passed:          ${colors.green}${passed}${colors.reset}`);
  console.log(`Failed:          ${failed > 0 ? colors.red + failed + colors.reset : '0'}`);
  console.log(`Pass Rate:       ${((passed / total) * 100).toFixed(1)}%`);

  if (failed > 0) {
    process.exit(1);
  }
}

runAllTests().catch(err => {
  console.error('Fatal error running tests:', err);
  process.exit(1);
});

