---
"kibi-core": patch
"kibi-cli": patch
"kibi-runtime": patch
---

A store restored from a snapshot under a graph whose journal file name is too long now moves its triples to the short graph when it is opened, instead of writing new triples to the short graph while the old ones stayed in the long one. `kibi storage compact` now reports an error when no snapshot could be written, instead of reporting success while the journal kept growing; the journal is kept, so no data is lost, and running the compaction again later is safe.
