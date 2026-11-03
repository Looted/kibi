---
"kibi-cli": patch
---

Remove unreachable checks and an unused helper from the public check, impact and proof modules, and reuse the working-tree diff instead of running `git diff` twice per changed file; behaviour is unchanged.
