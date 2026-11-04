---
"kibi-cli": patch
---

Simplify the modeling, mutation and proof operation helpers without changing what they return, and pin their behaviour with contract tests. A what-if witness whose `kind` is not a string no longer carries that value through; the parsed witness now leaves `kind` out, as its type promises.
