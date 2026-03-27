---
"kibi-mcp": patch
---

Fix MCP discovery and checks module resolution for installed package layouts

Unify `resolveCorePlPath()` to derive peer Prolog modules (discovery.pl, checks.pl)
from `path.dirname(resolveKbPlPath())` instead of using an independent `require.resolve()`
call that can resolve to a different physical `kibi-core` tree in nested `node_modules`
layouts. This fixes `kb_graph`, `kb_coverage`, and `kb_find_gaps` failing with
`discovery.pl` module-load errors when npm hoists packages into separate trees.
