---
"kibi-cli": patch
"kibi-core": patch
---

`kb_search` with `sourceLocations` no longer reads complete entities for every entity in the given files. Results and rankings are unchanged; a file covered by many tests with long proof receipt histories now costs a fraction of the engine output it used to.

Source-located intent candidates use the projected search-candidate rows through the new `kb_list_search_candidates/6` (type, source filter, limit, offset), which applies the same source filter as `kb_query_entities/8`. The separate full-entity source lookup used when a host lacks paged entity queries is removed, so every host loads the same candidate set.
