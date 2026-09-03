<!-- Public edition, adapted from a production agent fleet's rules. Dates generalized; catalysts rewritten generic. -->

# self-harness.rules.md

> The self-learning loop for an agent harness. How recurring failures become bounded, regression-tested, human-approved improvements to the harness (skills, prompts, agents, non-protected rules). Adapted from research on harnesses that improve themselves (Zhang et al., "Self-Harness"). Adapted for a live, human-facing fleet. Human-in-the-loop is mandatory.

## Why this exists

A harness like this one (the `rules/` files, `skills/`, `agents/`, hooks) IS a hand-engineered agent harness. By default it grows only reactively: a failure happens, someone notices, someone hand-writes a memory entry or a rule. Nearly every rule can carry a catalyst line ("hardcoded after an incident," "after a guessed value failed twice"). The research this is adapted from shows this human-engineering paradigm scales poorly and, critically, that it is missing a **validation gate**: new rules get added but never regression-tested against existing behavior, so the ruleset only grows and can silently contradict itself.

This file installs the missing loop. It does NOT hand the fleet the keys to rewrite itself. It systematizes mining + proposing, and keeps **promotion gated behind a regression eval and explicit human approval**.

## The self-harness loop (4 stages + audit)

Adapted from three research stages (Weakness Mining, Harness Proposal, Proposal Validation) plus a mandatory 4th human stage.

### Stage 1  -  Weakness Mining (automated, safe to run unattended)
- Inputs: the fleet's existing trace store  -  feedback notes, cross-references, hook logs, and per-skill failure notes.
- Cluster failures by a **signature**, not by topic: `(symptom rejected by review, the agent behavior that caused it, the reusable mechanism behind it)`. Two incidents join a cluster only when all three agree.
- Output: a **Weakness Report** ranked by support (how many incidents) x actionability (is there an editable surface that plausibly fixes it). Mining never edits anything.
- Tool: a weakness-mining script. Cadence: weekly, alongside a regular readiness check.

### Stage 2  -  Harness Proposal (automated draft, no apply)
- For each high-value cluster, an agent proposes **2-3 diverse-yet-minimal** candidate edits. Each candidate:
  - targets exactly ONE failure mechanism,
  - touches ONE concrete editable surface,
  - preserves unrelated behavior (no broad rewrites),
  - ships with an **audit record**: cluster targeted, surface edited, expected effect, regression risk.
- **Trace-grounded proposing:** the proposer reads the RAW files behind each cluster (session transcripts, job/gate/deploy trace logs  -  the weakness report carries pointers) selectively, before drafting. Summary-only proposals underperform trace-grounded ones in the source research's own ablation and are rejected at review.
- Diversity ACROSS candidates, minimality WITHIN each. Proposals are written to a proposals directory. Nothing is applied yet.

#### BLAST RADIUS is mandatory per candidate
A candidate does not satisfy "touches ONE concrete editable surface" until that claim has been **counted, not asserted**. Every candidate MUST carry a blast-radius line:

> `Blast radius: N file(s) / M layer(s)  -  <enumerate them>`

Rules:
- **Enumerate, never estimate.** List the actual paths. "One surface" with no list is not a blast radius.
- **Count the surfaces implementation touches, not the surfaces the summary mentions.** If the candidate says "each automation writes a heartbeat," the radius is every automation, not the registry file that describes them.
- **N > 1 file or M > 1 layer disqualifies the candidate from the bounded-edit lane.** It may still be proposed, but it must be relabelled a MULTI-SURFACE ROLLOUT and approved explicitly as such. It cannot ride the low-regression-risk promotion basis meant for one-line edits.
- Layers, for counting M: scheduled jobs, per-agent hooks, workflow automations, skills, rules, scripts.

**Catalyst:** one proposal claimed one surface (one config file plus one script). A reviewer counted six layers, because "each automation writes a heartbeat" silently fans out across the whole fleet. The author had applied this scrutiny to a candidate they were rejecting but not to the one they were recommending. Counting is cheap; the reviewer catching it later is not.

### Stage 3  -  Proposal Validation (regression gate)
- Each candidate is run against a **fixed regression eval set**: canned fleet tasks with pass/fail checks.
- **Conservative promotion rule** (from the source research): a candidate is eligible only if it improves at least one eval dimension and **degrades none**. A net-positive that breaks something else is REJECTED.
- Stochastic checks are repeated; a single lucky run does not promote.
- Stage-3 records also carry a measured token cost where relevant, and eligibility is judged on the quality-vs-cost tradeoff.
- Validation outcome (per-dimension deltas, accept/reject) is appended to the proposal file.

### Stage 4  -  Human Promotion Gate (MANDATORY, never skipped)
- Eligible candidates are presented to the human owner with: the cluster evidence, the exact diff, the eval deltas, and the audit record. **Show-then-decide** (per `memory-first.rules.md`).
- Only on the owner's explicit approval is the edit merged into the live surface.
- The owner may approve, reject, or edit-then-approve. No silent merges. No "proceed" shortcut.

### Stage 5  -  Merge + Audit
- On approval, apply the bounded edit, append a decision-log entry to the affected file (date, cluster, diff summary, eval deltas, "approved by <owner> <date>"), and log the lineage to an audit file.
- Every harness transition is auditable and reversible (version-controlled via the existing memory/rules versioning).

## Editable surfaces (what the loop MAY propose changes to)
- `skills/**` (skill bodies, examples, thresholds)
- `agents/**` (subagent prompt bodies)
- Non-protected `rules/*.md` content (clarifications, new failure-pattern guidance)
- Per-model prompt addenda (model-specific harness tuning, see below)
- Feedback/reference memories (consolidating duplicate/contradictory ones)
- **`scripts/**` and any automation registry  -  TIER 2, executable, stricter gate**

### Tier 2: executable surfaces (`scripts/**`, automation registry)
Scripts were never considered-and-excluded by this file when it originally governed prompt and knowledge
edits only; shipping executable code through the loop was not contemplated at first. The gap mattered: a
deploy-tooling cluster surfaced as one of the highest-incident-count clusters mined. A loop barred from
the failing surface can only rewrite prose.

Scripts are editable, but a bad sentence is read by a human before it acts while a bad script executes
unattended. So Tier 2 carries three requirements Tier 1 does not:

1. **Parse/AST validation is a GATE, not good practice.** Shell scripts via their parser (plus a non-ASCII
   scan for encoding-sensitive script types), Python via `py_compile`, JS/CJS via `node --check`.
   Unvalidated script = proposal rejected at Stage 2.
2. **A named rollback commit SHA** in the proposal. Diffs must be readable enough for rollback to be practical.
3. **Any unattended or scheduled script must declare a liveness probe** in the automation registry
   (and emit a heartbeat once a heartbeat mechanism exists). Otherwise the loop becomes a machine for
   manufacturing the exact silent failures it is trying to detect.

Before editing any script in a shared scripts directory, read the safety map at that directory's own
CLAUDE.md (live-hook and scheduled-script lists).

**STILL PROTECTED, unchanged:** settings/config files, hook wiring, permissions, allowlists, credentials.
The loop may write and commit a script; **wiring it into a live hook chain or any scheduler still requires
explicit human sign-off.** This is the precise line one real candidate crossed by proposing a hook script
while claiming it only touched an editable surface. Writing the file is Tier 2. Activating it is protected.

## PROTECTED surfaces (NEVER auto-modified; human hand-authors only)
The loop may FLAG these but must never propose an auto-applied edit to:
- Money/budget guardrails and anything touching client spend
- Permission policies, settings-file hooks, allowlists, credentials
- Security rules (`behavioral.rules.md` security section)
- The human-in-loop / approval rules themselves (including this file's Stage 4)
- Safety, compliance, and disclosure rules
- Any quality-gate pass thresholds tied to client-facing output

Rationale: these are the surfaces where a bad self-edit costs real money, leaks secrets, or removes a
safety check. A self-improving system must not be able to weaken its own guardrails. This mirrors the
source research's principle of constraining which harness elements can self-modify.

## Coverage across agent classes
The loop applies to ALL fleet agents, not just one team. Mining is scoped by mechanism, and each class has
its own editable surfaces and eval dimensions. Broad classes worth tracking: marketing/comms-ops agents
(recurring mechanisms: output-quality gates, unverified-success claims, routing, task-ops), coding/
automation agents (deploy-ops, infra, workflow automation, script encoding, code correctness, data-sync,
docs-first), and research agents (research-grounding: fabricated links/values, stale-memory assertion,
docs-first). The miner's mechanism vocabulary is extended as new failure modes appear; in one fleet's
first expanded run, deploy-ops surfaced as the #2 cluster by incident count, confirming coding/automation
is a high-value target, not an afterthought.

## Model-specific harnesses
The research shows different base models need different harness fixes (one model needs earlier artifact
creation, another needs dependency pre-checks). Model-tier routing already gestures at this. The loop may
propose **per-model prompt addenda** rather than one-size-fits-all rules, so a small-model subagent can
carry "create the output file first" guidance that a top-tier session does not need.

## Cadence
- **Weekly:** run Stage 1 mining alongside a regular readiness check. Surface the top clusters.
- **On-demand:** run the full loop when an incident recurs 3+ times (don't wait a week for a hot failure).
- **Quarterly:** review the eval set itself for drift; add cases for new fleet capabilities.

## Honest limits (do not oversell this)
- The load-bearing piece is the **eval set** (Stage 3). Without a real held-out eval, the loop just writes
  rules faster, which worsens the "grows but never tested" problem. Build and maintain the eval set first.
- Overfitting/reward-hacking is real; the held-out eval cases are the guard. Keep some eval cases unseen
  by the proposer.
- This is semi-automated by design. Full autonomy on a live, human-facing fleet is out of scope. The
  human gate is the feature, not a limitation.

## Cross-references
- `verification.rules.md`  -  the feedback-loop verification matrix this generalizes
- `memory-first.rules.md`  -  show-then-decide (Stage 4 pattern)
- `skill-construction.rules.md`  -  standards proposals must respect when editing skills
- Source research: "Self-Harness: Harnesses That Improve Themselves" (Zhang et al.)
