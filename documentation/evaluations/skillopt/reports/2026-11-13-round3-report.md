# Kibi SkillOpt check — 2026-11-13 (relationship direction, repeated rejections, round 3)

## Outcome

Usage telemetry showed three frequent write rejections: `entity_validation_failed` resubmitted about eight times per session, `relationship_source_mismatch`, and `symbol_granularity_violation`. This round tested four kibi-usage edits aimed at them. Only one held up: an agent must not resend a payload that a typed error rejected twice, and must fix the rule and field the error names instead. kibi-usage 2.46.0 ships that sentence, plus a fuller relationship direction table in `resources/relationship-directions.md`.

| Candidate (kibi-usage, development cohort, 20 cells per arm per run) | Baseline | Candidate |
| --- | ---: | ---: |
| 1: all four edits, run 1 | 89.75 | 84.00 |
| 1: all four edits, run 2 | 79.25 | 86.75 |
| 2: candidate 1 plus a `sourceFile` hint, run 1 | 92.75 | 87.75 |
| 2: candidate 1 plus a `sourceFile` hint, run 2 | 80.75 | 78.75 |
| 3: without the split-section edits, run 1 | 87.75 | 86.00 |
| 3: without the split-section edits, run 2 | 90.25 | 69.50 |
| **4: repeated-rejection sentence only, run 1** | **81.75** | **85.50** |
| **4: repeated-rejection sentence only, run 2** | **70.50** | **77.00** |

The candidate the PR ships is candidate 4. It leads the baseline in both runs (81.25 against 76.13 on average). It still fails the no-regression rule on single cells: one `rule-lane-modeling` cell in run 1, and one `fact-predicate-modeling` cell plus one `intent-consult` cell in run 2. In the same runs, the baseline scores between 70.50 and 92.75 with the same skill text, so single-cell swings in these families are noise at two repeats.

## What each edit did

- **Repeated rejections** (kept). `validation-recovery` scored 100 in 7 of 8 candidate runs, against 5 of 8 for the baseline.
- **Relationship direction in the safe workflow** (dropped). In this cohort the sentence did not change `safe-mutation-direction`, which scores 100 in both arms. Candidates 1 and 2 also pointed to the resource file from the workflow. In those runs, 4 of 8 candidate cells of the requirement split case read the parent requirement's `.kb/` file directly, a critical failure; no baseline cell did. Candidate 3 removed the pointer, and its candidate cells still read the file in 3 of 4 cells, against 1 of 4 baseline cells.
- **Version gap** (dropped). No case exercises an old CLI, so the clause cannot be measured here.
- **Searchable titles for split children** (dropped). No case scores titles, and the edit sits in the step where the direct reads happened.

## Kept outside the skill body

`resources/relationship-directions.md` adds rows for `requires_predicate`, `requires_rule`, `assumes`, `depends_on` and `exempts`, and explains `relationship_source_mismatch`: every `from` must equal the entity being written, so the link moves to a write of its source entity. The skill already lists this resource, and no development case loads it.

## Setup

Claude Code host, Haiku 5.5 target at low effort, two repeats per run, 40 target episodes per run. Baseline is the kibi-usage 2.45.0 body on `develop`. Evaluation processes now start with Kibi telemetry turned off, so these runs send no usage events.
