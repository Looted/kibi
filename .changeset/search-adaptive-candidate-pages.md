---
"kibi-cli": patch
---

Searching without a type filter works again on large knowledge bases. On this
repository, every untyped `kb_search`, lexical or intent-v1, still failed with
"Query exceeded bounded Prolog output capacity (ENOBUFS)". A single page of 500
requirements and facts with large semantic inventories can exceed the output
bound on its own. Search now shrinks the page when that happens instead of
failing.

- `loadSearchCandidates` halves the page size and retries the same offset when
  a page overflows the bounded Prolog output. It keeps the smaller size for the
  rest of the scan and rethrows only when a single entity overflows on its own
  or the error is not an overflow.
