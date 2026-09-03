---
name: blueprint
description: >-
  Turn a one-line objective into a step-by-step construction plan for
  multi-session, multi-agent engineering projects. Each step has a
  self-contained context brief so a fresh agent can execute it cold.
  Includes adversarial review gate, dependency graph, parallel step
  detection, anti-pattern catalog, and plan mutation protocol.
  TRIGGER when: user requests a plan, blueprint, or roadmap for a
  complex multi-PR task, or describes work that needs multiple sessions.
  DO NOT TRIGGER when: task is completable in a single PR or fewer
  than 3 tool calls, or user says "just do it".
origin: community
---

# Blueprint - Construction Plan Generator

Turn a one-line objective into a step-by-step construction plan that any coding agent can execute cold.

## When to Use

- Breaking a large feature into multiple PRs with clear dependency order
- Planning a refactor or migration that spans multiple sessions
- Coordinating parallel workstreams across sub-agents
- Any task where context loss between sessions would cause rework

**Do not use** for tasks completable in a single PR, fewer than 3 tool calls, or when the user says "just do it."

## How It Works

Blueprint runs a 5-phase pipeline:

1. **Research** - Pre-flight checks (git, gh auth, remote, default branch), then reads project structure, existing plans, and memory files to gather context.
2. **Design** - Breaks the objective into one-PR-sized steps (3-12 typical). Assigns dependency edges, parallel/serial ordering, model tier (strongest vs default), and rollback strategy per step.
3. **Draft** - Writes a self-contained Markdown plan file to `plans/`. Every step includes a context brief, task list, verification commands, and exit criteria - so a fresh agent can execute any step without reading prior steps.
4. **Review** - Delegates adversarial review to a strongest-model sub-agent (e.g., Opus) against a checklist and anti-pattern catalog. Fixes all critical findings before finalizing.
5. **Register** - Saves the plan, updates memory index, and presents the step count and parallelism summary to the user.

Blueprint detects git/gh availability automatically. With git + GitHub CLI, it generates full branch/PR/CI workflow plans. Without them, it switches to direct mode (edit-in-place, no branches).

## Key Features

- **Cold-start execution** - Every step includes a self-contained context brief. No prior context needed.
- **Adversarial review gate** - Every plan is reviewed by a strongest-model sub-agent against a checklist covering completeness, dependency correctness, and anti-pattern detection.
- **Branch/PR/CI workflow** - Built into every step. Degrades gracefully to direct mode when git/gh is absent.
- **Parallel step detection** - Dependency graph identifies steps with no shared files or output dependencies.
- **Plan mutation protocol** - Steps can be split, inserted, skipped, reordered, or abandoned with formal protocols and audit trail.
- **Zero runtime risk** - Pure Markdown skill. The entire repository contains only `.md` files - no hooks, no shell scripts, no executable code, no `package.json`, no build step. Nothing runs on install or invocation beyond Claude Code's native Markdown skill loader.

## Requirements

- Claude Code (for `/blueprint` slash command)
- Git + GitHub CLI (optional - enables full branch/PR/CI workflow; Blueprint detects absence and auto-switches to direct mode)

## Source

Upstream: see NOTICE.md
