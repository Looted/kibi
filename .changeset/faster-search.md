---
"kibi-cli": patch
"kibi-core": patch
---

`kibi search` and `kb_search` answer faster on large knowledge bases, with the same results. On this repository's own KB a warm search takes about half as long as before.

- The answer's contradiction and scenario checks no longer repeat whole-KB work for every requirement they report on: infeasible scenarios are analysed once per answer, and contradiction partners come from a predicate index kept per KB generation.
- Later pages of a candidate query reuse the ids the first page matched instead of scanning the token index again, until the next write.
- The graph around the results is read with one indexed relationship query that compares edge ends before decoding them.
- Markdown bodies are read synchronously, engine rows are parsed by slicing instead of character-by-character concatenation, and the CLI compiles its input validator once per call.
- Each entity's search tokens are kept between calls in the private engine runtime directory, keyed by the text they came from; set `KIBI_SEARCH_TOKEN_CACHE=0` to turn this off.
