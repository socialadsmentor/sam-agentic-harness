<!-- Public edition, adapted from a production agent fleet's rules. Dates generalized; catalysts rewritten generic. -->

# memory-first.rules.md

> Before any non-trivial task, every agent in the fleet MUST search memory and log the result. This closes
> the rework gap behaviorally, alongside whatever runtime memory layer (prompt-time semantic search, a
> completed-work registry, post-task associative backfill) your own harness is building.

## The rule (always enforced)

**Before starting any non-trivial task (estimated >5 min OR involves paid APIs OR touches infrastructure), the agent MUST:**

1. **Run a memory search** against the appropriate layer(s) for the task scope:
   - **Exact-token check FIRST (cheapest, most reliable):** a keyword/title/tag search against your indexed
     memory store. This should cover both local agent memory and any shared vault in one query, and it
     matches literal strings (paths, IDs, tool names, client slugs) that semantic search misses. Treat
     this as the highest-yield first query.
   - **Fleet-wide completed-work check:** search a completed-work registry filtered to `status=done`  - 
     a raw dump of every row (including legacy chatter/noise rows) is the expensive path; don't use it for
     recall.
   - **Semantic recall:** call your semantic-search memory tool with the task description (top-5 results).
   - **Per-agent private notes:** load your own agent's private working-state key.
   - **Local index / wiki:** scan a local index for tagged or related entries.

2. **LOG the search result inline** in the response in this exact format:
   ```
   ## Memory check
   - **Prior work found:** YES / NO
   - **Top result:** [title] at [path/key] dated [date]  -  completed by [agent name]
   - **Applies to current task?** YES / NO / PARTIAL  -  [one-sentence reason]
   ```

3. **Surface the prior work BEFORE regenerating.** Default behavior is "show-then-decide":
   - Show what was found
   - State your interpretation (anchor on prior work / fresh take / hybrid)
   - Let the human signal naturally in conversation if they want a different direction ("fresh start" / "new angle" / "use the prior work as starting point"  -  any of these override the agent's default interpretation)
   - **Reject-and-reason-alone is a first-class outcome:** when the critique verdict is NO or PARTIAL, proceeding FRESH is the default-permitted path. Force-fitting a partially-applicable prior work product to avoid "wasting" it is the failure mode, not the goal. Still show what was found and why it was rejected; then reason from current-state evidence alone.

## Reconstructive recall  -  critique EVERY memory before acting on it

The preflight Applies-verdict above extends to ALL memory consumption, not just preflight searches. Before
ACTING on any recalled memory  -  session-start injected context, a cached knowledge-base summary, a
mid-task semantic-search hit, an old note, a shared-vault entry  -  run the transfer test:

1. **State what transfers** to the CURRENT state (rewrite the applicable part in present terms  -  paths, values, and conditions re-checked against now).
2. **Drop what does not transfer.** Similar is not applicable: a memory formed in a different situation is noise here.
3. **Or reject it entirely and reason fresh** from live evidence when nothing survives the critique.

A memory is a DRAFT, not a script. Verbatim replay of recalled context into actions (paths pasted unverified, remembered values asserted as current, prior-session advice followed against a changed state) is the failure mode this section exists to stop. Lightweight in practice: one sentence of critique before the memory drives a tool call or a claim.

## Applicability boundaries at write time

When WRITING feedback/reference/gotcha memories, include an explicit boundary line so future critique is cheap:

```
Applies when: <the conditions under which this fact/rule holds>
Does NOT apply when: <known exclusions, superseded contexts, or expiry signals>
```

A memory that states its own boundary can be critiqued in one read. Should-level for all new memories (not a completion gate); highest value on gotchas, tool/config facts, and client rules. Existing memories are not retroactively rewritten; add boundaries when a memory is next touched.

## Knowledge-graph recall
For ARCHITECTURE / "where does X live" / structure questions about your own codebase or knowledge base, consult a codebase-understanding knowledge graph BEFORE manual searching, if your harness has one. The graph is a structural INDEX (nodes/edges/layers/tour), auto-refreshed and regenerable; a curated content vault stays the source of truth. Find via the graph, read/write via the vault.

## When this rule applies

- ANY task estimated >5 min
- ANY task using paid APIs
- ANY task touching infrastructure (servers, configs, integrations, scheduled jobs)
- ANY task generating client-facing artifacts (copy, video, design, proposals)
- ANY task involving recurring patterns (regular reports, audits)

## When this rule does NOT apply

- Single quick lookups (file read, single grep, single command)
- An explicit human-confirmed "fresh run" (they can override via conversation  -  see show-then-decide above)
- Receipts, password resets, system notifications, pure transactional ops
- One-off questions where prior work clearly doesn't apply

## How to identify "self" (per-agent identity)

Read your agent-identity environment variable, injected per-agent in your launcher/settings. Write
completion records to your completed-work registry with the `agent` field set to your identity.

## Why this rule exists

Agents kept reworking tasks already completed because no memory-first rule was hardcoded. This rule is
the behavioral floor; a runtime layer (preflight-recall extensions, prompt-time semantic search, etc.) is
the technical floor. Both matter.

## How to apply (concrete example)

**A human asks an agent:** "Write a cold ad for offer X."

**The agent must FIRST do:**
1. Search a completed-work registry for entries tagged with the offer name and "cold ad"
2. Find: a prior cold ad v1 from a past date, the test artifact, archived
3. Search semantic memory with "cold ad for offer X"
4. Find: an offer spec doc, a prior ad trace, pipeline test outputs

**The agent responds:**
```
## Memory check
- Prior work found: YES
- Top result: cold ad v1 at [path] dated [date]  -  completed by [agent]
- Applies to current task? PARTIAL  -  that piece was ARCHIVED as a pipeline-validation test artifact, not a live product launch. The copy passed all quality axes. Recommend either: (a) revive that copy with updates for the current launch, (b) fresh take with a new angle.

Which do you want?
```

The human decides. The agent proceeds with the chosen path. No rework hidden, no time wasted.

## Cross-references

- `verification.rules.md`
- `memory-integrity.rules.md`
