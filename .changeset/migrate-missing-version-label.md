---
"kibi-cli": patch
---

Show "missing" instead of "invalid (null)" as the starting schema in `kibi migrate --dry-run` and `kibi migrate --yes` output for a legacy layout that has no manifest and records no schema version.
