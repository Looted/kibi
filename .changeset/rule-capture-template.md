---
"kibi-cli": patch
"kibi-claude": patch
"kibi-codex": patch
"kibi-cursor": patch
"kibi-zcode": patch
---

Agents now get a concrete way to record a rule the person stated, instead of a reminder that is easy to answer with "there was none".

- When a prompt reads as a rule ("must", "never", "from now on", ...) and the session then edits a source file, the hook gives the agent once per session a `kb_upsert` template for that requirement: title, firm, the person's words as origin, the rule as one sentence, and the changed file and function as `implementedBy`. No template is sent once the session has written with `kb_upsert`.
- The Stop reminder quotes the detected rule phrase and asks the agent to record the rule behind it before reporting the work done, or to say in the final report why the phrase is not a rule. Without a rule phrase the reminder is unchanged.
- Claude Code gives the template as context after the edit (after a shell edit only when no other note is due), Codex and ZCode after the edit, and Cursor before it. The `kibi-decisions` skill describes both messages.

The template's `implementedBy` field needs a `kb_upsert` that accepts it.
