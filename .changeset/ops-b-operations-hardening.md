---
"kibi-cli": patch
---

Simplify the modeling, mutation and proof operation helpers without changing what they return, and pin their behaviour with contract tests. Fixes: a predicate schema whose argument is named like an object built-in (`constructor`, `toString`) no longer crashes argument-vocabulary checks, and an argument named `__proto__` keeps its declared constants; predicate argument binding no longer crashes when a candidate value or argument name is an object built-in such as `constructor`; a what-if witness whose `kind` is not a string now leaves `kind` out, as its type promises.

The regex proof kind now refuses three patterns the real engines reject instead of deciding them: a lone `{` or an escaped `\-` outside a class in a JavaScript pattern with the `u` flag, and a Python pattern with both the `a` and `u` flags.
