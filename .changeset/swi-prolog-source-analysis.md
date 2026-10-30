---
"kibi-plugin-treesitter": minor
"kibi-core": patch
"kibi-cli": minor
"kibi-mcp": minor
---

Kibi now understands SWI-Prolog source. With `kibi-plugin-treesitter` installed, each predicate is one symbol named `name/arity` (`name//arity` for DCG rules), spanning its PlDoc block through its last clause, so a symbol in `.kb/symbols.yaml` can point at a single predicate and staged impact names the predicate whose clauses changed instead of the whole file. Clauses for another module (`lists:append(...)`) are qualified with that module. plunit tests are symbols too: a `begin_tests(Unit)` block is a `Unit` symbol and each `test(Name)` inside it is `Unit:Name`. The grammar is `tree-sitter-swi-prolog` 0.1.0 (MIT), pinned and shipped as WASM like the other grammars.

`.plt` files are classified as Prolog test source. A `.pl` file without a language hint or shebang is no longer always left ambiguous between Perl and Prolog: Kibi reads its first 64 KiB and picks Prolog when the leading lines look like Prolog (`:-` directives, clauses, DCG rules) and not Perl, or Perl when they look like Perl (`use strict`, `package`, `sub`, `my $x`) and not Prolog. A file that matches both or neither stays ambiguous. Perl remains file-level.

Bootstrap discovery (`kibi plan-bootstrap`, `kb_plan_bootstrap`) now scans `.pl` and `.plt` files. A `:- module(Name, Exports)` directive becomes source-module evidence that lists the module's exported predicates, and `.plt` files count as plunit test topology.

`kibi check` no longer fails with "get_dict/3: Type error" when a requirement's `origin.ref` quotes a URL. Origin values containing `/` were cut at their last slash, so such a requirement also lost its `approved_by` and `kind`, which changed its evidence level.
