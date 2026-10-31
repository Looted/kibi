---
"kibi-plugin-sdk": minor
"kibi-plugin-treesitter": major
"kibi-cli": minor
"kibi-mcp": minor
"kibi-runtime": minor
"kibi-codex": minor
"kibi-claude": minor
"kibi-cursor": minor
"kibi-zcode": minor
---

Source proofs now read Go, Java, C# and Rust. The `references` reader hands these files to `kibi-plugin-treesitter`, which lists what they import, call, read from the environment, pass as a first argument, throw and set as a property value, from their syntax trees and without compiling or running them. The kibi-usage skill (2.40.0) describes it.

A new plugin capability, `kibi.reference-extractor.v1` (kibi-plugin-sdk), lets a plugin answer the `references` reader for a language Kibi does not parse itself. A provider returns the members it reads exactly and an `unresolved` row (line and text) for each construct it cannot read statically, and Kibi refuses the read with those places. `validateReferenceExtractionResult` checks results. The capability activates only in `augment` mode.

`kibi-plugin-treesitter` provides it for Go, Java, C# and Rust, in the same bounded workers as symbol extraction. Members are written as the code names them: Go import paths, Java imports (`java.util.*`), C# `using` targets and Rust `use` paths expanded from their groups for `imports`; `os.Getenv`, `System.out.println` (and the method reference `System.out::println`), `Console.WriteLine` and `std::env::var` for `calls`, with `*.name` for a method on an expression Kibi cannot name; `os.Getenv`, `os.LookupEnv`, `System.getenv`, `Environment.GetEnvironmentVariable`, `env::var`, `env::var_os`, `env!` and `option_env!` for `env`; Go panics and Java and C# `throw new X()` for `thrown`; Go keyed literals and C# object, indexer and collection initializers for `property`. Names a file gives itself are followed: Go import aliases, Java single static imports, C# `using static` and `using X = ...` aliases and Rust `use` bindings (`use std::env::var as getvar`) read as the canonical name, and fully qualified forms (`java.lang.System.getenv`, `System.Environment.GetEnvironmentVariable`, `std::env::var`) match too. A name computed at run time, the whole environment (including `os.ExpandEnv` and `Environment.ExpandEnvironmentVariables`), an environment getter handed on as a value (`g := os.Getenv`, `System::getenv`), a dot, static-wildcard or glob import that could bring a getter or call into scope, a call with no static name (`fs[0]()`, `<T as Tr>::m()`), reflection (also by fully qualified name, `Activator.CreateInstance` and Go `plugin`), C# `dynamic` anywhere, a C# `#if` block, a Rust `#[cfg(...)]` item other than `#[cfg(test)]` (whose items are skipped) and, for Rust `calls` and `thrown`, any macro invocation, attribute macro or derive outside the standard library fail the read with their place.

Proofs use a reference extractor only when its installed files match the release-qualified closure Kibi ships, the same check impact review applies, so an unqualified or modified provider is never imported. Without an active provider the read is refused with what to install. `kibi init`, `kibi doctor` and `kb_plan_bootstrap` suggest `kibi-plugin-treesitter` when Go, Java, C# or Rust sources are tracked and it is not active for proofs; a project without a `package.json` creates one that only holds Kibi's plugin list.

`kibi-plugin-treesitter` 3.0 keeps only the Python and SWI-Prolog grammars. Each other grammar moved, unchanged, into its own data-only package, so a project downloads only the languages it uses: `kibi-lang-go`, `kibi-lang-rust`, `kibi-lang-java`, `kibi-lang-csharp`, `kibi-lang-php`, `kibi-lang-c`, `kibi-lang-cpp`, `kibi-lang-bash`, `kibi-lang-ruby` and `kibi-lang-hcl` (Terraform and HCL), all at 1.0.0. A pack holds the grammar WebAssembly and its license, with no code or install scripts. The plugin pins each pack's exact version and each grammar file's SHA-256 in `catalog.json` and lists the packs as optional peer dependencies in their major (`^1.0.0`); a worker checks the bytes before loading them. A file whose pack is missing (`TREESITTER_LANGUAGE_PACK_MISSING`) or another version (`TREESITTER_LANGUAGE_PACK_VERSION`) is now `unsupported` with the install line, and a modified grammar file is `failed` (`TREESITTER_LANGUAGE_PACK_MISMATCH`), for symbols and for references; neither is skipped. Packs resolve where Node finds them from the plugin (npm, pnpm and Bun; not Yarn Plug'n'Play). `kibi doctor` and `kibi init` name the packs the tracked sources need, and `kb_plan_bootstrap`'s plugin offer lists them in `alsoInstall`.

## Migration

- Install the grammar packs for the languages you analyze next to the plugin, for example `npm install --save-dev kibi-plugin-treesitter@3 kibi-lang-go kibi-lang-rust`. Python and SWI-Prolog need no pack. `kibi doctor` prints the exact line for the tracked sources. Until the packs are installed, those files are reported as unsupported instead of analyzed.
- To prove references in Go, Java, C# or Rust, also add `"kibi.reference-extractor.v1": { "mode": "augment" }` to the `kibi-plugin-treesitter` entry of `package.json#kibi.plugins`.
