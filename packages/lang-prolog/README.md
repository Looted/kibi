# kibi-lang-prolog

The SWI-Prolog grammar for [`kibi-plugin-treesitter`](https://www.npmjs.com/package/kibi-plugin-treesitter). It holds data only: the parser WebAssembly and its license. It has no code and no install scripts.

```sh
npm install --save-dev kibi-plugin-treesitter kibi-lang-prolog
```

`kibi-plugin-treesitter` finds this package next to itself, checks every grammar file's SHA-256 against the digest its own release pins, and refuses the file if the digest differs, so a grammar never runs unless it is the one that release was qualified with. Without this package, SWI-Prolog files are refused with this install line instead of being skipped. `kibi doctor` names the packs a repository needs.

| File | Extensions | Bytes | SHA-256 |
| --- | --- | --- | --- |
| `tree-sitter-swi_prolog.wasm` | `.plt` | 210131 | `a9872f0369b51c1eed2ef04267382c34aeaeba7c97b6f55b829fbf625bdb22dd` |

The grammar is [`tree-sitter-swi-prolog`](https://registry.npmjs.org/tree-sitter-swi-prolog/-/tree-sitter-swi-prolog-0.1.0.tgz) 0.1.0, built from [f6633ce273a2](https://github.com/Looted/tree-sitter-swi-prolog/tree/f6633ce273a2153636f1f463d41fb43acff7b741), under the MIT license in `LICENSE`. Its tags queries stay in `kibi-plugin-treesitter`, which records their provenance in `catalog.json`.
