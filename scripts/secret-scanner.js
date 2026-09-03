#!/usr/bin/env node
/**
 * Secret Scanner PreToolUse Hook
 * Scans tool inputs for accidentally leaked credentials before execution.
 * Exit codes: 0=allow, 2=block
 */

const path = require('path');

// Message-send tools (Discord, Slack, email, etc.) also carry outbound secret
// risk, so they're scanned alongside Write/Edit/Bash. This project ships with
// none configured; set SAM_HARNESS_SCANNED_TOOLS (comma-separated tool
// names) to add your own, e.g. "mcp__my_discord__reply,mcp__my_slack__post".
const EXTRA_SCANNED_TOOLS = (process.env.SAM_HARNESS_SCANNED_TOOLS || '')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);

const SECRET_PATTERNS = [
  { name: 'AWS Access Key', pattern: /AKIA[0-9A-Z]{16}/ },
  { name: 'AWS Secret Key', pattern: /(?:aws_secret_access_key|secret_key)\s*[=:]\s*["']?[A-Za-z0-9/+=]{40}["']?/i },
  { name: 'GitHub Token', pattern: /gh[ps]_[0-9a-zA-Z]{36}/ },
  { name: 'GitHub OAuth', pattern: /gho_[0-9a-zA-Z]{36}/ },
  { name: 'Slack Token', pattern: /xox[baprs]-[0-9]{10,13}-[0-9]{10,13}-[a-zA-Z0-9]{20,35}/ },
  { name: 'Stripe Key', pattern: /[sr]k_(live|test)_[0-9a-zA-Z]{24,}/ },
  { name: 'OpenAI Key', pattern: /sk-[a-zA-Z0-9]{20,}T3BlbkFJ[a-zA-Z0-9]{20,}/ },
  { name: 'Anthropic Key', pattern: /sk-ant-[a-zA-Z0-9_-]{80,}/ },
  { name: 'Discord Bot Token', pattern: /[MN][A-Za-z\d]{23,}\.[\w-]{6}\.[\w-]{27,}/ },
  { name: 'Private Key', pattern: /-----BEGIN (RSA |EC |DSA |OPENSSH )?PRIVATE KEY-----/ },
  { name: 'Google API Key', pattern: /AIza[0-9A-Za-z_-]{35}/ },
  { name: 'Twilio Key', pattern: /SK[0-9a-fA-F]{32}/ },
  { name: 'SendGrid Key', pattern: /SG\.[a-zA-Z0-9_-]{22}\.[a-zA-Z0-9_-]{43}/ },
  { name: 'URL Credentials', pattern: /https?:\/\/[a-zA-Z0-9._-]+:[a-zA-Z0-9._-]+@(?!example\.com|localhost)[a-zA-Z0-9._-]+/ },
  { name: 'Generic Secret Assignment', pattern: /(?:api_key|apikey|secret|password|token|credential)\s*[=:]\s*["'][a-zA-Z0-9_\-/+=]{20,}["']/i },
];

// Files that legitimately contain secret references (don't scan). Matched by exact basename,
// never by suffix -- settings.json and access.json were removed from this list because a
// suffix match let any path ending in those names (e.g. a client's private-settings.json)
// bypass scanning entirely.
const SAFE_PATHS = ['.env', '.env.example', 'secret-scanner.js'];
// Directories that legitimately contain pattern-shaped test fixtures. Matched as exact path
// segments (split on / and \), never by substring -- a substring match on '/manifests/' would
// also match an unrelated 'my-manifests-archive/' directory.
const SAFE_DIR_NAMES = ['manifests', 'test-fixtures'];

function pathSegments(filePath) {
  return filePath.split(/[\\/]/).filter(Boolean);
}

function scanForSecrets(text) {
  const findings = [];
  for (const { name, pattern } of SECRET_PATTERNS) {
    if (pattern.test(text)) {
      findings.push(name);
    }
  }
  return findings;
}

function main() {
  let input = '';
  process.stdin.setEncoding('utf8');
  process.stdin.on('data', chunk => { input += chunk; });
  process.stdin.on('end', () => {
    try {
      // Strip UTF-8 BOM if present (PowerShell pipes with BOM)
      const cleaned = input.replace(/^﻿/, '').trim();
      const data = JSON.parse(cleaned);
      const toolName = data.tool_name || '';
      const toolInput = JSON.stringify(data.tool_input || {});

      // Only scan write-type operations
      if (!['Write', 'Edit', 'Bash', ...EXTRA_SCANNED_TOOLS].includes(toolName)) {
        process.exit(0);
      }

      // Skip scanning reads of known safe files / directories
      const filePath = (data.tool_input || {}).file_path || '';
      const baseName = filePath ? path.basename(filePath) : '';
      if (SAFE_PATHS.includes(baseName)) {
        process.exit(0);
      }
      if (filePath && pathSegments(filePath).some(seg => SAFE_DIR_NAMES.includes(seg))) {
        process.exit(0);
      }

      const findings = scanForSecrets(toolInput);
      if (findings.length > 0) {
        process.stderr.write(`SECRET SCANNER: Potential secret detected (${findings.join(', ')}). Review before proceeding.\n`);
        // Exit 2 = block the operation
        process.exit(2);
      }

      process.exit(0);
    } catch {
      // Don't block on parse errors
      process.exit(0);
    }
  });
}

main();
