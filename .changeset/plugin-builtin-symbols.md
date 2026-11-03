---
"kibi-plugin-builtin": patch
---

The v2 symbol extractor now reports a failed analysis when walking the members of an exported class throws, instead of silently dropping those members; class expressions already behaved this way. Workspace source paths whose real path is a file or folder inside the root that merely starts with two dots (such as `..config.ts`) are no longer rejected as escaping the workspace.
