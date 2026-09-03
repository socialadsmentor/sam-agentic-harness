#!/usr/bin/env node
'use strict';
// Phase 3-5 of harness-install: warning/plan, guarded apply, manifest, readback.
// Usage: node install.cjs [--dry-run | --apply] [--config <dir>] [--out <path>] [--force] [--no-human-confirmed]
// On --apply, the script reads one line from stdin and requires the literal word INSTALL
// before writing anything. --no-human-confirmed is required in addition when stdin is not a
// TTY (piped input), so an automated/agent-driven apply is visible in the command transcript.
const fs = require('fs');
const path = require('path');
const {
  HARNESS_DIRS, MANIFEST_NAME, MARK_START, MARK_END,
  repoRoot, defaultConfigDir, sha256File, walkFiles, canWrite, resolveInside,
} = require('./lib.cjs');
const { readback } = require('./readback.cjs');
const { rollback } = require('./rollback.cjs');

function parseArgs(argv) {
  const args = { apply: false, config: null, out: null, force: false, noHumanConfirmed: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--apply') args.apply = true;
    else if (a === '--dry-run') args.apply = false;
    else if (a === '--config') args.config = argv[++i];
    else if (a === '--out') args.out = argv[++i];
    else if (a === '--force') args.force = true;
    else if (a === '--no-human-confirmed') args.noHumanConfirmed = true;
  }
  return args;
}

// Reads all of stdin synchronously and returns its first line, or null if stdin can't be read.
function readStdinLine() {
  try {
    return fs.readFileSync(0, 'utf8').split(/\r?\n/)[0];
  } catch (e) {
    return null;
  }
}

// Refuses an --out target that already exists (unless --force) or that sits inside configDir.
function validateOutPath(outPath, configDir, force) {
  const resolvedOut = path.resolve(outPath);
  const resolvedConfig = path.resolve(configDir) + path.sep;
  if (resolvedOut.startsWith(resolvedConfig)) {
    throw new Error(`--out must not be inside the config directory (${configDir}): ${outPath}`);
  }
  if (fs.existsSync(resolvedOut) && !force) {
    throw new Error(`--out target already exists: ${outPath}. Pass --force to overwrite.`);
  }
}

const CLAUDE_MD_BLOCK = () => `${MARK_START}
# SAM Agentic Harness

Rules, skills, scripts, and the self-harness loop tooling live under this config directory's
\`rules/\`, \`skills/\`, \`scripts/\`, and \`self-harness/\` (installed by harness-install). Read the
rule files at session start; skills auto-load by description match.
${MARK_END}
`;

function planInstall(configDir) {
  const root = repoRoot();
  const plan = { creates: [], overwrites: [], claudeMd: null };
  for (const d of HARNESS_DIRS) {
    for (const f of walkFiles(path.join(root, d))) {
      const rel = path.join(d, f.rel);
      const dest = resolveInside(configDir, rel);
      const entry = { rel: rel.replace(/\\/g, '/'), src: f.abs, dest };
      if (fs.existsSync(dest)) plan.overwrites.push(entry);
      else plan.creates.push(entry);
    }
  }
  const claudeMdPath = path.join(configDir, 'CLAUDE.md');
  if (fs.existsSync(claudeMdPath)) {
    const current = fs.readFileSync(claudeMdPath, 'utf8');
    plan.claudeMd = { action: current.includes(MARK_START) ? 'already-installed' : 'append', path: claudeMdPath };
  } else {
    plan.claudeMd = { action: 'create', path: claudeMdPath };
  }
  return plan;
}

function printWarning(plan) {
  console.log('\n--- Phase 3: what harness-install would do ---');
  console.log(`Create ${plan.creates.length} new file(s):`);
  for (const e of plan.creates) console.log(`  + ${e.rel}`);
  console.log(`Overwrite ${plan.overwrites.length} existing file(s) (backed up first):`);
  for (const e of plan.overwrites) console.log(`  ~ ${e.rel}`);
  if (plan.claudeMd.action === 'append') console.log('CLAUDE.md: existing file found, an "# SAM Agentic Harness" block will be appended. Nothing else in it is touched.');
  else if (plan.claudeMd.action === 'create') console.log('CLAUDE.md: none found, a thin one will be created.');
  else console.log('CLAUDE.md: SAM Agentic Harness block already present, nothing to do.');
  console.log('settings.json is NEVER modified automatically. No credentials are read or written. Nothing is sent anywhere.');
  console.log('---');
}

function optionalHookSuggestions() {
  const p = path.join(repoRoot(), 'hooks-suggestions.json');
  if (!fs.existsSync(p)) {
    console.log('\nNo hook wiring ships in this build; nothing to add to settings.json.');
    return;
  }
  console.log('\nOptional hook JSON you can add to settings.json by hand:');
  console.log(fs.readFileSync(p, 'utf8'));
}

function applyInstall(configDir, plan) {
  const backupDir = path.join(configDir, `sam-agentic-harness-backup-${Date.now()}`);
  const manifest = { installedAt: new Date().toISOString(), configDir, backupDir: null, files: [], claudeMd: null };
  const toWrite = [...plan.creates, ...plan.overwrites];

  for (const e of toWrite) {
    const backedUp = fs.existsSync(e.dest);
    if (backedUp) {
      const backupPath = path.join(backupDir, e.rel);
      fs.mkdirSync(path.dirname(backupPath), { recursive: true });
      fs.copyFileSync(e.dest, backupPath);
      manifest.backupDir = backupDir;
    }
    fs.mkdirSync(path.dirname(e.dest), { recursive: true });
    fs.copyFileSync(e.src, e.dest);
    manifest.files.push({ rel: e.rel, sha256: sha256File(e.dest), backedUp });
  }

  if (plan.claudeMd.action !== 'already-installed') {
    const p = plan.claudeMd.path;
    const wasCreated = plan.claudeMd.action === 'create';
    if (!wasCreated) {
      const backupPath = path.join(backupDir, 'CLAUDE.md');
      fs.mkdirSync(path.dirname(backupPath), { recursive: true });
      fs.copyFileSync(p, backupPath);
      manifest.backupDir = backupDir;
      fs.appendFileSync(p, `\n${CLAUDE_MD_BLOCK()}`);
    } else {
      fs.writeFileSync(p, `# Project instructions\n\n${CLAUDE_MD_BLOCK()}`);
    }
    manifest.claudeMd = { path: 'CLAUDE.md', sha256: sha256File(p), created: wasCreated };
  }

  fs.writeFileSync(path.join(configDir, MANIFEST_NAME), JSON.stringify(manifest, null, 2));
  return manifest;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const configDir = args.config || defaultConfigDir();
  const plan = planInstall(configDir);
  printWarning(plan);
  optionalHookSuggestions();

  if (!args.apply) {
    const outPath = args.out || path.join(process.cwd(), 'install-plan.json');
    try {
      validateOutPath(outPath, configDir, args.force);
    } catch (e) {
      console.error(`\n${e.message}`);
      process.exitCode = 1;
      return;
    }
    fs.writeFileSync(outPath, JSON.stringify(plan, null, 2));
    console.log(`\nNo files were written into the config directory; plan saved to ${outPath}.`);
    console.log('To apply: re-run with --apply and pipe the literal word INSTALL on stdin (add --no-human-confirmed if scripted/piped).');
    return;
  }

  const stdinLine = readStdinLine();
  if (stdinLine === null || stdinLine.trim() !== 'INSTALL') {
    console.error('\nRefusing to apply: stdin did not contain the literal line "INSTALL". Nothing was written.');
    process.exitCode = 1;
    return;
  }
  if (!process.stdin.isTTY && !args.noHumanConfirmed) {
    console.error('\nRefusing to apply: stdin is not a TTY (piped input). Automation must also pass');
    console.error('--no-human-confirmed so a scripted apply is visible in the command transcript. Nothing was written.');
    process.exitCode = 1;
    return;
  }

  if (!canWrite(configDir)) {
    console.error(`\nRefusing to apply: no write permission at ${configDir}.`);
    process.exitCode = 1;
    return;
  }

  console.log('\n--- Phase 5: install and verify ---');
  const manifest = applyInstall(configDir, plan);
  console.log(`Wrote ${manifest.files.length} file(s)${manifest.claudeMd ? ' + CLAUDE.md' : ''}.`);

  const result = readback(configDir);
  if (!result.pass) {
    console.error('Readback FAILED. Rolling back automatically.');
    for (const f of result.failures) console.error(`  FAIL ${f.rel}: ${f.reason}`);
    rollback(configDir);
    console.error('Rollback complete. Install did not succeed.');
    process.exitCode = 1;
    return;
  }
  console.log('Readback PASSED: every installed file present, nonzero size, sha256 matches, JSON/scripts parse clean.');
  console.log(`Rollback command: node ${path.join(__dirname, 'rollback.cjs')} --config "${configDir}"`);
}

if (require.main === module) main();
module.exports = { planInstall, applyInstall };
