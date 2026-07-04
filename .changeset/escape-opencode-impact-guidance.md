---
"kibi-opencode": patch
---

OpenCode guidance now emits safer Kibi impact-check snippets for edited source paths and cleaner advisory diagnostics during background maintenance. Paths with quotes or other JSON-sensitive characters are escaped correctly, and advisory failures stay focused on actionable Kibi review work instead of noisy implementation detail.

- JSON-escape edited source paths before embedding them in `kb_check` guidance.
- Clean advisory diagnostic handling in the OpenCode sync scheduler.
- Add regression coverage for source-path escaping and advisory diagnostic quality.
