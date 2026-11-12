---
"kibi-cli": patch
"kibi-agent-core": patch
"kibi-claude": patch
"kibi-codex": patch
"kibi-cursor": patch
"kibi-zcode": patch
---

Removing the inline `implements` comments that Kibi stopped reading no longer stalls an agent. An edit that only deletes such comments, whole lines or a comment trailing code, is not treated as a change to a firm requirement, so the editor hooks do not ask a person to confirm it, and `kibi migrate` now prints the comment review with its instruction in the migration section instead of counting it in the quality backlog. This covers replacement edits, whole-file writes and `apply_patch` edits in Claude Code, Codex, Cursor and ZCode. Technically: `removesOnlyDeadImplementsComments` in the shared decision guard compares the edit's old and new text line by line, accepting a line whose code is unchanged and whose trailing comment was cut, and for an `apply_patch` envelope accepts only an `Update File` section for the edited file whose removed lines are all such comments and that adds none (never an added, deleted or moved file, and never a patch it cannot parse); any other change in the same edit keeps the confirmation.
