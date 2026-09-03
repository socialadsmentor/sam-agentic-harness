#!/usr/bin/env node
"use strict";

/**
 * session-selftest / scripts/selftest.cjs
 *
 * Mode A health check for a Claude Code harness install. Zero external
 * dependencies. Windows-aware (spawns claude.exe / schtasks.exe directly, no
 * shell, so paths with spaces are never mangled).
 *
 * Config is entirely env-driven so this runs against any config tree,
 * single- or multi-seat:
 *   SAM_HARNESS_TREES         comma-separated config-tree directory names
 *                               under $HOME, e.g. ".claude,.claude-alt" for
 *                               a multi-seat setup. Default: ".claude"
 *   SAM_HARNESS_MEMORY_CAP    byte budget for each discovered MEMORY.md
 *                               index file. Default: 25000
 *   SAM_HARNESS_PLUGIN_CHECK  a "plugin@marketplace" id to verify is
 *                               enabled via `claude plugin list`. Default:
 *                               unset -- the check is skipped (OK) when unset.
 *   SAM_HARNESS_TASK_PATTERN  case-insensitive regex matched against
 *                               scheduled-task names to decide which ones
 *                               this check cares about. Default: unset --
 *                               the check is skipped (OK) when unset.
 *
 * Seven checks, each reported OK / WARN / FAIL with one-line evidence:
 *   1. Configured plugin enabled (claude plugin list), if SAM_HARNESS_PLUGIN_CHECK is set
 *   2. Memory-index byte budgets (each discovered projects/*\/memory/MEMORY.md vs the cap)
 *   3. Harness lint (retired-term grep across rules/*.md + skills/*\/SKILL.md files)
 *   4. Stray files in each tree's rules/ dir
 *   5. Scheduled-task health (schtasks /query), if SAM_HARNESS_TASK_PATTERN is set
 *   6. Config-tree sync drift (rules/*.md hash-compared across every configured tree)
 *   7. Provider-tier context-window pins, if scripts/checks/tier_env_ctx_window.cjs exists
 *      in the primary tree (that check module ships separately; this simply
 *      wires it in when present, per verification.rules.md's smoke-test rule).
 *
 * Exit code: 0 if no FAIL rows, 1 if any FAIL row (so it can gate CI/cron).
 */

const fs = require("fs");
const path = require("path");
const os = require("os");
const crypto = require("crypto");
const { execFileSync } = require("child_process");

const HOME = os.homedir();
const TREE_NAMES = (process.env.SAM_HARNESS_TREES || ".claude").split(",").map((s) => s.trim()).filter(Boolean);
const TREES = {};
for (const name of TREE_NAMES) TREES[name] = path.join(HOME, name);
const PRIMARY_TREE_NAME = TREE_NAMES[0];

const MEMORY_CAP_BYTES = parseInt(process.env.SAM_HARNESS_MEMORY_CAP || "25000", 10);
const MEMORY_WARN_RATIO = 0.9;
const RETIRED_TERMS_FILE = path.join(__dirname, "..", "reference", "retired-terms.txt");
const EXCLUSION_WORDS = ["tombstone", "retired", "archived", "deprecated", "removed", "redacted", "folded"];
const PLUGIN_CHECK = process.env.SAM_HARNESS_PLUGIN_CHECK || "";
const TASK_PATTERN = process.env.SAM_HARNESS_TASK_PATTERN || "";

function discoverMemoryFiles() {
  const files = [];
  for (const [treeName, treeRoot] of Object.entries(TREES)) {
    const projRoot = path.join(treeRoot, "projects");
    let entries = [];
    try { entries = fs.readdirSync(projRoot, { withFileTypes: true }); } catch (e) { continue; }
    for (const e of entries) {
      if (!e.isDirectory()) continue;
      const mem = path.join(projRoot, e.name, "memory", "MEMORY.md");
      if (fs.existsSync(mem)) files.push({ file: mem, tree: treeName });
    }
  }
  return files;
}
const MEMORY_FILES = discoverMemoryFiles();

const rows = []; // {check, status, evidence}

function addRow(check, status, evidence) {
  rows.push({ check, status, evidence });
}

function safeRun(cmd, args, opts) {
  try {
    const out = execFileSync(cmd, args, {
      encoding: "utf8",
      timeout: 20000,
      maxBuffer: 20 * 1024 * 1024,
      windowsHide: true,
      ...opts,
    });
    return { ok: true, out };
  } catch (err) {
    return { ok: false, err };
  }
}

function listFiles(dir, filterFn) {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((d) => d.isFile())
    .map((d) => d.name)
    .filter(filterFn || (() => true));
}

// ---------- Check 1: configured plugin ----------
function checkConfiguredPlugin() {
  if (!PLUGIN_CHECK) {
    addRow("Configured plugin", "OK", "SAM_HARNESS_PLUGIN_CHECK not set -- skipped.");
    return;
  }
  const result = safeRun("claude", ["plugin", "list"]);
  if (!result.ok) {
    const msg = result.err && result.err.code === "ENOENT"
      ? "`claude` not found on PATH -- cannot auto-verify. Run `claude plugin list` manually."
      : `\`claude plugin list\` failed (${(result.err && result.err.message || "unknown error").split("\n")[0]}) -- verify manually.`;
    addRow("Configured plugin", "WARN", msg);
    return;
  }
  const out = result.out;
  const idx = out.indexOf(PLUGIN_CHECK);
  if (idx === -1) {
    addRow("Configured plugin", "FAIL", `${PLUGIN_CHECK} not found in \`claude plugin list\` output -- plugin not installed.`);
    return;
  }
  const tail = out.slice(idx, idx + 300);
  const statusMatch = tail.match(/Status:\s*(.+)/);
  if (!statusMatch) {
    addRow("Configured plugin", "WARN", `Found ${PLUGIN_CHECK} but could not parse its Status line -- verify manually.`);
    return;
  }
  const status = statusMatch[1].trim();
  if (/disabled/i.test(status)) {
    addRow("Configured plugin", "FAIL", `${PLUGIN_CHECK} is DISABLED. A disabled plugin fails silently for anything routed through it. Run: claude plugin enable ${PLUGIN_CHECK}, then relaunch.`);
    return;
  }
  addRow("Configured plugin", "OK", `${PLUGIN_CHECK} Status: ${status}`);
}

// ---------- Check 2: Memory-index byte budgets ----------
function checkMemoryBudgets() {
  if (MEMORY_FILES.length === 0) {
    addRow("Memory budget", "WARN", "No projects/*/memory/MEMORY.md found under any configured tree.");
    return;
  }
  for (const { file, tree } of MEMORY_FILES) {
    const size = fs.statSync(file).size;
    const ratio = size / MEMORY_CAP_BYTES;
    const evidence = `${size} bytes / ${MEMORY_CAP_BYTES} cap (${(ratio * 100).toFixed(1)}%) -- ${file}`;
    const label = `Memory budget (${tree})`;
    if (size > MEMORY_CAP_BYTES) addRow(label, "FAIL", evidence);
    else if (ratio >= MEMORY_WARN_RATIO) addRow(label, "WARN", evidence);
    else addRow(label, "OK", evidence);
  }
}

// ---------- Check 3: Harness lint (retired terms) ----------
function loadRetiredTerms() {
  if (!fs.existsSync(RETIRED_TERMS_FILE)) return [];
  return fs
    .readFileSync(RETIRED_TERMS_FILE, "utf8")
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith("#"));
}

function lineHasExclusion(line) {
  const lower = line.toLowerCase();
  return EXCLUSION_WORDS.some((w) => lower.includes(w));
}

function scanFileForRetiredTerms(filePath, terms) {
  const hits = [];
  let text;
  try {
    text = fs.readFileSync(filePath, "utf8");
  } catch (e) {
    process.stderr.write(`[session-selftest] WARN: could not read ${filePath}: ${e.message}\n`);
    return hits;
  }
  const lines = text.split(/\r?\n/);
  lines.forEach((line, i) => {
    const lower = line.toLowerCase();
    for (const term of terms) {
      if (lower.includes(term.toLowerCase())) {
        if (!lineHasExclusion(line)) {
          hits.push({ file: filePath, lineNo: i + 1, snippet: line.trim().slice(0, 160), term });
        }
        break; // one hit per line is enough
      }
    }
  });
  return hits;
}

function findSkillFiles(skillsDir) {
  if (!fs.existsSync(skillsDir)) return [];
  const out = [];
  for (const entry of fs.readdirSync(skillsDir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    if (entry.name.startsWith("_archive")) continue;
    const skillMd = path.join(skillsDir, entry.name, "SKILL.md");
    if (fs.existsSync(skillMd)) out.push(skillMd);
  }
  return out;
}

function checkHarnessLint() {
  const terms = loadRetiredTerms();
  if (terms.length === 0) {
    addRow("Harness lint", "WARN", `No retired terms loaded from ${RETIRED_TERMS_FILE}.`);
    return;
  }
  const primaryTree = TREES[PRIMARY_TREE_NAME];
  const rulesDir = path.join(primaryTree, "rules");
  const rulesFiles = listFiles(rulesDir, (n) => n.toLowerCase().endsWith(".md")).map((n) => path.join(rulesDir, n));
  const skillsDir = path.join(primaryTree, "skills");
  const skillFiles = findSkillFiles(skillsDir);

  const allHits = [];
  for (const f of [...rulesFiles, ...skillFiles]) {
    allHits.push(...scanFileForRetiredTerms(f, terms));
  }

  if (allHits.length === 0) {
    addRow("Harness lint", "OK", `Scanned ${rulesFiles.length} rules files + ${skillFiles.length} SKILL.md files, 0 retired-term hits.`);
    return;
  }
  const preview = allHits
    .slice(0, 8)
    .map((h) => `${path.relative(primaryTree, h.file)}:${h.lineNo} [${h.term}] "${h.snippet}"`)
    .join(" | ");
  const more = allHits.length > 8 ? ` (+${allHits.length - 8} more)` : "";
  addRow("Harness lint", "WARN", `${allHits.length} hit(s): ${preview}${more}`);
}

// ---------- Check 4: Stray files in rules dirs ----------
function checkStrayRulesFiles() {
  const strays = [];
  for (const [treeName, treeRoot] of Object.entries(TREES)) {
    const rulesDir = path.join(treeRoot, "rules");
    if (!fs.existsSync(rulesDir)) continue;
    for (const name of listFiles(rulesDir)) {
      const isMd = /\.md$/i.test(name);
      const isBak = /\.bak/i.test(name);
      if (!isMd || isBak) {
        strays.push(`${treeName}/rules/${name}`);
      }
    }
  }
  if (strays.length === 0) {
    addRow("Stray rules files", "OK", `No stray or .bak files in any of the ${TREE_NAMES.length} rules/ dir(s).`);
  } else {
    addRow("Stray rules files", "WARN", strays.join(", "));
  }
}

// ---------- Check 5: Scheduled-task health ----------
function parseCsv(text) {
  // Minimal CSV parser handling quoted fields with embedded commas (schtasks /fo csv output).
  const rows = [];
  const lines = text.split(/\r?\n/).filter((l) => l.length > 0);
  for (const line of lines) {
    const fields = [];
    let cur = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (inQuotes) {
        if (c === '"') {
          if (line[i + 1] === '"') {
            cur += '"';
            i++;
          } else {
            inQuotes = false;
          }
        } else {
          cur += c;
        }
      } else {
        if (c === '"') {
          inQuotes = true;
        } else if (c === ",") {
          fields.push(cur);
          cur = "";
        } else {
          cur += c;
        }
      }
    }
    fields.push(cur);
    rows.push(fields);
  }
  return rows;
}

function checkScheduledTasks() {
  if (!TASK_PATTERN) {
    addRow("Scheduled tasks", "OK", "SAM_HARNESS_TASK_PATTERN not set -- skipped.");
    return;
  }
  const result = safeRun("schtasks", ["/query", "/fo", "csv", "/v"]);
  if (!result.ok) {
    addRow("Scheduled tasks", "WARN", `\`schtasks /query\` failed (${(result.err && result.err.message || "unknown").split("\n")[0]}) -- verify manually via Task Scheduler.`);
    return;
  }
  const table = parseCsv(result.out);
  if (table.length < 2) {
    addRow("Scheduled tasks", "WARN", "schtasks returned no rows to parse.");
    return;
  }
  const header = table[0].map((h) => h.trim());
  const idx = (name) => header.indexOf(name);
  const nameIdx = idx("TaskName");
  const statusIdx = idx("Status");
  const lastResultIdx = idx("Last Result");
  if (nameIdx === -1 || statusIdx === -1 || lastResultIdx === -1) {
    addRow("Scheduled tasks", "WARN", `Unexpected schtasks CSV header (missing TaskName/Status/Last Result columns): ${header.join("|")}`);
    return;
  }

  let taskRe;
  try { taskRe = new RegExp(TASK_PATTERN, "i"); }
  catch (e) { addRow("Scheduled tasks", "WARN", `SAM_HARNESS_TASK_PATTERN is not a valid regex: ${e.message}`); return; }

  const relevant = table.slice(1).filter((r) => taskRe.test(r[nameIdx] || ""));
  if (relevant.length === 0) {
    addRow("Scheduled tasks", "WARN", `No scheduled tasks matched SAM_HARNESS_TASK_PATTERN (${TASK_PATTERN}) -- confirm this machine still owns the expected jobs.`);
    return;
  }

  const failures = [];
  for (const r of relevant) {
    const name = (r[nameIdx] || "").trim();
    const status = (r[statusIdx] || "").trim();
    const lastResult = (r[lastResultIdx] || "").trim();
    const disabled = /disabled/i.test(status);
    if (disabled) continue; // a disabled task is a deliberate state this generic check does not second-guess
    // Enabled: nonzero Last Result (and not N/A / blank) is a failure.
    if (lastResult && lastResult !== "N/A" && lastResult !== "0") {
      failures.push(`${name} (Last Result=${lastResult}, Status=${status})`);
    }
  }

  if (failures.length > 0) {
    addRow("Scheduled tasks", "FAIL", `${failures.length} task problem(s): ${failures.join(", ")}`);
  } else {
    addRow("Scheduled tasks", "OK", `${relevant.length} matching task(s) scanned, all enabled tasks show Last Result=0.`);
  }
}

// ---------- Check 6: Config-tree sync drift ----------
function sha256(filePath) {
  const buf = fs.readFileSync(filePath);
  return crypto.createHash("sha256").update(buf).digest("hex");
}

function checkConfigDrift() {
  if (TREE_NAMES.length < 2) {
    addRow("Config-tree drift", "OK", "Only one configured tree -- nothing to compare.");
    return;
  }
  const primaryTree = TREES[PRIMARY_TREE_NAME];
  const primaryRules = path.join(primaryTree, "rules");
  if (!fs.existsSync(primaryRules)) {
    addRow("Config-tree drift", "WARN", `Primary rules dir not found at ${primaryRules}.`);
    return;
  }
  const files = listFiles(primaryRules, (n) => n.toLowerCase().endsWith(".md"));
  const diffs = [];
  for (const name of files) {
    const primaryHash = sha256(path.join(primaryRules, name));
    for (const [treeName, treeRoot] of Object.entries(TREES)) {
      if (treeName === PRIMARY_TREE_NAME) continue;
      const otherPath = path.join(treeRoot, "rules", name);
      if (!fs.existsSync(otherPath)) {
        diffs.push(`${name} missing in ${treeName}`);
        continue;
      }
      const otherHash = sha256(otherPath);
      if (otherHash !== primaryHash) {
        diffs.push(`${name} differs in ${treeName}`);
      }
    }
  }
  if (diffs.length === 0) {
    addRow("Config-tree drift", "OK", `${files.length} rules files byte-identical across ${TREE_NAMES.join(" / ")}.`);
  } else {
    addRow("Config-tree drift", "WARN", diffs.join(", "));
  }
}

// ---------- Check 7: Provider tier context-window pins ----------
function checkTierEnvCtxWindow() {
  const primaryTree = TREES[PRIMARY_TREE_NAME];
  const checkPath = path.join(primaryTree, "scripts", "checks", "tier_env_ctx_window.cjs");
  if (!fs.existsSync(checkPath)) {
    addRow("Provider tier ctx window", "OK", `Check module not found at ${checkPath} -- not part of this install, skipped.`);
    return;
  }
  let mod;
  try {
    mod = require(checkPath);
  } catch (e) {
    addRow("Provider tier ctx window", "WARN", `Could not load ${checkPath}: ${e.message}`);
    return;
  }
  const result = mod.run({ tiers: [2, 3, 4] });
  if (result.pass) {
    addRow("Provider tier ctx window", "OK", "Tiers 2-4: no silent context-window mismatch.");
    return;
  }
  const preview = result.issues
    .slice(0, 5)
    .map((iss) => `${iss.locator} [${iss.rule}]: ${iss.actual}`)
    .join(" | ");
  const more = result.issues.length > 5 ? ` (+${result.issues.length - 5} more)` : "";
  const anyScriptError = result.issues.some((iss) => iss.rule === "script_error");
  addRow("Provider tier ctx window", anyScriptError ? "WARN" : "FAIL", `${preview}${more}`);
}

// ---------- Report ----------
function statusIcon(status) {
  return status === "OK" ? "OK" : status === "WARN" ? "WARN" : "FAIL";
}

function printReport() {
  const width1 = Math.max(...rows.map((r) => r.check.length), "Check".length);
  const width2 = 5; // OK/WARN/FAIL
  console.log(`session-selftest - Mode A health check`);
  console.log(`Run at: ${new Date().toISOString()}`);
  console.log("");
  console.log(`${"Check".padEnd(width1)} | Status | Evidence`);
  console.log(`${"-".repeat(width1)} | ------ | --------`);
  for (const r of rows) {
    console.log(`${r.check.padEnd(width1)} | ${statusIcon(r.status).padEnd(width2)} | ${r.evidence}`);
  }
  const counts = { OK: 0, WARN: 0, FAIL: 0 };
  rows.forEach((r) => counts[r.status]++);
  console.log("");
  console.log(`Summary: ${counts.OK} OK, ${counts.WARN} WARN, ${counts.FAIL} FAIL`);
  return counts.FAIL === 0 ? 0 : 1;
}

function main() {
  checkConfiguredPlugin();
  checkMemoryBudgets();
  checkHarnessLint();
  checkStrayRulesFiles();
  checkScheduledTasks();
  checkConfigDrift();
  checkTierEnvCtxWindow();
  const exitCode = printReport();
  process.exitCode = exitCode;
}

main();
