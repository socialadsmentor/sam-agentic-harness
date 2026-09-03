#!/usr/bin/env node
'use strict';
// Phase 1 + 2 of harness-install: read-only fit analysis, plain-language report.
// Usage: node fit-analysis.cjs [--config <dir>] [--out <path>]
const fs = require('fs');
const path = require('path');
const os = require('os');
const { execFileSync } = require('child_process');
const { HARNESS_DIRS, repoRoot, defaultConfigDir, walkFiles } = require('./lib.cjs');

const MIN_CLAUDE_VERSION = '2.1.246'; // the rules assume mid-session /cd project switching, introduced in 2.1.246

function parseArgs(argv) {
  const args = { config: null, out: null, force: false };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--config') args.config = argv[++i];
    else if (argv[i] === '--out') args.out = argv[++i];
    else if (argv[i] === '--force') args.force = true;
  }
  return args;
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

function tryRun(cmd, args) {
  try {
    return execFileSync(cmd, args, { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim();
  } catch (e) {
    return null;
  }
}

function versionAtLeast(actual, min) {
  const a = (actual.match(/\d+(\.\d+)*/) || [''])[0].split('.').map(Number);
  const m = min.split('.').map(Number);
  for (let i = 0; i < Math.max(a.length, m.length); i++) {
    const av = a[i] || 0, mv = m[i] || 0;
    if (av > mv) return true;
    if (av < mv) return false;
  }
  return true;
}

function listDirNames(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter((n) => fs.statSync(path.join(dir, n)).isDirectory());
}

function listFileNames(dir, ext) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter((n) => (!ext || n.endsWith(ext)) && fs.statSync(path.join(dir, n)).isFile());
}

function diskFree(dir) {
  try {
    if (typeof fs.statfsSync !== 'function') return null;
    let probe = dir;
    while (!fs.existsSync(probe)) probe = path.dirname(probe);
    const s = fs.statfsSync(probe);
    return Math.round((s.bfree * s.bsize) / (1024 * 1024)); // MB
  } catch (e) {
    return null;
  }
}

function findSiblingConfigTrees(configDir) {
  const home = os.homedir();
  const configBase = path.basename(configDir);
  if (!fs.existsSync(home)) return [];
  return fs
    .readdirSync(home)
    .filter((n) => /^\.claude(-.+)?$/i.test(n) && n !== configBase)
    .filter((n) => {
      try {
        return fs.statSync(path.join(home, n)).isDirectory();
      } catch (e) {
        return false;
      }
    });
}

function readMcpServerNames(configDir) {
  // ~/.claude.json (not the config dir itself) is where Claude Code stores mcpServers.
  const p = path.join(os.homedir(), '.claude.json');
  if (!fs.existsSync(p)) return [];
  try {
    const j = JSON.parse(fs.readFileSync(p, 'utf8'));
    return Object.keys(j.mcpServers || {});
  } catch (e) {
    return [];
  }
}

function readHookEvents(configDir) {
  const p = path.join(configDir, 'settings.json');
  if (!fs.existsSync(p)) return [];
  try {
    const j = JSON.parse(fs.readFileSync(p, 'utf8'));
    return Object.keys(j.hooks || {});
  } catch (e) {
    return [];
  }
}

function collidingFiles(configDir) {
  // Files the installer would write that already exist at the same relative path.
  const root = repoRoot();
  const collisions = [];
  for (const d of HARNESS_DIRS) {
    for (const f of walkFiles(path.join(root, d))) {
      const dest = path.join(configDir, d, f.rel);
      if (fs.existsSync(dest)) collisions.push(path.join(d, f.rel).replace(/\\/g, '/'));
    }
  }
  return collisions;
}

function countPlanned() {
  const root = repoRoot();
  const counts = {};
  for (const d of HARNESS_DIRS) counts[d] = walkFiles(path.join(root, d)).length;
  return counts;
}

function analyze(configDir) {
  const platform = process.platform;
  const shell = process.env.SHELL || process.env.ComSpec || 'unknown';
  const claudeVersionRaw = tryRun('claude', ['--version']);
  const claudeOk = claudeVersionRaw ? versionAtLeast(claudeVersionRaw, MIN_CLAUDE_VERSION) : false;
  const gitVersion = tryRun('git', ['--version']);
  const pythonVersion = tryRun('python3', ['--version']) || tryRun('python', ['--version']);
  const writeOk = require('./lib.cjs').canWrite(configDir);
  const freeMb = diskFree(configDir);

  const report = {
    generatedAt: new Date().toISOString(),
    platform,
    shell,
    targetConfigDir: configDir,
    claudeCli: { version: claudeVersionRaw, meetsMinimum: claudeOk, minimum: MIN_CLAUDE_VERSION },
    git: { present: !!gitVersion, version: gitVersion },
    python: { present: !!pythonVersion, version: pythonVersion },
    node: { present: true, version: process.version },
    writePermission: writeOk,
    freeDiskMb: freeMb,
    existing: {
      claudeMd: fs.existsSync(path.join(configDir, 'CLAUDE.md')),
      rules: listFileNames(path.join(configDir, 'rules'), '.md'),
      skills: listDirNames(path.join(configDir, 'skills')),
      agents: listDirNames(path.join(configDir, 'agents')),
      hookEvents: readHookEvents(configDir),
      mcpServers: readMcpServerNames(configDir),
    },
    siblingConfigTrees: findSiblingConfigTrees(configDir),
    plannedInstall: countPlanned(),
    collisions: collidingFiles(configDir),
  };

  const reasons = [];
  let verdict = 'GOOD FIT';

  if (!claudeVersionRaw) {
    verdict = 'POOR FIT';
    reasons.push('Claude Code CLI was not found on PATH.');
  } else if (!claudeOk) {
    verdict = 'POOR FIT';
    reasons.push(`Claude Code ${claudeVersionRaw} is older than the minimum ${MIN_CLAUDE_VERSION}.`);
  }
  if (!writeOk) {
    verdict = 'POOR FIT';
    reasons.push(`No write permission at ${configDir}.`);
  }
  if (verdict !== 'POOR FIT' && (report.collisions.length > 0 || report.existing.hookEvents.length > 0 || report.siblingConfigTrees.length > 0)) {
    verdict = 'FIT WITH CONFLICTS';
    if (report.collisions.length) reasons.push(`${report.collisions.length} file name(s) already exist at the install destination.`);
    if (report.existing.hookEvents.length) reasons.push(`settings.json already has hooks on: ${report.existing.hookEvents.join(', ')} (harness-install never touches settings.json).`);
    if (report.siblingConfigTrees.length) reasons.push(`Other config trees found: ${report.siblingConfigTrees.join(', ')} (only ${configDir} is targeted).`);
  }
  if (reasons.length === 0) reasons.push('No conflicts detected.');

  report.verdict = verdict;
  report.reasons = reasons;
  return report;
}

function humanReport(r) {
  const lines = [];
  lines.push(`You are on ${r.platform} with Claude Code ${r.claudeCli.version || 'NOT FOUND'}.`);
  lines.push(`Target config directory: ${r.targetConfigDir}`);
  lines.push(
    r.existing.claudeMd
      ? `You already have a CLAUDE.md, ${r.existing.rules.length} rule file(s), and ${r.existing.skills.length} skill(s).`
      : 'No existing CLAUDE.md found; harness-install would create a thin one.'
  );
  lines.push(
    `This would add: ${r.plannedInstall.rules || 0} rule file(s), ${r.plannedInstall.skills || 0} skill file(s), ` +
      `${r.plannedInstall.scripts || 0} script(s), ${r.plannedInstall['self-harness'] || 0} self-harness file(s).`
  );
  if (r.collisions.length) lines.push(`${r.collisions.length} file(s) collide by name and would be backed up before overwrite.`);
  if (r.existing.hookEvents.length) lines.push(`Your settings.json has hooks on: ${r.existing.hookEvents.join(', ')}. harness-install never edits settings.json.`);
  if (r.siblingConfigTrees.length) lines.push(`Other config trees found (not touched): ${r.siblingConfigTrees.join(', ')}.`);
  lines.push(`Git ${r.git.present ? 'found' : 'not found'}. Python ${r.python.present ? 'found' : 'not found'}.`);
  lines.push(`Verdict: ${r.verdict} - ${r.reasons.join(' ')}`);
  return lines.join('\n');
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const configDir = args.config || defaultConfigDir();
  const outPath = args.out || path.join(process.cwd(), 'fit-report.json');
  try {
    validateOutPath(outPath, configDir, args.force);
  } catch (e) {
    console.error(`\n${e.message}`);
    process.exitCode = 1;
    return;
  }
  const report = analyze(configDir);
  fs.writeFileSync(outPath, JSON.stringify(report, null, 2));
  console.log(humanReport(report));
  console.log(`\nFull report written to ${outPath}`);
  process.exitCode = report.verdict === 'POOR FIT' ? 1 : 0;
}

if (require.main === module) main();
module.exports = { analyze, humanReport, versionAtLeast };
