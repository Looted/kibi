---
"kibi-core": patch
---

domain-implication findings now come back in a stable order: by subject, property, scope and unit, then by the stronger and the weaker requirement. Before, the order depended on how Prolog happened to compare the witness objects.
