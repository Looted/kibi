---
"kibi-cli": patch
---

Bundled skill resources whose name starts with two dots (such as `..notes.md`) are no longer rejected as escaping the skill bundle, and impact analysis of an explicitly named source file such as `..helpers.ts` at the workspace root no longer fails as outside the workspace. An empty `KIBI_KB_PL_PATH` now counts as unset when Kibi loads its Prolog JSON modules.
