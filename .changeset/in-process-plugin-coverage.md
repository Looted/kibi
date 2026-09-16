---
"kibi-codex": patch
"kibi-cursor": patch
"kibi-runtime": patch
---

Plugin hooks, the Cursor MCP launcher, and skill validation now expose the
same entry paths tests already spawn as processes. In-process coverage can
exercise stdin, CLI guards, and realpath failures instead of leaving those
lines invisible to Codecov.

- Export hook CLI helpers and Agent Plugin / launcher internals for tests.
- Use a namespace `fs` import in skill validation so realpath errors are testable.
