---
name: session-selftest
description: Run a health check of the local harness at session start - memory index byte budgets, hook parse checks, plugin presence, task-pattern sanity
tools: Bash, Read
---

# Session Selftest

Mode A health check for a Claude Code harness install. Runs seven checks against one or
more config trees and reports each OK / WARN / FAIL with one-line evidence. Exits 0 if no
FAIL row, 1 otherwise, so it can gate CI/cron.

## When to Activate

- At the start of a session, to confirm the harness (rules, skills, memory, scheduled
  tasks, provider-tier pins) is in a healthy state before relying on it.
- After any install, upgrade, or multi-seat sync, to catch drift or a silently-disabled
  plugin before it causes a downstream failure.

## Usage

```
node skills/session-selftest/scripts/selftest.cjs
```

Config is entirely env-driven so the same script runs against any config tree, single- or
multi-seat:

| Env var | Purpose | Default |
|---|---|---|
| `SAM_HARNESS_TREES` | Comma-separated config-tree directory names under `$HOME`, e.g. `.claude,.claude-alt` for a multi-seat setup. | `.claude` |
| `SAM_HARNESS_MEMORY_CAP` | Byte budget for each discovered `MEMORY.md` index file. | `25000` |
| `SAM_HARNESS_PLUGIN_CHECK` | A `plugin@marketplace` id to verify is enabled via `claude plugin list`. | unset - check skipped (OK) |
| `SAM_HARNESS_TASK_PATTERN` | Case-insensitive regex matched against scheduled-task names to decide which ones the scheduled-task check cares about. | unset - check skipped (OK) |

## The seven checks

1. Configured plugin enabled (`claude plugin list`), if `SAM_HARNESS_PLUGIN_CHECK` is set.
2. Memory-index byte budgets: each discovered `projects/*/memory/MEMORY.md` vs the cap.
3. Harness lint: retired-term grep across `rules/*.md` + `skills/*/SKILL.md` files.
4. Stray files in each tree's `rules/` dir.
5. Scheduled-task health (`schtasks /query`), if `SAM_HARNESS_TASK_PATTERN` is set.
6. Config-tree sync drift: `rules/*.md` hash-compared across every configured tree.
7. Provider-tier context-window pins, if `scripts/checks/tier_env_ctx_window.cjs` exists in
   the primary tree (that check module ships separately; this simply wires it in when
   present).

Zero external dependencies. Windows-aware (spawns `claude.exe` / `schtasks.exe` directly,
no shell, so paths with spaces are never mangled).
