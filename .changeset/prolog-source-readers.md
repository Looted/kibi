---
"kibi-cli": minor
"kibi-mcp": minor
"kibi-runtime": minor
"kibi-codex": minor
"kibi-claude": minor
"kibi-cursor": minor
"kibi-zcode": minor
---

Source proofs now read SWI-Prolog. The `references` reader accepts `.pl` and `.plt` files, so a Prolog pack can prove which libraries its modules load, which predicates they call (for example that nothing calls `use_foreign_library/1`), which environment variables they read and which errors they throw. A new `prolog` reader lists one argument of every fact with a given functor, such as the `requires/1` facts of `pack.pl`. Both read the files term by term with SWI-Prolog and never run the project's code. The kibi-usage skill (2.39.0) describes both readers.

`imports` lists each loaded file as written (`library(lists)`, `helpers`) from load directives and from load goals in clause bodies. `calls` lists `Name/Arity` (or `Module:Name/Arity`) of every goal in clause bodies and directives. It walks control constructs, grammar rules, lambdas and meta-predicate arguments, using the file's own `meta_predicate` declarations and SWI-Prolog's. `env` reads `getenv/2`, `string_args` reads the first argument of calls to `callee`, and `thrown` reads the error of `throw(error(type_error(...), _))` and the `library(error)` helpers. A rethrow of a caught ball does not count as a new error. Operators come from the file's own `op/3` directives, the module export lists it can read, and the SWI-Prolog libraries it loads.

Some reads cannot be decided statically, and Kibi refuses them with their file and line: a variable called as a goal or closure, a goal qualified by a variable module, a clause asserted from a variable, and conditional compilation. `property` is refused for Prolog files. The `prolog` reader takes `file`, `functor` (`Name/Arity`) and `arg`. It refuses a fact with several arguments when no `arg` is given, and a fact whose argument holds a variable. A list argument contributes its items. The read keeps its members in file order for `precedes` claims.

## Migration

No files change shape. The source reader vocabulary now includes `prolog`.
