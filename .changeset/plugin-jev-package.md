---
"kibi-plugin-jev": minor
---

Projects can optionally augment semantic lane classification with TypeSafe Jev without pulling TypeSafe into the default Kibi install.

- Add optional `kibi-plugin-jev@0.1.0` implementing only `kibi.semantic-classifier.v1`
- Lazy client creation, offline fixtures, and builtin fallback on failure
- Kept out of default `kibi-cli` / `kibi-mcp` dependency trees
