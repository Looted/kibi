# Qualified language catalog

The source-analysis host uses the same v2 contract for every parser. Language
classification identifies a supported syntax or an explicit file-level scope;
it does not grant requirement ownership or executable proof. The installed
Tree-sitter package supplies its grammars and queries offline. It never runs
the analyzed program, a compiler, or Terraform.

## Analysis scope

| Input | Qualified scope | Explicit limits |
| --- | --- | --- |
| JavaScript, TypeScript, JSX, TSX | Existing builtin exported declarations | Historical export scope; private helpers are not a complete runtime inventory |
| Python | Classes, functions, methods and nested declaration locators | Decorators, metaclasses and `exec` remain partial |
| Go | Functions, receiver methods and declared types | Syntax inventory, without compiler type resolution |
| Rust | Modules, types, traits and methods | Macro invocations remain partial; no expansion |
| Java | Packages, nested types, constructors and methods | Signatures preserve source spelling, without type equivalence or generic substitution |
| C# | Namespaces, types, constructors, finalizers, methods and properties | Syntax inventory, without compiler type resolution |
| PHP | Mixed HTML/PHP declarations, namespaces and methods | Includes, dynamic evaluation and duplicate declarations remain partial |
| C, C++ | Declared types, functions, methods, prototypes, C++ destructors and overloads | Includes, conditional compilation, macros and unresolved collisions remain partial |
| Bash | Explicit Bash functions | Other shell dialects have file-level scope; dynamic evaluation, sourcing and conditional definitions remain partial |
| Ruby | Modules, classes and explicit methods | Dynamic method APIs and redefinitions remain partial |
| Terraform, HCL | Static labeled root blocks; Terraform local attributes | Structural records do not imply executable functions; unsupported or dynamic labels and nested blocks remain uncovered |
| SQL, HTML, CSS, JSON, YAML | File-level documents | No symbol extraction or executable-proof substitution |
| Unknown formats | Explicit unsupported analysis | Files stay in the change inventory and require the configured file-review policy |

`ok` describes the qualified syntactic forms for the supplied bytes. It does
not establish complete language semantics, runtime declarations, a call graph,
or requirement correctness. Parse damage, resource limits and unresolved
identity remain visible in the result.

## Deterministic classification

An explicit language hint, a recognized extension and a bounded shebang are
source signals. Conflicting signals remain explicit; the host does not execute
a shebang to identify its interpreter. Extensionless scripts can use recognized
Python, Ruby, Bash or Node interpreters. Unknown interpreters remain file-level.
Bounded `env -S` parsing recognizes environment assignments, `-i`, and `-u`
with its operand; unknown options do not authorize interpreter execution or
silently select a parser.

`.h` alone is ambiguous between C and C++. `.pl` alone is ambiguous between
Perl and Prolog; neither is supplied by this catalog. A `.sh` suffix alone does
not identify a shell dialect. The direct Bash plugin can parse its documented
Bash subset, while the host requires a Bash signal before selecting that parser.

Callable locators in languages with overloads include supported signatures so
adding an overload does not rename an existing declaration. Source-local
suffixes preserve distinct ambiguous candidates; they do not authorize identity
transfer. Authored KB IDs remain independent of parser locators.

## Package and license qualification

The package's `catalog.json` pins source commits, versions, parser ABI,
registry integrity, asset digests and query provenance. `integrity.json` covers
the shipped package files, and `SBOM.spdx.json` maps the qualified components.
`THIRD_PARTY_NOTICES.md` and `licenses/` preserve full license texts. The HCL
grammar is Apache-2.0; the other grammar and runtime components are MIT. Kibi
retains AGPL-3.0-or-later.

## Adding a language

1. Pin the upstream grammar, scanner and query sources and inspect their exact
   licenses. Identify the prebuilt WASM provenance and supported parser ABI.
2. Add the asset and catalog metadata with hashes, notices, license texts and
   an SBOM entry. Keep runtime downloads and consumer toolchains unnecessary.
3. Define qualified declarations, containers, stable locators and uncovered
   constructs. Add damaged syntax and independent identity fixtures.
4. Test the shared host dispatch and an installed consumer's actual ownership
   failure and repair. Keep unsupported files visible and preserve v1 behavior.
5. Review the executable closure before regenerating integrity and host approval.
   Test Node and Bun, relocated installation, concurrent worktrees and measured
   resource costs. A green parser test alone is insufficient qualification.

This catalog adds analysis capabilities. Impact-policy migration, protected PR
checks and optional LSP are separate deliveries; catalog installation does not
activate a new blocking policy or a language server.
