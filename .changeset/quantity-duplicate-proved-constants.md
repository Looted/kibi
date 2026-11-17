---
"kibi-cli": patch
---

The numbers the `quantity-duplicate` check treats as too trivial to compare (0 and 1) now come from the exported `TRIVIAL_NUMBERS` list, and both that list and the 0.5 word share that ties two value facts are proved by certificate against the code. Behavior is unchanged.

The cap of 5 related current requirements that a requirement `kb_upsert` lists is now also proved by certificate against `MAX_RELATED_REQUIREMENTS`.
