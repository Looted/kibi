---
"kibi-codex": patch
"kibi-cursor": patch
"kibi-zcode": patch
"kibi-opencode": patch
---

A shell call that writes firm code in place (`sed -i`, `perl -i`, `>`, `tee`) now gets the firm-requirement notice before it runs on Codex, Cursor, ZCode and OpenCode, as an edit of those files does, read as a whole-file write. Only Claude Code asked before.
