# SAM Agentic Harness

Rules below load on every session. Skills load on demand by description match. See ARCHITECTURE.md.

| Rule file | What it governs |
|---|---|
| `architecture.rules.md` | Subagent orchestration, model-tier scoring, batching, memory-layer roles |
| `behavioral.rules.md` | No-guessing, anti-hollow-code, undo vs revert, security basics |
| `cross-session-messaging.rules.md` | Agent-to-agent messaging, message-length splitting, fan-out races |
| `fleet-parity.rules.md` | Memory-sync and skill-parity as completion gates across config trees |
| `memory-first.rules.md` | Search memory before non-trivial work; critique before acting on a recall |
| `memory-integrity.rules.md` | Eleven rules for writes, verification, and honest reporting |
| `naming.conventions.md` | File placement, script encoding, never write to desktop or profile root |
| `self-harness.rules.md` | The self-improvement loop and its protected surfaces |
| `skill-construction.rules.md` | Five standards for skills that survive first real use |
| `test.expectations.md` | Build/test/verify discipline before calling anything done |
| `tool-search.rules.md` | On-demand MCP loading; memory and chat stay always-on |
| `verification.rules.md` | The per-deliverable-type self-check matrix |

Skills: `skills/`, one directory per skill, auto-loaded by description match.
Verification: nothing is done until its verification.rules.md row has run and produced evidence.
Self-harness: mine weekly, propose bounded edits, run the regression eval, human approves before merge.
Memory: assumes local, cross-session, and shared-vault tiers; degrade gracefully if you only have local.
