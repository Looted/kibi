---
"kibi-cli": minor
"kibi-runtime": patch
---

Search works again on a mature knowledge base, and it no longer spends a large share of an agent's context on results it has not chosen yet. Every search used to ask Prolog for up to 100,000 full entity records regardless of the requested limit, so on this repository even `limit: 5` failed outright with a bounded-output error. Results now come back as summaries by default, which cut a five-hit response from 154 KB to 3 KB while keeping ranking, ordering, and totals identical.

- Page indexed candidate retrieval in bounded chunks instead of one unbounded read, fixing the `ENOBUFS` failures without changing the candidate set or ranking.
- Add `fields` to `kb_search`: `summary` (default) returns identifying metadata plus score, reasons, and snippet; `full` returns complete entity bodies as before.
- Teach the bundled `kibi-usage` skill when to select intent-v1 ranking with grounded facets or source locations, and when a literal lexical query is still the right choice.
- Fix an unhandled `EPIPE` between tests when an engine socket write lost its peer.
