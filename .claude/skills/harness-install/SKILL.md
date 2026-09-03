---
name: harness-install
description: >
  Installs this repo's rules, skills, scripts, and self-harness loop tooling into a Claude
  Code config directory. Read-only fit analysis first, then a plain-language report, then an
  explicit list of every file it would add or change, then a human types INSTALL to confirm.
  Never deletes, never touches settings.json or hooks, always leaves a rollback path. Triggers
  on: "install harness-install", "install this", "set up sam-agentic-harness", "/harness-install".
---

# harness-install

Five phases, in this order, every time. It stops at any phase that fails and never guesses
past a missing confirmation or a missing manifest.

## Phase 1: fit analysis (read only)

Run the fit-analysis script against the target config directory (default `~/.claude`, or
`CLAUDE_CONFIG_DIR` if set, or an explicit path the user names):

```
node install/fit-analysis.cjs --config <dir> --out ./fit-report.json
```

This only reads. It does not write into the config directory. It detects OS and shell, the
installed Claude Code version, git/python/node presence, write permission, free disk space,
what already exists (`CLAUDE.md`, `rules/`, `skills/`, `agents/`, `settings.json` hooks,
registered MCP server names), any sibling config trees, and every file name that would
collide with what this repo would install. `--out` refuses to overwrite an existing report
file; pass `--force` to regenerate it on a re-run.

## Phase 2: plain-language report

Present the human-readable report the script printed, not a raw JSON dump. It already reads
like: "You are on Windows with Claude Code 2.1.251. You already have a CLAUDE.md and 12
skills. This adds N rule files, M skills, hooks: none touched automatically. Verdict: GOOD
FIT." The verdict is one of GOOD FIT, FIT WITH CONFLICTS, or POOR FIT, each with its reason
in one sentence.

**POOR FIT stops here.** Do not continue to Phase 3. Tell the user why (Claude Code too old,
no write permission, CLI not found) and stop.

## Phase 3: explicit warning

Run the installer in dry-run mode (the default, so this is just `install.cjs` with no
`--apply` flag):

```
node install/install.cjs --config <dir> --out ./install-plan.json
```

Present its output as-is: every file it would create, every file it would overwrite (each
one backed up first, listed by name), what happens to `CLAUDE.md` (append a marked block,
create a thin one, or nothing if already installed), and the standing guarantees: nothing in
`settings.json` is ever touched automatically, no credentials are read or written, and the
installer itself never makes a network call. If the optional hook-suggestion JSON exists in
the repo, show it as something the user can add BY HAND; harness-install never wires it in for
them. `--out` refuses to overwrite an existing report or plan file; pass `--force` to
regenerate it on a re-run.

## Phase 4: typed confirmation

Ask the user to type the word `INSTALL`, in full caps, exactly, and nothing else. A "yes," a
thumbs up, "go ahead," or an agent inferring consent from context does not count. The script
itself enforces this: on `--apply` it reads one line from stdin and only proceeds if that line
is the literal word `INSTALL`. If the user types anything else, stay in Phase 3 (they can ask
questions, then you re-present the plan) or stop if they decline.

## Phase 5: install and verify

Only after the literal `INSTALL`, pipe it to the script on stdin. Since this is Claude Code
running the command, not the human typing directly into the terminal, stdin is piped rather
than a TTY, so `--no-human-confirmed` is also required (it makes the scripted apply visible in
the transcript; it does not weaken the check, which is still the literal `INSTALL` line):

```
echo INSTALL | node install/install.cjs --apply --no-human-confirmed --config <dir>
```

This copies the files, merges the `CLAUDE.md` block, writes `install-manifest.json`, and then
runs its own readback (every file present, nonzero size, sha256 matches, JSON parses,
`.cjs`/`.js` pass `node --check`, `.py` pass `py_compile`). A readback failure triggers an
automatic rollback inside the same command; nothing installed stays half-applied.

Report the result plainly: what was installed, and the exact rollback command to run later:

```
node install/rollback.cjs --config <dir>
```

## Dry run is the default

Running `install.cjs` with no flags, or `--dry-run`, only ever executes Phases 1-3 and writes
the plan to a file. This is also the correct mode when an agent runs the installer with no
human present to type `INSTALL`. Never pass `--apply` with a piped `INSTALL` line unless a
real human typed that word in the transcript immediately before it; the script itself refuses
the literal check, but nothing stops an agent from piping the word without one.

## Rollback and uninstall

`node install/rollback.cjs --config <dir>` reads `install-manifest.json`, restores every
backed-up file, removes every file it created (only if that file's content still matches what
the installer wrote; a file the user has since edited is left alone with a warning), and
strips the `CLAUDE.md` block by its markers. If the manifest is missing, it refuses outright
rather than guessing what to remove.

## What this skill will not do

- Never deletes a file outright without a manifest-verified match.
- Never edits `settings.json` or wires a hook automatically.
- Never reads, writes, or transmits credentials.
- Never treats anything short of the literal typed word `INSTALL` as confirmation.
