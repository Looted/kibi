---
"kibi-cursor": patch
---

Cursor stop hooks no longer inject a long multi-line Kibi freshness reminder after every agent response. Follow-ups are now one line, and most sessions stay silent.

- Track `kb_upsert`, `kb_delete`, and `kb_check` MCP usage during the session.
- Emit no stop follow-up when nothing KB-relevant changed, or when `kb_check` already ran after edits.
- Emit a short summary (`Kibi KB updated (kb_upsert).`) after KB mutations, or a single-line sync nudge when source files changed without KB activity.
- Fix publish workflow to build and pack `kibi-cursor` tarballs before npm publish.
