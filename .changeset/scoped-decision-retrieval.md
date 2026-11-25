---
"kibi-agent-core": minor
"kibi-cli": patch
---

Adds a scoped decision retriever to `kibi-agent-core` (`kibi-agent-core/retrieval`). It ranks requirements and ADRs as decision cards over an inverted index, credits each decision with the words of the facts it links and the symbols that implement it, and reads no Prolog, so hooks and the MCP server can both call it.

- Scope comes before ranking. A decision is in this workspace when it links to a file that exists here, or when its knowledge source has at least two decisions linked here. A decision linked only to files that are missing here belongs to another scope and is only counted. A source of at least three decisions with none linked here is distant and keeps half its score. Every other decision is unscoped and keeps 85% of its score.
- A superseded decision folds into the current end of its chain. A decision whose title shares at least 80% of its words with a higher-ranked one folds into it, unless either is firm or only one of the two is negated. A folded decision stays listed on its card.
- Each card is one line of at most 300 characters. The result also lists the question's words that no returned decision contains.
- An embedding provider's similarity scores can be fused with the word ranking by reciprocal rank. Without a provider, the ranking uses words alone.

`kb_search` now matches a word and its plural (`tags` and `tag`, `ids` and `id`).

Adds an offline replay harness (`scripts/retrieval-eval/`) with question, holdout, edit and omission case sets. It compares today's search and edit hook with the new retriever.
