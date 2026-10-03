---
"kibi-cli": minor
"kibi-mcp": minor
---

`kb_search` now answers questions. Ask it "how should Kibi handle a detached HEAD?" and it returns the current requirements that govern the topic, what they require to stay true, the decisions behind them and what verifies them, with superseded requirements listed separately so they are never read as current policy.

- The default `rankingMode` is `intent-v1`; pass `rankingMode: "legacy"` for the previous lexical ranking. Question words are ignored, terms are stemmed and weighted by rarity, and superseded, deprecated or rejected entities are ranked lower with a `demoted:` reason. Results flag `ambiguous` when the top matches are too close to call and report `truncated`.
- New `answer` input (default true) adds `data.answer` (`kibi.search-answer.v1`): `governing` requirements with `via`, linked `facts`, `scenarios`, `tests` and `adrs`; `rationale`; `notGoverning` with `supersededBy`; `observations`; a `note` that absence is not evidence. It follows `supersedes` chains to the current requirement and stays under 16 KB.
- Graph links in the answer are discovery, not proof; use `kb_check` and `kb_coverage` for consistency and proof status.
