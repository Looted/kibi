---
"kibi-mcp": patch
---

Semantic advisor suggestions now recognize more real-product phrasing without requiring users to rewrite requirements into catalog-shaped prose. Declarative absence, cap-at numeric limits, disabled-until guards, when/must conditionals, and deduplicated redundant request prose now produce reviewable strict or predicate modeling suggestions.

- Add phrase-variant coverage for `absence_requirement`, strict cap-at properties, `guard`, `conditional_behavior`, and `idempotency_rule`.
- Harden predicate keyword scoring so short keywords match whole words instead of substrings such as `event` inside `prevent`.
- Preserve existing save/navigation ranking with exact commit-action scoring and explicit navigation keyword variants.
