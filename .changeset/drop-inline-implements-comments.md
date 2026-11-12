---
"kibi-cli": minor
"kibi-core": patch
"kibi-plugin-builtin": minor
"kibi-plugin-treesitter": minor
"kibi-plugin-sdk": patch
"kibi-opencode": minor
"kibi-cursor": patch
"kibi-claude": patch
"kibi-codex": patch
"kibi-zcode": patch
"kibi-runtime": patch
---

Kibi no longer reads `// implements REQ-...` comments in source code as traceability links. The symbol manifest (`.kb/symbols.yaml`) is now the only record of which requirements a symbol implements, so a comment can no longer pass `kibi check --staged` on its own, and a stale comment can no longer hide that the manifest links a symbol to something else. `kibi migrate` lists the comments left in your repository so you can move each link that still holds into the manifest and delete the comment.

- `kibi check --staged` takes a changed symbol's requirement links only from the manifest. Before, a leading `implements` comment replaced the manifest links of that symbol for the staged gate. The failure message no longer suggests writing a comment.
- The ts-morph and tree-sitter extractors no longer collect comment text. `SourceSymbolAnalysis.directiveText` in `kibi-plugin-sdk` is deprecated and ignored by every host; extractors that still send it keep validating.
- OpenCode's risk classifier counts a code file as traced when a manifest symbol of that file has an `implements` link, not when the file contains an `implements` comment. Cursor's post-edit guidance, the bundled skills, `AGENTS.md`-style guidance and the docs no longer recommend comments.
- `kibi migrate` adds one `review_inline_implements_comment` review action that lists each comment's file, line, the ids it names and `manifestLinked` (ids a manifest symbol of the same file already implements). It never edits source code.

## Migration

This is a hard change: a commit that touches a symbol whose only requirement link was a comment now fails `kibi check --staged` with "fewer than 1 requirement link(s)".

1. Run `kibi migrate` (or `kibi migrate --format json`) and open the `review_inline_implements_comment` action.
2. For each listed comment whose `manifestLinked` does not cover every id it names, and whose code still implements that requirement, add the link with `kb_upsert` (CLI: `kibi upsert --input -`): the symbol's `title`, `sourceFile` and `implements -> REQ-...`.
3. Delete the comments. They have no effect any more.
