---
"kibi-cli": minor
"kibi-mcp": minor
---

`kb_check` no longer reports a bare "No violations found" after a change to code that implements requirements. Its rules compare links, coverage and facts, never code with a requirement's prose, so a change that contradicts a requirement used to pass with "0 violations", and agents read that as permission to keep it.

An impact-enabled `kb_check` (with `sourceFiles`, `includeWorkingTreeDiff` or `staged`) now emits `requirement_statement_unverified` (warning, not blocking) for each current requirement a changed behavioral symbol implements: it names the changed symbols and quotes the requirement's statement with its firmness, and suggests asking the person before keeping a change that contradicts it. The text summary then opens with "No structural violations found" and those requirement ids. A requirement whose own document changed in the same change is left to the firmness and supersede checks; closed, superseded and deprecated requirements are skipped.
