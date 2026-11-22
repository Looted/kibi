---
"kibi-cursor": patch
---

The Cursor worktree MCP resolver now recognizes the bundled Windows x64 SWI-Prolog (`kibi-swipl-win32-x64`, which ships `lib/swipl/bin/swipl.exe`) as an available runtime, so a worktree whose only SWI-Prolog is that bundle is no longer rejected as missing one.
