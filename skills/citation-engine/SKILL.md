---
name: citation-engine
description: Post-processing skill that adds accurate citations to research reports and content without modifying the source text. Ensures claims are attributed to sources, improves trust and credibility. Based on Anthropic's citations agent pattern.
argument-hint: "[report text + source documents]"
---

# Citation Engine

Add accurate, trust-building citations to any synthesized content. Zero modification to source text - only adds attribution markers.

## When This Triggers
- After `parallel-researcher` or `deep-research-agent` produces a report
- User asks to "add citations", "add sources", "attribute claims"
- Any research deliverable that needs source attribution
- Content that will be client-facing and needs credibility
- Blog posts, white papers, or reports based on research

## When NOT to Use
- Internal notes or working documents
- Creative copy (ads, emails) - citations break the flow
- Content based entirely on the LLM's training data (no external sources to cite)

## Citation Rules

### What to Cite
- Key facts, statistics, and data points
- Specific claims that readers would want to verify
- Conclusions drawn from external sources
- Quotes or paraphrased expert opinions
- Anything that adds credibility when attributed

### What NOT to Cite
- Common knowledge ("the sky is blue")
- The author's own analysis or opinions
- Transitional phrases or structural text
- Every single sentence (over-citation reduces readability)

### Citation Quality Standards

1. **Cite meaningful semantic units** - complete thoughts, not fragments
 - GOOD: "Revenue grew 23% year-over-year to $4.2B in Q3 2025.[1]"
 - BAD: "Revenue[1] grew 23%[2] year-over-year[3]"

2. **Minimize sentence fragmentation** - prefer end-of-sentence citations
 - GOOD: "The company expanded into three new markets and hired 200 employees.[1]"
 - BAD: "The company expanded into three new markets[1] and hired 200 employees[1]."

3. **No redundant citations** - one citation per source per sentence max
 - If multiple claims in one sentence come from the same source, cite once at the end

4. **Placement matters** - citation goes after the period for full-sentence claims, after the clause for mid-sentence attributions

## Process

### Step 1: Inventory Sources

Before adding any citations, catalog all available sources:

```
SOURCE INVENTORY
[1] {title/URL/description} - {type: web, doc, API, database}
[2] {title/URL/description} - {type}
[3] {title/URL/description} - {type}
...
```

### Step 2: Claim Mapping

Read through the report and identify citable claims:

```
CLAIM MAP
- Paragraph 1, Sentence 2: "{claim text}" → Source [2] (direct support)
- Paragraph 1, Sentence 4: "{claim text}" → Source [1] (partial support)
- Paragraph 3, Sentence 1: "{claim text}" → No source (author analysis - skip)
- Paragraph 3, Sentence 3: "{claim text}" → Sources [1] + [3] (corroborated)
```

### Step 3: Apply Citations

**CRITICAL CONSTRAINT:** The source text MUST remain 100% identical. Only add citation markers.

Citation format options (match the output format):

**Markdown (default):**
```markdown
Revenue grew 23% year-over-year to $4.2B in Q3 2025.[[1]](#source-1)
```

**Numbered inline:**
```
Revenue grew 23% year-over-year to $4.2B in Q3 2025.[1]
```

**Footnote style:**
```
Revenue grew 23% year-over-year to $4.2B in Q3 2025.¹
```

### Step 4: Source List

Append a sources section at the end:

```markdown
## Sources

1. [Source title](URL) - accessed {date}
2. [Source title](URL) - accessed {date}
3. {Document name}, {author}, {date}
```

### Step 5: Verification

After adding citations, verify:
- [ ] Source text is 100% unmodified (diff check)
- [ ] Every citation has a corresponding entry in the sources list
- [ ] No source is cited that doesn't actually support the claim
- [ ] No over-citation (aim for 1 citation per 2-4 sentences, not every sentence)
- [ ] Citation placement doesn't break sentence flow

## Source Quality Flags

When adding citations, flag source quality issues:

| Flag | Meaning | Action |
|------|---------|--------|
| `[verified]` | Primary source, directly supports claim | Cite normally |
| `[aggregated]` | Secondary source (news article citing another source) | Note in sources list |
| `[speculative]` | Source uses "could", "may", predictions | Add qualifier in text or footnote |
| `[dated]` | Source is >12 months old | Note date prominently |
| `[conflicting]` | Multiple sources disagree | Cite both, note disagreement |

## Output Format

```
CITATION REPORT
===============
Total claims identified: {n}
Claims cited: {n}
Claims skipped (common knowledge/analysis): {n}
Sources used: {n} of {total available}
Quality flags: {any issues noted}

[CITED DOCUMENT]
{full text with citations added}

[SOURCES]
{numbered source list}
```

## Integration with Other Skills

- **parallel-researcher** → produces report → **citation-engine** adds attribution
- **content-research-writer** → draft content → **citation-engine** adds credibility layer
- **evaluator-optimizer** → citation-engine output can be evaluated for citation quality
- **blog/SEO content** → citations improve E-E-A-T signals (expertise, authority, trust)

## Anti-Patterns

1. **Citing everything** - over-citation makes text unreadable and signals insecurity
2. **Citing without verifying** - never cite a source you haven't confirmed supports the claim
3. **Modifying source text** - the ONLY change is adding citation markers
4. **Citing yourself** - don't cite "as analyzed above" or self-referential claims
5. **Missing source list** - every citation MUST have a corresponding entry
