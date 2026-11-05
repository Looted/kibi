---
"kibi-cli": patch
---

Bundled skill resources whose name starts with two dots (such as `..notes.md`) are no longer rejected as escaping the skill bundle, and impact analysis of an explicitly named source file such as `..helpers.ts` at the workspace root no longer fails as outside the workspace. An empty `KIBI_KB_PL_PATH` now counts as unset when Kibi loads its Prolog JSON modules and when `kibi check` reads `checks.pl` for its query-plan safety rule, instead of looking for `checks.pl` in the current directory.

The coverage repair plan no longer crashes on an uncovered case whose assumption has no value, or on a proof gap or stage named like a built-in object member (such as `constructor`); such names now fall under manual review.

The operation catalog now rejects an operation that declares the same effect twice; the uniqueness check could never fire before.
