---
"kibi-cli": minor
"kibi-core": minor
"kibi-mcp": minor
"kibi-plugin-sdk": minor
"kibi-plugin-builtin": minor
"kibi-runtime": patch
"kibi-claude": patch
"kibi-codex": patch
"kibi-cursor": patch
"kibi-zcode": patch
---

`kibi check --staged` now judges a commit only on the declarations it adds or changes. Onboarding records the code that decides each behavior, not every declaration, so most files keep declarations without a `.kb/symbols.yaml` record. The gate used to demand a record for every declaration in each staged file, so a correct one-function change was refused over neighbours the commit never touched.

- A declaration is in the change when its title is new or its text differs from the base commit after comments and whitespace are stripped. A line inside a method changes the method, not its class. A renamed file is compared with its old path; a copied or added file has no base, so every declaration in it is judged.
- `symbols_manifest_stale` and `kibi_impact_evidence_missing` block on a missing record only for a declaration the commit adds or changes or whose record it removes, and on an orphaned record only when the commit removes or renames its declaration or adds or changes that record. Every gap the commit creates still blocks.
- Untouched unrecorded declarations print one non-blocking `Symbol records:` line per file that says no action is required, and appear in the JSON output as `inheritedSymbolGaps`.
- An unscoped `kibi check` (and `kb_check`) reports the unrecorded declarations of files that have at least one symbol record, per file and as a total, in the text summary and as `symbolDebt` in JSON. It never blocks; rule- or file-scoped checks do not compute it.
- `symbol-traceability` and `symbol-coverage` no longer flag a symbol whose `symbol_role` is structural, type-shape, config or module and that has no `implements` link, so a schema constant or a type no longer needs an invented requirement link. The staged link rule accepts such a record for a changed declaration unless its kind is function, class, method, property or accessor, or it is a variable whose value is a function.
- The TypeScript extractor marks a variable whose value is an arrow or function expression (also through parentheses, `as`, `satisfies` or `!`, or as an inline argument of a plain function call) with `callable: true`; `kibi-plugin-sdk` accepts the new optional `callable` field on source analysis v2 symbols.
- The `kibi-bootstrap` skill states the staged symbol rule at close-out and reports the repository's unrecorded-declaration total as not blocking, without a bulk backfill unless asked. `kibi-commit-review` describes the change-scoped judgement.

No configuration and no migration: the check narrows, it does not change what a recorded declaration needs.
