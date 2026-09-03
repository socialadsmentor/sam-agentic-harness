# Third-Party Notices

This project redistributes a number of skills that originated in other open
source projects. Each is listed below under its source repository, with the
upstream license and a copyright line. These skills are redistributed under
their original licenses (MIT except where noted in NOTICE.md). Some skills
are redistributed unmodified; others were adapted (voice, formatting, worked
examples removed where present).

Every third-party source this project has identified is listed below, including
the results of the provenance sweep below. Some skills carry no upstream marker;
if you recognize one as yours, open an issue and it will be credited or removed.

## Everything Claude Code (ECC)

- Repository: https://github.com/affaan-m/ECC
- License: MIT
- Copyright (c) 2026 Affaan Mustafa

The following skills are adapted from ECC (`origin: ECC`):

accessibility, agent-harness-construction, agent-introspection-debugging,
agentic-engineering, ai-regression-testing, architecture-decision-records, article-writing,
backend-patterns, codebase-onboarding, coding-standards, connections-optimizer, content-engine,
content-hash-cache-pattern, context-budget, continuous-agent-loop, cost-aware-llm-pipeline,
council, crosspost, customer-billing-ops, data-throughput-accelerator, deployment-patterns,
docker-patterns, e2e-testing, error-handling, eval-harness, frontend-patterns,
hexagonal-architecture, postgres-patterns, prisma-patterns, react-patterns, react-performance,
react-testing, redis-patterns, security-review, tdd-workflow, vite-patterns

The following skills are direct-port adaptations from ECC (`origin: ECC direct-port adaptation`):

api-connector-builder, dashboard-builder

The following skills were adapted from community pull requests submitted to the ECC
repository (`origin: community` or `origin: oh-my-agent-check`), each attributed to its
original PR author:

| Skill | Upstream PR | Author |
|---|---|---|
| click-path-audit | https://github.com/affaan-m/ECC/pull/729 | massimotodaro |
| cost-tracking | https://github.com/affaan-m/ECC/pull/1304 | MayurBhavsar |
| data-scraper-agent | https://github.com/affaan-m/ECC/pull/503 | imrobinsingh |
| frontend-a11y | https://github.com/affaan-m/ECC/pull/2048 | hjkim0905 |
| agent-architecture-audit | https://github.com/affaan-m/ECC/pull/1566 | huangrichao2020 |

## agent-eval

- Repository: https://github.com/joaquinhuigomez/agent-eval
- License: MIT
- Copyright (c) 2026 Joaquin
- Adapted here as the `agent-eval` skill (marked `origin: ECC` in its frontmatter: ECC
  vendored this skill from the joaquinhuigomez/agent-eval repository, and this project
  adapted it from ECC).

## Supabase Agent Skills

- Publisher: the Supabase team
- License: MIT (per the skill's own attribution line)
- Adapted here as part of the `postgres-patterns` skill (marked `origin: ECC` in its
  frontmatter: ECC vendored this skill's base content from Supabase's own agent-skills
  material, crediting "Supabase Agent Skills (credit: Supabase team) (MIT License)"
  inline; this project adapted it from ECC).

## vercel-labs/agent-skills

- Repository: https://github.com/vercel-labs/agent-skills
- License: MIT (per the skill's own attribution line: "MIT License, copyright Vercel
  Engineering"; the repository README states MIT but the repository ships no LICENSE
  file and is marked private in package.json; "Vercel Engineering" comes from its
  metadata.json organization field)
- Adapted here as the `react-performance` skill (marked `origin: ECC` in its
  frontmatter: ECC vendored this skill from vercel-labs/agent-skills's
  `react-best-practices` skill, and this project adapted it from ECC).

## superpowers

- Repository: https://github.com/obra/superpowers
- License: MIT
- Copyright (c) 2025 Jesse Vincent
- Adapted here as the `brainstorming`, `systematic-debugging`, `writing-plans`,
  `using-git-worktrees`, `verification-before-completion`, `receiving-code-review`,
  and `requesting-code-review` skills (the last includes `code-reviewer.md`).

## blueprint

- Repository: https://github.com/antbotlab/blueprint
- License: MIT
- Copyright (c) 2026 antbotlab
- Upstream PR: https://github.com/affaan-m/ECC/pull/374, author antbotlab
- Adapted here as the `blueprint` skill (marked `origin: community` in its frontmatter:
  antbotlab first submitted this skill as a community PR to ECC, then published it as
  their own standalone repository; this project adapted it from the standalone repo).

## wshobson/agents

- Repository: https://github.com/wshobson/agents
- License: MIT
- Copyright (c) 2024 Seth Hobson
- Adapted here as part of the `context-driven-development` skill (see
  `references/artifact-templates.md` for the upstream pull-request credit), and, found by
  the 2026-09-03 provenance sweep below, the `accessibility-compliance`, `bash-defensive-patterns`,
  `block-no-verify-hook`, `data-storytelling`, `incident-runbook-templates`,
  `python-design-patterns`, `responsive-design`, `shellcheck-configuration`,
  `architecture-patterns`, `async-python-patterns`, `auth-implementation-patterns`,
  `bats-testing-patterns`, `cqrs-implementation`, `github-actions-templates`,
  `javascript-testing-patterns`, `microservices-patterns`, `modern-javascript-patterns`,
  `nextjs-app-router-patterns`, `nodejs-backend-patterns`, `postmortem-writing`,
  `react-state-management`, `secrets-management`, `sql-optimization-patterns`,
  `typescript-advanced-types`, `wcag-audit-patterns`, and `workflow-orchestration-patterns`
  skills. The last 18 of those were first credited to `sickn33/agentic-awesome-skills` (a
  harvester catalog, not an origin repo) by the 2026-09-03 sweep; a 2026-09-04 independent
  content-similarity review traced them to this repository instead and the sickn33 credit
  was removed.

## addyosmani/agent-skills

- Repository: https://github.com/addyosmani/agent-skills
- License: MIT
- Copyright (c) 2025 Addy Osmani
- Found by the 2026-09-03 provenance sweep below as the upstream (or an MIT-licensed
  mirror) for: `git-workflow-and-versioning`, `incremental-implementation`,
  `performance-optimization`, `security-and-hardening`, `documentation-and-adrs`,
  `spec-driven-development`, `browser-testing-with-devtools`, `ci-cd-and-automation`,
  `context-engineering`, and `planning-and-task-breakdown`. The middle two of those were
  first credited to `sickn33/agentic-awesome-skills` and the last four were marked "no
  upstream found" by the 2026-09-03 sweep; a 2026-09-04 independent content-similarity
  review traced all six to this repository instead.

## Anthropic public materials

- `citation-engine`: not a redistributed skill body; a single attribution sentence in
  `citation-engine/SKILL.md` ("Based on Anthropic's citations agent pattern") crediting
  Anthropic's own published citations agent pattern as the source technique. No separate
  license section applies.
- `claude-code-security-review`: Repository https://github.com/anthropics/claude-code-security-review.
  License: MIT. Copyright (c) 2025 Anthropic, PBC.
- `anthropic-sdk-python`: Repository https://github.com/anthropics/anthropic-sdk-python.
  License: MIT. Copyright 2023 Anthropic, PBC. Adapted here as a condensed reference over
  the upstream README.
- `anthropic-sdk-php`: Repository https://github.com/anthropics/anthropic-sdk-php.
  License: MIT. Copyright 2023 Anthropic, PBC. Adapted here as a condensed reference over
  the upstream README.

## marketingskills

- Repository: https://github.com/coreyhaines31/marketingskills
- License: MIT
- Copyright (c) 2025 Corey Haines
- Adapted here as the `ab-test-setup`, `ai-seo`, `churn-prevention`, and
  `competitor-alternatives` skills. (PlatoTheOne/marketingskills, credited by the
  2026-09-03 sweep, is a fork of this repository, not the origin.)

## context-keeper (ck)

- Repository: https://github.com/sreedhargs89/context-keeper
- License: MIT
- Copyright (c) 2026 Sreedhar GS (sreedhargs89)
- Adapted here as the `ck` skill.

## Removed

The following skills were removed from this public edition because their license
could not be verified (a personal byline with no linked repository, or an unlicensed
adaptation with no permissive terms), because they named a third party in an
un-stripped worked example with no accompanying integration code, or because they
named an unidentified commercial product and partner: `ai-discoverability-audit`,
`animate`, `case-study-builder`, `cold-outreach-sequence`, `competitive-ads-extractor`,
`content-idea-generator`, `evaluation-methodology`. They are not covered by the MIT
license of this repository and are not present in `dist/`.

`create-agent` was removed by the 2026-09-03 provenance sweep below: it is a port of
gnekt/My-Brain-Is-Full-Crew (a copyright line names Christian Di Maio, 2025; the
GitHub API does not detect a machine-readable license on that repository) that
references paths (`.claude/references/`, `Meta/states/`) which do not exist in this
harness, so it does not function here even if credited. Quarantined, not shipped.

`daily-briefing-builder` was removed by a 2026-09-04 independent content-similarity
review: it is a verbatim copy of BrianRWagner/ai-marketing-claude-code-skills, a
repository with no license file. The 2026-09-03 sweep had credited it to
`majiayu000/claude-skill-registry`, an MIT-licensed mirror that carries the same skill
under the same path; that credit is withdrawn because an unlicensed origin cannot be
relicensed by a mirror. Quarantined, not shipped.

`postgresql-table-design` was removed by a fix-pass-7 review: it is a 99% verbatim copy
of timescale/pg-aiguide `skills/design-postgres-tables/SKILL.md`, licensed Apache-2.0.
This is an MIT release and does not carry the Apache-2.0 notice obligations that
redistribution would require, so the skill is withheld; install it from the upstream
repository instead. Quarantined, not shipped.

## Provenance sweep (2026-09-03, corrected 2026-09-04)

Every skill without an `origin:` frontmatter tag was checked for a public upstream:
a distinctive sentence from its body, searched with `gh search code`, resolved
against the hit repository's declared license. As of fix pass 7, 56 shipped skills
have no `origin:` tag; 7 are already covered by the `superpowers` credit above and
4 by the `marketingskills` credit above (both listed above despite lacking the
tag). The remaining 45 are below, plus 3 rows for skills the provenance sweep
quarantined out of the shipped tree entirely (`create-agent`, `daily-briefing-builder`,
`postgresql-table-design`; see the Removed section above for each), for a table
total of 48 rows.

A 2026-09-04 independent security review measured content similarity directly
against candidate upstreams rather than relying on `gh search code` text-match hits,
and found several of the table's 2026-09-03 resolutions credited a harvester/mirror
repository instead of the true origin. The rows below carry the corrected upstream;
none of the 48 skills were added or removed by the correction, only their
`Upstream found` / `Resolution` columns changed. See the Removed section above for
the one skill (`daily-briefing-builder`) whose corrected origin turned out to be
unlicensed.

| Skill | Upstream found | License | Resolution |
|---|---|---|---|
| accessibility-compliance | wshobson/agents | MIT | credited above |
| anthropic-courses | no upstream found | - | kept, no credit needed |
| anthropic-sdk-php | anthropics/anthropic-sdk-php | MIT | credited above under "Anthropic public materials" (fix pass 7) |
| anthropic-sdk-python | anthropics/anthropic-sdk-python | MIT | credited above under "Anthropic public materials" (fix pass 7) |
| architecture-patterns | wshobson/agents | MIT | credited above |
| async-python-patterns | wshobson/agents | MIT | credited above |
| auth-implementation-patterns | wshobson/agents | MIT | credited above |
| bash-defensive-patterns | wshobson/agents | MIT | credited above |
| bats-testing-patterns | wshobson/agents | MIT | credited above |
| block-no-verify-hook | wshobson/agents | MIT | credited above |
| browser-testing-with-devtools | addyosmani/agent-skills | MIT | credited above (found by 2026-09-04 content-similarity review; the 2026-09-03 sweep found no match) |
| ci-cd-and-automation | addyosmani/agent-skills | MIT | credited above (found by 2026-09-04 content-similarity review; the 2026-09-03 sweep found no match) |
| citation-engine | Anthropic (public citations agent pattern, attribution only) | - | credited above under "Anthropic public materials"; found by 2026-09-04 content-similarity review, byline regex tail fix |
| claude-code-security-review | anthropics/claude-code-security-review | MIT | credited above under "Anthropic public materials" (fix pass 7) |
| claude-cookbooks | no upstream found (a weak text match to an unrelated deep-learning repo was discarded) | - | kept, no credit needed |
| context-driven-development | wshobson/agents | MIT | already credited above (this one already carries the upstream PR credit in `references/artifact-templates.md`) |
| context-engineering | addyosmani/agent-skills | MIT | credited above (found by 2026-09-04 content-similarity review; the 2026-09-03 sweep found no match) |
| cost-aware-routing | no upstream found (a weak text match to an unrelated agent-memory repo was discarded) | - | kept, no credit needed |
| cqrs-implementation | wshobson/agents | MIT | credited above |
| create-agent | gnekt/My-Brain-Is-Full-Crew | unverifiable via GitHub API; MIT per a copyright line in the source | QUARANTINED (non-functional here; see above) |
| daily-briefing-builder | BrianRWagner/ai-marketing-claude-code-skills | none (no license file) | QUARANTINED (verbatim copy of an unlicensed origin; the majiayu000 mirror credited by the 2026-09-03 sweep cannot relicense it; see Removed above) |
| data-storytelling | wshobson/agents | MIT | credited above |
| documentation-and-adrs | addyosmani/agent-skills | MIT | credited above |
| git-workflow-and-versioning | addyosmani/agent-skills | MIT | credited above |
| github-actions-templates | wshobson/agents | MIT | credited above |
| incident-runbook-templates | wshobson/agents | MIT | credited above |
| incremental-implementation | addyosmani/agent-skills | MIT | credited above |
| javascript-testing-patterns | wshobson/agents | MIT | credited above |
| microservices-patterns | wshobson/agents | MIT | credited above |
| modern-javascript-patterns | wshobson/agents | MIT | credited above |
| nextjs-app-router-patterns | wshobson/agents | MIT | credited above |
| nodejs-backend-patterns | wshobson/agents | MIT | credited above |
| performance-optimization | addyosmani/agent-skills | MIT | credited above |
| planning-and-task-breakdown | addyosmani/agent-skills | MIT | credited above (found by 2026-09-04 content-similarity review; the 2026-09-03 sweep found no match) |
| postgresql-table-design | timescale/pg-aiguide (`skills/design-postgres-tables/SKILL.md`) | Apache-2.0 | QUARANTINED (fix pass 7); see Removed above |
| postmortem-writing | wshobson/agents | MIT | credited above |
| python-design-patterns | wshobson/agents | MIT | credited above |
| react-state-management | wshobson/agents | MIT | credited above |
| responsive-design | wshobson/agents | MIT | credited above |
| secrets-management | wshobson/agents | MIT | credited above |
| security-and-hardening | addyosmani/agent-skills | MIT | credited above |
| session-selftest | no upstream found (expected: written for this harness) | - | kept, no credit needed |
| shellcheck-configuration | wshobson/agents | MIT | credited above |
| spec-driven-development | addyosmani/agent-skills | MIT | credited above |
| sql-optimization-patterns | wshobson/agents | MIT | credited above |
| typescript-advanced-types | wshobson/agents | MIT | credited above |
| wcag-audit-patterns | wshobson/agents | MIT | credited above |
| workflow-orchestration-patterns | wshobson/agents | MIT | credited above |

Report a missing or wrong attribution through an issue and it will be corrected.
