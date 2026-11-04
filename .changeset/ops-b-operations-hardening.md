---
"kibi-cli": patch
---

Simplify the modeling, mutation and proof operation helpers without changing what they return, and pin their behaviour with contract tests. Fixes: a predicate schema whose argument is named like an object built-in (`constructor`, `toString`) no longer crashes argument-vocabulary checks, and an argument named `__proto__` keeps its declared constants; predicate argument binding no longer crashes when a candidate value or argument name is an object built-in such as `constructor`; a what-if witness whose `kind` is not a string now leaves `kind` out, as its type promises.
