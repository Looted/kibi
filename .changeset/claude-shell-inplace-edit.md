---
"kibi-claude": patch
---

An agent that edits a requirement-linked file from the shell now hears what must stay true before the command runs, not after. Before, `sed -i` on a linked file got only the read snippet (or nothing, if the file had been read already), and the requirement's must-keep-true facts arrived in PostToolUse once the edit was done. Now `sed -i`, `perl -i`, a `>` or `>>` redirect into the file, and `tee` get the same edit context an Edit call gets, and the PostToolUse note is not repeated.

Technical summary: `commandEditPaths` (new in `bash-command.ts`) finds the existing files a command writes in place: redirect targets, the file arguments of `sed`/`gsed`/`perl` called with an in-place flag (`-i`, bundled forms such as `-pi`, a backup suffix, `--in-place`) and of `tee`, resolved against the cwd and any `cd` target. The Bash PreToolUse hook returns the edit snippet (or the edit update after a read) for such a file and records it as shown, so `bashChanges` skips it after the command. The bundled `kibi-usage` skill mirror is regenerated (2.16.2).
