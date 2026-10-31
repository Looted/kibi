---
"kibi-plugin-sdk": minor
"kibi-plugin-treesitter": minor
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

`kibi-plugin-treesitter` provides it for Go, Java, C# and Rust, in the same bounded workers as symbol extraction. Members are written as the code names them: Go import paths, Java imports (`java.util.*`), C# `using` targets and Rust `use` paths expanded from their groups for `imports`; `os.Getenv`, `System.out.println` (and the method reference `System.out::println`), `Console.WriteLine` and `std::env::var` for `calls`, with `*.name` for a method on an expression Kibi cannot name; `os.Getenv`, `os.LookupEnv`, `System.getenv`, `Environment.GetEnvironmentVariable`, `env::var`, `env::var_os`, `env!` and `option_env!` for `env`; Go panics and Java and C# `throw new X()` for `thrown`; Go keyed literals and C# object initializers for `property`. A name computed at run time, the whole environment, reflection, a C# `dynamic` variable or `#if` block, a Rust `#[cfg(...)]` item other than `#[cfg(test)]` (whose items are skipped) and, for Rust `calls` and `thrown`, any macro invocation fail the read with their place.

Proofs use a reference extractor only when its installed files match the release-qualified closure Kibi ships, the same check impact review applies, so an unqualified or modified provider is never imported. Without an active provider the read is refused with what to install. `kibi init`, `kibi doctor` and `kb_plan_bootstrap` suggest `kibi-plugin-treesitter` when Go, Java, C# or Rust sources are tracked and it is not active for proofs; a project without a `package.json` creates one that only holds Kibi's plugin list.

## Migration

To prove references in these languages, add `"kibi.reference-extractor.v1": { "mode": "augment" }` to the `kibi-plugin-treesitter` entry of `package.json#kibi.plugins`. Nothing else changes.
