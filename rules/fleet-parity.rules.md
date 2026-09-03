<!-- Public edition, adapted from a production agent fleet's rules. Dates generalized; catalysts rewritten generic. -->

# fleet-parity.rules.md

> Two hardwired fleet guarantees, applicable when you run more than one agent config tree (multiple
> desktop profiles, multiple hosted seats, or both). These are completion gates, not suggestions.

## RULE 1: Three-tier memory sync on EVERY task completion (MANDATORY)

A task is NOT complete until all applicable memory tiers are written. Fires on: completing any
non-trivial task, ending any working session, and any milestone another agent would want to know about.

1. **LOCAL memory:** write/update the memory file in YOUR OWN config tree's memory directory + refresh
   its index.
2. **CROSS-SESSION MEMORY SERVICE:** save a SELF-CONTAINED summary: what was done, where the artifacts
   live (full paths/links), current state, and the next step. Write it so an agent with zero context can
   act on it.
3. **SHARED VAULT** (readable by every agent, across config trees or machines): write to your agent
   folder or the relevant project/client note. This is the tier EVERY agent, regardless of which config
   tree it runs from, can read.

- The full memory stack should be always-loaded for every agent (see `tool-search.rules.md`'s hard
  rule), so there is never an excuse to skip a tier.
- A real-time state store (heartbeats, resume keys) remains the live layer and does not replace the
  three tiers above.
- Exclusions: single quick lookups, pure conversation, receipts. When in doubt, WRITE.
- The flip side is recall: `memory-first.rules.md`'s preflight must search ALL tiers, because the work
  you need may have been done by any agent, in any config tree.

## RULE 2: Skills + plugin parity on EVERY install (MANDATORY)

**Canonical topology (generalize to your own setup):**
- One canonical skills directory, mirrored to every other config tree that needs it.
- A large personal/dev-pattern skill library kept OUTSIDE the fleet-synced canon is fine, but any skill
  meant for the fleet MUST live in the canonical directory (copy it there, never symlink across
  machines/platforms  -  cross-OS symlinks break silently).
- Hosted/remote seats: a shared skills directory that every hosted agent symlinks to, plus any host-level
  skill directories that need mirroring.
- Plugins: per config tree. Fleet-adopted plugins are declared in a manifest file (one line per plugin).
  Agent-specific plugins (e.g. a per-agent messaging integration) are NOT in the manifest.

**THE RULE:** whoever installs or creates a skill or plugin, ANYWHERE, immediately:
1. If it is a fleet-adopted plugin: add its line to the manifest first.
2. Run the parity-sync script.
3. VERIFY from the script's report: skill counts equal across all trees, diffs empty, manifest plugins
   installed everywhere. A success print alone is not verification  -  read the actual report.
- The sync is ADDITIVE ONLY: it never deletes a skill anywhere; orphans are reported for a human decision.
- Safety net: a daily scheduled task re-runs the same sync, so drift never lives longer than a day even if
  the manual step is missed.
- OUT of auto-scope: any machine or persona-loader architecture explicitly excluded by your own topology  - 
  flag drift in a shared channel instead of auto-syncing it.

## Why this exists
Skills and memory tend to drift out of parity, and every manual sync becomes a recurring chase. This rule
makes parity the default state instead of a recurring task.
