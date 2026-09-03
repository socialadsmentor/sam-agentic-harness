<!-- Public edition, adapted from a production agent fleet's rules. Dates generalized; catalysts rewritten generic. -->

# test.expectations.md

> When to write tests, what counts as passing, what to verify before claiming completion.

## Build & Test Commands

```bash
# Build
npm run build

# Test
npm test

# Lint
npm run lint
```

## Required test discipline

- ALWAYS run tests after making code changes
- ALWAYS verify build succeeds before committing
- Prefer TDD London School (mock-first) for new code (see architecture.rules.md)

## Verification before completion

- Verify before claiming completion. Size appropriately: small→haiku-tier model, standard→mid-tier model, large/security→top-tier model.
- If verification fails, keep iterating.
- Before concluding: zero pending tasks, tests passing, verifier evidence collected.
- Never self-approve in the same active context  -  use a dedicated `code-reviewer` or `verifier` agent for the approval pass.

## Security verification

- After security-related changes, run a security-review pass (skill or dedicated security-reviewer agent). See behavioral.rules.md Security Rules.
