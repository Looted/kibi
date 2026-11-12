---
"kibi-cli": patch
"kibi-agent-core": patch
"kibi-claude": patch
"kibi-codex": patch
"kibi-cursor": patch
"kibi-zcode": patch
---

Removing the inline `implements` comments that Kibi stopped reading no longer stalls an agent. An edit that only deletes such comments is not treated as a change to a firm requirement, so the editor hooks do not ask a person to confirm it, and `kibi migrate` now prints the comment review with its instruction in the migration section instead of counting it in the quality backlog. Technically: `removesOnlyDeadImplementsComments` in the shared decision guard compares the edit's old and new text line by line; any other change in the same edit keeps the confirmation.
