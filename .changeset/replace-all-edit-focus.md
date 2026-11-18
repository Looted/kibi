---
"kibi-agent-core": patch
"kibi-claude": patch
"kibi-codex": patch
"kibi-cursor": patch
"kibi-opencode": patch
"kibi-zcode": patch
---

The edit hooks locate an edit sent with `replace_all` (`replaceAll`) at every place it changes, not only its first match, so a firm symbol touched only by a later match is asked about and shown.
