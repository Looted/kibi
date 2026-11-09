# kibi-lang-prolog

The SWI-Prolog grammar for [`kibi-plugin-treesitter`](https://www.npmjs.com/package/kibi-plugin-treesitter). It holds data only: the parser WebAssembly and its license. It has no code and no install scripts.

```sh
npm install --save-dev kibi-plugin-treesitter kibi-lang-prolog
```

`kibi-plugin-treesitter` finds this package next to itself, checks every grammar file's SHA-256 against the digest its own release pins, and refuses the file if the digest differs, so a grammar never runs unless it is the one that release was qualified with. Without this package, SWI-Prolog files are refused with this install line instead of being skipped. `kibi doctor` names the packs a repository needs.

| File | Extensions | Bytes | SHA-256 |
| --- | --- | --- | --- |
| `tree-sitter-swi_prolog.wasm` | `.plt` | 224810 | `9b063a2187a58920bab166b379bde18cf20533d8f376f9d2602c9de58e00761a` |

The grammar is [`tree-sitter-swi-prolog`](https://registry.npmjs.org/tree-sitter-swi-prolog/-/tree-sitter-swi-prolog-0.1.3.tgz) 0.1.3, built from [1731abe28070](https://github.com/Looted/tree-sitter-swi-prolog/tree/1731abe280700caa64de897e790bdc15c0a00e40), under the MIT license in `LICENSE`. Its tags queries stay in `kibi-plugin-treesitter`, which records their provenance in `catalog.json`.
