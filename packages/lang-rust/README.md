# kibi-lang-rust

The Rust grammar for [`kibi-plugin-treesitter`](https://www.npmjs.com/package/kibi-plugin-treesitter). It holds data only: the parser WebAssembly and its license. It has no code and no install scripts.

```sh
npm install --save-dev kibi-plugin-treesitter kibi-lang-rust
```

`kibi-plugin-treesitter` finds this package next to itself, checks every grammar file's SHA-256 against the digest its own release pins, and refuses the file if the digest differs, so a grammar never runs unless it is the one that release was qualified with. Without this package, Rust files are refused with this install line instead of being skipped. `kibi doctor` names the packs a repository needs.

| File | Extensions | Bytes | SHA-256 |
| --- | --- | --- | --- |
| `tree-sitter-rust.wasm` | `.rs` | 1102547 | `f65f354215611fd94ad34134b3427eb3d58cbb745df7b6509ba722184db73d57` |

The grammar is [`tree-sitter-rust`](https://registry.npmjs.org/tree-sitter-rust/-/tree-sitter-rust-0.24.0.tgz) 0.24.0, built from [18b0515fca56](https://github.com/tree-sitter/tree-sitter-rust/tree/18b0515fca567f5a10aee9978c6d2640e878671a), under the MIT license in `LICENSE`. Its tags queries stay in `kibi-plugin-treesitter`, which records their provenance in `catalog.json`.
