---
"kibi-plugin-treesitter": minor
"kibi-cli": minor
"kibi-core": minor
"kibi-mcp": minor
"kibi-runtime": minor
"kibi-codex": minor
"kibi-claude": minor
"kibi-cursor": minor
"kibi-zcode": minor
---

Source proofs read PHP, C, Bash and Terraform/HCL files through `kibi-plugin-treesitter`, each exact or refused with its place.

- **PHP**: imports, calls, environment reads, first arguments, thrown errors and property values (array keys, named arguments, property and constant defaults). Class names resolve through the namespace and `use` imports and are written with backslashes (`App\Mail\Mailer::send`); function names are lower case. An unqualified call inside a namespace is kept only after no project `.php` file declares that function in the namespace. `getenv`, `$_ENV`/`$_SERVER` subscripts, `env()`, `Env::get` and `filter_input(INPUT_ENV, ...)` are environment reads; dynamic calls, `eval`, `$$name` and `$GLOBALS` refuse.
- **C** (`.c` and `.h`): imports, calls, environment reads, first arguments and designated initializer values. Macros the file defines are expanded; conditional macros, `#`/`##` and `#if` blocks that add members refuse, and a quoted `#include` refuses until Kibi finds that the header defines none of the macros the file uses. Calls through function pointers, `environ` and a three-parameter `main` refuse.
- **Bash** (`.sh`, `.bash`): imports (`source`, with the script-folder idioms resolved), calls, environment reads and first arguments. A variable the script expands but never sets is an environment read, and one it sets only on some paths refuses. Commands behind `sudo`, `env`, `xargs`, `find -exec` and similar wrappers are read; `eval`, `sh -c`, `trap` code and commands held in variables refuse.
- **Terraform/HCL** (`.tf`, `.hcl`): literal values of an attribute or object key (`extract: property`). Values that need evaluation, computed keys and `jsondecode`-like functions refuse, and so does an `override.tf` or `*_override.tf` in the folder that the read leaves out.

`kibi init` and `kibi doctor` now suggest the plugin and the matching pack for source proofs in these languages too, and member matching splits PHP names at `\`. kibi-usage 2.41.0 describes the new languages.
