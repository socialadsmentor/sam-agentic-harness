#!/usr/bin/env node
/**
 * bash-guard.js - PreToolUse(Bash) dangerous-ops blocker
 * Receives tool input via stdin as JSON.
 * Exit 0 = allow. Exit 2 = block.
 *
 * Blocked patterns:
 *   - rm -rf (any variant)
 *   - git push --force / -f to main/master
 *   - wrangler pages secret delete (production secrets)
 *   - DROP TABLE / DROP DATABASE (raw SQL)
 *   - chmod -R 777
 *   - find ... -delete against root paths
 *   - fork bomb :(){ :|: & };:
 */

const BLOCKED = [
  {
    name: 'rm -rf (dangerous recursive delete)',
    test: (cmd) => /\brm\s+(-[^\s]*f[^\s]*r[^\s]*|-[^\s]*r[^\s]*f[^\s]*|--no-preserve-root\s+-rf|-rf\s+--no-preserve-root)\b/i.test(cmd)
      || /\brm\s+((-\S+\s+)*)-rf\b/.test(cmd)
      || /\brm\s+((-\S+\s+)*)-fr\b/.test(cmd)
      || /\brm\s+((-\S+\s+)*)-r\s+-f\b/.test(cmd)
      || /\brm\s+((-\S+\s+)*)-f\s+-r\b/.test(cmd),
  },
  {
    name: 'git push --force to main/master',
    test: (cmd) => /\bgit\s+push\b.*?(--force|-f)\b.*?\b(main|master)\b/i.test(cmd)
      || /\bgit\s+push\b.*?\b(main|master)\b.*?(--force|-f)\b/i.test(cmd),
  },
  {
    name: 'wrangler pages secret delete (production secrets)',
    test: (cmd) => /\bwrangler\s+pages?\s+secret\s+delete\b/i.test(cmd),
  },
  {
    name: 'DROP TABLE or DROP DATABASE (SQL)',
    test: (cmd) => /\bDROP\s+(TABLE|DATABASE)\b/i.test(cmd),
  },
  {
    name: 'chmod -R 777 (world-writable recursive)',
    test: (cmd) => /\bchmod\s+(-[^\s]*R[^\s]*\s+|--recursive\s+)777\b/i.test(cmd)
      || /\bchmod\s+(-[^\s]*r[^\s]*\s+)777\b/i.test(cmd)
      || /\bchmod\s+777\s+(-[^\s]*R[^\s]*\s+)/i.test(cmd),
  },
  {
    name: 'find -delete against root paths',
    test: (cmd) => /\bfind\s+(\/\s|\/tmp\s|\/var\s|\/usr\s|\/etc\s|\/home\s|\/root\s|\/sys\s|\/proc\s)/.test(cmd)
      && /-delete\b/.test(cmd),
  },
  {
    name: 'fork bomb',
    test: (cmd) => /:\(\)\s*\{\s*:\s*\|\s*:\s*&\s*\}\s*;/.test(cmd),
  },
];

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

      // Only intercept Bash tool calls
      if (toolName !== 'Bash') {
        process.exit(0);
      }

      const cmd = (data.tool_input && data.tool_input.command) ? data.tool_input.command : '';

      for (const rule of BLOCKED) {
        if (rule.test(cmd)) {
          process.stderr.write(
            `[bash-guard] BLOCKED: ${rule.name}\n` +
            `Command: ${cmd.slice(0, 200)}\n` +
            `To run this manually, exit Claude Code and execute directly in your terminal.\n`
          );
          process.exit(2);
        }
      }

      process.exit(0);
    } catch (e) {
      // Never block on parse errors
      process.exit(0);
    }
  });
}

main();
