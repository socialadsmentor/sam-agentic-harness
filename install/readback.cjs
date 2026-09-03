#!/usr/bin/env node
'use strict';
// Phase 5 verification, also runnable standalone. Re-reads every manifest file from disk
// and confirms it matches what the installer wrote. A 2xx/"it ran" is never proof; this is.
// Usage: node readback.cjs [--config <dir>]
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { MANIFEST_NAME, sha256File, readManifest, defaultConfigDir, resolveInside } = require('./lib.cjs');

function parseArgs(argv) {
  const args = { config: null };
  for (let i = 0; i < argv.length; i++) if (argv[i] === '--config') args.config = argv[++i];
  return args;
}

// Resolved once per process: try python3, fall back to python. No shell string interpolation.
let _pythonCmd = null;
function pythonCmd() {
  if (_pythonCmd) return _pythonCmd;
  for (const cand of ['python3', 'python']) {
    try {
      execFileSync(cand, ['--version'], { stdio: 'pipe' });
      _pythonCmd = cand;
      return cand;
    } catch (e) { /* try next */ }
  }
  throw new Error('no python3 or python found on PATH');
}

function syntaxCheck(absPath) {
  try {
    if (absPath.endsWith('.json')) {
      JSON.parse(fs.readFileSync(absPath, 'utf8'));
      return null;
    }
    if (absPath.endsWith('.cjs') || absPath.endsWith('.js')) {
      execFileSync(process.execPath, ['--check', absPath], { stdio: 'pipe' });
      return null;
    }
    if (absPath.endsWith('.py')) {
      // readback is a read step: compile to a throwaway temp file so no __pycache__ is left
      // behind (os.devnull is refused by py_compile on Windows: "nul is a non-regular file").
      const inline =
        `import py_compile, sys, os, tempfile; ` +
        `f = tempfile.NamedTemporaryFile(suffix='.pyc', delete=False); f.close(); ` +
        `py_compile.compile(sys.argv[1], cfile=f.name, doraise=True); os.remove(f.name)`;
      execFileSync(pythonCmd(), ['-c', inline, absPath], { stdio: 'pipe' });
      return null;
    }
    return null; // no parser for this extension, presence + hash is the check
  } catch (e) {
    const detail = (e.stderr ? e.stderr.toString() : e.message).trim().split('\n')[0];
    return detail;
  }
}

function readback(configDir) {
  const manifest = readManifest(configDir);
  if (!manifest) return { pass: false, failures: [{ rel: MANIFEST_NAME, reason: 'manifest not found' }] };

  const failures = [];
  const entries = [...manifest.files];
  if (manifest.claudeMd) entries.push({ rel: manifest.claudeMd.path, sha256: manifest.claudeMd.sha256 });

  for (const entry of entries) {
    let abs;
    try {
      abs = resolveInside(configDir, entry.rel);
    } catch (e) {
      failures.push({ rel: entry.rel, reason: e.message });
      continue;
    }
    if (!fs.existsSync(abs)) {
      failures.push({ rel: entry.rel, reason: 'missing' });
      continue;
    }
    const size = fs.statSync(abs).size;
    if (size === 0) {
      failures.push({ rel: entry.rel, reason: 'zero bytes' });
      continue;
    }
    const actualSha = sha256File(abs);
    if (actualSha !== entry.sha256) {
      failures.push({ rel: entry.rel, reason: `sha256 mismatch (expected ${entry.sha256}, got ${actualSha})` });
      continue;
    }
    // self-harness/fixtures/*/bad/ files are DELIBERATELY invalid (they prove a check
    // catches the failure it claims to catch) -- never syntax-check them.
    const isBadFixture = /[\\/]fixtures[\\/][^\\/]+[\\/]bad[\\/]/.test(entry.rel);
    if (isBadFixture) continue;
    const syntaxErr = syntaxCheck(abs);
    if (syntaxErr) {
      failures.push({ rel: entry.rel, reason: `parse error: ${syntaxErr}` });
    }
  }

  return { pass: failures.length === 0, failures, checked: entries.length };
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const configDir = args.config || defaultConfigDir();
  const result = readback(configDir);
  console.log(`Readback: checked ${result.checked || 0} file(s).`);
  for (const f of result.failures) console.log(`  FAIL ${f.rel}: ${f.reason}`);
  console.log(result.pass ? 'PASS' : 'FAIL');
  process.exitCode = result.pass ? 0 : 1;
}

if (require.main === module) main();
module.exports = { readback };
