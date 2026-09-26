# Kibi Tree-sitter plugin

This plugin provides the `kibi.symbol-extractor.v2` capability for Python, Go, and Rust source files. It returns named declaration symbols and explicit `ok`, `partial`, `unsupported`, or `failed` status for the exact source text it receives.

The published package contains its qualified grammar WASM files and upstream tag queries. `web-tree-sitter` is pinned to 0.27.0; Python and Go grammars are pinned to 0.25.0, and Rust to 0.24.0. The catalog records source commits, registry integrity values, parser ABI versions, and hashes for every parser and query asset.

At analysis time the plugin reads only its installed files and source text. It does not download grammars, run compilers, invoke the analyzed program, or load language-specific toolchains. Parsing runs in a worker with bounded input, concurrency, output symbols, V8 heap, stack, and wall-clock time. WebAssembly linear memory is not separately capped, and the worker is not an operating-system sandbox.

`ok` means the selected query found the qualified syntactic declarations; it does not promise the complete runtime symbol set. Macro expansion, Python `exec()`-generated declarations, decorators, metaclasses, generated files outside the analyzed input, and other runtime/dynamic mechanisms are not evaluated. Detected Rust macro invocations and direct Python `exec()` calls return `partial` with explicit uncovered ranges. Unsupported extensions return `unsupported`. Oversize inputs, parser startup errors, and worker timeouts return `failed`. Syntax errors and symbol-limit truncation also return `partial`; they never become an empty successful result.

The initial catalog deliberately covers only Python, Go, and Rust. It does not claim full language semantics, type resolution, macro expansion, or a complete call graph. See [`catalog.json`](./catalog.json), [`integrity.json`](./integrity.json), [`SBOM.spdx.json`](./SBOM.spdx.json), and [`THIRD_PARTY_NOTICES.md`](./THIRD_PARTY_NOTICES.md) for the shipped component record.
