<!-- Public edition, adapted from a production agent fleet's rules. Dates generalized; catalysts rewritten generic. -->

# skill-construction.rules.md

> Standards for building skills that do not need patches after first real use. Codified from a post-mortem
> on a large worldview/strategy skill's first real deployment. Five rules. Each prevents a specific
> failure mode that surfaced during real-world use.

## Origin

A large strategy skill shipped with 26+ files, several frameworks, a compliance rail, an application
matrix, and a reference library. On first real use against a real campaign brief, 7 specific gaps
surfaced. All 7 traced back to 5 underlying construction patterns. This file codifies the 5 patterns so
future skill builds do not repeat them.

## Rule 1: Cross-skill integrations must be ACTIVE, not passive references

**The rule.** Every skill that claims to integrate with another skill must specify the exact invocation point inside its own pipeline, the input it passes, the output it expects, and the pass/fail criterion that gates the next step.

**Why.** Passive references ("this skill integrates with X, Y, Z") get listed in skill documentation but never fire at runtime. The agent reads the integration list, does not see an invocation point, and skips the integrated skill entirely. The named quality gate produces zero scoring on real artifacts. The bug compounds across every deliverable that uses the skill.

**How to apply.** For every claimed integration in a skill's "Skill Integrations" section, also write a numbered step in the skill's pipeline that names the integration as an active invocation. Pattern: "Step N. Invoke `<skill-name>` skill. Input: <draft artifact>. Action: <what the integrated skill does>. Output: <what comes back>. Pass/fail: <threshold that must be met before the next step>."

**Example bad.** "This skill orchestrates the following existing skills: A, B, C, D, E, F, G."

**Example good.** "Step 7: Invoke `neuromarketing` skill. Input: the draft artifact text from Step 5. Action: run the 0-10 score per lever across all levers. Output: per-lever score plus total. Pass/fail: minimum total threshold per artifact type. Below threshold = revise the lowest-scoring lever."

## Rule 2: Brand-voice enforcement happens at GENERATION time, not post-hoc cleanup

**The rule.** When a per-client brand-token file exists, every skill that produces copy must embed the brand-voice constraints into its generation prompt before producing any artifact. Forbidden words, forbidden punctuation, signature phrases, sender format, sign-off, CTA style, sentence-length cap. All loaded into the prompt at draft time. Never cleaned up after the fact.

**Why.** Post-hoc cleanup leaves residue. When a skill drafts freely and then strips a forbidden character, the cleanup misses instances embedded inside reference quotes, audit text, debrief sections, and meta-commentary about the artifact. The artifact ships with self-violations inside its own audit trail. The skill produces text that fails the very rule it tries to enforce. This is the single most common failure mode for marketing skills.

**How to apply.** The skill's pipeline must read the brand-token file FIRST. The skill must then construct the generation prompt with those constraints as PRE-CONDITIONS, not as POST-FILTERS. Explicit instruction in SKILL.md: "When the brand file forbids a character or word, the generator must avoid it at draft time. Do NOT generate freely and then strip after the fact."

**Example bad.** "Generate the copy. Then strip the forbidden character per the brand file."

**Example good.** "Read the brand file. Note the forbidden characters and forbidden words. Construct your generation with those constraints active throughout the entire artifact, including audit sections, reference quotes, and meta-commentary. The forbidden character must not appear anywhere in the produced text."

## Rule 3: Marketing-surface skills MUST include an image-creative deployment matrix

**The rule.** Every skill that has an `application-matrix/` folder for marketing surfaces must include an `image-creative-deployment.md` covering: ad image, landing page hero image, email header image, video thumbnail, portrait/founder image, infographic, quote card, carousel slide.

**Why.** Client-facing work ships images at every surface. An image-quality gate (see `creative.rules.md`-equivalent in your own ruleset) is mandatory across all surfaces. A worldview / copy / strategy skill that covers the words but not the images leaves a gap. The team falls back on generic image generation that fails the creative gate. Images get rejected. Deliverables slip.

**How to apply.** When building a skill with an application-matrix folder, the matrix must cover image creative as a peer surface to ad copy, landing page, email, video, sales proposal, brand positioning. Structural template: per-framework visual guidance + image-specific quality test + common failure modes + cross-references to your image-quality gate.

**Example bad.** Application matrix has 6 surface files and no image-creative file. Image generation falls back on generic templates.

**Example good.** Application matrix has 7 surface files. The image-creative file sits alongside the 6 copy surfaces and explicitly cross-references the image-quality gate as the floor.

## Rule 4: Worked examples must be brand-grounded for a real test client, not a hypothetical

**The rule.** Every skill that includes worked examples should default to one real, consistent test client for that fleet  -  real tokens, real offers, real funnel  -  rather than a fresh hypothetical brand every time.

**Why.** Generic worked examples force the reader to mentally translate from a hypothetical brand to their real brand on every read. Translation is lossy. A reader cannot evaluate skill quality against generic examples because there is no quality benchmark for the hypothetical. Brand-grounded examples give a real quality benchmark that can be evaluated immediately, and the worked example can double as a real content asset.

**How to apply.** Pick one default test subject (in this public edition: a neutral placeholder client, "the test client," with a small fictional brand-token set you define once). Real brand tokens for that placeholder. Real offer structure. Real funnel. When a skill needs a second example for diversity (to show the framework on a different kind of brand), include it as a SECONDARY example, never as the primary.

**Example bad.** "Worked example: imagine you are running a bookkeeping SaaS company. Your audience is small-business owners. Your offer is..." (a fresh hypothetical every time, never reused, never benchmarked).

**Example good.** "Worked example: the test client's flagship offer. [Real funnel, real audience, real numbers, defined once and reused across every skill's examples.]"

## Rule 5: Forbidden-words documentation goes in REFERENCE section, not in audit / debrief sections

**The rule.** When a skill needs to document forbidden words for self-audit purposes (the words the skill must never produce), the forbidden-words list lives in a clearly-tagged reference document, not embedded in skill operational text.

**Why.** Listing forbidden words inside an in-skill audit produces self-violations on the audit text itself. If the skill says "never use the word 'transformation'" inside a paragraph that also contains the word 'transformation' for explanatory purposes, the skill's own text fails its own rule. Compliance scanners flag the skill. Audit text becomes a training-data poisoning vector. The skill teaches the agent to use the very words it bans.

**How to apply.** Forbidden-words lists live at `<skill-root>/reference/forbidden-words.md` or in the per-client brand-token file as voice tokens. Operational SKILL.md text references the list by location ("see forbidden-words.md") but does NOT enumerate the words inline. Audit / debrief / failure-mode sections describe the FAILURE PATTERN ("hype-style abstract verbs") not the LITERAL FORBIDDEN STRING.

**Example bad.** SKILL.md Section "What to avoid" contains a literal enumerated list of banned words.

**Example good.** SKILL.md Section "What to avoid" contains: "Never use hype-style abstract verbs or coaching-jargon nouns. Full forbidden-words list at `reference/forbidden-words.md`. The list is enforced at generation time per Rule 2 of this file."

## Cross-references

- A skill-authoring meta-skill, if you have one, should load these 5 standards as a "Skill Construction Standards (lessons from real-use post-mortems)" section.
- `architecture.rules.md`  -  the broader architecture rules. This file is a peer.
- `behavioral.rules.md`  -  the universal quality rules that all client-facing output must follow. This file complements those.
