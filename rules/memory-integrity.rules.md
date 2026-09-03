<!-- Public edition, adapted from a production agent fleet's rules. Dates generalized; catalysts rewritten generic. -->

# memory-integrity.rules.md

> Eleven rules for memory, verification, and reporting. Each one is a scar from a real memory-system
> rebuild and the audits that followed. Applies to every agent, and to every subagent it spawns.
>
> Applies when: writing to or reading from any memory tier, running or consuming an audit,
> reporting a finding, or changing anything that can fail silently.
> Does NOT apply when: a single quick lookup with no claim attached to it.

## 1. A warning nobody reads is not a monitor

If a thing can fail silently, something must notice ON ITS OWN and speak up. A line printed
into a log on every run is not noticing; it is decoration.

**Catalyst:** a sync script printed a `[warn] push failed:` line for a handful of files on every single run
for weeks. Every downstream reader was working from an older ruleset than the source. The cause (files
owned by a different user inside a container than the sync account) took minutes to find once anyone
looked. Nobody looked, because the warning was always there.

**How to apply:** anything unattended declares a liveness probe in an automation registry.
Detection must be automatic (a periodic health check) and must stay SILENT when healthy,
because an alert that fires when nothing is wrong trains people to ignore it. Scope repeat
detections to the most recent run so a fixed problem stops alerting.

## 2. Verify the end state, never the exit code

A success message is not proof. Read the value back from the place it was supposed to land.

**Catalyst:** a hook that recorded completed work had been a silent no-op for months (thousands of skips
against a handful of real writes) because it read a field the payload never contained. It logged cleanly
the entire time. Some third-party APIs likewise return HTTP 200 with per-item error objects buried inside,
so a 200 status proves nothing about the write.

**How to apply:** after any state-changing write, GET the exact field back. Inspect per-item
results in a batch. A `2xx` response is not verification.

## 3. An audit finding is a draft until re-tested

Before repeating a subagent's qualitative claim to a person, to another agent, or into memory, run the
single command that would falsify it. If you cannot, label it UNVERIFIED in the same sentence.

**Catalyst:** several agents audited a memory stack; a separate verifier re-tested the load-bearing
claims and found more than half were wrong or overstated. Several had already been repeated as fact.
Mechanical findings (hashes, counts, file contents) held up; narrative "tier X beats tier Y"
comparisons did not.

## 4. Never declare something missing from one search

Cross-check every "not found" against a second retrieval mode: a listing, an exact-id fetch, or a
different tier. Two tools over the same data can disagree.

**Catalyst:** "the system has zero record of this work" came from one ranked semantic-search
query. A plain document listing returned matching entries immediately. The write
path was never broken; the ranked query simply under-ranked same-day content.

## 5. Only test content you have confirmed is in the corpus

Read the source first, then query for it. Otherwise a search failure proves nothing.

**Catalyst:** an audit concluded a search tool was broken because sentences from the rules files
returned no results. Those files were never part of the corpus being searched. A corpus-scoping bug in
the test was reported as a defect in the tool.

## 6. Carry the caveat when you compress

Summarizing is where false confidence gets manufactured. If a finding is conditional, the
condition travels with it into the one-line version, or the finding does not travel at all.

**Catalyst:** long-form reports were careful with hedges; a compressed index dropped the hedge and turned
a nuanced finding into a flat "returns no results." The investigation was better than the summary that got
acted on.

## 7. Existence is not sufficiency

Check that a thing has usable content, not merely that it is there.

**Catalyst:** a token-based brand file existed at a handful of bytes while real ones run tens of
kilobytes. A hook checked file-existence only and reported the canonical record as found, so an agent
stopped looking. An empty file that passes a presence check is worse than a missing one.

## 8. Archive, never delete; rescue what is linked first

Before removing anything, find what points at it. Move, do not destroy. Keep the archive.

**Catalyst:** retiring a large frozen mirror of old notes. A link check found dozens of referenced
names, a meaningful fraction of which existed only in the doomed set and would have become dangling
references. They were rescued first; everything else was archived, nothing deleted, and the
post-cleanup dead-pointer rate was zero. Also delete the index entries for anything archived, or search
keeps serving paths that are gone.

## 9. Fail open, always

No memory tier may block a turn. A missing tier degrades the answer; it never stops the work.
Every hook exits 0, always, under every failure.

**Catalyst:** measured during a deliberate outage  -  every recall hook exited 0 quickly
and the blast radius was exactly the one block that depended on the downed service.
This is the property that makes the whole stack safe to depend on.

## 10. One canonical home per fact

A fact lives in exactly one place; every other tier holds a pointer or an index entry. Every
duplicate is a future contradiction with a delay fuse.

**Catalyst:** several records said "active" while later evidence showed the underlying work
archived, because the note was written once and never revisited. Where a fact must exist twice
(a keyword and a semantic index intentionally covering the same corpus), the copies must be LINKED
so a reader sees one answer rather than two competing ones.

**How to apply:** when a status changes, update the canonical record in the same pass that makes
the change.

## 11. Never dispatch a reviewer against a moving target

Before briefing any review agent, establish current state from evidence and PUT IT IN THE
BRIEF. While agents are running, do not edit the files they are reading; queue the change
until they report. One agent at a time on a given surface, or non-overlapping surfaces.

**Catalyst:** in one review-heavy day, two collisions happened. A review agent was launched against a
defect that a different agent then fixed minutes later from a different report; the reviewer reported the
same defect against source that no longer existed  -  correct when it started, wrong when it landed.
Separately, two review agents were both briefed to inspect the same commit, which a history rewrite had
just orphaned off the branch. They were sent to read a commit that was not on the branch.

At real per-spawn cost, rediscovering a closed defect is expensive; acting
on a stale finding risks re-breaking working code. The same day also shipped the same
undefined-identifier bug twice under different names, which is the solo version
of the same failure: not knowing what you already did.

**How to apply:** run a lightweight state-ledger check and paste its
output into the brief. It verifies each past fix by fingerprinting the LIVE source rather
than trusting anyone's recollection, and it carries the known-open list beside the closed
list so the two cannot drift apart. If a fingerprint is missing, that fix was reverted or
rewritten  -  treat it as open and verify before doing anything else.

Generalizes past memory work: any long task where state changes under you needs a
derived-from-evidence state check, not a remembered one.

---

## The shape of these eleven

Rule 11 is about **not knowing what you already did**, which is the same failure turned
inward. Rules 1, 2 and 9 are about **systems that lie quietly**: things that report success, print
warnings nobody reads, or fail in ways that look like working. Rules 3, 4, 5 and 6 are about
**claims that outrun their evidence**, which is how a wrong finding gets acted on. Rules 7, 8 and
10 are about **data that rots**: empty files, orphaned links, and copies that drift apart.

If you only remember one: **re-run the command that would prove you wrong, before you say it.**

## Cross-references
- `verification.rules.md`  -  the per-deliverable verification matrix (rule 2 extends it)
- `memory-first.rules.md`  -  preflight recall + reconstructive critique of recalled memory
- `self-harness.rules.md`  -  the self-improvement loop's liveness probes (rule 1)
