---
"kibi-claude": patch
"kibi-codex": patch
"kibi-plugin-treesitter": patch
---

The Claude and Codex plugin packages now ship their own license and security policy files, so the terms and the vulnerability reporting route travel with the installed plugin. The tree-sitter analyzer also words one PHP diagnostic without a literal call-syntax example.

Adds `LICENSE` and `SECURITY.md` to both plugin packages' `files`, rewords the PHP `eval` diagnostic message in the analysis worker, and refreshes the integrity manifest and release approval hashes for the rebuilt worker.
