# kibi-lang-java

The Java grammar for [`kibi-plugin-treesitter`](https://www.npmjs.com/package/kibi-plugin-treesitter). It holds data only: the parser WebAssembly and its license. It has no code and no install scripts.

```sh
npm install --save-dev kibi-plugin-treesitter kibi-lang-java
```

`kibi-plugin-treesitter` finds this package next to itself, checks every grammar file's SHA-256 against the digest its own release pins, and refuses the file if the digest differs, so a grammar never runs unless it is the one that release was qualified with. Without this package, Java files are refused with this install line instead of being skipped. `kibi doctor` names the packs a repository needs.

| File | Extensions | Bytes | SHA-256 |
| --- | --- | --- | --- |
| `tree-sitter-java.wasm` | `.java` | 414641 | `4fdeac4ca6ca089f06c6f7e562abcac1733cd465728cc7031ebb73c2019122c4` |

The grammar is [`tree-sitter-java`](https://registry.npmjs.org/tree-sitter-java/-/tree-sitter-java-0.23.5.tgz) 0.23.5, built from [94703d5a6bed](https://github.com/tree-sitter/tree-sitter-java/commit/94703d5a6bed02b98e438d7cad1136c01a60ba2c), under the MIT license in `LICENSE`. Its tags queries stay in `kibi-plugin-treesitter`, which records their provenance in `catalog.json`.
