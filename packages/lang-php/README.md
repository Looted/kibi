# kibi-lang-php

The PHP grammar for [`kibi-plugin-treesitter`](https://www.npmjs.com/package/kibi-plugin-treesitter). It holds data only: the parser WebAssembly and its license. It has no code and no install scripts.

```sh
npm install --save-dev kibi-plugin-treesitter kibi-lang-php
```

`kibi-plugin-treesitter` finds this package next to itself, checks every grammar file's SHA-256 against the digest its own release pins, and refuses the file if the digest differs, so a grammar never runs unless it is the one that release was qualified with. Without this package, PHP files are refused with this install line instead of being skipped. `kibi doctor` names the packs a repository needs.

| File | Extensions | Bytes | SHA-256 |
| --- | --- | --- | --- |
| `tree-sitter-php.wasm` | `.php` | 1058041 | `d4df6a6ff08c87c3ec4f9cbb785fe09998a0cb570e03f57d7b19b3acfb146aa7` |

The grammar is [`tree-sitter-php`](https://registry.npmjs.org/tree-sitter-php/-/tree-sitter-php-0.24.2.tgz) 0.24.2, built from [5b5627faaa29](https://github.com/tree-sitter/tree-sitter-php/commit/5b5627faaa290d89eb3d01b9bf47c3bb9e797dea), under the MIT license in `LICENSE`. Its tags queries stay in `kibi-plugin-treesitter`, which records their provenance in `catalog.json`.
