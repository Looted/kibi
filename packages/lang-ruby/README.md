# kibi-lang-ruby

The Ruby grammar for [`kibi-plugin-treesitter`](https://www.npmjs.com/package/kibi-plugin-treesitter). It holds data only: the parser WebAssembly and its license. It has no code and no install scripts.

```sh
npm install --save-dev kibi-plugin-treesitter kibi-lang-ruby
```

`kibi-plugin-treesitter` finds this package next to itself, checks every grammar file's SHA-256 against the digest its own release pins, and refuses the file if the digest differs, so a grammar never runs unless it is the one that release was qualified with. Without this package, Ruby files are refused with this install line instead of being skipped. `kibi doctor` names the packs a repository needs.

| File | Extensions | Bytes | SHA-256 |
| --- | --- | --- | --- |
| `tree-sitter-ruby.wasm` | `.rb` | 2106352 | `09a96427d7c72f0613ed470cd9812223fc4a91d6a9c025c0235cc6bd59ff96f4` |

The grammar is [`tree-sitter-ruby`](https://registry.npmjs.org/tree-sitter-ruby/-/tree-sitter-ruby-0.23.1.tgz) 0.23.1, built from [71bd32fb7607](https://github.com/tree-sitter/tree-sitter-ruby/commit/71bd32fb7607035768799732addba884a37a6210), under the MIT license in `LICENSE`. Its tags queries stay in `kibi-plugin-treesitter`, which records their provenance in `catalog.json`.
