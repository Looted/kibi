---
"kibi-plugin-treesitter": patch
---

Pin `kibi-lang-prolog` 1.1.0, which ships the `tree-sitter-swi-prolog` 0.1.3 grammar. A parse error from an unknown prefix or postfix operator in a `.pl` or `.plt` file now stays inside its clause, so the predicates after it are still found.
