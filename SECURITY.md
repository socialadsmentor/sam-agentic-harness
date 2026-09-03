# Security

## Reporting a vulnerability

Open a private GitHub security advisory on this repository (Security tab, "Report a
vulnerability"). Do not open a public issue for a security report.

There is no SLA. This is not supported software; see the README. A report will be read and
acted on when someone gets to it.

## Scope

In scope: the hook scripts under `scripts/`, the installer under `install/`
(`fit-analysis.cjs`, `install.cjs`, `readback.cjs`, `rollback.cjs`), and every executable
file under `skills/` (for example `skills/brainstorming/scripts/server.cjs`,
`skills/ck/commands/*.mjs`, `skills/session-selftest/scripts/selftest.cjs`) - anything that
reads, writes, or executes on your machine.

Out of scope: the content of the rules and skills themselves (prompt text, not code), and any
third-party skill covered by `NOTICE.md` (report those upstream).
