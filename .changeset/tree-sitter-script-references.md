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

- **PHP**: imports, calls, environment reads, first arguments, thrown errors and property values (array keys, named arguments, property and constant defaults). Class names resolve through the namespace and `use` imports and are written with backslashes (`App\Mail\Mailer::send`); function names are lower case. An unqualified call inside a namespace is kept only after no project `.php` file declares that function in the namespace. `getenv`, `$_ENV`/`$_SERVER` subscripts, `env()`, `Env::get` and `filter_input(INPUT_ENV, ...)` are environment reads; dynamic calls, `eval`, `$$name`, `$GLOBALS` and Reflection refuse. Numbers are compared by value, `define()`, promoted parameters, enum values and array writes are property values, and duplicate keys or merges with unread operands refuse.
- **C** (`.c` and `.h`): imports, calls, environment reads, first arguments and designated initializer values. Macros the file defines are expanded; conditional macros, `#`/`##` and `#if` blocks that add members refuse, and a quoted `#include` refuses until Kibi finds that the header defines none of the macros the file uses. `#import`, `#include_next`, angle headers found in the project and header function pointers are checked the same way. Calls through function pointers, `environ`, a three-parameter `main` and inline `asm` refuse.
- **Bash** (`.sh`, `.bash`): imports (`source`, with the script-folder idioms resolved), calls, environment reads and first arguments. A variable the script expands but never sets is an environment read, and one it sets only on some paths refuses. `~`, `test -v` and array-index arithmetic read the environment too. Commands behind `sudo`, `env`, `timeout` and similar wrappers are read; the first arguments `xargs` and `find -exec {}` supply, runners Kibi cannot name, `eval`, `sh -c`, `trap` code, `/proc/*/environ` and commands held in variables refuse.
- **Terraform/HCL** (`.tf`, `.hcl`): literal values of an attribute or object key (`extract: property`). Values that need evaluation, computed keys and `jsondecode`-like functions refuse, and so do a Terragrunt `include` block and any `override.tf`, `*_override.tf` or `.tofu` file in the folder.

`kibi init` and `kibi doctor` now suggest the plugin and the matching pack for source proofs in these languages too, and member matching splits PHP names at `\`; for PHP, `excludes` also refuses a member that differs from an excluded item only in letter case. kibi-usage 2.41.0 describes the new languages.
