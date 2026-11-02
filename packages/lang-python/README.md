# kibi-lang-python

The Python grammar for [`kibi-plugin-treesitter`](https://www.npmjs.com/package/kibi-plugin-treesitter). It holds data only: the parser WebAssembly and its license. It has no code and no install scripts.

```sh
npm install --save-dev kibi-plugin-treesitter kibi-lang-python
```

`kibi-plugin-treesitter` finds this package next to itself, checks every grammar file's SHA-256 against the digest its own release pins, and refuses the file if the digest differs, so a grammar never runs unless it is the one that release was qualified with. Without this package, Python files are refused with this install line instead of being skipped. `kibi doctor` names the packs a repository needs.

| File | Extensions | Bytes | SHA-256 |
| --- | --- | --- | --- |
| `tree-sitter-python.wasm` | `.py`, `.pyi` | 457883 | `16108b50df4ee9a30168794252ab55e7c93bfc5765d7fa0aa3e335752c515f47` |

The grammar is [`tree-sitter-python`](https://registry.npmjs.org/tree-sitter-python/-/tree-sitter-python-0.25.0.tgz) 0.25.0, built from [293fdc02038e](https://github.com/tree-sitter/tree-sitter-python/tree/293fdc02038ee2bf0e2e206711b69c90ac0d413f), under the MIT license in `LICENSE`. Its tags queries stay in `kibi-plugin-treesitter`, which records their provenance in `catalog.json`.
