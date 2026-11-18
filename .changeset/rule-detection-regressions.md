---
"kibi-agent-core": patch
"kibi-claude": patch
"kibi-codex": patch
"kibi-cursor": patch
"kibi-zcode": patch
"kibi-opencode": patch
---

The prompt-time rule note no longer misses rules about errors or rules stated next to a bug report. A line counts as pasted tool output only in the shape tools print (`TypeError: ...`, `Error: ...`, `java.lang.IllegalStateException: ...`, `WARNING [x] ...`, `at fn (file.ts:3:7)`), so "Error messages must never include the stack trace", "ValidationError must always carry the field name" and "At login (and signup) users must accept the terms" are read as rules again. A bug report's frame applies only to its own clause ("Fix the bug where guests can post; from now on only admins are allowed" states a rule), "I must approve each release" is a rule while "I have to leave soon" is not, and a single-quoted clause that states a rule ("Our policy is 'API keys must never be logged'") is kept.
