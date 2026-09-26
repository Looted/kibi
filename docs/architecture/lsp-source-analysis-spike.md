# LSP source-analysis spike

**Decision:** keep Tree-sitter as the fast, offline source-inventory path. Do not add an always-on or commit-gating LSP manager from this spike. An optional, on-demand LSP adapter is technically viable for reference resolution, but it should be a separate change with explicit process, time, memory, and snapshot boundaries.

## Method

I exercised the existing `vscode-jsonrpc` Node client against pinned Pyright and rust-analyzer binaries. Both servers received LSP `initialize`, `didOpen`, `textDocument/documentSymbol`, and `textDocument/references` messages over stdio. The same fixture texts were passed through the in-progress `createTreeSitterSymbolExtractor()` package factory. The Python and Rust fixtures came from `packages/plugin-treesitter/tests/fixtures/{python/nested-duplicate.py,rust/declarations.rs}`; scratch copies add one `Box.same()` use site so reference resolution has an observable expected result. The Rust fixture also contains a Unicode emoji before a later declaration. No consumer project code was opened or executed.

The client recorded one first request and five sequential warm requests with `performance.now()`. Rust Analyzer received a 500 ms post-open settle interval before its first reference request because its semantic index is asynchronous. RSS was sampled from `/proc` every 10 ms across the LSP client and server process tree (process leaders only); Tree-sitter RSS was sampled every 5 ms for its Node process, including its worker thread. RSS values are sampled peaks, not kernel high-water marks. The Tree-sitter API starts a worker and loads the WASM parser on each analysis call, so its repeated values include that cost.

| Fixture and path | LSP first document symbols / references | LSP warm p50 symbols / references | LSP references for `Box.same` | LSP sampled process-tree peak RSS | Tree-sitter first / repeat p50 | Tree-sitter sampled peak RSS |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Python / Pyright | 627.1 ms / 9.7 ms | 1.7 ms / 2.0 ms | 2 locations | 229,816 kB (server 163,768 kB) | 84.5 ms / 69.7 ms | 89,116 kB (baseline 50,324 kB) |
| Rust / rust-analyzer | 3.6 ms / 4.8 ms* | 0.7 ms / 0.6 ms | 2 locations | 253,064 kB (server 134,464 kB) | 81.5 ms / 73.4 ms | 107,152 kB (baseline 50,376 kB) |

`initialize` response time was 180.3 ms for Pyright and 4.6 ms for rust-analyzer. Rust's first-reference workflow also includes the 500 ms settle interval; the table reports only the subsequent 4.8 ms request latency. Its fixture request returned the method declaration and the single method call; Pyright returned the corresponding Python method definition and call. Neither server confused the same-named `Crate.same` or module-level `same` declarations with the selected class method. Tree-sitter retained these declarations as distinct scoped symbols, but its extractor does not resolve a call to one declaration, so it cannot return an equivalent reference set. Pyright's document symbols also include parameters, while the Tree-sitter inventory intentionally reports declaration symbols. Rust Analyzer reports `impl` containers and methods; Tree-sitter normalizes methods to qualified names such as `Box.same` and `Reader for Box.read`.

The numbers expose the expected tradeoff: LSP warm requests are very fast and add semantic references, but a cold Pyright document-symbol request took about 0.63 s and its client-plus-server RSS peaked around 225 MiB. Rust Analyzer answered quickly after startup and its settle interval, but the whole tree peaked around 247 MiB. Tree-sitter completed each fresh worker analysis in roughly 63–85 ms, with lower memory in these fixtures, and requires no language-server process. These tiny fixtures do not establish large-file or repository-wide performance.

## Runtime and license pins

The spike used Node.js 24.21.0 and these exact package/server artifacts:

- `vscode-jsonrpc` 9.0.1, MIT, npm SRI `sha512-rfuA6T75H6m5EkbhtEPzre9pT0HPcDI2MMy4+nPFIBks5J8JBAUHD4tRYSgaBOijIEC7SRkC1kKyXTLqbmh9jw==`; the package metadata identifies the MIT license and Node stdio client API ([upstream package metadata](https://github.com/microsoft/vscode-languageserver-node/blob/main/jsonrpc/package.json)).
- Pyright 1.1.414, MIT, npm SRI `sha512-FPZZb51jepDX4eP7TEYDeNFtmE3WgwkkEcJpvH3/QmUSsj0EAy3LXu+xB4T/FWDejtsXlCfFr/rbWFjwuwuXww==`; the package provides `pyright-langserver` ([upstream package metadata](https://github.com/microsoft/pyright/blob/main/packages/pyright/package.json), [license](https://github.com/microsoft/pyright/blob/main/LICENSE.txt)).
- rust-analyzer release `2026-09-21`, reported binary version `0.3.3057-standalone`, dual MIT/Apache-2.0; downloaded official x86_64 Linux asset SHA-256 `b2d24ce2bda2ea05b1ad7c2917d205f8111775f703ccd908e6061803ae8257d0` ([release](https://github.com/rust-lang/rust-analyzer/releases/tag/2026-09-21), [MIT](https://github.com/rust-lang/rust-analyzer/blob/master/LICENSE-MIT), [Apache-2.0](https://github.com/rust-lang/rust-analyzer/blob/master/LICENSE-APACHE)).
- Tree-sitter runtime `web-tree-sitter` 0.27.0, MIT, npm SRI `sha512-XK08gj6RwTMQatAG7uVRP8MunqotL/XC19vHgkSPKmELgbGPBj4ECvB8haHOUnyj6ls2B8t42UTro14zxGgAHg==`; Python grammar 0.25.0 (WASM SHA-256 `16108b50df4ee9a30168794252ab55e7c93bfc5765d7fa0aa3e335752c515f47`) and Rust grammar 0.24.0 (WASM SHA-256 `f65f354215611fd94ad34134b3427eb3d58cbb745df7b6509ba722184db73d57`) are MIT. The exact grammar commits, npm SRI values, query hashes, and asset metadata are recorded in [`catalog.json`](../../packages/plugin-treesitter/catalog.json) and checked-in lock/integrity files; upstream grammar sources: [Python](https://github.com/tree-sitter/tree-sitter-python/tree/293fdc02038ee2bf0e2e206711b69c90ac0d413f), [Rust](https://github.com/tree-sitter/tree-sitter-rust/tree/18b0515fca567f5a10aee9978c6d2640e878671a).

For the Rust run, `checkOnSave`, build scripts, and proc macros were disabled using Rust Analyzer's supported settings. The observed process tree still included Cargo metadata and `rustc --print` target/configuration helpers; it did not include a project `cargo check`/`build`, compilation of the fixture, or a build-script process. A standalone Rust server therefore has a larger and more toolchain-dependent process footprint than the parser. Its stderr also contained `WARN notify error: No path was found.` despite returning symbols and the expected references; this spike does not diagnose that warning. Go/gopls was not attempted because `go` was not available in the environment; the required two servers were Pyright and rust-analyzer.

## Reproduction artifacts

Scratch artifacts are under `/tmp/kibi-lsp-spike-0KVYfr/`: `lsp-spike.mjs`, `tree-sitter-run.mjs`, fixture copies, `pyright-final.json`, `rust-final.json`, `tree-python.json`, and `tree-rust.json`. They were not added to the repository.

From that scratch directory, with the pinned Node path:

```sh
LSP_POSITION=call PATH=/home/looted/.nvm/versions/node/v24.21.0/bin:/home/looted/.bun/bin:$PATH \
  node ./lsp-spike.mjs ./fixtures/python python ./fixtures/python/nested-duplicate.py \
  /tmp/kibi-lsp-spike-0KVYfr/node_modules/pyright/langserver.index.js

LSP_POSITION=call PATH=/home/looted/.nvm/versions/node/v24.21.0/bin:/home/looted/.bun/bin:$PATH \
  node ./lsp-spike.mjs ./fixtures/rust rust ./fixtures/rust/src/lib.rs \
  /tmp/kibi-lsp-spike-0KVYfr/rust-analyzer

TREE_LANG=python PATH=/home/looted/.nvm/versions/node/v24.21.0/bin:/home/looted/.bun/bin:$PATH \
  node ./tree-sitter-run.mjs
TREE_LANG=rust PATH=/home/looted/.nvm/versions/node/v24.21.0/bin:/home/looted/.bun/bin:$PATH \
  node ./tree-sitter-run.mjs
```

No persistent LSP integration or release dependency is proposed by this spike.
