---
"kibi-runtime": patch
"kibi-cli": patch
"kibi-mcp": patch
"kibi-codex": patch
"kibi-cursor": patch
---

Kibi now teaches and enforces requirement supersession in one consistent
direction: the replacement points to the requirement it replaces. Reversed
edges can no longer hide a newer contradictory policy merely by making that
newer requirement non-current. Relationship checks also block authored links
that have silently disappeared from compiled knowledge.

- Document `supersedes` as new-to-old across bundled and generated skills.
- Reject reversed supersession when tracked source history proves that the
  purported replacement predates its target.
- Restrict legacy branch migration to literal-to-hashed storage conversion for
  the same exact Git identity; every cross-identity pair is refused.
- Cover exact-Git branch policy conflicts and approved evolution with Prolog
  regression tests.
- Preserve partial-upsert relationship projections and validate
  authored-to-compiled relationship parity.
