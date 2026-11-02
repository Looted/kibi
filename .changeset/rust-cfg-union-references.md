---
"kibi-plugin-treesitter": minor
"kibi-cli": patch
"kibi-mcp": patch
"kibi-runtime": patch
"kibi-claude": patch
"kibi-codex": patch
"kibi-cursor": patch
"kibi-zcode": patch
---

Rust source proofs read `#[cfg(...)]`-gated code instead of refusing the whole file. Every gated item is read as if its build compiled it, so an `excludes` or `subset_of` claim holds in every build:

- A name that gated items bind in several ways (`#[cfg(unix)] use std::process as p;` next to `#[cfg(not(unix))] use mycrate::process as p;`) resolves to each binding, and a getter or macro that is standard in only one branch still refuses.
- A gated binding may be left out of a build, so the binding of an outer scope (or another crate) is read too.
- A `cfg_attr` counts as the attributes it applies: `cfg_attr(feature = "serde", derive(Debug))` reads as usual, `cfg_attr(x, tokio::main)` refuses `calls`, and one Kibi cannot split refuses every extract.
- `#[cfg(test)]` items, and the bindings they make, are still skipped, also with a doc comment between the attribute and the item.

Files such as tree-sitter's generated `bindings/rust/lib.rs`, whose query constants are `#[cfg(with_*_query)]`, can now be read. The kibi-usage skill (2.40.2) and the proof docs describe the new reading.
