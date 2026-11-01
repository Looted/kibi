---
"kibi-core": patch
"kibi-cli": patch
"kibi-mcp": patch
"kibi-runtime": patch
"kibi-plugin-treesitter": patch
"kibi-plugin-search-hints": patch
"kibi-cursor": patch
---

Close false proofs found by testing the language packs before release:

- A references claim whose subject key or claim text names a project file is rejected unless that file is among the files read, so a claim about one file cannot be decided on another.
- `excludes` now fails on a longer name ending in the excluded item at a segment boundary (`checkNotNull` excludes `Preconditions.checkNotNull`).
- Rust raw identifiers (`std::r#env::var`) are read as their plain names.
- C# method groups handed on as values (`Environment.Exit` in a switch arm, `??`, `yield return`, a lambda body, `!`) count as calls; an `Environment` that is not provably `System.Environment` (pattern or `out` variable, primary-constructor parameter, alias, a project type) refuses or is read as what it binds.
- Go: env reads through a helper or variable in another file of the package refuse; a package imported under a well-known name (`logrus`, `exec`) is listed by its import path.
- Java: a `System` class of the same package in another source root refuses `System` reads.
- Python: references through a module's private name (`from tempfile import _os`) and through ctypes or cffi refuse.
- SWI-Prolog: goals in `'~@'` message lines and in grammar bodies passed to `phrase`/`call_dcg` are read; an aliased include that more than one project file matches refuses, and include refusals say which file to add to `files:`.
- The Cursor hook runner is a self-contained bundle, so a copied or GitHub-installed plugin no longer fails with `ERR_MODULE_NOT_FOUND`.
- Plugins accept kibi-plugin-sdk 0.6 as a peer.
