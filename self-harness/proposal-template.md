---
name: proposal-template
description: Header-only format for a self-harness Stage 2 proposal. Copy this into self-harness/proposals/<date>-<slug>.md when drafting a bounded edit. See rules/self-harness.rules.md for the full loop.
type: reference
---

# Proposal: <slug>

- **Date:** YYYY-MM-DD
- **Cluster targeted:** <cluster key from the Weakness Report, e.g. `unverified-success`>
- **Weakness Report:** <path to the report this proposal came from>
- **Raw traces read:** <list the specific transcript/log files opened before drafting -- Stage 2 requires this, a summary-only proposal is rejected at review>

## Candidate

- **Surface edited:** <exactly one file/path>
- **Blast radius:** N file(s) / M layer(s) -- <enumerate them, do not estimate>
- **Diff:** <the actual diff, or a link to it>
- **Expected effect:** <what changes, in one sentence>
- **Regression risk:** <what could this break, and why it probably will not>

## Stage 3: validation

- **Eval run:** `node run-eval.cjs` -> <pass/fail counts>
- **Dimensions improved:** <list>
- **Dimensions degraded:** <list -- must be empty for the candidate to be eligible>
- **Token cost:** <measured, not estimated>

## Stage 4: human decision

- **Presented:** YYYY-MM-DD
- **Decision:** approved / rejected / edit-then-approve
- **Notes:**
