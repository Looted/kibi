# kibi-lang-cpp

The C++ grammar for [`kibi-plugin-treesitter`](https://www.npmjs.com/package/kibi-plugin-treesitter). It holds data only: the parser WebAssembly and its license. It has no code and no install scripts.

```sh
npm install --save-dev kibi-plugin-treesitter kibi-lang-cpp
```

`kibi-plugin-treesitter` finds this package next to itself, checks every grammar file's SHA-256 against the digest its own release pins, and refuses the file if the digest differs, so a grammar never runs unless it is the one that release was qualified with. Without this package, C++ files are refused with this install line instead of being skipped. `kibi doctor` names the packs a repository needs.

| File | Extensions | Bytes | SHA-256 |
| --- | --- | --- | --- |
| `tree-sitter-cpp.wasm` | `.cc`, `.cpp`, `.cxx`, `.hh`, `.hpp`, `.hxx` | 3434931 | `174eb0deb75b2ec7881bcacda9f995648d8e683956e5c2267e69ab6dc503fcbf` |

The grammar is [`tree-sitter-cpp`](https://registry.npmjs.org/tree-sitter-cpp/-/tree-sitter-cpp-0.23.4.tgz) 0.23.4, built from [f41e1a044c8a](https://github.com/tree-sitter/tree-sitter-cpp/commit/f41e1a044c8a84ea9fa8577fdd2eab92ec96de02), under the MIT license in `LICENSE`. Its tags queries stay in `kibi-plugin-treesitter`, which records their provenance in `catalog.json`.
