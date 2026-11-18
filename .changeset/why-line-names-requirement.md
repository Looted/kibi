---
"kibi-agent-core": patch
"kibi-claude": patch
"kibi-codex": patch
"kibi-cursor": patch
"kibi-zcode": patch
"kibi-opencode": patch
---

The `Why:` line of the hooks' edit note now names the requirement its reason belongs to (`Why: ... (REQ-x rationale)`, or `Why: no reason is recorded for REQ-x.`). The line used to follow the whole list of requirements, so it read as the last one's reason. A recorded reason of "Reason not stated", which `why` writes when the person gave none, is no longer shown as a reason with an author and date; the note says no reason is recorded, as `kb_search` already did. When a file's code implements both a requirement and the closed requirement it supersedes, the note lists the current one first and marks the other `(closed, superseded by REQ-y)`.
