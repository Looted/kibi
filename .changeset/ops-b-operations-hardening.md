---
"kibi-cli": patch
---

Simplify the modeling, mutation and proof operation helpers without changing what they return, and pin their behaviour with contract tests. Fixes: a predicate schema whose argument is named like an object built-in (`constructor`, `toString`) no longer crashes argument-vocabulary checks, and an argument named `__proto__` keeps its declared constants; predicate argument binding no longer crashes when a candidate value or argument name is an object built-in such as `constructor`; a what-if witness whose `kind` is not a string now leaves `kind` out, as its type promises.

The regex proof kind now refuses three patterns the real engines reject instead of deciding them: a lone `{` or an escaped `\-` outside a class in a JavaScript pattern with the `u` flag, and a Python pattern with both the `a` and `u` flags.

The references reader no longer reads a statement label, or the label a `break` or `continue` names, as a use of the global or loader it is named after (`process: for (;;) {}` no longer refuses an environment read).

- Writing a symbol to a manifest whose `symbols:` key holds a map instead of a list is now refused as a malformed source file (`SOURCE_FORMAT_INVALID`).
- A newly created symbol manifest lists each link once, as a list, even when the same link is given more than once.
- A references claim read without `callee` or `key` no longer falls back to an empty name; `kibi` already requires them for the `string_args` and `property` extracts that use them, so valid claims read as before.
- An exhaustive or typecheck certificate whose contract names no `domain_source` symbol is now refused ("the contract names no domain_source symbol") instead of being checked against whichever symbol the knowledge base listed first; an empty symbol id no longer matches an arbitrary symbol anywhere a proof looks one up.
- The references reader no longer refuses an interface, type alias, type parameter or enum named like a global or loader (`interface process {}`), since a type or enum name is not a read of the global.
