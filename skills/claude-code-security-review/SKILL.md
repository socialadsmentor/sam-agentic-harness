---
name: claude-code-security-review
description: 'Anthropic''s official GitHub Action for automated AI security review on pull requests (github.com/anthropics/claude-code-security-review). Diff-aware: scans only changed files, using semantic reasoning rather than pattern matching. Use when setting up automated security review in CI, reviewing a PR for vulnerabilities, or wiring security scanning into GitHub Actions. Triggers: security review action, PR security scan, automated vulnerability review, github action security.'
---

# Claude Code Security Review - GitHub Action

## Source
- **Repo:** https://github.com/anthropics/claude-code-security-review
- **Blog:** https://www.anthropic.com/news/automate-security-reviews-with-claude-code
- **Type:** GitHub Action for automated security review on PRs

## Features
- **AI-Powered Analysis:** Claude's reasoning detects vulnerabilities with deep semantic understanding
- **Diff-Aware Scanning:** Only analyzes changed files in PRs
- **PR Comments:** Auto-comments on PRs with security findings
- **Contextual Understanding:** Beyond pattern matching - understands code semantics
- **Language Agnostic:** Works with any programming language
- **False Positive Filtering:** Advanced filtering to reduce noise

## Quick Start

Add to `.github/workflows/security.yml`:

```yaml
name: Security Review
on:
  pull_request:
    types: [opened, synchronize, reopened]

jobs:
  security-review:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      pull-requests: write
    steps:
 - uses: actions/checkout@v4
        with:
          fetch-depth: 0
 - uses: anthropics/claude-code-security-review@main
        with:
          anthropic_api_key: ${{ secrets.ANTHROPIC_API_KEY }}
```

## Configuration Options
- `anthropic_api_key` - Required API key
- Can configure severity thresholds, ignore patterns, custom rules

## What It Detects
- Injection vulnerabilities (SQL, XSS, command injection)
- Authentication/authorization issues
- Sensitive data exposure
- Security misconfigurations
- Dependency vulnerabilities
- OWASP Top 10 patterns
