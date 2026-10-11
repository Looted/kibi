---
"kibi-cli": minor
"kibi-mcp": minor
"kibi-core": minor
---

`kb_search` and `kb_check` now say what they did not find as plainly as what they found. A search whose top match is a fact, scenario or test no requirement owns reports it in `answer.ungoverned` and in the note instead of presenting requirements reached through lower-ranked matches as the top match's; a requirement tying with its own scenario or facts no longer counts as ambiguous; a changed file's requirements surface through the symbols that implement them even when the question shares no word with them; and every page says how many rows it `returned` next to the ranking's total `count`. A check reports `evaluated.rules` and, for `domain-contradictions`, the number of requirement fact pairs it compared, so "no violations" on a KB with nothing to compare is never read as a consistency result.

- `intent-search.ts`: `queryAnalysis.topRivalMargin` is the margin between the top match and the best match it is not linked to; `ambiguous` reads it. A requirement that a source-located symbol `implements` inherits that symbol's source evidence (`distance: 3`, reason `implemented at the source location`).
- `search-answer.ts`: `answer.ungoverned` lists matched facts, scenarios, symbols and tests with no owning requirement, with their `rank` and, for typed facts, their `claim` and `ask`; the note leads with the top match when it is one of them.
- `kb_search`: `returned` (rows on this page) beside `count` (matches in the whole ranking).
- `kb_check`: `evaluated: { rules, domainContradictions?: { factPairsExamined } }` in the payload and a summary line; `kb_domain_contradiction_pairs_examined/1` in `kibi-core`.
