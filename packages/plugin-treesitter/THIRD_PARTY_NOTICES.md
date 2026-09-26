# Third-party notices

The following third-party components are included or required by `kibi-plugin-treesitter` 0.1.1. Their license texts are copied into [`licenses/`](./licenses/), and exact package/source versions and file hashes are listed in [`catalog.json`](./catalog.json) and [`integrity.json`](./integrity.json).

- `web-tree-sitter` 0.27.0, the runtime used to load parser ABI 13–15 grammars: MIT. See `licenses/web-tree-sitter-MIT.txt`.
- `tree-sitter-python` 0.25.0, including its prebuilt Python parser and upstream `queries/tags.scm`: MIT. Its bundled external scanner is `src/scanner.c` from the same pinned source commit and is covered by that repository license. See `licenses/tree-sitter-python-MIT.txt`.
- `tree-sitter-go` 0.25.0, including its prebuilt Go parser and upstream `queries/tags.scm`: MIT. This release contains no external scanner. See `licenses/tree-sitter-go-MIT.txt`.
- `tree-sitter-rust` 0.24.0, including its prebuilt Rust parser and upstream `queries/tags.scm`: MIT. Its bundled external scanner is `src/scanner.c` from the same pinned source commit and is covered by that repository license. See `licenses/tree-sitter-rust-MIT.txt`.

The upstream Python, Go, and Rust `queries/tags.scm` files are copied from each grammar's exact pinned source commit. The Rust catalog also ships a small Kibi-authored overlay for trait method signatures omitted by the upstream tags query. The Tree-sitter runtime and all three grammar repositories publish the MIT license. The scanner status is recorded per grammar rather than inferred from the grammar count.
