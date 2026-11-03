---
"kibi-cli": patch
---

Simplify the argument handling of several read-only commands (`kibi query`, `kibi gaps`, `kibi graph`, `kibi coverage --cases`) without changing their output.

Drop redundant guards in the sync extraction step, the printed migration plan record and the ontology-quality threshold reader; behaviour is unchanged.
