---
"kibi-agent-core": patch
"kibi-claude": patch
"kibi-codex": patch
"kibi-cursor": patch
"kibi-opencode": patch
"kibi-zcode": patch
---

The edit hooks recognize more shell edits of a file: a `cd` inside a quoted `bash -c` script, subshells and `{ ...; }` groups, `if`/`then` and loop bodies, the `time`, `timeout <duration>`, `xargs` and `!` prefixes, and the `>|`, `&>` and `&>>` redirections.
