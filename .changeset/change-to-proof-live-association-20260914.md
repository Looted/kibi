---
"kibi-cli": patch
---

Compile-intent plans now keep each proof-bearing test attached to the scenario IDs it actually verifies, so multiple scenarios cannot silently inherit positional associations. Draft tests default to ancillary integration and internal verification until an author explicitly declares end-to-end consumer evidence, and duplicate or unknown associations remain unresolved.

The change-to-proof evaluator exercises the compile API against an isolated Prolog fixture with independently seeded requirements and contradiction facts. Its search cases exercise the production ranker over fixed fixture entities, including supplied source context and unrelated-source abstention; they do not claim full KB-backed retrieval or independent source discovery.
