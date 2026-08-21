---
"kibi-cli": patch
---

Deleting a relationship authored in a YAML symbol manifest now removes the
matching source declaration as well as the compiled relationship. Unrelated
symbols, relationships, comments, and formatting remain intact, so a later
sync does not recreate the relationship that was deleted.

- Add CST-preserving exact relationship deletion for YAML symbol manifests.
- Fail closed when an authored YAML relationship cannot be parsed or patched,
  and cover source and compiled-delete integration behavior.
