---
"kibi-core": patch
"kibi-cli": patch
"kibi-mcp": patch
"kibi-runtime": patch
---

`kibi check` and `kb_check` no longer fail when the check result file can't be used. If the temp folder can't be written, or the engine writes the file somewhere the caller can't read (for example a shared engine started from a sandbox), the engine returns the violations directly, as it did before result files existed.
