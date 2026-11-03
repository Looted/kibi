# kibi-plugin-search-hints

## 0.1.2

### Patch Changes

- e0796af: Accept kibi-plugin-sdk 0.7 as a peer dependency.

## 0.1.1

### Patch Changes

- 048d1c9: Close false proofs found by testing the language packs before release:
  - A references claim whose subject key or claim text names a project file (also with a repository prefix, another letter case, no extension, or spaces) is rejected unless that file is among the files read, so a claim about one file cannot be decided on another.
  - `excludes` now fails on a longer name ending in the excluded item at a segment boundary (`checkNotNull` excludes `Preconditions.checkNotNull`).
  - Rust raw identifiers (`std::r#env::var`) are read as their plain names.
  - C# method groups handed on as values (`Environment.Exit` in a switch arm, `??`, `yield return`, a lambda body, `!`) count as calls, as does a method group on any receiver (`Process.GetCurrentProcess().Kill`); an `Environment` that is not provably `System.Environment` (pattern or `out` variable, type parameter, primary-constructor parameter, alias, a project type) refuses or is read as what it binds.
  - Go: env reads through a helper or variable in another file of the package, or in another package of the project, refuse; a package imported under a well-known name (`logrus`, `exec`) is listed by its import path.
  - Java: a `System` class of the same package in another source root refuses `System` reads.
  - Python: references through a module's private name (`from tempfile import _os`), reflection on a module (`getattr`, `vars`, a module assigned to a name) and ctypes or cffi refuse; `posix.X` and `nt.X` are read as `os.X`.
  - SWI-Prolog: goals in `'~@'` message lines and in grammar bodies passed to `phrase`/`call_dcg` are read; an aliased include resolves only through the `file_search_path` declarations read, never by path suffix, and include refusals name the file to add to `files:` only when it is the exact resolution.
  - The Cursor hook runner is a self-contained bundle, so a copied or GitHub-installed plugin no longer fails with `ERR_MODULE_NOT_FOUND`.
  - Plugins accept kibi-plugin-sdk 0.6 as a peer.

## 0.1.0

### Minor Changes

- f3150b5: `kb_search` can now suggest which requirements a weakly answered question probably means, found by meaning instead of shared words. Install the optional `kibi-plugin-search-hints` and activate `kibi.search-hints.v1` in `replace` mode under `package.json` `kibi.plugins`. When the intent answer abstains or its top score is below 0.44, `queryAnalysis.hints` lists up to ten current requirements (a hit on a scenario, test or fact is shown as its requirement, under `via`) and the text names the first five. Hints never change the ranked results, the answer layer or abstention, and `hints: false` turns them off. On Kibi's own KB, 20 reworded questions found the right requirement 2 times in the top three; with hints it is shown 14 times.
  - New package `kibi-plugin-search-hints` bundles the MIT-licensed potion-base-8M static embedding (about 7.7 MB, int8) with a pure JavaScript tokenizer checked against the upstream one. It needs no network, native code or download, and caches entity vectors in Kibi's runtime directory, rebuilding only entities whose text changed. It is optional and not part of the default install.
  - `kibi-plugin-sdk` adds the `kibi.search-hints.v1` capability and `validateSearchHintsResult`: a provider may name only the entities it was given, at most 20, scored between 0 and 1 in score then id order. `augment` mode is rejected for it.
  - A provider that throws, times out, returns an invalid result or cannot load gives no hints and a diagnostic; the search still answers.
  - `kb_plan_bootstrap` offers `kibi-plugin-search-hints` once the KB holds 50 or more requirement documents. Plugin offers now carry the `mode` to activate them in. The `kibi-usage` and `kibi-bootstrap` skills cover hints and the offer.

  Migration: none required. Without the plugin, `kb_search` answers exactly as before.
