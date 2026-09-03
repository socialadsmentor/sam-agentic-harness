'use strict';
// Shared helpers for the harness-install scripts. Stdlib only, no deps.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const HARNESS_DIRS = ['rules', 'skills', 'scripts', 'self-harness', '.agents'];
const MANIFEST_NAME = 'install-manifest.json';
const MARK_START = '<!-- SAM-HARNESS:START -->';
const MARK_END = '<!-- SAM-HARNESS:END -->';

function repoRoot() {
  // install/ sits at the repo root next to rules/, skills/, scripts/, self-harness/, CLAUDE.md.
  return path.resolve(__dirname, '..');
}

function defaultConfigDir() {
  return process.env.CLAUDE_CONFIG_DIR || path.join(require('os').homedir(), '.claude');
}

function sha256File(p) {
  return crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
}

// Build artifacts and OS cruft: never installable content, skip on sight.
const IGNORE_NAMES = new Set(['__pycache__', '.DS_Store', 'Thumbs.db', 'node_modules']);
const IGNORE_EXT = new Set(['.pyc', '.pyo']);

// Recursively list files under dir as {abs, rel} pairs, rel relative to dir.
function walkFiles(dir, base) {
  base = base || dir;
  const out = [];
  if (!fs.existsSync(dir)) return out;
  for (const name of fs.readdirSync(dir)) {
    if (IGNORE_NAMES.has(name)) continue;
    const abs = path.join(dir, name);
    const stat = fs.statSync(abs);
    if (stat.isDirectory()) {
      out.push(...walkFiles(abs, base));
    } else if (stat.isFile() && !IGNORE_EXT.has(path.extname(name))) {
      out.push({ abs, rel: path.relative(base, abs) });
    }
  }
  return out;
}

function canWrite(dir) {
  // Walk up to the nearest existing ancestor and probe with a throwaway file.
  let probeDir = dir;
  while (!fs.existsSync(probeDir)) {
    const parent = path.dirname(probeDir);
    if (parent === probeDir) break;
    probeDir = parent;
  }
  const probe = path.join(probeDir, `.sam-agentic-harness-write-test-${process.pid}`);
  try {
    fs.mkdirSync(probeDir, { recursive: true });
    fs.writeFileSync(probe, 'x');
    fs.unlinkSync(probe);
    return true;
  } catch (e) {
    return false;
  }
}

function readManifest(configDir) {
  const p = path.join(configDir, MANIFEST_NAME);
  if (!fs.existsSync(p)) return null;
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

// Resolve `rel` against `baseDir` and refuse if the result would land outside baseDir.
// rel is untrusted whenever it came from a manifest/JSON file rather than a real filesystem walk.
function resolveInside(baseDir, rel) {
  if (typeof rel !== 'string' || !rel || path.isAbsolute(rel) || rel.split(/[\\/]/).includes('..')) {
    throw new Error(`unsafe relative path: ${rel}`);
  }
  const base = path.resolve(baseDir) + path.sep;
  const target = path.resolve(baseDir, rel);
  if (!target.startsWith(base)) throw new Error(`path escapes config dir: ${rel}`);
  return target;
}

module.exports = {
  HARNESS_DIRS, MANIFEST_NAME, MARK_START, MARK_END,
  repoRoot, defaultConfigDir, sha256File, walkFiles, canWrite, readManifest, resolveInside,
};
