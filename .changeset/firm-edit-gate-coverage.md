---
"kibi-cli": patch
"kibi-agent-core": patch
"kibi-runtime": patch
"kibi-claude": patch
"kibi-codex": patch
"kibi-cursor": patch
"kibi-zcode": patch
---

The firm-edit commit gate now sees every change to code that implements a firm rule: constants and arrow functions, lines only removed from a function, and a function removed together with its symbol record. A note or link added to the rule's document no longer switches the gate off; only a new statement, a new status or a superseding requirement does. A keeps receipt now counts in the pre-edit hooks only for the retry of the edit the same session asked about, so a receipt committed earlier never skips the question in a later session.

- `kibi check --staged` (and the staged analyzer behind `kb_check`) gates any symbol with an `implements` link to a current firm requirement, whatever its role; attributes `-U0` hunks that only remove lines to the declaration they sit in; and reports a removed symbol record that implemented a firm requirement as `<symbol> in <file> (removed, …)` until a keeps receipt for the removal is staged.
- The requirement counts as restated only when its statement or status differs from the base commit, or when a requirement the commit adds or edits supersedes it.
- `kibi review-firm-edit` accepts `"staged": true` to review the code and requirement in the Git index; the gate puts it in the printed input when the file has unstaged edits. It also accepts coarse `.kb/symbols.yaml` symbols with source coordinates (the ones the hooks ask about) and symbols the change removed.
- Receipt files are named `<symbol>--<hash>.json`, the hash covering the source file and symbol, so long paths no longer fail with `ENAMETOOLONG` and `a b.ts` and `a_b.ts` no longer share a file. Receipts under the earlier `<file>--<symbol>.json` names are still read, and a new review replaces them.
- The hooks and the CLI read a requirement's statement with one shared reader (multi-paragraph `semantic_text` included), and the hooks find the reviewed code wherever it moved in the file, so a valid receipt no longer reads as stale.
- Claude Code honours a keeps receipt only when it was recorded after that session asked about the edit; Codex, Cursor and ZCode notify once per requirement per session regardless of receipts.
- The change-scoped declaration comparison keeps string and regex literals verbatim (so `//` inside a regex is no comment and whitespace inside a string counts), keeps a space where two tokens would join, and only drops blank lines and trailing whitespace for languages without C-style comments, such as Python.
