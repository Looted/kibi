---
"kibi-cli": patch
"kibi-runtime": patch
"kibi-mcp": patch
"kibi-claude": patch
---

Several fixes found by evaluating search on a test project. In Claude Code, a `sed -i` whose script contains `|` or `;` now gets its edit context before it runs, as `perl -pi`, `tee` and `>>` already did. A `kb_search` question that names a file path no longer drifts to whatever matches the path's words, and the reply suggests passing the path as `sourceLocations`. A requirement's dangling `text_ref` can be cleared with `kb_upsert` and only its title, status and `text_ref: ""`, without sending its proposition ledger again.

- `commandEditPaths` in the Claude hook looks for `;`, `|`, `&&` and redirections outside quotes only, so a quoted sed script or echoed `>` is no longer cut apart or read as a redirection.
- Intent search removes workspace file paths written in the question from its topic (`questionPaths`), as it already did for `sourceLocations` paths. The search text names such paths and points to `sourceLocations`.
- The answer note says that a fact in `ungoverned` decides nothing and that a governing requirement's fact holds where the two disagree.
- `withStoredRequirementSemantics` keeps the stored ledger when an update changes only `text_ref` and the ledger reads its prose from `semantic_text`. A changed title still has to come with the full contract.
- The `source-path-dangling` suggestion for `text_ref` says how to clear it, and the `kb_upsert` description says an update keeps the properties and relationships it leaves out.
