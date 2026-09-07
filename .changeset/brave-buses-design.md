---
"kibi-core": minor
"kibi-cli": minor
---

The KB check-rule catalog now has a single source of truth. Adding or renaming a validation rule previously required editing three places in lockstep (the TypeScript rule registry, the kb_check input schema, and the Prolog check dispatch) and a missed edit could silently produce a clean-looking check that ran nothing. All rule names, descriptions, enforcement classes, and Prolog predicate mappings are now defined once in `packages/core/schema/rule-registry.json`; a generator emits the TypeScript registry, the kb_check input enum, and the Prolog registry facts, and CI fails when the generated files drift. Selecting an unknown rule name in Prolog now fails loudly with a typed error instead of returning an empty result, and `strict-readiness` — already documented and implemented but missing from the input schema — is now a selectable kb_check rule.
