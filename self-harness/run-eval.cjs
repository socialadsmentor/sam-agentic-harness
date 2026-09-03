#!/usr/bin/env node
// run-eval.cjs - Stage 3 (Proposal Validation) regression eval runner for the
// self-harness loop. See rules/self-harness.rules.md and eval-set.md.
//
// Self-contained: no dependency on any external check library. Each case
// under fixtures/<ID>/ names a checkId (see CHECKS below) plus a good/ and
// bad/ fixture. A case PASSES when the check reports pass=true on good/ and
// pass=false on bad/ -- proving the check can actually tell the two apart,
// not just that it runs without throwing.
//
// The starter eval-set.md ships 3 cases (E1 parse, E2 no-em-dash, E3
// readback-after-write). Add your own cases as your harness accumulates real
// failure modes -- see eval-set.md "Adding a case".
//
// Usage:
//   node run-eval.cjs                 run every case under fixtures/, print table + summary
//   node run-eval.cjs --case E1       run just one case
//   node run-eval.cjs --json          print the result object as JSON
//   node run-eval.cjs --swap E1       negative control: feed E1's bad/ fixture
//                                     through the "good" assertion and vice
//                                     versa, so a correctly wired runner
//                                     reports FAIL. Proves the runner is not
//                                     vacuously green. Does not write results.
//   node run-eval.cjs --results-dir <dir>  write the results JSON there instead
//                                     of the default os.tmpdir()/sam-agentic-harness-eval-results/
//
// Exit code: 0 if every case run this invocation is PASS, 1 otherwise.
"use strict";

const fs = require("fs");
const os = require("os");
const path = require("path");
const { execFileSync } = require("child_process");

const FIXTURES_DIR = path.join(__dirname, "fixtures");

function parseArgs(argv) {
  const out = { case: null, json: false, swap: null, resultsDir: null };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--case") { out.case = argv[i + 1]; i++; }
    else if (a === "--json") { out.json = true; }
    else if (a === "--swap") { out.swap = argv[i + 1]; i++; }
    else if (a === "--results-dir") { out.resultsDir = argv[i + 1]; i++; }
  }
  return out;
}

// Default output lives outside the repo (os.tmpdir()) so a plain `node
// run-eval.cjs` never writes into a shipped/installed copy of this project.
// Pass --results-dir to pin it somewhere else, e.g. for CI artifact capture.
function resultsDirFor(args) {
  return args.resultsDir
    ? path.resolve(args.resultsDir)
    : path.join(os.tmpdir(), "sam-agentic-harness-eval-results");
}

function discoverCases() {
  let entries = [];
  try { entries = fs.readdirSync(FIXTURES_DIR, { withFileTypes: true }); }
  catch (e) { return []; }
  return entries.filter((d) => d.isDirectory()).map((d) => d.name).sort();
}

function loadCaseDef(id) {
  const dir = path.join(FIXTURES_DIR, id);
  const defPath = path.join(dir, "case.json");
  const def = JSON.parse(fs.readFileSync(defPath, "utf8"));
  return { def, dir };
}

// ---------------------------------------------------------------------------
// Checks. Each takes a fixture directory (good/ or bad/) and returns
// { pass, detail }. Deterministic, no LLM judgment.
// ---------------------------------------------------------------------------
const CHECKS = {
  parse_js(fixtureDir, def) {
    const file = path.join(fixtureDir, def.file || "case.js");
    try {
      execFileSync(process.execPath, ["--check", file], { stdio: "pipe" });
      return { pass: true, detail: "parses clean" };
    } catch (e) {
      const stderr = (e.stderr && e.stderr.toString()) || e.message;
      return { pass: false, detail: stderr.split("\n")[0] };
    }
  },
  no_em_dash(fixtureDir, def) {
    const file = path.join(fixtureDir, def.file || "copy.txt");
    const text = fs.readFileSync(file, "utf8");
    const hit = text.indexOf(String.fromCharCode(8212)) !== -1; // 8212 is the em-dash code point
    return { pass: !hit, detail: hit ? "em-dash (U+2014) found" : "no em-dash" };
  },
  readback_after_write(fixtureDir, def) {
    const file = path.join(fixtureDir, def.file || "write.json");
    const data = JSON.parse(fs.readFileSync(file, "utf8"));
    const match = data.requested === data.written_back;
    return {
      pass: match,
      detail: match
        ? `readback "${data.written_back}" matches requested value`
        : `readback "${data.written_back}" does not match requested "${data.requested}"`,
    };
  },
};

function runCheck(checkId, fixtureDir, def) {
  const fn = CHECKS[checkId];
  if (!fn) return { pass: false, detail: `unknown checkId "${checkId}" -- add it to CHECKS in run-eval.cjs` };
  try { return fn(fixtureDir, def); }
  catch (e) { return { pass: false, detail: `check threw: ${e.message}` }; }
}

function runCase(id, swap) {
  const { def, dir } = loadCaseDef(id);
  const goodDir = path.join(dir, swap ? "bad" : "good");
  const badDir = path.join(dir, swap ? "good" : "bad");
  const goodResult = runCheck(def.checkId, goodDir, def);
  const badResult = runCheck(def.checkId, badDir, def);
  // Case passes when the check says pass on the "good" fixture and fail on
  // the "bad" one -- i.e. it can tell them apart, not just that it runs.
  const pass = goodResult.pass === true && badResult.pass === false;
  return {
    id,
    checkId: def.checkId,
    pass,
    swapped: !!swap,
    good: goodResult,
    bad: badResult,
  };
}

function printTable(results) {
  const width = Math.max(...results.map((r) => r.id.length), "Case".length);
  console.log(`${"Case".padEnd(width)} | Check                  | Result`);
  console.log(`${"-".repeat(width)} | ---------------------- | ------`);
  for (const r of results) {
    const status = r.pass ? "PASS" : "FAIL";
    console.log(`${r.id.padEnd(width)} | ${r.checkId.padEnd(22)} | ${status}${r.swapped ? " (swapped)" : ""}`);
    if (!r.pass) {
      console.log(`${" ".repeat(width)}   good: ${r.good.pass} (${r.good.detail})`);
      console.log(`${" ".repeat(width)}   bad:  ${r.bad.pass} (${r.bad.detail})`);
    }
  }
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const swapTarget = args.swap;

  let ids = swapTarget ? [swapTarget] : (args.case ? [args.case] : discoverCases());
  if (ids.length === 0) {
    console.error(`No cases found under ${FIXTURES_DIR}. See eval-set.md.`);
    process.exitCode = 1;
    return;
  }

  const results = ids.map((id) => runCase(id, id === swapTarget && swapTarget));

  if (args.json) {
    console.log(JSON.stringify({ results }, null, 2));
  } else {
    printTable(results);
    const passCount = results.filter((r) => r.pass).length;
    console.log(`\n${passCount}/${results.length} PASS`);
  }

  if (!swapTarget) {
    try {
      const resultsDir = resultsDirFor(args);
      fs.mkdirSync(resultsDir, { recursive: true });
      const stamp = new Date().toISOString().replace(/[:.]/g, "-");
      fs.writeFileSync(path.join(resultsDir, `${stamp}.json`), JSON.stringify({ results }, null, 2));
    } catch (e) {
      console.error(`[run-eval] could not write results file: ${e.message}`);
    }
  }

  process.exitCode = results.every((r) => r.pass) ? 0 : 1;
}

main();
