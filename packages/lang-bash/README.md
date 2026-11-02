# kibi-lang-bash

The Bash grammar for [`kibi-plugin-treesitter`](https://www.npmjs.com/package/kibi-plugin-treesitter). It holds data only: the parser WebAssembly and its license. It has no code and no install scripts.

```sh
npm install --save-dev kibi-plugin-treesitter kibi-lang-bash
```

`kibi-plugin-treesitter` finds this package next to itself, checks every grammar file's SHA-256 against the digest its own release pins, and refuses the file if the digest differs, so a grammar never runs unless it is the one that release was qualified with. Without this package, Bash files are refused with this install line instead of being skipped. `kibi doctor` names the packs a repository needs.

| File | Extensions | Bytes | SHA-256 |
| --- | --- | --- | --- |
| `tree-sitter-bash.wasm` | `.bash`, `.sh` | 1358224 | `8292919c88a0f7d3fb31d0cd0253ca5a9531bc1ede82b0537f2c63dd8abe6a7a` |

The grammar is [`tree-sitter-bash`](https://registry.npmjs.org/tree-sitter-bash/-/tree-sitter-bash-0.25.1.tgz) 0.25.1, built from [801326684a26](https://github.com/tree-sitter/tree-sitter-bash/commit/801326684a26ffc4e749bb016c50c6c30bdfa345), under the MIT license in `LICENSE`. Its tags queries stay in `kibi-plugin-treesitter`, which records their provenance in `catalog.json`.
