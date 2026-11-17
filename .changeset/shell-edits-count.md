---
"kibi-agent-core": minor
"kibi-claude": patch
"kibi-codex": patch
"kibi-zcode": patch
---

Codex and ZCode now count a shell in-place edit (`sed -i`, `perl -i`, `>`/`>>` redirections, `tee`) as a source edit, as Claude already did, so the end-of-session capture request and freshness reminder also follow edits made through the shell. The shell edit parser moved into kibi-agent-core (`kibi-agent-core/bash-command`) and is shared by all three hosts.
