---
"kibi-cli": minor
"kibi-mcp": minor
"kibi-plugin-sdk": minor
"kibi-runtime": patch
"kibi-plugin-treesitter": patch
"kibi-claude": patch
"kibi-codex": patch
"kibi-cursor": patch
"kibi-zcode": patch
---

Kibi now leaves generated code to its generator. `kibi doctor`, `kibi init` and `kb_plan_bootstrap` no longer ask for grammar packs because of files a tool generated, and the commit gate no longer asks for requirement links on regenerated code. A repository whose `tree-sitter init`, protobuf or bindgen output adds Rust, C++ or Python files no longer needs those packs, unless its KB actually points at one of those files. A project can also turn down a single pack with the new `kibi.declinedLanguagePacks` list in `package.json`, and the doctor line now says which languages a pack is wanted for.

- Files marked `linguist-generated` or `linguist-vendored` in `.gitattributes`, or opening with a generator marker (`@generated`, `Code generated ... DO NOT EDIT`, `auto-generated`), count toward a pack only when a tracked KB file names them (a symbol's `sourceFile`, a proof contract's `files`). The doctor line counts the skipped files and marks a language kept only for the KB as "generated, used by the KB".
- `kibi.declinedLanguagePacks` (validated by `kibi-plugin-sdk` as `kibi-lang-*` names) stops every pack suggestion for that language. Sync and the staged check treat its files as files no plugin reads: coordinates by text match, and a whole-file review instead of the missing-pack block. A generated file whose pack is missing gets the same review. The staged check takes the declined list from the committed configuration, so a pack declined in the same commit as a source change in its language counts from the next commit.
- `kibi check --staged` no longer asks for requirement links on symbols of generated TypeScript or JavaScript files, and no longer warns `staged_file_ownership_missing` for generated files. A file counts as generated when the commit's base marks it: a `package.json` `kibi.generatedPaths` glob (new; `!` patterns mark a path hand-written), `linguist-generated`/`linguist-vendored` in `.gitattributes` (read from the base tree, `linguist-generated=false` respected), or a generator header in the committed version. A generated file that `.kb/symbols.yaml` names, and symbols that already carry a requirement link, stay fully checked. The output lists the exempted files.
- When source proofs are suggested next to symbol-only languages, the line names which languages are for proofs and which for symbols only, and every pack named has its files listed.
- The `kibi-bootstrap` skill (3.19.0) asks about each offered grammar pack and records unwanted ones in `kibi.declinedLanguagePacks`.
