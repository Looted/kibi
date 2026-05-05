---
"kibi-opencode": minor
---

**Keep your knowledge base in sync without thinking about it.** This release makes the OpenCode plugin proactive about file operations — when you create, edit, or delete files, the plugin now nudges you to keep Kibi up to date automatically, rather than waiting for you to remember.

**Smart reminders when files change.** Whenever you create a new source file, the plugin will gently remind you to add the corresponding Kibi entities and traceability links so nothing gets lost. When you edit files that have e2e test coverage, it prompts you to check whether your changes affect existing tests and whether the linked TEST entities need updates. And when you delete a file that implements requirements, it warns you to update Kibi so your documentation doesn't drift out of sync.

**Evidence-driven, not noisy.** E2e reminders aren't guesswork — they look at actual Kibi graph relationships first. If a file has a `covered_by` link to a TEST entity tagged with `[e2e]` or sourced from the e2e directory, that's treated as concrete evidence. Only when exact evidence is absent does it fall back to narrow path heuristics, and even then the wording stays soft and advisory. Package-level umbrella tests never masquerade as file-level evidence, so you won't get false alarms.

**Suppresses intelligently.** Once you've seen a reminder for a particular file in your session, it won't nag you again. Reminders are also posture-aware — they only appear when you're working in a fully initialized Kibi workspace (`root_active` or `hybrid_root_plus_vendored`), staying out of your way during onboarding or in vendored-only mode.

**Background sync covers all lifecycle events.** The plugin's background sync now triggers not just on edits, but on file creation and deletion too. This closes the gap between the prompt advice you see and the actual freshness of your knowledge base, so Kibi stays current without you running manual syncs.

**Everything stays single-block.** All of this fits into the existing one-contextual-block prompt design. There's no second block, no MCP queries during prompt assembly, and no new risk classes — just smarter, lifecycle-aware guidance layered on top of the semantic risk detection you already have.
