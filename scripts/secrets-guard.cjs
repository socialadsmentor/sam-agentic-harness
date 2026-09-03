#!/usr/bin/env node
/**
 * secrets-guard (PreToolUse: Edit|Write|MultiEdit).
 * Denies direct edits/writes to credential files: .env, .env.<anything>
 * (except .example/.template/.sample), .credentials.json.
 * Bash-based writes are out of scope for v1 (documented limitation).
 * Never throws: any internal error = allow.
 */
const path = require('path');
const fs = require('fs');

function allow() { process.exit(0); }
function deny(reason) {
  process.stdout.write(JSON.stringify({
    hookSpecificOutput: {
      hookEventName: 'PreToolUse',
      permissionDecision: 'deny',
      permissionDecisionReason: reason,
    },
  }));
  process.exit(0);
}

try {
  const input = JSON.parse(fs.readFileSync(0, 'utf8') || '{}');
  const ti = input.tool_input || {};
  const fp = ti.file_path || ti.notebook_path || '';
  if (!fp) allow();
  const base = path.basename(fp).toLowerCase();

  const isEnv = /^\.env(\..+)?$/.test(base) && !/\.(example|template|sample)$/.test(base);
  const isCreds = base === '.credentials.json';

  if (isEnv || isCreds) {
    deny(
      'secrets-guard: "' + base + '" is a credential file and is edit-protected. ' +
      'Do not write secrets or modify credential files directly. If this change is genuinely required and approved, ' +
      'state the approval in your message and perform the edit via an explicitly reviewed flow (or the operator disables this hook for the operation). ' +
      'Reading key NAMES for capability sweeps stays allowed via grep.'
    );
  }
  allow();
} catch {
  allow();
}
