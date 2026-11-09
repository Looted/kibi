---
"kibi-lang-prolog": minor
"kibi-plugin-treesitter": patch
---

`kibi-lang-prolog` ships the `tree-sitter-swi-prolog` 0.1.3 grammar (was 0.1.0), and the plugin's catalog pins it. A parse error from an unknown prefix or postfix operator in a `.pl` or `.plt` file now stays inside its clause, so the predicates after it are still found. Versioning packages now also moves each language pack's `packVersion` pin in the plugin catalog.
