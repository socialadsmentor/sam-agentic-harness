---
name: eval-set
description: The regression eval set for the self-harness loop's Stage 3 (Proposal Validation). Fresh, neutral starter set for a new install -- replace and extend with your own harness's real failure modes over time. This is the load-bearing part of the loop; a weak eval set turns Stage 2 into a rule-writing machine instead of a validation gate.
type: reference
---

# Eval set

Each case is a `checkId` plus a `good/` and `bad/` fixture pair under
`fixtures/<CASE_ID>/`. `run-eval.cjs` runs the named check against both
fixtures: a passing case means the check reports PASS on `good/` and FAIL on
`bad/`. A case that cannot tell the two apart is not testing anything and
should be rewritten or dropped, not kept for the count.

Each run's result JSON is written to `os.tmpdir()/sam-agentic-harness-eval-results/`
by default (outside the repo, so a plain `node run-eval.cjs` never writes into
a shipped/installed copy of this project). Pass `--results-dir <dir>` to pin
it somewhere else, e.g. for CI artifact capture.

| Case | Check | What it proves |
|---|---|---|
| E1 | `parse_js` | A syntactically broken `.js`/`.cjs` file is caught before it ships; a valid one is not flagged. |
| E2 | `no_em_dash` | Copy containing an em-dash (U+2014) is caught; copy without one passes. |
| E3 | `readback_after_write` | A write is verified by reading the value BACK from where it landed, not by trusting a success return -- the case's `bad/` fixture is a write whose readback does not match what was requested (memory-integrity.rules.md rule 2: a 2xx is not verification). |

## Fixture format

```
fixtures/E1/good/case.js       # parses cleanly
fixtures/E1/bad/case.js        # has a syntax error
fixtures/E2/good/copy.txt       # no em-dash
fixtures/E2/bad/copy.txt        # contains an em-dash
fixtures/E3/good/write.json     # {"requested": "x", "written_back": "x"}
fixtures/E3/bad/write.json      # {"requested": "x", "written_back": "y"}
```

## Adding a case

1. Pick a real, recurring failure mode from a Weakness Report cluster (`self-harness-mine.cjs` output), never a hypothetical one.
2. Write a `good/` fixture that should pass and a `bad/` fixture that should fail the SAME check.
3. Add a row to the table above. No registration step is needed in `run-eval.cjs`: it auto-discovers every case by scanning `fixtures/` for a subdirectory containing a `case.json`.
4. Run `node run-eval.cjs --swap <id>` to prove the runner is not vacuously green: swapping the fixtures must flip the result.
5. Keep a few cases unseen by whoever is proposing edits, so Stage 3 cannot be gamed by writing the proposal to fit the eval set you already know about.
