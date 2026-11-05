---
"kibi-cli": patch
---

Bundled skill resources whose name starts with two dots (such as `..notes.md`) are no longer rejected as escaping the skill bundle, and impact analysis of an explicitly named source file such as `..helpers.ts` at the workspace root no longer fails as outside the workspace. An empty `KIBI_KB_PL_PATH` now counts as unset when Kibi loads its Prolog JSON modules and when `kibi check` reads `checks.pl` for its query-plan safety rule, instead of looking for `checks.pl` in the current directory.

The coverage repair plan no longer crashes on an uncovered case whose assumption has no value, or on a proof gap or stage named like a built-in object member (such as `constructor`); such names now fall under manual review.

The operation catalog now rejects an operation that declares the same effect twice; the uniqueness check could never fire before.

Source-backed proofs now read a `tsconfig.json` that has block comments and `paths` patterns such as `"@app/*"` correctly; the comment stripper no longer treats `/*` inside a string as the start of a comment, which dropped the aliases from the import closure. A SQL schema replay keeps foreign keys pointing at a table or column renamed by `ALTER TABLE ... RENAME`, including multi-column keys and keys declared in other tables. A JSON or YAML source path whose list index is out of range now reports that the document has nothing at that path instead of calling it empty.
