# kibi-lang-hcl

The Terraform and HCL grammar for [`kibi-plugin-treesitter`](https://www.npmjs.com/package/kibi-plugin-treesitter). It holds data only: the parser WebAssembly and its license. It has no code and no install scripts.

```sh
npm install --save-dev kibi-plugin-treesitter kibi-lang-hcl
```

`kibi-plugin-treesitter` finds this package next to itself, checks every grammar file's SHA-256 against the digest its own release pins, and refuses the file if the digest differs, so a grammar never runs unless it is the one that release was qualified with. Without this package, Terraform and HCL files are refused with this install line instead of being skipped. `kibi doctor` names the packs a repository needs.

| File | Extensions | Bytes | SHA-256 |
| --- | --- | --- | --- |
| `tree-sitter-terraform.release.wasm` | `.tf` | 93876 | `59dbcbb0f08eb78b78f37510834559a48ce5c9d4866c978d62c6390796461cb5` |
| `tree-sitter-hcl.release.wasm` | `.hcl` | 93854 | `2f9acf63e7c263215f283e2cf0f4ebbb9bfa77f58e18fa42b91094be201372a7` |

The grammar is [`@tree-sitter-grammars/tree-sitter-hcl`](https://registry.npmjs.org/@tree-sitter-grammars/tree-sitter-hcl/-/tree-sitter-hcl-1.2.0.tgz) 1.2.0, built from [fad991865fee](https://github.com/tree-sitter-grammars/tree-sitter-hcl/commit/fad991865fee927dd1de5e172fb3f08ac674d914), under the Apache-2.0 license in `LICENSE`. Its tags queries stay in `kibi-plugin-treesitter`, which records their provenance in `catalog.json`.
