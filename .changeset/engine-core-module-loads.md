---
"kibi-cli": patch
"kibi-mcp": patch
"kibi-runtime": patch
---

Two installs of one Kibi release can now share an engine. The engine daemon serves every client with the same package versions, core-source digest and SWI-Prolog, so a project-local install and a second install of the same release (a global one, or a source checkout built at the release commit) talk to one daemon. Each client used to ask the daemon to load core modules such as `checks.pl` or `discovery.pl` from its own install's directory; the daemon had already loaded them from its own, SWI-Prolog refused to load a second copy, and every `kibi check` and `kb_check` in that workspace failed with "Access denied or KB locked".

- Clients now ask the engine to load the module of the same name next to the `kb.pl` it runs, and fall back to their own copy only in a process with no `kb` module. An explicit `KIBI_<MODULE>_PATH` override in `kibi-mcp` still loads the named file. `kibi-runtime` exports the goal builder as `useCoreModuleGoal`.
- A Prolog permission error that is not a branch-store lock, an audit-journal lock or a stale snapshot now says what Prolog refused, for example "Prolog refused to redefine module discovery (Already loaded from …); this is a permission_error, not a branch-store lock". The resource is named only when it is a plain atom, and the context message is cut to one line of at most 240 characters. A term whose parts are not plain atoms keeps "Access denied or KB locked".
