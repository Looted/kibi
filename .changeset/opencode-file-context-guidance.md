---
"kibi-opencode": minor
---

Add file-operation guidance for create, edit, and delete operations. The plugin now provides proactive reminders when agents create or edit source files with e2e evidence, and safety checks when deleting files that may implement Kibi requirements. Reminders use exact Kibi graph evidence first (covered_by links to [e2e]-tagged entities or /e2e/-sourced entities) and narrow path heuristics second. Package-level e2e tests do not trigger authoritative evidence flags at the file level. Guidance is suppressed after first occurrence per path per session.
