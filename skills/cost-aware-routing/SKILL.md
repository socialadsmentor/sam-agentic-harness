---
name: cost-aware-routing
description: Model routing by task complexity with cost tracking. Haiku/Sonnet/Opus decision framework.
trigger: /cost, "cost status", "cost summary", "cost routing"
---

# Cost-Aware Routing

Decision framework for routing tasks to the optimal model tier (Haiku/Sonnet/Opus) based on complexity signals. Tracks estimated session cost.

## Trigger

- `/cost status` -- show current session cost estimate
- `/cost summary` -- detailed breakdown by model tier and task type
- Keywords: "cost status", "cost summary", "cost routing"

## Routing Rules

### Tier 1: Haiku (1x cost)
**Use when ALL of these are true:**
- Query is under 30 words
- No complexity signal keywords present
- Task is a lookup, status check, or simple transform
- No files need to be read or modified
- Not client-facing output

**Examples:** "what branch am I on?", "list files in src/", greeting responses, yes/no confirmations

### Tier 2: Sonnet (4x cost)
**Use when ANY of these are true:**
- Standard coding task (read, edit, write files)
- Content generation (non-client-facing)
- Agent spawning for research or exploration
- Multi-step task requiring tool use
- Query over 50 words without Opus signals

**Examples:** Bug fixes, feature implementation, test writing, code refactoring, documentation, research tasks

### Tier 3: Opus (19x cost)
**Use when ANY of these are true:**
- Architecture or system design decisions
- Security review or vulnerability analysis
- Complex debugging requiring deep reasoning
- Client-facing copy (ad copy, emails, landing pages, proposals)
- Multi-agent orchestration planning
- Cross-system integration design
- Conflict resolution between competing approaches

**Examples:** Campaign strategy, landing page copy, security audits, system architecture, proposal writing

## Complexity Signals

These keywords/patterns in a query bump routing one tier up:

```
analyze, debug, investigate, architect, design, strategy,
plan, optimize, refactor, migrate, deploy, security,
review, audit, integrate, client, proposal, campaign
```

## Cost Tracking

### Pricing Ratios (relative)
| Model | Input/1M tokens | Output/1M tokens | Ratio |
|---|---|---|---|
| Haiku 4.5 | $0.80 | $4.00 | 1x |
| Sonnet 4.6 | $3.00 | $15.00 | ~4x |
| Opus 4.6 | $15.00 | $75.00 | ~19x |

### Session Log
Estimated costs are logged to `~/.claude/state/cost-log.json` (the `state` dir is created on first write):

```json
{
  "session_id": "e1e7c72a...",
  "started": "2026-04-07T12:00:00Z",
  "entries": [
    {
      "timestamp": "2026-04-07T12:01:00Z",
      "task": "VPS recon",
      "model": "sonnet",
      "estimated_tokens": {"input": 5000, "output": 2000},
      "estimated_cost_usd": 0.045
    }
  ],
  "totals": {
    "haiku": {"tasks": 3, "cost": 0.012},
    "sonnet": {"tasks": 8, "cost": 0.36},
    "opus": {"tasks": 2, "cost": 1.14},
    "total_usd": 1.512
  }
}
```

## Output Formats

### `/cost status`
```
SESSION COST ESTIMATE
=====================
Session: e1e7c72a (started 2h ago)
Tasks: 13 total

  Haiku:  3 tasks  ~$0.01
  Sonnet: 8 tasks  ~$0.36
  Opus:   2 tasks  ~$1.14
  ----------------------
  Total:           ~$1.51

Current task routing: Sonnet (standard complexity)
```

### `/cost summary`
```
COST BREAKDOWN BY TASK TYPE
============================
Research/Exploration:  5 tasks  Sonnet  ~$0.23
Code Implementation:  3 tasks  Sonnet  ~$0.13
Security Review:      1 task   Opus    ~$0.57
Client Copy:          1 task   Opus    ~$0.57
Status Checks:        3 tasks  Haiku   ~$0.01
                                       ------
                                       ~$1.51

OPTIMIZATION TIPS:
- 2 Sonnet tasks could have been routed to Haiku (simple lookups)
- Estimated savings: $0.08
```

## Integration

- Complements the MSP (Model Scoring Protocol) routing rules in `~/.claude/rules/architecture.rules.md`
- Does NOT override explicit model selections (e.g., `model=opus` in Agent calls)
- Cost log persists across compactions but resets each session
- When spawning subagents, record the model tier used for cost tracking

## Prompt Caching

Always leverage Anthropic's prompt caching for repeated context:
- System prompts with `cache_control: {"type": "ephemeral"}` reduce input costs by ~90% on cache hits
- CLAUDE.md content is automatically cached by the harness
- For agent spawns, front-load shared context to maximize cache reuse
