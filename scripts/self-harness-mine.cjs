#!/usr/bin/env node
function stripBom(x) { return (x && x.charCodeAt && x.charCodeAt(0) === 0xFEFF) ? x.slice(1) : x; }
/**
 * self-harness-mine.cjs  - Stage 1 (Weakness Mining) of the Self-Harness loop.
 * See rules/self-harness.rules.md.
 *
 * Scans your trace store and clusters recurring failure mechanisms by signature,
 * producing a ranked Weakness Report. READ-ONLY. Never edits any harness surface.
 * Output is for human review (Stage 4 gate).
 *
 * Four sources feed the same cluster/signature logic:
 *   1. memory      - local memory .md files matching feedback_-, project_-, reference_-prefixed names
 *   2. shipgate     - logs/ship-gate-state/ship-gate.log.jsonl block/override/unresolved rows (mechanical, deterministic)
 *   3. transcripts  - raw session *.jsonl transcripts, error/retry/stop-block signal density
 *   4. corrections  - self-harness/corrections/corrections.jsonl (human-corrected agent output pairs)
 * A raw-trace or correction incident counts 2x a self-written memory incident in the
 * ranking (primary evidence outranks self-report); shipgate counts 1x.
 *
 * Config (env, all optional):
 *   SAM_HARNESS_TREES         comma-separated config-tree directory names under $HOME,
 *                               e.g. ".claude,.claude-alt" for a multi-seat setup.
 *                               Default: ".claude"
 *   SAM_HARNESS_TRACE_ROOTS   comma-separated extra directories to scan for job/run
 *                               trace logs (<root>/*.log, <root>/*\/*.log). Default: none.
 * Memory directories are discovered per tree by globbing projects/*\/memory, so this
 * runs unmodified against any Claude Code project layout.
 *
 * Usage:
 *   node self-harness-mine.cjs                          # scan all 5 sources, print report
 *   node self-harness-mine.cjs --out <file>              # also write the report to <file>
 *   node self-harness-mine.cjs --min 2                   # only show clusters with weighted score >= N (default 2)
 *   node self-harness-mine.cjs --sources memory,shipgate  # restrict to a subset of sources
 *   node self-harness-mine.cjs --days 14                  # transcript recency window (default 14)
 *   node self-harness-mine.cjs --dry-run                  # print to stdout only, write nothing (ignores --out)
 *   node self-harness-mine.cjs --traces /path/a,/path/b   # add extra trace roots to source 5 (jobs), additive to defaults/env
 */
const fs = require('fs');
const path = require('path');
const readline = require('readline');

const HOME = process.env.HOME || process.env.USERPROFILE;

const TREES = (process.env.SAM_HARNESS_TREES || '.claude')
  .split(',').map(s => s.trim()).filter(Boolean)
  .map(name => path.join(HOME, name));

// Memory directories are discovered, not hardcoded: any projects/*/memory dir under
// each config tree. Matches Claude Code's own per-project memory layout.
function discoverMemDirs() {
  const dirs = [];
  for (const tree of TREES) {
    const projRoot = path.join(tree, 'projects');
    let entries = [];
    try { entries = fs.readdirSync(projRoot, { withFileTypes: true }); } catch (e) { continue; }
    for (const e of entries) {
      if (!e.isDirectory()) continue;
      const memDir = path.join(projRoot, e.name, 'memory');
      if (fs.existsSync(memDir)) dirs.push(memDir);
    }
  }
  return dirs;
}
const MEM_DIRS = discoverMemDirs();

const CORRECTIONS_PATH = path.join(TREES[0], 'self-harness', 'corrections', 'corrections.jsonl');

const args = process.argv.slice(2);
function argVal(flag, dflt) {
  const i = args.indexOf(flag);
  return i >= 0 ? args[i + 1] : dflt;
}
const OUT = args.includes('--out') ? argVal('--out', null) : null;
const MIN = parseInt(argVal('--min', '2'), 10);
const DAYS = parseInt(argVal('--days', '14'), 10);
const DRY_RUN = args.includes('--dry-run');
const SOURCES_RAW = argVal('--sources', 'memory,shipgate,transcripts,corrections,jobs');
const EXTRA_TRACE_ROOTS = (process.env.SAM_HARNESS_TRACE_ROOTS || '')
  .split(',').map(s => s.trim()).filter(Boolean)
  .concat(argVal('--traces', '').split(',').map(s => s.trim()).filter(Boolean));
// normalize the plural CLI token "transcripts" to the singular internal source key "transcript"
const SOURCES = new Set(
  SOURCES_RAW.split(',').map(s => s.trim().toLowerCase()).filter(Boolean)
    .map(s => (s === 'transcripts' ? 'transcript' : s))
);

// Mechanism vocabulary: maps a failure cluster to an editable surface. Extend as your
// harness grows. Grouped: ops/comms, then coding/automation, then research. Each
// cluster -> one editable surface. These classes are the reusable part of the miner;
// none of them name a client, seat, or account.
const MECHANISMS = [
  // --- ops / comms ---
  { key: 'unverified-success', surface: 'verification.rules.md',  terms: ['verify','readback','confirm','unverified','claim success','artifact','no-show proof','play-proof'] },
  { key: 'copy-quality',       surface: 'behavioral.rules.md / copywriting pipeline', terms: ['copy','headline','pipeline','pre-emit','voice','framework','awareness','archetype','em-dash','emdash'] },
  { key: 'memory-rework',      surface: 'memory-first.rules.md',  terms: ['rework','preflight','recall','before asking','duplicate','search memory'] },
  { key: 'chat-routing',       surface: 'chat/notification rules', terms: ['discord','slack','channel','mention','@everyone','tagged','bot token','reply'] },
  { key: 'delivery-format',    surface: 'delivery rules (files vs inline)', terms: ['inline dump','deliverable','full url','not paths','review folder'] },
  // --- coding / automation agents (executor, debugger, devops, backend, automation) ---
  { key: 'deploy-ops',         surface: 'deploy protocol / test.expectations.md', terms: ['deploy','deploy.sh','tarball','exec bit','permission','chmod','cron','healthcheck','stale route','restart','ssh','tunnel','vps','pm2','outage','git archive'] },
  { key: 'mcp-infra',          surface: 'MCP config + diagnosis protocol', terms: ['mcp','oauth','client_id','whitelist','allowfrom','connector','requires restart','config'] },
  { key: 'automation-workflow',surface: 'workflow-automation skills', terms: ['workflow','validate_workflow','webhook','escape sequence','node config','automation','idempotent'] },
  { key: 'script-encoding',    surface: 'naming.conventions / test.expectations', terms: ['ps1','ascii','encoding','pythonioencoding','utf-8','windows path','cp1252','bash','parse error'] },
  { key: 'code-correctness',   surface: 'behavioral.rules.md (anti-hollow-code)', terms: ['hollow','stub','return null','todo','edge case','regression','ast','py_compile','smoke-test','silently'] },
  { key: 'docs-first',         surface: 'docs-first protocol', terms: ['documentation','official docs','sdk','read docs','last resort','custom code','platform-specific'] },
  { key: 'data-sync',          surface: 'dashboard/data-sync skills', terms: ['dashboard','attribution','sync','db bloat','backfill','reconcil'] },
  // --- research agents (explore, deep-research, scientist, analyst) ---
  { key: 'research-grounding', surface: 'behavioral.rules.md (no-guessing/evidence-only)', terms: ['fabricate','evidence','source','citation','stale memory','verify against current','no-guessing','hallucin','assume','guess','tool name','no such tool'] },
  { key: 'test-subject',       surface: 'skill-construction.rules.md', terms: ['test subject','worked example','generic example','brand-grounded'] },
];

function surfaceForKey(key) {
  const m = MECHANISMS.find(x => x.key === key);
  return m ? m.surface : '(needs human triage)';
}

function parseFrontmatter(text) {
  const m = text.match(/^---\n([\s\S]*?)\n---/);
  const fm = { name: '', description: '', type: '', date: '' };
  if (m) {
    const nm = m[1].match(/name:\s*(.+)/);          if (nm) fm.name = nm[1].trim();
    const dm = m[1].match(/description:\s*["']?([\s\S]*?)["']?\n(?:\s*\w|metadata)/);
    if (dm) fm.description = dm[1].replace(/\s+/g, ' ').trim();
    const tm = m[1].match(/type:\s*(\w+)/);          if (tm) fm.type = tm[1].trim();
  }
  const dm = text.match(/(20\d\d-\d\d-\d\d)|(\b20\d\d[-/]\d\d[-/]\d\d)|hardcoded\s+(20\d\d-\d\d-\d\d)/i);
  if (dm) fm.date = dm[0];
  return fm;
}

function classify(blob) {
  const lc = blob.toLowerCase();
  const hits = [];
  for (const mech of MECHANISMS) {
    let score = 0;
    for (const t of mech.terms) if (lc.includes(t)) score++;
    if (score > 0) hits.push({ key: mech.key, surface: mech.surface, score });
  }
  hits.sort((a, b) => b.score - a.score);
  return hits.length ? hits[0] : { key: 'unclustered', surface: '(needs human triage)', score: 0 };
}

// A file is in scope if it is a codified rule (feedback_*) OR it narrates an incident
// (project_/reference_/bare fix-/audit- files whose text shows a failure signature).
const INCIDENT_RE = /\b(fix|bug|repair|broke|broken|fail|failed|gotcha|issue|error|wrong|stale|outage|regression|silently|hardcoded|workaround|disabled|blocked)\b/i;
function inScope(fname, text) {
  if (fname.startsWith('feedback_')) return true;
  if (/^(fix-|.*audit.*|.*deploy.*|.*-fix)/i.test(fname)) return INCIDENT_RE.test(text);
  if (fname.startsWith('project_') || fname.startsWith('reference_')) return INCIDENT_RE.test(text.slice(0, 1200));
  return false;
}

const clusters = {};
function addIncident(key, surface, member) {
  (clusters[key] = clusters[key] || { surface, members: [] }).members.push(member);
}

// ---------------------------------------------------------------------------
// Source 1: memory
// ---------------------------------------------------------------------------
function mineMemory() {
  let scanned = 0, considered = 0;
  for (const dir of MEM_DIRS) {
    let files = [];
    try { files = fs.readdirSync(dir).filter(f => f.endsWith('.md') && f !== 'MEMORY.md'); }
    catch (e) { continue; }
    for (const f of files) {
      const full = path.join(dir, f);
      let text = '';
      try { text = fs.readFileSync(full, 'utf8'); } catch (e) { continue; }
      considered++;
      if (!inScope(f, text)) continue;
      scanned++;
      const fm = parseFrontmatter(text);
      // classify on name + description + first 500 chars of body (incident detail often lives in body)
      const body = text.replace(/^---[\s\S]*?---/, '').slice(0, 500);
      const blob = `${fm.name} ${fm.description} ${body}`;
      const c = classify(blob);
      const kind = f.startsWith('feedback_') ? 'rule' : 'incident';
      addIncident(c.key, c.surface, {
        file: f, dir: path.basename(dir), date: fm.date, kind,
        desc: (fm.description || body).replace(/\s+/g, ' ').slice(0, 140),
        source: 'memory', weight: 1,
      });
    }
  }
  return { scanned, considered };
}

// ---------------------------------------------------------------------------
// Source 2: shipgate - logs/ship-gate-state/ship-gate.log.jsonl per tree.
// Two row shapes seen in the wild:
//   - legacy pipeline-trace-gate shape: results:[{deliverable,trace,pass,failures:[string,...]}]
//   - deterministic-core shape: intents:[{intent,deliverable_type,pass,checks:[{id,pass,issues:[...]}]}]
// decision:"block" / "override" / "unresolved" rows are incidents; "pass" rows are not.
// ---------------------------------------------------------------------------
const SHIPGATE_ID_MAP = [
  { re: /^(no_emdash|forbidden_words|banned_phrases|signoff)$/, key: 'copy-quality' },
  { re: /^api_readback/,  key: 'unverified-success' },
  { re: /^parse_/,        key: 'script-encoding' },
  { re: /^(drive_readback|file_exists)$/, key: 'delivery-format' },
];
function mapShipgateCheckId(rawId) {
  const id = String(rawId || '').toLowerCase().trim();
  for (const m of SHIPGATE_ID_MAP) if (m.re.test(id)) return m.key;
  return 'unclustered'; // unmapped ids surface for triage
}
function bracketTagToId(failureText) {
  const m = String(failureText || '').match(/^\[([A-Z0-9 \-]+)\]/);
  if (!m) return '';
  return m[1].toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
}
function shipgateMember(row, treeName, decision, behavior, mechKey, symptom) {
  return {
    file: `${treeName}/ship-gate.log.jsonl#${row.session || 'n/a'}`,
    dir: treeName,
    date: (row.at || '').slice(0, 10),
    kind: `shipgate-${decision}`,
    desc: `[${decision}] ${behavior} - ${symptom}`.replace(/\s+/g, ' ').slice(0, 180),
    source: 'shipgate', weight: 1,
  };
}
function mineShipgate() {
  let filesFound = 0, rowsScanned = 0, rowsIncident = 0;
  for (const tree of TREES) {
    const logPath = path.join(tree, 'logs', 'ship-gate-state', 'ship-gate.log.jsonl');
    let text;
    try { text = fs.readFileSync(logPath, 'utf8'); } catch (e) { continue; }
    filesFound++;
    const treeName = path.basename(tree);
    const lines = text.split(/\r?\n/).filter(Boolean);
    for (const line of lines) {
      rowsScanned++;
      let row;
      try { row = JSON.parse(stripBom(line)); } catch (e) { continue; }
      const decision = row.decision;
      if (decision !== 'block' && decision !== 'override' && decision !== 'unresolved') continue;
      rowsIncident++;

      const results = Array.isArray(row.results) ? row.results : [];
      const intents = Array.isArray(row.intents) ? row.intents : [];

      for (const r of results) {
        if (r.pass === true) continue;
        const behavior = r.deliverable ? path.basename(r.deliverable) : (row.session || 'unknown');
        const failures = Array.isArray(r.failures) ? r.failures : [];
        if (failures.length === 0) {
          const key = 'unclustered'; // no-detail shipgate rows go to human triage
          addIncident(key, surfaceForKey(key), shipgateMember(row, treeName, decision, behavior, key, '(no failure detail)'));
          continue;
        }
        for (const f of failures) {
          const mech = mapShipgateCheckId(bracketTagToId(f));
          addIncident(mech, surfaceForKey(mech), shipgateMember(row, treeName, decision, behavior, mech, String(f).slice(0, 140)));
        }
      }

      for (const it of intents) {
        if (it.pass === true) continue;
        const intentBase = it.intent ? path.basename(path.dirname(it.intent)) : (row.session || 'unknown');
        const behavior = `${it.deliverable_type || 'deliverable'}:${intentBase}`;
        const checks = Array.isArray(it.checks) ? it.checks : [];
        const failingChecks = checks.filter(c => c && c.pass === false);
        if (failingChecks.length === 0) {
          const key = 'unclustered'; // no-detail shipgate rows go to human triage
          addIncident(key, surfaceForKey(key), shipgateMember(row, treeName, decision, behavior, key, '(no failing check detail)'));
          continue;
        }
        for (const c of failingChecks) {
          const mech = mapShipgateCheckId(c.id);
          const issue = Array.isArray(c.issues) && c.issues[0] ? c.issues[0] : null;
          const symptom = issue ? `${c.id}: ${issue.actual || issue.expected || ''}` : String(c.id || 'check');
          addIncident(mech, surfaceForKey(mech), shipgateMember(row, treeName, decision, behavior, mech, symptom));
        }
      }

      if (results.length === 0 && intents.length === 0) {
        const key = 'unclustered'; // no-detail shipgate rows go to human triage
        addIncident(key, surfaceForKey(key), shipgateMember(row, treeName, decision, row.session || 'unknown', key, `(decision=${decision}, no row detail)`));
      }
    }
  }
  return { filesFound, rowsScanned, rowsIncident };
}

// ---------------------------------------------------------------------------
// Source 3: transcripts - raw session *.jsonl under <tree>/projects/*/*.jsonl.
// Streamed line by line (never loaded whole); files > 20MB are skipped.
// One incident per session that crosses the >=3 error-signal threshold.
// ---------------------------------------------------------------------------
function lineHasToolResult(line) {
  return line.indexOf('"tool_use_id"') !== -1 || line.indexOf('"type":"tool_result"') !== -1;
}
function lineErrorSignal(line) {
  if (line.indexOf('"is_error":true') !== -1) return '"is_error":true';
  if (line.indexOf('"error"') !== -1) return '"error"';
  const pm = line.match(/permission[^"]{0,60}denied/i);
  if (pm) return pm[0];
  if (line.indexOf('No such tool') !== -1) return 'No such tool';
  if (line.indexOf('Prompt is too long') !== -1) return 'Prompt is too long';
  return null;
}
function lineRetrySignal(line) {
  const m = line.match(/I apologize|let me try again|that failed|retry/i);
  return m ? m[0] : null;
}
function lineHasStopBlock(line) {
  return line.indexOf('"hookEvent":"Stop"') !== -1 && line.indexOf('"decision":"block"') !== -1;
}

function listTranscriptFiles(tree, cutoffMs) {
  const projDir = path.join(tree, 'projects');
  let projectDirs = [];
  try { projectDirs = fs.readdirSync(projDir, { withFileTypes: true }).filter(d => d.isDirectory()); }
  catch (e) { return []; }
  const files = [];
  for (const p of projectDirs) {
    const full = path.join(projDir, p.name);
    let entries = [];
    try { entries = fs.readdirSync(full); } catch (e) { continue; }
    for (const e of entries) {
      if (!e.endsWith('.jsonl')) continue;
      const fp = path.join(full, e);
      let st;
      try { st = fs.statSync(fp); } catch (er) { continue; }
      if (st.mtimeMs < cutoffMs) continue;
      files.push({ fp, size: st.size, mtimeMs: st.mtimeMs });
    }
  }
  return files;
}

async function scanTranscriptFile(fp) {
  const counts = { toolError: 0, retry: 0, stopBlock: 0 };
  const evidence = [];
  const rl = readline.createInterface({ input: fs.createReadStream(fp, { encoding: 'utf8' }), crlfDelay: Infinity });
  for await (const line of rl) {
    if (lineHasToolResult(line)) {
      const sig = lineErrorSignal(line);
      if (sig) { counts.toolError++; if (evidence.length < 20) evidence.push(sig); }
    }
    if (line.indexOf('"type":"assistant"') !== -1) {
      const sig = lineRetrySignal(line);
      if (sig) { counts.retry++; if (evidence.length < 20) evidence.push(sig); }
    }
    if (lineHasStopBlock(line)) { counts.stopBlock++; if (evidence.length < 20) evidence.push('stop-block'); }
  }
  return { counts, evidence };
}

async function mineTranscripts() {
  const cutoffMs = Date.now() - DAYS * 86400000;
  const SKIP_BYTES = 20 * 1024 * 1024;
  let filesFound = 0, filesScanned = 0, filesSkippedSize = 0, sessionsIncident = 0;
  for (const tree of TREES) {
    const treeName = path.basename(tree);
    const files = listTranscriptFiles(tree, cutoffMs);
    filesFound += files.length;
    for (const f of files) {
      if (f.size > SKIP_BYTES) { filesSkippedSize++; continue; }
      filesScanned++;
      let result;
      try { result = await scanTranscriptFile(f.fp); } catch (e) { continue; }
      const total = result.counts.toolError + result.counts.retry + result.counts.stopBlock;
      if (total < 3) continue;
      sessionsIncident++;
      const dominant = Object.entries(result.counts).sort((a, b) => b[1] - a[1])[0];
      const blob = result.evidence.join(' ');
      const c = classify(blob);
      addIncident(c.key, c.surface, {
        file: `${treeName}/${path.basename(path.dirname(f.fp))}/${path.basename(f.fp)}`,
        dir: treeName,
        date: new Date(f.mtimeMs).toISOString().slice(0, 10),
        kind: 'transcript-session',
        desc: `session crossed error threshold (${total} signals, dominant ${dominant[0]}:${dominant[1]}) - ${blob.slice(0, 100)}`.replace(/\s+/g, ' ').slice(0, 180),
        source: 'transcript', weight: 2,
      });
    }
  }
  return { filesFound, filesScanned, filesSkippedSize, sessionsIncident };
}

// ---------------------------------------------------------------------------
// Source 4: corrections - self-harness/corrections/corrections.jsonl (primary tree only).
// Missing file = skip silently, note it in the report.
// ---------------------------------------------------------------------------
function mineCorrections() {
  let text;
  try { text = fs.readFileSync(CORRECTIONS_PATH, 'utf8'); }
  catch (e) { return { found: false, rows: 0, incidents: 0 }; }
  const lines = text.split(/\r?\n/).filter(Boolean);
  let incidents = 0;
  for (const line of lines) {
    let row;
    try { row = JSON.parse(stripBom(line)); } catch (e) { continue; }
    const symptom = String(row.correction_text || '').slice(0, 120);
    const behavior = String(row.agent_excerpt || '').slice(0, 120);
    const blob = `${symptom} ${row.cue || ''} ${behavior}`;
    const c = classify(blob);
    addIncident(c.key, c.surface, {
      file: `corrections.jsonl#${row.correction_msg_id || row.agent_msg_id || 'n/a'}`,
      dir: 'corrections',
      date: (row.captured_at || '').slice(0, 10),
      kind: 'correction-pair',
      desc: `correction: "${symptom}" <- agent: "${behavior}"`.replace(/\s+/g, ' ').slice(0, 180),
      source: 'corrections', weight: 2,
    });
    incidents++;
  }
  return { found: true, rows: lines.length, incidents };
}

// ---------------------------------------------------------------------------
// Report
// ---------------------------------------------------------------------------
function buildReport(stats) {
  const ranked = Object.entries(clusters).map(([key, v]) => {
    const raw = v.members.length;
    const weighted = v.members.reduce((s, m) => s + (m.weight || 1), 0);
    const sources = { memory: 0, shipgate: 0, transcript: 0, corrections: 0 };
    for (const m of v.members) { const s = m.source || 'memory'; if (sources[s] !== undefined) sources[s]++; }
    return { key, surface: v.surface, raw, weighted, sources, members: v.members };
  }).sort((a, b) => b.weighted - a.weighted);

  const lines = [];
  lines.push(`# Self-Harness Weakness Report`);
  lines.push(`Generated: ${new Date().toISOString().slice(0, 10)}`);
  lines.push(`Sources enabled: ${Array.from(SOURCES).join(', ')} | days window (transcripts): ${DAYS} | min weighted score: ${MIN}`);
  lines.push('');
  lines.push(`## Source scan stats`);
  if (stats.memory) lines.push(`- memory: ${stats.memory.scanned} in-scope items out of ${stats.memory.considered} memories across ${MEM_DIRS.length} memory dir(s).`);
  if (stats.shipgate) lines.push(`- shipgate: ${stats.shipgate.filesFound} log file(s) found, ${stats.shipgate.rowsScanned} rows scanned, ${stats.shipgate.rowsIncident} block/override/unresolved rows.`);
  if (stats.transcript) lines.push(`- transcripts: ${stats.transcript.filesFound} file(s) in the ${DAYS}-day window, ${stats.transcript.filesScanned} scanned (${stats.transcript.filesSkippedSize} skipped for size), ${stats.transcript.sessionsIncident} sessions crossed the >=3-signal threshold.`);
  if (stats.corrections) {
    lines.push(stats.corrections.found
      ? `- corrections: ${CORRECTIONS_PATH} found, ${stats.corrections.rows} row(s), ${stats.corrections.incidents} incidents.`
      : `- corrections: ${CORRECTIONS_PATH} not found - skipped (no corrections dataset captured yet).`);
  }
  lines.push('');
  lines.push(`## Ranked failure clusters (weighted support x surface)`);
  lines.push('');
  lines.push(`| Cluster | Editable surface | Weighted | Raw | mem/ship/trans/corr | Read |`);
  lines.push(`|---|---|---|---|---|---|`);
  for (const c of ranked) {
    const flag = c.weighted >= MIN ? '**propose**' : 'monitor';
    const s = c.sources;
    lines.push(`| ${c.key} | ${c.surface} | ${c.weighted} | ${c.raw} | ${s.memory}/${s.shipgate}/${s.transcript}/${s.corrections} | ${flag} |`);
  }
  lines.push('');
  lines.push(`## Cluster detail (weighted >= ${MIN})`);
  for (const c of ranked.filter(x => x.weighted >= MIN)) {
    lines.push('');
    lines.push(`### ${c.key}  (${c.raw} incidents, weighted ${c.weighted})  ->  surface: ${c.surface}`);
    lines.push(`Signature: recurring "${c.key}" mechanism. If support is high and the surface is editable,`);
    lines.push(`this is a candidate for a bounded proposal. High counts of ALREADY-FIXED rules here mean`);
    lines.push(`the theme keeps recurring despite point fixes -> consider a stronger structural edit or consolidation.`);
    const s = c.sources;
    lines.push(`Sources: memory:${s.memory}, shipgate:${s.shipgate}, transcript:${s.transcript}, corrections:${s.corrections}${(s.shipgate + s.transcript + s.corrections === 0) ? '  <-- SELF-REPORT ONLY, no primary evidence' : ''}`);
    for (const m of c.members.slice(0, 12)) {
      lines.push(`- [${m.date || 'n/a'}] (${m.kind}) ${m.file} - ${m.desc}`);
    }
    if (c.members.length > 12) lines.push(`- ...and ${c.members.length - 12} more`);
  }
  lines.push('');
  lines.push(`---`);
  if (stats.jobs) lines.push(`- job traces: ${stats.jobs.filesFound} log(s) in window, ${stats.jobs.filesScanned} scanned, ${stats.jobs.incidents} with failure signals.${EXTRA_TRACE_ROOTS.length ? ` (+${EXTRA_TRACE_ROOTS.length} extra trace root(s): ${EXTRA_TRACE_ROOTS.join(', ')})` : ''}`);
  lines.push('');
  lines.push('STAGE-2 REQUIREMENT: before proposing, the proposer MUST open the raw files behind');
  lines.push('each candidate cluster (the pointers above: session .jsonl transcripts, job/gate/deploy');
  lines.push('trace logs) with grep/read - selective, never bulk. Proposals grounded only in this');
  lines.push('summary measurably underperform proposals grounded in the raw traces and should be');
  lines.push('rejected at review.');
  lines.push('');
  lines.push(`Next: pick a cluster, run Stage 2 (propose 2-3 bounded edits), then Stage 3 (regression eval),`);
  lines.push(`then Stage 4 (human approval). See rules/self-harness.rules.md.`);
  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// Source 5: jobs - persistent run traces. Generic per-tree plugin job-log dirs
// (<tree>/plugins/data/*/state/*/jobs), $HOME/projects/*/traces, and any extra
// roots from SAM_HARNESS_TRACE_ROOTS / --traces. Failure lines become incidents
// WITH file pointers so Stage-2 proposers can open the raw trace.
// ---------------------------------------------------------------------------
function listJobLogFiles(cutoffMs) {
  const roots = [];
  for (const tree of TREES) {
    const pluginData = path.join(tree, 'plugins', 'data');
    try {
      for (const plugin of fs.readdirSync(pluginData, { withFileTypes: true })) {
        if (!plugin.isDirectory()) continue;
        const stateDir = path.join(pluginData, plugin.name, 'state');
        try {
          for (const repo of fs.readdirSync(stateDir, { withFileTypes: true })) {
            if (repo.isDirectory()) roots.push(path.join(stateDir, repo.name, 'jobs'));
          }
        } catch (e) { /* no state dir for this plugin */ }
      }
    } catch (e) { /* no plugins/data dir on this tree */ }
  }
  const projRoot = path.join(HOME, 'projects');
  try {
    for (const proj of fs.readdirSync(projRoot, { withFileTypes: true })) {
      if (proj.isDirectory()) roots.push(path.join(projRoot, proj.name, 'traces'));
    }
  } catch (e) { /* no projects dir */ }
  for (const extra of EXTRA_TRACE_ROOTS) roots.push(extra);
  const files = [];
  for (const dir of roots) {
    let entries = [];
    try { entries = fs.readdirSync(dir); } catch (e) { continue; }
    for (const e of entries) {
      if (!e.endsWith('.log')) continue;
      const fp = path.join(dir, e);
      let st;
      try { st = fs.statSync(fp); } catch (er) { continue; }
      if (st.mtimeMs < cutoffMs) continue;
      files.push({ fp, size: st.size, mtimeMs: st.mtimeMs });
    }
  }
  return files;
}

const JOB_FAIL_RE = new RegExp('(GATE FAIL at: .{0,60}|DEPLOY FAIL at: .{0,60}|^FAILED .{0,80}|Traceback [(]most recent call last[)]|psycopg[.]errors[.][A-Za-z]+|Error: .{0,80}|exit status [1-9][0-9]*)');

async function mineJobs() {
  const SKIP_BYTES = 20 * 1024 * 1024;
  const cutoffMs = Date.now() - DAYS * 86400 * 1000;
  const files = listJobLogFiles(cutoffMs);
  let filesScanned = 0, filesSkippedSize = 0, incidents = 0;
  for (const f of files) {
    if (f.size > SKIP_BYTES) { filesSkippedSize++; continue; }
    filesScanned++;
    let text = '';
    try { text = fs.readFileSync(f.fp, 'utf8'); } catch (e) { continue; }
    const hits = [];
    let lineNo = 0;
    for (const line of text.split(String.fromCharCode(10))) {
      lineNo++;
      const m = line.match(JOB_FAIL_RE);
      if (m) { hits.push({ lineNo, sig: m[0].slice(0, 100) }); if (hits.length >= 8) break; }
    }
    if (!hits.length) continue;
    incidents++;
    const blob = hits.map(h => h.sig).join(' ');
    const c = classify(blob);
    addIncident(c.key, c.surface, {
      file: f.fp + ':' + hits[0].lineNo,
      dir: path.basename(path.dirname(f.fp)),
      date: new Date(f.mtimeMs).toISOString().slice(0, 10),
      kind: 'job-trace',
      desc: ('run-trace failures (' + hits.length + ' signals) - ' + blob).replace(new RegExp('[ ' + String.fromCharCode(9) + ']+', 'g'), ' ').slice(0, 180),
      source: 'transcript', weight: 2,
    });
  }
  return { filesFound: files.length, filesScanned, filesSkippedSize, incidents };
}

async function main() {
  const stats = {};
  if (SOURCES.has('memory')) stats.memory = mineMemory();
  if (SOURCES.has('shipgate')) stats.shipgate = mineShipgate();
  if (SOURCES.has('transcript')) stats.transcript = await mineTranscripts();
  if (SOURCES.has('corrections')) stats.corrections = mineCorrections();
  if (SOURCES.has('jobs')) stats.jobs = await mineJobs();

  const report = buildReport(stats);
  console.log(report);
  if (OUT && !DRY_RUN) { fs.writeFileSync(OUT, report); console.error(`\n[written to ${OUT}]`); }
  else if (OUT && DRY_RUN) { console.error(`\n[--dry-run: not writing to ${OUT}]`); }
}

main().catch(e => { console.error(e && e.stack || e); process.exitCode = 1; });
