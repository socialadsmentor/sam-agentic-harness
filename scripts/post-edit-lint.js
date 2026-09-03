#!/usr/bin/env node
/**
 * post-edit-lint.js - PostToolUse(Edit/Write) auto-lint hook
 * Receives tool result via stdin as JSON.
 * Runs fast syntax checks on the file that was just written/edited.
 * Exit 0 = all good. Exit 2 = lint failure (shown as system-reminder).
 *
 * Supported:
 *   .js / .cjs / .mjs  -> node --check <file>
 *   .py                -> python -m py_compile <file>
 *   .json              -> python -m json.tool <file>
 *   .html / .css / .md -> skip
 *
 * NOTE: a TypeScript branch (resolving `tsc` out of the edited repo's
 * node_modules and running it) was removed here. Executing a binary that
 * lives inside whatever repo you happen to be editing is an arbitrary-code-
 * execution risk for a hook that runs unattended after every edit -- do not
 * re-add it without sandboxing the resolved path.
 */

const { execFileSync } = require('child_process');
const path = require('path');
const fs = require('fs');

// Resolved once per process: try python3, fall back to python. Same resolver as
// install/readback.cjs -- 'python' alone does not exist on many Linux/macOS installs.
let _pythonCmd = null;
function pythonCmd() {
  if (_pythonCmd) return _pythonCmd;
  for (const cand of ['python3', 'python']) {
    try {
      execFileSync(cand, ['--version'], { stdio: 'pipe' });
      _pythonCmd = cand;
      return _pythonCmd;
    } catch (e) {
      // try next candidate
    }
  }
  throw new Error('no python3 or python found on PATH');
}

function runCheck(filePath) {
  const ext = path.extname(filePath).toLowerCase();

  if (['.js', '.cjs', '.mjs'].includes(ext)) {
    execFileSync(process.execPath, ['--check', filePath], { stdio: 'pipe' });
    return;
  }

  if (ext === '.py') {
    execFileSync(pythonCmd(), ['-m', 'py_compile', filePath], { stdio: 'pipe' });
    return;
  }

  if (ext === '.json') {
    execFileSync(pythonCmd(), ['-m', 'json.tool', filePath], { stdio: ['pipe', 'pipe', 'pipe'] });
    return;
  }

  // .ts / .tsx / .html / .css / .md / other -> skip
}

function main() {
  let input = '';
  process.stdin.setEncoding('utf8');
  process.stdin.on('data', (chunk) => { input += chunk; });
  process.stdin.on('end', () => {
    try {
      // Strip UTF-8 BOM if present (PowerShell pipes with BOM)
      const cleaned = input.replace(/^﻿/, '').trim();
      const data = JSON.parse(cleaned);
      const toolName = data.tool_name || '';

      if (!['Edit', 'Write'].includes(toolName)) {
        process.exit(0);
      }

      // file_path is in tool_input (pre-execution) or tool_result
      const filePath = (data.tool_input && data.tool_input.file_path) || '';
      if (!filePath) {
        process.exit(0);
      }

      if (!fs.existsSync(filePath)) {
        process.exit(0);
      }

      try {
        runCheck(filePath);
        process.exit(0);
      } catch (err) {
        const stderr = (err.stderr && err.stderr.toString()) || '';
        const stdout = (err.stdout && err.stdout.toString()) || '';
        const detail = stderr || stdout || err.message || 'unknown lint error';
        process.stderr.write(
          `[post-edit-lint] Syntax error in ${path.basename(filePath)}:\n${detail.slice(0, 800)}\n` +
          `Fix this file before continuing.\n`
        );
        process.exit(2);
      }
    } catch (e) {
      // Never block on parse errors in the hook itself
      process.exit(0);
    }
  });
}

main();
