<!-- Public edition, adapted from a production agent fleet's rules. Dates generalized; catalysts rewritten generic. -->

# architecture.rules.md

> How the system fits together. The structural rules of how code, agents, and operations are organized.
> All orchestration, sub-agent execution, and model routing is native Claude Code (Agent tool + skills + hooks).

## Agent Component Vocabulary

When discussing agent architecture in docs, agent prompts, and team comms, use this canonical mental model:

| Layer | Frame | What it is |
|---|---|---|
| CLAUDE.md | BASE | always-on context every session loads |
| Skills | WHAT to know | reusable knowledge modules, loaded on-demand (auto-invoke by description match) |
| MCP + Tools | HOW to connect | external connections (storage, messaging, third-party APIs, etc.) |
| Subagents | WHO does the work | isolated workers spawned via the native Agent tool, with their own model + permissions |
| Hooks | WHEN to automate | deterministic triggers outside the LLM loop |
| Plugins | DISTRIBUTION | bundled installables |
| Shared Memory | COMPOUND knowledge | multiple memory tiers, persists across sessions/agents |
| Delivery convention | DELIVERY | long-form deliverables saved to a shared location, delivered as a single message with a link - never raw inline dumps. Short answers (under ~500 chars) inline. |

The first 6 are standard Claude Code primitives. The last 2 are differentiators that make the stack auditable and compounding.

## Project Architecture

- Follow Domain-Driven Design with bounded contexts
- Keep files under 500 lines
- Use typed interfaces for all public APIs
- Prefer TDD London School (mock-first) for new code
- Use event sourcing for state changes
- Ensure input validation at system boundaries

## Concurrency: 1 MESSAGE = ALL RELATED OPERATIONS

- Batch independent operations into a single message so they run in parallel
- Use the native Agent tool to spawn sub-agents
- Batch ALL todos in ONE TodoWrite call (5-10+ when the work warrants it)
- Spawn ALL independent sub-agents in ONE message with full instructions via the Agent tool
- **Each spawn carries a real fixed startup cost before it reads a word of your brief** (measured in the
  low hundreds of thousands of tokens across real spawns spanning multiple agent types). Batching into
  one message saves wall-clock, not tokens. So: prefer FEWER, LARGER subagent briefs over many narrow
  ones, and do trivial lookups yourself rather than delegating them - a dozen-plus spawns in one session
  adds up to millions of tokens of pure startup.
- Batch independent file reads/writes/edits in ONE message
- Batch independent Bash commands in ONE message

## Sub-Agent Orchestration (native)

- Delegate multi-file changes, refactors, debugging, reviews, planning, research, and verification to native sub-agents (Agent tool).
- Work directly for trivial ops + single commands.
- Keep authoring and review as SEPARATE passes. Never self-approve in the same active context - use a `code-reviewer` or `verifier` agent for the approval pass.
- For independent parallel work, set `run_in_background: true` and put all Agent calls in ONE message. After spawning, do NOT poll status: wait for results, then review all results before proceeding.
- A subagent that hits its turn limit returns a PARTIAL result and says so. Treat PARTIAL as not done: continue that agent with a follow-up message (context intact, no new spawn cost) and re-review the combined output.

### Model Routing (small / standard / top tier)

| Tier | Latency | Use Cases |
|------|---------|-----------|
| **Small/fast model** | ~500ms | Simple lookups, transforms, summaries, known patterns, quick checks |
| **Standard model** | 2-5s | Standard code, copy, analysis, reports, debugging, research |
| **Top-tier model** | 2-5s | Architecture, strategic synthesis, high-stakes domains, novel cross-domain |

Set the `model` parameter on each Agent call. Score before assigning (see MSP below). Never route
client-facing or otherwise high-stakes copy to the smallest/fastest tier.

### Model Scoring Protocol (MSP) - Subagent Model Selection

**Subagents spawned via the Agent tool MUST be scored before model assignment.** Most subagent work
belongs in the mid tier or the small/fast tier; reserve the top tier for genuinely high-stakes/novel
work - it is expensive and should be rare.

Score the subagent task across 6 dimensions (0-10 each, max 60):

| Dimension | 0 | 5 | 10 |
|---|---|---|---|
| **Novelty** | Known playbook exists | Partial template | No prior pattern, first-of-kind |
| **Cross-domain** | Single domain | 2 domains | 3+ domains interleaved |
| **Stakes** | Internal / reversible | Client-visible output | Legal / financial / security |
| **Output depth** | Single fact or snippet | Multi-step structured | Architecture / full system design |
| **Ambiguity** | Fully specified | Some unknowns | Open-ended, requires judgment |
| **Context load** | <2k tokens needed | 2-8k tokens | >8k tokens / full codebase scan |

**Score → model mapping:**

| Score | Tier | Use cases |
|---|---|---|
| 0-20 | **Small/fast** | Lookups, transforms, summaries, known patterns, quick checks |
| 21-45 | **Standard** | Standard code, copy, analysis, reports, debugging, research |
| 46-60 | **Top tier** | Architecture, strategic synthesis, legal/financial, novel cross-domain |

**Top-tier subagent guardrails:**
- Document the MSP score inline before spawning: `// MSP: 52/60 (novelty:9, stakes:8, depth:9, domain:8, ambiguity:9, context:9)`
- Never spawn more than 2 top-tier subagents in a single message
- Decompose when possible: standard tier for research/gather phase, top tier only for synthesis/decision
- "This feels complex" alone does NOT qualify - score explicitly

## Available Native Sub-Agents

Sub-agents are invoked via the Agent tool (`subagent_type` parameter). The live catalog is provided by the
Agent tool itself - consult it rather than hardcoding a list. Core categories in regular use:

- **Execution:** an implementation agent, a general-purpose multi-step/search agent
- **Read-only research:** codebase-search agents, a planning agent, an analyst, an architecture advisor
- **Quality:** code-reviewer, verifier, critic, security-reviewer, debugger, tracer, test-engineer
- **Authoring:** technical writer, documentation scribe, designer, code-simplifier, code-refactorer
- **Domain-specific personas:** whatever specialist agents your own fleet defines

Set `model` per the MSP score above. Use worktree isolation when a sub-agent needs an isolated copy of the repo.

## Memory

Layer roles, generalized:
- **Local per-agent memory:** persistence written via memory hooks, scoped to one agent's config tree.
- **Cross-session memory service:** on-demand store/search across agents, scoped by a project/client tag.
- **Real-time state store:** heartbeats, cross-agent comms, a completed-work registry.
- **Structured knowledge base:** entities, concepts, research, cross-linked notes.
- **Shared vault:** SOPs, playbooks, data shared across agent architectures.

See `memory-first.rules.md` for the preflight-recall rule.

## Session isolation

New topic = start a fresh session, not a continuation of the current thread. Rename or label
multi-phase sessions so they can be found by name later, not by scrollback-guessing. Resume/continue
mechanisms are for exploratory sessions where the thread itself is the value; a completed multi-phase
build does not need to be resumed, it needs its memory artifacts written and the session closed.

**Long-running conversational seat exception:** a seat driven by an external chat channel cannot clear
mid-conversation: the channel IS the conversation and clearing it would drop context the user still
expects the agent to have. Those seats checkpoint instead (write memory at each milestone) rather than
clearing, and let natural session boundaries (a new day, a new topic from the user) be the reset point.

## Context zones (status line)

A status line can report a rough context-usage zone (e.g. green under ~50%, amber 50-75%, red over 75%),
plus the active provider tier when running on a fallback. Amber is a signal to wrap up the current unit of
work rather than start a new multi-step one in this session; red means clear/compact before continuing. A
fallback-tier tag means a quality gate for high-stakes output is active for that session.

## Adopted refinements (from a self-improvement loop, human-approved)

### Artifact-first for multi-step builds
For multi-step build/deploy tasks, create the target artifact/skeleton early and verify incrementally, rather than producing the deliverable only at the end.

### Time-box exploration (advisory)
Cap exploration before committing to implementation. Once you have enough to act, act; avoid open-ended discovery loops. Re-explore only on a concrete new unknown. Advisory, not a hard cap, so genuinely complex tasks are not cut short.
