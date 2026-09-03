<!-- Public edition, adapted from a production agent fleet's rules. Dates generalized; catalysts rewritten generic. -->

# naming.conventions.md

> File names, function names, folder casing. Where things go by name.

## File Organization (top-level)

- NEVER save to root folder  -  use the directories below
- Use `/src` for source code files
- Use `/tests` for test files
- Use `/docs` for documentation and markdown files
- Use `/config` for configuration files
- Use `/scripts` for utility scripts
- Use `/examples` for example code

## Script Encoding

- `.ps1` and `.bat` files written by agents MUST be pure ASCII. Em-dashes and other non-ASCII characters break CP1252 parsing entirely.
- Before shipping any PowerShell script: AST parse-validate it AND run a non-ASCII character scan.

## File Output Rules

- NEVER save working files, text/mds, or tests to the root folder
- ALWAYS save to the directory matching its purpose (src/tests/docs/config/scripts/examples)
- Project markdown docs go in their canonical location per your own doc-organization convention

## Per-Project Scaffold

- Every NEW ongoing project/repo starts with a scaffolding step: a thin CLAUDE.md plus a project-local commands directory.
- Project CLAUDE.md is THIN (15-25 lines): purpose, real commands, a verification row, key paths, a recall pointer (index page + vault note + memory-topic pointers), and project-only rules deltas. NEVER copy global rules into a project file (copy = drift).
- Any task belonging to a project starts by working IN that project's directory so its CLAUDE.md auto-loads.
- Since Claude Code 2.1.246, switching directory mid-session applies that project's settings, hooks, MCP servers, skills and agents immediately (before, only on resume). A relaunch is no longer required to pick up a project scaffold.
- Does NOT apply to: persona-loader architectures with no CLAUDE.md, archives, pure data dumps.
- Catalyst: launching agents from a single unscoped home directory left all memory in one giant unindexed pile; per-project scaffolds make context structural instead of search-based.
- Project CLAUDE.md files NEVER embed counts, version numbers, or point-in-time claims; link to the live source instead. Add a "Last verified" date when touching one.

## Every test and output gets a durable, shareable copy

- Any artifact a human or teammate would READ is not delivered until it exists somewhere durable and
  shareable: test runs and their results, A/B or routing comparisons, reports, audits, scorecards,
  generated deliverables, exported data, verification evidence. A path in a scratch directory or a
  terminal dump is a working note, not a deliverable  -  scrollback disappears.
- **Include the inputs, not just the winner.** A test folder carries the brief, every lane's raw output,
  the gate/verification results, and a README that states the verdict, so the run can be re-read and
  re-judged later.
- **Verify the write** per `verification.rules.md`: list the destination afterwards and confirm the exact
  path exists at nonzero size. A copy command that printed nothing is not proof.
- The scratchpad remains the right place for intermediate working files, and nothing is EVER written to
  the desktop or a bare profile root (rule below).

## NEVER save to Desktop or profile root

- NEVER write ANY file to a desktop folder or a bare home-directory root. Not drafts, not "temporary"
  masters, not screenshots, not PDFs. A desktop, if you have one, is for shortcuts/launchers ONLY.
- Working files go in a project directory. Scratch goes in the session scratchpad. Externally-shared
  deliverables go in whatever shared/durable location your own workflow designates.
- This rule exists because it dropped out of a context-compression pass once, and a real deliverable
  landed on the desktop as a result. Behavior rules that matter belong in the always-loaded ruleset, not
  only in memory that can get compressed away.
