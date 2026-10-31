# Kibi Tree-sitter plugin

This package provides the `kibi.symbol-extractor.v2` capability for Python, Go, Rust, Java, C#, PHP, C, C++, Bash, Ruby, SWI-Prolog, Terraform, and generic HCL source files. It returns syntax-derived declarations with explicit `ok`, `partial`, `unsupported`, or `failed` status for the exact source text it receives.

## Language packs

The Python and SWI-Prolog grammars are built in. Every other grammar ships in its own data-only package, so a project installs only the languages it uses:

| Pack | Languages | Extensions |
| --- | --- | --- |
| `kibi-lang-go` | Go | `.go` |
| `kibi-lang-rust` | Rust | `.rs` |
| `kibi-lang-java` | Java | `.java` |
| `kibi-lang-csharp` | C# | `.cs` |
| `kibi-lang-php` | PHP | `.php` |
| `kibi-lang-c` | C | `.c` (`.h` when C is selected) |
| `kibi-lang-cpp` | C++ | `.cc`, `.cpp`, `.cxx`, `.hh`, `.hpp`, `.hxx` (`.h` when C++ is selected) |
| `kibi-lang-bash` | Bash | `.bash`, `.sh` |
| `kibi-lang-ruby` | Ruby | `.rb` |
| `kibi-lang-hcl` | Terraform, HCL | `.tf`, `.hcl` |

```sh
npm install --save-dev kibi-plugin-treesitter kibi-lang-go kibi-lang-rust
```

A pack holds only the grammar WebAssembly and its license; it has no code and no install scripts. The plugin lists the packs as optional peer dependencies and finds them next to itself. `catalog.json` pins each pack's exact version and each grammar file's size and SHA-256, and the worker checks the bytes before it loads them, so a grammar runs only when it is the one this release was qualified with. A file whose pack is missing or a different version returns `unsupported` with the install line, and a modified grammar file returns `failed`; neither is skipped. `kibi doctor` and `kibi init` name the packs the tracked sources need.

## Analysis

The package contains the Python and SWI-Prolog grammar WebAssembly files and the parser queries for every language. The runtime is `web-tree-sitter` 0.27.0. Catalog metadata records the upstream source commits, registry package integrity, parser ABI, query provenance, and SHA-256 digests. C and C++ header files use explicit language selection because `.h` alone cannot distinguish them. PHP analysis uses the mixed HTML/PHP grammar so declarations around embedded HTML remain visible. The shell catalog covers Bash syntax; `.sh` files use that subset, while a shebang naming a different or unknown interpreter returns `unsupported`.

At analysis time the plugin reads only its installed files, the installed language packs and source text. It does not fetch grammars, run compilers, invoke the analyzed program, load language toolchains, evaluate Terraform, or expand macros. Parsing runs in a small pool of persistent workers (at most four, one fewer than the available CPUs) with bounded input, output symbols, and wall-clock time. Each worker loads a grammar once and serves one file at a time; a worker that times out or fails is replaced, and workers are recycled after 256 analyses. The wall-clock budget is the host-granted `timeoutMs`, capped at 10 seconds. Node workers configure 64 MiB old-generation heap, 16 MiB young-generation heap, and a 4 MiB stack. Bun ignores the Node `resourceLimits` option, so those heap and stack caps are not enforced there; see its [Node compatibility documentation](https://bun.sh/docs/runtime/nodejs-compat). WebAssembly linear memory and total process RSS are not separately capped in either runtime. The worker is not an operating-system sandbox.

`ok` means the selected syntax queries returned supported declaration forms without detected parse or coverage gaps; it is not proof of the complete runtime symbol set. Java, C#, and C++ overload locators preserve source-level parameter spelling; C++ method signatures also include `const`, `volatile`, and ref qualifiers. The analyzer does not resolve aliases, generic substitutions, or language-specific type equivalence. C/C++ includes, conditional compilation, and invoked declaration macros return `partial`; exact prototypes and definitions collapse within one file only when their supported signatures match, while unresolved collisions remain distinct with source-local locators and `partial` status. Python decorators, metaclasses, and `exec()`, Rust macro invocations, duplicate PHP declarations, dynamic Ruby method APIs/redefinitions, and Bash `eval`, sourced files, conditional declarations, and duplicate names also remain explicit partial-analysis cases.

SWI-Prolog analysis returns one `function` symbol per predicate, named by the predicate and located by `Name/Arity` (DCG rules count their two extra arguments). Its span covers the PlDoc block (`%!` lines or a `/** */` comment) directly above the first clause and runs to the last clause, so clauses spread over a file share one span from the first to the last. A `Module:Head` clause for another module is located as `Module:Name/Arity`. Inside a plunit `begin_tests(Unit)` ... `end_tests(Unit)` block, the unit is a `class` symbol, each `test(Name)` or `test(Name, Options)` is a `method` symbol located as `Unit:Name`, and helper predicates are located as `Unit:Name/Arity`. `.plt` files are Prolog; `.pl` is analyzed only when the host selects Prolog, because the extension is shared with Perl. Operators declared with `op/3`, `term_expansion/2` and `goal_expansion/2` are not evaluated; the grammar reads an unknown infix operator at priority 700 and reports other unknown operators as syntax errors.

Terraform and generic HCL output static labeled blocks as `unknown` structural symbols with precise `nativeKind`; Terraform `locals` attributes are `variable` symbols. Provider and `terraform` metadata blocks are omitted. Dynamic/escaped labels, unsupported Terraform block types, nested Terraform blocks, unlabeled generic HCL blocks, and nested HCL blocks are reported as uncovered. These records describe configuration structure and do not imply executable code or proof-bearing functions. HCL labels use JSON-escaped segment identities; source-local suffixes are only a way to preserve colliding declarations, not semantic identities.

## Source proof references

The package also provides `kibi.reference-extractor.v1` for Go, Java, C# and Rust, so Kibi's `references` source-proof reader can list what those files import, call, read from the environment, pass as a first argument, throw and set as a property value. Activate it next to symbol extraction with `"kibi.reference-extractor.v1": { "mode": "augment" }` in the same `kibi.plugins` entry. Files are parsed in the same bounded workers and nothing is compiled or run. Each read is exact or names what it cannot read statically: a name computed at run time, the whole environment, reflection (Go `reflect` calls, Java `Class.forName` and `Method.invoke`, C# `Type.GetType` and `Activator.CreateInstance`), a C# `dynamic` variable or `#if` block, a Rust `#[cfg(...)]` item other than `#[cfg(test)]` (skipped), and, for Rust calls and panics, any macro invocation. A file that does not parse is refused with its line. Kibi uses the extractor in proofs only when the installed package matches its release-qualified closure.

Syntax errors omit damaged candidates and return `partial` while retaining clean declarations. Unsupported extensions return `unsupported`; oversize inputs, parser startup errors, and worker timeouts return `failed`. A valid file with no supported declarations can return an empty `ok` result. See `catalog.json`, `integrity.json`, `SBOM.spdx.json`, and `THIRD_PARTY_NOTICES.md` for the complete shipped component record.
