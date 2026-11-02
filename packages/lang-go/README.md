# kibi-lang-go

The Go grammar for [`kibi-plugin-treesitter`](https://www.npmjs.com/package/kibi-plugin-treesitter). It holds data only: the parser WebAssembly and its license. It has no code and no install scripts.

```sh
npm install --save-dev kibi-plugin-treesitter kibi-lang-go
```

`kibi-plugin-treesitter` finds this package next to itself, checks every grammar file's SHA-256 against the digest its own release pins, and refuses the file if the digest differs, so a grammar never runs unless it is the one that release was qualified with. Without this package, Go files are refused with this install line instead of being skipped. `kibi doctor` names the packs a repository needs.

| File | Extensions | Bytes | SHA-256 |
| --- | --- | --- | --- |
| `tree-sitter-go.wasm` | `.go` | 217182 | `9504573f352b20be7f2f1911754d710622aedc15afff16d5ed8fb5645681aee7` |

The grammar is [`tree-sitter-go`](https://registry.npmjs.org/tree-sitter-go/-/tree-sitter-go-0.25.0.tgz) 0.25.0, built from [1547678a9da5](https://github.com/tree-sitter/tree-sitter-go/tree/1547678a9da59885853f5f5cc8a99cc203fa2e2c), under the MIT license in `LICENSE`. Its tags queries stay in `kibi-plugin-treesitter`, which records their provenance in `catalog.json`.
