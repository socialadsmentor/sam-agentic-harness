#!/usr/bin/env node
'use strict';
// Reverses an install using its manifest. Only ever touches a file whose current sha256
// still matches what the installer wrote -- a file the user edited afterward is left alone.
// Usage: node rollback.cjs [--config <dir>]
const fs = require('fs');
const path = require('path');
const { MANIFEST_NAME, MARK_START, MARK_END, sha256File, readManifest, defaultConfigDir, resolveInside } = require('./lib.cjs');

// manifest.backupDir is untrusted (read from JSON); refuse to rmSync it unless it is
// strictly inside configDir. Returns the resolved path, or null if it fails containment.
function safeBackupDir(configDir, backupDir) {
  if (!backupDir) return null;
  let resolved;
  try {
    resolved = resolveInside(configDir, path.relative(configDir, backupDir));
  } catch (e) {
    return null;
  }
  // Must be a direct child of configDir (not a nested path like configDir/skills)
  // and must match the backup-dir naming convention this installer creates --
  // otherwise a crafted manifest could point backupDir at a real subdirectory
  // (e.g. configDir/skills) and rollback would rmSync it.
  if (path.dirname(resolved) !== path.resolve(configDir)) return null;
  if (!/^sam-agentic-harness-backup-\d+$/.test(path.basename(resolved))) return null;
  return resolved;
}

function parseArgs(argv) {
  const args = { config: null };
  for (let i = 0; i < argv.length; i++) if (argv[i] === '--config') args.config = argv[++i];
  return args;
}

function unchangedSinceInstall(absPath, expectedSha) {
  return fs.existsSync(absPath) && sha256File(absPath) === expectedSha;
}

function stripClaudeMdBlock(configDir, claudeMdEntry) {
  let p;
  try {
    p = resolveInside(configDir, claudeMdEntry.path);
  } catch (e) {
    return { skipped: e.message };
  }
  if (!fs.existsSync(p)) return { skipped: 'missing' };
  if (!unchangedSinceInstall(p, claudeMdEntry.sha256)) return { skipped: 'modified since install' };

  if (claudeMdEntry.created) {
    fs.unlinkSync(p);
    return { removed: true };
  }
  const text = fs.readFileSync(p, 'utf8');
  const start = text.indexOf(MARK_START);
  const end = text.indexOf(MARK_END);
  if (start === -1 || end === -1) return { skipped: 'markers not found' };
  const stripped = (text.slice(0, start) + text.slice(end + MARK_END.length)).replace(/\n{3,}/g, '\n\n').trimEnd() + '\n';
  fs.writeFileSync(p, stripped);
  return { blockRemoved: true };
}

function rollback(configDir) {
  const manifest = readManifest(configDir);
  if (!manifest) return { pass: false, error: `no ${MANIFEST_NAME} found at ${configDir}; refusing to guess what to remove` };

  const results = [];
  const safeBackup = safeBackupDir(configDir, manifest.backupDir);
  if (manifest.backupDir && !safeBackup) {
    // manifest.backupDir failed containment/naming validation (see safeBackupDir) --
    // this is not a plain missing-backup case, it is a manifest that does not match
    // what this installer would ever have written. Refuse outright rather than
    // silently falling back to per-file removal against a possibly-crafted manifest.
    return { pass: false, error: `manifest.backupDir "${manifest.backupDir}" failed validation; refusing to roll back` };
  }

  for (const entry of manifest.files) {
    let abs;
    try {
      abs = resolveInside(configDir, entry.rel);
    } catch (e) {
      results.push({ rel: entry.rel, action: `skipped (${e.message})` });
      continue;
    }
    if (!unchangedSinceInstall(abs, entry.sha256)) {
      results.push({ rel: entry.rel, action: 'skipped (modified since install)' });
      continue;
    }
    if (entry.backedUp && safeBackup) {
      // entry.rel is already validated (no absolute path, no ".." segments) by resolveInside
      // above, so joining it under safeBackup (itself validated) cannot escape either dir.
      const backupPath = path.join(safeBackup, entry.rel);
      if (fs.existsSync(backupPath)) {
        fs.copyFileSync(backupPath, abs);
        results.push({ rel: entry.rel, action: 'restored from backup' });
      } else {
        results.push({ rel: entry.rel, action: 'skipped (backup missing)' });
      }
    } else {
      fs.unlinkSync(abs);
      results.push({ rel: entry.rel, action: 'removed' });
    }
  }

  if (manifest.claudeMd) {
    const r = stripClaudeMdBlock(configDir, manifest.claudeMd);
    results.push({ rel: manifest.claudeMd.path, action: r.removed ? 'removed (freshly created)' : r.blockRemoved ? 'block removed' : `skipped (${r.skipped})` });
  }

  if (safeBackup && fs.existsSync(safeBackup)) {
    fs.rmSync(safeBackup, { recursive: true, force: true });
  }
  fs.rmSync(path.join(configDir, MANIFEST_NAME), { force: true });

  return { pass: true, results };
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const configDir = args.config || defaultConfigDir();
  const result = rollback(configDir);
  if (!result.pass) {
    console.error(result.error);
    process.exitCode = 1;
    return;
  }
  for (const r of result.results) console.log(`  ${r.action}: ${r.rel}`);
  console.log('Rollback complete.');
}

if (require.main === module) main();
module.exports = { rollback };
