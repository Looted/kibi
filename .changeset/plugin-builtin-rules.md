---
"kibi-plugin-builtin": patch
---

Simplify the builtin ontology, semantic classifier and vocabulary-alignment helpers by dropping redundant normalization steps and unreachable guards; results are unchanged, and the ontology rule tables, lane selection and subject ranking are now pinned by exact contract tests.
