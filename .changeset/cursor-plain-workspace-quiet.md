---
"kibi-cursor": patch
---

The Cursor stop hook no longer sends a follow-up in a workspace that never adopted Kibi (no `.kb/manifest.json`); before, one edit in a plain repository produced a "recorded nothing in the knowledge base" message.
