<!-- Public edition, adapted from a production agent fleet's rules. Dates generalized; catalysts rewritten generic. -->

# tool-search.rules.md

> On-demand MCP tool loading. Added after fleet subagents kept failing with "Prompt is too long."

## HARD RULE: the memory stack and your chat channel ALWAYS load (never remove)
The FULL MEMORY STACK (whatever tools back your local/cross-session/shared-vault memory tiers) and your
primary chat integration MUST remain always-loaded for EVERY agent, so memory can be recalled and written
at all times and two-way messaging never breaks. NEVER set the memory stack to lazy-load, never remove it
from a config, and never drop the chat-channel flag from a launcher. Only the heavy non-memory servers
(deep integrations, browser automation, ads platforms, etc.) are on-demand.

## The rule
- MCP Tool Search is ON for all agents. Heavy MCP servers load on demand via the `ToolSearch` tool. They
  are NOT force-loaded at startup. EXCEPTIONS that stay always-on: the FULL MEMORY STACK, so memory recall
  and writes work for every agent and subagent, and your chat channel (a channel plugin, not an MCP
  server, so unaffected by lazy-load settings).
- Before calling any MCP tool that is not already in your available-tools list, use `ToolSearch` to load
  its schema first. A deferred tool's name may appear in a system-reminder; load it, then call it. Example:
  `ToolSearch query "select:mcp__some-server__some-tool"`, or a keyword search like `ToolSearch query
  "google ads campaigns"`.
- Batch tool loads: put every tool you expect to need into ONE `ToolSearch` call (comma-separated
  `select:` list), not one call per tool. Each separate call wastes a round-trip.
- Do not assume a tool is preloaded. On "No such tool available," ToolSearch for the real name from a real
  source. Never guess tool names (see `behavioral.rules.md` No-Guessing).

## Why this exists
Force-loading every heavy MCP server (roughly 200k tokens of tool schemas) fit inside a large top-tier
session's context window but OVERFLOWED every smaller subagent's window. Force-loading overrides the
auto-defer that would otherwise protect a small-context subagent, so subagents died instantly with
"Prompt is too long," model routing could not offload work, and everything fell back to the expensive
top-tier session. On-demand loading keeps every startup lean, so subagents spawn normally and routing to
cheaper models for lower-tier work actually works.

## Post-change smoke test
After ANY MCP/lazy-load/launcher config change: readback the value, then spawn one throwaway small-tier
subagent and confirm it completes BEFORE declaring the fix done. This was added after a config change to
the always-load list silently broke every subagent for over a week  -  nobody smoke-tested the change, so
the breakage went unnoticed until someone happened to spawn a subagent and watched it fail.

## Routing pattern for research/scraping tools: interactive vs batch
If your harness has both an MCP-based web-research tool and an equivalent CLI, split by caller:
- **MCP path** for interactive, in-context lookups from the main session.
- **CLI path** for subagents (no schema load), scripts/cron/automation, an open-model lane, or any pull
  large enough that it belongs in a file rather than inline context.
This avoids paying the MCP schema-load cost from every subagent that only needs one scrape.

## Cross-references
- `behavioral.rules.md`  -  No-Guessing-Evidence-Only
- `verification.rules.md`  -  the smoke-test discipline this section extends
