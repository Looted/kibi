---
"kibi-cli": patch
---

Staged symbol validation now reads a copied file (status `C`) at its new path instead of re-reading the unchanged copy source, so symbols in the copy are checked.
