---
name: lineage
description: Append-only audit trail of every self-harness edit that reached Stage 5 (Merge + Audit). Empty scaffold -- one entry gets appended per approved proposal. See rules/self-harness.rules.md.
type: reference
---

# Self-harness lineage

Append one entry per merged proposal, oldest first. Never edit or remove a
past entry -- if a merged edit is later reverted, append a new entry saying
so rather than deleting the original.

## Entry format

```
## YYYY-MM-DD - <slug>

- **Cluster:** <cluster key>
- **Surface:** <file(s) changed>
- **Proposal:** <path to the proposal file in self-harness/proposals/>
- **Eval deltas:** <dimensions improved, none degraded>
- **Approved by:** <name>, YYYY-MM-DD
- **Diff summary:** <one or two sentences>
```

<!-- entries below this line -->
