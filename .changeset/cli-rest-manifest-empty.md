---
"kibi-cli": patch
---

An empty or `~` symbol manifest is now reported as "No symbols array found in manifest", like any other manifest without a `symbols` list, instead of a "Failed to parse manifest" error carrying a runtime-specific TypeError message.
