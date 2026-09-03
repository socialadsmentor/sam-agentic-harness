# Contributing

Issues are open. No support is promised: read the code before you install it, and expect to
debug your own setup if something does not fit.

## Pull requests

Welcome if they pass what the repo already enforces:

- No em-dashes (U+2014) in any rule, skill, or script file.
- No secrets, client names, credentials, home-directory paths, or IP addresses anywhere in the diff.
- Every `.js`/`.cjs` file parses with `node --check`.
- Every `.py` file parses with `python -m py_compile`.
- Every `.ps1` file parses with the PowerShell parser (`scripts/parse-check.ps1`).
- Every `.json` file parses.

## Running the installer's own test suite

```
node install/tests/run.cjs
```

This exercises fit analysis, dry run, a refused apply with no typed confirmation, a confirmed
apply, readback, and rollback, against a temporary config directory it creates and deletes
itself. It touches nothing outside that temp directory.

## Scope

A pull request that adds a new rule, skill, or hook script should explain what real failure it
prevents, the way the existing rules do. A pull request that removes a protected surface from the
self-harness loop (see `rules/self-harness.rules.md`) will not be merged.
