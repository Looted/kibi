---
"kibi-core": patch
"kibi-cli": patch
"kibi-runtime": patch
---

The symbol roles exempt from `symbol-traceability` and `symbol-coverage` (structural, type-shape, config, module) and the extracted kinds that always need an `implements` link (function, class, method, property, accessor) now come from `packages/core/schema/symbol-classification.json`, which generates the `non_behavioral_role/1` and `behavioral_kind/1` facts the checks use, instead of being listed by hand in `kb.pl`. The staged firm-edit gate reads the review states that let a change through from one exported constant. Behavior is unchanged; the sets and constants can now be proved by certificate.
