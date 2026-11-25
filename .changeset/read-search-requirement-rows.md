---
"kibi-agent-core": minor
"kibi-claude": minor
"kibi-antigravity": minor
"kibi-cursor": minor
"kibi-codex": minor
"kibi-zcode": minor
"kibi-opencode": minor
"kibi-vibe": minor
---

Reading or searching linked code now shows the requirements of the code in view in every host. When the agent reads a line range, runs a search, or reads files through the shell (`cat`, `sed -n`, `head`, `tail`, `grep -n`, `rg`), the hook adds one compact row per requirement of the symbols in view (id, firmness, title and the symbol that implements it), the focused symbol's requirements first. A shell command that reads several linked files gets rows from each of them. A search gets rows only when its matches fall inside symbols that implement at most 6 requirements, and shows the 3 with the most matching lines; a file-name search (Glob) gets none. A whole-file read of a file with more than 5 requirements names their ids on one line.

Rows stay small: at most 3 per event (5 for a whole file), at most 10 rows and 2,300 characters per session, and each requirement once per session, counting what Kibi tool results already showed; a firm requirement of the focused symbol is shown once. The one-time search tip is skipped when the first search already shows rows. Codex, ZCode, OpenCode and Vibe, which had no read context before, now add the rows too (ZCode's PreToolUse matcher adds `Read`, `Grep` and `Bash`; Vibe's post_tool hook adds `grep` and `bash`), and Cursor's read snippet after a Read is replaced by the same rows.

Technical summary: new `kibi-agent-core/read-context` (`readContext`, `hookReadRows`, `resolveReadViews`, `searchToolRead`, `globFilter`) and shell read parsing in `kibi-agent-core/bash-command` (`commandReadViews`, `shellToolReadViews`, `shellToolCommand`); each host hook builds its rows with them.
