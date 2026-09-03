<!-- Public edition, adapted from a production agent fleet's rules. Dates generalized; catalysts rewritten generic. -->

# verification.rules.md

> Feedback-loop verification: every deliverable type gets a tool the agent uses to CHECK its own work, then iterate before presenting. Adapted from the observation that giving an agent a tool for feedback on its own work, and letting it iterate two or three times, produces far better results than a single unchecked pass.

## The principle (follow, self-check, correct)

1. **FOLLOW:** execute the task per the relevant skill/pipeline.
2. **SELF-CHECK:** run the deliverable through its verification tool (table below) BEFORE presenting. The check must use a TOOL that observes the actual output, never a re-read of your own intention.
3. **CORRECT:** if the check fails or scores below threshold, fix and re-check. Budget 2-3 iterations. After 3 failed iterations, STOP and escalate with evidence (do not loop).

## Verification matrix (per deliverable type)

| Deliverable | Verification tool | Pass condition |
|---|---|---|
| API create/edit against a third-party service | API readback query of the created/changed entities | Requested state == actual state (status, fields, counts). Report SUCCESS / PARTIAL_SUCCESS / FAILED. |
| Web UI / landing page | A quality-standards audit on the rendered page, THEN a browser screenshot at desktop + mobile widths | Zero unresolved audit findings, visual match to spec/mock, key elements visible above fold, no broken layout. Iterate against the audit + screenshot. |
| Generated images | View the actual rendered file, then re-score against your image-quality gate | All sub-gates pass on the RENDER (not the prompt). Never present an image the agent has not itself viewed. |
| Copy (ads, emails, pages) | Your quality-gate scoring pass | Thresholds per your copy pipeline's final gate step. |
| Code / scripts | Run it: tests, parse/AST validation (each language's own syntax checker), then execute on a sample | Exit 0 + expected output. Scripts are always parse-validated before distribution. |
| Config changes (integrations, settings files) | Read back the live config + a functional probe (one real call through the changed path) | Value persisted AND the probe succeeds. Restart-required configs: verify after restart. |
| Data/reports/scorecards | Re-derive one spot-check number from raw source | Spot-check matches the reported figure. |
| Video/audio deliverables | Play-proof: duration + a HEAD/metadata check on the published asset | Asset exists at destination with correct duration/title. |
| File/storage deliverables | List the destination after write | File present at the exact path with nonzero size. |
| ANY state-mutating write to a third-party API | Immediate GET readback of the EXACT fields just written | Requested value == value the API now returns. A 2xx status is NOT verification  -  an API can return success while silently dropping the write. |

## Hard rules

- A deliverable is NOT "done" until its verification row has run. "I generated it" is not "I verified it."
- The verifier must observe OUTPUT, not intent: view the image, screenshot the page, read back the API, run the script.
- Verification evidence (the readback/screenshot/score) is included in the completion report.
- 2-3 correction iterations max, then escalate with: what was attempted, the failing evidence, options.
- Self-check does not replace a separate review pass for high-stakes work. Self-check catches mechanical failures; separate review catches judgment failures.

## Adopted refinement: gates check the RENDER, not the intent

A quality-gate "pass" requires a MECHANICAL check on the produced artifact (grep/parse/screenshot/readback/AST). A self-asserted "gate passed" with no tool observation does NOT count. This was adopted after a copy pipeline once claimed a formatting rule was satisfied while a mechanical grep found violations still present in the output.

## Adopted refinement: a small context-window check for provider fallback tiers

If your harness supports routing to alternate model providers or context-window declarations, add a mechanical check that reads back the ACTUAL context window a given configuration produces  -  not the value you intended to set. This was adopted after a context-window override was silently ignored for certain model-id shapes, and only a raw readback of the running configuration caught it.

## Cross-references
- `naming.conventions.md`
- `behavioral.rules.md`  -  anti-hollow-code (this rule operationalizes its "verify on inputs not covered" clause)
- `test.expectations.md`  -  build/test discipline (code row above)
