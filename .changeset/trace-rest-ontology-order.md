---
"kibi-cli": patch
---

Ontology pack matches with the same pack, schema and polarity are now ordered by their full argument list, so candidates such as `["a", "bc"]` and `["ab", "c"]` no longer tie and keep whatever order the pack returned them in.
