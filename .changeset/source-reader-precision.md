---
"kibi-plugin-treesitter": patch
"kibi-cli": patch
---

Source-proof readers now refuse or read correctly several forms they used to misread:

- HCL: a negative number that is indexed or selected from (`-1[0]`, `-1.5.x`) is unresolved instead of read as the number.
- C: environment handed to `main` through a parenthesized declarator or a function returning a function pointer is refused, and a number too large for a double (`1e400`) is refused instead of read as `Infinity`.
- PHP: lone-surrogate escapes (`"\u{D800}"`) are refused, a blank line in a CRLF heredoc keeps its `\r`, `filter_input_array` takes its filter from the second argument, a filter definition such as `['filter' => FILTER_DEFAULT]` is no longer mistaken for a callback, and getter named arguments match case exactly.
- Bash: `env -` is read as `env -i`, a line splice inside a word or an assignment the grammar joins with the next line is refused, `ip netns exec` is followed past `ip` options that take an argument (an option that may be either kind refuses the read), subscripts of `unset`/`declare` that run code are refused for code reads, `unset 'a[${#k}]'` reads `k` and `${!k}` refuses, and `declare a[i]+=1` reads `a`.
- Java and C shadow filters: a second definition of a macro is checked on its own, and an angle include in a project whose files cannot be listed keeps the row.
